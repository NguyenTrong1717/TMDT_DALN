import { useNavigate } from "react-router-dom";
import "./EventList.css";
import ComponentCard from "../ProductCard/ComponentCard";

const TABS = [
  { label: "CARD ĐỒ HỌA", category: "vga" },
  { label: "CPU - BỘ XỬ LÝ", category: "cpu" },
  { label: "MAINBOARD", category: "mainboard" },
  { label: "Ổ CỨNG HDD/SSD", category: "hdd" },
  { label: "PSU - NGUỒN", category: "psu" },
  { label: "RAM BỘ NHỚ", category: "ram" },
];

const EventList = ({ eventList }) => {
  const navigate = useNavigate();

  return (
    <section className="event-list">
      <div className="event-section-header">
        <div className="event-header-left">
          <h2 className="event-section-title">LINH KIỆN MÁY TÍNH & BUILD PC</h2>
          <span className="event-sub-tag">🔥 100% Chính hãng — Bảo hành 36 tháng 1 đổi 1</span>
        </div>
        <button
          className="event-see-all-btn"
          onClick={() => navigate("/component/vga")}
        >
          Xem tất cả ({eventList?.length || 0}) &rsaquo;
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

      <div className="component-grid-layout">
        {eventList && eventList.length > 0 ? (
          eventList.map((item) => (
            <ComponentCard key={item.id} product={item} />
          ))
        ) : (
          <p>Đang tải danh sách linh kiện...</p>
        )}
      </div>
    </section>
  );
};

export default EventList;
