const { initializeApp, cert, getApps } = require("firebase-admin/app");
const { getMessaging } = require("firebase-admin/messaging");

const serviceAccount = require("./serviceAccountKey.json");

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