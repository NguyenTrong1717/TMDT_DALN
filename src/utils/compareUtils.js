// Quản lý danh sách "So sánh sản phẩm".
// Lưu trong localStorage giống cách project đang lưu currentUser/giỏ hàng,
// và bắn ra custom event "compareUpdated" để Header/CompareBar tự re-render
// (tương tự cách Cart đang dùng event "cartUpdated").

const STORAGE_KEY = "compareList";
export const MAX_COMPARE = 4;

// Nhãn hiển thị cho từng bảng dữ liệu (khớp với các bảng trong db.json)
export const TABLE_LABELS = {
  products: "Sản phẩm nổi bật",
  catenogies: "PC theo danh mục",
  LaptopUser: "Laptop",
  eventList: "Linh kiện",
  ProductPagies: "Sản phẩm đặc biệt",
  ProductMenus: "Sản phẩm mới về",
  appliances: "Đồ gia dụng",
  demoUnits: "Demo",
};

// Đường dẫn trang chi tiết tương ứng từng bảng (dùng để nút "Xem chi tiết")
export const TABLE_DETAIL_PATH = {
  products: (id) => `/page/${id}`,
  catenogies: (id) => `/product/${id}`,
  LaptopUser: (id) => `/laptop-detail/${id}`,
  eventList: (id) => `/component-category/${id}`,
  ProductPagies: (id) => `/menu/${id}`,
  ProductMenus: (id) => `/menu/${id}`,
  appliances: (id) => `/appliance/${id}`,
  demoUnits: (id) => `/proDemo`,
};

function safeParse(raw) {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function getCompareList() {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? safeParse(raw) : [];
}

function saveCompareList(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  // Cho phép các component khác (CompareBar, Header...) tự cập nhật
  window.dispatchEvent(new Event("compareUpdated"));
}

export function isInCompare(id, fromTable) {
  return getCompareList().some(
    (item) => String(item.id) === String(id) && item.fromTable === fromTable,
  );
}

/**
 * Thêm 1 sản phẩm vào danh sách so sánh.
 * Chỉ cho phép so sánh các sản phẩm CÙNG một bảng/loại (để bảng thông số
 * còn ý nghĩa - laptop so với laptop, đồ gia dụng so với đồ gia dụng...).
 */
export function addToCompare(product, fromTable) {
  if (!product?.id || !fromTable) {
    return { success: false, message: "Sản phẩm không hợp lệ!" };
  }

  const list = getCompareList();

  if (isInCompare(product.id, fromTable)) {
    return {
      success: false,
      message: "Sản phẩm đã có trong danh sách so sánh!",
    };
  }

  if (list.length > 0 && list[0].fromTable !== fromTable) {
    const label = TABLE_LABELS[list[0].fromTable] || "loại sản phẩm hiện tại";
    return {
      success: false,
      message: `Chỉ có thể so sánh các sản phẩm cùng loại (${label}). Hãy xóa danh sách so sánh hiện tại nếu muốn so sánh loại khác.`,
    };
  }

  if (list.length >= MAX_COMPARE) {
    return {
      success: false,
      message: `Chỉ có thể so sánh tối đa ${MAX_COMPARE} sản phẩm cùng lúc!`,
    };
  }

  const item = {
    id: String(product.id),
    fromTable,
    name: product.name || "",
    image: product.image || "",
    price: product.price ?? null,
  };

  saveCompareList([...list, item]);
  return { success: true, message: "Đã thêm vào danh sách so sánh!" };
}

export function removeFromCompare(id, fromTable) {
  const list = getCompareList().filter(
    (item) => !(String(item.id) === String(id) && item.fromTable === fromTable),
  );
  saveCompareList(list);
}

export function clearCompare() {
  saveCompareList([]);
}

/** Bật/tắt 1 sản phẩm khỏi danh sách so sánh, trả về trạng thái mới để hiện toast phù hợp */
export function toggleCompare(product, fromTable) {
  if (isInCompare(product?.id, fromTable)) {
    removeFromCompare(product.id, fromTable);
    return {
      success: true,
      active: false,
      message: "Đã bỏ khỏi danh sách so sánh!",
    };
  }
  const res = addToCompare(product, fromTable);
  return { ...res, active: !!res.success };
}
