import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Header from "../../components/Header/Header";
import Footer from "../../components/Footer/FooterUser";
import ComponentCard from "../../components/ProductCard/ComponentCard";
import "./SearchResults.css";

// Bỏ dấu tiếng Việt + lowercase + gọn khoảng trắng, để so khớp không phân biệt dấu
const normalize = (str = "") =>
  str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // xoá dấu
    .replace(/đ/g, "d")
    .replace(/\s+/g, " ")
    .trim();

const SearchResults = () => {
  const [searchParams] = useSearchParams();
  const rawQuery = searchParams.get("q") || "";
  const query = normalize(rawQuery);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAllProducts = async () => {
      setLoading(true);
      try {
        const [res1, res2] = await Promise.all([
          fetch("http://localhost:3000/products"),
          fetch("http://localhost:3000/eventList"),
        ]);

        const products = await res1.json();
        const eventList = await res2.json();

        // Gộp mảng, loại trùng theo id (phòng trường hợp 2 nguồn dữ liệu có id giao nhau)
        const merged = [...products, ...eventList];
        const seen = new Set();
        const allItems = merged.filter((item) => {
          const key = `${item.id}-${item.name}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });

        // Tách query thành từng từ, yêu cầu tất cả từ đều xuất hiện trong tên (không cần đúng thứ tự)
        const terms = query.split(" ").filter(Boolean);

        const matched = allItems
          .map((item) => {
            const name = normalize(item.name || "");
            const matchesAll = terms.every((term) => name.includes(term));
            if (!matchesAll) return null;

            // Tính độ ưu tiên: khớp ngay từ đầu tên > khớp ở giữa tên
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

  return (
    <div className="search-page">
      <Header />
      <main className="search-content">
        <h2>
          Kết quả tìm kiếm cho: <span>"{rawQuery}"</span>
        </h2>

        {loading ? (
          <div className="loading-box">Đang tìm kiếm sản phẩm...</div>
        ) : (
          <div className="search-grid">
            {results.length > 0 ? (
              results.map((item) => (
                <ComponentCard key={`${item.id}-${item.name}`} product={item} />
              ))
            ) : (
              <div className="no-result">
                <p>
                  Rất tiếc, không tìm thấy sản phẩm phù hợp với từ khóa này.
                </p>
              </div>
            )}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default SearchResults;
