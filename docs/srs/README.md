# Tài liệu Đặc tả Yêu cầu Phần mềm (SRS) - HCore Store

Chuẩn tham chiếu: IEEE 830 / ISO/IEC/IEEE 29148. Mẫu gốc: `srs-template.md` trong skill `srs-specification`.

## Thứ tự các mục và tiến độ

| # | File | Nội dung | Số trang dự kiến | Trạng thái |
| :-: | :--- | :--- | :-: | :-: |
| 00 | [00_COVER_AND_GLOSSARY.md](00_COVER_AND_GLOSSARY.md) | Trang bìa, lời cảm ơn, mục lục, danh mục từ viết tắt | 3 | ⬜ |
| 01 | [01_INTRODUCTION.md](01_INTRODUCTION.md) | Mục đích, phạm vi, thuật ngữ, tài liệu tham chiếu | 8 | ⬜ |
| 02 | [02_PRODUCT_OVERVIEW.md](02_PRODUCT_OVERVIEW.md) | Bối cảnh hệ thống, chức năng chính, người dùng, ràng buộc | 10 | ⬜ |
| 03 | [03_EXTERNAL_INTERFACES.md](03_EXTERNAL_INTERFACES.md) | Giao diện người dùng, VNPAY/MoMo, Gemini, MongoDB | 10 | ⬜ |
| 04 | [04_FUNCTIONAL_REQUIREMENTS.md](04_FUNCTIONAL_REQUIREMENTS.md) | Yêu cầu chức năng `FR-xxx` kèm tiêu chí nghiệm thu | 18 | ⬜ |
| 05 | [05_NON_FUNCTIONAL_REQUIREMENTS.md](05_NON_FUNCTIONAL_REQUIREMENTS.md) | Hiệu năng, bảo mật, độ tin cậy, tuân thủ | 8 | ⬜ |
| 06 | [06_AI_RAG_SPECIFICATIONS.md](06_AI_RAG_SPECIFICATIONS.md) | Đặc tả chatbot RAG, embedding, guardrails | 10 | ⬜ |
| 07 | [07_VERIFICATION_MATRIX.md](07_VERIFICATION_MATRIX.md) | Ma trận truy vết yêu cầu ↔ test case | 8 | ⬜ |
| 08 | [08_CONCLUSION_AND_FUTURE_WORK.md](08_CONCLUSION_AND_FUTURE_WORK.md) | Kết luận, hạn chế, hướng phát triển | 5 | ⬜ |
| 09 | [09_REFERENCES.md](09_REFERENCES.md) | Tài liệu tham khảo | 2 | ⬜ |
| 10 | [10_APPENDIX.md](10_APPENDIX.md) | Phụ lục: Postman, log kiểm thử, cấu hình Docker | 4 | ⬜ |

Tổng dự kiến: khoảng 86 trang thô. Khi biên soạn sẽ cô đọng về 60-70 trang.

## Quy ước mã định danh

- `FR-<NHÓM>-<SỐ>`: yêu cầu chức năng (ví dụ `FR-PAY-01`)
- `QOS-<NHÓM>-<SỐ>`: chất lượng dịch vụ (ví dụ `QOS-PERF-01`)
- `SEC-<NHÓM>-<SỐ>`: bảo mật (ví dụ `SEC-AUTH-01`)
- `AI-<NHÓM>-<SỐ>`: yêu cầu AI/ML (ví dụ `AI-GRD-01`)

## Thư mục sơ đồ

Các sơ đồ Mermaid/SVG đặt trong `diagrams/` (tạo khi có sơ đồ đầu tiên).
