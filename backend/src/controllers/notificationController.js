const { sendNotification } = require("../services/notificationService");
const db = require("../config/db"); // ← adjust this path to wherever your db pool/client actually lives

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
    const userId = req.user.id; // set by your auth middleware
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: "token is required" });

    // 1. Wipe this token off any OTHER user's row first.
    //    This is what makes the previous user's fcm_token become NULL
    //    automatically when a new user logs in on the same device/token.
    await db.query(
      "UPDATE users SET fcm_token = NULL WHERE fcm_token = $1 AND id <> $2",
      [token, userId]
    );

    // 2. Assign the token to the currently logging-in user.
    await db.query(
      "UPDATE users SET fcm_token = $1 WHERE id = $2",
      [token, userId]
    );

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Called on logout — only clears the token if it's still the one on record
// for this user, so a stale logout call can't wipe a token a newer login
// already reassigned elsewhere.
exports.clearFcmToken = async (req, res) => {
  try {
    const userId = req.user.id;
    const { token } = req.body; // client sends the token it currently holds

    if (token) {
      await db.query(
        "UPDATE users SET fcm_token = NULL WHERE id = $1 AND fcm_token = $2",
        [userId, token]
      );
    } else {
      await db.query(
        "UPDATE users SET fcm_token = NULL WHERE id = $1",
        [userId]
      );
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};