import { useEffect, useState, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import Header from "../../components/Header/Header";
import FooterUser from "../../components/Footer/FooterUser";
import Sevicer from "../../components/Sevicer/Sevicer";
import FacetedFilterBar from "../FacetedFilter/FacetedFilterBar";
import ProductCard from "../ProductCard/ProductCard";
import SeoArticleSection from "../SeoContent/SeoArticleSection";
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
  const [activeFilters, setActiveFilters] = useState({});

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

  // Apply faceted filters
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

    if (activeFilters.ram) {
      if (activeFilters.ram === "ram-16") result = result.filter((item) => item.name?.includes("16G") || item.name?.includes("16GB"));
      else if (activeFilters.ram === "ram-32") result = result.filter((item) => item.name?.includes("32G") || item.name?.includes("32GB"));
    }

    if (activeFilters.vga) {
      if (activeFilters.vga === "vga-4060") result = result.filter((item) => item.name?.includes("4060"));
      else if (activeFilters.vga === "vga-3060") result = result.filter((item) => item.name?.includes("3060"));
      else if (activeFilters.vga === "vga-4070") result = result.filter((item) => item.name?.includes("4070"));
    }

    // Sort
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
          {/* FACETED FILTER BAR */}
          <FacetedFilterBar
            onFilterChange={(filters) => {
              setActiveFilters(filters);
              setCurrentPage(1);
            }}
            totalCount={filteredItems.length}
          />

          {/* TOOLBAR */}
          <div className="cp-toolbar">
            <div className="cp-toolbar__left">
              <h1 className="cp-title">{activeTab.label}</h1>
              {!loading && (
                <span className="cp-count">{filteredItems.length} sản phẩm</span>
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

          {/* 6-LAYER PRODUCT GRID */}
          {loading ? (
            <div className="cp-loading">Đang tải sản phẩm...</div>
          ) : paginated.length === 0 ? (
            <div className="cp-empty">
              <p>Không có sản phẩm nào phù hợp với bộ lọc này.</p>
              <Link to="/">Quay lại trang chủ</Link>
            </div>
          ) : (
            <div className="cp-grid">
              {paginated.map((item) => (
                <div key={item.id} className="cp-card-item-wrapper">
                  <ProductCard
                    product={item}
                    targetUrl={`/product/${item.id}`}
                    fromTable="catenogies"
                  />
                </div>
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

      {/* SEO ARTICLE SECTION */}
      <SeoArticleSection categoryTitle={activeTab.label} />

      <Sevicer />
      <FooterUser />
    </>
  );
};

export default CategoryPage;
