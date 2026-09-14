import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import Header from "../../components/Header/Header";
import Footer from "../../components/Footer/FooterUser";
import "./LaptopPage.css";
import { FaShippingFast, FaAddressCard, FaCcApplePay, FaStore } from "react-icons/fa";
import { BsCreditCard2Front } from "react-icons/bs";
import { MdCurrencyExchange } from "react-icons/md";
import { AiOutlineShoppingCart } from "react-icons/ai";
import { FaGift } from "react-icons/fa6";
import InstallmentModal from "../../pages/InstallmentModal";
import SpecsModal from "../../pages/SpecsModal";
import Sevicer from "../../components/Sevicer/Sevicer";
import { getImageUrl } from "../../utils/imageUtils";
import { toast } from "sonner";
import ProductReviews from "../../pages/ProductReviews";
import ShowroomSystem from "../ShowroomSystem";
import PromoPopup from "../../components/PromoPopup/PromoPopup";
import WishlistButton from "../../components/Wishlist/WishlistButton";

const LaptopPage = () => {
  const { id } = useParams(); // Lấy ID sản phẩm từ URL
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [relatedProducts, setRelatedProducts] = useState([]); // Danh sách 5 sản phẩm ngẫu nhiên
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSpecsOpen, setIsSpecsOpen] = useState(false);

  // ================= LOGIC XỬ LÝ GIỎ HÀNG LAPTOP =================
  const handleAddToCart = async (
    redirectToCart = false,
    customProductId = null,
  ) => {
    const currentUser = JSON.parse(localStorage.getItem("currentUser"));

    if (!currentUser) {
      toast.warning("Vui lòng đăng nhập để mua sản phẩm này!");
      navigate("/login");
      return;
    }

    const targetProductId = customProductId
      ? String(customProductId)
      : String(id);

    try {
      // 1. Fetch danh sách mới nhất ngay tại thời điểm bấm nút để tránh cache/đè dữ liệu
      const cartRes = await fetch(
        `http://localhost:3000/cart?userId=${currentUser.id}`,
      );
      let cartItems = [];
      if (cartRes.ok) cartItems = await cartRes.json();

      // 2. Tìm chính xác mục Laptop trùng ID
      const existingItem = cartItems.find(
        (item) =>
          String(item.productId) === targetProductId &&
          item.fromTable === "LaptopUser",
      );

      if (existingItem) {
        // Nếu đã có: Tăng số lượng lên bằng PUT/PATCH với ID duy nhất của dòng đó
        const updateRes = await fetch(
          `http://localhost:3000/cart/${existingItem.id}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              quantity: Number(existingItem.quantity) + 1,
            }),
          },
        );

        if (updateRes.ok) {
          toast.success("Đã tăng số lượng sản phẩm trong giỏ hàng!");
          window.dispatchEvent(new Event("cartUpdated"));
          if (redirectToCart === true) navigate("/cart");
        }
      } else {
        // Nếu chưa có: Tạo dòng mới tinh kèm ID ngẫu nhiên (hoặc để json-server tự sinh) tránh đè
        const newCartItem = {
          id: `cart-laptop-${targetProductId}-${Date.now()}`, // Tạo ID riêng biệt cho item giỏ hàng, tránh bị ghi đè trùng id trong db.json
          userId: currentUser.id,
          productId: targetProductId,
          quantity: 1,
          fromTable: "LaptopUser",
        };

        const postRes = await fetch("http://localhost:3000/cart", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newCartItem),
        });

        if (postRes.ok) {
          toast.success("Thêm vào giỏ hàng thành công!");
          window.dispatchEvent(new Event("cartUpdated"));
          if (redirectToCart === true) navigate("/cart");
        }
      }
    } catch (error) {
      console.error("Lỗi xử lý giỏ hàng Laptop:", error);
      toast.error("Không thể xử lý giỏ hàng!");
    }
  };

  // ================= FETCH API DỮ LIỆU SẢN PHẨM =================
  useEffect(() => {
    setLoading(true);

    // 1. Tìm thông tin chi tiết sản phẩm đang xem
    fetch(`http://localhost:3000/LaptopUser/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Không tìm thấy laptop");
        return res.json();
      })
      .then((data) => {
        setProduct(data);
      })
      .catch((err) => {
        console.error(err);
        setProduct(null);
      });

    // 2. Lấy dữ liệu từ bảng LaptopUser để làm sản phẩm tương tự
    fetch("http://localhost:3000/LaptopUser")
      .then((res) => res.json().catch(() => []))
      .then((laptopData) => {
        const industryProducts = laptopData.filter(
          (item) => String(item.id) !== String(id),
        );
        const shuffled = [...industryProducts].sort(() => 0.5 - Math.random());
        setRelatedProducts(shuffled.slice(0, 5));
        setLoading(false);
      })
      .catch((err) => {
        console.error("Lỗi lấy sản phẩm ngẫu nhiên:", err);
        setLoading(false);
      });
  }, [id]);

  if (loading)
    return <div className="loading-box">Đang tải thông tin sản phẩm...</div>;
  if (!product)
    return <div className="loading-box">Không tìm thấy sản phẩm này!</div>;

  return (
    <div className="product-detail-page">
      <PromoPopup triggerKey={id} />
      <Header />

      <div className="demo-bar">
        <div className="demo-bread">
          <Link to="/">
            <span>Trang chủ </span>
          </Link>
          <Link to="/product-manga-new">
            <span>Sản Phẩm Mới Về</span>
          </Link>
          <Link to="/">
            <span className="demo-bread-current">{product.name}</span>
          </Link>
          <WishlistButton
            productId={id}
            fromTable="LaptopUser"
            productName={product?.name}
          />
        </div>
      </div>

      <main className="product-detail-container">
        {/* Header Badges & Rating */}
        <div className="product-header-badges">
          <span className="detail-badge-rating">⭐ 4.9 (412 đánh giá)</span>
          <span className="detail-badge-sold">Đã bán 980+</span>
          <span className="detail-badge-vna">Chính hãng 100% Fullbox</span>
          <span className="detail-badge-warranty">Bảo hành 24T Chính Hãng</span>
        </div>
        <h1 className="product-main-title">{product.name}</h1>

        <div className="product-detail-layout">
          <div className="detail-left-gallery">
            <div className="main-image-wrapper">
              <img
                src={getImageUrl(product?.image)}
                alt={product?.name}
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = getImageUrl(undefined);
                }}
              />
            </div>
            {/* Showroom Stock Box */}
            <div className="showroom-stock-mini-box">
              <h4><FaStore /> CÒN HÀNG TẠI SHOWROOM:</h4>
              <ul>
                <li><span className="stock-dot-green">●</span> <strong>Hà Nội:</strong> 123 Thái Hà, Đống Đa</li>
                <li><span className="stock-dot-green">●</span> <strong>TP. Hồ Chí Minh:</strong> 456 Lê Hồng Phong, Q.10</li>
                <li><span className="stock-dot-green">●</span> <strong>Đà Nẵng:</strong> 78 Nguyễn Văn Linh, Hải Châu</li>
              </ul>
            </div>
          </div>

          <div className="detail-center-info">
            {/* Version Option Chips */}
            <div className="upgrade-options-box">
              <div className="options-header-label">TÙY CHỌN CẤU HÌNH BỘ NHỚ:</div>
              <label>
                <input type="radio" name="laptop-spec" defaultChecked /> BẢN TIÊU CHUẨN (RAM 16GB | SSD 512GB NVMe)
              </label>
              <label>
                <input type="radio" name="laptop-spec" /> NÂNG CẤP RAM 32GB CHÍNH HÃNG + 1.200.000đ
              </label>
              <label>
                <input type="radio" name="laptop-spec" /> NÂNG CẤP SSD 1TB GEN 4 SIÊU TỐC + 1.500.000đ
              </label>
            </div>

            {/* Colors Selection Pills */}
            <div className="color-options-row">
              <span className="color-label">Màu sắc:</span>
              <div className="color-pills-group">
                <button type="button" className="color-pill active">Xám Không Gian</button>
                <button type="button" className="color-pill">Bạc Platinum</button>
                <button type="button" className="color-pill">Đen Nhám Gaming</button>
              </div>
            </div>

            {/* Live Price Block */}
            <div className="price-display-section">
              <div className="price-primary-group">
                <span className="live-price">
                  {product.price ? product.price.toLocaleString("vi-VN") : 0}đ
                </span>
                <span className="old-price">
                  {(product.price * 1.12).toLocaleString("vi-VN")}đ
                </span>
              </div>
              <span className="save-badge-retail">
                Tiết kiệm {(product.price * 0.12).toLocaleString("vi-VN")}đ (-12%)
              </span>
            </div>

            {/* Red Gift Box */}
            <div className="gift-bonus-box">
              <div className="gift-title">
                <span className="gift-icons">
                  <FaGift />
                </span>
                BỘ QUÀ TẶNG GAMING & VĂN PHÒNG TRỊ GIÁ 1.800.000đ
              </div>
              <ul className="gift-list">
                <li>
                  <strong>BALO LAPTOP CAO CẤP CHỐNG NƯỚC CHỐNG SỐC TRỊ GIÁ 590K</strong>
                </li>
                <li>CHUỘT KHÔNG DÂY SILENT GAMING DAREU GIÁ 350K</li>
                <li>LÓT CHUỘT SPEED PRO MAX 80X30CM GIÁ 150K</li>
                <li>GÓI VỆ SINH & TRA KEO TẢN NHIỆT MIỄN PHÍ TRỌN ĐỜI</li>
              </ul>
            </div>

            {/* Bank Partner Offers */}
            <div className="detail-bank-offers-box">
              <div className="bank-offers-title">
                <BsCreditCard2Front /> ƯU ĐÃI THANH TOÁN QUA ĐỐI TÁC:
              </div>
              <div className="bank-offers-list">
                <div className="bank-offer-tag">
                  <span className="bank-tag-pill vib">VIB</span>
                  <span>Giảm thêm tới 1.000.000đ khi mở thẻ tín dụng mới</span>
                </div>
                <div className="bank-offer-tag">
                  <span className="bank-tag-pill vpbank">VPBank</span>
                  <span>Giảm 500.000đ cho đơn hàng Laptop từ 12.000.000đ</span>
                </div>
                <div className="bank-offer-tag">
                  <span className="bank-tag-pill momo">MoMo</span>
                  <span>Nhập mã TECH200 giảm ngay 200.000đ</span>
                </div>
              </div>
            </div>

            {/* 3 Call to Action buttons */}
            <div className="purchase-actions-group">
              <button
                className="btn-buy-now-flagship"
                onClick={() => handleAddToCart(true)}
              >
                MUA NGAY
                <span>Giao hàng siêu tốc 2h hoặc nhận tại showroom</span>
              </button>

              <div className="sub-buy-buttons-row">
                <button
                  className="btn-installment-split"
                  onClick={() => setIsModalOpen(true)}
                >
                  <strong>TRẢ GÓP 0% QUA CCCD</strong>
                  <span>Xét duyệt hồ sơ 5 phút online</span>
                </button>

                <button
                  className="btn-installment-card-split"
                  onClick={() => setIsModalOpen(true)}
                >
                  <strong>TRẢ GÓP QUA THẺ</strong>
                  <span>Visa, Master, JCB hạn mức linh hoạt</span>
                </button>
              </div>

              <button
                className="btn-add-to-cart-big"
                onClick={() => handleAddToCart(false)}
              >
                THÊM VÀO GIỎ HÀNG
                <span>Thêm vào giỏ để tiếp tục chọn sản phẩm khác</span>
              </button>
            </div>
          </div>

          <div className="detail-right-policies">
            <h3>CAM KẾT DỊCH VỤ VÀNG</h3>
            <div className="policy-item-row">
              <span className="policy-icon-blue">
                <FaShippingFast />
              </span>
              <div>
                <strong>Miễn phí giao hàng toàn quốc</strong>
                <p>Giao siêu tốc 2h nội thành, kiểm tra hàng trước khi nhận</p>
              </div>
            </div>
            <div className="policy-item-row">
              <span className="policy-icon-blue">
                <MdCurrencyExchange />
              </span>
              <div>
                <strong>1 Đổi 1 trong vòng 30 ngày</strong>
                <p>Đổi mới ngay lập tức nếu phát sinh lỗi từ nhà sản xuất</p>
              </div>
            </div>
            <div className="policy-item-row">
              <span className="policy-icon-blue">
                <FaAddressCard />
              </span>
              <div>
                <strong>Bảo hành chính hãng 24 Tháng</strong>
                <p>Hỗ trợ bảo hành tại hệ thống ủy quyền toàn quốc</p>
              </div>
            </div>
            <div className="policy-item-row">
              <span className="policy-icon-blue">
                <FaCcApplePay />
              </span>
              <div>
                <strong>Hỗ trợ trả góp 0% lãi suất</strong>
                <p>Thủ tục đơn giản qua CCCD hoặc thẻ tín dụng</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <div className="product-description-section">
        <div className="description-layout-container">
          <div className="description-left-content">
            <div className="tab-header-title">
              <h2>MÔ TẢ</h2>
            </div>
            <div className="main-specs-body">
              <h3>THÔNG SỐ CHI TIẾT MÁY :</h3>
              <p className="review-text">
                Đánh giá máy :{" "}
                <strong>
                  Hỗ trợ tốt trong công việc đồ họa , sử dụng games online
                  offline rất tốt với cấu hình high setting
                </strong>
              </p>

              <table className="specs-table-detail">
                <tbody>
                  {product.name &&
                  (product.name.includes("I5 12400F") ||
                    product.name.includes("MSI FORGE")) ? (
                    <>
                      <tr>
                        <td>
                          <strong>MAIN</strong>
                        </td>
                        <td className="blue-text-link">ASROCK B660M PRO RS</td>
                        <td>36TH</td>
                      </tr>
                      <tr>
                        <td>
                          <strong>CPU</strong>
                        </td>
                        <td>I5 12400F TRAY</td>
                        <td>36TH</td>
                      </tr>
                      <tr>
                        <td>
                          <strong>RAM</strong>
                        </td>
                        <td className="blue-text-link">
                          16G DDR4 3200 ( 16GX1 )
                        </td>
                        <td>36TH</td>
                      </tr>
                      <tr>
                        <td>
                          <strong>SSD</strong>
                        </td>
                        <td>256G M2 NVME</td>
                        <td>36TH</td>
                      </tr>
                      <tr>
                        <td>
                          <strong>VGA</strong>
                        </td>
                        <td className="blue-text-link">
                          GEFORCE RTX 2060 6G DDR6
                        </td>
                        <td>3TH</td>
                      </tr>
                    </>
                  ) : (
                    <>
                      <tr>
                        <td>
                          <strong>THIẾT BỊ</strong>
                        </td>
                        <td>{product?.name || "Thiết bị chính hãng"}</td>
                        <td>12TH</td>
                      </tr>
                      <tr>
                        <td>
                          <strong>MÀN HÌNH</strong>
                        </td>
                        <td>Độ phân giải tiêu chuẩn cao</td>
                        <td>12TH</td>
                      </tr>
                      <tr>
                        <td>
                          <strong>CẤU HÌNH</strong>
                        </td>
                        <td className="blue-text-link">
                          Xem chi tiết ở mục thông số kỹ thuật
                        </td>
                        <td>36TH</td>
                      </tr>
                    </>
                  )}
                  <tr>
                    <td>
                      <strong>PHỤ KIỆN</strong>
                    </td>
                    <td className="blue-text-link">
                      Dây nguồn tiêu chuẩn kèm theo vỏ hộp
                    </td>
                    <td>12TH</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="description-right-sidebar">
            <div className="widget-spec-box">
              <h3>Thông số kỹ thuật</h3>
              <div className="mini-table-container">
                <table className="mini-specs-table">
                  <thead>
                    <tr>
                      <th>LINH KIỆN</th>
                      <th>SẢN PHẨM</th>
                      <th>BẢO HÀNH</th>
                    </tr>
                  </thead>
                  <tbody>
                    {product.name &&
                    (product.name.includes("I5 12400F") ||
                      product.name.includes("MSI FORGE")) ? (
                      <>
                        <tr>
                          <td>MAIN</td>
                          <td className="blue-text-link">
                            ASROCK B660M PRO RS
                          </td>
                          <td>36TH</td>
                        </tr>
                        <tr>
                          <td>CPU</td>
                          <td>I5 12400F TRAY</td>
                          <td>36TH</td>
                        </tr>
                      </>
                    ) : (
                      <>
                        <tr>
                          <td>THIẾT BỊ</td>
                          <td>Theo máy</td>
                          <td>12TH</td>
                        </tr>
                        <tr>
                          <td>CẤU HÌNH</td>
                          <td>Theo thông số chung</td>
                          <td>36TH</td>
                        </tr>
                      </>
                    )}
                  </tbody>
                </table>
              </div>
              <button
                className="btn-view-all-specs"
                onClick={() => setIsSpecsOpen(true)}
              >
                Xem đầy đủ thông số kỹ thuật
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="review">
        {product && product.id && (
          <ProductReviews productId={product.id} collectionName="LaptopUser" />
        )}
      </div>

      {relatedProducts.length > 0 && (
        <section className="related-products-section">
          <div className="related-inner-container">
            <h2 className="related-section-title">SẢN PHẨM TƯƠNG TỰ</h2>
            <div className="related-products-grid">
              {relatedProducts.map((item, index) => (
                <div
                  key={`${item.id}-${index}`}
                  className="related-card-link-wrapper"
                  style={{ position: "relative" }}
                >
                  <Link
                    to={`/laptop-detail/${item.id}`}
                    className="related-card-link"
                  >
                    <div className="related-product-card">
                      <div className="related-card-img-wrapper">
                        <img
                          src={getImageUrl(item?.image)}
                          alt={item?.name}
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = getImageUrl(undefined);
                          }}
                        />
                      </div>
                      <div className="related-card-info-content">
                        <h4>{item.name}</h4>
                        <div className="related-price-row">
                          <span className="related-price-current">
                            {item.price.toLocaleString("vi-VN")}đ
                          </span>
                          <span className="related-price-old">
                            {(item.price * 1.15).toLocaleString("vi-VN")}đ
                          </span>
                        </div>
                        <div className="related-status-stock">
                          <span>Xem Chi Tiết</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                  {/* FIX NÚT THÊM NHANH Ở SẢN PHẨM LIÊN QUAN */}
                  <button
                    className="btn-quick-cart-circle"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleAddToCart(false, item.id);
                    }}
                  >
                    <AiOutlineShoppingCart />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <InstallmentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        product={product}
      />
      <SpecsModal
        isOpen={isSpecsOpen}
        onClose={() => setIsSpecsOpen(false)}
        product={product}
      />
      <Sevicer />
      <ShowroomSystem />
      <Footer />
    </div>
  );
};

export default LaptopPage;
