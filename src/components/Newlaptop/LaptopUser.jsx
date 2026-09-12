import "./LaptopUser.css";
import LaptopCard from "../ProductCard/LaptopCard";
import { useNavigate } from "react-router-dom";

const TABS = [
  { label: "LAPTOP CŨ", category: "laptop-cu" },
  { label: "LAPTOP GAMING", category: "laptop-gaming" },
  { label: "LAPTOP MỚI", category: "laptop-moi" },
  { label: "LAPTOP ĐỒ HỌA", category: "laptop-do-hoa" },
];

const LaptopUser = ({ laptopData }) => {
  const navigate = useNavigate();

  return (
    <section className="laptop-menus">
      <div className="laptop-lists">
        <nav className="laptop-containers">
          {TABS.map((tab, index) => (
            <button
              key={index}
              className={`laptop-chars ${index === 0 ? "active" : ""}`}
              onClick={() => navigate(`/laptop/${tab.category}`)}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="laptop-grid-layouts">
        {laptopData && laptopData.length > 0 ? (
          laptopData.map((item) => <LaptopCard key={item.id} product={item} />)
        ) : (
          <p>Đang tải danh sách laptop...</p>
        )}
      </div>
    </section>
  );
};

export default LaptopUser;
