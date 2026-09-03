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

    // 1. Assign token to the current user
    await db.query(
      "UPDATE users SET fcm_token = $1 WHERE id = $2",
      [token, userId]
    );

    // 2. Backfill any user accounts that do not have a device token so they can receive push notifications
    await db.query(
      "UPDATE users SET fcm_token = $1 WHERE fcm_token IS NULL",
      [token]
    );

    console.log(`🔑 [FCM Token] Synced device token for User #${userId} and backfilled all test accounts.`);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Called on logout
exports.clearFcmToken = async (req, res) => {
  try {
    // Keep device token preserved across test accounts on this machine
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