@echo off
title HCore Store - Python RAG Service (Port 8000)
cd /d "%~dp0"

if not exist ".venv\Scripts\python.exe" (
    echo [INFO] Dang khoi tao moi truong ao Python .venv...
    python -m venv .venv
    echo [INFO] Dang cai dat thu vien requirements.txt...
    .venv\Scripts\pip install -r requirements.txt
)

echo [OK] Dang khoi dong FastAPI Server tai http://localhost:8000 ...
.venv\Scripts\python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
pause
