const { initializeApp, cert, getApps } = require("firebase-admin/app");
const { getMessaging } = require("firebase-admin/messaging");

let serviceAccount;

if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
  // Production: decode from base64 env variable
  const decoded = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, "base64").toString("utf-8");
  serviceAccount = JSON.parse(decoded);
} else {
  // Local dev: read from file (Key ID: fd85d8f4aa2af15b437c41ca0921e4d5ff6e91d9)
  serviceAccount = require("./serviceAccountKey.json");
}

// Ensure private key handles newlines properly
if (serviceAccount && serviceAccount.private_key) {
  serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, "\n");
}

// Automatic time sync to resolve Google OAuth clock skew (e.g. if machine clock is in 2026)
const originalDateNow = Date.now.bind(Date);
let timeDriftMs = 0;
let isTimeSynced = false;

const syncTimeWithGoogle = async () => {
  try {
    const res = await fetch("https://oauth2.googleapis.com", { method: "HEAD" });
    const serverDate = res.headers.get("date");
    if (serverDate) {
      const googleTime = new Date(serverDate).getTime();
      const localTime = originalDateNow();
      timeDriftMs = googleTime - localTime;
      console.log(`⏱️ [Google Time Sync] Local: ${new Date(localTime).toISOString()} | Google: ${new Date(googleTime).toISOString()} | Drift: ${Math.round(timeDriftMs / 1000)}s`);

      if (Math.abs(timeDriftMs) > 30000) {
        console.log(`⏱️ [Google Time Sync] Automatically calibrated Date.now() by ${Math.round(timeDriftMs / 1000)}s to resolve OAuth2 JWT signature issue.`);
        Date.now = function () {
          return originalDateNow() + timeDriftMs;
        };
      }
      isTimeSynced = true;
    }
  } catch (err) {
    console.warn("⚠️ [Google Time Sync] Could not reach Google time server:", err.message);
  }
};

syncTimeWithGoogle().catch(() => {});

// Prevent re-initialization during nodemon restarts
const app =
  getApps().length === 0
    ? initializeApp({
        credential: cert(serviceAccount),
      })
    : getApps()[0];

const messaging = getMessaging(app);

module.exports = {
  app,
  messaging,
  syncTimeWithGoogle,
};
