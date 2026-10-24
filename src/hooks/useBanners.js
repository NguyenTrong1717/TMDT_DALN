import { useState, useEffect, useCallback } from "react";
import { API_URL } from "../utils/api";

// Banner dự phòng chất lượng cao đảm bảo UI không bao giờ bị trắng xóa khi DB chưa seed hoặc server chậm
export const FALLBACK_BANNERS = {
  hero_main: [
    {
      id: "banner-hm-01",
      title: "PC Gaming HCore Master RTX 4070 Super",
      subtitle: "Chiến mượt 144+ FPS mọi tựa game AAA • Tặng gói bảo hành 24 tháng",
      image: "/images/CN.jpg",
      imageMobile: "/images/CN.jpg",
      link: "/category/top-cuc-khung",
      placement: "hero_main",
    },
    {
      id: "banner-hm-02",
      title: "Đại Tiệc Màn Hình & Laptop Đồ Họa 2026",
      subtitle: "Tần số quét 180Hz • Chuẩn màu DCI-P3 99% • Trợ giá học sinh sinh viên đến 3 triệu",
      image: "/images/MT.jpg",
      imageMobile: "/images/MT.jpg",
      link: "/laptop/laptop-gaming",
      placement: "hero_main",
    },
    {
      id: "banner-hm-03",
      title: "Tuần Lễ Intel & Asus - Bùng Nổ Ưu Đãi",
      subtitle: "Giảm ngay 1.000.000đ cho đơn máy tính từ 20 triệu • Quà tặng độc quyền",
      image: "/images/AN01.jpg",
      imageMobile: "/images/AN01.jpg",
      link: "/category/top-ban-chay",
      placement: "hero_main",
    },
  ],
  hero_side: [
    {
      id: "banner-hs-01",
      title: "Card Đồ Họa RTX 40",
      subtitle: "Xả kho giá sốc tới 2.5Tr",
      image: "/images/gpu.png",
      imageMobile: "",
      link: "/component/vga",
      placement: "hero_side",
    },
    {
      id: "banner-hs-02",
      title: "Phụ Kiện Gear Gaming",
      subtitle: "Bàn phím cơ & Chuột giảm 40%",
      image: "/images/TN90.jpg",
      imageMobile: "",
      link: "/category/top-ban-chay",
      placement: "hero_side",
    },
    {
      id: "banner-hs-03",
      title: "Smartwatch & Âm Thanh",
      subtitle: "Âm thanh vòm • Pin 7 ngày",
      image: "/images/DH.jpg",
      imageMobile: "",
      link: "/category/top-ban-chay",
      placement: "hero_side",
    },
  ],
  promo_tiles: [
    { id: "banner-pt-01", title: "Deal sốc đến 50%", subtitle: "Giờ vàng giá sốc", image: "FaBolt", link: "/san-sale" },
    { id: "banner-pt-02", title: "Thu cũ đổi mới", subtitle: "Trợ giá đến 3 triệu", image: "FaSyncAlt", link: "/thu-cu-doi-moi" },
    { id: "banner-pt-03", title: "Trả góp 0%", subtitle: "Xét duyệt 3 phút", image: "FaCreditCard", link: "/tra-gop" },
    { id: "banner-pt-04", title: "Ưu đãi sinh viên", subtitle: "Giảm thêm 500K", image: "FaGraduationCap", link: "/uu-dai-sinh-vien" },
    { id: "banner-pt-05", title: "Kho Voucher", subtitle: "Lưu mã giảm ngay", image: "FaTicketAlt", link: "/tri-an-khach-hang" },
    { id: "banner-pt-06", title: "Khách hàng DN", subtitle: "Chiết khấu độc quyền", image: "FaBriefcase", link: "/doanh-nghiep" },
  ],
  strip_wide: [
    {
      id: "banner-sw-01",
      title: "Tuần Lễ Intel & Asus - Bùng Nổ Ưu Đãi Công Nghệ",
      subtitle: "Nhập mã INTEL2026 giảm ngay 1.000.000đ cho đơn máy tính từ 20 triệu",
      image: "/images/AN01.jpg",
      imageMobile: "/images/AN01.jpg",
      link: "/category/top-ban-chay",
      placement: "strip_wide",
    },
  ],
  category_promo: [
    { id: "banner-cp-laptop", title: "Laptop Mỏng Nhẹ & Gaming AI", subtitle: "Tản nhiệt buồng hơi • Pin trâu 12H", image: "/images/lap01.png", link: "/laptop/laptop-gaming", category: "laptop" },
    { id: "banner-cp-pc", title: "PC Gaming & Workstation Cực Mạnh", subtitle: "Bảo hành 24 tháng đổi mới tận nơi", image: "/images/pc12.webp", link: "/category/top-cuc-khung", category: "pc" },
    { id: "banner-cp-component", title: "Linh Kiện Chính Hãng 100%", subtitle: "Tự ráp cấu hình PC giá xuất xưởng", image: "/images/TB07.png", link: "/component/vga", category: "component" },
  ],
  skyscraper_left: [
    { id: "banner-sky-left", title: "Laptop AI - Giảm thêm đến 2 Triệu", subtitle: "Trợ giá lên đời • Trả góp 0%", image: "/images/banner_sky_laptop.png", link: "/laptop/laptop-gaming" }
  ],
  skyscraper_right: [
    { id: "banner-sky-right", title: "Laptop AI - Giảm thêm đến 2 Triệu", subtitle: "Trợ giá lên đời • Trả góp 0%", image: "/images/banner_sky_laptop.png", link: "/laptop/laptop-gaming" }
  ]
};

const getFallback = (placement, category) => {
  if (placement === "category_promo" && category) {
    const matched = (FALLBACK_BANNERS.category_promo || []).filter((b) => b.category === category);
    return matched.length > 0 ? matched : FALLBACK_BANNERS.category_promo || [];
  }
  return FALLBACK_BANNERS[placement] || [];
};

// Cache trong bộ nhớ để tránh request trùng lặp
const bannerCache = new Map();

export const useBanners = (placement, category = "") => {
  const cacheKey = `${placement || "all"}_${category || ""}`;
  const fallbackData = getFallback(placement, category);

  const [banners, setBanners] = useState(() => bannerCache.get(cacheKey) || fallbackData);
  const [loading, setLoading] = useState(() => !bannerCache.has(cacheKey));
  const [error, setError] = useState(null);

  useEffect(() => {
    let isCancelled = false;

    const loadData = async () => {
      if (bannerCache.has(cacheKey)) {
        setBanners(bannerCache.get(cacheKey));
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (placement) params.append("placement", placement);
        if (category) params.append("category", category);

        // Hỗ trợ cả API_URL và fallback endpoint
        const base = API_URL || "http://127.0.0.1:3000";
        const url = `${base}/api/banners?${params.toString()}`;

        const res = await fetch(url).catch(() => null);
        if (!res || !res.ok) {
          // Thử thêm cổng localhost nếu 127.0.0.1 chưa sẵn sàng
          const fallbackRes = await fetch(`http://localhost:3000/api/banners?${params.toString()}`).catch(() => null);
          if (!fallbackRes || !fallbackRes.ok) {
            throw new Error(`Không thể kết nối API banners`);
          }
          const fbData = await fallbackRes.json();
          const valid = Array.isArray(fbData) && fbData.length > 0 ? fbData : fallbackData;
          bannerCache.set(cacheKey, valid);
          if (!isCancelled) setBanners(valid);
          return;
        }

        const data = await res.json();
        const validData = Array.isArray(data) && data.length > 0 ? data : fallbackData;
        bannerCache.set(cacheKey, validData);
        if (!isCancelled) {
          setBanners(validData);
        }
      } catch (err) {
        if (!isCancelled) {
          console.warn(`[useBanners] Dùng fallback banner cho (${cacheKey}):`, err.message);
          setBanners(fallbackData);
          setError(err.message);
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      isCancelled = true;
    };
  }, [cacheKey, placement, category, fallbackData]);

  const refetch = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (placement) params.append("placement", placement);
      if (category) params.append("category", category);

      const base = API_URL || "http://127.0.0.1:3000";
      const url = `${base}/api/banners?${params.toString()}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Lỗi tải banner: ${res.status}`);

      const data = await res.json();
      const validData = Array.isArray(data) && data.length > 0 ? data : fallbackData;
      bannerCache.set(cacheKey, validData);
      setBanners(validData);
    } catch (err) {
      console.warn(`[useBanners] Lỗi tải lại, giữ fallback:`, err.message);
      setBanners(fallbackData);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [cacheKey, placement, category, fallbackData]);

  return { banners, loading, error, refetch };
};

export const clearBannerCache = () => {
  bannerCache.clear();
};
