@echo off
chcp 65001 > nul
title HCore Store - Multi-Service Dev Runner

echo ================================================================
echo    🚀 HCORE STORE - KHỞI ĐỘNG 3 DỊCH VỤ TRÊN 3 CỬA SỔ RIÊNG BIỆT
echo ================================================================
echo.
echo   [1] Frontend Web (Vite React)         : http://localhost:5173
echo   [2] Backend API (Express + MongoDB)   : http://127.0.0.1:3000
echo   [3] AI RAG Service (Python FastAPI)   : http://127.0.0.1:8000
echo.
echo Đang mở 3 cửa sổ console độc lập...
echo.

:: 1. Khởi động Frontend
start "[1] Frontend Vite - Port 5173" cmd /k "color 0B && title [1] HCore Frontend (Port 5173) && npm run dev:vite"

:: 2. Khởi động Backend
start "[2] Backend API - Port 3000" cmd /k "color 0A && title [2] HCore Backend (Port 3000) && npm run server"

:: 3. Khởi động Python RAG Service
start "[3] AI RAG Service - Port 8000" cmd /k "color 0D && title [3] HCore AI RAG Service (Port 8000) && npm run rag"

echo  Đã khởi động xong cả 3 dịch vụ!
echo Bạn có thể theo dõi từng log riêng mà không bị đè chữ.
echo Khi muốn kiểm tra trạng thái, chạy: npm run check:health
echo Khi muốn dọn sạch port nếu bị kẹt, chạy: npm run clean:ports
echo.
pause
