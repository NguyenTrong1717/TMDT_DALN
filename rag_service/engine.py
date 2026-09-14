"""
Orchestrator chính của RAG Engine (Điều phối toàn bộ Pipeline)
File: rag_service/engine.py
"""

from typing import Dict, Any, Optional
import httpx

from config import GEMINI_API_KEY, PRIMARY_LLM_MODEL, FALLBACK_LLM_MODEL
from knowledge import fetch_store_catalog
from retriever import retrieve_contexts
from guards import check_pii_security, check_jailbreak, check_off_topic


def build_system_prompt(contexts: list, current_user: Optional[Dict[str, Any]] = None) -> str:
    """Tạo System Prompt chứa dữ liệu thực tế từ kho tri thức và quy tắc phản hồi."""
    context_text = "\n".join([f"- {c['text']}" for c in contexts])

    display_name = current_user.get("fullName") or current_user.get("name") if current_user else None
    user_info = f'Khách hàng đang đăng nhập tên: "{display_name}".' if display_name else "Khách hàng là khách vãng lai."

    return f"""Bạn là Trợ lý Tư vấn Khách hàng AI chuyên nghiệp của HCore Store (chuyên PC Gaming, Laptop, Linh kiện máy tính).
{user_info}
Dưới đây là thông tin thực tế từ cơ sở dữ liệu của cửa hàng:
{context_text or "Không có sản phẩm/chính sách đặc biệt trùng khớp."}

QUY TẮC PHẢN HỒI:
- Tư vấn thân thiện, tự nhiên, ngắn gọn (2-4 câu), đúng trọng tâm câu hỏi của khách hàng.
- Nêu rõ tên sản phẩm và giá tiền cụ thể dựa đúng trên dữ liệu cửa hàng đã cung cấp ở trên, không tự bịa đặt giá hay cấu hình.
- Nếu câu hỏi tìm kiếm theo tầm giá, hãy ưu tiên gợi ý các mẫu máy phù hợp nhất trong ngân sách của khách.
- Tuyệt đối bảo mật: Không cung cấp thông tin cá nhân (SĐT, mật khẩu, địa chỉ) hay dữ liệu nội bộ hệ thống.
- Nếu câu hỏi hoàn toàn không liên quan (toán học, tin tức...), lịch sự từ chối và hướng khách hàng về các sản phẩm/dịch vụ của shop."""


async def call_gemini_llm(user_query: str, system_prompt: str, api_key: str) -> Optional[str]:
    """Gọi Gemini API theo thứ tự ưu tiên: gemini-3.5-flash-lite (siêu nhanh ~1s), fallback gemini-3.6-flash."""
    models = [PRIMARY_LLM_MODEL, FALLBACK_LLM_MODEL]

    async with httpx.AsyncClient(timeout=10.0) as client:
        for model in models:
            try:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
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
                        if text.strip():
                            return text.strip()
            except Exception as err:
                print(f"[RAG] Lỗi gọi model {model}: {err}")
    return None


def build_offline_fallback_reply(contexts: list) -> str:
    """Tạo câu trả lời fallback theo mẫu khi mất mạng hoặc không có API Key."""
    policies = [c for c in contexts if c.get("type") == "policy"]
    products = [c for c in contexts if c.get("type") == "product"]

    parts = []
    if policies:
        parts.append(policies[0]["text"])

    if products:
        items = "\n".join([f"• {p['metadata'].get('name', p['text'])}: {int(p['metadata'].get('price', 0)):,}đ" for p in products])
        parts.append(f"Gợi ý sản phẩm phù hợp tại shop:\n{items}")

    return "\n\n".join(parts) if parts else "Cảm ơn bạn đã nhắn tin! Bạn có thể hỏi mình về cấu hình máy, báo giá, trả góp 0% hoặc bảo hành nhé."


async def execute_rag(
    user_query: str,
    current_user: Optional[Dict[str, Any]] = None,
    api_key: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Quy trình điều phối RAG hoàn chỉnh (End-to-End Execution):
    1. Kiểm tra 3 lớp phòng thủ bảo mật (PII, Jailbreak, Off-topic).
    2. Tải danh mục và truy xuất ngữ cảnh bằng Hybrid Neural Search.
    3. Ghép nối tri thức vào System Prompt (Augmentation).
    4. Sinh phản hồi tự nhiên qua Gemini LLM hoặc Local Template (Generation).
    """
    active_key = (api_key or GEMINI_API_KEY).strip()

    # BƯỚC 1: KIỂM TRA BẢO MẬT (GUARDS)
    guard_msg = check_pii_security(user_query) or check_jailbreak(user_query) or check_off_topic(user_query)
    if guard_msg:
        return {"reply": guard_msg, "sources": [], "engine": "security-guard"}

    # BƯỚC 2: RETRIEVE (TRUY XUẤT TRI THỨC)
    catalog = await fetch_store_catalog()
    contexts = await retrieve_contexts(user_query, catalog)

    # BƯỚC 3 & 4: AUGMENT & GENERATE
    if active_key and len(active_key) > 10:
        system_prompt = build_system_prompt(contexts, current_user)
        ai_reply = await call_gemini_llm(user_query, system_prompt, active_key)
        if ai_reply:
            return {
                "reply": ai_reply,
                "sources": contexts,
                "engine": f"python-gemini ({PRIMARY_LLM_MODEL})",
            }

    # BƯỚC 4B: SMART LOCAL FALLBACK (Offline)
    fallback_reply = build_offline_fallback_reply(contexts)
    return {
        "reply": fallback_reply,
        "sources": contexts,
        "engine": "local-rule-fallback",
    }
