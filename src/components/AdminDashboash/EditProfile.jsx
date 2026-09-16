import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import Header from "../../components/Header/Header";
import FooterUser from "../../components/Footer/FooterUser";
import "./Profile.css";
import { apiFetch, getAccessToken, getCurrentUser, setAuthSession } from "../../utils/api";

const EditProfile = () => {
  const navigate = useNavigate();
  const [currentUser] = useState(() =>
    getCurrentUser(),
  );
  const [formData, setFormData] = useState({
    fullName: currentUser?.fullName || "",
    phone: currentUser?.phone || "",
    address: currentUser?.address || "",
    createdAt: currentUser?.createdAt || "",
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Gọi API update lên server (Giả sử bạn dùng json-server)
    try {
      const res = await apiFetch(`/api/users/me`, {
        method: "PATCH",
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        const updatedUser = await res.json();
        setAuthSession({ token: getAccessToken(), user: updatedUser });
        toast.success("Cập nhật thông tin thành công!");
        navigate("/profile");
      }
    } catch {
      toast.error("Lỗi cập nhật dữ liệu!");
    }
  };

  return (
    <>
      <Header />
      <div className="product-menu-page">
        <div className="container">
          <div className="product-wrapper">
            <h2>Chỉnh Sửa Thông Tin Cá Nhân</h2>
            <form onSubmit={handleSubmit} className="edit-profile-form">
              <div className="form-groups">
                <label>Họ Và Tên</label>
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) =>
                    setFormData({ ...formData, fullName: e.target.value })
                  }
                />
              </div>
              <div className="form-groups">
                <label>Số Điện Thoại</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                />
              </div>
              <div className="form-groups">
                <label>Địa Chỉ</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                />
              </div>
              <div className="form-groups">
                <label>Ngày tham gia</label>
                <input
                  type="text"
                  value={new Date(formData.createdAt).toLocaleDateString(
                    "vi-VN",
                  )}
                  disabled
                />
              </div>
              <button type="submit" className="primary-btn">
                Lưu thay đổi
              </button>
            </form>
          </div>
        </div>
      </div>
      <FooterUser />
    </>
  );
};

export default EditProfile;
