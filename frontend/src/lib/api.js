// Thin client for the FastAPI backend.
// Dev: Vite proxies /api and /uploads to FastAPI, so BASE stays empty.
// Production: set VITE_API_URL (e.g. https://api.example.com) at build time.
const BASE = import.meta.env.VITE_API_URL ?? "";
const TOKEN_KEY = "c2c_admin_token";

export const getToken = () => {
  try { return sessionStorage.getItem(TOKEN_KEY); } catch { return null; }
};
export const setToken = (t) => {
  try { t ? sessionStorage.setItem(TOKEN_KEY, t) : sessionStorage.removeItem(TOKEN_KEY); } catch { /* storage blocked */ }
};

async function request(path, { method = "GET", body, form, auth = false } = {}) {
  const headers = {};
  if (auth) {
    const t = getToken();
    if (t) headers.Authorization = `Bearer ${t}`;
  }
  let payload;
  if (form) payload = form;
  else if (body) { headers["Content-Type"] = "application/json"; payload = JSON.stringify(body); }
  const res = await fetch(`${BASE}${path}`, { method, headers, body: payload });
  let data = null;
  try { data = await res.json(); } catch { /* empty body */ }
  if (!res.ok) {
    const detail = typeof data?.detail === "string" ? data.detail : "Something went wrong. Please try again.";
    const err = new Error(detail);
    err.status = res.status;
    throw err;
  }
  return data;
}

export const photoUrl = (path) => (path ? `${BASE}${path}` : "");

export const submitReport = ({ photo, category, note, latitude, longitude }) => {
  const form = new FormData();
  form.append("photo", photo);
  form.append("category", category);
  if (note) form.append("note", note);
  if (latitude != null && longitude != null) {
    form.append("latitude", String(latitude));
    form.append("longitude", String(longitude));
  }
  return request("/api/reports", { method: "POST", form });
};

export const trackReport = (code) => request(`/api/reports/track/${encodeURIComponent(code)}`);

export const login = (username, password) =>
  request("/api/auth/login", { method: "POST", body: { username, password } });

export const listReports = ({ status, category } = {}) => {
  const q = new URLSearchParams();
  if (status) q.set("status", status);
  if (category) q.set("category", category);
  const s = q.toString();
  return request(`/api/admin/reports${s ? `?${s}` : ""}`, { auth: true });
};

export const getStats = () => request("/api/admin/stats", { auth: true });

export const updateStatus = (id, status) =>
  request(`/api/admin/reports/${id}`, { method: "PATCH", body: { status }, auth: true });
