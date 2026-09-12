import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import Header from "../components/Header/Header";
import Footer from "../components/Footer/FooterUser";
import "./ProductDetail.css";
import { FaShippingFast, FaAddressCard, FaCcApplePay } from "react-icons/fa";
import { MdCurrencyExchange } from "react-icons/md";
import { AiOutlineShoppingCart } from "react-icons/ai";
import { FaGift } from "react-icons/fa6";
import InstallmentModal from "./InstallmentModal";
import SpecsModal from "./SpecsModal";
import Sevicer from "../components/Sevicer/Sevicer";
import { getImageUrl } from "../utils/imageUtils";
import { toast } from "sonner";
import ProductReviews from "./ProductReviews";
import ShowroomSystem from "./ShowroomSystem";
import PromoPopup from "../components/PromoPopup/PromoPopup";
import WishlistButton from "../components/Wishlist/WishlistButton";

const ProductDetail = () => {
  const { id } = useParams(); // Lấy ID sản phẩm từ URL
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [relatedProducts, setRelatedProducts] = useState([]); // Danh sách 5 sản phẩm ngẫu nhiên
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSpecsOpen, setIsSpecsOpen] = useState(false);

  // ================= LOGIC XỬ LÝ GIỎ HÀNG CHO CATENOGIES =================
  const handleAddToCart = async (
    redirectToCart = false,
    customProduct = null,
  ) => {
    const currentUser = JSON.parse(localStorage.getItem("currentUser"));

    if (!currentUser) {
      toast.warning("Vui lòng đăng nhập để mua sản phẩm này!");
      navigate("/login");
      return;
    }

    // Nếu bấm ở sản phẩm tương tự thì lấy customProduct, ngược lại lấy sản phẩm chi tiết hiện tại
    const targetProduct = customProduct ? customProduct : product;
    if (!targetProduct) return;

    const targetProductId = String(targetProduct.id);
    const targetFromTable = "catenogies"; // 🌟 ĐỐNG DẤU CHUẨN BẢNG THEO Ý BẠN

    try {
      // 1. Fetch danh sách giỏ hàng mới nhất
      const cartRes = await fetch(
        `http://localhost:3000/cart?userId=${currentUser.id}`,
      );
      let cartItems = [];
      if (cartRes.ok) cartItems = await cartRes.json();

      // 2. Tìm chính xác mục trùng ID VÀ bắt buộc phải thuộc bảng "catenogies"
      const existingItem = cartItems.find(
        (item) =>
          String(item.productId) === targetProductId &&
          item.fromTable === targetFromTable,
      );

      if (existingItem) {
        // Đã có -> Tăng số lượng lên 1
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
        // Chưa có -> Tạo mới với ID ngẫu nhiên không đụng hàng
        const newCartItem = {
          id: `cart-cate-${targetProductId}-${Date.now()}`, // Định danh không lo trùng
          userId: currentUser.id,
          productId: targetProductId,
          quantity: 1,
          fromTable: targetFromTable, // Lưu đúng nguồn gốc catenogies
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
      console.error("Lỗi xử lý giỏ hàng ProductDetail:", error);
      toast.error("Không thể xử lý giỏ hàng!");
    }
  };

  // ================= FETCH ĐÚNG DỮ LIỆU BẢNG CATENOGIES =================
  useEffect(() => {
    setLoading(true);

    //  ĐÃ KHÓA CHẶT: Chỉ fetch đúng bảng catenogies theo ID, không gọi lung tung nữa
    fetch(`http://localhost:3000/catenogies/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Không tìm thấy sản phẩm trong danh mục!");
        return res.json();
      })
      .then((data) => {
        if (data && data.name) {
          setProduct(data);
        } else {
          setProduct(null);
        }
      })
      .catch((err) => {
        console.error("Lỗi lấy chi tiết catenogies:", err);
        setProduct(null);
      });

    // Lấy dữ liệu làm sản phẩm tương tự (cũng từ bảng catenogies)
    fetch("http://localhost:3000/catenogies")
      .then((res) => res.json().catch(() => []))
      .then((catenogiesData) => {
        const industryProducts = catenogiesData.filter(
          (item) => String(item.id) !== String(id),
        );
        const shuffled = [...industryProducts].sort(() => 0.5 - Math.random());
        setRelatedProducts(shuffled.slice(0, 5));
        setLoading(false);
      })
      .catch((err) => {
        console.error("Lỗi lấy sản phẩm tương tự:", err);
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
            fromTable="catenogies"
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
                <input type="radio" name="vga" defaultChecked /> NÂNG CẤP LÊN
                VGA RTX 3060 CŨ + 2.400.000đ
              </label>
              <label>
                <input type="radio" name="vga" /> NÂNG CẤP LÊN VGA RTX 3060TI CŨ
                + 3.400.000đ
              </label>
              <label>
                <input type="radio" name="vga" /> NÂNG CẤP LÊN VGA RTX 3070TI CŨ
                + 7.900.000đ
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
                Quà tặng / Khuyến mãi
              </div>
              <ul className="gift-list">
                <li>
                  <strong>CHUỘT GAMING DAREU EM908 USB LED RGB GIÁ 350K</strong>
                </li>
                <li>BÀN PHÍM GAMING DAREU EK810 USB LED GIÁ 690K</li>
                <li>TAI NGHE GAMING DAREU EH469 USB LED RGB GIÁ 450K</li>
                <li>LÓT CHUỘT DAREU ESP109 FULL SIZE 90X40 GIÁ 160K</li>
              </ul>
            </div>

            <div className="purchase-actions-group">
              <button
                className="btn-add-to-cart-big"
                onClick={() => handleAddToCart(false)}
              >
                THÊM VÀO GIỎ HÀNG
                <span>THÊM VÀO GIỎ ĐỂ CHỌN TIẾP</span>
              </button>
              <div className="sub-buy-buttons-row">
                <button
                  className="btn-buy-now-split"
                  onClick={() => handleAddToCart(true)}
                >
                  MUA NGAY
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
              <p>
                Hỗ trợ trả góp lãi suất thấp cho các sản phẩm thông qua các đơn
                vị tài chính
              </p>
            </div>
            <div className="policy-item-row">
              <span className="policy-icon-blue">
                <FaCcApplePay />
              </span>
              <p>
                Trả góp lãi suất 0% qua thẻ tín dụng Visa, Master, JCB (áp dụng
                một số mặt hàng nhất định)
              </p>
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
          <ProductReviews productId={product.id} collectionName="catenogies" />
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
                    to={`/product/${item.id}`}
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
                  <button
                    className="btn-quick-cart-circle"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleAddToCart(false, item); // Thêm nhanh sản phẩm tương tự vào giỏ catenogies
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

export default ProductDetail;
