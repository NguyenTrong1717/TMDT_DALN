import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import { FaHeart, FaTrash, FaShoppingCart } from "react-icons/fa";
import Header from "../Header/Header";
import FooterUser from "../Footer/FooterUser";
import "./Wishlist.css";

const API_URL = "http://localhost:3000";

const DETAIL_ROUTE_BY_TABLE = {
  catenogies: (id) => `/product/${id}`,
  ProductMenus: (id) => `/menu/${id}`,
  LaptopUser: (id) => `/laptop-detail/${id}`,
  eventList: (id) => `/component-category/${id}`,
};

const formatPrice = (price) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(price || 0);

const Wishlist = () => {
  const navigate = useNavigate();
  const currentUser = JSON.parse(localStorage.getItem("currentUser") || "null");

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchWishlist = async () => {
    if (!currentUser) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);

      let res = await fetch(`${API_URL}/wishlist?userId=${currentUser.id}`);
      let raw = res.ok ? await res.json() : [];

      if (!raw || raw.length === 0) {
        const resAll = await fetch(`${API_URL}/wishlist`);
        if (resAll.ok) {
          const all = await resAll.json();
          raw = all.filter(
            (item) => String(item.userId) === String(currentUser.id),
          );
        }
      }

      const fullItems = await Promise.all(
        raw.map(async (item) => {
          try {
            const pRes = await fetch(
              `${API_URL}/${item.fromTable}/${item.productId}`,
            );
            if (pRes.ok) {
              const productDetails = await pRes.json();
              return { ...item, product: productDetails };
            }
          } catch (err) {
            console.error("Lỗi lấy chi tiết sản phẩm yêu thích:", err);
          }
          return { ...item, product: null };
        }),
      );

      setItems(fullItems.filter((item) => item.product));
    } catch (error) {
      console.error("Lỗi tải danh sách yêu thích:", error);
      toast.error("Không thể tải danh sách yêu thích");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWishlist();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRemove = async (wishlistId) => {
    try {
      const res = await fetch(`${API_URL}/wishlist/${wishlistId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("Đã bỏ khỏi danh sách yêu thích!");
        window.dispatchEvent(new Event("wishlistUpdated"));
        setItems((prev) => prev.filter((item) => item.id !== wishlistId));
      }
    } catch (error) {
      toast.error("Không thể xoá sản phẩm yêu thích");
    }
  };

  const goToDetail = (item) => {
    const routeFn = DETAIL_ROUTE_BY_TABLE[item.fromTable];
    if (routeFn) navigate(routeFn(item.productId));
  };

  return (
    <div className="wishlist-page-wrapper">
      <Header />

      <div className="demo-bar">
        <div className="demo-bread">
          <Link to="/">
            <span>Trang chủ</span>
          </Link>
          <Link to="/proDemo">
            <span className="demo-bread-current">Sản Phẩm Mới Về</span>
          </Link>
          <Link to="/product-manga-new">
            <span className="demo-bread-current">Sản Phẩm Yêu Thích</span>
          </Link>
        </div>

        {!loading && items.length > 0 && (
          <span className="wishlist-header__count"></span>
        )}
      </div>

      <main className="wishlist-main-content">
        {!currentUser ? (
          <div className="wishlist-empty">
            <p>Vui lòng đăng nhập để xem danh sách yêu thích của bạn.</p>
            <button
              className="wishlist-empty__btn"
              onClick={() => navigate("/login")}
            >
              Đăng nhập ngay
            </button>
          </div>
        ) : loading ? (
          <div className="wishlist-loading">
            Đang tải danh sách yêu thích...
          </div>
        ) : items.length === 0 ? (
          <div className="wishlist-empty">
            <FaHeart className="wishlist-empty__icon" />
            <p>Bạn chưa lưu sản phẩm yêu thích nào.</p>
            <button
              className="wishlist-empty__btn"
              onClick={() => navigate("/")}
            >
              Khám phá sản phẩm ngay
            </button>
          </div>
        ) : (
          <div className="wishlist-grid">
            {items.map((item) => (
              <div className="wishlist-card" key={item.id}>
                <button
                  className="wishlist-card__remove"
                  onClick={() => handleRemove(item.id)}
                  title="Bỏ yêu thích"
                >
                  <FaTrash />
                </button>

                <div
                  className="wishlist-card__img"
                  onClick={() => goToDetail(item)}
                >
                  <img
                    src={
                      item.product.image ||
                      "https://placehold.co/240x180?text=HCore"
                    }
                    alt={item.product.name}
                  />
                </div>

                <div className="wishlist-card__body">
                  <h4
                    className="wishlist-card__name"
                    onClick={() => goToDetail(item)}
                  >
                    {item.product.name}
                  </h4>
                  <div className="wishlist-card__price">
                    {formatPrice(item.product.price)}
                  </div>

                  <button
                    className="wishlist-card__detail-btn"
                    onClick={() => goToDetail(item)}
                  >
                    <FaShoppingCart /> Xem chi tiết
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <FooterUser />
    </div>
  );
};

export default Wishlist;
