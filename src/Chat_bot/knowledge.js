/**
 * =========================================================
 * TẦNG 1: KNOWLEDGE LAYER (KHO TRI THỨC CỬA HÀNG)
 * File: src/Chat_bot/knowledge.js
 * Nhiệm vụ: Chứa toàn bộ thông tin tĩnh và động của HCore Store
 * =========================================================
 */

export const STORE_POLICIES = [
  {
    topic: "bao_hanh",
    keywords: ["bảo hành", "bao hanh", "warranty", "lỗi", "sửa chữa"],
    content:
      "Chính sách bảo hành tại HCore Store: 100% hàng chính hãng, bảo hành từ 12 - 36 tháng theo hãng. Hỗ trợ 1 đổi 1 trong 30 ngày đầu nếu lỗi phần cứng từ nhà sản xuất. Có hỗ trợ bảo hành tận nơi nội thành.",
  },
  {
    topic: "giao_hang",
    keywords: ["giao hàng", "ship", "vận chuyển", "bao lâu", "phi ship", "phí ship"],
    content:
      "Chính sách vận chuyển: Giao hỏa tốc 2 giờ tại nội thành. Miễn phí vận chuyển toàn quốc cho đơn hàng từ 1.000.000đ. Đơn liên tỉnh nhận hàng sau 2 - 4 ngày, đóng gói chuyên dụng chống va đập 3 lớp.",
  },
  {
    topic: "tra_gop",
    keywords: ["trả góp", "tra gop", "installment", "thẻ tín dụng", "cccd"],
    content:
      "Chính sách trả góp: Hỗ trợ trả góp 0% qua thẻ tín dụng hoặc CCCD gắn chip (duyệt hồ sơ online chỉ trong 5 phút). Trả trước chỉ từ 10% giá trị đơn hàng.",
  },
  {
    topic: "khuyen_mai",
    keywords: ["khuyến mãi", "khuyen mai", "voucher", "mã giảm giá", "sale", "quà tặng"],
    content:
      "Khuyến mãi hiện tại: Giảm ngay 500.000đ cho đơn build PC hoặc Laptop từ 15 triệu (Mã: HCORE500K). Chương trình Thu cũ đổi mới trợ giá lên đến 2.000.000đ và Flash Sale giảm giá mỗi ngày.",
  },
  {
    topic: "showroom",
    keywords: ["địa chỉ", "dia chi", "ở đâu", "o dau", "showroom", "cửa hàng", "hotline", "số điện thoại"],
    content:
      "Thông tin liên hệ HCore Store: Showroom mở cửa từ 8:00 - 21:30 hàng ngày. Hotline tư vấn & hỗ trợ kỹ thuật: 1900 8888. Khách hàng có thể đến trải nghiệm trực tiếp máy tại showroom.",
  },
];

/**
 * Tải danh mục sản phẩm thực tế từ backend json-server
 */
export const fetchStoreCatalog = async (apiUrl = "http://localhost:3000") => {
  try {
    const [pcRes, laptopRes, eventRes, productsRes] = await Promise.all([
      fetch(`${apiUrl}/catenogies`).then((r) => (r.ok ? r.json() : [])),
      fetch(`${apiUrl}/LaptopUser`).then((r) => (r.ok ? r.json() : [])),
      fetch(`${apiUrl}/eventList`).then((r) => (r.ok ? r.json() : [])),
      fetch(`${apiUrl}/products`).then((r) => (r.ok ? r.json() : [])),
    ]);

    const catalog = [
      ...pcRes.map((p) => ({
        id: p.id,
        name: p.name,
        price: Number(p.price) || 0,
        type: "PC Gaming / Đồ họa",
        category: "pc",
        discount: p.discount,
      })),
      ...laptopRes.map((l) => ({
        id: l.id,
        name: l.name,
        price: Number(l.price) || 0,
        type: "Laptop",
        category: "laptop",
        discount: l.discount,
      })),
      ...eventRes.map((e) => ({
        id: e.id,
        name: e.name,
        price: Number(e.price) || 0,
        type: "Linh kiện",
        category: "component",
        discount: e.discount,
      })),
      ...productsRes.map((pr) => ({
        id: pr.id,
        name: pr.name,
        price: Number(pr.price) || 0,
        type: "Thiết bị",
        category: "general",
        discount: pr.discount,
      })),
    ];

    return catalog;
  } catch (err) {
    console.warn("Không thể tải danh mục sản phẩm từ backend:", err.message);
    return [];
  }
};
