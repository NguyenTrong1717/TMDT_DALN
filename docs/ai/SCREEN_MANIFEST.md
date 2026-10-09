# HỒ SƠ DANH MỤC MÀN HÌNH & GIAO DIỆN (SCREEN MANIFEST)
*Nguồn kiểm chứng: `src/App.jsx`, `src/pages/`, `src/components/`*

---

## BẢNG DANH MỤC MÀN HÌNH AS-BUILT (36 GIAO DIỆN & WIDGETS)

| Mã Màn hình | Tuyến đường (Route) | Tên Component / File Nguồn | Phân quyền | Mục đích & Nghiệp vụ | Trạng thái Minh chứng |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **UI-01** | `/` | `Home.jsx` | Mọi người | Trang chủ hiển thị Banner, sản phẩm nổi bật, flash sale và danh mục cha. | `NEED_SCREENSHOT` (figures/ui-01-home.png) |
| **UI-02** | `/login` | `Login.jsx` | Khách vãng lai | Đăng nhập tài khoản bằng email/username và mật khẩu. | `NEED_SCREENSHOT` (figures/ui-02-login.png) |
| **UI-03** | `/register` | `Register.jsx` | Khách vãng lai | Đăng ký tài khoản người dùng mới vào hệ thống. | `NEED_SCREENSHOT` (figures/ui-03-register.png) |
| **UI-04** | `/Profile` | `Profile.jsx` | Đã đăng nhập | Xem thông tin cá nhân, số điện thoại, địa chỉ nhận hàng mặc định. | `NEED_SCREENSHOT` (figures/ui-04-profile.png) |
| **UI-05** | `/edit` | `EditProfile.jsx` | Đã đăng nhập | Chỉnh sửa cập nhật họ tên, địa chỉ, số điện thoại người dùng. | `NEED_SCREENSHOT` (figures/ui-05-edit-profile.png) |
| **UI-06** | `/search` | `SearchResults.jsx` | Mọi người | Trang kết quả tìm kiếm theo từ khóa regex `q`. | `NEED_SCREENSHOT` (figures/ui-06-search.png) |
| **UI-07** | `/laptop/:category` | `LaptopMenu.jsx` | Mọi người | Danh mục laptop theo phân khúc (Gaming, Sinh viên, Văn phòng). | `NEED_SCREENSHOT` (figures/ui-07-laptop-menu.png) |
| **UI-08** | `/component/:category`| `EventListPage.jsx` | Mọi người | Danh mục linh kiện theo nhóm sự kiện xả kho. | `NEED_SCREENSHOT` (figures/ui-08-event-list.png) |
| **UI-09** | `/category/:category` | `CategoryPage.jsx` | Mọi người | Danh mục phân loại sản phẩm cha (`catenogies`). | `NEED_SCREENSHOT` (figures/ui-09-category.png) |
| **UI-10** | `/news` | `News.jsx` | Mọi người | Danh sách tin tức công nghệ, bài viết tư vấn. | `NEED_SCREENSHOT` (figures/ui-10-news.png) |
| **UI-11** | `/news/:id` | `NewsDetail.jsx` | Mọi người | Chi tiết bài viết tin tức, nội dung và hình ảnh. | `NEED_SCREENSHOT` (figures/ui-11-news-detail.png) |
| **UI-12** | `/product/:id` | `ProductDetail.jsx` | Mọi người | Chi tiết thông số sản phẩm, giá bán, nút thêm giỏ và đánh giá reviews. | `NEED_SCREENSHOT` (figures/ui-12-product-detail.png) |
| **UI-13** | `/page/:id` | `ProductPage.jsx` | Mọi người | Trang hiển thị mở rộng sản phẩm từ bảng `ProductPagies`. | `NEED_SCREENSHOT` (figures/ui-13-product-page.png) |
| **UI-14** | `/menu/:id` | `ProductMenu.jsx` | Mọi người | Trang danh mục thực đơn sản phẩm từ `ProductMenus`. | `NEED_SCREENSHOT` (figures/ui-14-product-menu.png) |
| **UI-15** | `/laptop-detail/:id` | `LaptopPage.jsx` | Mọi người | Chi tiết laptop từ bảng chuyên biệt `LaptopUser`. | `NEED_SCREENSHOT` (figures/ui-15-laptop-detail.png) |
| **UI-16** | `/component-category/:id` | `ComponentPage.jsx` | Mọi người | Chi tiết linh kiện máy tính phần cứng. | `NEED_SCREENSHOT` (figures/ui-16-component-category.png) |
| **UI-17** | `/san-sale` | `FlashSalePage.jsx` | Mọi người | Trang sự kiện Flash Sale đếm ngược thời gian và giảm giá sốc. | `NEED_SCREENSHOT` (figures/ui-17-flash-sale.png) |
| **UI-18** | `/proDemo` | `Prodemo.jsx` | Mọi người | Trang trưng bày sản phẩm demo / hàng trải nghiệm. | `NEED_SCREENSHOT` (figures/ui-18-prodemo.png) |
| **UI-19** | `/product-manga-new` | `ProductMangaNew.jsx`| Mọi người | Trang sản phẩm mới cập nhật theo phong cách đồ họa. | `NEED_SCREENSHOT` (figures/ui-19-product-manga.png) |
| **UI-20** | `/appliance/:id` | `ProductManaCategory.jsx`| Mọi người | Danh mục thiết bị gia dụng công nghệ từ bảng `appliances`. | `NEED_SCREENSHOT` (figures/ui-20-appliances.png) |
| **UI-21** | `/tri-an-khach-hang` | `VoucherWallet.jsx` | Đã đăng nhập | Ví voucher tri ân: xem và thu thập mã giảm giá cá nhân. | `NEED_SCREENSHOT` (figures/ui-21-voucher-wallet.png) |
| **UI-22** | `/lien-he` | `ContactPage.jsx` | Mọi người | Trang thông tin liên hệ và gửi phản hồi cho cửa hàng. | `NEED_SCREENSHOT` (figures/ui-22-contact.png) |
| **UI-23** | `/cart` | `Cart.jsx` | Đã đăng nhập | Quản lý giỏ hàng: tăng giảm số lượng, xóa sản phẩm, chọn mua. | `NEED_SCREENSHOT` (figures/ui-23-cart.png) |
| **UI-24** | `/checkout` | `Checkout.jsx` | Đã đăng nhập | Nhập thông tin giao hàng, chọn COD / VNPAY / MoMo, áp voucher. | `NEED_SCREENSHOT` (figures/ui-24-checkout.png) |
| **UI-25** | `/payment-result` | `PaymentResult.jsx` | Đã đăng nhập | Hiển thị kết quả thanh toán từ VNPAY/MoMo chuyển về. | `NEED_SCREENSHOT` (figures/ui-25-payment-result.png) |
| **UI-26** | `/orders` | `UserOrders.jsx` | Đã đăng nhập | Danh sách đơn hàng cá nhân, trạng thái vận chuyển và nút thanh toán lại. | `NEED_SCREENSHOT` (figures/ui-26-user-orders.png) |
| **UI-27** | `/wishlist` | `Wishlist.jsx` | Đã đăng nhập | Danh sách sản phẩm được yêu thích và đánh dấu mua sau. | `NEED_SCREENSHOT` (figures/ui-27-wishlist.png) |
| **UI-28** | `/admin/products` | `ProductManager.jsx` | Quản trị viên | Thêm, sửa, xóa sản phẩm, quản lý tồn kho và hình ảnh. | `NEED_SCREENSHOT` (figures/ui-28-admin-products.png) |
| **UI-29** | `/admin/orders` | `AdminOrders.jsx` | Quản trị viên | Quản lý duyệt đơn hàng, thay đổi trạng thái theo FSM, hủy đơn. | `NEED_SCREENSHOT` (figures/ui-29-admin-orders.png) |
| **UI-30** | `/admin/users` | `UserManager.jsx` | Quản trị viên | Quản lý tài khoản người dùng, đổi quyền, khóa/mở khóa tài khoản. | `NEED_SCREENSHOT` (figures/ui-30-admin-users.png) |
| **UI-31** | `/admin/statistics` | `Statistics.jsx` | Quản trị viên | Biểu đồ doanh thu Recharts theo ngày/tháng, tỷ lệ thanh toán. | `NEED_SCREENSHOT` (figures/ui-31-admin-stats.png) |
| **UI-32** | `/admin/reviews` | `ReviewManager.jsx` | Quản trị viên | Kiểm duyệt và quản lý các bình luận/đánh giá sản phẩm. | `NEED_SCREENSHOT` (figures/ui-32-admin-reviews.png) |
| **UI-33** | `/admin/vouchers` | `VoucherManager.jsx` | Quản trị viên | Phát hành voucher mới, đặt giá trị chiết khấu, giới hạn thu thập. | `NEED_SCREENSHOT` (figures/ui-33-admin-vouchers.png) |
| **UI-34** | `/admin/flash-sale` | `FlashSaleManager.jsx`| Quản trị viên | Quản lý khung giờ giảm giá sốc Flash Sale. | `NEED_SCREENSHOT` (figures/ui-34-admin-flash-sale.png) |
| **UI-35** | `/admin/service-requests` | `AdminServiceRequests.jsx` | Quản trị viên | Tiếp nhận và xử lý yêu cầu bảo hành/kỹ thuật của khách hàng. | `NEED_SCREENSHOT` (figures/ui-35-admin-services.png) |
| **UI-36** | `/admin/audit-logs` | `AuditLogManager.jsx`| Quản trị viên | Nhật ký kiểm toán thao tác hệ thống, theo dõi bảo mật. | `NEED_SCREENSHOT` (figures/ui-36-admin-audit.png) |
| **Widget-1**| Toàn bộ trang Client| `ChatBot.jsx` | Mọi người | Widget AI Chatbot tư vấn ngữ nghĩa (FastAPI RAG Service :8000). | `NEED_SCREENSHOT` (figures/ui-w1-chatbot.png) |
| **Widget-2**| Toàn bộ trang Client| `WishlistFloatingWidget.jsx`| Mọi người | Widget nổi hiển thị số lượng sản phẩm yêu thích truy cập nhanh. | `NEED_SCREENSHOT` (figures/ui-w2-wishlist-widget.png) |
| **Widget-3**| Toàn bộ trang Client| `BackToTop.jsx` | Mọi người | Nút cuộn nhanh lên đầu trang nâng cao trải nghiệm người dùng. | `NEED_SCREENSHOT` (figures/ui-w3-back-to-top.png) |
