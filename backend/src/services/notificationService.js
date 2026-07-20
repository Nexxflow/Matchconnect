const { messaging } = require("../config/firebase");

const sendNotification = async (
  token,
  title,
  body,
  data = {}
) => {
  if (!token) return null; // no device token on file, skip silently

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

// ============================================================
// Sent to the CHALLENGE CREATOR when the challenged team accepts.
// e.g. "Titans accepted your challenge"
// ============================================================
const notifyChallengeAccepted = async (creatorToken, accepterTeamName, data = {}) => {
  return sendNotification(
    creatorToken,
    "Challenge Accepted",
    `${accepterTeamName} accepted your challenge`,
    { type: "challenge_accepted", ...data }
  );
};

// ============================================================
// Sent to the CHALLENGE CREATOR when the challenged team cancels.
// e.g. "Titans cancelled your challenge"
// ============================================================
const notifyChallengeCancelled = async (creatorToken, cancellerTeamName, data = {}) => {
  return sendNotification(
    creatorToken,
    "Challenge Cancelled",
    `${cancellerTeamName} cancelled your challenge`,
    { type: "challenge_cancelled", ...data }
  );
};

module.exports = {
  sendNotification,
  notifyChallengeAccepted,
  notifyChallengeCancelled,
};