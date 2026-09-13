import { useEffect, useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import Header from "../../components/Header/Header";
import Footer from "../../components/Footer/FooterUser";
import ProductCard from "../../components/ProductCard/ProductCard";
import FacetedFilterBar from "../../components/FacetedFilter/FacetedFilterBar";
import SeoArticleSection from "../../components/SeoContent/SeoArticleSection";
import "./SearchResults.css";

// Bỏ dấu tiếng Việt + lowercase + gọn khoảng trắng
const normalize = (str = "") =>
  str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/\s+/g, " ")
    .trim();

const SearchResults = () => {
  const [searchParams] = useSearchParams();
  const rawQuery = searchParams.get("q") || "";
  const query = normalize(rawQuery);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilters, setActiveFilters] = useState({});

  useEffect(() => {
    const fetchAllProducts = async () => {
      setLoading(true);
      try {
        const [res1, res2, res3, res4] = await Promise.all([
          fetch("http://localhost:3000/products"),
          fetch("http://localhost:3000/eventList"),
          fetch("http://localhost:3000/catenogies"),
          fetch("http://localhost:3000/LaptopUser"),
        ]);

        const [p1, p2, p3, p4] = await Promise.all([
          res1.ok ? res1.json() : [],
          res2.ok ? res2.json() : [],
          res3.ok ? res3.json() : [],
          res4.ok ? res4.json() : [],
        ]);

        // Gắn nguồn bảng để chuyển hướng và add to cart chính xác
        const taggedP1 = p1.map((item) => ({ ...item, _source: "products", _url: `/page/${item.id}` }));
        const taggedP2 = p2.map((item) => ({ ...item, _source: "eventList", _url: `/component/${item.id}` }));
        const taggedP3 = p3.map((item) => ({ ...item, _source: "catenogies", _url: `/product/${item.id}` }));
        const taggedP4 = p4.map((item) => ({ ...item, _source: "LaptopUser", _url: `/laptop-detail/${item.id}` }));

        const merged = [...taggedP1, ...taggedP2, ...taggedP3, ...taggedP4];
        const seen = new Set();
        const allItems = merged.filter((item) => {
          const key = `${item.id}-${item.name}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });

        const terms = query.split(" ").filter(Boolean);

        const matched = allItems
          .map((item) => {
            const name = normalize(item.name || "");
            const matchesAll = terms.every((term) => name.includes(term));
            if (!matchesAll) return null;

            const relevance = name.startsWith(query)
              ? 0
              : name.indexOf(query) === -1
                ? 2
                : 1;
            return { ...item, _relevance: relevance };
          })
          .filter(Boolean)
          .sort((a, b) => a._relevance - b._relevance);

        setResults(matched);
      } catch (error) {
        console.error("Lỗi tìm kiếm:", error);
        setResults([]);
      } finally {
        setLoading(false);
      }
    };

    if (query) {
      fetchAllProducts();
    } else {
      setResults([]);
      setLoading(false);
    }
  }, [query]);

  // Faceted filter logic
  const filteredResults = useMemo(() => {
    let list = [...results];

    if (activeFilters.price) {
      if (activeFilters.price === "p-under-10") list = list.filter((i) => i.price < 10000000);
      else if (activeFilters.price === "p-10-15")
        list = list.filter((i) => i.price >= 10000000 && i.price <= 15000000);
      else if (activeFilters.price === "p-15-25")
        list = list.filter((i) => i.price >= 15000000 && i.price <= 25000000);
      else if (activeFilters.price === "p-above-25")
        list = list.filter((i) => i.price > 25000000);
    }

    return list;
  }, [results, activeFilters]);

  return (
    <div className="search-page">
      <Header />
      <main className="search-content">
        <div className="search-header-box">
          <h2>
            Kết quả tìm kiếm cho: <span className="search-query-highlight">"{rawQuery}"</span>
          </h2>
          <p className="search-sub-info">
            Tìm thấy <strong>{filteredResults.length}</strong> sản phẩm công nghệ phù hợp
          </p>
        </div>

        {/* Faceted Filter Bar */}
        <FacetedFilterBar
          onFilterChange={(filters) => setActiveFilters(filters)}
          totalCount={filteredResults.length}
        />

        {loading ? (
          <div className="loading-box">Đang tìm kiếm sản phẩm...</div>
        ) : (
          <div className="search-grid">
            {filteredResults.length > 0 ? (
              filteredResults.map((item) => (
                <div key={`${item.id}-${item.name}`} className="search-card-wrapper">
                  <ProductCard
                    product={item}
                    targetUrl={item._url}
                    fromTable={item._source}
                  />
                </div>
              ))
            ) : (
              <div className="empty-search">
                <p>Không tìm thấy sản phẩm nào phù hợp với từ khóa.</p>
              </div>
            )}
          </div>
        )}
      </main>

      <SeoArticleSection categoryTitle={`Tìm kiếm: ${rawQuery}`} />
      <Footer />
    </div>
  );
};

export default SearchResults;
