"""
Mô hình Local AI Vector Embedding (FastEmbed ONNX)
File: rag_service/embeddings.py
"""

from typing import Optional
import numpy as np
from fastembed import TextEmbedding
from config import EMBEDDING_MODEL_NAME

# Singleton instance của mô hình FastEmbed ONNX
_embed_model: Optional[TextEmbedding] = None


def get_embed_model() -> TextEmbedding:
    """Khởi tạo hoặc trả về singleton model FastEmbed ONNX (384-dimensional dense vectors)."""
    global _embed_model
    if _embed_model is None:
        _embed_model = TextEmbedding(model_name=EMBEDDING_MODEL_NAME)
    return _embed_model


def normalize_vector(vec: np.ndarray) -> np.ndarray:
    """Chuẩn hóa L2 Norm để tích vô hướng chính là Cosine Similarity."""
    norm = np.linalg.norm(vec)
    return vec / norm if norm > 0 else vec
