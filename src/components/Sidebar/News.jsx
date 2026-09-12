import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Header from "../../components/Header/Header";
import FooterUser from "../../components/Footer/FooterUser";
import Sevicer from "../../components/Sevicer/Sevicer";
import "./News.css";

const CATEGORIES = [
  "Tất cả",
  "Công nghệ",
  "Đánh giá",
  "Khuyến mãi",
  "Hướng dẫn",
  "Sự kiện",
];

const News = () => {
  const [newsList, setNewsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("Tất cả");
  const [searchText, setSearchText] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 6;

  useEffect(() => {
    setLoading(true);
    fetch("http://localhost:3000/news")
      .then((res) => res.json())
      .then((data) => {
        setNewsList(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Lỗi fetch news:", err);
        setLoading(false);
      });
  }, []);

  // Lọc tin tức theo danh mục và từ khóa
  const filtered = newsList.filter((item) => {
    const matchCat =
      activeCategory === "Tất cả" || item.category === activeCategory;
    const matchSearch =
      item.title?.toLowerCase().includes(searchText.toLowerCase()) ||
      item.desc?.toLowerCase().includes(searchText.toLowerCase());
    return matchCat && matchSearch;
  });

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = filtered.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  return (
    <>
      <Header />

      <div className="demo-bar">
        <div className="demo-bread">
          <Link to="/">
            <span>Trang chủ</span>
          </Link>
          <span className="demo-bread-current"> Tin tức</span>
        </div>
      </div>

      <div className="nw-page">
        <div className="nw-container">
          <div className="nw-header">
            {/* <h1>Tin tức công nghệ</h1>
            <p>Cập nhật mới nhất về PC, Laptop, linh kiện và khuyến mãi</p> */}
          </div>

          <div className="nw-filter">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                className={`nw-filter__tag ${activeCategory === cat ? "nw-filter__tag--active" : ""}`}
                onClick={() => {
                  setActiveCategory(cat);
                  setCurrentPage(1);
                }}
              >
                {cat}
              </button>
            ))}
            <div className="nw-filter__search">
              <input
                type="text"
                placeholder="Tìm bài viết..."
                value={searchText}
                onChange={(e) => {
                  setSearchText(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>
          </div>

          {loading ? (
            <div className="nw-loading">Đang tải tin tức...</div>
          ) : paginated.length === 0 ? (
            <div className="nw-empty">Không tìm thấy bài viết nào.</div>
          ) : (
            <div className="nw-grid">
              {paginated.map((item) => (
                <div key={item.id} className="nw-card">
                  <div
                    className={`nw-card__img nw-card__img--${item.color || "blue"}`}
                  >
                    {/* Kiểm tra đường dẫn ảnh ưu tiên từ thumbnail sang image */}
                    <img
                      src={
                        item.thumbnail ||
                        item.image ||
                        "/images/default-news.jpg"
                      }
                      alt={item.title}
                      onError={(e) => {
                        e.target.src = "/images/default-news.jpg";
                      }}
                    />
                  </div>
                  <div className="nw-card__body">
                    <div className="nw-card__meta">
                      <span
                        className={`nw-badge nw-badge--${item.categorySlug || "tech"}`}
                      >
                        {item.category}
                      </span>
                      <span className="nw-card__date">
                        {item.date
                          ? new Date(item.date).toLocaleDateString("vi-VN")
                          : "N/A"}
                      </span>
                    </div>
                    <h3 className="nw-card__title">{item.title}</h3>
                    <p className="nw-card__desc">{item.desc}</p>
                  </div>
                  <div className="nw-card__footer">
                    <Link to={`/news/${item.id}`} className="nw-card__link">
                      Đọc thêm →
                    </Link>
                    <span className="nw-card__views">
                      {item.views?.toLocaleString()} lượt xem
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div className="nw-pagination">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  className={`nw-pagination__btn ${currentPage === p ? "nw-pagination__btn--active" : ""}`}
                  onClick={() => setCurrentPage(p)}
                >
                  {p}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <Sevicer />
      <FooterUser />
    </>
  );
};

export default News;
