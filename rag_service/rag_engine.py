"""
HCORE STORE - RAG ENGINE
Backward-compatible re-export module.
Chuyển tiếp đến rag_service/engine.py.
"""

from engine import execute_rag, build_system_prompt, call_gemini_llm, build_offline_fallback_reply
from retriever import retrieve_contexts, search_vector_store, parse_budget_and_category
from embeddings import get_embed_model
from chunker import create_semantic_chunks
from knowledge import fetch_store_catalog, STORE_POLICIES
from guards import check_pii_security, check_jailbreak, check_off_topic

__all__ = [
    "execute_rag",
    "build_system_prompt",
    "call_gemini_llm",
    "build_offline_fallback_reply",
    "retrieve_contexts",
    "search_vector_store",
    "parse_budget_and_category",
    "get_embed_model",
    "create_semantic_chunks",
    "fetch_store_catalog",
    "STORE_POLICIES",
    "check_pii_security",
    "check_jailbreak",
    "check_off_topic",
]
