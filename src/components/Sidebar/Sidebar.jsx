import { useNavigate } from "react-router-dom";
import "./Sidebar.css";
// import FlashSale from "./FlashSale";

const menu = [
  {
    title: "PC Gaming New",
    children: [
      { name: "PC gaming", id: "PC-gaming" },
      { name: "PC văn phòng", id: "PC-van-phong" },
      { name: "PC đồ họa", id: "PC-do-hoa" },
    ],
  },
  {
    title: "LapTop Gaming",
    children: [
      { name: "LapTop New", id: "LapTop-new" },
      { name: "LapTop Văn Phòng", id: "LapTop-van-phong" },
      { name: "LapTop Giá Ưu Đãi", id: "LapTop-gia-uu-dai" },
    ],
  },
  {
    title: "Linh Kiện Sản Phẩm",
    children: [
      { name: "CARD ĐỒ HỌA", id: "card-section" },
      { name: "CPU - BỘ XỬ LÝ", id: "cpu-section" },
      { name: "MAINBOARD", id: "mainboard-section" },
      { name: "Ổ CỨNG HDD", id: "ssd-section" },
      { name: "PSU - NGUỒN", id: "gpu-section" },
      { name: "RAM - BỘ NHỚ TRONG", id: "ram-section" },
    ],
  },
  {
    title: "Dịch Vụ Sản Phẩm",
    children: [
      { name: "Dịch Vụ Mọi Nơi", id: "dich-vu" },
      { name: "Chi Tiết Liên Hệ", id: "chi-tiet" },
    ],
  },
  {
    title: "Khuyến Mãi",
    children: [
      { name: "Săn Sale Mùa Hè", id: "san-sale", path: "/san-sale" },
      { name: "Khuyến Mãi Tri Ân", id: "sale", path: "/tri-an-khach-hang" },
    ],
  },
  {
    title: "Đồ Gia Dụng",
    path: "/proDemo",
  },
  {
    title: "Tin Tức Mới Nhất",
    path: "/news",
  },
];

const Sidebar = () => {
  const navigate = useNavigate();

  // Click vào menu cha (ví dụ "Tin Tức" không có children, chỉ có path)
  const handleMenuClick = (item) => {
    if (item.path) {
      navigate(item.path);
    }
  };

  // Click vào mục con: có path thì điều hướng trang mới, không thì scroll tới section
  const handleSubClick = (sub) => {
    if (sub.path) {
      navigate(sub.path);
      return;
    }
    const element = document.getElementById(sub.id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div className="nav-panel">
      <ul className="nav-panel__list">
        {menu.map((item, index) => (
          <li key={index} className="nav-panel__group">
            <div
              className="nav-panel__group-header"
              onClick={() => handleMenuClick(item)}
            >
              <span>{item.title}</span>
              {item.children && <span className="nav-panel__chevron">›</span>}
            </div>

            {item.children && (
              <div className="nav-panel__dropdown">
                {item.children.map((sub, i) => (
                  <div
                    key={i}
                    className="nav-panel__link"
                    onClick={() => handleSubClick(sub)}
                  >
                    {sub.name}
                  </div>
                ))}
              </div>
            )}
          </li>
        ))}
        {/* <FlashSale /> */}
      </ul>
    </div>
  );
};

export default Sidebar;
