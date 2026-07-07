const pool = require("../config/db");
const asyncHandler = require("../utils/asyncHandler");

// A user has an "active" challenge if they're the creator of one that's
// still open or accepted, or they're the team that accepted one that's
// still accepted. While that's true, they can't post a new challenge or
// accept someone else's.
async function findActiveChallengeForUser(userId, excludeChallengeId = null) {
  const result = await pool.query(
    `SELECT id FROM challenges
     WHERE (
       (creator_id = $1 AND status IN ('open', 'accepted'))
       OR (accepted_by_user_id = $1 AND status = 'accepted')
     )
     AND ($2::uuid IS NULL OR id != $2::uuid)
     LIMIT 1`,
    [userId, excludeChallengeId]
  );
  return result.rows[0] || null;
}

// GET /api/challenges?format=T20&status=open
const listChallenges = asyncHandler(async (req, res) => {
  const { format, status } = req.query;
  const conditions = [];
  const values = [];

  if (format) {
    values.push(format);
    conditions.push(`c.format = $${values.length}`);
  }
  // Only filter by status when explicitly requested — otherwise this
  // silently defaulted to 'open' and hid accepted challenges from every
  // unfiltered fetch (including the initial app load), so they'd vanish
  // from the client's state on refresh.
  if (status) {
    values.push(status);
    conditions.push(`c.status = $${values.length}`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const result = await pool.query(
    `SELECT c.*, g.name AS ground_name
     FROM challenges c
     LEFT JOIN grounds g ON c.ground_id = g.id
     ${where}
     ORDER BY c.urgent DESC, c.match_date ASC`,
    values
  );
  res.json({ challenges: result.rows });
});

// POST /api/challenges  Body: { team_name, contact_no, format, match_date, time_slot, ground_id, urgent, note }
const createChallenge = asyncHandler(async (req, res) => {
  const { team_name, contact_no, format, match_date, time_slot, ground_id, urgent, note } = req.body;
  if (!team_name || !team_name.trim() || !format || !match_date || !time_slot) {
    return res.status(400).json({ error: "team_name, format, match_date and time_slot are required" });
  }
  if (!contact_no || !/^[0-9]{10,15}$/.test(contact_no.trim())) {
    return res.status(400).json({ error: "A valid contact number (10-15 digits) is required" });
  }

  // One active challenge per user — can't post a new one while you already
  // have an open challenge waiting, or a match you've already locked in.
  const active = await findActiveChallengeForUser(req.user.id);
  if (active) {
    return res.status(409).json({ error: "You already have an active challenge. Cancel it before posting a new one." });
  }

  const result = await pool.query(
    `INSERT INTO challenges (team_name, contact_no, format, match_date, time_slot, ground_id, urgent, note, creator_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
    [team_name.trim(), contact_no.trim(), format, match_date, time_slot, ground_id || null, urgent || false, note || null, req.user.id]
  );
  res.status(201).json({ challenge: result.rows[0] });
});

// POST /api/challenges/:id/accept  Body: { team_name, contact_no }
const acceptChallenge = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { team_name, contact_no } = req.body;
  if (!team_name || !team_name.trim()) return res.status(400).json({ error: "team_name is required" });
  if (!contact_no || !/^[0-9]{10,15}$/.test(contact_no.trim())) {
    return res.status(400).json({ error: "A valid contact number (10-15 digits) is required" });
  }

  // Can't accept a challenge you posted yourself.
  const target = await pool.query("SELECT creator_id, status FROM challenges WHERE id = $1", [id]);
  const challenge = target.rows[0];
  if (!challenge) return res.status(404).json({ error: "Challenge not found" });
  if (challenge.creator_id === req.user.id) {
    return res.status(400).json({ error: "You can't accept your own challenge" });
  }
  if (challenge.status !== "open") {
    return res.status(409).json({ error: "Challenge is no longer open" });
  }

  // One active challenge per user — can't accept a second match while
  // you're already locked into one (as either the poster or the accepter).
  const active = await findActiveChallengeForUser(req.user.id, id);
  if (active) {
    return res.status(409).json({ error: "You already have an active match. Cancel it before accepting another." });
  }

  const result = await pool.query(
    `UPDATE challenges
     SET status = 'accepted', accepted_by_team_name = $1, accepted_by_contact_no = $2, accepted_by_user_id = $3
     WHERE id = $4 AND status = 'open' RETURNING *`,
    [team_name.trim(), contact_no.trim(), req.user.id, id]
  );
  if (result.rows.length === 0) {
    return res.status(409).json({ error: "Challenge is no longer open" });
  }
  res.json({ challenge: result.rows[0] });
});

// POST /api/challenges/:id/cancel
const cancelChallenge = asyncHandler(async (req, res) => {
  const result = await pool.query(
    `UPDATE challenges
     SET status = 'open', accepted_by_team_name = NULL, accepted_by_contact_no = NULL, accepted_by_user_id = NULL
     WHERE id = $1 RETURNING *`,
    [req.params.id]
  );
  if (result.rows.length === 0) return res.status(404).json({ error: "Challenge not found" });
  res.json({ challenge: result.rows[0] });
});

module.exports = { listChallenges, createChallenge, acceptChallenge, cancelChallenge };