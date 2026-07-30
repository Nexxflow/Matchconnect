const pool = require("../config/db");
const asyncHandler = require("../utils/asyncHandler");
const {
  notifyChallengeAccepted,
  notifyChallengeCancelled,
} = require("../services/notificationService");

// ============================================================
// GET /api/challenges
// Lists challenges relevant to the logged-in user: ones they sent
// (created_by = me) and ones sent to them (challenged_user_id = me),
// most recent first. Status stays whatever the match row already uses
// (e.g. 'pending_challenge', 'challenge_accepted', 'challenge_cancelled').
// ============================================================
const listChallenges = asyncHandler(async (req, res) => {
  console.log("req.user in listChallenges:", req.user);
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: "Not authenticated" });

  const { rows } = await pool.query(
    `SELECT m.*, t1.name AS team1_name, t2.name AS team2_name
     FROM matches m
     JOIN teams t1 ON t1.id = m.team1_id
     JOIN teams t2 ON t2.id = m.team2_id
     WHERE (m.created_by = $1 OR m.challenged_user_id = $1)
       AND m.status IN ('pending_challenge', 'challenge_accepted', 'challenge_cancelled')
     ORDER BY m.updated_at DESC NULLS LAST, m.created_at DESC`,
    [userId]
  );

  res.json({ challenges: rows });
});

// ============================================================
// POST /api/challenges
// Body: { team1_id, team2_id, challenged_user_id, venue, overs_limit }
// Creates a new challenge (a matches row in 'pending_challenge' status)
// from the logged-in user to another user's team.
// ============================================================
const createChallenge = asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: "Not authenticated" });

  const { team1_id, team2_id, challenged_user_id, venue = null, overs_limit = 20 } = req.body;

  if (!team1_id || !team2_id || !challenged_user_id) {
    return res.status(400).json({ error: "team1_id, team2_id and challenged_user_id are required" });
  }

  const { rows } = await pool.query(
    `INSERT INTO matches (team1_id, team2_id, venue, overs_limit, status, created_by, challenged_user_id)
     VALUES ($1,$2,$3,$4,'pending_challenge',$5,$6)
     RETURNING *`,
    [team1_id, team2_id, venue, overs_limit, userId, challenged_user_id]
  );

  res.status(201).json({ ok: true, challenge: rows[0] });
});

// ============================================================
// DELETE /api/challenges/:id
// Only the person who sent the challenge can delete/withdraw it, and
// only while it's still pending (not yet accepted).
// ============================================================
const deleteChallenge = asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: "Not authenticated" });
  const { id } = req.params;

  const matchRes = await pool.query(`SELECT * FROM matches WHERE id = $1`, [id]);
  if (matchRes.rows.length === 0) return res.status(404).json({ error: "Challenge not found" });
  const match = matchRes.rows[0];

  if (match.created_by !== userId) {
    return res.status(403).json({ error: "Only the challenge creator can delete it" });
  }
  if (match.status !== "pending_challenge") {
    return res.status(400).json({ error: "Only a still-pending challenge can be deleted" });
  }

  await pool.query(`DELETE FROM matches WHERE id = $1`, [id]);
  res.json({ ok: true });
});

// ============================================================
// POST /api/matches/:matchId/accept-challenge
// Called by the challenged user. Flips status to 'challenge_accepted'
// and notifies the user who originally posted the challenge.
// ============================================================
const acceptChallenge = asyncHandler(async (req, res) => {
  const { matchId } = req.params;

  const matchRes = await pool.query(
    `SELECT m.*, t1.name AS team1_name, t2.name AS team2_name,
            creator.fcm_token AS creator_token,
            challenged_team.name AS challenged_team_name
     FROM matches m
     JOIN teams t1 ON t1.id = m.team1_id
     JOIN teams t2 ON t2.id = m.team2_id
     JOIN users creator ON creator.id = m.created_by
     JOIN teams challenged_team
       ON challenged_team.id = CASE
            WHEN m.challenged_user_id = m.created_by THEN m.team1_id
            ELSE m.team2_id
          END
     WHERE m.id = $1`,
    [matchId]
  );
  if (matchRes.rows.length === 0) {
    return res.status(404).json({ error: "Match not found" });
  }
  const match = matchRes.rows[0];

  const updated = await pool.query(
    `UPDATE matches SET status = 'challenge_accepted', updated_at = now()
     WHERE id = $1 RETURNING *`,
    [matchId]
  );

  await notifyChallengeAccepted(match.creator_token, match.challenged_team_name, {
    match_id: String(matchId),
  });

  res.json({ ok: true, match: updated.rows[0] });
});

// ============================================================
// POST /api/matches/:matchId/cancel-challenge
// Called by the challenged user (or the creator) to withdraw/decline.
// Notifies the original creator that the challenge was cancelled.
// ============================================================
const cancelChallenge = asyncHandler(async (req, res) => {
  const { matchId } = req.params;

  const matchRes = await pool.query(
    `SELECT m.*, t1.name AS team1_name, t2.name AS team2_name,
            creator.fcm_token AS creator_token,
            challenged_team.name AS challenged_team_name
     FROM matches m
     JOIN teams t1 ON t1.id = m.team1_id
     JOIN teams t2 ON t2.id = m.team2_id
     JOIN users creator ON creator.id = m.created_by
     JOIN teams challenged_team
       ON challenged_team.id = CASE
            WHEN m.challenged_user_id = m.created_by THEN m.team1_id
            ELSE m.team2_id
          END
     WHERE m.id = $1`,
    [matchId]
  );
  if (matchRes.rows.length === 0) {
    return res.status(404).json({ error: "Match not found" });
  }
  const match = matchRes.rows[0];

  const updated = await pool.query(
    `UPDATE matches SET status = 'challenge_cancelled', updated_at = now()
     WHERE id = $1 RETURNING *`,
    [matchId]
  );

  await notifyChallengeCancelled(match.creator_token, match.challenged_team_name, {
    match_id: String(matchId),
  });

  res.json({ ok: true, match: updated.rows[0] });
});

module.exports = {
  listChallenges,
  createChallenge,
  deleteChallenge,
  acceptChallenge,
  cancelChallenge,
};