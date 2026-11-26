export const API_BASE = import.meta.env.DEV
  ? (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "")
  : "";

const GET_CACHE_TTL_MS = 10000;
const getResponseCache = new Map();

export function getSession() {
  try {
    const raw = localStorage.getItem("c2c_session");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveSession(session) {
  localStorage.setItem("c2c_session", JSON.stringify(session));
}

export function clearSession() {
  localStorage.removeItem("c2c_session");
}

export function getImageUrl(path) {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  return `${API_BASE}${path}`;
}

export function getPageResult(data) {
  if (Array.isArray(data)) {
    return { items: data, total: data.length, page: 1, total_pages: 1, summary: null };
  }
  return {
    items: Array.isArray(data?.items) ? data.items : [],
    total: Number(data?.total) || 0,
    page: Number(data?.page) || 1,
    total_pages: Number(data?.total_pages) || 0,
    summary: data?.summary || null,
  };
}

export async function apiRequest(path, options = {}) {
  const session = getSession();
  const headers = new Headers(options.headers || {});
  const method = (options.method || "GET").toUpperCase();
  const cacheKey = `${session?.token || "anonymous"}:${path}`;

  if (method === "GET") {
    const cached = getResponseCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return JSON.parse(cached.body);
    }
    if (cached) getResponseCache.delete(cacheKey);
    headers.set("Cache-Control", "max-age=15");
  } else {
    getResponseCache.clear();
  }

  if (session?.token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${session.token}`);
  }

  if (!(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    ...(method === "GET" ? { cache: "no-store" } : {}),
    headers,
  });

  if (response.status === 204) return null;

  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { detail: text };
  }

  if (!response.ok) {
    throw new Error(data?.detail || `Request failed with status ${response.status}`);
  }

  if (method === "GET") {
    if (getResponseCache.size >= 100) getResponseCache.clear();
    getResponseCache.set(cacheKey, {
      body: JSON.stringify(data),
      expiresAt: Date.now() + GET_CACHE_TTL_MS,
    });
  }

  return data;
}