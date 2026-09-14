"""
Cấu hình hệ thống RAG Chatbot Microservice
File: rag_service/config.py
"""

import os
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent

# Tự động nạp .env từ thư mục rag_service hoặc thư mục gốc
load_dotenv(BASE_DIR / ".env")
load_dotenv()

# API Keys & URLs
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY") or os.getenv("VITE_GEMINI_API_KEY", "")
JSON_SERVER_URL = os.getenv("JSON_SERVER_URL", "http://localhost:3000")
PORT = int(os.getenv("PORT", 8000))

# Model Configurations
EMBEDDING_MODEL_NAME = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
PRIMARY_LLM_MODEL = "gemini-3.5-flash-lite"
FALLBACK_LLM_MODEL = "gemini-3.6-flash"
