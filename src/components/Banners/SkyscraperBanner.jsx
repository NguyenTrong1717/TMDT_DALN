import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useBanners } from "../../hooks/useBanners";
import "./SkyscraperBanner.css";

const DEFAULT_SKY_IMAGE = "/images/banner_sky_laptop.png";

export default function SkyscraperBanner() {
  const navigate = useNavigate();
  const { banners: leftBanners } = useBanners("skyscraper_left");
  const { banners: rightBanners } = useBanners("skyscraper_right");

  const [dismissLeft, setDismissLeft] = useState(false);
  const [dismissRight, setDismissRight] = useState(false);

  const leftBanner = leftBanners && leftBanners.length > 0 ? leftBanners[0] : null;
  const rightBanner = rightBanners && rightBanners.length > 0 ? rightBanners[0] : null;

  const handleClick = (banner) => {
    const link = banner?.link || "/laptop/laptop-gaming";
    if (link.startsWith("http")) {
      window.open(link, "_blank", "noopener,noreferrer");
    } else {
      navigate(link);
    }
  };

  return (
    <>
      {/* 1. Banner Mép Trái (Ảnh Poster dọc nguyên tấm) */}
      {!dismissLeft && (
        <aside
          className="skyscraper-wing wing-left"
          onClick={() => handleClick(leftBanner)}
          role="complementary"
          aria-label={leftBanner?.title || "Banner khuyến mãi bên trái"}
          title={leftBanner?.title || "Laptop AI - Giảm thêm đến 2 Triệu"}
        >
          <button
            type="button"
            className="skyscraper-close-btn"
            onClick={(e) => {
              e.stopPropagation();
              setDismissLeft(true);
            }}
            aria-label="Đóng quảng cáo trái"
            title="Đóng quảng cáo"
          >
            ✕
          </button>
          
          <img
            src={leftBanner?.image || DEFAULT_SKY_IMAGE}
            alt={leftBanner?.title || "Laptop AI Khuyến Mãi"}
            loading="lazy"
            className="skyscraper-poster-img"
          />
        </aside>
      )}

      {/* 2. Banner Mép Phải (Ảnh Poster dọc nguyên tấm) */}
      {!dismissRight && (
        <aside
          className="skyscraper-wing wing-right"
          onClick={() => handleClick(rightBanner)}
          role="complementary"
          aria-label={rightBanner?.title || "Banner khuyến mãi bên phải"}
          title={rightBanner?.title || "Laptop AI - Giảm thêm đến 2 Triệu"}
        >
          <button
            type="button"
            className="skyscraper-close-btn"
            onClick={(e) => {
              e.stopPropagation();
              setDismissRight(true);
            }}
            aria-label="Đóng quảng cáo phải"
            title="Đóng quảng cáo"
          >
            ✕
          </button>

          <img
            src={rightBanner?.image || DEFAULT_SKY_IMAGE}
            alt={rightBanner?.title || "Laptop AI Khuyến Mãi"}
            loading="lazy"
            className="skyscraper-poster-img"
          />
        </aside>
      )}
    </>
  );
}
