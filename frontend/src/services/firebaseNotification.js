import { getToken, onMessage } from "firebase/messaging";
import { getFirebaseMessaging } from "../firebase";
import { showToast } from "../app/utils/toast.jsx";

export async function requestNotificationPermission() {
  try {
    const permission = await Notification.requestPermission();

    if (permission !== "granted") {
      console.log("Notification permission denied");
      return null;
    }

    const messaging = await getFirebaseMessaging();

    if (!messaging) {
      console.log("Firebase Messaging is not supported.");
      return null;
    }

    const token = await getToken(messaging, {
      vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
    });

    console.log("FCM Token:", token);

    return token;
  } catch (error) {
    console.error("Error getting notification permission:", error);
    return null;
  }
}

export async function listenForMessages() {
  const messaging = await getFirebaseMessaging();

  if (!messaging) return;

  onMessage(messaging, (payload) => {
    console.log("Foreground Notification:", payload);

    const title = payload?.notification?.title || "MatchConnect";
    const body = payload?.notification?.body || "";
    showToast.info(`${title}: ${body}`);
  });
}