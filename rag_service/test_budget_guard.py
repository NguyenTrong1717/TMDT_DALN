import unittest
from unittest.mock import AsyncMock, patch

from engine import build_budget_no_match_reply
from retriever import parse_budget_and_category, retrieve_contexts


class BudgetParsingTests(unittest.TestCase):
    def test_parses_thousand_unit(self):
        filters = parse_budget_and_category("laptop gia 1 nghin")
        self.assertEqual(filters["target_price"], 1_000)

    def test_parses_strict_million_ceiling(self):
        filters = parse_budget_and_category("laptop duoi 15 trieu")
        self.assertEqual(filters["max_price"], 15_000_000)

    def test_parses_formatted_vnd_amount(self):
        filters = parse_budget_and_category("laptop gia 1.000.000 dong")
        self.assertEqual(filters["target_price"], 1_000_000)


class BudgetRetrievalTests(unittest.IsolatedAsyncioTestCase):
    async def test_rejects_placeholder_and_over_budget_prices(self):
        catalog = [
            {"id": "fake", "name": "Fake laptop", "price": 1, "category": "laptop"},
            {"id": "real", "name": "Real laptop", "price": 9_000_000, "category": "laptop"},
        ]

        contexts = await retrieve_contexts("laptop gia 1 nghin", catalog)

        self.assertFalse(any(item.get("type") == "product" for item in contexts))

    async def test_target_budget_never_returns_far_more_expensive_product(self):
        catalog = [
            {"id": "fit", "name": "Laptop 9M", "price": 9_000_000, "category": "laptop"},
            {"id": "high", "name": "Laptop 20M", "price": 20_000_000, "category": "laptop"},
        ]

        async def return_candidates(_query, chunks, top_k=12):
            return [{**chunk, "score": 0.8} for chunk in chunks[:top_k]]

        with patch("retriever.search_vector_store", new=AsyncMock(side_effect=return_candidates)):
            contexts = await retrieve_contexts("laptop tam 10 trieu", catalog)

        product_ids = [item["metadata"]["id"] for item in contexts if item.get("type") == "product"]
        self.assertIn("fit", product_ids)
        self.assertNotIn("high", product_ids)

    def test_no_match_reply_does_not_offer_expensive_products(self):
        filters = parse_budget_and_category("laptop gia 1 nghin")
        reply = build_budget_no_match_reply(
            filters,
            [{"id": "real", "name": "Laptop", "price": 9_000_000, "category": "laptop"}],
        )

        self.assertIn("1.000d", reply.replace("đ", "d"))
        self.assertIn("9.000.000d", reply.replace("đ", "d"))


if __name__ == "__main__":
    unittest.main()
