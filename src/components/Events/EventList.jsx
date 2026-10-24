import { useNavigate } from "react-router-dom";
import "./EventList.css";
import ComponentCard from "../ProductCard/ComponentCard";
import CategoryPromo from "../Banners/CategoryPromo";

const TABS = [
  { label: "CARD ĐỒ HỌA", category: "vga" },
  { label: "CPU - BỘ XỬ LÝ", category: "cpu" },
  { label: "MAINBOARD", category: "mainboard" },
  { label: "Ổ CỨNG HDD/SSD", category: "hdd" },
  { label: "PSU - NGUỒN", category: "psu" },
  { label: "RAM BỘ NHỚ", category: "ram" },
];

// Shared with Home so both views use the same offline catalog fallback.
// eslint-disable-next-line react-refresh/only-export-components
export const FALLBACK_COMPONENTS = [
  {
    id: "1",
    name: "Nguồn Gigabyte P650B 650W (80 Plus Bronze/Non Modular)",
    price: 1050000,
    oldPrice: 1400000,
    discount: 25,
    category: "psu",
    status: "Còn hàng",
    soldPercent: 62,
    stockLeft: 8,
    image: "/images/LC1.jpg",
    flashSale: true,
    rating: 4.8,
    reviewsCount: 32,
    stock: 2,
    sold: 68,
  },
  {
    id: "2",
    name: "Card đồ họa ASROCK Radeon RX 6800 Challenger Pro 16G OC (16GB GDDR6)",
    price: 8500000,
    oldPrice: 12000000,
    discount: 30,
    category: "vga",
    status: "Còn hàng",
    soldPercent: 75,
    stockLeft: 5,
    image: "/images/LC2.jpg",
    flashSale: true,
    rating: 5,
    reviewsCount: 39,
    stock: 33,
    sold: 82,
  },
  {
    id: "3",
    name: "CPU AMD Ryzen 5 7600X (4.7 GHz Boost 5.3 GHz / 6 nhân 12 luồng / 32MB Cache / AM5)",
    price: 5290000,
    oldPrice: 6500000,
    discount: 18,
    category: "cpu",
    status: "Còn hàng",
    soldPercent: 45,
    stockLeft: 12,
    image: "/images/LC3.jpg",
    flashSale: false,
    rating: 4.9,
    reviewsCount: 28,
    stock: 15,
    sold: 45,
  },
  {
    id: "4",
    name: "Bo Mạch Chủ ASUS TUF GAMING B650-PLUS WIFI (DDR5, PCIe 5.0, AM5)",
    price: 4990000,
    oldPrice: 5800000,
    discount: 14,
    category: "mainboard",
    status: "Còn hàng",
    soldPercent: 50,
    stockLeft: 10,
    image: "/images/LC4.jpg",
    flashSale: true,
    rating: 4.7,
    reviewsCount: 19,
    stock: 20,
    sold: 50,
  },
  {
    id: "5",
    name: "RAM Corsair Vengeance RGB 32GB (2x16GB) DDR5 6000MHz Black",
    price: 2890000,
    oldPrice: 3450000,
    discount: 16,
    category: "ram",
    status: "Còn hàng",
    soldPercent: 80,
    stockLeft: 4,
    image: "/images/LC5.jpg",
    flashSale: true,
    rating: 4.9,
    reviewsCount: 54,
    stock: 8,
    sold: 90,
  },
  {
    id: "6",
    name: "Ổ Cứng SSD Samsung 990 PRO 1TB PCIe Gen 4.0 x4 M.2 NVMe",
    price: 2650000,
    oldPrice: 3200000,
    discount: 17,
    category: "hdd",
    status: "Còn hàng",
    soldPercent: 88,
    stockLeft: 3,
    image: "/images/LC6.jpg",
    flashSale: true,
    rating: 5,
    reviewsCount: 77,
    stock: 12,
    sold: 110,
  },
  {
    id: "7",
    name: "Tản Nhiệt Nước Deepcool LT720 WH 360mm ARGB Trắng",
    price: 2950000,
    oldPrice: 3500000,
    discount: 15,
    category: "cooler",
    status: "Còn hàng",
    soldPercent: 60,
    stockLeft: 6,
    image: "/images/LC7.jpg",
    flashSale: false,
    rating: 4.8,
    reviewsCount: 22,
    stock: 10,
    sold: 35,
  },
  {
    id: "8",
    name: "Vỏ Case NZXT H9 Flow White (2 Mặt Kính Cường Lực Mid-Tower)",
    price: 3690000,
    oldPrice: 4200000,
    discount: 12,
    category: "case",
    status: "Còn hàng",
    soldPercent: 40,
    stockLeft: 7,
    image: "/images/LC8.jpg",
    flashSale: false,
    rating: 4.9,
    reviewsCount: 41,
    stock: 14,
    sold: 28,
  },
];

const EventList = ({ eventList }) => {
  const navigate = useNavigate();
  const displayList = eventList && eventList.length > 0 ? eventList : FALLBACK_COMPONENTS;

  return (
    <section className="event-list">
      <div className="event-section-header">
        <div className="event-header-left">
          <h2 className="event-section-title">LINH KIỆN MÁY TÍNH & BUILD PC</h2>
          <span className="event-sub-tag">100% Chính hãng — Bảo hành 36 tháng 1 đổi 1</span>
        </div>
        <button
          className="event-see-all-btn"
          onClick={() => navigate("/component/vga")}
        >
          Xem tất cả ({displayList.length}) &rsaquo;
        </button>
      </div>

      <div className="event-header">
        <nav className="event-tabs">
          {TABS.map((tab) => (
            <button
              key={tab.category}
              className="event-tab"
              onClick={() => navigate(`/component/${tab.category}`)}
              title={tab.label}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Banner Khuyến Mãi Ngang Danh Mục Linh Kiện */}
      <CategoryPromo category="component" titleFallback="Linh Kiện Máy Tính" />

      <div className="component-grid-layout">
        {displayList.map((item) => (
          <ComponentCard key={item.id} product={item} />
        ))}
      </div>
    </section>
  );
};

export default EventList;
