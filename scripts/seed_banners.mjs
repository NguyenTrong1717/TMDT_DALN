/**
 * SEED BANNERS SCRIPT
 * Nạp dữ liệu quảng cáo mẫu chuẩn phong cách bán lẻ công nghệ (CellphoneS / Hoàng Hà)
 * Phục vụ 5 placement: hero_main, hero_side, promo_tiles, strip_wide, category_promo
 */
import { MongoClient } from "mongodb";

process.loadEnvFile?.();

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017";
const DB_NAME = process.env.DB_NAME || "tmdt_daln";

const SAMPLE_BANNERS = [
  // 1. HERO MAIN CAROUSEL (3 slides công nghệ cao cấp tỉ lệ 16:9 chuẩn độ phân giải cao)
  {
    id: "banner-hm-01",
    title: "PC Gaming HCore Master RTX 4070 Super",
    subtitle: "Chiến mượt 144+ FPS mọi tựa game AAA • Tặng gói bảo hành 24 tháng",
    image: "/images/CN.jpg",
    imageMobile: "/images/CN.jpg",
    link: "/category/top-cuc-khung",
    placement: "hero_main",
    category: "",
    order: 1,
    active: true,
    startAt: null,
    endAt: null,
    deleted: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "banner-hm-02",
    title: "Đại Tiệc Màn Hình & Laptop Đồ Họa 2026",
    subtitle: "Tần số quét 180Hz • Chuẩn màu DCI-P3 99% • Trợ giá học sinh sinh viên đến 3 triệu",
    image: "/images/MT.jpg",
    imageMobile: "/images/MT.jpg",
    link: "/laptop/laptop-gaming",
    placement: "hero_main",
    category: "",
    order: 2,
    active: true,
    startAt: null,
    endAt: null,
    deleted: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "banner-hm-03",
    title: "Tuần Lễ Intel & Asus - Bùng Nổ Ưu Đãi",
    subtitle: "Giảm ngay 1.000.000đ cho đơn máy tính từ 20 triệu • Quà tặng độc quyền",
    image: "/images/AN01.jpg",
    imageMobile: "/images/AN01.jpg",
    link: "/category/top-ban-chay",
    placement: "hero_main",
    category: "",
    order: 3,
    active: true,
    startAt: null,
    endAt: null,
    deleted: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },

  // 2. HERO SIDE (3 banner nhỏ xếp dọc bên phải - ảnh tỉ lệ ngang sắc nét)
  {
    id: "banner-hs-01",
    title: "Card Đồ Họa RTX 40",
    subtitle: "Xả kho giá sốc tới 2.5Tr",
    image: "/images/gpu.png",
    imageMobile: "",
    link: "/component/vga",
    placement: "hero_side",
    category: "",
    order: 1,
    active: true,
    startAt: null,
    endAt: null,
    deleted: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "banner-hs-02",
    title: "Phụ Kiện Gear Gaming",
    subtitle: "Bàn phím cơ & Chuột giảm 40%",
    image: "/images/TN90.jpg",
    imageMobile: "",
    link: "/category/top-ban-chay",
    placement: "hero_side",
    category: "",
    order: 2,
    active: true,
    startAt: null,
    endAt: null,
    deleted: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "banner-hs-03",
    title: "Smartwatch & Âm Thanh",
    subtitle: "Âm thanh vòm • Pin 7 ngày",
    image: "/images/DH.jpg",
    imageMobile: "",
    link: "/category/top-ban-chay",
    placement: "hero_side",
    category: "",
    order: 3,
    active: true,
    startAt: null,
    endAt: null,
    deleted: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },

  // 3. PROMO TILES (Hàng 6 ô lối tắt khuyến mãi sạch đẹp)
  {
    id: "banner-pt-01",
    title: "Deal sốc đến 50%",
    subtitle: "Giờ vàng giá sốc",
    image: "FaBolt",
    imageMobile: "",
    link: "/san-sale",
    placement: "promo_tiles",
    category: "",
    order: 1,
    active: true,
    startAt: null,
    endAt: null,
    deleted: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "banner-pt-02",
    title: "Thu cũ đổi mới",
    subtitle: "Trợ giá đến 3 triệu",
    image: "FaSyncAlt",
    imageMobile: "",
    link: "/thu-cu-doi-moi",
    placement: "promo_tiles",
    category: "",
    order: 2,
    active: true,
    startAt: null,
    endAt: null,
    deleted: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "banner-pt-03",
    title: "Trả góp 0%",
    subtitle: "Xét duyệt 3 phút",
    image: "FaCreditCard",
    imageMobile: "",
    link: "/tra-gop",
    placement: "promo_tiles",
    category: "",
    order: 3,
    active: true,
    startAt: null,
    endAt: null,
    deleted: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "banner-pt-04",
    title: "Ưu đãi sinh viên",
    subtitle: "Giảm thêm 500K",
    image: "FaGraduationCap",
    imageMobile: "",
    link: "/uu-dai-sinh-vien",
    placement: "promo_tiles",
    category: "",
    order: 4,
    active: true,
    startAt: null,
    endAt: null,
    deleted: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "banner-pt-05",
    title: "Kho Voucher",
    subtitle: "Lưu mã giảm ngay",
    image: "FaTicketAlt",
    imageMobile: "",
    link: "/tri-an-khach-hang",
    placement: "promo_tiles",
    category: "",
    order: 5,
    active: true,
    startAt: null,
    endAt: null,
    deleted: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "banner-pt-06",
    title: "Khách hàng DN",
    subtitle: "Chiết khấu độc quyền",
    image: "FaBriefcase",
    imageMobile: "",
    link: "/doanh-nghiep",
    placement: "promo_tiles",
    category: "",
    order: 6,
    active: true,
    startAt: null,
    endAt: null,
    deleted: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },

  // 4. STRIP WIDE (Banner dải ngang tỉ lệ ~6:1 chèn giữa các section)
  {
    id: "banner-sw-01",
    title: "Tuần Lễ Intel & Asus - Bùng Nổ Ưu Đãi Công Nghệ",
    subtitle: "Nhập mã INTEL2026 giảm ngay 1.000.000đ cho đơn máy tính từ 20 triệu",
    image: "/images/AN01.jpg",
    imageMobile: "/images/AN01.jpg",
    link: "/category/top-ban-chay",
    placement: "strip_wide",
    category: "",
    order: 1,
    active: true,
    startAt: null,
    endAt: null,
    deleted: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },

  // 5. CATEGORY PROMO (Banner dọc đứng bên trái danh mục sản phẩm)
  {
    id: "banner-cp-laptop",
    title: "Laptop Mỏng Nhẹ & Gaming AI",
    subtitle: "Tản nhiệt buồng hơi • Pin trâu 12H",
    image: "/images/lap01.png",
    imageMobile: "",
    link: "/laptop/laptop-gaming",
    placement: "category_promo",
    category: "laptop",
    order: 1,
    active: true,
    startAt: null,
    endAt: null,
    deleted: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "banner-cp-pc",
    title: "PC Gaming & Workstation Cực Mạnh",
    subtitle: "Bảo hành 24 tháng đổi mới tận nơi",
    image: "/images/pc12.webp",
    imageMobile: "",
    link: "/category/top-cuc-khung",
    placement: "category_promo",
    category: "pc",
    order: 1,
    active: true,
    startAt: null,
    endAt: null,
    deleted: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "banner-cp-component",
    title: "Linh Kiện Chính Hãng 100%",
    subtitle: "Tự ráp cấu hình PC giá xuất xưởng",
    image: "/images/TB07.png",
    imageMobile: "",
    link: "/component/vga",
    placement: "category_promo",
    category: "component",
    order: 1,
    active: true,
    startAt: null,
    endAt: null,
    deleted: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },

  // 6. SKYSCRAPER BANNERS (2 mép ngoài màn hình chuẩn CellphoneS)
  {
    id: "banner-sky-left",
    title: "Laptop AI - Giảm thêm đến 2 Triệu",
    subtitle: "Trợ giá lên đời • Trả góp 0%",
    image: "/images/banner_sky_laptop.png",
    imageMobile: "",
    link: "/laptop/laptop-gaming",
    placement: "skyscraper_left",
    category: "",
    order: 1,
    active: true,
    startAt: null,
    endAt: null,
    deleted: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "banner-sky-right",
    title: "Laptop AI - Giảm thêm đến 2 Triệu",
    subtitle: "Trợ giá lên đời • Trả góp 0%",
    image: "/images/banner_sky_laptop.png",
    imageMobile: "",
    link: "/laptop/laptop-gaming",
    placement: "skyscraper_right",
    category: "",
    order: 1,
    active: true,
    startAt: null,
    endAt: null,
    deleted: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

async function seedBanners() {
  const client = new MongoClient(MONGO_URI);
  try {
    await client.connect();
    const db = client.db(DB_NAME);
    const col = db.collection("banners");

    console.log(`🔌 Kết nối MongoDB thành công: ${DB_NAME}`);
    
    // Xóa dữ liệu cũ nếu có
    await col.deleteMany({});
    
    // Thêm danh sách mẫu
    const res = await col.insertMany(SAMPLE_BANNERS);
    console.log(`🎉 Đã nạp thành công ${res.insertedCount} banner vào MongoDB!`);

    // Tạo index phục vụ query hiệu năng cao
    await col.createIndex({ placement: 1, active: 1, deleted: 1, order: 1 });
    await col.createIndex({ id: 1 }, { unique: true });
    console.log("⚡ Đã tạo index tối ưu hóa truy vấn placement, active, order.");
  } catch (err) {
    console.error("❌ Lỗi seed banners:", err);
  } finally {
    await client.close();
  }
}

seedBanners();
