// import React from "react";
// import "./GameModal.css";

// const GameModal = ({ isOpen, onClose, onConfirm }) => {
//   if (!isOpen) return null;

//   return (
//     <div className="game-modal-overlay">
//       <div className="game-modal-box">
//         {/* Tiêu đề giật gân chuẩn TikTok */}
//         <h3 className="game-modal-title">Giảm 999k </h3>
//         <p className="game-modal-text">
//           Đây là ưu đãi đặc biệt dành riêng cho bạn
//         </p>

//         {/* Khung chứa các tấm vé voucher - Đã được kéo dài và căn chỉnh */}
//         <div className="game-modal-actions">
//           {/* Vé 1: Freeship */}
//           <div className="voucher-ticket">
//             <span className="badge-multiplier">x3</span>
//             <span className="voucher-highlight-blue">Freeship</span>
//             <span className="voucher-subtext-bold">cho đơn trên 1đ</span>
//             <span className="voucher-condition">Có áp dụng điều khoản</span>
//           </div>

//           {/* Vé 2: Giảm 70K */}
//           <div className="voucher-ticket">
//             <div className="voucher-row-center">
//               <span className="text-normal-red">Giảm</span>
//               <span className="voucher-highlight-red">500K</span>
//             </div>
//             <span className="voucher-subtext-bold">cho đơn trên 999K</span>
//             <span className="voucher-condition">Có áp dụng điều khoản</span>
//           </div>

//           {/* Vé 3: Giảm 50% */}
//           <div className="voucher-ticket">
//             <div className="voucher-row-center">
//               <span className="text-normal-red">Giảm</span>
//               <span className="voucher-highlight-red">50 %</span>
//             </div>
//           </div>
//         </div>

//         {/* Nút Nhận hết to bự thon dài */}
//         <button className="btn-game-confirm" onClick={onConfirm}>
//           Nhận hết
//         </button>

//         {/* Nút dấu X tròn lơ lửng dưới đáy */}
//         <button className="btn-game-cancel" onClick={onClose}>
//           ✕
//         </button>
//       </div>
//     </div>
//   );
// };

// export default GameModal;
