import { useNavigate } from "react-router-dom";
import { useBanners } from "../../hooks/useBanners";
import { BsArrowRightShort } from "react-icons/bs";
import "./CategoryPromo.css";

export default function CategoryPromo({ category, titleFallback = "", customBanner = null }) {
  const navigate = useNavigate();
  const { banners, loading } = useBanners("category_promo", category);
  const banner = customBanner || (banners && banners.length > 0 ? banners[0] : null);

  const handleClick = () => {
    if (!banner?.link) return;
    if (banner.link.startsWith("http")) {
      window.open(banner.link, "_blank", "noopener,noreferrer");
    } else {
      navigate(banner.link);
    }
  };

  if (loading && !banner) {
    return (
      <div className="category-promo-skeleton">
        <div className="skeleton-shimmer" />
      </div>
    );
  }

  if (!banner) {
    return null;
  }

  return (
    <div
      className="category-promo-banner"
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") handleClick();
      }}
      title={banner.title || titleFallback}
    >
      {/* Nền mờ nghệ thuật chống vỡ tỉ lệ */}
      <img
        src={banner.image}
        alt=""
        aria-hidden="true"
        className="category-promo-bg-ambient"
      />

      <div className="category-promo-overlay">
        <div className="category-promo-content">
          <span className="category-promo-badge">HOT DEAL CÔNG NGHỆ</span>
          <h3 className="category-promo-title">{banner.title}</h3>
          {banner.subtitle && (
            <p className="category-promo-sub">{banner.subtitle}</p>
          )}
        </div>

        <div className="category-promo-right-group">
          <div className="category-promo-thumb-wrap">
            <img
              src={banner.image}
              alt={banner.title || titleFallback}
              className="category-promo-thumb-img"
              loading="lazy"
            />
          </div>
          <button className="category-promo-btn" type="button">
            Khám phá ngay <BsArrowRightShort className="arrow-icon" />
          </button>
        </div>
      </div>
    </div>
  );
}
