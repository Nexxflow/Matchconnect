// ─── API layer ──────────────────────────────────────────────────────────────
// Reads VITE_API_URL from the environment (.env / .env.production) so the
// same build can point at localhost in dev and the real deployed backend in
// production, instead of a hardcoded host. Falls back to localhost so local
// `npm run dev` keeps working even if a dev hasn't set up a .env yet.
export const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

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
  const authToken = token !== undefined ? token : getStoredToken();

  const headers = {
    "Content-Type": "application/json",
  };

  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      if (res.status === 401) {
        console.log("⚠️ Token expired. Removing local token...");
        setStoredToken(null);
      }

      throw new Error(data.error || `Request failed: ${res.status}`);
    }

    return data;
  } catch (err) {
    console.error("========================================");
    console.error("❌ API ERROR");
    console.error("URL:", `${API_BASE}${path}`);
    console.error(err);
    console.error("========================================");
    throw err;
  }
}