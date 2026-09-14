import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import Home from "./pages/Home";
import ProductDetail from "./pages/ProductDetail";
import "nprogress/nprogress.css";
import LoadingBar from "./components/NProgress/LoadingBar";
import ProductPage from "./pages/ProductPages/ProductPage";
import LaptopPage from "./pages/LaptopPages/LaptopPage";
import ComponentPage from "./pages/ComponentPages/ComponentPage";
import ProductMenu from "./pages/ProductMenu";
import Login from "./components/LogUserPage/Login";
import Admin from "./components/AdminDashboash/Admin";
import ProductManager from "./components/AdminDashboash/ProductManager";
import Register from "./components/LogUserPage/Register";
import Profile from "./components/AdminDashboash/Profile";
import UserManager from "./components/AdminDashboash/UserManager";
import { Toaster } from "sonner";
import UserOrders from "./components/AdminDashboash/UserOrders";
import Checkout from "./components/AdminDashboash/Checkout";
import AdminOrders from "./components/AdminDashboash/AdminOrders";
import Cart from "./pages/CartUser/Cart";
import Statistics from "./components/AdminDashboash/Statistics";
import EditProfile from "./components/AdminDashboash/EditProfile";
import News from "./components/Sidebar/News";
import NewsDetail from "./components/Sidebar/NewsDetail";
import CategoryPage from "./components/Catenogy/CategoryPage";
import LaptopMenu from "./components/Newlaptop/LaptopMenu";
import EventListPage from "./components/Events/EventListPage";
import SearchResults from "./pages/SearchResults/SearchResults";
import FlashSalePage from "./components/Sidebar/FlashSalePage";
import VoucherWallet from "./components/Sidebar/VoucherWallet";
import AdminServiceRequests from "./components/AdminDashboash/AdminServiceRequests";
import ProDemo from "./components/Sidebar/Prodemo";
import ChatBot from "./Chat_bot/ChatBot";
import ProductMangaNew from "./components/Sidebar/ProductMangaNew";
import ProductManaCategory from "./components/Sidebar/ProductManaCategory";
import ReviewManager from "./components/AdminDashboash/ReviewManager";
import FlashSaleManager from "./components/AdminDashboash/FlashSaleManager";
import WishlistFloatingWidget from "./components/Wishlist/WishlistFloatingWidget";
import Wishlist from "./components/Wishlist/Wishlist";
import VoucherManager from "./components/AdminDashboash/VoucherManager";
import ContactPage from "./components/AdminDashboash/ContactPage";
import BackToTop from "./components/BackToTop/BackToTop";
import PaymentResult from "./pages/PaymentResult";

// BẢO VỆ ROUTE ADMIN
const AdminProtectedRoute = ({ children }) => {
  const currentUser = JSON.parse(localStorage.getItem("currentUser"));

  // Nếu chưa đăng nhập HOẶC đăng nhập rồi nhưng không phải admin -> Đá thẳng về trang login
  if (!currentUser || currentUser.role !== "admin") {
    return <Navigate to="/login" replace />;
  }

  return children;
};

// CÁC WIDGET NỔI BÁN HÀNG: CHỈ HIỆN Ở TRANG NGƯỜI DÙNG, ẨN HOÀN TOÀN TRONG ADMIN
const CustomerFloatingWidgets = () => {
  const location = useLocation();
  if (location.pathname.startsWith("/admin")) {
    return null;
  }
  return (
    <>
      <WishlistFloatingWidget />
      <ChatBot />
      <BackToTop />
    </>
  );
};

function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" richColors closeButton />
      <LoadingBar />
      <Routes>
        {/* ================= USER ROUTES ================= */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/Profile" element={<Profile />} />
        <Route path="/edit" element={<EditProfile />} />

        {/* Tuyến đường sản phẩm chi tiết */}
        <Route path="/search" element={<SearchResults />} />
        <Route path="/laptop/:category" element={<LaptopMenu />} />
        <Route path="/component/:category" element={<EventListPage />} />
        <Route path="/category/:category" element={<CategoryPage />} />
        <Route path="/news/:id" element={<NewsDetail />} />
        <Route path="/news" element={<News />} />
        <Route path="/product/:id" element={<ProductDetail />} />
        <Route path="/page/:id" element={<ProductPage />} />
        <Route path="/menu/:id" element={<ProductMenu />} />
        <Route path="/laptop-detail/:id" element={<LaptopPage />} />
        <Route path="/component-category/:id" element={<ComponentPage />} />
        <Route path="/san-sale" element={<FlashSalePage />} />
        <Route path="/proDemo" element={<ProDemo />} />
        <Route path="/product-manga-new" element={<ProductMangaNew />} />
        <Route path="/appliance/:id" element={<ProductManaCategory />} />
        <Route path="/tri-an-khach-hang" element={<VoucherWallet />} />
        <Route path="/lien-he" element={<ContactPage />} />

        {/* Giỏ hàng & Thanh toán */}
        <Route path="/cart" element={<Cart />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/payment-result" element={<PaymentResult />} />
        <Route path="/orders" element={<UserOrders />} />
        <Route path="/wishlist" element={<Wishlist />} />

        {/* ================= ADMIN ROUTES (BẢO MẬT) ================= */}
        <Route
          path="/admin"
          element={
            <AdminProtectedRoute>
              <Admin />
            </AdminProtectedRoute>
          }
        >
          <Route index element={<Navigate to="products" replace />} />
          <Route path="products" element={<ProductManager />} />
          <Route path="orders" element={<AdminOrders />} />
          <Route path="users" element={<UserManager />} />
          <Route path="statistics" element={<Statistics />} />
          <Route path="reviews" element={<ReviewManager />} />
          <Route path="vouchers" element={<VoucherManager />} />
          <Route path="flash-sale" element={<FlashSaleManager />} />
          <Route path="service-requests" element={<AdminServiceRequests />} />
        </Route>
      </Routes>
      <CustomerFloatingWidgets />
    </BrowserRouter>
  );
}

export default App;
