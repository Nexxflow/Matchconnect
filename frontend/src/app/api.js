// ─── API layer ──────────────────────────────────────────────────────────────
export const API_BASE = "http://localhost:8000/api";

export async function apiRequest(path, { method = "GET", body, token } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed: ${res.status}`);
  return data;
}

// ─── Auth token persistence ─────────────────────────────────────────────────
const TOKEN_KEY = "mc_token";

export function getStoredToken() {
  return localStorage.getItem(TOKEN_KEY);
}
export function setStoredToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}
