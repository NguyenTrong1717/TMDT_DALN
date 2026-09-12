import React from "react";
import "./ShowroomSystem.css";
import { FaMapSigns, FaCameraRetro } from "react-icons/fa";

const locations = [
  {
    id: 1,
    title: "Cơ sở 1 - Hà Nội",
    address: "123 Đường Láng, Hà Nội",
    oldAddress: "ĐC cũ: 123 Láng Hạ",
    phone: "0326.807.955",
    openHours: "8h30 - 21h",
  },
  {
    id: 2,
    title: "Cơ sở 2 - Hà Nội",
    address: "45 Nguyễn Trãi, Hà Nội",
    oldAddress: "ĐC cũ: 45 Nguyễn Trãi",
    phone: "0326.807.955",
    openHours: "8h30 - 21h",
  },
  {
    id: 3,
    title: "Cơ sở 3 - TB",
    address: "Nam Quán, Hưng Yên",
    oldAddress: "ĐC cũ: Nam Quán ,Thái bình",
    phone: "0326.807.955",
    openHours: "8h30 - 21h",
  },
];

export default function ShowroomSystem() {
  return (
    <section className="showroom-section">
      <div className="showroom-container">
        <div className="showroom-title-box"></div>

        <div className="showroom-grid">
          {locations.map((loc) => (
            <div key={loc.id} className="cs-card">
              <div className="cs-header">
                <div className="cs-num">{loc.id}</div>
                <h3>{loc.title}</h3>
              </div>
              <div className="cs-row">
                <span>{loc.address}</span>
              </div>
              {loc.oldAddress && (
                <div className="cs-row">
                  <span> {loc.oldAddress}</span>
                </div>
              )}
              <p className="cs-row cs-link">
                <FaMapSigns />
                Hướng dẫn đường đi
              </p>
              <a href="#" className="cs-row cs-link">
                <FaCameraRetro />
                Hình ảnh thực tế
              </a>
              <div className="cs-row">
                <span className="cs-bold">📞 Tel/Zalo: {loc.phone}</span>
              </div>
              <div className="cs-row">
                <span> Mở cửa: {loc.openHours}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
