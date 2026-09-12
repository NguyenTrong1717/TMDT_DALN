import { FaTimes } from "react-icons/fa";

const SpecsModal = ({ isOpen, onClose, product }) => {
  if (!isOpen) return null;

  // Hàm tự động bóc tách linh kiện từ tên sản phẩm (product.name)
  const parseSpecifications = (name) => {
    if (!name) return [];

    // Tạo các biểu thức Regex để bắt từ khóa
    const mainRegex = /(B660M|H510|Z690|B560|B660)/i;
    const cpuRegex =
      /(I5\s\d{5}[F|K]?|I7\s\d{5}[F|K]?|G6405|AMD\sRyzen\s\d[^\s]*)/i;
    const ramRegex = /(RAM\s\d+G(B)?|\s\d+G\sDDR\d?|\s\d+GB)/i;
    const ssdRegex = /(SSD\s\d+G(B)?\s?NVME|SSD\s\d+G(B)?)/i;
    const vgaRegex = /(VGA\s[^\)]*|GTX\d+[\s\w]*|RTX\d+[\s\w]*)/i;

    // Tìm kiếm vị trí khớp trong tên
    const mainMatch = name.match(mainRegex);
    const cpuMatch = name.match(cpuRegex);
    const ramMatch = name.match(ramRegex);
    const ssdMatch = name.match(ssdRegex);
    const vgaMatch = name.match(vgaRegex);

    // Trả về mảng danh sách linh kiện tương ứng
    return [
      {
        k: "MAIN",
        v: mainMatch ? mainMatch[0].toUpperCase() : "Theo cấu hình máy",
        w: "36TH",
      },
      {
        k: "CPU",
        v: cpuMatch ? cpuMatch[0].toUpperCase() : "Theo cấu hình máy",
        w: "36TH",
      },
      {
        k: "RAM",
        v: ramMatch
          ? ramMatch[0].toUpperCase().replace("RAM ", "")
          : "16GB DDR4 Bus 3200",
        w: "36TH",
      },
      {
        k: "SSD",
        v: ssdMatch ? ssdMatch[0].toUpperCase() : "256GB NVMe Siêu Tốc",
        w: "36TH",
      },
      {
        k: "VGA",
        v: vgaMatch
          ? vgaMatch[0].toUpperCase().replace("VGA ", "")
          : "Đồ Họa Tích Hợp",
        w: "36TH",
      },
      {
        k: "CASE",
        v: "Xigmatek / MSI Premium Gaming Case",
        w: "12TH",
      },
      {
        k: "FAN",
        v: "Hệ thống 4 Fan Led RGB",
        w: "12TH",
      },
    ];
  };

  // Khởi chạy hàm phân tích dữ liệu dựa theo tên sản phẩm hiện tại
  const specsList = parseSpecifications(product?.name);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="specs-modal-container"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Nút đóng X */}
        <button className="modal-close-btn white-close-btn" onClick={onClose}>
          <FaTimes />
        </button>

        {/* Tiêu đề tự động cập nhật theo sản phẩm đang xem */}
        <div className="specs-modal-header">
          <h2>Thông số kỹ thuật chi tiết</h2>
        </div>

        {/* Nội dung bảng thông số tự động thay đổi linh hoạt */}
        <div className="specs-modal-body">
          <table className="specs-popup-table">
            <thead>
              <tr>
                <th>LINH KIỆN</th>
                <th>SẢN PHẨM REAL-TIME</th>
                <th>BẢO HÀNH</th>
              </tr>
            </thead>
            <tbody>
              {specsList.map((spec, index) => (
                <tr key={index}>
                  <td>
                    <strong>{spec.k}</strong>
                  </td>
                  <td
                    className={
                      spec.k === "MAIN" || spec.k === "RAM"
                        ? "blue-text-link"
                        : ""
                    }
                  >
                    {spec.v}
                  </td>
                  <td>{spec.w}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SpecsModal;
