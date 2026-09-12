import { useNavigate } from "react-router-dom";
import "./EventList.css";
import ComponentCard from "../ProductCard/ComponentCard";

const TABS = [
  { label: "CARD ĐỒ HỌA", category: "vga" },
  { label: "CPU - BỘ XỬ LÝ", category: "cpu" },
  { label: "MAINBOARD", category: "mainboard" },
  { label: "Ổ CỨNG HDD", category: "hdd" },
  { label: "PSU - NGUỒN", category: "psu" },
  { label: "RAM - BỘ NHỚ TRONG", category: "ram" },
];

const EventList = ({ eventList }) => {
  const navigate = useNavigate();

  return (
    <section className="event-list">
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
            // Đảm bảo ComponentCard của bạn nhận sự kiện click hoặc chứa Link
            <div
              key={item.id}
              onClick={() => navigate(`/component-category/${item.id}`)}
              style={{ cursor: "pointer" }}
            >
              <ComponentCard product={item} />
            </div>
          ))
        ) : (
          <p>Đang tải danh sách linh kiện...</p>
        )}
      </div>
    </section>
  );
};

export default EventList;
