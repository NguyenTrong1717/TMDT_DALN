import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { AiFillCheckCircle } from "react-icons/ai";
import { PiShoppingCartDuotone } from "react-icons/pi";
import { toast } from "sonner";
import Header from "../Header/Header";
import FooterUser from "../Footer/FooterUser";
import Sevicer from "../Sevicer/Sevicer";
import "./EventListPage.css";

const TABS = [
  { label: "CARD ĐỒ HỌA", category: "vga" },
  { label: "CPU - BỘ XỬ LÝ", category: "cpu" },
  { label: "MAINBOARD", category: "mainboard" },
  { label: "Ổ CỨNG HDD", category: "hdd" },
  { label: "PSU - NGUỒN", category: "psu" },
  { label: "RAM - BỘ NHỚ TRONG", category: "ram" },
];

const SORT_OPTIONS = [
  { label: "Mặc định", value: "default" },
  { label: "Giá thấp → cao", value: "price-asc" },
  { label: "Giá cao → thấp", value: "price-desc" },
  { label: "Giảm giá nhiều", value: "discount-desc" },
];

const ITEMS_PER_PAGE = 12;

const EventListPage = () => {
  const { category } = useParams();
  const navigate = useNavigate();

  const [allItems, setAllItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [sort, setSort] = useState("default");
  const [currentPage, setCurrentPage] = useState(1);

  const activeTab = TABS.find((t) => t.category === category) || TABS[0];

  useEffect(() => {
    setLoading(true);
    setError(false);
    setCurrentPage(1);

    fetch(
      `http://localhost:3000/eventList?category=${encodeURIComponent(category)}`,
    )
      .then((res) => res.json())
      .then((data) => {
        setAllItems(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Lỗi fetch danh sách linh kiện:", err);
        setAllItems([]);
        setError(true);
        setLoading(false);
      });
  }, [category]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [category, currentPage]);

  const sorted = [...allItems].sort((a, b) => {
    if (sort === "price-asc") return a.price - b.price;
    if (sort === "price-desc") return b.price - a.price;
    if (sort === "discount-desc") return (b.discount || 0) - (a.discount || 0);
    return 0;
  });

  const totalPages = Math.ceil(sorted.length / ITEMS_PER_PAGE);
  const paginated = sorted.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  const handleAddToCart = (e, item) => {
    e.preventDefault();
    const currentUser = JSON.parse(localStorage.getItem("currentUser"));
    if (!currentUser) {
      toast.warning("Vui lòng đăng nhập để thêm vào giỏ hàng!");
      navigate("/login");
      return;
    }
    toast.success(`Đã thêm "${item.name}" vào giỏ hàng!`);
  };

  return (
    <>
      <Header />

      {/* BREADCRUMB */}
      <div className="demo-bar">
        <div className="demo-bread">
          <Link to="/">
            <span>Trang chủ</span>
          </Link>
          <span className="demo-bread-current">{activeTab.label}</span>
        </div>
      </div>

      {/* TABS */}
      <div className="elp-tabs-wrap">
        <div className="elp-tabs">
          {TABS.map((tab) => (
            <button
              key={tab.category}
              className={`elp-tab ${tab.category === category ? "elp-tab--active" : ""}`}
              onClick={() => navigate(`/component/${tab.category}`)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* MAIN */}
      <div className="elp-page">
        <div className="elp-container">
          {/* TOOLBAR */}
          <div className="elp-toolbar">
            <div className="elp-toolbar__left">
              <h1 className="elp-title">{activeTab.label}</h1>
              {!loading && !error && (
                <span className="elp-count">{allItems.length} sản phẩm</span>
              )}
            </div>
            <div className="elp-toolbar__right">
              <label className="elp-sort-label">Sắp xếp:</label>
              <select
                className="elp-sort-select"
                value={sort}
                onChange={(e) => {
                  setSort(e.target.value);
                  setCurrentPage(1);
                }}
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* GRID */}
          {loading ? (
            <div className="elp-loading">Đang tải sản phẩm...</div>
          ) : error ? (
            <div className="elp-empty">
              <p>Không tải được dữ liệu, vui lòng thử lại sau.</p>
              <Link to="/">Quay lại trang chủ</Link>
            </div>
          ) : paginated.length === 0 ? (
            <div className="elp-empty">
              <p>Không có sản phẩm nào trong danh mục này.</p>
              <Link to="/">Quay lại trang chủ</Link>
            </div>
          ) : (
            <div className="elp-grid">
              {paginated.map((item) => (
                <Link
                  to={`/component-category/${item.id}`}
                  className="elp-card-link"
                  key={item.id}
                >
                  <div className="elp-card">
                    {item.discount && (
                      <div className="elp-card__badge">-{item.discount}%</div>
                    )}
                    <div className="elp-card__img">
                      <img src={item.image} alt={item.name} />
                    </div>
                    <div className="elp-card__info">
                      <h4 className="elp-card__name">{item.name}</h4>
                      <p className="elp-card__status">
                        <AiFillCheckCircle className="elp-card__status-icon" />
                        {item.status || "Còn hàng"}
                      </p>
                      <div className="elp-card__price-row">
                        <div className="elp-card__prices">
                          <span className="elp-card__price">
                            {item.price ? item.price.toLocaleString() : 0}đ
                          </span>
                          {item.oldPrice && (
                            <span className="elp-card__old-price">
                              {item.oldPrice.toLocaleString()}đ
                            </span>
                          )}
                        </div>
                        <button
                          className="elp-card__cart-btn"
                          title="Thêm vào giỏ"
                          onClick={(e) => handleAddToCart(e, item)}
                        >
                          <PiShoppingCartDuotone />
                        </button>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* PAGINATION */}
          {totalPages > 1 && (
            <div className="elp-pagination">
              <button
                className="elp-pagination__btn"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                ‹
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  className={`elp-pagination__btn ${currentPage === p ? "elp-pagination__btn--active" : ""}`}
                  onClick={() => setCurrentPage(p)}
                >
                  {p}
                </button>
              ))}
              <button
                className="elp-pagination__btn"
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={currentPage === totalPages}
              >
                ›
              </button>
            </div>
          )}
        </div>
      </div>

      <Sevicer />
      <FooterUser />
    </>
  );
};

export default EventListPage;
