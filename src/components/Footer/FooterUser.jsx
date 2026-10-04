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
          <h3>HCORE STORE - CÔNG NGHỆ CHÍNH HÃNG</h3>
          <ul className="company-info-list">
            <li>
              <strong>Trụ sở chính:</strong> Tòa nhà Phenikaa, P. Yên Nghĩa, Q. Hà Đông, Hà Nội
            </li>
            <li>
              <strong>Hotline tư vấn:</strong> 1900 8888 (8h00 - 21h30)
            </li>
            <li>
              <strong>Hỗ trợ kỹ thuật:</strong> 1900 8888
            </li>
            <li>
              <strong>Email:</strong> contact@hcore.vn
            </li>
            <li>
              <strong>Website:</strong> https://hcore.vn
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
                <p className="hotline-number-big">1900 8888</p>
              </div>
            </div>

            <div className="footer-social-icons">
              <a
                className="icon-fb"
                href="https://facebook.com"
                target="_blank"
                rel="noreferrer"
              >
                <FaFacebookF />
              </a>
              <a
                className="icon-ins"
                href="https://instagram.com"
                target="_blank"
                rel="noreferrer"
              >
                <FaInstagram />
              </a>
              <a
                className="icon-pin"
                href="https://pinterest.com"
                target="_blank"
                rel="noreferrer"
              >
                <FaPinterestP />
              </a>
              <a
                className="icon-yt"
                href="https://youtube.com"
                target="_blank"
                rel="noreferrer"
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
                  <a href="/contact">
                    Hỗ trợ Fanpage
                  </a>
                </p>
                <p className="badge-time">(8h00 - 21h30)</p>
              </div>
            </div>

            <div className="badge-item">
              <span className="badge-logo zalo-bg">Zalo</span>
              <div className="badge-text">
                <p className="badge-title">
                  <a href="/contact">
                    CSKH Trực Tuyến
                  </a>
                </p>
                <p className="badge-time">(8h00 - 21h30)</p>
              </div>
            </div>

            <div className="badge-item">
              <span className="badge-logo phone-bg">📞</span>
              <div className="badge-text">
                <p className="badge-title">1900 8888</p>
                <p className="badge-time">(8h00 - 21h30)</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="footer-copyright-bar">
        <p>© 2026 HCore Store - Bản quyền thuộc về Hệ thống Bán lẻ Công nghệ HCore</p>
      </div>
    </footer>
  );
};

export default FooterUser;
