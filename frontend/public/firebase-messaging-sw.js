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

function getTargetUrl(data = {}, title = "", body = "") {
  if (data.targetUrl && data.targetUrl.startsWith("/")) return data.targetUrl;
  if (data.url && data.url.startsWith("/")) return data.url;
  if (data.click_action && data.click_action.startsWith("/")) return data.click_action;

  const type = String(data.type || "").toLowerCase();
  const text = `${type} ${title || ""} ${body || ""}`.toLowerCase();

  let tab = "Home";
  let extra = "";

  if (text.includes("chat") || text.includes("message")) {
    tab = "My Team";
    const cId = data.challengeId || data.challenge_id || "";
    if (cId) extra = `&challengeId=${encodeURIComponent(cId)}`;
  } else if (
    type.includes("challenge_accepted") ||
    type.includes("team_challenge_accepted") ||
    type.includes("teammate_challenge_accepted") ||
    (text.includes("challenge") && text.includes("accepted"))
  ) {
    tab = "My Team";
  } else if (text.includes("challenge")) {
    tab = "Find Match";
  } else if (type.includes("tournament_registration") || (text.includes("tournament") && text.includes("register"))) {
    tab = "My Team";
  } else if (text.includes("tournament")) {
    tab = "Tournaments";
  } else if (type.includes("ground_booking") || (text.includes("ground") && text.includes("booking"))) {
    tab = "My Team";
  } else if (text.includes("ground") || text.includes("pitch")) {
    tab = "Grounds";
  } else if (type.includes("umpire_booking") || (text.includes("umpire") && text.includes("booking"))) {
    tab = "My Team";
  } else if (text.includes("umpire")) {
    tab = "Umpires";
  } else if (text.includes("live") || text.includes("score") || text.includes("match")) {
    tab = "Live Score";
  } else if (text.includes("team") || text.includes("teammate")) {
    tab = "My Team";
  }

  return `/?tab=${encodeURIComponent(tab)}&notifType=${encodeURIComponent(type || "general")}${extra}`;
}

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || payload.data?.title || "MatchConnect";
  const body = payload.notification?.body || payload.data?.body || "";
  const data = payload.data || {};
  const targetUrl = getTargetUrl(data, title, body);

  console.log("🔔 [Service Worker] Background Push Notification RECEIVED:", { title, body, payload, targetUrl });
  const options = {
    body,
    icon: "/logo.png",
    badge: "/logo.png",
    data: {
      ...data,
      targetUrl,
      title,
      body,
    },
  };
  self.registration.showNotification(title, options);
  console.log("📱 [Service Worker] Native system notification displayed for:", title);
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const notifData = event.notification.data || {};
  const targetUrl = notifData.targetUrl || getTargetUrl(notifData, event.notification.title, event.notification.body);

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      // 1. If an existing browser window/tab is open, focus it and navigate
      for (const client of windowClients) {
        if ("focus" in client) {
          client.focus();
          if ("navigate" in client) {
            client.navigate(targetUrl);
          }
          client.postMessage({
            type: "NOTIFICATION_CLICK",
            data: notifData,
            targetUrl,
            notification: {
              title: event.notification.title,
              body: event.notification.body,
              data: notifData,
            },
          });
          return;
        }
      }
      // 2. If no window open, open new browser tab with target URL
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});