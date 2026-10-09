import sys
import unittest
from pathlib import Path
from unittest.mock import AsyncMock, patch


RAG_SERVICE_DIR = Path(__file__).resolve().parents[1] / "rag_service"
if str(RAG_SERVICE_DIR) not in sys.path:
    sys.path.insert(0, str(RAG_SERVICE_DIR))

from engine import execute_rag  # noqa: E402
from guards import classify_query_intent  # noqa: E402


class QueryIntentTests(unittest.TestCase):
    def test_routes_supported_and_unsupported_queries(self):
        cases = {
            "Hãy cho tôi xem một chiếc xe đạp": "off_topic",
            "Shop có bán xe đạp không?": "off_topic",
            "Tư vấn laptop gaming dưới 20 triệu": "product_search",
            "Chính sách bảo hành laptop thế nào?": "store_policy",
            "CPU là gì và hoạt động thế nào?": "tech_info",
            "Xin chào shop": "small_talk",
        }

        for query, expected in cases.items():
            with self.subTest(query=query):
                self.assertEqual(classify_query_intent(query), expected)


class RagRoutingTests(unittest.IsolatedAsyncioTestCase):
    async def test_off_topic_query_never_fetches_or_returns_products(self):
        with patch("engine.fetch_store_catalog", new=AsyncMock()) as fetch_catalog:
            result = await execute_rag("Hãy cho tôi xem một chiếc xe đạp", api_key="")

        fetch_catalog.assert_not_awaited()
        self.assertEqual(result["intent"], "off_topic")
        self.assertEqual(result["engine"], "security-guard")
        self.assertEqual(result["sources"], [])
        self.assertIn("xe đạp", result["reply"])

    async def test_small_talk_does_not_enter_retrieval(self):
        with patch("engine.fetch_store_catalog", new=AsyncMock()) as fetch_catalog:
            result = await execute_rag("Xin chào shop", api_key="")

        fetch_catalog.assert_not_awaited()
        self.assertEqual(result["intent"], "small_talk")
        self.assertEqual(result["sources"], [])

    async def test_policy_query_returns_only_policy_sources(self):
        with patch("engine.call_gemini_llm", new=AsyncMock(return_value=None)):
            result = await execute_rag("Chính sách bảo hành laptop thế nào?", api_key="")

        self.assertEqual(result["intent"], "store_policy")
        self.assertTrue(result["sources"])
        self.assertTrue(all(source["type"] == "policy" for source in result["sources"]))


if __name__ == "__main__":
    unittest.main()
