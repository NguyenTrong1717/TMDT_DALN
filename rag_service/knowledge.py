"""
Kho tri thức & Ingestion dữ liệu từ JSON Server
File: rag_service/knowledge.py
"""

import asyncio
from typing import List, Dict, Any
import httpx
from config import JSON_SERVER_URL

# Chính sách bán hàng & hậu mãi của HCore Store (Tĩnh)
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


async def fetch_store_catalog(api_url: str = JSON_SERVER_URL) -> List[Dict[str, Any]]:
    """Tải danh mục sản phẩm realtime từ json-server (bất đồng bộ song song)."""
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
