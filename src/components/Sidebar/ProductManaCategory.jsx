import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import Header from "../../components/Header/Header";
import Footer from "../../components/Footer/FooterUser";
import Sevicer from "../../components/Sevicer/Sevicer";
import InstallmentModal from "../../pages/InstallmentModal";
import ProductReviews from "../../pages/ProductReviews";
import WishlistButton from "../../components/Wishlist/WishlistButton";

import { getImageUrl } from "../../utils/imageUtils";
import { toast } from "sonner";
import {
  FaShieldAlt,
  FaTruck,
  FaExchangeAlt,
  FaTools,
  FaCheckCircle,
} from "react-icons/fa";
import "./ProductManaCategory.css";

const trustBadges = [
  "Hàng chính hãng 100%",
  "Đóng gói cẩn thận",
  "Hỗ trợ đổi trả nhanh",
  "Giao hàng toàn quốc",
];

const ProductManaCategory = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    setLoading(true);

    fetch(`http://localhost:3000/appliances/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Không tìm thấy sản phẩm!");
        return res.json();
      })
      .then((data) => setProduct(data && data.name ? data : null))
      .catch((err) => {
        console.error("Lỗi lấy chi tiết đồ gia dụng:", err);
        setProduct(null);
      });

    fetch("http://localhost:3000/appliances")
      .then((res) => res.json())
      .then((all) => {
        const others = all.filter((item) => String(item.id) !== String(id));
        const shuffled = [...others].sort(() => 0.5 - Math.random());
        setRelatedProducts(shuffled.slice(0, 5));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

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

    const targetProduct = customProduct ? customProduct : product;
    if (!targetProduct) return;

    const targetProductId = String(targetProduct.id);
    const targetFromTable = "appliances";

    try {
      const cartRes = await fetch(
        `http://localhost:3000/cart?userId=${currentUser.id}`,
      );
      let cartItems = [];
      if (cartRes.ok) cartItems = await cartRes.json();

      const existingItem = cartItems.find(
        (item) =>
          String(item.productId) === targetProductId &&
          item.fromTable === targetFromTable,
      );

      if (existingItem) {
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
          if (redirectToCart) navigate("/cart");
        }
      } else {
        const newCartItem = {
          id: `cart-appliance-${targetProductId}-${Date.now()}`,
          userId: currentUser.id,
          productId: targetProductId,
          quantity: 1,
          fromTable: targetFromTable,
        };
        const postRes = await fetch("http://localhost:3000/cart", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newCartItem),
        });
        if (postRes.ok) {
          toast.success("Thêm vào giỏ hàng thành công!");
          window.dispatchEvent(new Event("cartUpdated"));
          if (redirectToCart) navigate("/cart");
        }
      }
    } catch (error) {
      console.error("Lỗi xử lý giỏ hàng ProductManaCategory:", error);
      toast.error("Không thể xử lý giỏ hàng!");
    }
  };

  if (loading)
    return <div className="ad-loading-box">Đang tải thông tin sản phẩm...</div>;
  if (!product)
    return <div className="ad-loading-box">Không tìm thấy sản phẩm này!</div>;

  const oldPrice =
    product.discountPercent > 0
      ? Math.round(product.price / (1 - product.discountPercent / 100))
      : null;

  return (
    <div className="ad-page">
      <Header />

      <div className="demo-bar">
        <div className="demo-bread">
          <Link to="/">
            <span>Trang chủ</span>
          </Link>
          <span className="demo-bread-current">{product.name}</span>
          <WishlistButton
            productId={id}
            fromTable="appliances"
            productName={product?.name}
          />
        </div>
      </div>
      <main className="ad-container">
        <div className="ad-layout">
          <div className="ad-gallery">
            <div className="ad-main-image">
              <img
                src={getImageUrl(product.image)}
                alt={product.name}
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = getImageUrl(undefined);
                }}
              />
              {product.discountPercent > 0 && (
                <span className="ad-discount-badge">
                  -{product.discountPercent}%
                </span>
              )}
            </div>
          </div>

          <div className="ad-main-info">
            <h1 className="ad-title">{product.name}</h1>
            <p className="ad-short-spec">{product.shortSpec}</p>

            <div className="ad-trust-row">
              {trustBadges.map((t, i) => (
                <span className="ad-trust-badge" key={i}>
                  <FaCheckCircle /> {t}
                </span>
              ))}
            </div>

            <div className="ad-price-box">
              {oldPrice && (
                <span className="ad-price-old">
                  {oldPrice.toLocaleString("vi-VN")}đ
                </span>
              )}
              <span className="ad-price-live">
                {product.price.toLocaleString("vi-VN")}đ
              </span>
              <span className="ad-warranty-chip">
                Bảo hành {product.warranty}
              </span>
            </div>

            <div className="ad-actions">
              <button
                className="ad-btn-cart"
                onClick={() => handleAddToCart(false)}
              >
                Thêm vào giỏ hàng
              </button>
              <button
                className="ad-btn-buy"
                onClick={() => handleAddToCart(true)}
              >
                Mua ngay
              </button>
              <button
                className="ad-btn-installment"
                onClick={() => setIsModalOpen(true)}
              >
                Trả góp 0%
              </button>
            </div>
          </div>

          <div className="ad-policies">
            <h3>Chính sách bán hàng</h3>
            <div className="ad-policy-item">
              <span className="ad-policy-icon">
                <FaTruck />
              </span>
              <p>Giao hàng toàn quốc, miễn phí nội thành</p>
            </div>
            <div className="ad-policy-item">
              <span className="ad-policy-icon">
                <FaTools />
              </span>
              <p>Hỗ trợ lắp đặt / hướng dẫn sử dụng tại nhà</p>
            </div>
            <div className="ad-policy-item">
              <span className="ad-policy-icon">
                <FaExchangeAlt />
              </span>
              <p>Đổi trả trong 7 ngày nếu lỗi do nhà sản xuất</p>
            </div>
            <div className="ad-policy-item">
              <span className="ad-policy-icon">
                <FaShieldAlt />
              </span>
              <p>Bảo hành chính hãng {product.warranty}</p>
            </div>
          </div>
        </div>
      </main>

      <div className="ad-description-section">
        <div className="ad-description-layout">
          <div className="ad-description-main">
            <h2 className="ad-section-heading">Mô tả sản phẩm</h2>
            <p className="ad-description-text">{product.description}</p>

            {product.features?.length > 0 && (
              <>
                <h3 className="ad-sub-heading">Điểm nổi bật</h3>
                <ul className="ad-feature-list">
                  {product.features.map((f, i) => (
                    <li key={i}>
                      <FaCheckCircle className="ad-feature-icon" /> {f}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>

          <div className="ad-description-side">
            <h3 className="ad-sub-heading">Thông số kỹ thuật</h3>
            <table className="ad-specs-table">
              <tbody>
                {product.specs?.map((s, i) => (
                  <tr key={i}>
                    <td>{s.k}</td>
                    <td>{s.v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="review">
        {product?.id && (
          <ProductReviews productId={product.id} collectionName="appliances" />
        )}
      </div>

      {relatedProducts.length > 0 && (
        <section className="ad-related-section">
          <div className="ad-related-inner">
            <h2 className="ad-section-heading">Sản Phẩm Tương Tự</h2>
            <div className="ad-related-grid">
              {relatedProducts.map((item) => (
                <Link
                  to={`/appliance/${item.id}`}
                  className="ad-related-card"
                  key={item.id}
                >
                  <div className="ad-related-img">
                    <img
                      src={getImageUrl(item.image)}
                      alt={item.name}
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = getImageUrl(undefined);
                      }}
                    />
                  </div>
                  <div className="ad-related-body">
                    <h4>{item.name}</h4>
                    <span className="ad-related-price">
                      {item.price.toLocaleString("vi-VN")}đ
                    </span>
                  </div>
                </Link>
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

      <Sevicer />
      <Footer />
    </div>
  );
};

export default ProductManaCategory;
