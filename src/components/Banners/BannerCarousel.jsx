import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";
import { useBanners } from "../../hooks/useBanners";
import "./BannerCarousel.css";

const AUTO_PLAY_MS = 5000;

export default function BannerCarousel({ customBanners = null }) {
  const navigate = useNavigate();
  const { banners: fetchedBanners, loading } = useBanners("hero_main");
  const banners = customBanners || fetchedBanners;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const touchStartXRef = useRef(0);
  const touchEndXRef = useRef(0);

  const total = Math.min(banners.length, 6);

  const nextSlide = useCallback(() => {
    if (total <= 1) return;
    setCurrentIndex((prev) => (prev + 1) % total);
  }, [total]);

  const prevSlide = useCallback(() => {
    if (total <= 1) return;
    setCurrentIndex((prev) => (prev - 1 + total) % total);
  }, [total]);

  // Auto-play 5s, dừng khi hover
  useEffect(() => {
    if (isHovered || total <= 1) return;
    const timer = setInterval(nextSlide, AUTO_PLAY_MS);
    return () => clearInterval(timer);
  }, [isHovered, total, nextSlide]);

  // Xử lý touch swipe trên mobile
  const handleTouchStart = (e) => {
    touchStartXRef.current = e.touches[0].clientX;
  };
  const handleTouchMove = (e) => {
    touchEndXRef.current = e.touches[0].clientX;
  };
  const handleTouchEnd = () => {
    const diff = touchStartXRef.current - touchEndXRef.current;
    if (Math.abs(diff) > 40) {
      if (diff > 0) nextSlide();
      else prevSlide();
    }
  };

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
      <div className="banner-carousel-skeleton" aria-busy="true" aria-label="Đang tải quảng cáo...">
        <div className="skeleton-shimmer" />
      </div>
    );
  }

  if (!banners || banners.length === 0) {
    return null;
  }

  return (
    <div
      className="banner-carousel-container"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      aria-roledescription="carousel"
      aria-label="Khuyến mãi nổi bật"
    >
      <div
        className="banner-carousel-track"
        style={{ transform: `translateX(-${currentIndex * 100}%)` }}
      >
        {banners.slice(0, 6).map((banner, index) => (
          <div
            key={banner.id || index}
            className={`banner-slide ${index === currentIndex ? "active" : ""}`}
            onClick={() => handleBannerClick(banner)}
            role="group"
            aria-roledescription="slide"
            aria-label={`${index + 1} trên ${total}`}
          >
            <picture>
              {banner.imageMobile && (
                <source media="(max-width: 768px)" srcSet={banner.imageMobile} />
              )}
              <img
                src={banner.image}
                alt={banner.title || "Quảng cáo HCore"}
                width={690}
                height={300}
                fetchPriority={index === 0 ? "high" : "auto"}
                loading={index === 0 ? "eager" : "lazy"}
                className="banner-slide-img"
              />
            </picture>
            {(banner.title || banner.subtitle) && (
              <div className="banner-caption-overlay">
                {banner.title && <h3 className="banner-caption-title">{banner.title}</h3>}
                {banner.subtitle && <p className="banner-caption-sub">{banner.subtitle}</p>}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Nút điều hướng Next / Prev */}
      {total > 1 && (
        <>
          <button
            type="button"
            className="carousel-arrow prev"
            onClick={(e) => {
              e.stopPropagation();
              prevSlide();
            }}
            aria-label="Slide trước đó"
          >
            <FaChevronLeft />
          </button>
          <button
            type="button"
            className="carousel-arrow next"
            onClick={(e) => {
              e.stopPropagation();
              nextSlide();
            }}
            aria-label="Slide tiếp theo"
          >
            <FaChevronRight />
          </button>
        </>
      )}

      {/* Dải chấm Dot Indicators */}
      {total > 1 && (
        <div className="carousel-dots" role="tablist">
          {banners.slice(0, 6).map((b, idx) => (
            <button
              key={b.id || idx}
              type="button"
              className={`carousel-dot ${idx === currentIndex ? "active" : ""}`}
              onClick={(e) => {
                e.stopPropagation();
                setCurrentIndex(idx);
              }}
              role="tab"
              aria-selected={idx === currentIndex}
              aria-label={`Chuyển tới slide ${idx + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
