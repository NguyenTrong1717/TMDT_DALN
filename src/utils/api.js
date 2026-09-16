export const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:3000";

export const getAccessToken = () => localStorage.getItem("accessToken") || "";

export const getCurrentUser = () => {
  try {
    return JSON.parse(localStorage.getItem("currentUser") || "null");
  } catch {
    return null;
  }
};

export const setAuthSession = ({ token, user }) => {
  localStorage.setItem("accessToken", token);
  localStorage.setItem("currentUser", JSON.stringify(user));
  window.dispatchEvent(new Event("authChange"));
};

export const clearAuthSession = () => {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("currentUser");
  window.dispatchEvent(new Event("authChange"));
};

export const apiFetch = async (path, options = {}) => {
  const headers = new Headers(options.headers || {});
  const token = getAccessToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (options.body && !(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const response = await fetch(path.startsWith("http") ? path : `${API_URL}${path}`, {
    ...options,
    headers,
  });
  if (response.status === 401 && token) clearAuthSession();
  return response;
};

export const readJson = async (response, fallback = "Yêu cầu thất bại.") => {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || data.message || fallback);
  return data;
};

export const logout = async () => {
  try {
    await apiFetch("/api/auth/logout", { method: "POST" });
  } finally {
    clearAuthSession();
  }
};

