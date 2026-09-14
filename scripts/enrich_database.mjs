/**
 * HCORE STORE - DATA ENRICHMENT & REALISM SCRIPT
 * File: scripts/enrich_database.mjs
 * Chuẩn hóa toàn bộ dữ liệu: Chấm sao, đánh giá, số lượng tồn kho, số lượng đã bán thực tế.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.resolve(__dirname, "../db.json");

const raw = fs.readFileSync(DB_PATH, "utf8");
const db = JSON.parse(raw);

// Danh sách đánh giá mẫu chất lượng cao & chân thực
const SAMPLE_REVIEWS = [
  {
    id: "rev-001",
    productId: "1",
    collection: "products",
    productName: "Thế Giới Máy Tính - PC Gaming i5 13400F",
    userId: "1784379657593",
    userName: "Trung Hiếu",
    rating: 5,
    comment: "Máy chạy cực kỳ êm, test thử Black Myth: Wukong và CS2 mượt mà trên 140 FPS. Đóng gói cẩn thận 2 lớp mút chống sốc, nhân viên tư vấn nhiệt tình!",
    createdAt: "2026-09-10T09:30:00.000Z",
    hidden: false,
    reply: "Cảm ơn anh Hiếu đã tin tưởng HCore Store ạ! Chúc anh có những giờ phút leo rank đỉnh cao nhé!",
    repliedAt: "2026-09-10T10:15:00.000Z",
  },
  {
    id: "rev-002",
    productId: "1",
    collection: "products",
    productName: "Thế Giới Máy Tính - PC Gaming i5 13400F",
    userId: "1788963018949",
    userName: "Nguyễn Trọng",
    rating: 5,
    comment: "Giao hàng đúng hẹn, cài sẵn Windows 11 bản quyền và đầy đủ phần mềm đồ họa. Rất đáng tiền!",
    createdAt: "2026-09-11T14:20:00.000Z",
    hidden: false,
    reply: "Dạ HCore Store cảm ơn anh Trọng nhiều ạ. Cần hỗ trợ kỹ thuật thêm anh cứ nhắn hotline 1900 8888 nha!",
    repliedAt: "2026-09-11T15:00:00.000Z",
  },
  {
    id: "rev-003",
    productId: "2",
    collection: "products",
    productName: "Thế Giới Đồng Hồ Thông Minh",
    userId: "1784379657593",
    userName: "Hoàng Nam",
    rating: 4,
    comment: "Đồng hồ hiển thị sắc nét ngoài trời nắng, đo nhịp tim khá chuẩn. Pin dùng được khoảng 4 ngày, trừ 1 sao vì dây đeo cao su hơi bám mồ hôi.",
    createdAt: "2026-09-08T16:45:00.000Z",
    hidden: false,
    reply: "Cảm ơn bạn Nam đã góp ý. Shop có tặng kèm voucher giảm 30% khi mua thêm dây đeo kim loại hoặc da cao cấp nhé!",
    repliedAt: "2026-09-08T17:30:00.000Z",
  },
  {
    id: "rev-004",
    productId: "1",
    collection: "catenogies",
    productName: "PC Gaming Gigabyte Core i7 RTX 4070",
    userId: "1788963248414",
    userName: "Trần Anh Quân",
    rating: 5,
    comment: "Dàn PC build dây LED rất gọn gàng thẩm mỹ. Nhiệt độ render Blender không quá 68 độ C. Dịch vụ showroom tại Hà Đông làm việc rất chuyên nghiệp.",
    createdAt: "2026-09-09T11:10:00.000Z",
    hidden: false,
    reply: "Dạ HCore cảm ơn anh Quân ạ. Showroom luôn sẵn sàng phục vụ anh!",
    repliedAt: "2026-09-09T11:45:00.000Z",
  },
  {
    id: "rev-005",
    productId: "2",
    collection: "catenogies",
    productName: "PC Thiết Kế Đồ Họa 3D Xeon Dual CPU",
    userId: "1784379657593",
    userName: "Lê Minh Tuấn",
    rating: 5,
    comment: "Máy render Premiere và After Effects siêu tốc, không bị tràn RAM như máy cũ. Đánh giá 5 sao cho chất lượng linh kiện chính hãng.",
    createdAt: "2026-09-12T08:15:00.000Z",
    hidden: false,
    reply: null,
  },
  {
    id: "rev-006",
    productId: "1",
    collection: "LaptopUser",
    productName: "Laptop ASUS ROG Strix G16 2026",
    userId: "1788963018949",
    userName: "Phạm Quốc Bảo",
    rating: 5,
    comment: "Màn hình 240Hz màu sắc siêu đẹp, bàn phím gõ nảy. Quạt tản nhiệt khi tải nặng có hơi ồn xíu nhưng bù lại máy mát rượi. Máy đẹp xuất sắc!",
    createdAt: "2026-09-12T19:00:00.000Z",
    hidden: false,
    reply: "Chào Bảo, dòng ROG Strix G16 luôn dẫn đầu về hiệu năng gaming. Bạn có thể bật chế độ Silent trong Armoury Crate khi làm việc văn phòng nhé!",
    repliedAt: "2026-09-12T20:10:00.000Z",
  },
  {
    id: "rev-007",
    productId: "3",
    collection: "LaptopUser",
    productName: "Laptop Lenovo Legion 5 Pro RTX 4060",
    userId: "1788963248414",
    userName: "Vũ Đình Trọng",
    rating: 4,
    comment: "Build máy cứng cáp vỏ kim loại sang trọng. Củ sạc 230W hơi to và nặng nhưng sạc siêu nhanh. Mua trả góp 0% duyệt hồ sơ trong 10 phút.",
    createdAt: "2026-09-13T10:30:00.000Z",
    hidden: false,
    reply: null,
  },
  {
    id: "rev-008",
    productId: "1",
    collection: "eventList",
    productName: "Card Đồ Họa VGA MSI GeForce RTX 4060 8GB",
    userId: "1784379657593",
    userName: "Đỗ Mạnh Hùng",
    rating: 5,
    comment: "Hàng nguyên seal tem Mai Hoàng phân phối, lắp vào nhận ngay full driver. Tiêu thụ điện ít mà hiệu năng vượt trội thế hệ trước.",
    createdAt: "2026-09-07T13:40:00.000Z",
    hidden: false,
    reply: "HCore cam kết 100% linh kiện chính hãng bảo hành 36 tháng lỗi 1 đổi 1. Cảm ơn anh Hùng!",
    repliedAt: "2026-09-07T14:00:00.000Z",
  },
  {
    id: "rev-009",
    productId: "2",
    collection: "eventList",
    productName: "RAM DDR5 Corsair Vengeance RGB 32GB 6000MHz",
    userId: "1788963018949",
    userName: "Ngô Quang Huy",
    rating: 5,
    comment: "Bật XMP trong BIOS lên đúng 6000MHz chạy ổn định với Core i7 14700K. Đèn LED iCUE đồng bộ đẹp lung linh.",
    createdAt: "2026-09-13T15:20:00.000Z",
    hidden: false,
    reply: null,
  },
  {
    id: "rev-010",
    productId: "6",
    collection: "products",
    productName: "Thế Giới Tai Nghe Gaming 7.1",
    userId: "1784379657593",
    userName: "Bùi Thị Yến",
    rating: 3,
    comment: "Âm thanh nghe bước chân địch trong game rõ, mic lọc ồn tốt. Tuy nhiên đệm tai đeo lâu hơn 3 tiếng hơi bị nóng tai.",
    createdAt: "2026-09-06T18:10:00.000Z",
    hidden: false,
    reply: "Dạ HCore xin tiếp thu ý kiến của bạn Yến ạ. Mẫu này dùng đệm da cách âm tốt nên đeo lâu có thể hơi bí, shop khuyên bạn nên tháo nghỉ 5p sau mỗi trận đấu nha!",
    repliedAt: "2026-09-06T19:00:00.000Z",
  },
  {
    id: "rev-011",
    productId: "7",
    collection: "products",
    productName: "Thế Giới Loa Bluetooth Công Suất Lớn",
    userId: "1788963248414",
    userName: "Nguyễn Văn Hùng",
    rating: 5,
    comment: "Bass đánh sâu và chắc, chống nước tốt mang đi tiệc ngoài trời rất tiện. Kết nối Bluetooth nhanh không có độ trễ.",
    createdAt: "2026-09-11T21:00:00.000Z",
    hidden: false,
    reply: "Cảm ơn anh Hùng đã ủng hộ HCore Store!",
    repliedAt: "2026-09-11T21:30:00.000Z",
  },
  {
    id: "rev-012",
    productId: "1",
    collection: "appliances",
    productName: "Robot Hút Bụi Lau Nhà Thông Minh",
    userId: "1784379657593",
    userName: "Chị Thảo (Hà Đông)",
    rating: 5,
    comment: "Lực hút mạnh, tự động vẽ bản đồ phòng bằng LiDAR rất thông minh, né chướng ngại vật mượt mà. Đỡ tốn bao nhiêu thời gian dọn nhà.",
    createdAt: "2026-09-10T17:40:00.000Z",
    hidden: false,
    reply: null,
  },
];

// Cập nhật reviews vào db.json
db.reviews = SAMPLE_REVIEWS;

// Bảng các danh mục sản phẩm cần gán dữ liệu thực tế
const PRODUCT_TABLES = [
  "products",
  "catenogies",
  "LaptopUser",
  "eventList",
  "ProductPagies",
  "ProductMenus",
  "demoUnits",
  "appliances",
];

// Hàm sinh số thực tế dựa trên id và category
const getRealisticMetrics = (item, idx) => {
  const seed = (Number(item.id) || idx + 1) * 7 + 13;
  // Rating từ 4.6 đến 5.0
  const ratingOptions = [4.7, 4.8, 4.9, 5.0, 4.8, 4.9, 4.6, 5.0];
  const rating = ratingOptions[seed % ratingOptions.length];

  // Số lượt đánh giá từ 12 đến 135
  const reviewsCount = 12 + (seed % 95);

  // Số lượng tồn kho từ 5 đến 48 chiếc (có 1 vài mã ít hàng để chân thực)
  let stock = 6 + (seed % 42);
  if (idx % 9 === 0) stock = 2; // Sắp hết hàng
  if (idx === 7) stock = 18;

  // Số lượng đã bán từ 25 đến 360
  const sold = 28 + (seed % 140) * 2;

  return { rating, reviewsCount, stock, sold };
};

let enrichedProductsCount = 0;

PRODUCT_TABLES.forEach((tbl) => {
  if (Array.isArray(db[tbl])) {
    db[tbl] = db[tbl].map((product, idx) => {
      const metrics = getRealisticMetrics(product, idx);
      enrichedProductsCount++;
      return {
        ...product,
        rating: product.rating || metrics.rating,
        reviewsCount: product.reviewsCount || metrics.reviewsCount,
        stock: product.stock !== undefined ? product.stock : metrics.stock,
        sold: product.sold !== undefined ? product.sold : metrics.sold,
      };
    });
  }
});

// Đảm bảo bảng orders có ít nhất 4 đơn hàng thực tế để trang Thống kê và Admin Orders có dữ liệu sống động
if (!Array.isArray(db.orders) || db.orders.length === 0) {
  db.orders = [
    {
      id: "ord-1001",
      orderCode: "DH-20260914-102530",
      userId: "1784379657593",
      fullName: "Trung Hiếu",
      phone: "09113456789",
      email: "Hieudut@gmail.com",
      address: "182 Tôn Đức Thắng, Đống Đa, Hà Nội",
      note: "Giao trong giờ hành chính, gọi trước 15 phút",
      paymentMethod: "bank",
      status: "completed",
      totalAmount: 18990000,
      voucherCode: "VIP500K",
      discountAmount: 500000,
      createdAt: "2026-09-12T10:25:30.000Z",
      products: [
        {
          productId: "1",
          name: "Thế Giới Máy Tính - PC Gaming i5 13400F RTX 4060",
          image: "/images/MT.jpg",
          quantity: 1,
          unitPrice: 18990000,
          subtotal: 18990000,
          fromTable: "products",
        },
      ],
    },
    {
      id: "ord-1002",
      orderCode: "DH-20260913-154012",
      userId: "1788963018949",
      fullName: "Nguyễn Trọng",
      phone: "0911108133",
      email: "admin@gmail.com",
      address: "P. Nguyễn Trác, Yên Nghĩa, Hà Đông, Hà Nội",
      note: "Kiểm tra hàng cẩn thận trước khi xuất kho",
      paymentMethod: "cod",
      status: "shipping",
      totalAmount: 35990000,
      voucherCode: null,
      discountAmount: 0,
      createdAt: "2026-09-13T15:40:12.000Z",
      products: [
        {
          productId: "1",
          name: "Laptop ASUS ROG Strix G16 i9 13980HX RTX 4070",
          image: "/images/laptop1.jpg",
          quantity: 1,
          unitPrice: 35990000,
          subtotal: 35990000,
          fromTable: "LaptopUser",
        },
      ],
    },
    {
      id: "ord-1003",
      orderCode: "DH-20260914-081045",
      userId: "1788963248414",
      fullName: "Trần Anh Quân",
      phone: "0988776655",
      email: "quanta@gmail.com",
      address: "Phố Huế, Hai Bà Trưng, Hà Nội",
      note: "Thanh toán qua ví MoMo",
      paymentMethod: "momo",
      status: "confirmed",
      totalAmount: 499999,
      voucherCode: null,
      discountAmount: 0,
      createdAt: "2026-09-14T08:10:45.000Z",
      products: [
        {
          productId: "6",
          name: "Thế Giới Tai Nghe Gaming 7.1",
          image: "/images/TN90.jpg",
          quantity: 1,
          unitPrice: 499999,
          subtotal: 499999,
          fromTable: "products",
        },
      ],
    },
    {
      id: "ord-1004",
      orderCode: "DH-20260914-162010",
      userId: "1784379657593",
      fullName: "Trung Hiếu",
      phone: "09113456789",
      email: "Hieudut@gmail.com",
      address: "182 Tôn Đức Thắng, Đống Đa, Hà Nội",
      note: "Đơn mới đặt chiều nay",
      paymentMethod: "bank",
      status: "pending",
      totalAmount: 299999,
      voucherCode: null,
      discountAmount: 0,
      createdAt: "2026-09-14T16:20:10.000Z",
      products: [
        {
          productId: "7",
          name: "Thế Giới Loa Bluetooth",
          image: "/images/Loa.png",
          quantity: 1,
          unitPrice: 299999,
          subtotal: 299999,
          fromTable: "products",
        },
      ],
    },
  ];
}

fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), "utf8");
console.log(`✅ Đã chuẩn hóa ${enrichedProductsCount} sản phẩm với rating, reviewsCount, stock, sold thực tế.`);
console.log(`✅ Đã bổ sung ${db.reviews.length} đánh giá khách hàng thực tế vào bảng reviews.`);
console.log(`✅ Đã bổ sung ${db.orders.length} đơn hàng thực tế vào bảng orders.`);
