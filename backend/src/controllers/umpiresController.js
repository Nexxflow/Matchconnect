const pool = require("../config/db");
const asyncHandler = require("../utils/asyncHandler");

const MOBILE_RE = /^[0-9]{10,15}$/;
const VALID_ROLES = ["Umpire", "Scorer", "Umpire + Scorer"];

// GET /api/umpires
const listUmpires = asyncHandler(async (req, res) => {
  const result = await pool.query(`
    SELECT u.*,
      COALESCE(ur_stats.reviews_count, 0) AS reviews_count,
      COALESCE(ur_stats.reviews_rating, u.rating, 0) AS rating,
      COALESCE(
        (
          SELECT json_agg(to_char(b.booking_date, 'YYYY-MM-DD'))
          FROM bookings b
          WHERE b.umpire_id = u.id AND b.payment_status IN ('pending', 'paid')
        ),
        '[]'::json
      ) AS booked_dates
    FROM umpires u
    LEFT JOIN LATERAL (
      SELECT
        COUNT(*)::int AS reviews_count,
        ROUND(AVG(ur.rating)::numeric, 1) AS reviews_rating
      FROM umpire_reviews ur
      WHERE ur.umpire_id = u.id
    ) ur_stats ON TRUE
    ORDER BY u.created_at DESC
  `);
  res.json({
    umpires: result.rows,
  });
});

// GET /api/umpires/:id
const getUmpire = asyncHandler(async (req, res) => {
  const result = await pool.query(`
    SELECT u.*,
      COALESCE(ur_stats.reviews_count, 0) AS reviews_count,
      COALESCE(ur_stats.reviews_rating, u.rating, 0) AS rating,
      COALESCE(
        (
          SELECT json_agg(to_char(b.booking_date, 'YYYY-MM-DD'))
          FROM bookings b
          WHERE b.umpire_id = u.id AND b.payment_status IN ('pending', 'paid')
        ),
        '[]'::json
      ) AS booked_dates
    FROM umpires u
    LEFT JOIN LATERAL (
      SELECT
        COUNT(*)::int AS reviews_count,
        ROUND(AVG(ur.rating)::numeric, 1) AS reviews_rating
      FROM umpire_reviews ur
      WHERE ur.umpire_id = u.id
    ) ur_stats ON TRUE
    WHERE u.id=$1
  `, [req.params.id]);
  if (result.rows.length === 0) {
    return res.status(404).json({
      error: "Umpire not found",
    });
  }
  res.json({
    umpire: result.rows[0],
  });
});

const checkUmpireOwnership = (umpire, user) => {
  if (!user) return false;
  const userId = user.id ? String(user.id) : null;
  if (umpire.created_by && userId && String(umpire.created_by) === userId) return true;
  if (umpire.user_id && userId && String(umpire.user_id) === userId) return true;

  const clean = (p) => (p ? String(p).replace(/\D/g, "") : "");
  const userPhone = clean(user.phone);
  const umpirePhone = clean(umpire.mobile);
  if (userPhone && umpirePhone && userPhone === umpirePhone) return true;

  return false;
};

// POST /api/umpires
const createUmpire = asyncHandler(async (req, res) => {
  const {
    name,
    mobile,
    role,
    experience,
    fee_per_match,
    profile_picture_url,
  } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({
      error: "Name is required",
    });
  }
  if (!mobile || !MOBILE_RE.test(String(mobile).trim())) {
    return res.status(400).json({
      error: "Valid mobile number is required",
    });
  }
  const resolvedRole = role && VALID_ROLES.includes(role) ? role : "Umpire";
  if (Number(fee_per_match) <= 0) {
    return res.status(400).json({
      error: "Fee per match must be greater than 0",
    });
  }

  const userId = req.user?.id || null;

  const result = await pool.query(
    `
    INSERT INTO umpires
    (
      name,
      mobile,
      role,
      experience,
      fee_per_match,
      created_by,
      user_id,
      profile_picture_url
    )
    VALUES
    (
      $1,$2,$3,$4,$5,$6,$7,$8
    )
    RETURNING *
    `,
    [
      name.trim(),
      String(mobile).trim(),
      resolvedRole,
      Number(experience || 0),
      Number(fee_per_match),
      userId,
      userId,
      profile_picture_url || null,
    ]
  );
  res.status(201).json({
    umpire: result.rows[0],
  });
});

// PUT /api/umpires/:id
const updateUmpire = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {
    name,
    mobile,
    role,
    experience,
    fee_per_match,
    profile_picture_url,
  } = req.body;

  const existing = await pool.query("SELECT * FROM umpires WHERE id=$1", [id]);
  if (existing.rows.length === 0) {
    return res.status(404).json({ error: "Umpire not found" });
  }

  const umpire = existing.rows[0];
  if (!checkUmpireOwnership(umpire, req.user)) {
    return res.status(403).json({
      error: "Forbidden: Only the user who registered this umpire can edit it.",
    });
  }

  if (!name || !name.trim()) {
    return res.status(400).json({ error: "Name is required" });
  }
  if (!mobile || !MOBILE_RE.test(String(mobile).trim())) {
    return res.status(400).json({ error: "Valid mobile number is required" });
  }
  const resolvedRole = role && VALID_ROLES.includes(role) ? role : "Umpire";
  if (Number(fee_per_match) <= 0) {
    return res.status(400).json({ error: "Fee per match must be greater than 0" });
  }

  const result = await pool.query(
    `
    UPDATE umpires
    SET name = $1,
        mobile = $2,
        role = $3,
        experience = $4,
        fee_per_match = $5,
        profile_picture_url = $6
    WHERE id = $7
    RETURNING *
    `,
    [
      name.trim(),
      String(mobile).trim(),
      resolvedRole,
      Number(experience || 0),
      Number(fee_per_match),
      profile_picture_url !== undefined ? profile_picture_url : umpire.profile_picture_url,
      id,
    ]
  );
  res.json({ umpire: result.rows[0] });
});

// DELETE /api/umpires/:id
const deleteUmpire = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const existing = await pool.query("SELECT * FROM umpires WHERE id=$1", [id]);
  if (existing.rows.length === 0) {
    return res.status(404).json({ error: "Umpire not found" });
  }

  const umpire = existing.rows[0];
  if (!checkUmpireOwnership(umpire, req.user)) {
    return res.status(403).json({
      error: "Forbidden: Only the user who registered this umpire can delete it.",
    });
  }

  await pool.query("DELETE FROM umpires WHERE id=$1", [id]);
  res.json({ ok: true });
});

// ─── Umpire & Scorer Reviews Endpoints ─────────────────────────────────────

// GET /api/umpires/:id/reviews
const getUmpireReviews = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const umpireRes = await pool.query("SELECT * FROM umpires WHERE id = $1", [id]);
  if (umpireRes.rows.length === 0) {
    return res.status(404).json({ error: "Umpire not found" });
  }

  // Ensure table exists
  await pool.query(`
    CREATE TABLE IF NOT EXISTS umpire_reviews (
      id SERIAL PRIMARY KEY,
      umpire_id UUID REFERENCES umpires(id) ON DELETE CASCADE,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      user_name VARCHAR(120),
      rating NUMERIC(2,1) NOT NULL,
      review_text TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT now()
    );
  `);

  const reviewsRes = await pool.query(
    `SELECT ur.id, ur.umpire_id, ur.user_id, ur.user_name, ur.rating::float as rating, ur.review_text, ur.created_at,
            u.avatar as user_avatar, u.team_name as user_team_name
     FROM umpire_reviews ur
     LEFT JOIN users u ON u.id = ur.user_id
     WHERE ur.umpire_id = $1
     ORDER BY ur.created_at DESC`,
    [id]
  );

  let hasBooked = false;
  let isOwner = false;

  if (req.user && req.user.id) {
    const userId = req.user.id;
    isOwner = checkUmpireOwnership(umpireRes.rows[0], req.user);
    const bookingCheck = await pool.query(
      `SELECT id FROM bookings
       WHERE umpire_id = $1
         AND user_id = $2
         AND payment_status IN ('paid', 'pending', 'completed')
       LIMIT 1`,
      [id, userId]
    );
    hasBooked = bookingCheck.rows.length > 0;
  }

  const reviews = reviewsRes.rows || [];
  const avg = reviews.length > 0
    ? Number((reviews.reduce((acc, r) => acc + (Number(r.rating) || 0), 0) / reviews.length).toFixed(1))
    : 0;

  res.json({
    umpire_id: id,
    rating: avg,
    reviews_count: reviews.length,
    reviews,
    can_review: hasBooked && !isOwner,
    has_booked: hasBooked,
    is_owner: isOwner
  });
});

// POST /api/umpires/:id/reviews
const addUmpireReview = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { rating, review_text } = req.body;
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ error: "You must be logged in to leave a review." });
  }

  const umpireRes = await pool.query("SELECT * FROM umpires WHERE id = $1", [id]);
  if (umpireRes.rows.length === 0) {
    return res.status(404).json({ error: "Umpire not found." });
  }

  const umpire = umpireRes.rows[0];

  // Umpire cannot review themselves
  if (checkUmpireOwnership(umpire, req.user)) {
    return res.status(403).json({ error: "Match officials cannot review their own profile." });
  }

  // Strictly enforce booking verification: only users who booked this umpire can review
  const bookingCheck = await pool.query(
    `SELECT id FROM bookings
     WHERE umpire_id = $1
       AND user_id = $2
       AND payment_status IN ('paid', 'pending', 'completed')
     LIMIT 1`,
    [id, userId]
  );

  if (bookingCheck.rows.length === 0) {
    return res.status(403).json({
      error: "Only players who have booked this umpire can leave a review."
    });
  }

  const numRating = Number(rating);
  if (!numRating || numRating < 1 || numRating > 5) {
    return res.status(400).json({ error: "Rating must be between 1 and 5 stars." });
  }

  if (!review_text || !review_text.trim()) {
    return res.status(400).json({ error: "Review text is required." });
  }

  // Get user details
  const userRes = await pool.query("SELECT name, team_name, avatar FROM users WHERE id = $1", [userId]);
  const userName = userRes.rows[0]?.name || req.user.name || "Cricket Player";
  const userTeam = userRes.rows[0]?.team_name || null;
  const userAvatar = userRes.rows[0]?.avatar || null;

  const insertRes = await pool.query(
    `INSERT INTO umpire_reviews (umpire_id, user_id, user_name, rating, review_text)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, umpire_id, user_id, user_name, rating::float as rating, review_text, created_at`,
    [id, userId, userName, numRating, review_text.trim()]
  );

  const newReview = {
    ...insertRes.rows[0],
    user_team_name: userTeam,
    user_avatar: userAvatar
  };

  // Recalculate average rating on the umpires table
  await pool.query(
    `UPDATE umpires
     SET rating = (
       SELECT ROUND(AVG(rating)::numeric, 1)
       FROM umpire_reviews
       WHERE umpire_id = $1
     )
     WHERE id = $1`,
    [id]
  );

  res.status(201).json({
    review: newReview,
    message: "Official review submitted successfully"
  });
});

// DELETE /api/umpires/:id/reviews/:reviewId
const deleteUmpireReview = asyncHandler(async (req, res) => {
  const { id, reviewId } = req.params;
  const userId = req.user?.id;

  const reviewRes = await pool.query(
    "SELECT * FROM umpire_reviews WHERE id = $1 AND umpire_id = $2",
    [reviewId, id]
  );

  if (reviewRes.rows.length === 0) {
    return res.status(404).json({ error: "Review not found" });
  }

  const review = reviewRes.rows[0];

  const isAuthor = Number(review.user_id) === Number(userId);
  const isAdmin = req.user?.is_admin === true || (req.user?.phone && req.user.phone.includes("6382757532"));

  if (!isAuthor && !isAdmin) {
    return res.status(403).json({ error: "Only an administrator or the person who posted this review can delete it." });
  }

  await pool.query("DELETE FROM umpire_reviews WHERE id = $1", [reviewId]);

  // Recalculate average rating on the umpires table
  await pool.query(
    `UPDATE umpires
     SET rating = COALESCE((
       SELECT ROUND(AVG(rating)::numeric, 1)
       FROM umpire_reviews
       WHERE umpire_id = $1
     ), 0)
     WHERE id = $1`,
    [id]
  );

  res.json({
    success: true,
    message: "Official review deleted successfully"
  });
});

module.exports = {
  listUmpires,
  getUmpire,
  createUmpire,
  updateUmpire,
  deleteUmpire,
  getUmpireReviews,
  addUmpireReview,
  deleteUmpireReview
};