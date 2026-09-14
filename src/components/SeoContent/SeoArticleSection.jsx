import { useState } from "react";
import "./SeoArticleSection.css";
import { FaChevronDown, FaListUl, FaQuestionCircle, FaTable } from "react-icons/fa";

const SeoArticleSection = ({ categoryTitle = "Máy Tính, Laptop & Thiết Bị Công Nghệ" }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeFaq, setActiveFaq] = useState(null);

  const priceTableData = [
    { name: "PC Gaming Core i5 12400F / RTX 4060 8GB", ram: "16GB DDR4", ssd: "512GB NVMe", price: "16.890.000đ", status: "Sẵn hàng" },
    { name: "PC Đồ Họa Core i7 13700K / RTX 4070 Ti", ram: "32GB DDR5", ssd: "1TB Gen 4", price: "34.490.000đ", status: "Sẵn hàng" },
    { name: "Laptop Gaming Acer Nitro V 15 (RTX 4050)", ram: "16GB DDR5", ssd: "512GB NVMe", price: "19.990.000đ", status: "Sẵn hàng" },
    { name: "Laptop ASUS TUF Gaming F15 (144Hz IPS)", ram: "16GB DDR4", ssd: "512GB NVMe", price: "17.490.000đ", status: "Sẵn hàng" },
    { name: "Màn hình Gaming 24 inch 165Hz Fast-IPS", ram: "FHD 1080p", ssd: "0.5ms MPRT", price: "2.990.000đ", status: "Sẵn hàng" },
    { name: "Card đồ họa MSI GeForce RTX 4060 8GB GDDR6", ram: "8GB VRAM", ssd: "PCIe 4.0", price: "8.190.000đ", status: "Sẵn hàng" },
  ];

  const faqs = [
    {
      q: "Mua máy tính và laptop trả góp 0% tại hệ thống cần những giấy tờ gì?",
      a: "Quý khách chỉ cần có Căn cước công dân gắn chip (từ 18 tuổi trở lên). Không cần chứng minh thu nhập, duyệt hồ sơ online trong 3-5 phút qua các đối tác tài chính uy tín như Kredivo, Home Credit, HD Saison. Ngoài ra hỗ trợ trả góp 0% qua thẻ tín dụng Visa/Mastercard.",
    },
    {
      q: "Chính sách bảo hành 1 đổi 1 trong 30 ngày áp dụng ra sao?",
      a: "Tất cả sản phẩm bán ra được cam kết bảo hành chính hãng 12 - 36 tháng. Trong vòng 30 ngày đầu tiên kể từ ngày mua, nếu sản phẩm gặp lỗi phần cứng do nhà sản xuất, quý khách sẽ được đổi ngay sản phẩm mới 100% nguyên seal cùng model.",
    },
    {
      q: "Dịch vụ giao hàng siêu tốc 2h áp dụng cho khu vực nào?",
      a: "Hệ thống hỗ trợ giao siêu tốc 2 giờ hoàn toàn miễn phí cho các đơn hàng có giá trị từ 1.000.000đ tại các quận nội thành Hà Nội, TP. Hồ Chí Minh và Đà Nẵng. Quý khách được quyền kiểm tra hàng, bật máy test thử trước khi thanh toán tiền.",
    },
    {
      q: "Cửa hàng có hỗ trợ vệ sinh máy và nâng cấp linh kiện miễn phí không?",
      a: "Có, quý khách mua máy tính hoặc laptop tại hệ thống được miễn phí vệ sinh, tra keo tản nhiệt MX-4 trọn đời, hỗ trợ cài đặt hệ điều hành và phần mềm đồ họa/văn phòng cơ bản miễn phí tại tất cả 15 Showroom toàn quốc.",
    },
  ];

  return (
    <section className="seo-article-section">
      <div className="seo-article-container">
        {/* Header Block */}
        <div className="seo-header">
          <h2 className="seo-main-title">
            TƯ VẤN CHỌN MUA {categoryTitle.toUpperCase()} CHÍNH HÃNG NĂM 2026
          </h2>
          <p className="seo-lead">
            Bảng giá tổng hợp, kinh nghiệm chọn cấu hình chuẩn hiệu năng và chính sách mua hàng trả góp 0% ưu đãi nhất tại hệ thống Showroom toàn quốc.
          </p>
        </div>

        {/* Table of Contents (Mục lục điều hướng nhanh) */}
        <div className="seo-toc-box">
          <div className="seo-toc-header">
            <FaListUl className="toc-icon" />
            <h3>MỤC LỤC BÀI VIẾT</h3>
          </div>
          <ul className="seo-toc-list">
            <li><a href="#toc-1">1. Xu hướng chọn mua máy tính & laptop nổi bật năm 2026</a></li>
            <li><a href="#toc-2">2. Bảng tổng hợp thông số kỹ thuật và giá bán mới nhất hôm nay</a></li>
            <li><a href="#toc-3">3. Kinh nghiệm chọn cấu hình theo nhu cầu: Gaming, Đồ họa & Văn phòng</a></li>
            <li><a href="#toc-4">4. Chính sách mua hàng trả góp 0% và bảo hành 1 đổi 1 vàng</a></li>
            <li><a href="#toc-5">5. Câu hỏi thường gặp khi mua hàng (FAQ)</a></li>
          </ul>
        </div>

        {/* Content Wrapper with Collapsible Height */}
        <div className={`seo-content-body ${isExpanded ? "expanded" : "collapsed"}`}>
          {/* Section 1 */}
          <div className="seo-paragraph" id="toc-1">
            <h3>1. Xu hướng chọn mua máy tính & laptop nổi bật năm 2026</h3>
            <p>
              Bước sang năm 2026, thị trường công nghệ chứng kiến sự bùng nổ mạnh mẽ của các dòng chip xử lý tích hợp trí tuệ nhân tạo (AI NPU) cùng thế hệ card đồ họa NVIDIA GeForce RTX 40 Series và AMD Radeon RX 7000 Series. Người tiêu dùng ngày càng chú trọng đến tỷ lệ hiệu năng trên giá thành (P/P), khả năng tản nhiệt êm ái và chất lượng màn hình có tần số quét từ 144Hz đến 240Hz chuẩn màu 100% sRGB.
            </p>
            <p>
              Không chỉ đơn thuần là phục vụ chơi game giải trí, các dàn PC và Laptop thế hệ mới còn đáp ứng hoàn hảo các tác vụ render video 4K, đồ họa 3D kiến trúc, lập trình phần mềm và chạy các mô hình ngôn ngữ lớn cục bộ (Local LLMs) với tốc độ vượt trội.
            </p>
          </div>

          {/* Section 2: Specs & Price Summary Table */}
          <div className="seo-paragraph" id="toc-2">
            <h3>2. Bảng tổng hợp thông số kỹ thuật và giá bán mới nhất hôm nay</h3>
            <div className="seo-table-wrapper">
              <table className="seo-price-table">
                <thead>
                  <tr>
                    <th><FaTable /> Sản Phẩm</th>
                    <th>RAM</th>
                    <th>Ổ Cứng</th>
                    <th>Giá Khuyến Mãi</th>
                    <th>Tình Trạng</th>
                  </tr>
                </thead>
                <tbody>
                  {priceTableData.map((row, i) => (
                    <tr key={i}>
                      <td className="product-name-td"><strong>{row.name}</strong></td>
                      <td>{row.ram}</td>
                      <td>{row.ssd}</td>
                      <td className="price-highlight-td">{row.price}</td>
                      <td><span className="stock-tag-green">● {row.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 3 */}
          <div className="seo-paragraph" id="toc-3">
            <h3>3. Kinh nghiệm chọn cấu hình theo nhu cầu: Gaming, Đồ họa & Văn phòng</h3>
            <ul>
              <li>
                <strong>Phân khúc văn phòng & học tập (8 - 15 Triệu):</strong> Ưu tiên CPU Intel Core i3/i5 thế hệ mới, RAM tối thiểu 16GB để mở mượt mà hàng chục tab trình duyệt và phần mềm kế toán, ổ cứng SSD NVMe từ 256GB đến 512GB cho tốc độ khởi động Windows chỉ 5 giây.
              </li>
              <li>
                <strong>Phân khúc Gaming thể thao điện tử & Streamer (15 - 25 Triệu):</strong> Combo quốc dân được khuyên dùng là Core i5 12400F hoặc Ryzen 5 5600 kết hợp cùng card đồ họa RTX 3060 hoặc RTX 4060 8GB, nguồn công suất thực từ 550W - 650W chuẩn 80 Plus Bronze.
              </li>
              <li>
                <strong>Phân khúc Đồ họa chuyên nghiệp & Kỹ xảo (Trên 25 Triệu):</strong> Cần trang bị CPU tối thiểu 8 nhân 16 luồng (Core i7 13700K / 14700K hoặc Ryzen 7 7800X3D), 32GB RAM DDR5 và card đồ họa từ RTX 4070 trở lên để tối ưu thời gian render dự án nặng.
              </li>
            </ul>
          </div>

          {/* Section 4 */}
          <div className="seo-paragraph" id="toc-4">
            <h3>4. Chính sách mua hàng trả góp 0% và bảo hành 1 đổi 1 vàng</h3>
            <p>
              Nhằm mang lại trải nghiệm mua sắm an tâm tuyệt đối, hệ thống triển khai chương trình trả góp 0% lãi suất với tỷ lệ duyệt lên tới 98% qua thẻ tín dụng của 25 ngân hàng đối tác (VIB, VPBank, Techcombank, Vietcombank...) hoặc qua ứng dụng mua trước trả sau Kredivo / Home Credit chỉ cần CCCD.
            </p>
            <p>
              Tất cả các bộ máy bán ra đều được dán tem bảo hành điện tử chính hãng, cam kết 1 đổi 1 linh kiện trong 30 ngày nếu có bất kỳ lỗi kỹ thuật nào từ nhà sản xuất.
            </p>
          </div>

          {/* Section 5: FAQ Accordion */}
          <div className="seo-paragraph" id="toc-5">
            <h3>5. Câu hỏi thường gặp khi mua hàng (FAQ)</h3>
            <div className="seo-faq-accordion">
              {faqs.map((faq, idx) => (
                <div
                  key={idx}
                  className={`seo-faq-item ${activeFaq === idx ? "active" : ""}`}
                  onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                >
                  <div className="seo-faq-question">
                    <span className="faq-q-text">
                      <FaQuestionCircle className="faq-q-icon" /> {faq.q}
                    </span>
                    <FaChevronDown className={`faq-arrow ${activeFaq === idx ? "rotate" : ""}`} />
                  </div>
                  {activeFaq === idx && (
                    <div className="seo-faq-answer">
                      <p>{faq.a}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Expand / Collapse Button with Gradient Overlay */}
        <div className="seo-expand-wrapper">
          <button
            type="button"
            className="seo-toggle-btn"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? "Thu gọn nội dung tư vấn" : "Xem thêm bài viết tư vấn & bảng giá"}
            <FaChevronDown className={`btn-arrow ${isExpanded ? "rotate" : ""}`} />
          </button>
        </div>
      </div>
    </section>
  );
};

export default SeoArticleSection;
