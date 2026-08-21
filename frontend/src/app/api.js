// ─── API layer ──────────────────────────────────────────────────────────────
// export const API_BASE = "https://hdr2k2kf-8000.inc1.devtunnels.ms/api";
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