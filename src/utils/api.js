import { ref, watch } from "vue";
import { manualOffline } from "./emergencyMode"; // 新增导入

const BASE = import.meta.env.VITE_API_URL || "";
const MODE = import.meta.env.VITE_APP_MODE || "personal";

// 静态本地模式（local/lite 版本始终走本地）
export const isStaticLocalMode = MODE === "local" || MODE === "lite";

// 动态本地模式（personal 版云端故障时自动切换）
export const isCloudDown = ref(false);
export const pendingSyncCount = ref(0);

// 最终判断：是否走本地
export const isLocalMode = isStaticLocalMode;

// Personal 版的动态模式判断
export function shouldUseLocal() {
  if (isStaticLocalMode) return true;
  return manualOffline.value || isCloudDown.value;
}

// 云端健康检查
let healthCheckTimer = null;
let consecutiveFailures = 0;
const MAX_FAILURES = 4;

async function checkCloudHealth() {
  if (isStaticLocalMode) return;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), healthCheckTimeout);
    const res = await fetch(`${BASE}/api/prompts/personas`, {
      signal: controller.signal,
      headers: { "x-beta-mode": "false" },
    });
    clearTimeout(timeout);
    if (res.ok) {
      consecutiveFailures = 0;
      if (isCloudDown.value) {
        console.log("[API] 云端已恢复");
        isCloudDown.value = false;
        syncPendingData();
      }
    } else if (res.status >= 500) {
      onCloudFailure();
    }
  } catch {
    onCloudFailure();
  }
}

// 启动时预热：高频检测直到成功，或直到达到最大重试次数
export async function warmUpCloud() {
  if (isStaticLocalMode) return;
  console.log("[API] 开始预热探测云端...");
  let attempts = 0;
  const maxAttempts = 6; // 最多 6 次，约 150 秒
  while (attempts < maxAttempts) {
    await checkCloudHealth();
    if (!isCloudDown.value) {
      console.log("[API] 预热成功，云端已连接");
      return;
    }
    attempts++;
    await new Promise((r) => setTimeout(r, 5000)); // 间隔 5s
  }
  console.warn("[API] 预热结束，云端仍不可用");
}

function onCloudFailure() {
  consecutiveFailures++;
  if (consecutiveFailures >= MAX_FAILURES && !isCloudDown.value) {
    console.warn("[API] 云端连续失败，切换本地模式");
    isCloudDown.value = true;
  }
}

// 启动健康检查（Personal 版才启动）
export function startHealthCheck() {
  if (isStaticLocalMode) return;
  warmUpCloud(); // 启动时预热
  healthCheckTimer = setInterval(checkCloudHealth, 60000); // 改为 60s 检查一次（降低频率）
}

export function stopHealthCheck() {
  if (healthCheckTimer) {
    clearInterval(healthCheckTimer);
    healthCheckTimer = null;
  }
}

// 待同步队列
const PENDING_KEY = "melt_pending_sync";

export function addPendingSync(item) {
  const pending = JSON.parse(localStorage.getItem(PENDING_KEY) || "[]");
  pending.push(item);
  localStorage.setItem(PENDING_KEY, JSON.stringify(pending));
  pendingSyncCount.value = pending.length;
}

export function getPendingSync() {
  return JSON.parse(localStorage.getItem(PENDING_KEY) || "[]");
}

function clearPendingSync() {
  localStorage.removeItem(PENDING_KEY);
  pendingSyncCount.value = 0;
}

async function syncPendingData() {
  const pending = getPendingSync();
  if (pending.length === 0) return;

  console.log(`[API] 开始同步 ${pending.length} 条待上传数据`);
  let successCount = 0;

  for (const item of pending) {
    try {
      const res = await fetch(`${BASE}${item.path}`, {
        method: item.method || "POST",
        headers: { "Content-Type": "application/json", ...item.headers },
        body: JSON.stringify(item.body),
      });
      if (res.ok) successCount++;
    } catch (e) {
      console.error("[API] 同步单条失败:", e);
      // 如果云端又挂了，停止同步
      isCloudDown.value = true;
      break;
    }
  }

  if (successCount === pending.length) {
    clearPendingSync();
    console.log("[API] 全部同步完成");
  } else {
    // 部分成功，移除已成功的
    const remaining = pending.slice(successCount);
    localStorage.setItem(PENDING_KEY, JSON.stringify(remaining));
    pendingSyncCount.value = remaining.length;
    console.log(`[API] 同步部分完成: ${successCount}/${pending.length}`);
  }
}

// 主 API 请求函数
export async function api(path, options = {}) {
  // 静态本地模式，始终走本地
  if (isStaticLocalMode) {
    const { localApiHandler } = await import("./localApi");
    return localApiHandler(path, options);
  }

  // Personal 版：云端故障时降级到本地
  if (isCloudDown.value) {
    // 写操作存入待同步队列
    const method = (options.method || "GET").toUpperCase();
    if (method !== "GET") {
      addPendingSync({
        path,
        method,
        headers: options.headers,
        body: options.body ? JSON.parse(options.body) : undefined,
        timestamp: Date.now(),
      });
    }
    // 走本地处理
    const { localApiHandler } = await import("./localApi");
    return localApiHandler(path, options);
  }

  // 正常走云端
  const isBeta = localStorage.getItem("is_beta_mode") === "true";
  const headers = new Headers(options.headers || {});
  headers.set("x-beta-mode", isBeta ? "true" : "false");

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);
    const res = await fetch(`${BASE}${path}`, {
      ...options,
      headers,
      signal: controller.signal,
    });
    clearTimeout(timeout);
    consecutiveFailures = 0;
    return res;
  } catch (e) {
    onCloudFailure();
    // 如果刚切到本地模式，重试一次走本地
    if (isCloudDown.value) {
      const method = (options.method || "GET").toUpperCase();
      if (method !== "GET") {
        addPendingSync({
          path,
          method,
          headers: options.headers,
          body: options.body ? JSON.parse(options.body) : undefined,
          timestamp: Date.now(),
        });
      }
      const { localApiHandler } = await import("./localApi");
      return localApiHandler(path, options);
    }
    throw e;
  }
}
