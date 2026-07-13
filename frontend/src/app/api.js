// ─── API layer ──────────────────────────────────────────────────────────────
export const API_BASE = "https://hdr2k2kf-8000.inc1.devtunnels.ms/api";

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

  console.log("========================================");
  console.log("📤 API REQUEST");
  console.log("URL:", `${API_BASE}${path}`);
  console.log("Method:", method);
  console.log("Headers:", headers);
  console.log("Body:", body);
  console.log("========================================");

  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    console.log("========================================");
    console.log("📥 API RESPONSE");
    console.log("Status:", res.status);
    console.log("Status Text:", res.statusText);
    console.log("OK:", res.ok);

    const data = await res.json().catch(() => ({}));

    console.log("Response Data:", data);
    console.log("========================================");

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