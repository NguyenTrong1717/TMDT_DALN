import { useState, useEffect, useCallback } from "react";

// Cache đơn giản trong bộ nhớ để tránh request trùng lặp và giật layout khi re-render
const bannerCache = new Map();

export const useBanners = (placement, category = "") => {
  const cacheKey = `${placement || "all"}_${category || ""}`;
  const [banners, setBanners] = useState(() => bannerCache.get(cacheKey) || []);
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

        const url = `http://localhost:3000/api/banners?${params.toString()}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Lỗi tải banner: ${res.status}`);

        const data = await res.json();
        const validData = Array.isArray(data) ? data : [];
        bannerCache.set(cacheKey, validData);
        if (!isCancelled) {
          setBanners(validData);
        }
      } catch (err) {
        if (!isCancelled) {
          console.error(`[useBanners] Không thể tải banners (${cacheKey}):`, err);
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
  }, [cacheKey, placement, category]);

  const refetch = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (placement) params.append("placement", placement);
      if (category) params.append("category", category);

      const url = `http://localhost:3000/api/banners?${params.toString()}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Lỗi tải banner: ${res.status}`);

      const data = await res.json();
      const validData = Array.isArray(data) ? data : [];
      bannerCache.set(cacheKey, validData);
      setBanners(validData);
    } catch (err) {
      console.error(`[useBanners] Lỗi tải lại:`, err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [cacheKey, placement, category]);

  return { banners, loading, error, refetch };
};

export const clearBannerCache = () => {
  bannerCache.clear();
};
