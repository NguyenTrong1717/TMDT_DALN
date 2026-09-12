import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { AiFillCheckCircle } from "react-icons/ai";
import { PiShoppingCartDuotone } from "react-icons/pi";
import { toast } from "sonner";
import Header from "../../components/Header/Header";
import FooterUser from "../../components/Footer/FooterUser";
import Sevicer from "../../components/Sevicer/Sevicer";
import "./CategoryPage.css";

const TABS = [
  { label: "TOP PC BÁN CHẠY", category: "top-ban-chay" },
  { label: "TOP PC CỰC KHỦNG", category: "top-cuc-khung" },
  { label: "GIẢI NHIỆT PC", category: "giai-nhiet" },
  { label: "MÀN HÌNH ĐỒ HOẠ", category: "man-hinh" },
];

const SORT_OPTIONS = [
  { label: "Mặc định", value: "default" },
  { label: "Giá thấp → cao", value: "price-asc" },
  { label: "Giá cao → thấp", value: "price-desc" },
  { label: "Giảm giá nhiều", value: "discount-desc" },
];

const ITEMS_PER_PAGE = 12;

const CategoryPage = () => {
  const { category } = useParams();
  const navigate = useNavigate();

  const [allItems, setAllItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState("default");
  const [currentPage, setCurrentPage] = useState(1);

  const activeTab = TABS.find((t) => t.category === category) || TABS[0];

  useEffect(() => {
    setLoading(true);
    setCurrentPage(1);
    fetch(`http://localhost:3000/catenogies?category=${category}`)
      .then((res) => res.json())
      .then((data) => {
        setAllItems(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Lỗi fetch category:", err);
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
      <div className="cp-tabs-wrap">
        <div className="cp-tabs">
          {TABS.map((tab) => (
            <button
              key={tab.category}
              className={`cp-tab ${tab.category === category ? "cp-tab--active" : ""}`}
              onClick={() => navigate(`/category/${tab.category}`)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* MAIN */}
      <div className="cp-page">
        <div className="cp-container">
          {/* TOOLBAR */}
          <div className="cp-toolbar">
            <div className="cp-toolbar__left">
              <h1 className="cp-title">{activeTab.label}</h1>
              {!loading && (
                <span className="cp-count">{allItems.length} sản phẩm</span>
              )}
            </div>
            <div className="cp-toolbar__right">
              <label className="cp-sort-label">Sắp xếp:</label>
              <select
                className="cp-sort-select"
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
            <div className="cp-loading">Đang tải sản phẩm...</div>
          ) : paginated.length === 0 ? (
            <div className="cp-empty">
              <p>Không có sản phẩm nào trong danh mục này.</p>
              <Link to="/">Quay lại trang chủ</Link>
            </div>
          ) : (
            <div className="cp-grid">
              {paginated.map((item) => (
                <Link
                  to={`/product/${item.id}`}
                  className="cp-card-link"
                  key={item.id}
                >
                  <div className="cp-card">
                    {item.discount && (
                      <div className="cp-card__badge">-{item.discount}%</div>
                    )}
                    <div className="cp-card__img">
                      <img src={item.image} alt={item.name} />
                    </div>
                    <div className="cp-card__info">
                      <h4 className="cp-card__name">{item.name}</h4>
                      <p className="cp-card__status">
                        <AiFillCheckCircle className="cp-card__status-icon" />
                        {item.status || "Còn hàng"}
                      </p>
                      <div className="cp-card__price-row">
                        <div className="cp-card__prices">
                          <span className="cp-card__price">
                            {item.price ? item.price.toLocaleString() : 0}đ
                          </span>
                          {item.oldPrice && (
                            <span className="cp-card__old-price">
                              {item.oldPrice.toLocaleString()}đ
                            </span>
                          )}
                        </div>
                        <button
                          className="cp-card__cart-btn"
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
            <div className="cp-pagination">
              <button
                className="cp-pagination__btn"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                ‹
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  className={`cp-pagination__btn ${currentPage === p ? "cp-pagination__btn--active" : ""}`}
                  onClick={() => setCurrentPage(p)}
                >
                  {p}
                </button>
              ))}
              <button
                className="cp-pagination__btn"
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

export default CategoryPage;
