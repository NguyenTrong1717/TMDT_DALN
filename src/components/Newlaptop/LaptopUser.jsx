import { useState, useMemo } from "react";
import "./LaptopUser.css";
import LaptopCard from "../ProductCard/LaptopCard";
import { useNavigate } from "react-router-dom";

const DEMAND_TILES = [
  { label: "Văn phòng", category: "laptop-cu", image: "/images/LT1.png" },
  { label: "Gaming", category: "laptop-gaming", image: "/images/Game.jpg" },
  { label: "Mỏng nhẹ", category: "laptop-moi", image: "/images/LT5.jpg" },
  { label: "Đồ họa - kỹ thuật", category: "laptop-do-hoa", image: "/images/DH.jpg" },
  { label: "Sinh viên", category: "laptop-gia-uu-dai", image: "/images/LT3.jpg" },
  { label: "Cao cấp", category: "laptop-cu", image: "/images/LT11.png" },
];

const LaptopUser = ({ laptopData }) => {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState("all");

  const filteredLaptops = useMemo(() => {
    if (!laptopData || laptopData.length === 0) return [];
    if (selectedCategory === "all") return laptopData;
    const matched = laptopData.filter((item) => item.category === selectedCategory);
    return matched.length > 0 ? matched : laptopData;
  }, [laptopData, selectedCategory]);

  return (
    <section className="laptop-menus">
      {/* Section Header */}
      <div className="laptop-section-header">
        <div className="laptop-header-left">
          <h2 className="laptop-section-title">HỆ THỐNG LAPTOP CHÍNH HÃNG & GAMING</h2>
          <span className="laptop-sub-tag">⚡ Trả góp 0% duyệt 5 phút — Tặng combo Balo + Chuột gaming</span>
        </div>
        <button
          className="laptop-see-all-btn"
          onClick={() => navigate(`/laptop/${selectedCategory === "all" ? "laptop-gaming" : selectedCategory}`)}
        >
          Xem tất cả ({filteredLaptops.length}) &rsaquo;
        </button>
      </div>

      {/* Demand Tiles With Images (Chuẩn theo ảnh người dùng cung cấp) */}
      <div className="laptop-demand-tiles-wrap">
        <div className="demand-tiles-grid">
          {DEMAND_TILES.map((tile) => (
            <button
              key={tile.label}
              className={`demand-tile-btn ${selectedCategory === tile.category ? "active" : ""}`}
              onClick={() => {
                if (selectedCategory === tile.category) {
                  navigate(`/laptop/${tile.category}`);
                } else {
                  setSelectedCategory(tile.category);
                }
              }}
            >
              <img src={tile.image} alt={tile.label} className="demand-tile-img" />
              <span>{tile.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 6-Layer Cards Grid */}
      <div className="laptop-grid-layouts">
        {filteredLaptops && filteredLaptops.length > 0 ? (
          filteredLaptops.map((item) => <LaptopCard key={item.id} product={item} />)
        ) : (
          <p>Đang tải danh sách laptop...</p>
        )}
      </div>
    </section>
  );
};

export default LaptopUser;
