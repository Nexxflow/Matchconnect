const pool = require("../config/db");
const asyncHandler = require("../utils/asyncHandler");
const {
  notifyChallengeAccepted,
  notifyChallengeCancelled,
} = require("../services/notificationService");

// ============================================================
// GET /api/challenges
// Public list of all challenges (open/accepted/cancelled/on_hold),
// most recently updated first. Joins ground lat/lng so the map can
// pin challenges that have a registered ground attached.
// ============================================================
const listChallenges = asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    `SELECT c.*, u.name AS creator_name,
            g.latitude AS ground_lat, g.longitude AS ground_lng
     FROM challenges c
     LEFT JOIN users u ON u.id = c.creator_id
     LEFT JOIN grounds g ON g.id = c.ground_id
     ORDER BY c.created_at DESC`
  );
  res.json({ challenges: rows });
});

// ============================================================
// POST /api/challenges
// Body: { team_name, contact_no, format, overs, match_date, time_slot,
//         ground_id, ground_name, note }
// Creates an open challenge post from the logged-in user.
// ============================================================
const createChallenge = asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: "Not authenticated" });

  const {
    team_name,
    contact_no,
    format,
    overs = null,
    match_date,
    time_slot,
    ground_id = null,
    ground_name = null,
    note = null,
  } = req.body;

  if (!team_name || !contact_no || !format || !match_date || !time_slot) {
    return res.status(400).json({
      error: "team_name, contact_no, format, match_date and time_slot are required",
    });
  }

  // A team (by phone) can't have two active challenges on the same date
  const conflict = await pool.query(
    `SELECT id FROM challenges
     WHERE (contact_no = $1 OR accepted_by_contact_no = $1)
       AND match_date = $2
       AND status IN ('open', 'on_hold', 'accepted')`,
    [contact_no, match_date]
  );
  if (conflict.rows.length > 0) {
    return res.status(400).json({ error: "Your team already has an active challenge on this date" });
  }

  const { rows } = await pool.query(
    `INSERT INTO challenges
       (team_name, contact_no, format, overs, match_date, time_slot,
        ground_id, ground_name, note, status, creator_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'open',$10)
     RETURNING *`,
    [team_name, contact_no, format, overs, match_date, time_slot, ground_id, ground_name, note, userId]
  );

  res.status(201).json({ ok: true, challenge: rows[0] });
});

// ============================================================
// DELETE /api/challenges/:id
// Only the creator can delete, and only while still open.
// ============================================================
const deleteChallenge = asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: "Not authenticated" });
  const { id } = req.params;

  const cRes = await pool.query(`SELECT * FROM challenges WHERE id = $1`, [id]);
  if (cRes.rows.length === 0) return res.status(404).json({ error: "Challenge not found" });
  const challenge = cRes.rows[0];

  if (challenge.creator_id !== userId) {
    return res.status(403).json({ error: "Only the challenge creator can delete it" });
  }
  if (challenge.status !== "open") {
    return res.status(400).json({ error: "Only a still-open challenge can be deleted" });
  }

  await pool.query(`DELETE FROM challenges WHERE id = $1`, [id]);
  res.json({ ok: true });
});

// ============================================================
// POST /api/challenges/:id/accept
// Body: { team_name, contact_no }
// Called by the accepting user. Notifies the original poster.
// ============================================================
const acceptChallenge = asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: "Not authenticated" });
  const { id } = req.params;
  const { team_name, contact_no } = req.body;

  if (!team_name || !contact_no) {
    return res.status(400).json({ error: "team_name and contact_no are required" });
  }

  const cRes = await pool.query(`SELECT * FROM challenges WHERE id = $1`, [id]);
  if (cRes.rows.length === 0) return res.status(404).json({ error: "Challenge not found" });
  const challenge = cRes.rows[0];

  if (challenge.status !== "open") {
    return res.status(400).json({ error: "This challenge is no longer open" });
  }

  // A team cannot accept its own posted challenge. Checking creator_id is
  // the authoritative guard here (the frontend's phone-based list filter
  // is just a UI convenience and shouldn't be the only thing preventing this).
  if (challenge.creator_id === userId) {
    return res.status(400).json({ error: "You can't accept your own challenge" });
  }

  const updated = await pool.query(
    `UPDATE challenges
     SET status = 'accepted',
         accepted_by_team_name = $1,
         accepted_by_contact_no = $2,
         accepted_by_user_id = $3,
         updated_at = now()
     WHERE id = $4
     RETURNING *`,
    [team_name, contact_no, userId, id]
  );

  const creatorRes = await pool.query(`SELECT fcm_token FROM users WHERE id = $1`, [challenge.creator_id]);
  const creatorToken = creatorRes.rows[0]?.fcm_token;
  if (creatorToken) {
    await notifyChallengeAccepted(creatorToken, team_name, { challenge_id: String(id) });
  }

  res.json({ ok: true, challenge: updated.rows[0] });
});

// ============================================================
// POST /api/challenges/:id/cancel
// Called from "My Team" once a match is accepted. Reopens the
// challenge (clears the accepted_by_* fields) so it can be
// re-accepted, and notifies the original poster.
// ============================================================
const cancelChallenge = asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: "Not authenticated" });
  const { id } = req.params;

  const cRes = await pool.query(`SELECT * FROM challenges WHERE id = $1`, [id]);
  if (cRes.rows.length === 0) return res.status(404).json({ error: "Challenge not found" });
  const challenge = cRes.rows[0];

  const updated = await pool.query(
    `UPDATE challenges
     SET status = 'open',
         accepted_by_team_name = NULL,
         accepted_by_contact_no = NULL,
         accepted_by_user_id = NULL,
         updated_at = now()
     WHERE id = $1
     RETURNING *`,
    [id]
  );

  const creatorRes = await pool.query(`SELECT fcm_token FROM users WHERE id = $1`, [challenge.creator_id]);
  const creatorToken = creatorRes.rows[0]?.fcm_token;
  if (creatorToken) {
    await notifyChallengeCancelled(creatorToken, challenge.accepted_by_team_name, { challenge_id: String(id) });
  }

  res.json({ ok: true, challenge: updated.rows[0] });
});

module.exports = {
  listChallenges,
  createChallenge,
  deleteChallenge,
  acceptChallenge,
  cancelChallenge,
};