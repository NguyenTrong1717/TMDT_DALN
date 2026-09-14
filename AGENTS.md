# GUIDELINES & RULES FOR TMDT_DALN

## 1. Browser & Screenshot Policy (Quan trọng)
- **KHÔNG TỰ Ý MỞ TRÌNH DUYỆT & SCREENSHOT**: Khi thực hiện các tác vụ lập trình Frontend (React, CSS, JSX, UI/UX), **tuyệt đối không tự động kích hoạt `browser_subagent` hoặc chụp ảnh màn hình**. Việc mở trình duyệt tự động làm chậm quá trình code và gây bất tiện cho người dùng.
- **CHẾ ĐỘ TẬP TRUNG TỐC ĐỘ (FAST MODE)**: Sửa code trực tiếp trong file -> Vite dev server (`http://localhost:5173`) sẽ tự động Hot-Reload tức thì (HMR < 50ms) trên trình duyệt thực tế của người dùng.
- **KHI NÀO MỚI BẬT SCREENSHOT / TRÌNH DUYỆT**: Chỉ khởi chạy browser subagent và chụp ảnh màn hình khi người dùng có yêu cầu rõ ràng bằng các từ khóa như:
  - *"chụp màn hình"*
  - *"screenshot"*
  - *"mở web kiểm tra lại"*
  - *"test trên browser"*

## 2. Server & Architecture Conventions
- Frontend: React + Vite chạy tại `http://localhost:5173`
- Mock Data API: json-server chạy tại `http://localhost:3000`
- Python RAG AI Service: FastAPI Uvicorn chạy tại `http://127.0.0.1:8000` (lệnh `npm run rag`)
