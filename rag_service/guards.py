"""
Bộ 3 lớp phòng thủ bảo mật AI (Security Guards)
File: rag_service/guards.py
"""

import re
from typing import Optional
from retriever import normalize_text


def check_pii_security(user_query: str) -> Optional[str]:
    """LỚP BẢO VỆ 1: Chặn trích xuất thông tin cá nhân nhạy cảm (PII Security Guard)."""
    norm = normalize_text(user_query)
    sensitive_keywords = [
        "so dien thoai cua",
        "sdt cua",
        "mat khau",
        "password",
        "dia chi nha",
        "tai khoan admin",
        "ma the tin dung",
        "cccd cua ai",
        "danh sach user",
        "thong tin khach hang",
    ]
    if any(kw in norm for kw in sensitive_keywords):
        return (
            "Vì lý do bảo mật và quyền riêng tư của khách hàng, HCore Store AI không được phép cung cấp "
            "thông tin cá nhân (số điện thoại, mật khẩu, địa chỉ, tài khoản) của bất kỳ ai. "
            "Bạn có câu hỏi nào về sản phẩm hoặc chính sách cửa hàng không?"
        )
    return None


def check_jailbreak(user_query: str) -> Optional[str]:
    """LỚP BẢO VỆ 2: Chặn kỹ thuật Jailbreak & Prompt Injection."""
    norm = normalize_text(user_query)
    jailbreak_patterns = [
        r"ignore\s+(all\s+)?(previous|prior|above|existing)\s+instructions?",
        r"bo\s+qua\s+(tat\s+ca\s+|moi\s+|cac\s+)?(quy\s+tac|huong\s+dan|chi\s+dan|yeu\s+cau|lenh)",
        r"quen\s+(di\s+)?(quy\s+tac|chi\s+dan|prompt)",
        r"(act\s+as|you\s+are\s+now|dong\s+vai(\s+la)?)\s+(dan|hacker|unrestricted|ai\s+khac)",
        r"(output|reveal|show|print|in|tiet\s+lo)\s+(your\s+)?(full\s+)?(system\s+instructions?|system\s+prompt|prompt\s+goc)",
        r"(viet\s+virus|tao\s+malware|tan\s+cong\s+mang|hack\s+he\s+thong)",
    ]
    if any(re.search(pat, norm) for pat in jailbreak_patterns):
        return (
            "Mình là Trợ lý AI của HCore Store, chuyên hỗ trợ tư vấn máy tính, laptop và linh kiện phần cứng. "
            "Mình không thể thực hiện các yêu cầu thay đổi danh tính hay can thiệp hệ thống. "
            "Bạn cần tìm sản phẩm nào hôm nay?"
        )
    return None


def check_off_topic(user_query: str) -> Optional[str]:
    """LỚP BẢO VỆ 3: Nhận diện và từ chối câu hỏi ngoài phạm vi kinh doanh (Off-topic Filter)."""
    norm = normalize_text(user_query)
    off_topic_patterns = [
        r"^(giai|tinh)\s+(toan|phuong trinh|dao ham|tich phan)",
        r"^(thoi tiet|du bao thoi tiet)\s+",
        r"^(lam tho|viet tho|ke chuyen cuoi|ke chuyen ma)",
        r"^(nau an|cong thuc nau|mon an)\s+",
        r"^(dich giup|dich sang tieng)\s+",
    ]
    if any(re.search(pat, norm) for pat in off_topic_patterns):
        return (
            "Câu hỏi này nằm ngoài phạm vi hỗ trợ của cửa hàng. Mình là trợ lý công nghệ của HCore Store, "
            "chỉ có thể giúp bạn giải đáp về PC Gaming, Laptop, Linh kiện, Báo giá, Trả góp hoặc Bảo hành. "
            "Bạn hãy đặt câu hỏi liên quan đến sản phẩm nhé!"
        )
    return None
