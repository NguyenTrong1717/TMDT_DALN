"""
Bộ máy truy xuất tri thức kết hợp (Hybrid Retriever & Reranker)
File: rag_service/retriever.py
"""

import re
import unicodedata
from typing import List, Dict, Any, Optional
import numpy as np

from embeddings import get_embed_model, normalize_vector
from chunker import create_semantic_chunks
from knowledge import STORE_POLICIES


def normalize_text(text: str) -> str:
    """Chuẩn hóa chuỗi tiếng Việt: chuyển chữ thường, loại bỏ dấu kết hợp."""
    if not text:
        return ""
    decomposed = unicodedata.normalize("NFD", text.lower().replace("đ", "d").replace("Đ", "d"))
    return re.sub(r"[\u0300-\u036f]", "", decomposed).strip()


def parse_budget_and_category(query: str) -> Dict[str, Any]:
    """Bóc tách ngân sách tối đa, ngân sách mục tiêu và phân loại danh mục từ câu hỏi."""
    norm = normalize_text(query)
    max_price: Optional[float] = None
    target_price: Optional[float] = None

    # 1. Nhận diện ngân sách chặn trên: "dưới 15tr", "< 15tr", "thấp hơn 15 triệu"
    under_match = re.search(r"(?:duoi|<|thap hon)\s*(\d+(?:[.,]\d+)?)\s*(?:tr|trieu|cu|m)?", norm)
    if under_match:
        num = float(under_match.group(1).replace(",", "."))
        if num < 1000:
            num *= 1_000_000
        max_price = num
    else:
        # 2. Nhận diện ngân sách mục tiêu: "tầm 15tr", "khoảng 15 triệu", "15tr", "15 củ"
        general_match = re.search(r"(\d+(?:[.,]\d+)?)\s*(?:tr|trieu|cu|m)\b", norm) or re.search(
            r"(?:tam|khoang|gia)\s*(\d+(?:[.,]\d+)?)", norm
        )
        if general_match:
            num = float(general_match.group(1).replace(",", "."))
            if num < 1000:
                num *= 1_000_000
            target_price = num

    # 3. Nhận diện phân loại danh mục
    category = None
    if re.search(r"\b(pc|may tinh ban|case|dan may)\b", norm):
        category = "pc"
    elif re.search(r"\b(laptop|macbook|may tinh xach tay)\b", norm):
        category = "laptop"
    elif re.search(r"\b(linh kien|vga|cpu|ram|ssd|man hinh|chuot|ban phim|tan nhiet|nguon)\b", norm):
        category = "component"

    return {"max_price": max_price, "target_price": target_price, "category": category}


async def search_vector_store(query: str, chunks: List[Dict[str, Any]], top_k: int = 12) -> List[Dict[str, Any]]:
    """Tìm kiếm tương đồng ngữ nghĩa bằng Local AI FastEmbed ONNX."""
    if not chunks or not query.strip():
        return []

    model = get_embed_model()
    q_vec = next(model.embed([query]))
    q_norm = normalize_vector(q_vec)

    # Sinh vector cho các chunks chưa có trong bộ nhớ
    uncached = [c for c in chunks if "vector" not in c]
    if uncached:
        for c, raw_v in zip(uncached, model.embed([c["text"] for c in uncached])):
            c["vector"] = normalize_vector(raw_v)

    scored = [{**c, "score": float(np.dot(q_norm, c["vector"]))} for c in chunks]
    scored.sort(key=lambda x: x["score"], reverse=True)
    return scored[:top_k]


async def retrieve_contexts(user_query: str, catalog: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Quy trình Hybrid Retrieval & Reranking:
    1. So khớp chính sách (Policy Matching) theo keyword trọng yếu.
    2. Truy xuất Top-12 Semantic Vector Chunks bằng FastEmbed.
    3. Reranking điểm số thông minh dựa trên Metadata (Category Match & Budget Match).
    4. Trả về Top 3 sản phẩm sát nhất + Chính sách liên quan.
    """
    norm_query = normalize_text(user_query)

    # 1. So khớp chính sách (Policies)
    policy_hits = []
    for policy in STORE_POLICIES:
        if any(normalize_text(kw) in norm_query for kw in policy["keywords"]):
            policy_hits.append({
                "type": "policy",
                "text": policy["content"],
                "score": 1.0,
            })

    # 2. Tìm kiếm Vector sản phẩm
    all_chunks = create_semantic_chunks(catalog)
    filters = parse_budget_and_category(user_query)
    max_price = filters["max_price"]
    target_price = filters["target_price"]
    category = filters["category"]

    vector_hits = await search_vector_store(user_query, all_chunks, top_k=12)

    # 3. Metadata Reranking (Ngân sách & Danh mục)
    reranked = []
    for hit in vector_hits:
        score = hit["score"]
        meta = hit.get("metadata", {})

        # Thưởng điểm nếu đúng danh mục khách tìm (PC, Laptop, Linh kiện)
        if category and meta.get("category") == category:
            score += 0.35

        # Tối ưu theo mức giá và ngân sách
        price = meta.get("price")
        if price:
            price = float(price)
            if max_price:
                if price <= max_price:
                    score += 0.45 + (price / max_price) * 0.1
                else:
                    score -= min(0.5, ((price - max_price) / max_price) * 0.5)
            elif target_price:
                diff_ratio = abs(price - target_price) / target_price
                if diff_ratio <= 0.25:
                    score += (0.25 - diff_ratio) * 1.8
                else:
                    score -= min(0.4, diff_ratio * 0.2)

        reranked.append({**hit, "score": score})

    reranked.sort(key=lambda x: x["score"], reverse=True)

    # Lấy Top 3 sản phẩm điểm cao nhất
    top_products = [
        {"type": h["type"], "text": h["text"], "score": h["score"], "metadata": h.get("metadata", {})}
        for h in reranked
        if h.get("type") == "product"
    ][:3]

    return policy_hits + top_products
