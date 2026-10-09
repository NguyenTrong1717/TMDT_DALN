import { useNavigate } from "react-router-dom";
import { useBanners, FALLBACK_BANNERS } from "../../hooks/useBanners";
import "./BannerGrid.css";

export default function BannerGrid({ customBanners = null }) {
  const navigate = useNavigate();
  const { banners: fetchedBanners, loading } = useBanners("hero_side");
  const banners =
    customBanners && customBanners.length > 0
      ? customBanners
      : fetchedBanners && fetchedBanners.length > 0
      ? fetchedBanners
      : FALLBACK_BANNERS.hero_side;

  const handleBannerClick = (banner) => {
    if (!banner?.link) return;
    if (banner.link.startsWith("http")) {
      window.open(banner.link, "_blank", "noopener,noreferrer");
    } else {
      navigate(banner.link);
    }
  };

  if (loading && banners.length === 0) {
    return (
      <div className="hero-side-grid-skeleton">
        {[1, 2, 3].map((i) => (
          <div key={i} className="side-banner-skeleton">
            <div className="skeleton-shimmer" />
          </div>
        ))}
      </div>
    );
  }

  if (!banners || banners.length === 0) {
    return null;
  }

  const items = banners.slice(0, 3);

  return (
    <div className="hero-side-grid" aria-label="Banner nổi bật bên phải">
      {items.map((banner, index) => (
        <div
          key={banner.id || index}
          className="hero-side-card"
          onClick={() => handleBannerClick(banner)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") handleBannerClick(banner);
          }}
          title={banner.title}
        >
          {/* Ảnh phủ toàn bộ khung thẻ */}
          <img
            src={banner.image}
            alt={banner.title || "Ưu đãi công nghệ"}
            loading="lazy"
            className="hero-side-img"
          />

          {/* Lớp phủ thông tin: Khi rê con trỏ chuột vào thì hiện chữ */}
          <div className="hero-side-overlay">
            <span className="hero-side-badge">HOT DEAL</span>
            {banner.title && <h4 className="hero-side-title">{banner.title}</h4>}
            {banner.subtitle && <p className="hero-side-sub">{banner.subtitle}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}
