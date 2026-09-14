import { useState } from "react";
import "./FacetedFilterBar.css";
import { FaFilter, FaRedo, FaCheck } from "react-icons/fa";

const FILTER_GROUPS = [
  {
    id: "price",
    name: "Mức Giá",
    options: [
      { id: "p-all", label: "Tất cả mức giá", count: 185 },
      { id: "p-under-10", label: "Dưới 10 Triệu", count: 24, range: [0, 10000000] },
      { id: "p-10-15", label: "10 - 15 Triệu", count: 38, range: [10000000, 15000000] },
      { id: "p-15-25", label: "15 - 25 Triệu", count: 65, range: [15000000, 25000000] },
      { id: "p-above-25", label: "Trên 25 Triệu", count: 58, range: [25000000, 999999999] },
    ],
  },
  {
    id: "ram",
    name: "Dung Lượng RAM",
    options: [
      { id: "ram-8", label: "8GB", count: 42 },
      { id: "ram-16", label: "16GB", count: 88 },
      { id: "ram-32", label: "32GB", count: 35 },
      { id: "ram-64", label: "64GB", count: 12 },
    ],
  },
  {
    id: "storage",
    name: "Ổ Cứng / SSD",
    options: [
      { id: "ssd-256", label: "256GB SSD", count: 55 },
      { id: "ssd-512", label: "512GB NVMe", count: 92 },
      { id: "ssd-1tb", label: "1TB Gen 4", count: 45 },
      { id: "ssd-2tb", label: "2TB Pro", count: 18 },
    ],
  },
  {
    id: "vga",
    name: "Card Đồ Họa (VGA)",
    options: [
      { id: "vga-4060", label: "GeForce RTX 4060", count: 48 },
      { id: "vga-4070", label: "GeForce RTX 4070/Ti", count: 32 },
      { id: "vga-3060", label: "GeForce RTX 3060", count: 40 },
      { id: "vga-rad", label: "AMD Radeon RX", count: 25 },
    ],
  },
  {
    id: "cpu",
    name: "Vi Xử Lý (CPU)",
    options: [
      { id: "cpu-i5", label: "Intel Core i5", count: 64 },
      { id: "cpu-i7", label: "Intel Core i7/i9", count: 46 },
      { id: "cpu-ryzen", label: "AMD Ryzen 5/7/9", count: 38 },
      { id: "cpu-apple", label: "Apple M-Series", count: 20 },
    ],
  },
  {
    id: "features",
    name: "Ưu Đãi & Tính Năng",
    options: [
      { id: "f-installment", label: "Trả góp 0% duyệt 5p", count: 110 },
      { id: "f-stock", label: "Sẵn hàng giao siêu tốc 2h", count: 95 },
      { id: "f-gift", label: "Tặng combo quà 1.500.000đ", count: 82 },
      { id: "f-144hz", label: "Màn hình 144Hz - 240Hz", count: 54 },
    ],
  },
];

const FacetedFilterBar = ({ onFilterChange, totalCount = 0 }) => {
  const [selectedFilters, setSelectedFilters] = useState({});

  const handleSelectOption = (groupId, option) => {
    setSelectedFilters((prev) => {
      const current = prev[groupId];
      let updated;
      if (current === option.id) {
        // Uncheck
        const next = { ...prev };
        delete next[groupId];
        updated = next;
      } else {
        updated = { ...prev, [groupId]: option.id };
      }
      if (onFilterChange) onFilterChange(updated);
      return updated;
    });
  };

  const handleReset = () => {
    setSelectedFilters({});
    if (onFilterChange) onFilterChange({});
  };

  const activeCount = Object.keys(selectedFilters).length;

  return (
    <div className="faceted-filter-wrapper">
      <div className="faceted-filter-header">
        <div className="filter-title-group">
          <FaFilter className="filter-header-icon" />
          <span className="filter-header-title">BỘ LỌC ĐA TẦNG PHẦN CỨNG</span>
          {activeCount > 0 && (
            <span className="active-filter-badge">{activeCount} đang chọn</span>
          )}
        </div>
        <div className="filter-header-right">
          {totalCount > 0 && (
            <span className="filter-result-count">
              Tìm thấy <strong>{totalCount}</strong> sản phẩm
            </span>
          )}
          {activeCount > 0 && (
            <button type="button" className="filter-reset-btn" onClick={handleReset}>
              <FaRedo /> Xóa bộ lọc
            </button>
          )}
        </div>
      </div>

      {/* Grid of Faceted Categories */}
      <div className="faceted-groups-container">
        {FILTER_GROUPS.map((group) => (
          <div key={group.id} className="faceted-group-row">
            <span className="faceted-group-label">{group.name}:</span>
            <div className="faceted-options-chips">
              {group.options.map((opt) => {
                const isSelected = selectedFilters[group.id] === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    className={`faceted-chip ${isSelected ? "selected" : ""}`}
                    onClick={() => handleSelectOption(group.id, opt)}
                  >
                    {isSelected && <FaCheck className="chip-check-icon" />}
                    <span className="chip-text">{opt.label}</span>
                    <span className="chip-count">({opt.count})</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FacetedFilterBar;
