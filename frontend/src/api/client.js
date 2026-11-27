export const API_BASE = import.meta.env.DEV
  ? (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "")
  : "";

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

export function normalizeReportsResponse(data) {
  let items;
  let pagination = {};

  if (Array.isArray(data)) {
    items = data;
  } else if (data && typeof data === "object") {
    items = [data.items, data.reports, data.data].find(Array.isArray);
    if (!items) {
      throw new TypeError("Reports response must contain an array.");
    }
    pagination = data;
  } else {
    throw new TypeError("Reports response must be an array or an object containing one.");
  }

  return {
    items,
    total: pagination.total ?? items.length,
    page: pagination.page ?? 1,
    total_pages: pagination.total_pages ?? (items.length ? 1 : 0),
  };
}

export async function apiRequest(path, options = {}) {
  const session = getSession();
  const headers = new Headers(options.headers || {});

  if (session?.token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${session.token}`);
  }

  if (!(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
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

  return data;
}