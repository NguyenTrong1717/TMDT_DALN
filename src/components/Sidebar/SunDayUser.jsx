// import { useEffect, useMemo, useState } from "react";
// import { useNavigate } from "react-router-dom";
// import "./SunDayUser.css";

// // Đổi lại nếu json-server / API của bạn chạy ở cổng hoặc domain khác
// const API_BASE_URL = "http://localhost:3000";

// const SALE_END = new Date("2026-08-31T23:59:59");

// // Map mã category trong db.json sang tên hiển thị tiếng Việt
// const CATEGORY_LABELS = {
//   psu: "Nguồn - PSU",
//   vga: "Card Đồ Họa",
//   hdd: "Ổ Cứng",
//   cpu: "CPU",
//   monitor: "Màn Hình",
//   mainboard: "Mainboard",
//   mouse: "Chuột",
//   ram: "RAM",
// };

// function categoryLabel(code) {
//   return CATEGORY_LABELS[code] || code;
// }

// function categoryGlyph(code) {
//   const glyphs = {
//     psu: "PSU",
//     vga: "VGA",
//     hdd: "HDD",
//     cpu: "CPU",
//     monitor: "LCD",
//     mainboard: "MB",
//     mouse: "MS",
//     ram: "RAM",
//   };
//   return glyphs[code] || "SP";
// }

// function getRarity(discountPercent) {
//   if (discountPercent >= 25) return { label: "Huyền Thoại", tier: "legendary" };
//   if (discountPercent >= 10) return { label: "Hiếm", tier: "rare" };
//   return { label: "Thường", tier: "common" };
// }

// function formatVnd(value) {
//   return value.toLocaleString("vi-VN") + "đ";
// }

// function useCountdown(target) {
//   const [now, setNow] = useState(Date.now());

//   useEffect(() => {
//     const timer = setInterval(() => setNow(Date.now()), 1000);
//     return () => clearInterval(timer);
//   }, []);

//   const diff = Math.max(0, target.getTime() - now);
//   const days = Math.floor(diff / (1000 * 60 * 60 * 24));
//   const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
//   const minutes = Math.floor((diff / (1000 * 60)) % 60);
//   const seconds = Math.floor((diff / 1000) % 60);

//   return { days, hours, minutes, seconds, ended: diff === 0 };
// }

// const SunDayUser = () => {
//   const navigate = useNavigate();
//   const countdown = useCountdown(SALE_END);
//   const [activeCategory, setActiveCategory] = useState("all");
//   const [products, setProducts] = useState([]);
//   const [status, setStatus] = useState("loading"); // loading | success | error

//   useEffect(() => {
//     let cancelled = false;

//     fetch(`${API_BASE_URL}/eventList`)
//       .then((res) => {
//         if (!res.ok) throw new Error("Không lấy được dữ liệu sale");
//         return res.json();
//       })
//       .then((data) => {
//         if (!cancelled) {
//           setProducts(data);
//           setStatus("success");
//         }
//       })
//       .catch(() => {
//         if (!cancelled) setStatus("error");
//       });

//     return () => {
//       cancelled = true;
//     };
//   }, []);

//   const categories = useMemo(() => {
//     const codes = Array.from(new Set(products.map((p) => p.category)));
//     return ["all", ...codes];
//   }, [products]);

//   const filteredProducts = useMemo(() => {
//     if (activeCategory === "all") return products;
//     return products.filter((p) => p.category === activeCategory);
//   }, [products, activeCategory]);

//   return (
//     <div className="sale-page">
//       <div className="sale-hero">
//         <div className="sale-radar" aria-hidden="true">
//           <div className="sale-radar__sweep" />
//           <span className="sale-radar__ping sale-radar__ping--1" />
//           <span className="sale-radar__ping sale-radar__ping--2" />
//           <span className="sale-radar__ping sale-radar__ping--3" />
//         </div>

//         <button className="sale-hero__back" onClick={() => navigate("/")}>
//           Quay Lại Trang Chủ
//         </button>

//         <p className="sale-hero__eyebrow">Chiến Dịch Giới Hạn Thời Gian</p>
//         <h1 className="sale-hero__title">Săn Sale Mùa Hè</h1>
//         <p className="sale-hero__subtitle">
//           giảm giá tới 30% cho linh kiện và thiết bị gaming.
//         </p>

//         {!countdown.ended ? (
//           <div
//             className="sale-countdown"
//             role="timer"
//             aria-label="Thời gian còn lại của đợt sale"
//           >
//             <div className="sale-countdown__unit">
//               <span className="sale-countdown__value">
//                 {String(countdown.days).padStart(2, "0")}
//               </span>
//               <span className="sale-countdown__label">Ngày</span>
//             </div>
//             <span className="sale-countdown__sep">:</span>
//             <div className="sale-countdown__unit">
//               <span className="sale-countdown__value">
//                 {String(countdown.hours).padStart(2, "0")}
//               </span>
//               <span className="sale-countdown__label">Giờ</span>
//             </div>
//             <span className="sale-countdown__sep">:</span>
//             <div className="sale-countdown__unit">
//               <span className="sale-countdown__value">
//                 {String(countdown.minutes).padStart(2, "0")}
//               </span>
//               <span className="sale-countdown__label">Phút</span>
//             </div>
//             <span className="sale-countdown__sep">:</span>
//             <div className="sale-countdown__unit">
//               <span className="sale-countdown__value">
//                 {String(countdown.seconds).padStart(2, "0")}
//               </span>
//               <span className="sale-countdown__label">Giây</span>
//             </div>
//           </div>
//         ) : (
//           <p className="sale-countdown sale-countdown--ended">
//             Đợt sale đã kết thúc
//           </p>
//         )}
//       </div>

//       {status === "success" && (
//         <div className="sale-filters">
//           {categories.map((code) => (
//             <button
//               key={code}
//               className={`sale-filters__btn ${activeCategory === code ? "is-active" : ""}`}
//               onClick={() => setActiveCategory(code)}
//             >
//               {code === "all" ? "Tất Cả" : categoryLabel(code)}
//             </button>
//           ))}
//         </div>
//       )}

//       {status === "loading" && (
//         <p className="sale-state">Đang quét radar tìm deal...</p>
//       )}

//       {status === "error" && (
//         <p className="sale-state sale-state--error">
//           Không kết nối được tới kho dữ liệu sale. Kiểm tra lại API và thử lại.
//         </p>
//       )}

//       {status === "success" && (
//         <div className="sale-grid">
//           {filteredProducts.map((p) => {
//             const rarity = getRarity(p.discount);
//             const lowStock = p.stockLeft <= 5;

//             return (
//               <div key={p.id} className={`sale-card sale-card--${rarity.tier}`}>
//                 <div className="sale-card__top">
//                   <span
//                     className={`sale-card__rarity sale-card__rarity--${rarity.tier}`}
//                   >
//                     {rarity.label}
//                   </span>
//                   <span className="sale-card__discount">-{p.discount}%</span>
//                 </div>

//                 <div className="sale-card__thumb">
//                   {p.image ? (
//                     <img
//                       src={p.image}
//                       alt={p.name}
//                       className="sale-card__thumb-img"
//                       onError={(e) => {
//                         e.currentTarget.style.display = "none";
//                         e.currentTarget.nextSibling.style.display = "flex";
//                       }}
//                     />
//                   ) : null}
//                   <span
//                     className="sale-card__thumb-glyph"
//                     style={{ display: p.image ? "none" : "flex" }}
//                   >
//                     {categoryGlyph(p.category)}
//                   </span>
//                 </div>

//                 <p className="sale-card__category">
//                   {categoryLabel(p.category)}
//                 </p>
//                 <h3 className="sale-card__name">{p.name}</h3>

//                 <div className="sale-card__prices">
//                   <span className="sale-card__price">{formatVnd(p.price)}</span>
//                   <span className="sale-card__original">
//                     {formatVnd(p.oldPrice)}
//                   </span>
//                 </div>

//                 <div className="sale-card__stock">
//                   <div className="sale-card__stock-bar">
//                     <div
//                       className="sale-card__stock-fill"
//                       style={{ width: `${p.soldPercent}%` }}
//                     />
//                   </div>
//                   <span
//                     className={`sale-card__stock-label ${lowStock ? "is-low" : ""}`}
//                   >
//                     {lowStock
//                       ? `Chỉ còn ${p.stockLeft} sản phẩm`
//                       : `Đã bán ${p.soldPercent}%`}
//                   </span>
//                 </div>

//                 <button className="sale-card__cta">Xem Chi Tiết</button>
//               </div>
//             );
//           })}
//         </div>
//       )}
//     </div>
//   );
// };

// export default SunDayUser;
