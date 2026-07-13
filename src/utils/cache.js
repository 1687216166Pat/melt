const CACHE_PREFIX = "melt_cache_";

export function getCache(key) {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    const { data, timestamp } = JSON.parse(raw);
    return { data, timestamp };
  } catch {
    return null;
  }
}

export function setCache(key, data) {
  try {
    localStorage.setItem(
      CACHE_PREFIX + key,
      JSON.stringify({
        data,
        timestamp: Date.now(),
      }),
    );
  } catch {}
}

export function clearCache(key) {
  localStorage.removeItem(CACHE_PREFIX + key);
}

// 带缓存的 API 请求
export async function cachedFetch(path, options = {}) {
  const cacheKey = path;
  const cached = getCache(cacheKey);

  // 如果有缓存，先返回缓存
  if (cached && !options.forceRefresh) {
    // 后台静默更新
    fetchAndUpdate(path, cacheKey);
    return cached.data;
  }

  // 没有缓存或强制刷新
  return await fetchAndUpdate(path, cacheKey);
}

async function fetchAndUpdate(path, cacheKey) {
  try {
    const BASE = import.meta.env.VITE_API_URL || "";
    const res = await fetch(`${BASE}${path}`);
    if (res.ok) {
      const data = await res.json();
      setCache(cacheKey, data);
      return data;
    }
  } catch {}
  // 网络失败，返回缓存
  const cached = getCache(cacheKey);
  return cached ? cached.data : null;
}
