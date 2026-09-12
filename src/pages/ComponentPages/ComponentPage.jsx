import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import Header from "../../components/Header/Header";
import Footer from "../../components/Footer/FooterUser";
import "./ComponentPage.css";
import { FaShippingFast, FaAddressCard, FaCcApplePay } from "react-icons/fa";
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

const ComponentPage = () => {
  const { id } = useParams(); // Lấy ID sản phẩm từ URL
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [relatedProducts, setRelatedProducts] = useState([]); // Danh sách 5 linh kiện ngẫu nhiên
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSpecsOpen, setIsSpecsOpen] = useState(false);

  // ================= XỬ LÝ GIỎ HÀNG LINH KIỆN =================
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
      // 1. Fetch danh sách mới nhất tại thời điểm bấm nút
      const cartRes = await fetch(
        `http://localhost:3000/cart?userId=${currentUser.id}`,
      );
      let cartItems = [];
      if (cartRes.ok) cartItems = await cartRes.json();

      // 2. Tìm chính xác mục Linh kiện trùng ID
      const existingItem = cartItems.find(
        (item) =>
          String(item.productId) === targetProductId &&
          item.fromTable === "eventList",
      );

      if (existingItem) {
        // Nếu đã có: Tăng số lượng lên
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
          toast.success("Đã tăng số lượng linh kiện trong giỏ hàng!");
          window.dispatchEvent(new Event("cartUpdated"));
          if (redirectToCart === true) navigate("/cart");
        }
      } else {
        // Nếu chưa có: Tạo dòng mới có ID phân biệt
        const newCartItem = {
          id: `cart-comp-${targetProductId}-${Date.now()}`, // Định danh duy nhất để json-server không ghi đè lung tung
          userId: currentUser.id,
          productId: targetProductId,
          quantity: 1,
          fromTable: "eventList",
        };

        const postRes = await fetch("http://localhost:3000/cart", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newCartItem),
        });

        if (postRes.ok) {
          toast.success("Thêm linh kiện vào giỏ hàng thành công!");
          window.dispatchEvent(new Event("cartUpdated"));
          if (redirectToCart === true) navigate("/cart");
        }
      }
    } catch (error) {
      console.error("Lỗi xử lý giỏ hàng Linh Kiện:", error);
      toast.error("Không thể xử lý giỏ hàng!");
    }
  };

  // ================= FETCH API DỮ LIỆU LINH KIỆN =================
  useEffect(() => {
    setLoading(true);

    // 1. Tìm thông tin chi tiết linh kiện từ bảng eventList
    fetch(`http://localhost:3000/eventList/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Không tìm thấy Linh Kiện");
        return res.json();
      })
      .then((data) => {
        setProduct(data);
      })
      .catch((err) => {
        console.error(err);
        setProduct(null);
      });

    // 2. Lấy dữ liệu chuẩn từ bảng eventList để làm sản phẩm tương tự
    fetch("http://localhost:3000/eventList")
      .then((res) => res.json().catch(() => []))
      .then((componentData) => {
        const industryProducts = componentData.filter(
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
            fromTable="eventList"
            productName={product?.name}
          />
        </div>
      </div>

      <main className="product-detail-container">
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
          </div>

          <div className="detail-center-info">
            <div className="upgrade-options-box">
              <label>
                <input type="radio" name="upgrade-option" defaultChecked /> BẢO
                HÀNH TIÊU CHUẨN CỦA HÃNG
              </label>
              <label>
                <input type="radio" name="upgrade-option" /> GÓI BẢO HÀNH VÀNG 1
                ĐỔI 1 TẠI CỬA HÀNG + 250.000đ
              </label>
            </div>

            <div className="price-display-section">
              <span className="old-price">
                {(product.price * 1.06).toLocaleString("vi-VN")}đ
              </span>
              <span className="live-price">
                {product.price.toLocaleString("vi-VN")}đ
              </span>
            </div>

            <div className="gift-bonus-box">
              <div className="gift-title">
                <span className="gift-icons">
                  <FaGift />
                </span>
                Quà tặng / Khuyến mãi đi kèm
              </div>
              <ul className="gift-list">
                <li>
                  <strong>
                    TẶNG VOUCHER GIẢM 10% CHO LẦN MUA BÀN PHÍM CHUỘT TIẾP THEO
                  </strong>
                </li>
                <li>
                  Hỗ trợ vệ sinh linh kiện, tra keo tản nhiệt miễn phí trọn đời
                </li>
                <li>Giao hàng nhanh trong vòng 2 giờ khu vực nội thành</li>
              </ul>
            </div>

            <div className="purchase-actions-group">
              {/* ĐÃ SỬA: Sắp xếp lại onClick truyền boolean false chuẩn chỉ */}
              <button
                className="btn-add-to-cart-big"
                onClick={() => handleAddToCart(false)}
              >
                <strong>THÊM VÀO GIỎ HÀNG</strong>
                <span>THÊM VÀO GIỎ ĐỂ CHỌN TIẾP</span>
              </button>

              <div className="sub-buy-buttons-row">
                {/* ĐÃ SỬA: Đồng bộ gọi hàm handleAddToCart(true) cho nút Mua Ngay */}
                <button
                  className="btn-buy-now-split"
                  onClick={() => handleAddToCart(true)}
                >
                  <strong>MUA NGAY</strong>
                  <span>Giao tận nơi hoặc trực tiếp</span>
                </button>

                <button
                  className="btn-installment-split"
                  onClick={() => setIsModalOpen(true)}
                >
                  <strong>MUA TRẢ GÓP</strong>
                  <span>Thủ tục đơn giản, xét duyệt nhanh</span>
                </button>
              </div>
            </div>
          </div>

          <div className="detail-right-policies">
            <h3>CHÍNH SÁCH KHÁCH HÀNG</h3>
            <div className="policy-item-row">
              <span className="policy-icon-blue">
                <FaShippingFast />
              </span>
              <p>Giao hàng miễn phí (chỉ áp dụng khu vực nội thành)</p>
            </div>
            <div className="policy-item-row">
              <span className="policy-icon-blue">
                <FaAddressCard />
              </span>
              <p>Hỗ trợ trả góp lãi suất thấp thông qua các đơn vị tài chính</p>
            </div>
            <div className="policy-item-row">
              <span className="policy-icon-blue">
                <FaCcApplePay />
              </span>
              <p>Trả góp lãi suất 0% qua thẻ tín dụng Visa, Master, JCB</p>
            </div>
            <div className="policy-item-row">
              <span className="policy-icon-blue">
                <MdCurrencyExchange />
              </span>
              <p>Đổi mới trong vòng 7 ngày nếu lỗi do Nhà Sản Xuất</p>
            </div>
          </div>
        </div>
      </main>

      <div className="product-description-section">
        <div className="description-layout-container">
          <div className="description-left-content">
            <div className="tab-header-title">
              <h2>MÔ TẢ SẢN PHẨM</h2>
            </div>
            <div className="main-specs-body">
              <h3>THÔNG SỐ CHI TIẾT KỸ THUẬT:</h3>
              <p className="review-text">
                Đánh giá chung:{" "}
                <strong>
                  Sản phẩm linh kiện máy tính chính hãng, hiệu năng cao, hoạt
                  động bền bỉ và đạt độ ổn định lâu dài trong hệ thống máy bộ.
                </strong>
              </p>

              <table className="specs-table-detail">
                <tbody>
                  <tr>
                    <td>
                      <strong>TÊN LINH KIỆN</strong>
                    </td>
                    <td className="blue-text-link">{product.name}</td>
                    <td>Chính hãng</td>
                  </tr>
                  <tr>
                    <td>
                      <strong>PHÂN LOẠI</strong>
                    </td>
                    <td>Linh kiện ráp máy bộ / Nâng cấp lẻ</td>
                    <td>Mới 100%</td>
                  </tr>
                  <tr>
                    <td>
                      <strong>BẢO HÀNH</strong>
                    </td>
                    <td className="blue-text-link">
                      36 Tháng (Theo tiêu chuẩn nhà sản xuất)
                    </td>
                    <td>36TH</td>
                  </tr>
                  <tr>
                    <td>
                      <strong>PHỤ KIỆN</strong>
                    </td>
                    <td>
                      Hộp sản phẩm, sách hướng dẫn, ốc vít đi kèm (nếu có)
                    </td>
                    <td>Fullbox</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="description-right-sidebar">
            <div className="widget-spec-box">
              <h3>Tóm tắt thông số</h3>
              <div className="mini-table-container">
                <table className="mini-specs-table">
                  <thead>
                    <tr>
                      <th>HẠNG MỤC</th>
                      <th>THÔNG TIN CHUNG</th>
                      <th>BẢO HÀNH</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Thiết bị</td>
                      <td className="blue-text-link">Chính hãng</td>
                      <td>36TH</td>
                    </tr>
                    <tr>
                      <td>Trạng thái</td>
                      <td>Mới 100%</td>
                      <td>Fullbox</td>
                    </tr>
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
          <ProductReviews productId={product.id} collectionName="eventList" />
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
                    to={`/component-category/${item.id}`}
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
                  {/* THÊM NHANH LINH KIỆN TƯƠNG TỰ */}
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

export default ComponentPage;
