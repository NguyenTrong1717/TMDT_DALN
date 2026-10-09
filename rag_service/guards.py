"""
Bộ 3 lớp phòng thủ bảo mật AI (Security Guards)
File: rag_service/guards.py
"""

import re
from typing import Optional
from retriever import normalize_text


PRODUCT_TERMS = (
    "pc", "may tinh", "laptop", "macbook", "gaming", "linh kien", "phan cung",
    "vga", "card do hoa", "card man hinh", "cpu", "chip", "ram", "ssd", "hdd",
    "mainboard", "bo mach chu", "man hinh", "monitor", "chuot", "ban phim",
    "tai nghe", "loa", "webcam", "tan nhiet", "nguon", "psu", "case", "rtx",
    "gtx", "radeon", "ryzen", "intel", "dien thoai", "dong ho", "dong ho thong minh",
    "smartwatch", "bluetooth", "am thanh", "cong nghe", "san pham",
)

POLICY_TERMS = (
    "bao hanh", "doi tra", "sua chua", "giao hang", "van chuyen", "freeship",
    "phi ship", "tra gop", "thanh toan", "khuyen mai", "voucher", "ma giam gia",
    "sale", "qua tang", "showroom", "hotline", "lien he", "dia chi", "o dau",
    "gio mo cua", "don hang", "trang thai don", "huy don", "hoan tien",
)

SMALL_TALK_PATTERNS = (
    r"^(xin chao|chao|hello|hi|hey)(\s|$)",
    r"^(cam on|thank you|thanks)(\s|$)",
    r"^(tam biet|bye|goodbye)(\s|$)",
    r"^(ban la ai|ban lam duoc gi|gioi thieu ve ban)(\?|\s|$)",
)

UNSUPPORTED_PRODUCT_LABELS = {
    "xe dap": "xe đạp",
    "xe may": "xe máy",
    "o to": "ô tô",
    "quan ao": "quần áo",
    "giay dep": "giày dép",
    "my pham": "mỹ phẩm",
    "nuoc hoa": "nước hoa",
    "thuc pham": "thực phẩm",
    "do an": "đồ ăn",
    "noi com": "nồi cơm",
    "tu lanh": "tủ lạnh",
    "may giat": "máy giặt",
}

TECH_INFO_PATTERNS = (
    r"\bla gi\b", r"\btai sao\b", r"\bhoat dong\b", r"\bcach (dung|lap|cai|sua)\b",
    r"\bkhac (gi|nhau)\b", r"\bco tot khong\b", r"\bdanh gia\b", r"\bgiai thich\b",
)


def _contains_term(text: str, terms: tuple[str, ...]) -> bool:
    return any(re.search(rf"(?<!\w){re.escape(term.strip())}(?!\w)", text) for term in terms)


def classify_query_intent(user_query: str) -> str:
    """Phân luồng trước RAG để chỉ truy xuất sản phẩm khi người dùng thật sự cần mua sắm."""
    norm = normalize_text(user_query)
    if not norm:
        return "off_topic"

    has_product_term = _contains_term(norm, PRODUCT_TERMS)
    has_policy_term = _contains_term(norm, POLICY_TERMS)
    has_unsupported_product = _contains_term(norm, tuple(UNSUPPORTED_PRODUCT_LABELS))

    # "Shop có xe đạp không?" vẫn là ngoài danh mục, không được để từ "shop" mở khóa retrieval.
    if has_unsupported_product:
        return "off_topic"
    if any(re.search(pattern, norm) for pattern in SMALL_TALK_PATTERNS):
        return "small_talk"
    if re.search(r"\b(shop|cua hang|hcore)\b.*\b(ban gi|co gi|san pham nao)\b", norm):
        return "product_search"
    if has_policy_term:
        return "store_policy"
    if has_product_term and any(re.search(pattern, norm) for pattern in TECH_INFO_PATTERNS):
        return "tech_info"
    if has_product_term:
        return "product_search"
    return "off_topic"


def build_small_talk_reply(user_query: str) -> str:
    norm = normalize_text(user_query)
    if re.search(r"^(cam on|thank you|thanks)", norm):
        return "Rất vui vì đã hỗ trợ được bạn. Khi cần tư vấn PC, laptop, linh kiện hoặc chính sách HCore, bạn cứ nhắn mình nhé!"
    if re.search(r"^(tam biet|bye|goodbye)", norm):
        return "Chào bạn nhé! Khi cần chọn thiết bị công nghệ hoặc hỗ trợ đơn hàng, HCore AI luôn sẵn sàng."
    if re.search(r"^(ban la ai|ban lam duoc gi|gioi thieu ve ban)", norm):
        return "Mình là HCore AI, trợ lý tư vấn PC, laptop, linh kiện và chính sách mua hàng của HCore Store."
    return "Chào bạn! Mình là HCore AI. Bạn cần tư vấn PC, laptop, linh kiện hay chính sách mua hàng nào hôm nay?"


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
    """LỚP BẢO VỆ 3: Chặn chủ đề ngoài shop và trả lời theo đúng nhóm câu hỏi."""
    if classify_query_intent(user_query) != "off_topic":
        return None

    norm = normalize_text(user_query)
    unsupported_product = next(
        (label for term, label in UNSUPPORTED_PRODUCT_LABELS.items() if _contains_term(norm, (term,))),
        None,
    )
    if unsupported_product:
        return (
            f"HCore Store hiện không kinh doanh {unsupported_product}, nên mình sẽ không chèn các sản phẩm "
            "không liên quan để tránh làm bạn hiểu nhầm. Mình có thể giúp bạn tìm PC, laptop, linh kiện, "
            "điện thoại hoặc thiết bị âm thanh đang có tại shop."
        )

    topic_replies = (
        (
            (r"thoi tiet", r"du bao"),
            "Mình không có dữ liệu thời tiết trực tiếp nên không muốn dự đoán sai cho bạn. Nếu cần, mình có thể hỗ trợ chọn thiết bị công nghệ hoặc giải đáp chính sách của HCore Store.",
        ),
        (
            (r"toan", r"phuong trinh", r"dao ham", r"tich phan"),
            "Câu hỏi toán học này nằm ngoài phạm vi của trợ lý bán hàng HCore. Mình xin giữ đúng vai trò và chỉ hỗ trợ về PC, laptop, linh kiện cùng dịch vụ của shop.",
        ),
        (
            (r"nau an", r"cong thuc", r"mon an"),
            "Mình chưa hỗ trợ công thức nấu ăn. Để không trả lời lạc chủ đề, mình chỉ tư vấn các sản phẩm công nghệ và chính sách mua hàng tại HCore.",
        ),
        (
            (r"lam tho", r"viet tho", r"ke chuyen"),
            "Yêu cầu sáng tác này không thuộc phạm vi HCore AI. Mình sẽ không tự gợi ý sản phẩm khi chúng không liên quan; bạn có thể hỏi mình về PC, laptop hoặc linh kiện.",
        ),
        (
            (r"dich giup", r"dich sang", r"translate"),
            "Mình chưa phải trợ lý dịch thuật. Mình xin giữ đúng phạm vi hỗ trợ sản phẩm công nghệ, báo giá, bảo hành và giao hàng của HCore Store.",
        ),
    )
    for patterns, reply in topic_replies:
        if any(re.search(pattern, norm) for pattern in patterns):
            return reply

    return (
        "Nội dung này chưa liên quan đến sản phẩm hoặc dịch vụ của HCore Store, nên mình sẽ không hiển thị "
        "sản phẩm gợi ý để tránh trả lời sai hướng. Bạn có thể hỏi mình về PC, laptop, linh kiện, giá bán, "
        "bảo hành, trả góp hoặc giao hàng."
    )
