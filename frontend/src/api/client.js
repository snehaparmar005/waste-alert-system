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

export async function apiRequest(path, options = {}) {
  const session = getSession();
  const headers = { ...(options.headers || {}) };

  if (session?.token) {
    headers["Authorization"] = `Bearer ${session.token}`;
  }

  if (!(options.body instanceof FormData) && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(path, { ...options, headers });
  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    if (response.status === 401) {
      clearSession();
    }
    throw new Error(data?.detail || `Request failed with status ${response.status}`);
  }

  return data;
}
