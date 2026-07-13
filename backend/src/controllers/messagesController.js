const pool = require("../config/db");
const asyncHandler = require("../utils/asyncHandler");
const { sendNotification } = require("../services/notificationService");

// Only the two teams on a challenge (its creator and whoever accepted it)
// are allowed to see or send messages for it.
async function assertParticipant(challengeId, userId) {
  const result = await pool.query(
    "SELECT creator_id, accepted_by_user_id, team_name, accepted_by_team_name FROM challenges WHERE id = $1",
    [challengeId]
  );
  const challenge = result.rows[0];
  if (!challenge) return { ok: false, status: 404, error: "Challenge not found" };

  // Compare as strings — creator_id/accepted_by_user_id come back from
  // Postgres as numbers, while req.user.id (from the JWT) may be a string.
  // A strict !== between "12" and 12 would otherwise wrongly block the
  // second participant (whoever accepted the challenge) from messaging.
  const uid = String(userId);
  const isCreator = String(challenge.creator_id) === uid;
  const isAccepter = challenge.accepted_by_user_id !== null && String(challenge.accepted_by_user_id) === uid;

  if (!isCreator && !isAccepter) {
    return { ok: false, status: 403, error: "You're not part of this match" };
  }

  const myTeamName = isCreator ? challenge.team_name : challenge.accepted_by_team_name;
  return { ok: true, challenge, myTeamName };
}

// GET /api/challenges/:id/messages
const listMessages = asyncHandler(async (req, res) => {
  const check = await assertParticipant(req.params.id, req.user.id);
  if (!check.ok) return res.status(check.status).json({ error: check.error });

  const result = await pool.query(
    "SELECT * FROM messages WHERE challenge_id = $1 ORDER BY created_at ASC",
    [req.params.id]
  );
  res.json({ messages: result.rows });
});

// POST /api/challenges/:id/messages  Body: { body }
const sendMessage = asyncHandler(async (req, res) => {
  const { body } = req.body;

  if (!body || !body.trim()) {
    return res.status(400).json({
      error: "Message body is required",
    });
  }

  const check = await assertParticipant(req.params.id, req.user.id);

  if (!check.ok) {
    return res.status(check.status).json({
      error: check.error,
    });
  }

  // Save message
  const result = await pool.query(
    `
    INSERT INTO messages
    (
      challenge_id,
      sender_id,
      sender_team_name,
      body
    )
    VALUES
    ($1,$2,$3,$4)
    RETURNING *
    `,
    [
      req.params.id,
      req.user.id,
      check.myTeamName,
      body.trim(),
    ]
  );

  // ======================================
  // Send Firebase Notification
  // ======================================

  try {
    // Determine receiver
    const receiverId =
      String(req.user.id) === String(check.challenge.creator_id)
        ? check.challenge.accepted_by_user_id
        : check.challenge.creator_id;

    if (receiverId) {
      const userResult = await pool.query(
        `
        SELECT
          id,
          name,
          fcm_token
        FROM users
        WHERE id=$1
        `,
        [receiverId]
      );

      if (userResult.rows.length > 0) {
        const receiver = userResult.rows[0];

        console.log("Chat Receiver:", receiver);

        if (receiver.fcm_token) {
          const response = await sendNotification(
            receiver.fcm_token,
            "💬 New Message",
            `${check.myTeamName}: ${body.trim()}`,
            {
              type: "chat_message",
              challengeId: String(req.params.id),
              senderId: String(req.user.id),
            }
          );

          console.log("=================================");
          console.log("✅ Chat Notification Sent");
          console.log("Receiver:", receiver.id);
          console.log("Firebase Response:", response);
          console.log("=================================");
        } else {
          console.log("=================================");
          console.log("⚠️ Receiver has no FCM token");
          console.log("Receiver:", receiver.id);
          console.log("=================================");
        }
      }
    }
  } catch (err) {
    console.error("=================================");
    console.error("❌ Chat Notification Error");
    console.error(err);
    console.error("=================================");
  }

  return res.status(201).json({
    success: true,
    message: result.rows[0],
  });
});

module.exports = { listMessages, sendMessage };