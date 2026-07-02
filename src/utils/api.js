// src/utils/api.js
const BASE = import.meta.env.VITE_API_URL || "";

export function api(path, options = {}) {
  // 从本地存储获取最新的模式状态
  const isBeta = localStorage.getItem("is_beta_mode") === "true";

  // 创建 Headers 对象
  const headers = new Headers(options.headers || {});
  headers.set("x-beta-mode", isBeta ? "true" : "false");

  const fetchOptions = {
    ...options,
    headers: headers,
  };

  return fetch(`${BASE}${path}`, fetchOptions);
}
