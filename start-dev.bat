@echo off
setlocal
cd /d "%~dp0"
chcp 65001 > nul
title HCore Store - Multi-Service Dev Runner

echo ================================================================
echo    HCORE STORE - KHOI DONG 3 DICH VU TREN 3 CUA SO RIENG BIET
echo ================================================================
echo.
echo   [1] Frontend Web (Vite React)         : http://localhost:5173
echo   [2] Backend API (Express + MongoDB)   : http://127.0.0.1:3000
echo   [3] AI RAG Service (Python FastAPI)   : http://127.0.0.1:8000
echo.
echo Dang mo 3 cua so console doc lap...
echo.

set PYTHONUTF8=1
set PYTHONIOENCODING=utf-8

:: 1. Khoi dong Frontend
start "[1] Frontend Vite - Port 5173" /d "%~dp0" cmd /k "color 0B && title [1] HCore Frontend (Port 5173) && npm run dev:vite"

:: 2. Khoi dong Backend
start "[2] Backend API - Port 3000" /d "%~dp0" cmd /k "color 0A && title [2] HCore Backend (Port 3000) && npm run server"

:: 3. Khoi dong Python RAG Service
start "[3] AI RAG Service - Port 8000" /d "%~dp0" cmd /k "color 0D && title [3] HCore AI RAG Service (Port 8000) && npm run rag"

echo.
echo  Da khoi dong xong ca 3 dich vu!
echo  Ban co the theo doi tung cua so console rieng biet.
echo  Kiem tra trang thai bang lenh: npm run check:health
echo  Don sach port bi ket bang lenh: npm run clean:ports
echo.
pause