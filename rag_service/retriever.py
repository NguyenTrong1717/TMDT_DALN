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


MIN_VALID_CATALOG_PRICE = 10_000
TARGET_PRICE_MAX_RATIO = 1.15
PRICE_NUMBER_PATTERN = r"\d+(?:[.,]\d+)*"
PRICE_UNIT_PATTERN = r"ty|trieu|tr|cu|nghin|ngan|k|m|vnd|dong|d"


def normalize_text(text: str) -> str:
    """Chuẩn hóa chuỗi tiếng Việt: chuyển chữ thường, loại bỏ dấu kết hợp."""
    if not text:
        return ""
    decomposed = unicodedata.normalize("NFD", text.lower().replace("đ", "d").replace("Đ", "d"))
    return re.sub(r"[\u0300-\u036f]", "", decomposed).strip()


def _parse_price_amount(number_text: str, unit: Optional[str]) -> float:
    """Chuyển một mức giá trong câu hỏi sang VND."""
    normalized_unit = (unit or "").lower()
    normalized_number = number_text.strip()
    is_grouped_integer = bool(re.fullmatch(r"\d{1,3}(?:[.,]\d{3})+", normalized_number))
    number = (
        float(re.sub(r"[.,]", "", normalized_number))
        if is_grouped_integer
        else float(normalized_number.replace(",", "."))
    )

    if normalized_unit == "ty":
        return number * 1_000_000_000
    if normalized_unit in {"trieu", "tr", "cu", "m"}:
        return number * 1_000_000
    if normalized_unit in {"nghin", "ngan", "k"}:
        return number * 1_000
    if normalized_unit in {"vnd", "dong", "d"} or is_grouped_integer:
        return number

    # Giữ cách hỏi thông dụng "tầm 15" = 15 triệu.
    return number * 1_000_000 if number < 1_000 else number


def get_budget_limit(filters: Dict[str, Any]) -> Optional[float]:
    """Trả về trần giá dùng để loại bỏ sản phẩm vượt ngân sách."""
    if filters.get("max_price") is not None:
        return float(filters["max_price"])
    if filters.get("target_price") is not None:
        return float(filters["target_price"]) * TARGET_PRICE_MAX_RATIO
    return None


def is_valid_catalog_price(value: Any) -> bool:
    """Loại giá rỗng hoặc placeholder như 0đ và 1đ khỏi kết quả tư vấn."""
    try:
        return float(value) >= MIN_VALID_CATALOG_PRICE
    except (TypeError, ValueError):
        return False


def parse_budget_and_category(query: str) -> Dict[str, Any]:
    """Bóc tách ngân sách tối đa, ngân sách mục tiêu và phân loại danh mục từ câu hỏi."""
    norm = normalize_text(query)
    max_price: Optional[float] = None
    target_price: Optional[float] = None

    amount_pattern = rf"({PRICE_NUMBER_PATTERN})\s*({PRICE_UNIT_PATTERN})?\b"

    # 1. Nhận diện khoảng giá: "từ 15 đến 20 triệu", "15-20tr".
    range_match = re.search(
        rf"(?:tu\s+)?({PRICE_NUMBER_PATTERN})\s*({PRICE_UNIT_PATTERN})?\s*(?:-|den|toi)\s*"
        rf"({PRICE_NUMBER_PATTERN})\s*({PRICE_UNIT_PATTERN})\b",
        norm,
    )
    if range_match:
        upper_unit = range_match.group(4) or range_match.group(2)
        max_price = _parse_price_amount(range_match.group(3), upper_unit)
    else:
        # 2. Nhận diện ngân sách chặn trên: "dưới 15tr", "không quá 500k".
        under_match = re.search(
            rf"(?:duoi|<=|<|thap hon|toi da|khong qua)\s*{amount_pattern}",
            norm,
        )
        if under_match:
            max_price = _parse_price_amount(under_match.group(1), under_match.group(2))
        else:
            # 3. Nhận diện ngân sách mục tiêu, gồm cả đơn vị nghìn/ngàn/k.
            explicit_match = re.search(
                rf"({PRICE_NUMBER_PATTERN})\s*({PRICE_UNIT_PATTERN})\b",
                norm,
            )
            prefixed_match = re.search(
                rf"(?:tam|khoang|gia|ngan sach)\s*{amount_pattern}",
                norm,
            )
            general_match = explicit_match or prefixed_match
            if general_match:
                target_price = _parse_price_amount(general_match.group(1), general_match.group(2))

    # 4. Nhận diện phân loại danh mục
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


async def retrieve_contexts(
    user_query: str,
    catalog: List[Dict[str, Any]],
    include_products: bool = True,
) -> List[Dict[str, Any]]:
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

    # Câu hỏi chính sách/kiến thức không được tự động kéo sản phẩm vào câu trả lời.
    if not include_products:
        return policy_hits

    # 2. Tìm kiếm Vector sản phẩm
    all_chunks = create_semantic_chunks(catalog)
    filters = parse_budget_and_category(user_query)
    max_price = filters["max_price"]
    target_price = filters["target_price"]
    category = filters["category"]
    budget_limit = get_budget_limit(filters)

    # Đây là ràng buộc cứng để AI không thể trả sản phẩm vượt ngân sách.
    product_chunks = [
        chunk
        for chunk in all_chunks
        if chunk.get("type") == "product"
        and is_valid_catalog_price(chunk.get("metadata", {}).get("price"))
        and (
            budget_limit is None
            or float(chunk.get("metadata", {}).get("price")) <= budget_limit
        )
    ]
    if not product_chunks:
        return policy_hits

    vector_hits = await search_vector_store(user_query, product_chunks, top_k=12)

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
            if max_price is not None:
                if price <= max_price:
                    score += 0.45 + (price / max_price) * 0.1
            elif target_price is not None:
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
