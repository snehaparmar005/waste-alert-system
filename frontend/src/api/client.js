export const API_BASE = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");

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