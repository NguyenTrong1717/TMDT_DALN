import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import InstallmentModal from "./InstallmentModal";
import Header from "../components/Header/Header";
import FooterUser from "../components/Footer/FooterUser";
import Sevicer from "../components/Sevicer/Sevicer";
import { FaShippingFast, FaAddressCard, FaCcApplePay } from "react-icons/fa";
import { MdCurrencyExchange } from "react-icons/md";
import { IoCall } from "react-icons/io5";
import { FaRocketchat } from "react-icons/fa6";
import { FcShipped } from "react-icons/fc";
import "./ProductMenu.css";
import ProductReviews from "./ProductReviews";
import ShowroomSystem from "./ShowroomSystem";
import WishlistButton from "../components/Wishlist/WishlistButton";

const ProductMenu = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [showInstallment, setShowInstallment] = useState(false);
  const [products, setProducts] = useState([]);
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch("http://localhost:3000/ProductMenus")
      .then((res) => res.json())
      .then((data) => {
        setProducts(data);
        const found = data.find((item) => String(item.id) === String(id));
        setProduct(found || null);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Lỗi fetch API ProductMenus:", err);
        setLoading(false);
      });
  }, [id]);

  useEffect(() => {
    document.body.style.overflow = showModal ? "hidden" : "auto";
  }, [showModal]);

  const handleAddToCart = async (redirectToCart = false) => {
    const currentUser = JSON.parse(localStorage.getItem("currentUser"));

    if (!currentUser) {
      toast.warning("Vui lòng đăng nhập để mua sản phẩm này!");
      navigate("/login");
      return;
    }

    const targetProductId = String(id);
    const targetFromTable = "ProductMenus";

    try {
      const cartRes = await fetch(
        `http://localhost:3000/cart?userId=${currentUser.id}`,
      );
      let cartItems = [];

      if (cartRes.ok) cartItems = await cartRes.json();

      if (!cartItems || cartItems.length === 0) {
        const resAll = await fetch("http://localhost:3000/cart");
        if (resAll.ok) {
          const allCart = await resAll.json();
          cartItems = allCart.filter(
            (item) => String(item.userId) === String(currentUser.id),
          );
        }
      }

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
          id: `cart-menu-${targetProductId}-${Date.now()}`,
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
      console.error("Lỗi kết nối giỏ hàng:", error);
      toast.error("Không thể xử lý giỏ hàng vào lúc này!");
    }
  };

  if (loading) {
    return (
      <>
        <Header />
        <div className="pms-state">
          <span className="pms-state__tag">// đang tải</span>
          <h2>Đang tải thông tin chi tiết sản phẩm...</h2>
        </div>
        <FooterUser />
      </>
    );
  }

  if (!product) {
    return (
      <>
        <Header />
        <div className="pms-state">
          <span className="pms-state__tag pms-state__tag--error">
            // lỗi 404
          </span>
          <h2>Sản phẩm không tồn tại hoặc đã bị gỡ bỏ!</h2>
          <Link to="/" className="pms-state__link">
            ← Quay lại trang chủ
          </Link>
        </div>
        <FooterUser />
      </>
    );
  }

  return (
    <>
      <Header />

      {/* BREADCRUMB */}
      <div className="demo-bar">
        <div className="demo-bread">
          <Link to="/">
            <span>Trang chủ</span>
          </Link>
          <Link to="/proDemo">
            <span>Đồ Gia Dụng</span>
          </Link>
          <Link>
            <span className="demo-bread-current">{product.name}</span>
          </Link>
          <WishlistButton
            productId={id}
            fromTable="ProductMenus"
            productName={product?.name}
          />
        </div>
      </div>

      {/* MAIN PAGE */}
      <div className="pms-page">
        <div className="pms-container">
          <div className="pms-layout">
            <div className="pms-content">
              {/* LEFT COLUMN */}
              <div className="pms-col pms-col--left">
                <div className="pms-img-wrap">
                  <img src={product.image} alt={product.name} />
                </div>

                <div className="pms-specs">
                  <h3>
                    <span className="pms-specs__dot" />
                    THÔNG SỐ KỸ THUẬT
                  </h3>
                  {product.specs &&
                    Object.entries(product.specs).map(([key, value]) => (
                      <div className="pms-specs__row" key={key}>
                        <span className="pms-specs__key">{key}</span>
                        <span className="pms-specs__value">{value}</span>
                      </div>
                    ))}
                </div>

                <div className="pms-support">
                  <h4>Hỗ trợ mua hàng</h4>
                  <div className="pms-support__item">
                    <span className="pms-support__icon">
                      <IoCall />
                    </span>
                    <p>
                      Tổng đài tư vấn: <strong>1900.1515</strong>
                    </p>
                  </div>
                  <div className="pms-support__item">
                    <span className="pms-support__icon">
                      <FaRocketchat />
                    </span>
                    <p>Chat trực tuyến với nhân viên hỗ trợ</p>
                  </div>
                  <div className="pms-support__item">
                    <span className="pms-support__icon">
                      <FcShipped />
                    </span>
                    <p>Giao hàng miễn phí nội thành 2h</p>
                  </div>
                  <button className="pms-support__btn">Gọi Ngay</button>
                </div>
              </div>

              {/* CENTER COLUMN */}
              <div className="pms-col pms-col--center">
                <span className="pms-eyebrow">
                  {product.brand || "Sản phẩm"} · {product.status}
                </span>
                <h1>{product.name}</h1>

                <div className="pms-meta">
                  <span className="pms-meta__tag">
                    <b>Thương hiệu</b> {product.brand}
                  </span>
                  <span className="pms-meta__tag">
                    <b>Danh mục</b> {product.category}
                  </span>
                  <span className="pms-meta__tag">
                    <b>Tình trạng</b> {product.status}
                  </span>
                </div>

                <div className="pms-price">
                  <span className="pms-price__current">
                    {product.price?.toLocaleString()}đ
                  </span>
                  <span className="pms-price__old">
                    {product.oldPrice?.toLocaleString()}đ
                  </span>
                </div>

                <div className="pms-promo">
                  <h3>Khuyến mãi đặc biệt</h3>
                  <ul>
                    {product.promotions?.map((p, i) => (
                      <li key={i}>{p}</li>
                    ))}
                  </ul>
                </div>

                <div className="pms-actions">
                  <button
                    className="pms-actions__cart"
                    onClick={() => handleAddToCart(false)}
                  >
                    THÊM VÀO GIỎ HÀNG
                  </button>

                  <div className="pms-actions__row">
                    <button
                      className="pms-actions__buy"
                      onClick={() => handleAddToCart(true)}
                    >
                      MUA NGAY
                    </button>
                    <button
                      className="pms-actions__installment"
                      onClick={() => setShowInstallment(true)}
                    >
                      TRẢ GÓP
                    </button>
                  </div>
                </div>

                <button
                  className="pms-desc-toggle"
                  onClick={() => setShowModal(true)}
                >
                  Xem chi tiết mô tả sản phẩm →
                </button>
              </div>

              {/* RIGHT COLUMN */}
              <div className="pms-col pms-col--right">
                <h3>CHÍNH SÁCH</h3>
                <div className="pms-policy__item">
                  <FaShippingFast /> Giao hàng nhanh
                </div>
                <div className="pms-policy__item">
                  <FaAddressCard /> Trả góp linh hoạt
                </div>
                <div className="pms-policy__item">
                  <FaCcApplePay /> Thanh toán bảo mật
                </div>
                <div className="pms-policy__item">
                  <MdCurrencyExchange /> Đổi trả 7 ngày nhanh chóng
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL MÔ TẢ */}
      {(showModal || showInstallment) && (
        <div className="pms-modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="pms-modal-box" onClick={(e) => e.stopPropagation()}>
            <button
              className="pms-modal__close"
              onClick={() => setShowModal(false)}
            >
              ×
            </button>
            <h2>{product.description?.title}</h2>
            {product.description?.content?.map((s, i) => (
              <div key={i} className="pms-modal__section">
                <h3>{s.heading}</h3>
                <p>{s.text}</p>
                {s.image && <img src={s.image} alt="" />}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SẢN PHẨM LIÊN QUAN */}
      <div className="review">
        {product && product.id && (
          <ProductReviews
            productId={product.id}
            collectionName="ProductMenus"
          />
        )}
      </div>
      <section className="pms-related">
        <h2>SẢN PHẨM LIÊN QUAN</h2>
        <div className="pms-related__grid">
          {products
            .filter((p) => p.id !== product.id)
            .slice(0, 5)
            .map((item) => (
              <div key={item.id} className="pms-related__card">
                <img src={item.image} alt={item.name} />
                <h4>{item.name}</h4>
                <p>{item.price?.toLocaleString()}đ</p>
                <Link to={`/menu/${item.id}`}>Xem chi tiết →</Link>
              </div>
            ))}
        </div>
      </section>

      {product && (
        <InstallmentModal
          isOpen={showInstallment}
          onClose={() => setShowInstallment(false)}
          product={product}
        />
      )}

      <Sevicer />
      <ShowroomSystem />
      <FooterUser />
    </>
  );
};

export default ProductMenu;
