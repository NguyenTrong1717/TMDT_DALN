"""
Bộ phận Semantic Chunking (Entity-based Chunker)
File: rag_service/chunker.py
"""

from typing import List, Dict, Any
from knowledge import STORE_POLICIES

# Bộ nhớ đệm chunks trong RAM tránh tái tạo liên tục
chunk_cache: Dict[str, Dict[str, Any]] = {}


def create_semantic_chunks(catalog: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Biến đổi danh mục sản phẩm và chính sách thành các Semantic Chunks có cấu trúc.
    Khác với Fixed-size chunking (cắt theo 500 ký tự), Entity Chunking bảo toàn
    toàn bộ ngữ cảnh (Tên, Giá, Loại máy, Khuyến mãi) trong một đơn vị tri thức hoàn chỉnh.
    """
    result_chunks: List[Dict[str, Any]] = []

    # 1. Chunking sản phẩm (Động từ Catalog)
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

    # 2. Chunking chính sách cửa hàng (Tĩnh)
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
