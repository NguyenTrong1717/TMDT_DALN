// InstallmentModal.jsx
import { useState } from "react";
import { FaTimes, FaCreditCard, FaUniversity } from "react-icons/fa";

const InstallmentModal = ({ isOpen, onClose, product }) => {
  const [modalTab, setModalTab] = useState("card");

  // 1. Khai báo các State quản lý cấu hình người dùng click chọn
  const [selectedMonth, setSelectedMonth] = useState(3); // Mặc định là 3 tháng
  const [selectedPercent, setSelectedPercent] = useState(30); // Mặc định trả trước 30%

  if (!isOpen) return null;

  // 2. Thực hiện tính toán dựa trên dữ liệu thật của sản phẩm
  const productPrice = product?.price || 0;

  // Số tiền trả trước dựa trên % đã chọn
  const upfrontPayment = (productPrice * selectedPercent) / 100;

  // Số tiền còn lại cần vay trả góp
  const loanAmount = productPrice - upfrontPayment;

  // Giả định mức lãi suất hàng tháng (Ví dụ: 1.5% mỗi tháng)
  const monthlyInterestRate = 0.015;

  // Tính toán chi tiết từng mục
  const monthlyPrincipal = Math.round(loanAmount / selectedMonth); // Tiền gốc mỗi tháng
  const monthlyInterest = Math.round(loanAmount * monthlyInterestRate); // Tiền lãi mỗi tháng
  const totalMonthlyPayment = monthlyPrincipal + monthlyInterest; // Tổng tiền phải trả từng tháng

  // Tổng tiền toàn bộ quá trình trả góp (Gồm tiền trả trước + tổng các tháng trả góp)
  const totalInstallmentCost =
    upfrontPayment + totalMonthlyPayment * selectedMonth;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Nút đóng X */}
        <button className="modal-close-btn" onClick={onClose}>
          <FaTimes />
        </button>

        {/* Thanh Tab phía trên cùng */}
        <div className="modal-tabs-header">
          <div
            className={`modal-tab-item ${modalTab === "card" ? "active" : ""}`}
            onClick={() => setModalTab("card")}
          >
            <FaCreditCard className="tab-icon" />
            <div>
              <strong>QUA THẺ TÍN DỤNG</strong>
            </div>
          </div>

          <div
            className={`modal-tab-item ${modalTab === "company" ? "active" : ""}`}
            onClick={() => setModalTab("company")}
          >
            <FaUniversity className="tab-icon" />
            <div>
              <strong>QUA CÔNG TY TÀI CHÍNH</strong>
            </div>
          </div>
        </div>

        {/* Nội dung tính toán bên dưới */}
        <div className="modal-body-content">
          <h3>Tính toán tín dụng</h3>

          <div className="modal-form-row">
            <span className="form-label">Giá bán sản phẩm:</span>
            <span className="form-value-price">
              {productPrice.toLocaleString("vi-VN")}đ
            </span>
          </div>

          {/* Chọn số tháng (Bắt sự kiện onChange để cập nhật state) */}
          <div className="modal-form-row scroll-options">
            <span className="form-label">Số tháng trả góp:</span>
            <div className="radio-group">
              {[3, 6, 9, 12].map((month) => (
                <label key={month}>
                  <input
                    type="radio"
                    name="months"
                    checked={selectedMonth === month}
                    onChange={() => setSelectedMonth(month)}
                  />{" "}
                  {month} tháng
                </label>
              ))}
            </div>
          </div>

          {/* Chọn số tiền trả trước (Bắt sự kiện onChange để cập nhật state) */}
          <div className="modal-form-row scroll-options">
            <span className="form-label">Số tiền trả trước:</span>
            <div className="radio-group">
              {[30, 40, 50, 60, 70].map((percent) => (
                <label key={percent}>
                  <input
                    type="radio"
                    name="prepaid"
                    checked={selectedPercent === percent}
                    onChange={() => setSelectedPercent(percent)}
                  />{" "}
                  {percent}%
                </label>
              ))}
            </div>
          </div>

          {/* KẾT QUẢ ĐỘNG THAY ĐỔI THEO THỜI GIAN THỰC */}
          <div className="modal-results-box">
            <div className="result-line text-center-bold">
              <span>Số tiền trả trước ({selectedPercent}%):</span>
              <strong className="orange-text">
                {upfrontPayment.toLocaleString("vi-VN")} đ
              </strong>
            </div>

            <div className="result-line border-top-dash">
              <span>Trả góp mỗi tháng:</span>
              <strong>{totalMonthlyPayment.toLocaleString("vi-VN")} đ</strong>
            </div>

            <div className="result-line sub-detail-line">
              <span>- Tiền gốc:</span>
              <span>{monthlyPrincipal.toLocaleString("vi-VN")} đ</span>
            </div>

            <div className="result-line sub-detail-line">
              <span>- Tiền lãi:</span>
              <span>{monthlyInterest.toLocaleString("vi-VN")} đ</span>
            </div>

            <div className="result-line border-top-dash">
              <span>Tổng tiền trả góp :</span>
              <strong>{totalInstallmentCost.toLocaleString("vi-VN")} đ</strong>
            </div>
          </div>

          <p className="modal-note-text">
            Những con số tính toán ở đây để tham khảo, con số chính xác bạn có
            thể trao đổi trực tiếp với nhân viên tư vấn.
            <br />
            Phí chuyển đổi trả góp: Khách hàng trả một lần duy nhất khi đăng ký
            trả góp qua ShopDunk.
          </p>

          {/* Khung liên hệ tư vấn ở cuối */}
          <div className="modal-contact-footer">
            <h4>Liên hệ tư vấn mua trả góp</h4>
            <p>
              <strong>Cách 1:</strong> Liên hệ hotline
              <span className="hotline-blue">1900.1515</span>
            </p>
            <p>
              <strong>Cách 2:</strong> Điền thông tin để HoangHaiDevTo hỗ trợ
              bạn:
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InstallmentModal;
