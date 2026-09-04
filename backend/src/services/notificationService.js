const pool = require("../config/db");
const { messaging, syncTimeWithGoogle } = require("../config/firebase");

let tableInitPromise = null;
const ensureNotificationTable = async () => {
  if (!tableInitPromise) {
    tableInitPromise = (async () => {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS in_app_notifications (
          id SERIAL PRIMARY KEY,
          user_id TEXT NOT NULL,
          title VARCHAR(255) NOT NULL,
          body TEXT NOT NULL,
          type VARCHAR(50) DEFAULT 'general',
          data JSONB DEFAULT '{}',
          is_read BOOLEAN DEFAULT false,
          created_at TIMESTAMPTZ DEFAULT now()
        );
      `);
      await pool.query(`
        ALTER TABLE in_app_notifications ALTER COLUMN user_id TYPE TEXT;
      `).catch(() => {});
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_in_app_notifs_user ON in_app_notifications(user_id);
      `).catch(() => {});
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_in_app_notifs_user_created ON in_app_notifications(user_id, created_at DESC);
      `).catch(() => {});
      console.log("✅ [NotificationService] in_app_notifications table verified (user_id TEXT, indexed).");
      return true;
    })().catch((err) => {
      tableInitPromise = null;
      console.error("❌ [NotificationService] Failed to initialize in_app_notifications table:", err.message);
      throw err;
    });
  }
  return tableInitPromise;
};
ensureNotificationTable().catch(() => {});

// In-memory cache for user in-app notifications
const userNotifCache = new Map(); // userId -> { notifications, timestamp }
const CACHE_TTL_MS = 20000; // 20 seconds TTL

const invalidateNotificationCache = (userIds) => {
  if (!userIds) {
    userNotifCache.clear();
    return;
  }
  const ids = Array.isArray(userIds) ? userIds : [userIds];
  for (const id of ids) {
    userNotifCache.delete(String(id));
  }
};

const getInAppNotifications = async (userId) => {
  if (!userId) return [];
  const uid = String(userId);
  const now = Date.now();
  const cached = userNotifCache.get(uid);

  if (cached && (now - cached.timestamp < CACHE_TTL_MS)) {
    return cached.notifications;
  }

  const { rows } = await pool.query(
    `SELECT id, user_id, title, body, type, data, is_read, created_at
     FROM in_app_notifications
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT 50`,
    [uid]
  );

  userNotifCache.set(uid, {
    notifications: rows,
    timestamp: now,
  });

  return rows;
};

/**
 * Persist in-app notification rows in PostgreSQL
 */
const recordInAppNotifications = async (userIds, title, body, type = "general", data = {}) => {
  if (!userIds || userIds.length === 0) return;
  const uniqueIds = [...new Set(userIds.filter(Boolean).map(String))];
  if (uniqueIds.length === 0) return;

  try {
    const valueClauses = [];
    const params = [];
    let pIdx = 1;

    for (const uid of uniqueIds) {
      valueClauses.push(`($${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++})`);
      params.push(String(uid), title, body, type, JSON.stringify(data));
    }

    await pool.query(
      `INSERT INTO in_app_notifications (user_id, title, body, type, data)
       VALUES ${valueClauses.join(", ")}`,
      params
    );
    invalidateNotificationCache(uniqueIds);
    console.log(`📝 [In-App Notification] Saved ${uniqueIds.length} notification rows in database for users: [${uniqueIds.join(", ")}]`);
  } catch (err) {
    console.error("❌ [In-App Notification] Failed to record in-app notifications:", err.message);
  }
};

/**
 * Calculate deep-link target URL for mobile phone and browser push notifications
 */
const getNotificationUrl = (data = {}, title = "", body = "") => {
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
};

/**
 * Send Web Push / FCM Notification to a single device token
 */
const sendNotification = async (token, title, body, data = {}) => {
  if (!token) {
    console.log("ℹ️ [FCM Single] No device token provided. Push notification skipped.");
    return null;
  }

  console.log(`🔔 [FCM Single] Sending push to token (${token.slice(0, 16)}...): "${title}"`);

  try {
    if (typeof syncTimeWithGoogle === "function") await syncTimeWithGoogle();
    const stringData = Object.fromEntries(
      Object.entries(data).map(([k, v]) => [k, String(v)])
    );
    const targetUrl = getNotificationUrl(data, title, body);

    const notifTag = String(data.tag || data.challenge_id || data.match_id || data.tournament_id || data.ground_id || `mc_${Date.now()}`);
    const payloadData = {
      ...stringData,
      title: String(title),
      body: String(body),
      targetUrl,
      click_action: targetUrl,
      url: targetUrl,
      tag: notifTag,
    };

    const message = {
      token,
      notification: {
        title,
        body,
      },
      data: payloadData,
      webpush: {
        notification: {
          title,
          body,
          icon: "/logo.png",
          badge: "/logo.png",
          tag: notifTag,
        },
        fcm_options: {
          link: targetUrl,
        },
      },
      android: {
        priority: "high",
        notification: {
          title,
          body,
          clickAction: targetUrl,
        },
      },
      apns: {
        headers: {
          "apns-priority": "10",
        },
        payload: {
          aps: {
            alert: {
              title,
              body,
            },
            sound: "default",
          },
        },
      },
    };

    const response = await messaging.send(message);
    console.log(`✅ [FCM Single] Push notification successfully sent! Message ID:`, response);
    return response;
  } catch (err) {
    console.error(`❌ [FCM Single] Failed to send push notification:`, err.message);
    if (err.message?.includes("invalid_grant")) {
      console.warn("💡 Action Required: The key in backend/src/config/serviceAccountKey.json has been revoked in Firebase Console. Generate a new private key from Firebase Console -> Project Settings -> Service Accounts.");
    }
    return null;
  }
};

/**
 * Send Web Push / FCM Notification to multiple device tokens
 */
const sendMulticastNotification = async (tokens, title, body, data = {}) => {
  if (!tokens || !tokens.length) {
    console.log("ℹ️ [FCM Multicast] 0 device tokens provided. Push notification skipped.");
    return null;
  }
  const uniqueTokens = [...new Set(tokens.filter(Boolean))];
  if (!uniqueTokens.length) {
    console.log("ℹ️ [FCM Multicast] No valid non-empty tokens found.");
    return null;
  }

  console.log(`🔔 [FCM Multicast] Dispatching "${title}" to ${uniqueTokens.length} device tokens...`);

  const stringData = Object.fromEntries(
    Object.entries(data).map(([k, v]) => [k, String(v)])
  );
  const targetUrl = getNotificationUrl(data, title, body);
  const notifTag = String(data.tag || data.challenge_id || data.match_id || data.tournament_id || data.ground_id || `mc_${Date.now()}`);
  const payloadData = {
    ...stringData,
    title: String(title),
    body: String(body),
    targetUrl,
    click_action: targetUrl,
    url: targetUrl,
    tag: notifTag,
  };

  if (typeof syncTimeWithGoogle === "function") await syncTimeWithGoogle();

  let successCount = 0;
  for (let i = 0; i < uniqueTokens.length; i += 500) {
    const batch = uniqueTokens.slice(i, i + 500);
    try {
      const response = await messaging.sendEachForMulticast({
        tokens: batch,
        notification: {
          title,
          body,
        },
        data: payloadData,
        webpush: {
          notification: {
            title,
            body,
            icon: "/logo.png",
            badge: "/logo.png",
            tag: notifTag,
          },
          fcm_options: {
            link: targetUrl,
          },
        },
        android: {
          priority: "high",
          notification: {
            title,
            body,
            clickAction: targetUrl,
          },
        },
        apns: {
          headers: {
            "apns-priority": "10",
          },
          payload: {
            aps: {
              alert: {
                title,
                body,
              },
              sound: "default",
            },
          },
        },
      });

      successCount += response.successCount;
      console.log(`✅ [FCM Multicast] Batch ${Math.floor(i / 500) + 1}: ${response.successCount}/${batch.length} push notifications successfully sent.`);

      if (response.failureCount > 0) {
        console.warn(`⚠️ [FCM Multicast] ${response.failureCount} tokens failed delivery in this batch.`);
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            console.warn(`   └ Token ${idx + 1} failure reason:`, resp.error?.message);
            if (resp.error?.message?.includes("invalid_grant")) {
              console.warn("   💡 Action Required: The key in backend/src/config/serviceAccountKey.json has been revoked in Firebase Console. Generate a new private key from Firebase Console -> Project Settings -> Service Accounts.");
            }
          }
        });
      }
    } catch (err) {
      console.error("❌ [FCM Multicast] Batch delivery error:", err.message);
      if (err.message?.includes("invalid_grant")) {
        console.warn("💡 Action Required: The key in backend/src/config/serviceAccountKey.json has been revoked in Firebase Console. Generate a new private key from Firebase Console -> Project Settings -> Service Accounts.");
      }
    }
  }

  return { successCount };
};

/**
 * Notify a single user: records in-app notification & sends FCM web push if token exists
 */
const notifyUser = async (userId, title, body, data = {}, type = "general") => {
  if (!userId) return;
  console.log(`👤 [User Notification] Dispatching to User #${userId}: "${title}"`);
  try {
    await recordInAppNotifications([userId], title, body, type, data);

    const res = await pool.query(
      `SELECT fcm_token FROM users WHERE id = $1 AND fcm_token IS NOT NULL AND fcm_token != ''`,
      [userId]
    );
    const token = res.rows[0]?.fcm_token;
    if (token) {
      await sendNotification(token, title, body, data);
    } else {
      console.log(`ℹ️ [User Notification] User #${userId} has no registered FCM device token (in-app notification saved).`);
    }
  } catch (err) {
    console.error("❌ [User Notification] Error notifying user:", err.message);
  }
};

/**
 * Send notification to ALL other users except the creator (match challenge, tournament, ground)
 */
const notifyAllUsersExcept = async (excludeUserId, title, body, data = {}, type = "broadcast") => {
  console.log(`📢 [Broadcast Notification] Initiated by User #${excludeUserId}: "${title}"`);
  try {
    const res = await pool.query(
      `SELECT id, fcm_token FROM users WHERE id != $1`,
      [excludeUserId]
    );

    const userIds = res.rows.map((r) => r.id);
    const tokens = res.rows.map((r) => r.fcm_token).filter(Boolean);

    console.log(`📢 [Broadcast Notification] Target recipients: ${userIds.length} other registered users (${tokens.length} active device tokens).`);

    // 1. Record in-app notification for all other users
    await recordInAppNotifications(userIds, title, body, type, data);

    // 2. Send FCM Web Push notification to all other users
    if (tokens.length > 0) {
      const multicastResult = await sendMulticastNotification(tokens, title, body, data);
      console.log(`📢 [Broadcast Notification] Result: ${multicastResult?.successCount || 0}/${tokens.length} devices received push notification.`);
    } else {
      console.log("ℹ️ [Broadcast Notification] None of the other users currently have active FCM device tokens (in-app notifications saved for all).");
    }
  } catch (err) {
    console.error("❌ [Broadcast Notification] Delivery error:", err.message);
  }
};

/**
 * Send notification to the TEAMMATES of a user ONLY
 */
const notifyTeammatesOnly = async (userId, title, body, data = {}, type = "team") => {
  if (!userId) return;
  console.log(`👥 [Teammates Notification] Initiated for teammates of User #${userId}: "${title}"`);
  try {
    const userRes = await pool.query(
      `SELECT id, name, team_id, team_name, village_name, team_year FROM users WHERE id = $1`,
      [userId]
    );
    const user = userRes.rows[0];
    if (!user) {
      console.warn(`⚠️ [Teammates Notification] User #${userId} not found in database.`);
      return;
    }

    let teammates = [];

    if (user.team_id) {
      const res = await pool.query(
        `SELECT id, fcm_token FROM users WHERE team_id = $1 AND id != $2`,
        [user.team_id, userId]
      );
      teammates.push(...res.rows);
    }

    if (user.team_name && user.village_name && user.team_year) {
      const res = await pool.query(
        `SELECT id, fcm_token FROM users
         WHERE LOWER(TRIM(team_name)) = LOWER(TRIM($1))
           AND LOWER(TRIM(village_name)) = LOWER(TRIM($2))
           AND team_year = $3
           AND id != $4`,
        [user.team_name, user.village_name, user.team_year, userId]
      );
      teammates.push(...res.rows);
    } else if (user.team_name) {
      const res = await pool.query(
        `SELECT id, fcm_token FROM users
         WHERE LOWER(TRIM(team_name)) = LOWER(TRIM($1))
           AND id != $2`,
        [user.team_name, userId]
      );
      teammates.push(...res.rows);
    }

    // Deduplicate teammate user IDs
    const uniqueMap = new Map();
    for (const t of teammates) {
      if (!uniqueMap.has(t.id)) {
        uniqueMap.set(t.id, t);
      }
    }
    const uniqueTeammates = Array.from(uniqueMap.values());
    const teammateIds = uniqueTeammates.map((t) => t.id);
    const tokens = uniqueTeammates.map((t) => t.fcm_token).filter(Boolean);

    console.log(`👥 [Teammates Notification] User #${userId} belongs to "${user.team_name || "Unknown Team"}". Found ${teammateIds.length} teammates (${tokens.length} active device tokens).`);

    if (teammateIds.length === 0) {
      console.log(`ℹ️ [Teammates Notification] No other teammates found for User #${userId}.`);
      return;
    }

    // 1. Record in-app notification for teammates ONLY
    await recordInAppNotifications(teammateIds, title, body, type, data);

    // 2. Send FCM Web Push notification to teammates ONLY
    if (tokens.length > 0) {
      const multicastResult = await sendMulticastNotification(tokens, title, body, data);
      console.log(`👥 [Teammates Notification] Result: ${multicastResult?.successCount || 0}/${tokens.length} teammate devices received push notification.`);
    } else {
      console.log(`ℹ️ [Teammates Notification] Teammates of User #${userId} do not have active device tokens yet (in-app notifications saved).`);
    }
  } catch (err) {
    console.error("❌ [Teammates Notification] Delivery error:", err.message);
  }
};

/**
 * Sent to the CHALLENGE CREATOR when the challenged team accepts
 */
const notifyChallengeAccepted = async (creatorToken, accepterTeamName, data = {}) => {
  return sendNotification(
    creatorToken,
    "Challenge Accepted! 🏏",
    `${accepterTeamName} accepted your challenge`,
    { type: "challenge_accepted", ...data }
  );
};

/**
 * Sent to the CHALLENGE CREATOR when the challenged team cancels
 */
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
  sendMulticastNotification,
  notifyUser,
  notifyAllUsersExcept,
  notifyTeammatesOnly,
  notifyChallengeAccepted,
  notifyChallengeCancelled,
  recordInAppNotifications,
  ensureNotificationTable,
  getInAppNotifications,
  invalidateNotificationCache,
};