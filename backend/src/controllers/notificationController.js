const {
  sendNotification,
  getInAppNotifications,
  invalidateNotificationCache,
} = require("../services/notificationService");
const db = require("../config/db");

exports.sendTestNotification = async (req, res) => {
  try {
    const { token } = req.body;
    await sendNotification(token, "MatchConnect", "Firebase Notification Working!");
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Called on every successful login
exports.saveFcmToken = async (req, res) => {
  try {
    const userId = req.user.id;
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: "token is required" });

    // 1. If this device token was previously attached to a different account, clear it
    await db.query(
      "UPDATE users SET fcm_token = NULL WHERE fcm_token = $1 AND id != $2",
      [token, userId]
    );

    // 2. Assign device token strictly to the current authenticated user
    await db.query(
      "UPDATE users SET fcm_token = $1 WHERE id = $2",
      [token, userId]
    );

    console.log(`🔑 [FCM Token] Synced device token exclusively for User #${userId}.`);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Called on logout
exports.clearFcmToken = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (userId) {
      await db.query("UPDATE users SET fcm_token = NULL WHERE id = $1", [userId]);
      console.log(`🔑 [FCM Token] Cleared device token for User #${userId} on logout.`);
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET /api/notifications
// Return the current user's in-app notifications
exports.getNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const notifications = await getInAppNotifications(userId);
    res.json({ notifications });
  } catch (error) {
    console.error("❌ getNotifications error:", error.message);
    res.json({ notifications: [] });
  }
};

// PUT /api/notifications/mark-read
// Mark all notifications as read for current user
exports.markNotificationsAsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    await db.query(
      `UPDATE in_app_notifications
       SET is_read = true
       WHERE user_id = $1 AND is_read = false`,
      [userId]
    );
    invalidateNotificationCache(userId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// PUT /api/notifications/:id/read
// Mark a single notification as read
exports.markSingleNotificationAsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    await db.query(
      `UPDATE in_app_notifications
       SET is_read = true
       WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );
    invalidateNotificationCache(userId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// DELETE /api/notifications
// Clear all notifications for current user
exports.clearAllNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    await db.query(
      `DELETE FROM in_app_notifications WHERE user_id = $1`,
      [userId]
    );
    invalidateNotificationCache(userId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};