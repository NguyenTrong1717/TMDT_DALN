import { useNavigate } from "react-router-dom";
import { useBanners } from "../../hooks/useBanners";
import "./StripBanner.css";

export default function StripBanner({ customBanners = null, index = 0 }) {
  const navigate = useNavigate();
  const { banners: fetchedBanners, loading } = useBanners("strip_wide");
  const banners = customBanners || fetchedBanners;

  if (loading && banners.length === 0) {
    return (
      <div className="strip-banner-wrapper">
        <div className="strip-banner-skeleton">
          <div className="skeleton-shimmer" />
        </div>
      </div>
    );
  }

  if (!banners || banners.length === 0) {
    return null;
  }

  const banner = banners[index] || banners[0];

  const handleClick = () => {
    if (!banner?.link) return;
    if (banner.link.startsWith("http")) {
      window.open(banner.link, "_blank", "noopener,noreferrer");
    } else {
      navigate(banner.link);
    }
  };

  return (
    <div className="strip-banner-wrapper" aria-label="Banner quảng cáo đặc quyền">
      <div
        className="strip-banner-card"
        onClick={handleClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") handleClick();
        }}
        title={banner.title}
      >
        <picture>
          {banner.imageMobile && (
            <source media="(max-width: 768px)" srcSet={banner.imageMobile} />
          )}
          <img
            src={banner.image}
            alt={banner.title || "Khuyến mãi công nghệ"}
            width={1200}
            height={200}
            loading="lazy"
            className="strip-banner-img"
          />
        </picture>
        {(banner.title || banner.subtitle) && (
          <div className="strip-banner-overlay">
            <div className="strip-banner-content">
              {banner.title && <h3 className="strip-banner-title">{banner.title}</h3>}
              {banner.subtitle && <p className="strip-banner-sub">{banner.subtitle}</p>}
            </div>
            <button className="strip-banner-cta">XEM NGAY &rsaquo;</button>
          </div>
        )}
      </div>
    </div>
  );
}
