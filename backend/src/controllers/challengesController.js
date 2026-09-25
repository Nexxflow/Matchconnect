const pool = require("../config/db");
const asyncHandler = require("../utils/asyncHandler");
const {
  notifyChallengeAccepted,
  notifyChallengeCancelled,
  notifyAllUsersExcept,
  notifyTeammatesOnly,
  notifyUser,
} = require("../services/notificationService");

// Helper to normalize challenge slot strictly to "Morning" or "Afternoon"
function getChallengeSlot(c = {}) {
  if (!c) return "Morning";
  // Explicit slot property takes precedence if valid
  if (c.slot && typeof c.slot === "string" && c.slot.trim()) {
    const s = c.slot.trim().toLowerCase();
    if (s.includes("afternoon") || s.includes("pm") || s.includes("evening")) return "Afternoon";
    if (s.includes("morning") || s.includes("am")) return "Morning";
  }
  const t = c.time_slot || c.time;
  if (t) {
    const s = String(t).trim().toLowerCase();
    if (s.includes("afternoon") || s.includes("evening")) return "Afternoon";
    if (s.includes("morning")) return "Morning";
    const match = s.match(/^(\d{1,2}):(\d{2})\s*(am|pm)?/i);
    if (match) {
      let hour = parseInt(match[1], 10);
      const period = match[3] ? match[3].toUpperCase() : null;
      if (period === "PM" && hour !== 12) hour += 12;
      if (period === "AM" && hour === 12) hour = 0;
      return hour >= 12 ? "Afternoon" : "Morning";
    }
    const shortMatch = s.match(/^(\d{1,2})\s*(am|pm)/i);
    if (shortMatch) {
      let hour = parseInt(shortMatch[1], 10);
      const period = shortMatch[2].toUpperCase();
      if (period === "PM" && hour !== 12) hour += 12;
      if (period === "AM" && hour === 12) hour = 0;
      return hour >= 12 ? "Afternoon" : "Morning";
    }
    const numOnly = s.match(/^(\d{1,2})$/);
    if (numOnly) {
      const hour = parseInt(numOnly[1], 10);
      return hour >= 12 ? "Afternoon" : "Morning";
    }
  }
  return "Morning";
}

// ============================================================
// GET /api/challenges
// Public list of all challenges (open/accepted/cancelled/on_hold),
// most recently updated first. Joins ground lat/lng so the map can
// pin challenges that have a registered ground attached.
// ============================================================
const listChallenges = asyncHandler(async (req, res) => {
  const userId = req.user?.id || null;
  const userPhone = req.user?.phone || null;
  const cleanPhone = String(userPhone || "").replace(/\D/g, "");
  const last10 = cleanPhone ? cleanPhone.slice(-10) : null;

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
              lr.created_at AS latest_review_created_at,
              COALESCE(preq.pending_requests_count, 0)::int AS pending_requests_count,
              COALESCE(pend_reqs.list, '[]'::json) AS pending_requests,
              my_req.status AS my_request_status,
              my_req.id AS my_request_id
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
         WHERE (LOWER(TRIM(accepted_by_team_name)) = LOWER(TRIM(c.team_name))
            OR REGEXP_REPLACE(LOWER(TRIM(accepted_by_team_name)), '[[:space:]]+', ' ', 'g') = REGEXP_REPLACE(LOWER(TRIM(c.team_name)), '[[:space:]]+', ' ', 'g'))
            AND status = 'accepted'
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
       LEFT JOIN LATERAL (
         SELECT COUNT(*)::int AS pending_requests_count
         FROM challenge_requests
         WHERE challenge_id = c.id AND LOWER(TRIM(COALESCE(status, ''))) = 'pending'
       ) preq ON true
       LEFT JOIN LATERAL (
         SELECT COALESCE(
           json_agg(
             json_build_object(
               'id', cr.id,
               'challenge_id', cr.challenge_id,
               'user_id', cr.user_id,
               'team_name', cr.team_name,
               'contact_no', cr.contact_no,
               'user_name', COALESCE(cr.user_name, u2.name, 'Captain'),
               'village_name', COALESCE(cr.village_name, u2.village_name),
               'message', cr.message,
               'status', cr.status,
               'created_at', cr.created_at
             ) ORDER BY cr.created_at ASC
           ),
           '[]'::json
         ) AS list
         FROM challenge_requests cr
         LEFT JOIN users u2 ON u2.id = cr.user_id
         WHERE cr.challenge_id = c.id AND LOWER(TRIM(COALESCE(cr.status, ''))) = 'pending'
       ) pend_reqs ON true
       LEFT JOIN LATERAL (
         SELECT cr.status, cr.id
         FROM challenge_requests cr
         WHERE cr.challenge_id = c.id
           AND (cr.status IS NULL OR LOWER(TRIM(cr.status)) != 'withdrawn')
           AND ($1::int IS NOT NULL AND (cr.user_id = $1 OR ($2::text IS NOT NULL AND RIGHT(REGEXP_REPLACE(cr.contact_no, '\\D', '', 'g'), 10) = $2)))
         ORDER BY cr.created_at DESC
         LIMIT 1
       ) my_req ON true
       WHERE c.status != 'cancelled' AND c.status != 'on_hold'
       ORDER BY c.created_at DESC`,
      [userId, last10]
    );

    const challengesWithStats = rows.map(c => {
      const acc = Number(c.accepted_count) || 0;
      const can = Number(c.cancelled_count) || 0;
      // Reliability Score: Base 5.0, +0.1 per accept, -0.2 per cancel (range 1.0 to 5.0)
      const reliability = Math.max(1.0, Math.min(5.0, Number((5.0 + (acc * 0.1) - (can * 0.2)).toFixed(1))));

      // Rating must be calculated by user feedback ratings, not by cancel and accept challenges
      const hasReviews = Number(c.reviews_count) > 0 && c.reviews_avg != null;
      const overallRating = hasReviews ? Number(Number(c.reviews_avg).toFixed(1)) : 5.0;

      return {
        ...c,
        pending_requests_count: Number(c.pending_requests_count) || 0,
        pending_requests: Array.isArray(c.pending_requests) ? c.pending_requests : [],
        my_request_status: c.my_request_status || null,
        my_request_id: c.my_request_id || null,
        team_rating: overallRating,
        reliability_score: reliability,
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
      WHERE c.status != 'cancelled' AND c.status != 'on_hold'
      ORDER BY c.created_at DESC
    `);
    const fallbackChallenges = fallbackRes.rows.map(c => ({
      ...c,
      pending_requests_count: 0,
      pending_requests: [],
      my_request_status: null,
      my_request_id: null,
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
    slot = null,
    ground_id = null,
    ground_name = null,
    note = null,
  } = req.body;

  if (!team_name || !contact_no || !format || !match_date || !time_slot) {
    return res.status(400).json({
      error: "team_name, contact_no, format, match_date and time_slot are required",
    });
  }

  const determinedSlot = getChallengeSlot({ time_slot });

  const userPhone = req.user?.phone || contact_no || "";
  const userClean = String(userPhone).replace(/\D/g, "");
  const userLast10 = userClean.slice(-10);
  const userTeam = team_name;

  // Rule 1: A user can post only 1 challenge for Morning and 1 for Afternoon per day.
  // Cannot post 2 challenges for the same slot on the same day, or post if already confirmed for that slot.
  const existingSlotChallenge = await pool.query(
    `SELECT id, team_name, match_date, time_slot, slot, status
     FROM challenges
     WHERE status != 'cancelled'
       AND match_date::date = $1::date
       AND LOWER(COALESCE(NULLIF(slot, ''), CASE WHEN (SUBSTRING(time_slot FROM '^[0-9]+')::int >= 12 OR time_slot ILIKE '%PM%' OR time_slot ILIKE '%afternoon%') THEN 'Afternoon' ELSE 'Morning' END)) = LOWER($2)
       AND (
         creator_id = $3
         OR ($4 != '' AND RIGHT(REGEXP_REPLACE(contact_no, '\\D', '', 'g'), 10) = $4)
         OR LOWER(TRIM(team_name)) = LOWER(TRIM($5))
         OR (status = 'accepted' AND (
           accepted_by_user_id = $3
           OR ($4 != '' AND RIGHT(REGEXP_REPLACE(accepted_by_contact_no, '\\D', '', 'g'), 10) = $4)
           OR LOWER(TRIM(accepted_by_team_name)) = LOWER(TRIM($5))
         ))
       )
     LIMIT 1`,
    [match_date, determinedSlot, userId, userLast10, userTeam]
  );

  if (existingSlotChallenge.rows.length > 0) {
    const existing = existingSlotChallenge.rows[0];
    if (existing.status === 'accepted') {
      return res.status(400).json({
        error: `You already have a confirmed match on this date (${match_date}) in the ${determinedSlot} slot. Only one match can be scheduled per session.`
      });
    }
    return res.status(400).json({
      error: `You already have an active challenge posted for this date (${match_date}) in the ${determinedSlot} slot. You can only post one challenge for Morning and one for Afternoon per day.`
    });
  }

  const { rows } = await pool.query(
    `INSERT INTO challenges
       (team_name, contact_no, format, overs, match_date, time_slot, slot,
        ground_id, ground_name, note, status, creator_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'open',$11)
     RETURNING *`,
    [team_name, contact_no, format, overs, match_date, time_slot, determinedSlot, ground_id, ground_name, note, userId]
  );
  const challenge = rows[0];

  console.log(`🏏 [Challenge Created] Post #${challenge.id} (${determinedSlot}) created by User #${userId} (${team_name}). Sending broadcast notification to other users...`);

  // Broadcast web notification to ALL other users
  const oversText = overs ? ` (${overs} Overs)` : "";
  const venueText = ground_name ? ` at ${ground_name}` : "";
  notifyAllUsersExcept(
    userId,
    "New Match Challenge! 🏏",
    `${team_name} posted a ${format}${oversText} challenge for ${match_date} (${determinedSlot})${venueText}`,
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
// POST /api/challenges/:id/request
// Body: { team_name, contact_no, message, village_name }
// Called by a team wanting to accept/request a challenge match.
// Creates a pending request in challenge_requests and notifies
// the challenge creator to review and accept/reject.
// ============================================================
const requestChallenge = asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: "Not authenticated" });
  const { id } = req.params;
  const { team_name, contact_no, message = null, village_name = null } = req.body;

  if (!team_name || !contact_no) {
    return res.status(400).json({ error: "team_name and contact_no are required" });
  }

  const cRes = await pool.query(`SELECT * FROM challenges WHERE id = $1`, [id]);
  if (cRes.rows.length === 0) return res.status(404).json({ error: "Challenge not found" });
  const challenge = cRes.rows[0];

  if (challenge.status !== "open" && challenge.status !== "on_hold") {
    return res.status(400).json({ error: "This challenge is no longer open" });
  }

  // A team cannot accept or request its own posted challenge
  if (challenge.creator_id === userId) {
    return res.status(400).json({ error: "You cannot accept or request your own challenge" });
  }

  const targetDate = challenge.match_date;
  const targetSlot = getChallengeSlot(challenge);

  const cleanPhone = String(contact_no || "").replace(/\D/g, "");
  const last10 = cleanPhone.slice(-10);

  // Conflict validation:
  // Cannot request if user already has an active confirmed match on same date & same slot (Morning / Afternoon)
  const activeExisting = await pool.query(
    `SELECT id, team_name, match_date, time_slot, slot
     FROM challenges
     WHERE status = 'accepted'
       AND match_date::date = $4::date
       AND LOWER(COALESCE(NULLIF(slot, ''), CASE WHEN (SUBSTRING(time_slot FROM '^[0-9]+')::int >= 12 OR time_slot ILIKE '%PM%' OR time_slot ILIKE '%afternoon%') THEN 'Afternoon' ELSE 'Morning' END)) = LOWER($5)
       AND (
         accepted_by_user_id = $1
         OR ($2 != '' AND RIGHT(REGEXP_REPLACE(accepted_by_contact_no, '\\D', '', 'g'), 10) = $2)
         OR LOWER(TRIM(accepted_by_team_name)) = LOWER(TRIM($3))
         OR creator_id = $1
         OR ($2 != '' AND RIGHT(REGEXP_REPLACE(contact_no, '\\D', '', 'g'), 10) = $2)
         OR LOWER(TRIM(team_name)) = LOWER(TRIM($3))
       )
     LIMIT 1`,
    [userId, last10, team_name, targetDate, targetSlot]
  );
  if (activeExisting.rows.length > 0) {
    const existing = activeExisting.rows[0];
    const otherSlot = targetSlot === "Morning" ? "Afternoon" : "Morning";
    return res.status(400).json({
      error: `You already have a confirmed match against ${existing.team_name} on this date (${existing.match_date}) in the ${targetSlot} slot. You cannot send requests for an already booked slot. You can still request challenges in the ${otherSlot} slot or on other dates.`
    });
  }

  // Conflict validation for Challenge Host:
  // Cannot request if the challenge host already has an active confirmed match on this date & slot
  const hostConflict = await pool.query(
    `SELECT id, team_name, match_date, time_slot, slot
     FROM challenges
     WHERE status = 'accepted'
       AND id != $3
       AND match_date::date = $1::date
       AND LOWER(COALESCE(NULLIF(slot, ''), CASE WHEN (SUBSTRING(time_slot FROM '^[0-9]+')::int >= 12 OR time_slot ILIKE '%PM%' OR time_slot ILIKE '%afternoon%') THEN 'Afternoon' ELSE 'Morning' END)) = LOWER($2)
       AND (
         creator_id = $4
         OR accepted_by_user_id = $4
         OR LOWER(TRIM(team_name)) = LOWER(TRIM($5))
         OR LOWER(TRIM(accepted_by_team_name)) = LOWER(TRIM($5))
       )
     LIMIT 1`,
    [targetDate, targetSlot, id, challenge.creator_id, challenge.team_name]
  );
  if (hostConflict.rows.length > 0) {
    return res.status(400).json({
      error: `The host team (${challenge.team_name}) already has a confirmed match on this date in the ${targetSlot} slot.`
    });
  }

  const existingReq = await pool.query(
    `SELECT id, status FROM challenge_requests
     WHERE challenge_id = $1 AND (user_id = $2 OR ($3 != '' AND RIGHT(REGEXP_REPLACE(contact_no, '\\D', '', 'g'), 10) = $3))`,
    [id, userId, last10]
  );

  let requestId = null;
  const userName = req.user?.name || null;
  const finalVillage = village_name || req.user?.village_name || null;

  if (existingReq.rows.length > 0) {
    const cur = existingReq.rows[0];
    if (cur.status === "pending") {
      return res.status(400).json({ error: "You already have a pending request for this match challenge. Please wait for the opponent captain to review." });
    }
    if (cur.status === "accepted") {
      return res.status(400).json({ error: "Your request is already accepted and confirmed!" });
    }
    // Re-request if previously rejected or withdrawn
    await pool.query(
      `UPDATE challenge_requests
       SET status = 'pending',
           team_name = $1,
           contact_no = $2,
           user_name = $3,
           village_name = $4,
           message = $5,
           created_at = now(),
           updated_at = now()
       WHERE id = $6`,
      [team_name, contact_no, userName, finalVillage, message, cur.id]
    );
    requestId = cur.id;
  } else {
    const insRes = await pool.query(
      `INSERT INTO challenge_requests (challenge_id, user_id, team_name, contact_no, user_name, village_name, message, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
       RETURNING id`,
      [id, userId, team_name, contact_no, userName, finalVillage, message]
    );
    requestId = insRes.rows[0].id;
  }

  console.log(`🤝 [Challenge Request] Challenge #${id} (${targetSlot}) requested by User #${userId} (${team_name}). Sending notification to creator #${challenge.creator_id}...`);

  // 1. Notify Challenge Creator
  notifyUser(
    challenge.creator_id,
    "New Match Challenge Request! 🏏",
    `Team "${team_name}" wants to accept your challenge for ${challenge.match_date} (${targetSlot}, ${challenge.time_slot})! Click to review and accept.`,
    { type: "challenge_request", challenge_id: String(id), request_id: String(requestId) },
    "challenge"
  ).catch((err) => console.error("Challenge request notification error:", err.message));

  // 2. Notify Requester Teammates
  notifyTeammatesOnly(
    userId,
    "Match Request Sent 🤝",
    `Your team (${team_name}) requested to play vs ${challenge.team_name} on ${challenge.match_date} (${targetSlot})! Waiting for their captain to accept.`,
    { type: "challenge_request_sent", challenge_id: String(id) },
    "challenge"
  ).catch((err) => console.error("Teammates request notification error:", err.message));

  res.status(201).json({
    ok: true,
    message: `Match request sent to ${challenge.team_name}! The captain will review and accept your request.`,
    status: "pending",
    request_id: requestId,
    challenge: {
      ...challenge,
      my_request_status: "pending",
      my_request_id: requestId,
    }
  });
});

// Alias for backwards compatibility
const acceptChallenge = requestChallenge;

// ============================================================
// GET /api/challenges/:id/requests
// Fetch all pending incoming requests for a challenge (creator only).
// ============================================================
const getChallengeRequests = asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: "Not authenticated" });
  const { id } = req.params;

  const cRes = await pool.query(`SELECT * FROM challenges WHERE id = $1`, [id]);
  if (cRes.rows.length === 0) return res.status(404).json({ error: "Challenge not found" });
  const challenge = cRes.rows[0];

  if (challenge.creator_id !== userId) {
    return res.status(403).json({ error: "Only the challenge creator can view incoming requests" });
  }

  const { rows } = await pool.query(
    `SELECT cr.*, u.name AS user_name, u.phone AS user_phone, u.village_name
     FROM challenge_requests cr
     LEFT JOIN users u ON u.id = cr.user_id
     WHERE cr.challenge_id = $1 AND cr.status = 'pending'
     ORDER BY cr.created_at ASC`,
    [id]
  );

  res.json({ requests: rows });
});

// ============================================================
// POST /api/challenges/:id/requests/:requestId/accept
// Called by Challenge Creator to accept an incoming team request.
// Confirms the match, rejects other pending requests, and notifies all parties.
// ============================================================
const acceptChallengeRequest = asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: "Not authenticated" });
  const { id, requestId } = req.params;

  const cRes = await pool.query(`SELECT * FROM challenges WHERE id = $1`, [id]);
  if (cRes.rows.length === 0) return res.status(404).json({ error: "Challenge not found" });
  const challenge = cRes.rows[0];

  if (challenge.creator_id !== userId) {
    return res.status(403).json({ error: "Only the challenge creator can accept requests" });
  }

  if (challenge.status !== "open" && challenge.status !== "on_hold") {
    return res.status(400).json({ error: "This challenge is already confirmed or closed" });
  }

  const rRes = await pool.query(`SELECT * FROM challenge_requests WHERE id = $1 AND challenge_id = $2`, [requestId, id]);
  if (rRes.rows.length === 0) return res.status(404).json({ error: "Request not found" });
  const request = rRes.rows[0];

  if (request.status !== "pending") {
    return res.status(400).json({ error: `This request is already ${request.status}` });
  }

  const targetSlot = getChallengeSlot(challenge);
  const targetDate = challenge.match_date;

  // 1. Conflict validation for Challenge Creator:
  // Creator cannot accept a request if they already have another confirmed match on the same date & slot
  const creatorPhone = req.user?.phone || challenge.contact_no || "";
  const creatorClean = String(creatorPhone).replace(/\D/g, "");
  const creatorLast10 = creatorClean.slice(-10);
  const creatorTeam = challenge.team_name;

  const creatorConflict = await pool.query(
    `SELECT id, team_name, match_date, time_slot, slot
     FROM challenges
     WHERE status = 'accepted'
       AND id != $4
       AND match_date::date = $5::date
       AND LOWER(COALESCE(NULLIF(slot, ''), CASE WHEN (SUBSTRING(time_slot FROM '^[0-9]+')::int >= 12 OR time_slot ILIKE '%PM%' OR time_slot ILIKE '%afternoon%') THEN 'Afternoon' ELSE 'Morning' END)) = LOWER($6)
       AND (
         creator_id = $1
         OR ($2 != '' AND RIGHT(REGEXP_REPLACE(contact_no, '\\D', '', 'g'), 10) = $2)
         OR LOWER(TRIM(team_name)) = LOWER(TRIM($3))
         OR accepted_by_user_id = $1
         OR ($2 != '' AND RIGHT(REGEXP_REPLACE(accepted_by_contact_no, '\\D', '', 'g'), 10) = $2)
         OR LOWER(TRIM(accepted_by_team_name)) = LOWER(TRIM($3))
       )
     LIMIT 1`,
    [userId, creatorLast10, creatorTeam, id, targetDate, targetSlot]
  );
  if (creatorConflict.rows.length > 0) {
    return res.status(400).json({
      error: `You already have a confirmed match on this date (${targetDate}) in the ${targetSlot} slot. You cannot accept another challenge for this slot.`
    });
  }

  // 2. Conflict validation for Requesting Team:
  // If requester already has a confirmed match on this date & slot, auto-clear this request
  const reqClean = String(request.contact_no || "").replace(/\D/g, "");
  const reqLast10 = reqClean.slice(-10);
  const reqTeam = request.team_name;

  const requesterConflict = await pool.query(
    `SELECT id, team_name, match_date, time_slot, slot
     FROM challenges
     WHERE status = 'accepted'
       AND match_date::date = $4::date
       AND LOWER(COALESCE(NULLIF(slot, ''), CASE WHEN (SUBSTRING(time_slot FROM '^[0-9]+')::int >= 12 OR time_slot ILIKE '%PM%' OR time_slot ILIKE '%afternoon%') THEN 'Afternoon' ELSE 'Morning' END)) = LOWER($5)
       AND (
         creator_id = $1
         OR ($2 != '' AND RIGHT(REGEXP_REPLACE(contact_no, '\\D', '', 'g'), 10) = $2)
         OR LOWER(TRIM(team_name)) = LOWER(TRIM($3))
         OR accepted_by_user_id = $1
         OR ($2 != '' AND RIGHT(REGEXP_REPLACE(accepted_by_contact_no, '\\D', '', 'g'), 10) = $2)
         OR LOWER(TRIM(accepted_by_team_name)) = LOWER(TRIM($3))
       )
     LIMIT 1`,
    [request.user_id, reqLast10, reqTeam, targetDate, targetSlot]
  );
  if (requesterConflict.rows.length > 0) {
    await pool.query(`UPDATE challenge_requests SET status = 'withdrawn', updated_at = now() WHERE id = $1`, [requestId]);
    return res.status(400).json({
      error: `Team "${reqTeam}" already has a confirmed match on this date (${targetDate}) in the ${targetSlot} slot. This request has been automatically cleared.`
    });
  }

  // 3. Mark this request accepted
  await pool.query(`UPDATE challenge_requests SET status = 'accepted', updated_at = now() WHERE id = $1`, [requestId]);

  // 4. Mark challenge accepted with this team
  const updChallenge = await pool.query(
    `UPDATE challenges
     SET status = 'accepted',
         accepted_by_team_name = $1,
         accepted_by_contact_no = $2,
         accepted_by_user_id = $3,
         slot = $4
     WHERE id = $5
     RETURNING *`,
    [request.team_name, request.contact_no, request.user_id, targetSlot, id]
  );
  const updated = updChallenge.rows[0];

  // 5. Mark all other pending requests for THIS challenge as rejected (match is now booked)
  const otherPendingRes = await pool.query(
    `UPDATE challenge_requests
     SET status = 'rejected', updated_at = now()
     WHERE challenge_id = $1 AND id != $2 AND status = 'pending'
     RETURNING id, user_id, team_name`,
    [id, requestId]
  );

  // 6. CLEAR ALL OTHER PENDING REQUESTS ON THIS EXACT TIMING (SAME DATE & SAME MORNING / AFTERNOON SLOT):
  // (a) For the accepted requester (Team B): withdraw all other pending requests they sent for this date & slot
  const clearedRequesterReqs = await pool.query(
    `UPDATE challenge_requests cr
     SET status = 'withdrawn', updated_at = now()
     FROM challenges c
     WHERE cr.challenge_id = c.id
       AND cr.id != $1
       AND cr.status = 'pending'
       AND c.match_date::date = $2::date
       AND LOWER(COALESCE(NULLIF(c.slot, ''), CASE WHEN (SUBSTRING(c.time_slot FROM '^[0-9]+')::int >= 12 OR c.time_slot ILIKE '%PM%' OR c.time_slot ILIKE '%afternoon%') THEN 'Afternoon' ELSE 'Morning' END)) = LOWER($3)
       AND (
         ($4::int IS NOT NULL AND cr.user_id = $4)
         OR ($5::text != '' AND RIGHT(REGEXP_REPLACE(cr.contact_no, '\\D', '', 'g'), 10) = $5)
         OR LOWER(TRIM(cr.team_name)) = LOWER(TRIM($6))
       )
     RETURNING cr.id, cr.challenge_id, cr.user_id, cr.team_name, c.creator_id, c.team_name AS host_team_name`,
    [requestId, targetDate, targetSlot, request.user_id, reqLast10, reqTeam]
  );

  // (b) For the challenge creator (Team A): withdraw any pending requests they sent to other challenges on this date & slot
  const clearedCreatorReqs = await pool.query(
    `UPDATE challenge_requests cr
     SET status = 'withdrawn', updated_at = now()
     FROM challenges c
     WHERE cr.challenge_id = c.id
       AND cr.status = 'pending'
       AND c.match_date::date = $1::date
       AND LOWER(COALESCE(NULLIF(c.slot, ''), CASE WHEN (SUBSTRING(c.time_slot FROM '^[0-9]+')::int >= 12 OR c.time_slot ILIKE '%PM%' OR c.time_slot ILIKE '%afternoon%') THEN 'Afternoon' ELSE 'Morning' END)) = LOWER($2)
       AND (
         ($3::int IS NOT NULL AND cr.user_id = $3)
         OR ($4::text != '' AND RIGHT(REGEXP_REPLACE(cr.contact_no, '\\D', '', 'g'), 10) = $4)
         OR LOWER(TRIM(cr.team_name)) = LOWER(TRIM($5))
       )
     RETURNING cr.id, cr.challenge_id, cr.user_id, cr.team_name, c.creator_id, c.team_name AS host_team_name`,
    [targetDate, targetSlot, challenge.creator_id, creatorLast10, creatorTeam]
  );

  // 6c. Put any other OPEN challenges created by either team on this date & slot ON HOLD so they disappear until cancelled
  const putOnHoldRes = await pool.query(
    `UPDATE challenges
     SET status = 'on_hold'
     WHERE id != $1
       AND status = 'open'
       AND match_date::date = $2::date
       AND LOWER(COALESCE(NULLIF(slot, ''), CASE WHEN (SUBSTRING(time_slot FROM '^[0-9]+')::int >= 12 OR time_slot ILIKE '%PM%' OR time_slot ILIKE '%afternoon%') THEN 'Afternoon' ELSE 'Morning' END)) = LOWER($3)
       AND (
         (creator_id IS NOT NULL AND creator_id IN ($4, $5))
         OR ($6 != '' AND RIGHT(REGEXP_REPLACE(contact_no, '\\D', '', 'g'), 10) IN ($6, $7))
         OR LOWER(TRIM(team_name)) IN (LOWER(TRIM($8)), LOWER(TRIM($9)))
       )
     RETURNING id, team_name, creator_id`,
    [
      id,
      targetDate,
      targetSlot,
      challenge.creator_id || -1,
      request.user_id || -1,
      creatorLast10 || '___',
      reqLast10 || '___',
      creatorTeam || '',
      reqTeam || ''
    ]
  );
  if (putOnHoldRes.rowCount > 0) {
    console.log(`⏸️ [Challenge Put On Hold] Put ${putOnHoldRes.rowCount} competing open challenges on hold for date ${targetDate} (${targetSlot}). They will disappear until match is cancelled.`);
  }

  // 7. Log acceptance for reliability and statistics
  await pool.query(
    `INSERT INTO challenge_acceptances (challenge_id, accepted_by_user_id, accepted_by_team_name, creator_team_name)
     VALUES ($1, $2, $3, $4)`,
    [id, request.user_id, request.team_name, challenge.team_name]
  ).catch(err => console.error("Could not record challenge acceptance:", err.message));

  console.log(`🏆 [Challenge Request Accepted] Challenge #${id} accepted for Team "${request.team_name}". Cleared ${clearedRequesterReqs.rowCount} other requester requests on ${targetSlot} slot. Dispatching notifications...`);

  // 8. Notifications:
  // (a) Notify accepted requester
  if (request.user_id) {
    notifyUser(
      request.user_id,
      "Match Confirmed! 🎉🏏",
      `Your request to play against ${challenge.team_name} on ${challenge.match_date} (${targetSlot}, ${challenge.time_slot}) was ACCEPTED! Match is confirmed. Other requests for this slot have been cleared.`,
      { type: "challenge_accepted", challenge_id: String(id) },
      "challenge"
    ).catch(err => console.error("Notification error:", err.message));

    // (b) Notify accepted requester's teammates
    notifyTeammatesOnly(
      request.user_id,
      "Match Confirmed! 🎉🏏",
      `Our match against ${challenge.team_name} is confirmed for ${challenge.match_date} (${targetSlot}, ${challenge.time_slot})!`,
      { type: "team_challenge_accepted", challenge_id: String(id) },
      "challenge"
    ).catch(err => console.error("Notification error:", err.message));
  }

  // (c) Notify challenge creator's teammates
  notifyTeammatesOnly(
    challenge.creator_id,
    "Our Match Confirmed! 🏏",
    `Our match challenge against ${request.team_name} is confirmed for ${challenge.match_date} (${targetSlot}, ${challenge.time_slot})!`,
    { type: "team_challenge_accepted", challenge_id: String(id) },
    "challenge"
  ).catch(err => console.error("Notification error:", err.message));

  // (d) Notify other teams whose requests on THIS challenge were rejected
  for (const other of otherPendingRes.rows) {
    if (other.user_id) {
      notifyUser(
        other.user_id,
        "Challenge Request Closed",
        `The match challenge against ${challenge.team_name} for ${challenge.match_date} was booked by another team. Explore other challenges in Find Match!`,
        { type: "challenge_request_rejected", challenge_id: String(id) },
        "challenge"
      ).catch(() => {});
    }
  }

  // (e) Notify creators of other challenges whose pending requests from Team B were automatically cleared
  for (const cleared of clearedRequesterReqs.rows) {
    if (cleared.creator_id) {
      notifyUser(
        cleared.creator_id,
        "Challenge Request Cleared",
        `Team "${cleared.team_name}" confirmed another match for ${challenge.match_date} (${targetSlot}), so their request to play vs your team was automatically cleared.`,
        { type: "challenge_request_cleared", challenge_id: String(cleared.challenge_id) },
        "challenge"
      ).catch(() => {});
    }
  }

  // (f) Notify creators of other challenges whose pending requests from Team A were automatically cleared
  for (const cleared of clearedCreatorReqs.rows) {
    if (cleared.creator_id) {
      notifyUser(
        cleared.creator_id,
        "Challenge Request Cleared",
        `Team "${cleared.team_name}" confirmed another match for ${challenge.match_date} (${targetSlot}), so their request to play vs your team was automatically cleared.`,
        { type: "challenge_request_cleared", challenge_id: String(cleared.challenge_id) },
        "challenge"
      ).catch(() => {});
    }
  }

  res.json({
    ok: true,
    message: `Challenge confirmed with ${request.team_name}!`,
    challenge: updated,
    cleared_requests_count: (clearedRequesterReqs.rowCount || 0) + (clearedCreatorReqs.rowCount || 0),
  });
});

// ============================================================
// POST /api/challenges/:id/requests/:requestId/reject
// Called by Challenge Creator to decline an incoming team request.
// Challenge remains open; notification dispatched to rejected user.
// ============================================================
const rejectChallengeRequest = asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: "Not authenticated" });
  const { id, requestId } = req.params;

  const cRes = await pool.query(`SELECT * FROM challenges WHERE id = $1`, [id]);
  if (cRes.rows.length === 0) return res.status(404).json({ error: "Challenge not found" });
  const challenge = cRes.rows[0];

  if (challenge.creator_id !== userId) {
    return res.status(403).json({ error: "Only the challenge creator can decline requests" });
  }

  const rRes = await pool.query(`SELECT * FROM challenge_requests WHERE id = $1 AND challenge_id = $2`, [requestId, id]);
  if (rRes.rows.length === 0) return res.status(404).json({ error: "Request not found" });
  const request = rRes.rows[0];

  await pool.query(`UPDATE challenge_requests SET status = 'rejected', updated_at = now() WHERE id = $1`, [requestId]);

  const targetSlot = getChallengeSlot(challenge);

  // Notify rejected user and teammates
  if (request.user_id) {
    notifyUser(
      request.user_id,
      "Challenge Request Declined ❌",
      `${challenge.team_name} declined your match request for ${challenge.match_date} (${targetSlot}). You can explore other challenges in Find Match.`,
      { type: "challenge_request_rejected", challenge_id: String(id) },
      "challenge"
    ).catch(err => console.error("Notification error:", err.message));

    notifyTeammatesOnly(
      request.user_id,
      "Challenge Request Declined ❌",
      `Request to play against ${challenge.team_name} on ${challenge.match_date} was declined.`,
      { type: "challenge_request_rejected", challenge_id: String(id) },
      "challenge"
    ).catch(err => console.error("Notification error:", err.message));
  }

  const pendRes = await pool.query(
    `SELECT cr.*, u.name AS user_name, u.phone AS user_phone, u.village_name
     FROM challenge_requests cr
     LEFT JOIN users u ON u.id = cr.user_id
     WHERE cr.challenge_id = $1 AND cr.status = 'pending'
     ORDER BY cr.created_at ASC`,
    [id]
  );

  res.json({
    ok: true,
    message: `Request from "${request.team_name}" declined`,
    pending_requests: pendRes.rows,
    pending_requests_count: pendRes.rows.length,
  });
});

// ============================================================
// POST /api/challenges/:id/requests/cancel
// Called by Requester to withdraw their pending match request.
// ============================================================
const cancelChallengeRequest = asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: "Not authenticated" });
  const { id } = req.params;

  const cRes = await pool.query(`SELECT * FROM challenges WHERE id = $1`, [id]);
  if (cRes.rows.length === 0) return res.status(404).json({ error: "Challenge not found" });
  const challenge = cRes.rows[0];

  const cleanPhone = String(req.user.phone || "").replace(/\D/g, "");
  const last10 = cleanPhone.slice(-10);

  const reqCheck = await pool.query(
    `SELECT * FROM challenge_requests
     WHERE challenge_id = $1 AND (user_id = $2 OR ($3 != '' AND RIGHT(REGEXP_REPLACE(contact_no, '\\D', '', 'g'), 10) = $3))
       AND status = 'pending'`,
    [id, userId, last10]
  );

  if (reqCheck.rows.length === 0) {
    return res.status(404).json({ error: "No pending request found to cancel" });
  }

  const userReq = reqCheck.rows[0];
  await pool.query(`UPDATE challenge_requests SET status = 'withdrawn', updated_at = now() WHERE id = $1`, [userReq.id]);

  // Notify creator that request was withdrawn
  notifyUser(
    challenge.creator_id,
    "Challenge Request Withdrawn",
    `Team "${userReq.team_name}" withdrew their match request for ${challenge.match_date}.`,
    { type: "challenge_request_cancelled", challenge_id: String(id) },
    "challenge"
  ).catch(() => {});

  res.json({
    ok: true,
    message: "Match request cancelled successfully",
  });
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

  // Clear accepted request status so teams can re-request
  await pool.query(
    `UPDATE challenge_requests
     SET status = 'withdrawn', updated_at = now()
     WHERE challenge_id = $1 AND status = 'accepted'`,
    [id]
  ).catch(() => {});

  const targetSlot = getChallengeSlot(challenge);
  const targetDate = challenge.match_date;
  const creatorClean = String(challenge.contact_no || "").replace(/\D/g, "");
  const creatorLast10 = creatorClean.slice(-10);
  const creatorTeam = challenge.team_name || "";

  const acceptedClean = String(challenge.accepted_by_contact_no || "").replace(/\D/g, "");
  const acceptedLast10 = acceptedClean.slice(-10);
  const acceptedTeam = challenge.accepted_by_team_name || "";

  // Restore any challenges put on hold for either team on this date & slot back to 'open'
  const restoredRes = await pool.query(
    `UPDATE challenges
     SET status = 'open'
     WHERE id != $1
       AND status = 'on_hold'
       AND match_date::date = $2::date
       AND LOWER(COALESCE(NULLIF(slot, ''), CASE WHEN (SUBSTRING(time_slot FROM '^[0-9]+')::int >= 12 OR time_slot ILIKE '%PM%' OR time_slot ILIKE '%afternoon%') THEN 'Afternoon' ELSE 'Morning' END)) = LOWER($3)
       AND (
         (creator_id IS NOT NULL AND creator_id IN ($4, $5))
         OR ($6 != '' AND RIGHT(REGEXP_REPLACE(contact_no, '\\D', '', 'g'), 10) IN ($6, $7))
         OR LOWER(TRIM(team_name)) IN (LOWER(TRIM($8)), LOWER(TRIM($9)))
       )
     RETURNING id, team_name, creator_id`,
    [
      id,
      targetDate,
      targetSlot,
      challenge.creator_id || -1,
      challenge.accepted_by_user_id || -1,
      creatorLast10 || '___',
      acceptedLast10 || '___',
      creatorTeam,
      acceptedTeam
    ]
  ).catch(err => console.error("Could not restore on-hold challenges:", err.message));

  if (restoredRes && restoredRes.rowCount > 0) {
    console.log(`▶️ [Challenge Reopened] Restored ${restoredRes.rowCount} challenges from on_hold to open on ${targetDate} (${targetSlot}).`);
  }

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
    slot = null,
    ground_id = null,
    ground_name = null,
    note = null,
  } = req.body;

  if (!team_name || !contact_no || !format || !match_date || !time_slot) {
    return res.status(400).json({
      error: "team_name, contact_no, format, match_date and time_slot are required",
    });
  }

  const determinedSlot = getChallengeSlot({ time_slot });

  const userPhone = req.user?.phone || contact_no || challenge.contact_no || "";
  const userClean = String(userPhone).replace(/\D/g, "");
  const userLast10 = userClean.slice(-10);
  const userTeam = team_name;

  const conflictCheck = await pool.query(
    `SELECT id, team_name, match_date, time_slot, slot, status
     FROM challenges
     WHERE id != $1
       AND status != 'cancelled'
       AND match_date::date = $2::date
       AND LOWER(COALESCE(NULLIF(slot, ''), CASE WHEN (SUBSTRING(time_slot FROM '^[0-9]+')::int >= 12 OR time_slot ILIKE '%PM%' OR time_slot ILIKE '%afternoon%') THEN 'Afternoon' ELSE 'Morning' END)) = LOWER($3)
       AND (
         creator_id = $4
         OR ($5 != '' AND RIGHT(REGEXP_REPLACE(contact_no, '\\D', '', 'g'), 10) = $5)
         OR LOWER(TRIM(team_name)) = LOWER(TRIM($6))
         OR (status = 'accepted' AND (
           accepted_by_user_id = $4
           OR ($5 != '' AND RIGHT(REGEXP_REPLACE(accepted_by_contact_no, '\\D', '', 'g'), 10) = $5)
           OR LOWER(TRIM(accepted_by_team_name)) = LOWER(TRIM($6))
         ))
       )
     LIMIT 1`,
    [id, match_date, determinedSlot, userId, userLast10, userTeam]
  );

  if (conflictCheck.rows.length > 0) {
    const existing = conflictCheck.rows[0];
    if (existing.status === 'accepted') {
      return res.status(400).json({
        error: `You already have a confirmed match on ${match_date} in the ${determinedSlot} slot.`
      });
    }
    return res.status(400).json({
      error: `You already have another challenge for ${match_date} in the ${determinedSlot} slot. You can only post one challenge for Morning and one for Afternoon per day.`
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
         slot = $7,
         ground_id = $8,
         ground_name = $9,
         note = $10
     WHERE id = $11
     RETURNING *`,
    [team_name, contact_no, format, overs, match_date, time_slot, determinedSlot, ground_id, ground_name, note, id]
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
  requestChallenge,
  getChallengeRequests,
  acceptChallengeRequest,
  rejectChallengeRequest,
  cancelChallengeRequest,
};