// import { useEffect, useState } from "react";
// import { useNavigate } from "react-router-dom";
// import "./FlashSale.css";

// // Đặt thời gian kết thúc flash sale — đổi số này là xong
// const FLASH_SALE_DURATION_HOURS = 12;

// const FlashSale = () => {
//   const navigate = useNavigate();

//   const [timeLeft, setTimeLeft] = useState(() => {
//     // Lấy deadline từ sessionStorage để đếm liên tục khi reload trang
//     const saved = sessionStorage.getItem("flashSaleEnd");
//     if (saved) {
//       const diff = Math.floor((Number(saved) - Date.now()) / 1000);
//       return diff > 0 ? diff : 0;
//     }
//     const duration = FLASH_SALE_DURATION_HOURS * 3600;
//     sessionStorage.setItem("flashSaleEnd", Date.now() + duration * 1000);
//     return duration;
//   });

//   useEffect(() => {
//     if (timeLeft <= 0) return;
//     const timer = setInterval(() => {
//       setTimeLeft((prev) => {
//         if (prev <= 1) {
//           clearInterval(timer);
//           sessionStorage.removeItem("flashSaleEnd");
//           return 0;
//         }
//         return prev - 1;
//       });
//     }, 1000);
//     return () => clearInterval(timer);
//   }, []);

//   const hours = String(Math.floor(timeLeft / 3600)).padStart(2, "0");
//   const minutes = String(Math.floor((timeLeft % 3600) / 60)).padStart(2, "0");
//   const seconds = String(timeLeft % 60).padStart(2, "0");

//   return (
//     <div className="flash-sale">
//       <div className="flash-sale__header">
//         <span className="flash-sale__icon">⚡</span>
//         <span className="flash-sale__title">FLASH SALE</span>
//       </div>
//       <p className="flash-sale__sub">Ưu đãi chớp nhoáng</p>
//       <p className="flash-sale__sub">Giá tốt mỗi ngày</p>

//       <div className="flash-sale__countdown">
//         <div className="flash-sale__unit">
//           <div className="flash-sale__box">{hours}</div>
//           <span>Giờ</span>
//         </div>
//         <span className="flash-sale__sep">-</span>
//         <div className="flash-sale__unit">
//           <div className="flash-sale__box">{minutes}</div>
//           <span>Phút</span>
//         </div>
//         <span className="flash-sale__sep">-</span>
//         <div className="flash-sale__unit">
//           <div className="flash-sale__box">{seconds}</div>
//           <span>Giây</span>
//         </div>
//       </div>

//       <button
//         className="flash-sale__btn"
//         onClick={() => navigate("/flash-sale")}
//       >
//         XEM TẤT CẢ
//       </button>
//     </div>
//   );
// };

// export default FlashSale;
