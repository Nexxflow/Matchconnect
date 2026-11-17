const pool = require("../config/db");
const asyncHandler = require("../utils/asyncHandler");
const { notifyTeamOfFeedback, notifyReviewReply } = require("../services/notificationService");

// Returns the team owned by the logged-in user, or { team: null } if they
// haven't registered one yet. Used by the frontend to default the "team
// name" field and to know whether "include my team" is even possible,
// without the client ever needing to know its own team's UUID.
const getMyTeam = asyncHandler(async (req, res) => {
  if (!req.user?.id) return res.status(401).json({ error: "Not logged in" });

  const uRes = await pool.query(`SELECT id, team_name, team_id FROM users WHERE id = $1`, [req.user.id]);
  const u = uRes.rows[0];

  let team = null;
  if (u?.team_id) {
    const tRes = await pool.query(`SELECT * FROM teams WHERE id = $1`, [u.team_id]);
    team = tRes.rows[0] || null;
  }

  if (!team) {
    try {
      const tRes = await pool.query(`SELECT * FROM teams WHERE owner_id::text = $1::text OR created_by = $2 LIMIT 1`, [String(req.user.id), req.user.id]);
      team = tRes.rows[0] || null;
    } catch {
      const tRes = await pool.query(`SELECT * FROM teams WHERE owner_id::text = $1::text LIMIT 1`, [String(req.user.id)]).catch(() => ({ rows: [] }));
      team = tRes.rows[0] || null;
    }
  }

  if (!team && u?.team_name?.trim()) {
    const tRes = await pool.query(
      `SELECT * FROM teams WHERE LOWER(TRIM(name)) = LOWER(TRIM($1)) LIMIT 1`,
      [u.team_name.trim()]
    );
    team = tRes.rows[0] || null;
  }

  res.json({ team });
});

// ============================================================
// GET /api/teams/details?team_name=...
// Returns complete team profile, match stats (posted, booked, accepted),
// cancellations, dynamic reliability rating, and feedback reviews.
// ============================================================
const getTeamDetails = asyncHandler(async (req, res) => {
  const teamName = (req.query.team_name || req.params.teamName || "").trim();
  if (!teamName) {
    return res.status(400).json({ error: "team_name query or parameter is required" });
  }

  // 1. Fetch team record or creator user record
  let teamInfo = {
    name: teamName,
    captain_name: null,
    contact_no: null,
    village_name: null,
    established_year: null,
    verified: false,
  };

  const tRes = await pool.query(
    `SELECT * FROM teams WHERE LOWER(TRIM(name)) = LOWER(TRIM($1)) LIMIT 1`,
    [teamName]
  );
  if (tRes.rows.length > 0) {
    const t = tRes.rows[0];
    teamInfo.established_year = t.established_year || null;
    teamInfo.verified = !!t.verified;
    teamInfo.specialty = t.specialty || null;
  }

  // Find user associated with this team
  const uRes = await pool.query(
    `SELECT id, name, phone, village_name, team_year FROM users
     WHERE LOWER(TRIM(team_name)) = LOWER(TRIM($1))
     ORDER BY id ASC LIMIT 1`,
    [teamName]
  );
  if (uRes.rows.length > 0) {
    const u = uRes.rows[0];
    teamInfo.captain_name = u.name;
    teamInfo.contact_no = u.phone;
    teamInfo.village_name = u.village_name || null;
    teamInfo.established_year = teamInfo.established_year || u.team_year || null;
  }

  // Fallback to recent challenge poster contact info
  const chPoster = await pool.query(
    `SELECT contact_no, creator_id, u.name as poster_name
     FROM challenges c
     LEFT JOIN users u ON u.id = c.creator_id
     WHERE LOWER(TRIM(c.team_name)) = LOWER(TRIM($1))
     ORDER BY c.created_at DESC LIMIT 1`,
    [teamName]
  );
  if (chPoster.rows.length > 0) {
    const cp = chPoster.rows[0];
    if (!teamInfo.contact_no) teamInfo.contact_no = cp.contact_no;
    if (!teamInfo.captain_name) teamInfo.captain_name = cp.poster_name;
  }

  // 2. Stats calculation with resilient fallbacks
  // A) Challenges Posted: Total challenge posts by this team
  let challengesPosted = 0;
  try {
    const postedRes = await pool.query(
      `SELECT COUNT(*)::int AS count FROM challenges
       WHERE LOWER(TRIM(team_name)) = LOWER(TRIM($1))`,
      [teamName]
    );
    challengesPosted = postedRes.rows[0]?.count || 0;
  } catch (e) {
    console.warn("Could not query challengesPosted:", e.message);
  }

  // B) Challenges Booked: Challenges posted by this team that were accepted/booked by other teams
  let challengesBooked = 0;
  try {
    const bookedRes = await pool.query(
      `SELECT COUNT(DISTINCT ch_id)::int AS count FROM (
         SELECT id AS ch_id FROM challenges
         WHERE (LOWER(TRIM(team_name)) = LOWER(TRIM($1))
            OR REGEXP_REPLACE(LOWER(TRIM(team_name)), '[[:space:]]+', ' ', 'g') = REGEXP_REPLACE(LOWER(TRIM($1)), '[[:space:]]+', ' ', 'g'))
           AND (status = 'accepted' OR accepted_by_team_name IS NOT NULL)
         UNION
         SELECT ca.challenge_id AS ch_id FROM challenge_acceptances ca
         WHERE (LOWER(TRIM(ca.creator_team_name)) = LOWER(TRIM($1))
            OR REGEXP_REPLACE(LOWER(TRIM(ca.creator_team_name)), '[[:space:]]+', ' ', 'g') = REGEXP_REPLACE(LOWER(TRIM($1)), '[[:space:]]+', ' ', 'g'))
           AND NOT EXISTS (
             SELECT 1 FROM challenge_cancellations cc
             WHERE cc.challenge_id = ca.challenge_id
           )
       ) t`,
      [teamName]
    );
    challengesBooked = bookedRes.rows[0]?.count || 0;
  } catch (e) {
    try {
      const fallbackBooked = await pool.query(
        `SELECT COUNT(*)::int AS count FROM challenges
         WHERE (LOWER(TRIM(team_name)) = LOWER(TRIM($1))
            OR REGEXP_REPLACE(LOWER(TRIM(team_name)), '[[:space:]]+', ' ', 'g') = REGEXP_REPLACE(LOWER(TRIM($1)), '[[:space:]]+', ' ', 'g'))
           AND (status = 'accepted' OR accepted_by_team_name IS NOT NULL)`,
        [teamName]
      );
      challengesBooked = fallbackBooked.rows[0]?.count || 0;
    } catch {}
  }

  // C) Challenges Accepted: Challenges from other teams that THIS team accepted
  // Note: if the team accepted another team's challenge and later cancelled it,
  // that challenge is NOT counted in accepted count (only in cancel count).
  let challengesAccepted = 0;
  try {
    const acceptedRes = await pool.query(
      `SELECT COUNT(DISTINCT ch_id)::int AS count FROM (
         -- Currently active accepted challenges
         SELECT id AS ch_id FROM challenges
         WHERE (LOWER(TRIM(accepted_by_team_name)) = LOWER(TRIM($1))
            OR REGEXP_REPLACE(LOWER(TRIM(accepted_by_team_name)), '[[:space:]]+', ' ', 'g') = REGEXP_REPLACE(LOWER(TRIM($1)), '[[:space:]]+', ' ', 'g'))
           AND status = 'accepted'
         UNION
         -- Historical acceptances, EXCLUDING any that were cancelled by this team
         SELECT ca.challenge_id AS ch_id FROM challenge_acceptances ca
         WHERE (LOWER(TRIM(ca.accepted_by_team_name)) = LOWER(TRIM($1))
            OR REGEXP_REPLACE(LOWER(TRIM(ca.accepted_by_team_name)), '[[:space:]]+', ' ', 'g') = REGEXP_REPLACE(LOWER(TRIM($1)), '[[:space:]]+', ' ', 'g'))
           AND NOT EXISTS (
             SELECT 1 FROM challenge_cancellations cc
             WHERE cc.challenge_id = ca.challenge_id
               AND (LOWER(TRIM(cc.cancelled_by_team_name)) = LOWER(TRIM($1))
                 OR REGEXP_REPLACE(LOWER(TRIM(cc.cancelled_by_team_name)), '[[:space:]]+', ' ', 'g') = REGEXP_REPLACE(LOWER(TRIM($1)), '[[:space:]]+', ' ', 'g')
                 OR cc.cancelled_by_user_id = ca.accepted_by_user_id)
           )
       ) t`,
      [teamName]
    );
    challengesAccepted = acceptedRes.rows[0]?.count || 0;
  } catch {
    try {
      const fallbackAcc = await pool.query(
        `SELECT COUNT(*)::int AS count FROM challenges
         WHERE (LOWER(TRIM(accepted_by_team_name)) = LOWER(TRIM($1))
            OR REGEXP_REPLACE(LOWER(TRIM(accepted_by_team_name)), '[[:space:]]+', ' ', 'g') = REGEXP_REPLACE(LOWER(TRIM($1)), '[[:space:]]+', ' ', 'g'))
           AND status = 'accepted'`,
        [teamName]
      );
      challengesAccepted = fallbackAcc.rows[0]?.count || 0;
    } catch {}
  }

  // D) Challenges Cancelled: Total cancellations of accepted challenges by this team
  let challengesCancelled = 0;
  try {
    const cancelledRes = await pool.query(
      `SELECT COUNT(*)::int AS count FROM challenge_cancellations
       WHERE LOWER(TRIM(cancelled_by_team_name)) = LOWER(TRIM($1))
          OR REGEXP_REPLACE(LOWER(TRIM(cancelled_by_team_name)), '[[:space:]]+', ' ', 'g') = REGEXP_REPLACE(LOWER(TRIM($1)), '[[:space:]]+', ' ', 'g')
          OR cancelled_by_user_id IN (
            SELECT id FROM users
            WHERE LOWER(TRIM(team_name)) = LOWER(TRIM($1))
               OR REGEXP_REPLACE(LOWER(TRIM(team_name)), '[[:space:]]+', ' ', 'g') = REGEXP_REPLACE(LOWER(TRIM($1)), '[[:space:]]+', ' ', 'g')
          )`,
      [teamName]
    );
    challengesCancelled = cancelledRes.rows[0]?.count || 0;
  } catch {}

  // 3. Reliability Score Calculation: Base 5.0, +0.1 for accept, -0.2 for cancel (range 1.0 to 5.0)
  const calcReliability = 5.0 + (challengesAccepted * 0.1) - (challengesCancelled * 0.2);
  const reliabilityScore = Math.max(1.0, Math.min(5.0, Number(calcReliability.toFixed(1))));

  // 4. Feedback Reviews
  let reviews = [];
  try {
    const reviewsRes = await pool.query(
      `SELECT id, team_name, reviewer_user_id, reviewer_name, reviewer_team_name,
              rating::float AS rating, review_text, created_at
       FROM team_reviews
       WHERE LOWER(TRIM(team_name)) = LOWER(TRIM($1))
          OR REGEXP_REPLACE(LOWER(TRIM(team_name)), '[[:space:]]+', ' ', 'g') = REGEXP_REPLACE(LOWER(TRIM($1)), '[[:space:]]+', ' ', 'g')
       ORDER BY created_at DESC`,
      [teamName]
    );
    reviews = reviewsRes.rows || [];

    if (reviews.length > 0) {
      try {
        const reviewIds = reviews.map(r => r.id);
        const repliesRes = await pool.query(
          `SELECT id, review_id, team_name, user_id, user_name, user_team_name, reply_text, created_at
           FROM team_review_replies
           WHERE review_id = ANY($1::int[])
           ORDER BY created_at ASC`,
          [reviewIds]
        );
        const repliesMap = {};
        for (const rep of repliesRes.rows) {
          if (!repliesMap[rep.review_id]) repliesMap[rep.review_id] = [];
          repliesMap[rep.review_id].push(rep);
        }
        reviews = reviews.map(r => ({
          ...r,
          replies: repliesMap[r.id] || []
        }));
      } catch (repErr) {
        reviews = reviews.map(r => ({ ...r, replies: [] }));
      }
    }
  } catch (err) {
    console.warn("Could not query team_reviews in getTeamDetails:", err.message);
  }

  let reviewsAvg = null;
  if (reviews.length > 0) {
    const sum = reviews.reduce((acc, r) => acc + (Number(r.rating) || 0), 0);
    reviewsAvg = Number((sum / reviews.length).toFixed(1));
  }

  // Rating must be calculated by the user feedback ratings, not by cancel and accept challenges
  const overallRating = reviewsAvg !== null ? reviewsAvg : 5.0;

  res.json({
    team: teamInfo,
    stats: {
      challenges_posted: challengesPosted,
      challenges_booked: challengesBooked,
      challenges_accepted: challengesAccepted,
      challenges_cancelled: challengesCancelled,
    },
    rating: overallRating,
    reliability_score: Number(reliabilityScore.toFixed(1)),
    reviews_avg: reviewsAvg,
    reviews_count: reviews.length,
    reviews,
  });
});

// ============================================================
// POST /api/teams/reviews
// Body: { team_name, rating, review_text }
// Submit a feedback review and star rating for a team
// ============================================================
const addTeamReview = asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: "Not authenticated" });

  const { team_name, rating, review_text } = req.body;

  if (!team_name || !team_name.trim()) {
    return res.status(400).json({ error: "team_name is required" });
  }

  const numRating = Number(rating);
  if (isNaN(numRating) || numRating < 1 || numRating > 5) {
    return res.status(400).json({ error: "Rating must be a number between 1 and 5" });
  }

  if (!review_text || !review_text.trim()) {
    return res.status(400).json({ error: "review_text is required" });
  }

  // Ensure table exists
  await pool.query(`
    CREATE TABLE IF NOT EXISTS team_reviews (
      id SERIAL PRIMARY KEY,
      team_name VARCHAR(120) NOT NULL,
      reviewer_user_id INTEGER,
      reviewer_name VARCHAR(120),
      reviewer_team_name VARCHAR(120),
      rating NUMERIC(2,1) NOT NULL,
      review_text TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT now()
    );
  `).catch(() => {});

  // Get reviewer user details
  const uRes = await pool.query(`SELECT name, team_name FROM users WHERE id = $1`, [userId]);
  const user = uRes.rows[0];
  const reviewerName = user?.name || "Cricket Player";
  const reviewerTeam = user?.team_name || null;

  // Block own team players/captains from posting feedback for their own team
  const isSelf = reviewerTeam && reviewerTeam.trim().toLowerCase() === team_name.trim().toLowerCase();
  if (isSelf) {
    return res.status(403).json({ error: "You cannot review your own team. Only opponent teams can leave feedback." });
  }

  // Also verify user is not a creator/captain of this team
  const ownCheck = await pool.query(
    `SELECT 1 FROM teams
     WHERE created_by = $1 AND (
       LOWER(TRIM(name)) = LOWER(TRIM($2))
       OR REGEXP_REPLACE(LOWER(TRIM(name)), '[[:space:]]+', ' ', 'g') = REGEXP_REPLACE(LOWER(TRIM($2)), '[[:space:]]+', ' ', 'g')
     )
     LIMIT 1`,
    [userId, team_name.trim()]
  );
  if (ownCheck.rows.length > 0) {
    return res.status(403).json({ error: "You cannot review your own team. Only opponent teams can leave feedback." });
  }

  const insertRes = await pool.query(
    `INSERT INTO team_reviews (team_name, reviewer_user_id, reviewer_name, reviewer_team_name, rating, review_text)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, team_name, reviewer_user_id, reviewer_name, reviewer_team_name,
               rating::float AS rating, review_text, created_at`,
    [team_name.trim(), userId, reviewerName, reviewerTeam, numRating, review_text.trim()]
  );

  const savedReview = insertRes.rows[0];

  // Send notification to all users in the reviewed team
  if (typeof notifyTeamOfFeedback === "function") {
    try {
      notifyTeamOfFeedback(
        team_name.trim(),
        reviewerName,
        reviewerTeam,
        numRating,
        review_text.trim(),
        { review_id: String(savedReview.id) }
      ).catch(err => console.error("Error sending review notifications:", err.message));
    } catch (notifErr) {
      console.error("Non-fatal notification error:", notifErr.message);
    }
  }

  res.status(201).json({
    ok: true,
    review: savedReview,
    message: "Feedback review submitted successfully",
  });
});

// ============================================================
// DELETE /api/teams/reviews/:id
// Only admin or the reviewed person (who put the review) can delete it
// ============================================================
const deleteTeamReview = asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: "Not authenticated" });

  const { id } = req.params;

  const reviewRes = await pool.query(`SELECT * FROM team_reviews WHERE id = $1`, [id]);
  if (reviewRes.rows.length === 0) {
    return res.status(404).json({ error: "Review not found" });
  }

  const review = reviewRes.rows[0];

  // Strictly enforce that only admin or the user who posted the review can delete it
  const isAuthor = Number(review.reviewer_user_id) === Number(userId);
  const isAdmin = Boolean(req.user?.is_admin);

  if (!isAuthor && !isAdmin) {
    return res.status(403).json({ error: "Only an administrator or the person who posted this review can delete it" });
  }

  await pool.query(`DELETE FROM team_reviews WHERE id = $1`, [id]);

  res.json({
    ok: true,
    message: "Feedback review deleted successfully",
    deletedId: Number(id),
  });
});

// ============================================================
// POST /api/teams/reviews/:id/replies
// Only members of the reviewed team (or admins) can reply to reviewed messages
// ============================================================
const addTeamReviewReply = asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: "Not authenticated" });

  const { id: reviewId } = req.params;
  const { reply_text } = req.body;

  if (!reply_text || !reply_text.trim()) {
    return res.status(400).json({ error: "reply_text is required" });
  }

  // Ensure replies table exists
  await pool.query(`
    CREATE TABLE IF NOT EXISTS team_review_replies (
      id SERIAL PRIMARY KEY,
      review_id INTEGER REFERENCES team_reviews(id) ON DELETE CASCADE,
      team_name VARCHAR(120) NOT NULL,
      user_id INTEGER,
      user_name VARCHAR(120) NOT NULL,
      user_team_name VARCHAR(120),
      reply_text TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS idx_team_review_replies_review ON team_review_replies(review_id);
  `).catch(() => {});

  const reviewRes = await pool.query(`SELECT * FROM team_reviews WHERE id = $1`, [reviewId]);
  if (reviewRes.rows.length === 0) {
    return res.status(404).json({ error: "Review not found" });
  }
  const review = reviewRes.rows[0];

  // Fetch replying user details
  const uRes = await pool.query(`SELECT id, name, team_name, is_admin FROM users WHERE id = $1`, [userId]);
  const user = uRes.rows[0];
  if (!user) return res.status(404).json({ error: "User not found" });

  // Check if user is a member of the reviewed team OR is admin
  const reviewTeamClean = (review.team_name || "").trim().toLowerCase();
  const userTeamClean = (user.team_name || "").trim().toLowerCase();

  // Also check teams table for ownership/creation
  const teamCheck = await pool.query(
    `SELECT 1 FROM teams
     WHERE (created_by = $1 OR owner_id::text = $2) AND (
       LOWER(TRIM(name)) = LOWER(TRIM($3))
       OR REGEXP_REPLACE(LOWER(TRIM(name)), '[[:space:]]+', ' ', 'g') = REGEXP_REPLACE(LOWER(TRIM($3)), '[[:space:]]+', ' ', 'g')
     )
     LIMIT 1`,
    [userId, String(userId), review.team_name.trim()]
  ).catch(() => ({ rows: [] }));

  const isTeamMember = userTeamClean === reviewTeamClean || teamCheck.rows.length > 0;
  const isAdmin = Boolean(user.is_admin);

  if (!isTeamMember && !isAdmin) {
    return res.status(403).json({ error: "Only team members of this team can reply to this review" });
  }

  const insertRes = await pool.query(
    `INSERT INTO team_review_replies (review_id, team_name, user_id, user_name, user_team_name, reply_text)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, review_id, team_name, user_id, user_name, user_team_name, reply_text, created_at`,
    [review.id, review.team_name, userId, user.name || "Team Member", user.team_name || review.team_name, reply_text.trim()]
  );

  const reply = insertRes.rows[0];

  // Send notification to the original reviewer
  if (review.reviewer_user_id && typeof notifyReviewReply === "function") {
    notifyReviewReply(
      review.reviewer_user_id,
      review.team_name,
      user.name || "Team Member",
      reply_text.trim(),
      { review_id: String(review.id), reply_id: String(reply.id) }
    ).catch(err => console.error("Error sending review reply notification:", err.message));
  }

  res.status(201).json({
    ok: true,
    reply,
    message: "Reply posted successfully",
  });
});

// ============================================================
// DELETE /api/teams/reviews/:id/replies/:replyId
// Only admin or the author who posted the reply can delete it
// ============================================================
const deleteTeamReviewReply = asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: "Not authenticated" });

  const { replyId } = req.params;

  const replyRes = await pool.query(`SELECT * FROM team_review_replies WHERE id = $1`, [replyId]);
  if (replyRes.rows.length === 0) {
    return res.status(404).json({ error: "Reply not found" });
  }
  const reply = replyRes.rows[0];

  const isAuthor = Number(reply.user_id) === Number(userId);
  const isAdmin = Boolean(req.user?.is_admin);

  if (!isAuthor && !isAdmin) {
    return res.status(403).json({ error: "Only an administrator or the person who posted this reply can delete it" });
  }

  await pool.query(`DELETE FROM team_review_replies WHERE id = $1`, [replyId]);

  res.json({
    ok: true,
    message: "Reply deleted successfully",
    deletedId: Number(replyId),
  });
});

module.exports = {
  getMyTeam,
  getTeamDetails,
  addTeamReview,
  deleteTeamReview,
  addTeamReviewReply,
  deleteTeamReviewReply,
};