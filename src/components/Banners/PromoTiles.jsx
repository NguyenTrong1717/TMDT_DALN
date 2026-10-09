import { useNavigate } from "react-router-dom";
import {
  FaBolt,
  FaSyncAlt,
  FaCreditCard,
  FaGraduationCap,
  FaTicketAlt,
  FaBriefcase,
  FaFire,
  FaTags,
  FaGift,
} from "react-icons/fa";
import { useBanners } from "../../hooks/useBanners";
import "./PromoTiles.css";

const ICON_MAP = {
  FaBolt: FaBolt,
  FaSyncAlt: FaSyncAlt,
  FaCreditCard: FaCreditCard,
  FaGraduationCap: FaGraduationCap,
  FaTicketAlt: FaTicketAlt,
  FaBriefcase: FaBriefcase,
  FaFire: FaFire,
  FaTags: FaTags,
  FaGift: FaGift,
};

const FALLBACK_TILE_LINKS = {
  "Deal sốc đến 50%": "/san-sale",
  "Thu cũ đổi mới": "/thu-cu-doi-moi",
  "Trả góp 0%": "/tra-gop",
  "Ưu đãi sinh viên": "/uu-dai-sinh-vien",
  "Kho Voucher": "/tri-an-khach-hang",
  "Khách hàng DN": "/doanh-nghiep",
};

export default function PromoTiles({ customBanners = null }) {
  const navigate = useNavigate();
  const { banners: fetchedBanners, loading } = useBanners("promo_tiles");
  const banners = customBanners || fetchedBanners;

  const handleTileClick = (tile) => {
    if (!tile) return;
    const targetLink =
      (tile.link &&
      !["/laptop/laptop-gaming", "/category/top-ban-chay", "/contact"].includes(
        tile.link,
      )
        ? tile.link
        : FALLBACK_TILE_LINKS[tile.title]) ||
      tile.link ||
      "/";

    if (targetLink.startsWith("http")) {
      window.open(targetLink, "_blank", "noopener,noreferrer");
    } else {
      navigate(targetLink);
    }
  };

  if (loading && banners.length === 0) {
    return (
      <div className="promo-tiles-skeleton-grid">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="promo-tile-skeleton">
            <div className="skeleton-shimmer" />
          </div>
        ))}
      </div>
    );
  }

  if (!banners || banners.length === 0) {
    return null;
  }

  const items = banners.slice(0, 6);

  return (
    <div className="promo-tiles-section" aria-label="Lối tắt ưu đãi">
      <div className="promo-tiles-grid">
        {items.map((tile, idx) => {
          const IconComponent = ICON_MAP[tile.image] || FaTags;
          return (
            <div
              key={tile.id || idx}
              className="promo-tile-card"
              onClick={() => handleTileClick(tile)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") handleTileClick(tile);
              }}
              title={tile.title}
            >
              <div className="promo-tile-icon-box">
                <IconComponent className="promo-tile-icon" />
              </div>
              <div className="promo-tile-text">
                <span className="promo-tile-title">{tile.title}</span>
                {tile.subtitle && (
                  <span className="promo-tile-sub">{tile.subtitle}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
