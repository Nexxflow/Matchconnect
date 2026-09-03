importScripts("https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyA8Xh67YkkHBqgU2UmxxMWWF9EOG5FX2eQ",
  authDomain: "matchconnect-f398b.firebaseapp.com",
  projectId: "matchconnect-f398b",
  storageBucket: "matchconnect-f398b.appspot.com",
  messagingSenderId: "1051816080402",
  appId: "1:1051816080402:web:778a67b863da2486eb14cb",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || payload.data?.title || "MatchConnect";
  const body = payload.notification?.body || payload.data?.body || "";
  console.log("🔔 [Service Worker] Background Push Notification RECEIVED:", { title, body, payload });
  const options = {
    body,
    icon: "/logo.png",
    badge: "/logo.png",
    data: payload.data || {},
  };
  self.registration.showNotification(title, options);
  console.log("📱 [Service Worker] Native system notification displayed for:", title);
});