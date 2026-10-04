import "./ShowroomSystem.css";
import { FaMapSigns, FaCameraRetro } from "react-icons/fa";

const locations = [
  {
    id: 1,
    title: "Showroom 1 - Hà Nội",
    address: "123 Thái Hà, P. Trung Liệt, Đống Đa, Hà Nội",
    oldAddress: "Khu vực trung tâm công nghệ Hà Nội",
    phone: "1900 8888 (Nhánh 1)",
    openHours: "8h00 - 21h30",
  },
  {
    id: 2,
    title: "Showroom 2 - TP. Hồ Chí Minh",
    address: "456 Lê Hồng Phong, Phường 1, Quận 10, TP.HCM",
    oldAddress: "Trục đường linh kiện & máy tính TP.HCM",
    phone: "1900 8888 (Nhánh 2)",
    openHours: "8h00 - 21h30",
  },
  {
    id: 3,
    title: "Showroom 3 - Đà Nẵng",
    address: "78 Nguyễn Văn Linh, P. Nam Dương, Hải Châu, Đà Nẵng",
    oldAddress: "Trung tâm mua sắm công nghệ miền Trung",
    phone: "1900 8888 (Nhánh 3)",
    openHours: "8h00 - 21h30",
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
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(loc.name + " " + loc.address)}`}
                target="_blank"
                rel="noreferrer"
                className="cs-row cs-link"
              >
                <FaMapSigns />
                Chỉ đường trên Google Maps
              </a>
              <a
                href={`https://www.google.com/search?tbm=isch&q=${encodeURIComponent("Showroom HCore Store " + loc.city)}`}
                target="_blank"
                rel="noreferrer"
                className="cs-row cs-link"
              >
                <FaCameraRetro />
                Hình ảnh thực tế Showroom
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
