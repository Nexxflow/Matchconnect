const { initializeApp, cert, getApps } = require("firebase-admin/app");
const { getMessaging } = require("firebase-admin/messaging");

let serviceAccount;

if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
  // Production: decode from base64 env variable
  const decoded = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, "base64").toString("utf-8");
  serviceAccount = JSON.parse(decoded);
} else {
  // Local dev: read from file
  serviceAccount = require("./serviceAccountKey.json");
}

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
};
