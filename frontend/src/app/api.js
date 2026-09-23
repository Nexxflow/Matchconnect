// ─── API layer ──────────────────────────────────────────────────────────────
// Reads VITE_API_URL from environment (.env / .env.production).
// Native app (Capacitor Android): always uses the deployed backend, because the
// WebView runs on https://localhost and would otherwise be mistaken for local dev.
// Local web development (localhost / 127.0.0.1): uses http://localhost:8000/api
// to ensure local code changes take effect immediately without needing cloud deployment.
const PROD_API_URL = "https://matchconnect-uvy4.onrender.com/api";

const isNativeApp =
  typeof window !== "undefined" &&
  (!!window.Capacitor?.isNativePlatform?.() ||
   window.location.protocol === "capacitor:");

const isLocalhost =
  typeof window !== "undefined" &&
  !isNativeApp &&
  (window.location.hostname === "localhost" ||
   window.location.hostname === "127.0.0.1" ||
   window.location.hostname.endsWith(".local"));

const envApiUrl = import.meta.env.VITE_API_URL;

const rawApiUrl = (
  isNativeApp
    ? (envApiUrl || PROD_API_URL)
    : isLocalhost
      ? "http://localhost:8000/api"
      : (envApiUrl || "http://localhost:8000/api")
).replace(/\/+$/, "");

export const API_BASE = rawApiUrl.endsWith("/api") ? rawApiUrl : `${rawApiUrl}/api`;

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
  const cleanPath = path.startsWith("/api/")
    ? path.slice(4)
    : path.startsWith("api/")
    ? path.slice(3)
    : path.startsWith("/")
    ? path
    : `/${path}`;

  const headers = {
    "Content-Type": "application/json",
  };

  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  try {
    const res = await fetch(`${API_BASE}${cleanPath}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      if (res.status === 401) {
        console.log("⚠️ Token expired or invalid. Clearing session...");
        setStoredToken(null);
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("mc:unauthorized"));
        }
      }

      throw new Error(data.error || `Request failed: ${res.status}`);
    }

    return data;
  } catch (err) {
    console.error("========================================");
    console.error("❌ API ERROR");
    console.error("URL:", `${API_BASE}${cleanPath}`);
    console.error(err);
    console.error("========================================");
    throw err;
  }
}