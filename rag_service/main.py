"""
=========================================================
HCORE STORE - FASTAPI BACKEND SERVER FOR RAG CHATBOT
File: rag_service/main.py
Port: 8000
=========================================================
"""

import os
import sys
from pathlib import Path

# Đảm bảo thư mục rag_service luôn nằm trong sys.path
BASE_DIR = Path(__file__).resolve().parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from typing import Dict, Any, Optional, List
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import uvicorn
from dotenv import load_dotenv

from rag_engine import execute_rag

load_dotenv()

app = FastAPI(
    title="HCore Store RAG AI Service",
    description="Microservice xử lý RAG Chatbot chuyên sâu cho hệ thống TMDT HCore",
    version="2.0.0",
)

# Cấu hình CORS cho phép React frontend kết nối
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatRequest(BaseModel):
    userQuery: str = Field(..., description="Câu hỏi của người dùng")
    currentUser: Optional[Dict[str, Any]] = Field(default=None, description="Thông tin user đang đăng nhập")
    apiKey: Optional[str] = Field(default=None, description="Tùy chọn API Key ghi đè")


class ChatResponse(BaseModel):
    reply: str
    sources: List[Dict[str, Any]] = []
    engine: str


@app.get("/")
def read_root():
    return {
        "status": "online",
        "service": "HCore Store Python RAG Service",
        "version": "2.0.0",
        "endpoints": ["/api/health", "/api/chat"],
    }


@app.get("/api/health")
def health_check():
    return {"status": "ok", "engine": "FastAPI + Gemini RAG", "port": 8000}


@app.post("/api/chat", response_model=ChatResponse)
async def chat_endpoint(payload: ChatRequest):
    query = payload.userQuery.strip()
    if not query:
        raise HTTPException(status_code=400, detail="Query cannot be empty")

    try:
        result = await execute_rag(
            user_query=query,
            current_user=payload.currentUser,
            api_key=payload.apiKey,
        )
        return ChatResponse(
            reply=result.get("reply", ""),
            sources=result.get("sources", []),
            engine=result.get("engine", "python-rag"),
        )
    except Exception as exc:
        print(f"[ERROR] /api/chat error: {exc}")
        raise HTTPException(status_code=500, detail=str(exc))


if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    print(f"Khởi động HCore RAG Python Service tại http://localhost:{port}")
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
