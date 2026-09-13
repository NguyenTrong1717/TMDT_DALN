import { useEffect, useState, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import Header from "../../components/Header/Header";
import FooterUser from "../../components/Footer/FooterUser";
import Sevicer from "../../components/Sevicer/Sevicer";
import FacetedFilterBar from "../FacetedFilter/FacetedFilterBar";
import LaptopCard from "../ProductCard/LaptopCard";
import SeoArticleSection from "../SeoContent/SeoArticleSection";
import "./LaptopMenu.css";

const DEMAND_TILES = [
  { label: "Văn phòng", category: "laptop-cu", image: "/images/LT1.png" },
  { label: "Gaming", category: "laptop-gaming", image: "/images/Game.jpg" },
  { label: "Mỏng nhẹ", category: "laptop-moi", image: "/images/LT5.jpg" },
  { label: "Đồ họa - kỹ thuật", category: "laptop-do-hoa", image: "/images/DH.jpg" },
  { label: "Sinh viên", category: "laptop-gia-uu-dai", image: "/images/LT3.jpg" },
  { label: "Cao cấp", category: "laptop-van-phong", image: "/images/LT11.png" },
];

const SORT_OPTIONS = [
  { label: "Mặc định", value: "default" },
  { label: "Giá thấp → cao", value: "price-asc" },
  { label: "Giá cao → thấp", value: "price-desc" },
  { label: "Giảm giá nhiều", value: "discount-desc" },
];

const ITEMS_PER_PAGE = 12;

const LaptopMenu = () => {
  const { category } = useParams();
  const navigate = useNavigate();

  const [allItems, setAllItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState("default");
  const [currentPage, setCurrentPage] = useState(1);
  const [activeFilters, setActiveFilters] = useState({});

  const activeTab = DEMAND_TILES.find((t) => t.category === category) || {
    label: category ? category.replace(/-/g, " ").toUpperCase() : "LAPTOP GAMING",
    category: category || "laptop-gaming",
  };

  useEffect(() => {
    setLoading(true);
    setCurrentPage(1);
    fetch(`http://localhost:3000/LaptopUser?category=${category}`)
      .then((res) => res.json())
      .then((data) => {
        if (data && data.length > 0) {
          setAllItems(data);
        } else {
          // Fallback if exact slug not matched in db
          fetch("http://localhost:3000/LaptopUser")
            .then((r) => r.json())
            .then((all) => setAllItems(all || []));
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Lỗi fetch LaptopUser:", err);
        setLoading(false);
      });
  }, [category]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [category, currentPage]);

  const filteredItems = useMemo(() => {
    let result = [...allItems];

    if (activeFilters.price) {
      if (activeFilters.price === "p-under-10") result = result.filter((item) => item.price < 10000000);
      else if (activeFilters.price === "p-10-15")
        result = result.filter((item) => item.price >= 10000000 && item.price <= 15000000);
      else if (activeFilters.price === "p-15-25")
        result = result.filter((item) => item.price >= 15000000 && item.price <= 25000000);
      else if (activeFilters.price === "p-above-25")
        result = result.filter((item) => item.price > 25000000);
    }

    return result.sort((a, b) => {
      if (sort === "price-asc") return a.price - b.price;
      if (sort === "price-desc") return b.price - a.price;
      if (sort === "discount-desc") return (b.discount || 0) - (a.discount || 0);
      return 0;
    });
  }, [allItems, sort, activeFilters]);

  const totalPages = Math.ceil(filteredItems.length / ITEMS_PER_PAGE);
  const paginated = filteredItems.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

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

      {/* TABS - TILES CHỌN THEO NHU CẦU CÓ HÌNH ẢNH MINH HỌA */}
      <div className="lp-tabs-wrap">
        <div className="lp-tabs">
          {DEMAND_TILES.map((tab) => (
            <button
              key={tab.label}
              className={`demand-tile-btn ${tab.category === category ? "active" : ""}`}
              onClick={() => navigate(`/laptop/${tab.category}`)}
            >
              <img src={tab.image} alt={tab.label} className="demand-tile-img" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* MAIN */}
      <div className="lp-page">
        <div className="lp-container">
          {/* FACETED FILTER BAR */}
          <FacetedFilterBar
            onFilterChange={(filters) => {
              setActiveFilters(filters);
              setCurrentPage(1);
            }}
            totalCount={filteredItems.length}
          />

          {/* TOOLBAR */}
          <div className="lp-toolbar">
            <div className="lp-toolbar__left">
              <h1 className="lp-title">{activeTab.label}</h1>
              {!loading && (
                <span className="lp-count">{filteredItems.length} sản phẩm</span>
              )}
            </div>
            <div className="lp-toolbar__right">
              <label className="lp-sort-label">Sắp xếp:</label>
              <select
                className="lp-sort-select"
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

          {/* 6-LAYER LAPTOP GRID */}
          {loading ? (
            <div className="lp-loading">Đang tải sản phẩm...</div>
          ) : paginated.length === 0 ? (
            <div className="lp-empty">
              <p>Không có sản phẩm nào phù hợp với bộ lọc này.</p>
              <Link to="/">Quay lại trang chủ</Link>
            </div>
          ) : (
            <div className="lp-grid">
              {paginated.map((item) => (
                <div key={item.id} className="lp-card-item-wrapper">
                  <LaptopCard product={item} />
                </div>
              ))}
            </div>
          )}

          {/* PAGINATION */}
          {totalPages > 1 && (
            <div className="lp-pagination">
              <button
                className="lp-pagination__btn"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                ‹
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  className={`lp-pagination__btn ${currentPage === p ? "lp-pagination__btn--active" : ""}`}
                  onClick={() => setCurrentPage(p)}
                >
                  {p}
                </button>
              ))}
              <button
                className="lp-pagination__btn"
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

      {/* SEO ARTICLE SECTION */}
      <SeoArticleSection categoryTitle={activeTab.label} />

      <Sevicer />
      <FooterUser />
    </>
  );
};

export default LaptopMenu;
