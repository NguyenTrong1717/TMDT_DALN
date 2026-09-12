const API_URL = "http://localhost:3000";

/**
 * Tạo 1 thông báo mới trong hệ thống.
 *
 * @param {Object} params
 * @param {string|number|null} params.userId - id user nhận thông báo.
 *   Truyền `null` để gửi thông báo broadcast (hiện cho MỌI người dùng),
 *   dùng cho voucher mới / flash sale sắp diễn ra...
 * @param {"order"|"voucher"|"flashsale"} params.type - loại thông báo, dùng để chọn icon hiển thị.
 * @param {string} params.title - tiêu đề ngắn gọn.
 * @param {string} params.message - nội dung chi tiết.
 * @param {string} [params.link] - đường dẫn điều hướng khi bấm vào thông báo.
 * @param {string} [params.image] - ảnh đại diện (ảnh sản phẩm) hiển thị trong thông báo.
 */
export const createNotification = async ({
  userId = null,
  type,
  title,
  message,
  link = "/",
  image = null,
}) => {
  try {
    await fetch(`${API_URL}/notifications`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: userId != null ? String(userId) : null,
        type,
        title,
        message,
        link,
        image,
        read: false,
        createdAt: new Date().toISOString(),
      }),
    });
    // Báo cho chuông thông báo (nếu đang mở) tự fetch lại ngay, không cần đợi vòng polling
    window.dispatchEvent(new Event("notificationsUpdated"));
  } catch (err) {
    console.error("Không thể tạo thông báo:", err);
  }
};
