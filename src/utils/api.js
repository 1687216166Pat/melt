import { isLocalMode } from "./storage";

const BASE = import.meta.env.VITE_API_URL || "";

export { isLocalMode };

export async function api(path, options = {}) {
  if (isLocalMode) {
    const { localApiHandler } = await import("./localApi");
    return localApiHandler(path, options);
  }

  const isBeta = localStorage.getItem("is_beta_mode") === "true";
  const headers = new Headers(options.headers || {});
  headers.set("x-beta-mode", isBeta ? "true" : "false");

  return fetch(`${BASE}${path}`, { ...options, headers });
}
