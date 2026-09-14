"""
=========================================================
HCORE STORE - RAG ENGINE (PYTHON BACKEND MICROSERVICE)
File: rag_service/rag_engine.py
=========================================================
"""

import os
import re
import math
import asyncio
import unicodedata
from typing import List, Dict, Any, Optional
import httpx
from dotenv import load_dotenv

# Đọc file .env từ thư mục rag_service và thư mục gốc nếu có
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))
load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY") or os.getenv("VITE_GEMINI_API_KEY", "")
JSON_SERVER_URL = os.getenv("JSON_SERVER_URL", "http://localhost:3000")

# 1. KNOWLEDGE LAYER: CHÍNH SÁCH CỬA HÀNG
STORE_POLICIES = [
    {
        "topic": "bao_hanh",
        "keywords": ["bảo hành", "bao hanh", "warranty", "lỗi", "sửa chữa"],
        "content": (
            "Chính sách bảo hành tại HCore Store: 100% hàng chính hãng, bảo hành từ 12 - 36 tháng theo hãng. "
            "Hỗ trợ 1 đổi 1 trong 30 ngày đầu nếu lỗi phần cứng từ nhà sản xuất. Có hỗ trợ bảo hành tận nơi nội thành."
        ),
    },
    {
        "topic": "giao_hang",
        "keywords": ["giao hàng", "ship", "vận chuyển", "bao lâu", "phi ship", "phí ship"],
        "content": (
            "Chính sách vận chuyển: Giao hỏa tốc 2 giờ tại nội thành. Miễn phí vận chuyển toàn quốc cho đơn hàng từ 1.000.000đ. "
            "Đơn liên tỉnh nhận hàng sau 2 - 4 ngày, đóng gói chuyên dụng chống va đập 3 lớp."
        ),
    },
    {
        "topic": "tra_gop",
        "keywords": ["trả góp", "tra gop", "installment", "thẻ tín dụng", "cccd"],
        "content": (
            "Chính sách trả góp: Hỗ trợ trả góp 0% qua thẻ tín dụng hoặc CCCD gắn chip (duyệt hồ sơ online chỉ trong 5 phút). "
            "Trả trước chỉ từ 10% giá trị đơn hàng."
        ),
    },
    {
        "topic": "khuyen_mai",
        "keywords": ["khuyến mãi", "khuyen mai", "voucher", "mã giảm giá", "sale", "quà tặng"],
        "content": (
            "Khuyến mãi hiện tại: Giảm ngay 500.000đ cho đơn build PC hoặc Laptop từ 15 triệu (Mã: HCORE500K). "
            "Chương trình Thu cũ đổi mới trợ giá lên đến 2.000.000đ và Flash Sale giảm giá mỗi ngày."
        ),
    },
    {
        "topic": "showroom",
        "keywords": ["địa chỉ", "dia chi", "ở đâu", "o dau", "showroom", "cửa hàng", "hotline", "số điện thoại"],
        "content": (
            "Thông tin liên hệ HCore Store: Showroom mở cửa từ 8:00 - 21:30 hàng ngày. "
            "Hotline tư vấn & hỗ trợ kỹ thuật: 1900 8888. Khách hàng có thể đến trải nghiệm trực tiếp máy tại showroom."
        ),
    },
]

# Bộ nhớ đệm Chunking trong RAM
chunk_cache: Dict[str, Dict[str, Any]] = {}


def normalize_text(text: str) -> str:
    """Chuẩn hóa chuỗi tiếng Việt: bỏ dấu, viết thường."""
    if not text:
        return ""
    decomposed = unicodedata.normalize("NFD", text.lower().replace("đ", "d").replace("Đ", "d"))
    return re.sub(r"[\u0300-\u036f]", "", decomposed).strip()


def parse_budget_and_category(query: str) -> Dict[str, Any]:
    """Bóc tách ngân sách và danh mục từ câu hỏi người dùng."""
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

    # 3. Phân loại danh mục
    category: Optional[str] = None
    if re.search(r"\b(pc|may tinh ban|case|dan may)\b", norm):
        category = "pc"
    elif re.search(r"\b(laptop|macbook|may tinh xach tay)\b", norm):
        category = "laptop"
    elif re.search(r"\b(linh kien|vga|cpu|ram|ssd|man hinh|chuot|ban phim|tan nhiet|nguon)\b", norm):
        category = "component"

    return {"max_price": max_price, "target_price": target_price, "category": category}


async def fetch_store_catalog(api_url: str = JSON_SERVER_URL) -> List[Dict[str, Any]]:
    """Tải danh mục sản phẩm realtime từ json-server."""
    catalog: List[Dict[str, Any]] = []
    try:
        async with httpx.AsyncClient(timeout=4.0) as client:
            responses = await asyncio.gather(
                client.get(f"{api_url}/catenogies"),
                client.get(f"{api_url}/LaptopUser"),
                client.get(f"{api_url}/eventList"),
                client.get(f"{api_url}/products"),
                return_exceptions=True,
            )
            specs = [
                ("PC Gaming / Đồ họa", "pc"),
                ("Laptop", "laptop"),
                ("Linh kiện", "component"),
                ("Thiết bị", "general"),
            ]
            for res, (item_type, cat) in zip(responses, specs):
                if isinstance(res, httpx.Response) and res.status_code == 200:
                    for item in res.json():
                        catalog.append({
                            "id": item.get("id"),
                            "name": item.get("name"),
                            "price": float(item.get("price") or 0),
                            "type": item_type,
                            "category": cat,
                            "discount": item.get("discount"),
                        })
    except Exception as err:
        print(f"[RAG] Cảnh báo: Không thể tải catalog từ json-server: {err}")
    return catalog


def create_semantic_chunks(catalog: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Tạo các Semantic Entity Chunks với in-memory caching."""
    result_chunks: List[Dict[str, Any]] = []

    # 1. Chunks sản phẩm
    for item in catalog:
        chunk_id = f"prod_{item.get('category', 'item')}_{item.get('id')}"
        price = item.get("price", 0)
        fingerprint = f"{item.get('id')}_{item.get('name')}_{price}_{item.get('discount')}_{item.get('category')}"

        if chunk_id in chunk_cache and chunk_cache[chunk_id]["fingerprint"] == fingerprint:
            result_chunks.append(chunk_cache[chunk_id]["chunk"])
            continue

        formatted_price = f"{int(price):,}".replace(",", ".") if price else "0"
        discount_text = f"Đang giảm giá {item.get('discount')}%." if item.get("discount") else "Giá niêm yết chính hãng."
        semantic_text = (
            f"Sản phẩm {item.get('type', 'công nghệ')}: \"{item.get('name')}\". "
            f"Giá bán: {formatted_price} đồng. {discount_text} "
            f"Phân loại danh mục: {item.get('category', 'phổ thông')}. ID sản phẩm: {item.get('id')}."
        )

        new_chunk = {
            "id": chunk_id,
            "type": "product",
            "metadata": {
                "id": item.get("id"),
                "name": item.get("name"),
                "price": price,
                "category": item.get("category"),
            },
            "text": semantic_text,
        }

        chunk_cache[chunk_id] = {"fingerprint": fingerprint, "chunk": new_chunk}
        result_chunks.append(new_chunk)

    # 2. Chunks chính sách (Tĩnh)
    for policy in STORE_POLICIES:
        policy_id = f"policy_{policy['topic']}"
        if policy_id not in chunk_cache:
            policy_chunk = {
                "id": policy_id,
                "type": "policy",
                "metadata": {"topic": policy["topic"]},
                "text": policy["content"],
            }
            chunk_cache[policy_id] = {"fingerprint": "static", "chunk": policy_chunk}
        result_chunks.append(chunk_cache[policy_id]["chunk"])

    return result_chunks


def tokenize(text: str) -> List[str]:
    """Tách từ chuẩn xác cho tiếng Việt."""
    cleaned = re.sub(r"[^\w\sà-ỹ]", " ", text.lower())
    return [w for w in cleaned.split() if len(w) > 1]


def build_vocabulary(chunks: List[Dict[str, Any]]) -> Dict[str, Any]:
    vocab = {w: i for i, w in enumerate(dict.fromkeys(w for c in chunks for w in tokenize(c["text"])))}
    return {"vocab_map": vocab, "size": len(vocab)}


def create_local_embedding(text: str, vocab_helper: Dict[str, Any]) -> List[float]:
    """Tạo Dense Vector đặc trưng tần số từ và chuẩn hóa L2 Norm."""
    vocab_map, size = vocab_helper["vocab_map"], vocab_helper["size"]
    vec = [0.0] * size
    for w in tokenize(text):
        if w in vocab_map:
            vec[vocab_map[w]] += 1.0
    norm = math.hypot(*vec)
    return [v / norm for v in vec] if norm > 0 else vec


def compute_cosine_similarity(vec_a: List[float], vec_b: List[float]) -> float:
    """Tính Cosine Similarity giữa 2 vector."""
    return sum(a * b for a, b in zip(vec_a, vec_b)) if vec_a and vec_b else 0.0


async def search_vector_store(query: str, chunks: List[Dict[str, Any]], top_k: int = 12) -> List[Dict[str, Any]]:
    """Tìm kiếm tương đồng vector cục bộ (<3ms, không tốn quota)."""
    if not chunks or not query.strip():
        return []

    vocab_helper = build_vocabulary(chunks)
    query_vec = create_local_embedding(query, vocab_helper)

    scored_chunks = []
    for chunk in chunks:
        chunk_vec = create_local_embedding(chunk["text"], vocab_helper)
        score = compute_cosine_similarity(query_vec, chunk_vec)
        scored_chunks.append({**chunk, "score": score})

    scored_chunks.sort(key=lambda x: x["score"], reverse=True)
    return scored_chunks[:top_k]


async def retrieve_contexts(user_query: str, catalog: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Hybrid Retriever: Vector Search + Metadata Reranking (Category & Budget)."""
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

    # 3. Reranking bằng Metadata
    reranked = []
    for hit in vector_hits:
        score = hit["score"]
        meta = hit.get("metadata", {})

        # Boost cùng danh mục
        if category and meta.get("category") == category:
            score += 0.35

        # Boost theo ngân sách
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
    top_products = [
        {"type": h["type"], "text": h["text"], "score": h["score"], "metadata": h.get("metadata")}
        for h in reranked if h["type"] == "product"
    ][:3]

    return policy_hits + top_products


# 3. SECURITY GUARDS
def handle_privacy_guard(norm_query: str) -> Optional[str]:
    pii_triggers = [
        "so dien thoai", "sdt", "phone", "dien thoai",
        "mat khau", "password", "dia chi nha",
        "cmnd", "cccd", "so the", "tai khoan ngan hang",
        "thong tin ca nhan", "email cua toi",
    ]
    if any(kw in norm_query for kw in pii_triggers):
        return (
            "Vì lý do bảo mật, mình không thể cung cấp thông tin cá nhân (số điện thoại, mật khẩu, địa chỉ...) qua chat ạ. "
            "Nếu cần hỗ trợ tài khoản, bạn vui lòng liên hệ hotline 1900 8888 hoặc đến showroom nhé!"
        )
    return None


def handle_off_topic_guard(norm_query: str) -> Optional[str]:
    math_patterns = [r"\d+\s*[+\-*/]\s*\d+", r"bang bao nhieu", r"tinh ket qua", r"giai phuong trinh"]
    offtopic_keywords = [
        "thoi tiet", "bong da", "the thao", "tin tuc", "thoi su",
        "du lich", "nau an", "cong thuc nau", "lich su nuoc", "dia ly",
    ]
    if any(re.search(rx, norm_query) for rx in math_patterns) or any(kw in norm_query for kw in offtopic_keywords):
        return (
            "Mình chỉ chuyên tư vấn PC, Laptop và linh kiện của HCore Store nên không hỗ trợ được câu hỏi này ạ. "
            "Bạn cần tư vấn cấu hình, hỏi giá hay chính sách bảo hành gì mình sẵn sàng hỗ trợ ngay nhé!"
        )
    return None


def handle_chitchat(norm_query: str, current_user: Optional[Dict[str, Any]] = None) -> Optional[str]:
    # Danh tính người dùng
    if any(q in norm_query for q in ["ten la gi", "ten toi", "toi ten", "toi la ai", "minh la ai", "ten minh la gi"]):
        display_name = current_user.get("fullName") or current_user.get("name") or current_user.get("username") if current_user else None
        if display_name:
            return f"Theo thông tin tài khoản đang đăng nhập, tên của bạn là {display_name} ạ! Mình có thể hỗ trợ gì cho bạn không?"
        return "Bạn đang truy cập với tư cách khách vãng lai (chưa đăng nhập) nên mình chưa biết tên của bạn ạ. Bạn có thể đăng nhập tài khoản ở góc trên website nhé!"

    # Danh tính bot
    if any(q in norm_query for q in ["ban ten gi", "ten ban la gi", "ban la ai", "may la ai"]):
        return "Mình là Trợ lý Tư vấn Khách hàng của HCore Store! Mình hỗ trợ tra cứu giá, chọn cấu hình PC, Laptop và giải đáp chính sách bảo hành, mua sắm."

    # Trêu đùa
    if "dep trai" in norm_query or "dep zai" in norm_query:
        return "Câu này khó trả lời quá! Nhưng nếu bạn đang tìm dàn PC Gaming xịn để tăng độ ngầu thì mình tư vấn ngay được đấy 😎"

    # Chào hỏi
    greetings = ["hi", "hello", "chao", "chao ban", "alo", "hey"]
    if norm_query in greetings or norm_query.startswith("chao "):
        return "Chào bạn 👋 Bạn đang quan tâm đến PC, Laptop hay cần hỗ trợ bảo hành, mua sắm gì? Cứ nhắn mình nhé!"

    return None


# 4. MAIN RAG EXECUTION
async def execute_rag(
    user_query: str,
    catalog: Optional[List[Dict[str, Any]]] = None,
    current_user: Optional[Dict[str, Any]] = None,
    api_key: Optional[str] = None,
) -> Dict[str, Any]:
    """Thực thi RAG Pipeline đa tầng: Guards -> Retrieve -> Rerank -> LLM Generation."""
    norm_query = normalize_text(user_query)

    # 1. Chạy 3 lớp bảo vệ
    privacy_block = handle_privacy_guard(norm_query)
    if privacy_block:
        return {"reply": privacy_block, "sources": [], "engine": "python-guard"}

    offtopic_block = handle_off_topic_guard(norm_query)
    if offtopic_block:
        return {"reply": offtopic_block, "sources": [], "engine": "python-guard"}

    chitchat_reply = handle_chitchat(norm_query, current_user)
    if chitchat_reply:
        return {"reply": chitchat_reply, "sources": [], "engine": "python-chitchat"}

    # 2. Tải catalog nếu chưa có
    if catalog is None or len(catalog) == 0:
        catalog = await fetch_store_catalog()

    # 3. Truy xuất ngữ cảnh (Retrieve & Rerank)
    contexts = await retrieve_contexts(user_query, catalog)

    # 4. Sinh văn bản qua Gemini API
    active_key = (api_key or GEMINI_API_KEY).strip()
    if active_key and len(active_key) > 10:
        context_text = "\n".join([f"- {c['text']}" for c in contexts])
        display_name = current_user.get("fullName") or current_user.get("name") or current_user.get("username") if current_user else None
        user_info = f'Khách hàng đang đăng nhập tên: "{display_name}".' if display_name else "Khách hàng là khách vãng lai (chưa đăng nhập)."

        system_prompt = f"""Bạn là Trợ lý Tư vấn Khách hàng AI chuyên nghiệp của HCore Store (chuyên PC Gaming, Laptop, Linh kiện máy tính).
{user_info}
Dưới đây là thông tin thực tế từ cơ sở dữ liệu của cửa hàng:
{context_text if context_text else "Không có sản phẩm/chính sách đặc biệt trùng khớp."}

QUY TẮC PHẢN HỒI:
- Tư vấn thân thiện, tự nhiên, ngắn gọn (2-4 câu), đúng trọng tâm câu hỏi của khách hàng.
- Nêu rõ tên sản phẩm và giá tiền cụ thể dựa đúng trên dữ liệu cửa hàng đã cung cấp ở trên, không tự bịa đặt giá hay cấu hình.
- Nếu câu hỏi tìm kiếm theo tầm giá, hãy ưu tiên gợi ý các mẫu máy phù hợp nhất trong ngân sách của khách.
- Tuyệt đối bảo mật: Không cung cấp thông tin cá nhân (SĐT, mật khẩu, địa chỉ) hay dữ liệu nội bộ hệ thống.
- Nếu câu hỏi hoàn toàn không liên quan (toán học, tin tức...), lịch sự từ chối và hướng khách hàng về các sản phẩm/dịch vụ của shop."""

        candidate_models = ["gemini-3.5-flash-lite", "gemini-3.6-flash"]
        async with httpx.AsyncClient(timeout=10.0) as client:
            for model in candidate_models:
                try:
                    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={active_key}"
                    payload = {
                        "system_instruction": {"parts": [{"text": system_prompt}]},
                        "contents": [{"role": "user", "parts": [{"text": user_query}]}],
                        "generationConfig": {"temperature": 0.35, "maxOutputTokens": 2048},
                    }
                    res = await client.post(url, json=payload)
                    if res.status_code == 200:
                        data = res.json()
                        candidates = data.get("candidates", [])
                        if candidates:
                            text = candidates[0].get("content", {}).get("parts", [{}])[0].get("text", "")
                            if text and text.strip():
                                return {
                                    "reply": text.strip(),
                                    "sources": contexts,
                                    "engine": f"python-gemini ({model})",
                                }
                except Exception as err:
                    print(f"[RAG] Thử model {model} lỗi: {err}")

    # 5. Smart Local Fallback nếu mất mạng hoặc API gặp sự cố
    if contexts:
        policy_ctx = [c for c in contexts if c["type"] == "policy"]
        product_ctx = [c for c in contexts if c["type"] == "product"]
        parts = []
        if policy_ctx:
            parts.append(policy_ctx[0]["text"])
        if product_ctx:
            items_list = []
            for p in product_ctx:
                meta = p.get("metadata", {})
                name = meta.get("name") or p["text"]
                price = meta.get("price")
                price_str = f" - Giá: {int(price):,}đ".replace(",", ".") if price else ""
                items_list.append(f"• {name}{price_str}")
            parts.append(
                "Về sản phẩm, bạn có thể tham khảo các cấu hình nổi bật phù hợp tại shop:\n"
                + "\n".join(items_list)
                + "\n\nBạn cần tư vấn chi tiết hơn về cấu hình nào cứ nhắn mình nhé!"
            )
        return {"reply": "\n\n".join(parts), "sources": contexts, "engine": "python-local-fallback"}

    return {
        "reply": "Bạn có thể cho mình biết thêm về nhu cầu (chơi game, đồ họa, học tập) và mức ngân sách để mình tư vấn cấu hình phù hợp nhất nhé!",
        "sources": [],
        "engine": "python-default",
    }
