const { messaging } = require("../config/firebase");

const sendNotification = async (
  token,
  title,
 body,
  data = {}
) => {
  const message = {
    token,

    notification: {
      title,
      body,
    },

    data,

    android: {
      priority: "high",
    },

    webpush: {
      notification: {
        icon: "/logo.png",
      },
    },

    apns: {
      headers: {
        "apns-priority": "10",
      },
    },
  };

  const response = await messaging.send(message);

  return response;
};

module.exports = {
  sendNotification,
};