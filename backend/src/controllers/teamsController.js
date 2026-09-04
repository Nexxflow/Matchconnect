const pool = require("../config/db");
const asyncHandler = require("../utils/asyncHandler");
const { notifyTeamOfFeedback } = require("../services/notificationService");

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

  // 2. Stats calculation
  // A) Challenges Posted: Total challenge posts by this team
  const postedRes = await pool.query(
    `SELECT COUNT(*)::int AS count FROM challenges
     WHERE LOWER(TRIM(team_name)) = LOWER(TRIM($1))`,
    [teamName]
  );
  const challengesPosted = postedRes.rows[0]?.count || 0;

  // B) Challenges Booked: Challenges posted by this team that were accepted/booked by other teams
  const bookedRes = await pool.query(
    `SELECT COUNT(*)::int AS count FROM challenges
     WHERE LOWER(TRIM(team_name)) = LOWER(TRIM($1))
       AND (status = 'accepted' OR accepted_by_team_name IS NOT NULL)`,
    [teamName]
  );
  const challengesBooked = bookedRes.rows[0]?.count || 0;

  // C) Challenges Accepted: Challenges from other teams that THIS team accepted
  const acceptedRes = await pool.query(
    `SELECT COUNT(DISTINCT ch_id)::int AS count FROM (
       SELECT id AS ch_id FROM challenges
       WHERE LOWER(TRIM(accepted_by_team_name)) = LOWER(TRIM($1))
       UNION
       SELECT challenge_id AS ch_id FROM challenge_acceptances
       WHERE LOWER(TRIM(accepted_by_team_name)) = LOWER(TRIM($1))
     ) t`,
    [teamName]
  );
  const challengesAccepted = acceptedRes.rows[0]?.count || 0;

  // D) Challenges Cancelled: Total cancellations by this team
  const cancelledRes = await pool.query(
    `SELECT COUNT(*)::int AS count FROM challenge_cancellations
     WHERE LOWER(TRIM(cancelled_by_team_name)) = LOWER(TRIM($1))`,
    [teamName]
  );
  const challengesCancelled = cancelledRes.rows[0]?.count || 0;

  // 3. Dynamic Rating Calculation
  // Rating increases when accepting other team challenges and decreases with match cancellations
  let reliabilityScore = 5.0;
  if (challengesCancelled > 0) {
    const ratio = challengesAccepted === 0
      ? Math.max(0.2, 1.0 - (challengesCancelled * 0.25))
      : challengesAccepted / (challengesAccepted + challengesCancelled * 1.25);
    reliabilityScore = Math.max(1.0, Math.min(5.0, 5.0 * ratio));
  } else if (challengesAccepted > 0) {
    reliabilityScore = 5.0;
  }

  // 4. Feedback Reviews
  const reviewsRes = await pool.query(
    `SELECT id, team_name, reviewer_user_id, reviewer_name, reviewer_team_name,
            rating::float AS rating, review_text, created_at
     FROM team_reviews
     WHERE REGEXP_REPLACE(LOWER(TRIM(team_name)), '\\s+', ' ', 'g') = REGEXP_REPLACE(LOWER(TRIM($1)), '\\s+', ' ', 'g')
     ORDER BY created_at DESC`,
    [teamName]
  );
  const reviews = reviewsRes.rows || [];

  let overallRating = reliabilityScore;
  let reviewsAvg = null;
  if (reviews.length > 0) {
    const sum = reviews.reduce((acc, r) => acc + (Number(r.rating) || 0), 0);
    reviewsAvg = Number((sum / reviews.length).toFixed(1));
    // Composite rating: 50% reliability rating + 50% community reviews
    overallRating = Number(((reliabilityScore * 0.5) + (reviewsAvg * 0.5)).toFixed(1));
  } else {
    overallRating = Number(reliabilityScore.toFixed(1));
  }

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

  // Get reviewer user details
  const uRes = await pool.query(`SELECT name, team_name FROM users WHERE id = $1`, [userId]);
  const user = uRes.rows[0];
  const reviewerName = user?.name || "Cricket Player";
  const reviewerTeam = user?.team_name || null;

  if (reviewerTeam && reviewerTeam.trim().toLowerCase() === team_name.trim().toLowerCase()) {
    return res.status(400).json({ error: "You cannot submit a review for your own team" });
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
  notifyTeamOfFeedback(
    team_name.trim(),
    reviewerName,
    reviewerTeam,
    numRating,
    review_text.trim(),
    { review_id: String(savedReview.id) }
  ).catch(err => console.error("Error sending review notifications:", err.message));

  res.status(201).json({
    ok: true,
    review: savedReview,
    message: "Feedback review submitted successfully",
  });
});

module.exports = {
  getMyTeam,
  getTeamDetails,
  addTeamReview,
};