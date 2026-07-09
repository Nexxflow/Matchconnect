// ─── API layer ──────────────────────────────────────────────────────────────
export const API_BASE = "http://localhost:8000/api";

// ─── Auth token persistence ─────────────────────────────────────────────────
const TOKEN_KEY = "mc_token";

export function getStoredToken() {
  return localStorage.getItem(TOKEN_KEY);
}
export function setStoredToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export async function apiRequest(path, { method = "GET", body, token } = {}) {
  // Fall back to the token in localStorage when the caller doesn't pass one
  // explicitly. Previously every call had to remember to pass `token`
  // itself — EditProfileModal (and most other screens) never did, so
  // Authorization was never set and protected routes 401'd.
  const authToken = token !== undefined ? token : getStoredToken();

  const headers = { "Content-Type": "application/json" };
  if (authToken) headers.Authorization = `Bearer ${authToken}`;

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    if (res.status === 401) {
      // Stored token is missing/invalid/expired — clear it so the app
      // doesn't keep retrying protected routes with a dead token.
      setStoredToken(null);
    }
    throw new Error(data.error || `Request failed: ${res.status}`);
  }
  return data;
}