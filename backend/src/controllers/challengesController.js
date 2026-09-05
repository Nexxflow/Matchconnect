const pool = require("../config/db");
const asyncHandler = require("../utils/asyncHandler");
const {
  notifyChallengeAccepted,
  notifyChallengeCancelled,
  notifyAllUsersExcept,
  notifyTeammatesOnly,
  notifyUser,
} = require("../services/notificationService");

// ============================================================
// GET /api/challenges
// Public list of all challenges (open/accepted/cancelled/on_hold),
// most recently updated first. Joins ground lat/lng so the map can
// pin challenges that have a registered ground attached.
// ============================================================
const listChallenges = asyncHandler(async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT c.*, 
              u.name AS creator_name,
              g.latitude AS ground_lat, 
              g.longitude AS ground_lng,
              COALESCE(rs.reviews_count, 0) AS reviews_count,
              rs.reviews_avg,
              COALESCE(acc.accepted_count, 0) AS accepted_count,
              COALESCE(can.cancelled_count, 0) AS cancelled_count,
              lr.reviewer_name AS latest_reviewer_name,
              lr.reviewer_team_name AS latest_reviewer_team_name,
              lr.rating AS latest_review_rating,
              lr.review_text AS latest_review_text,
              lr.created_at AS latest_review_created_at
       FROM challenges c
       LEFT JOIN users u ON u.id = c.creator_id
       LEFT JOIN grounds g ON g.id = c.ground_id
       LEFT JOIN LATERAL (
         SELECT COUNT(*)::int AS reviews_count,
                ROUND(AVG(rating), 1)::float AS reviews_avg
         FROM team_reviews
         WHERE LOWER(TRIM(team_name)) = LOWER(TRIM(c.team_name))
            OR REGEXP_REPLACE(LOWER(TRIM(team_name)), '[[:space:]]+', ' ', 'g') = REGEXP_REPLACE(LOWER(TRIM(c.team_name)), '[[:space:]]+', ' ', 'g')
       ) rs ON true
       LEFT JOIN LATERAL (
         SELECT COUNT(*)::int AS accepted_count
         FROM challenges
         WHERE LOWER(TRIM(accepted_by_team_name)) = LOWER(TRIM(c.team_name))
            OR REGEXP_REPLACE(LOWER(TRIM(accepted_by_team_name)), '[[:space:]]+', ' ', 'g') = REGEXP_REPLACE(LOWER(TRIM(c.team_name)), '[[:space:]]+', ' ', 'g')
       ) acc ON true
       LEFT JOIN LATERAL (
         SELECT COUNT(*)::int AS cancelled_count
         FROM challenge_cancellations
         WHERE LOWER(TRIM(cancelled_by_team_name)) = LOWER(TRIM(c.team_name))
            OR REGEXP_REPLACE(LOWER(TRIM(cancelled_by_team_name)), '[[:space:]]+', ' ', 'g') = REGEXP_REPLACE(LOWER(TRIM(c.team_name)), '[[:space:]]+', ' ', 'g')
       ) can ON true
       LEFT JOIN LATERAL (
         SELECT id AS latest_review_id, reviewer_name, reviewer_team_name, rating::float AS rating, review_text, created_at
         FROM team_reviews
         WHERE LOWER(TRIM(team_name)) = LOWER(TRIM(c.team_name))
            OR REGEXP_REPLACE(LOWER(TRIM(team_name)), '[[:space:]]+', ' ', 'g') = REGEXP_REPLACE(LOWER(TRIM(c.team_name)), '[[:space:]]+', ' ', 'g')
         ORDER BY created_at DESC
         LIMIT 1
       ) lr ON true
       ORDER BY c.created_at DESC`
    );

    const challengesWithStats = rows.map(c => {
      const acc = Number(c.accepted_count) || 0;
      const can = Number(c.cancelled_count) || 0;
      let reliability = 5.0;
      if (can > 0) {
        const ratio = acc === 0 ? Math.max(0.2, 1.0 - (can * 0.25)) : acc / (acc + can * 1.25);
        reliability = Math.max(1.0, Math.min(5.0, 5.0 * ratio));
      } else if (acc > 0) {
        reliability = 5.0;
      }
      let overallRating = reliability;
      if (c.reviews_count > 0 && c.reviews_avg != null) {
        overallRating = Number(((reliability * 0.5) + (Number(c.reviews_avg) * 0.5)).toFixed(1));
      } else {
        overallRating = Number(reliability.toFixed(1));
      }
      return {
        ...c,
        team_rating: overallRating,
        reliability_score: Number(reliability.toFixed(1)),
        latest_review: (c.latest_review_text || c.latest_reviewer_name) ? {
          id: c.latest_review_id,
          reviewer_name: c.latest_reviewer_name || "Cricket Player",
          reviewer_team_name: c.latest_reviewer_team_name || null,
          rating: c.latest_review_rating != null ? Number(c.latest_review_rating) : 5.0,
          review_text: c.latest_review_text || "",
          created_at: c.latest_review_created_at || null,
        } : null,
      };
    });

    return res.json({ challenges: challengesWithStats });
  } catch (queryErr) {
    console.warn("⚠️ [listChallenges] Lateral join query warning:", queryErr.message);
    const fallbackRes = await pool.query(`
      SELECT c.*, 
             u.name AS creator_name,
             g.latitude AS ground_lat, 
             g.longitude AS ground_lng
      FROM challenges c
      LEFT JOIN users u ON u.id = c.creator_id
      LEFT JOIN grounds g ON g.id = c.ground_id
      ORDER BY c.created_at DESC
    `);
    const fallbackChallenges = fallbackRes.rows.map(c => ({
      ...c,
      team_rating: 5.0,
      reliability_score: 5.0,
      reviews_count: 0,
      reviews_avg: null,
      latest_review: null,
    }));
    return res.json({ challenges: fallbackChallenges });
  }
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

  const { rows } = await pool.query(
    `INSERT INTO challenges
       (team_name, contact_no, format, overs, match_date, time_slot,
        ground_id, ground_name, note, status, creator_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'open',$10)
     RETURNING *`,
    [team_name, contact_no, format, overs, match_date, time_slot, ground_id, ground_name, note, userId]
  );
  const challenge = rows[0];

  console.log(`🏏 [Challenge Created] Post #${challenge.id} created by User #${userId} (${team_name}). Sending broadcast notification to other users...`);

  // Broadcast web notification to ALL other users
  const oversText = overs ? ` (${overs} Overs)` : "";
  const venueText = ground_name ? ` at ${ground_name}` : "";
  notifyAllUsersExcept(
    userId,
    "New Match Challenge! 🏏",
    `${team_name} posted a ${format}${oversText} challenge for ${match_date}${venueText}`,
    { type: "new_challenge", challenge_id: String(challenge.id) },
    "challenge"
  ).catch((err) => console.error("Create challenge notification error:", err.message));

  res.status(201).json({ ok: true, challenge });
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

  // A user can only accept one challenge at a time.
  const cleanPhone = String(contact_no || "").replace(/\D/g, "");
  const last10 = cleanPhone.slice(-10);

  const activeExisting = await pool.query(
    `SELECT id, team_name, match_date, time_slot
     FROM challenges
     WHERE status = 'accepted'
       AND (
         accepted_by_user_id = $1
         OR ($2 != '' AND RIGHT(REGEXP_REPLACE(accepted_by_contact_no, '\\D', '', 'g'), 10) = $2)
         OR LOWER(TRIM(accepted_by_team_name)) = LOWER(TRIM($3))
       )
     LIMIT 1`,
    [userId, last10, team_name]
  );
  if (activeExisting.rows.length > 0) {
    const existing = activeExisting.rows[0];
    return res.status(400).json({
      error: `You already have an active accepted match challenge against ${existing.team_name} for ${existing.match_date}. You can only accept one challenge at a time. Cancel it in 'My Team' before accepting another.`
    });
  }

  const updated = await pool.query(
    `UPDATE challenges
     SET status = 'accepted',
         accepted_by_team_name = $1,
         accepted_by_contact_no = $2,
         accepted_by_user_id = $3
     WHERE id = $4
     RETURNING *`,
    [team_name, contact_no, userId, id]
  );

  // Log acceptance for team statistics and reliability rating boost
  await pool.query(
    `INSERT INTO challenge_acceptances (challenge_id, accepted_by_user_id, accepted_by_team_name, creator_team_name)
     VALUES ($1, $2, $3, $4)`,
    [id, userId, team_name, challenge.team_name]
  ).catch(err => console.error("Could not record challenge acceptance:", err.message));

  console.log(`🤝 [Challenge Accepted] Challenge #${id} accepted by User #${userId} (${team_name}). Dispatching targeted notifications to teammates and creator...`);

  // 1. Notify the challenge creator who posted the challenge
  notifyUser(
    challenge.creator_id,
    "Challenge Accepted! 🏏",
    `${team_name} accepted your challenge for ${challenge.match_date} (${challenge.time_slot})!`,
    { type: "challenge_accepted", challenge_id: String(id) },
    "challenge"
  ).catch((err) => console.error("Creator accept notification error:", err.message));

  // 2. Notify the challenge creator's teammates
  notifyTeammatesOnly(
    challenge.creator_id,
    "Our Match Challenge Accepted! 🏏",
    `${team_name} accepted our match challenge on ${challenge.match_date} (${challenge.time_slot})!`,
    { type: "team_challenge_accepted", challenge_id: String(id) },
    "challenge"
  ).catch((err) => console.error("Creator teammates notification error:", err.message));

  // 3. Notify the accepting team's teammates ONLY
  notifyTeammatesOnly(
    userId,
    "Match Challenge Accepted! 🤝",
    `Your team (${team_name}) accepted a match challenge against ${challenge.team_name} on ${challenge.match_date} (${challenge.time_slot})!`,
    { type: "teammate_challenge_accepted", challenge_id: String(id) },
    "challenge"
  ).catch((err) => console.error("Accepter teammates notification error:", err.message));

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

  // Determine which team cancelled the challenge
  let cancellingTeamName = challenge.accepted_by_team_name;
  if (challenge.creator_id === userId) {
    cancellingTeamName = challenge.team_name;
  } else if (!cancellingTeamName) {
    const uRes = await pool.query(`SELECT team_name FROM users WHERE id = $1`, [userId]);
    cancellingTeamName = uRes.rows[0]?.team_name || challenge.accepted_by_team_name || challenge.team_name;
  }

  // Record cancellation for team reliability rating deduction
  if (cancellingTeamName) {
    await pool.query(
      `INSERT INTO challenge_cancellations (challenge_id, cancelled_by_user_id, cancelled_by_team_name)
       VALUES ($1, $2, $3)`,
      [id, userId, cancellingTeamName]
    ).catch(err => console.error("Could not record challenge cancellation:", err.message));
  }

  const updated = await pool.query(
    `UPDATE challenges
     SET status = 'open',
         accepted_by_team_name = NULL,
         accepted_by_contact_no = NULL,
         accepted_by_user_id = NULL
     WHERE id = $1
     RETURNING *`,
    [id]
  );

  const creatorRes = await pool.query(`SELECT fcm_token FROM users WHERE id = $1`, [challenge.creator_id]);
  const creatorToken = creatorRes.rows[0]?.fcm_token;
  if (creatorToken) {
    await notifyChallengeCancelled(creatorToken, challenge.accepted_by_team_name || cancellingTeamName, { challenge_id: String(id) });
  }

  res.json({ ok: true, challenge: updated.rows[0] });
});

// ============================================================
// PUT /api/challenges/:id
// Update a challenge post (only by creator, only while open/on_hold).
// Body: { team_name, contact_no, format, overs, match_date, time_slot,
//         ground_id, ground_name, note }
// ============================================================
const updateChallenge = asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: "Not authenticated" });
  const { id } = req.params;

  const cRes = await pool.query(`SELECT * FROM challenges WHERE id = $1`, [id]);
  if (cRes.rows.length === 0) return res.status(404).json({ error: "Challenge not found" });
  const challenge = cRes.rows[0];

  if (challenge.creator_id !== userId) {
    return res.status(403).json({ error: "Only the challenge creator can edit it" });
  }

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

  const updated = await pool.query(
    `UPDATE challenges
     SET team_name = $1,
         contact_no = $2,
         format = $3,
         overs = $4,
         match_date = $5,
         time_slot = $6,
         ground_id = $7,
         ground_name = $8,
         note = $9
     WHERE id = $10
     RETURNING *`,
    [team_name, contact_no, format, overs, match_date, time_slot, ground_id, ground_name, note, id]
  );

  res.json({ ok: true, challenge: updated.rows[0] });
});

module.exports = {
  listChallenges,
  createChallenge,
  updateChallenge,
  deleteChallenge,
  acceptChallenge,
  cancelChallenge,
};