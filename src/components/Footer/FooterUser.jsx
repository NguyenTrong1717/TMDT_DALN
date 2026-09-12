import "./FooterUser.css";
import {
  FaFacebookF,
  FaInstagram,
  FaPinterestP,
  FaYoutube,
} from "react-icons/fa";

const FooterUser = () => {
  return (
    <footer className="main-footer">
      <div className="footer-top-container">
        <div className="footer-column">
          <h3>CÔNG TY TNHH TM & CÔNG NGHỆ PHẦN MỀM</h3>
          <ul className="company-info-list">
            <li>
              <strong>Địa chỉ:</strong> Đại học phenikaa
            </li>
            <li>
              <strong>Điện thoại:</strong> 0326807955
            </li>
            <li>
              <strong>Zalo:</strong> 0326807955
            </li>
            <li>
              <strong>Email:</strong> trongtho123a@Gmail.Com
            </li>
            <li>
              <strong>Website:</strong>http://localhost:5173/
            </li>
          </ul>
        </div>

        {/* Cột 2: Chính sách & Hỗ trợ */}
        <div className="footer-column">
          <h3>CHÍNH SÁCH & HỖ TRỢ</h3>
          <ul className="policy-links">
            <li>
              <a href="#/">CHÍNH SÁCH & QUY ĐỊNH CHUNG</a>
            </li>
            <li>
              <a href="#/">QUY ĐỊNH VÀ HÌNH THỨC THANH TOÁN</a>
            </li>
            <li>
              <a href="#/">QUY ĐỊNH CHÍNH SÁCH BẢO HÀNH</a>
            </li>
            <li>
              <a href="#/">QUY ĐỊNH VẬN CHUYỂN VÀ GIAO NHẬN</a>
            </li>
            <li>
              <a href="#/">QUY ĐỊNH CHÍNH SÁCH ĐỔI TRẢ VÀ HOÀN TIỀN</a>
            </li>
            <li>
              <a href="#/">QUY ĐỊNH CHÍNH SÁCH VỀ BẢO MẬT THÔNG TIN</a>
            </li>
          </ul>
        </div>

        {/* Cột 3: Tư vấn & Hỗ trợ khách hàng + Khối liên hệ nổi */}
        <div className="footer-column">
          <h3>TƯ VẤN & HỖ TRỢ KHÁCH HÀNG</h3>

          <div className="hotline-box-wrapper">
            <div className="hotline-phone-left">
              <span className="hotline-icon-247">📞</span>
              <div>
                <p className="hotline-label">HOTLINE TƯ VẤN:</p>
                <p className="hotline-number-big">0326807955</p>
              </div>
            </div>

            <div className="footer-social-icons">
              <a
                className="icon-fb"
                href="https://www.facebook.com/nguyentronggggg?locale=vi_VN"
              >
                <FaFacebookF />
              </a>
              <a
                className="icon-ins"
                href="https://www.facebook.com/nguyentronggggg?locale=vi_VN"
              >
                <FaInstagram />
              </a>
              <a
                className="icon-pin"
                href="https://www.facebook.com/nguyentronggggg?locale=vi_VN"
              >
                <FaPinterestP />
              </a>
              <a
                className="icon-yt"
                href="https://www.facebook.com/nguyentronggggg?locale=vi_VN"
              >
                <FaYoutube />
              </a>
            </div>
          </div>

          <div className="floating-contact-badges">
            <div className="badge-item">
              <span className="badge-logo fb-bg">F</span>
              <div className="badge-text">
                <p className="badge-title">
                  <a href="https://www.facebook.com/nguyentronggggg?locale=vi_VN">
                    Inbox Facebook
                  </a>
                </p>
                <p className="badge-time">(8h00 - 21h00)</p>
              </div>
            </div>

            <div className="badge-item">
              <span className="badge-logo zalo-bg">Zalo</span>
              <div className="badge-text">
                <p className="badge-title">
                  <a href="https://www.facebook.com/nguyentronggggg?locale=vi_VN">
                    Inbox Zalo
                  </a>
                </p>
                <p className="badge-time">(8h00 - 21h00)</p>
              </div>
            </div>

            <div className="badge-item">
              <span className="badge-logo phone-bg">📞</span>
              <div className="badge-text">
                <p className="badge-title">0326807955</p>
                <p className="badge-time">(8h00 - 21h00)</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="footer-copyright-bar">
        <p>2026 - NguyenTrong</p>
      </div>
    </footer>
  );
};

export default FooterUser;
