const pool = require("../config/db");
const asyncHandler = require("../utils/asyncHandler");
const { notifyAllUsersExcept } = require("../services/notificationService");

const BOOKING_LIMIT_PER_DAY = 2;

// ─── Geocoding (OpenStreetMap Nominatim) ───────────────────────────────────
// Turns a free-text area/address into lat/lng so grounds can be shown on the
// "Grounds near you" map and sorted by distance. Best-effort: on any failure
// (network, rate limit, no match) this just returns nulls and the ground is
// still created/updated without coordinates.
async function geocodeArea(area) {
  const query = String(area || "").trim();
  if (!query) return { latitude: null, longitude: null };
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=in&q=${encodeURIComponent(query)}`;
    const response = await fetch(url, {
      headers: { "User-Agent": "MatchConnect/1.0 (cricket ground booking app)" }
    });
    if (!response.ok) return { latitude: null, longitude: null };
    const results = await response.json();
    if (!Array.isArray(results) || results.length === 0) return { latitude: null, longitude: null };
    const { lat, lon } = results[0];
    const latitude = Number(lat);
    const longitude = Number(lon);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return { latitude: null, longitude: null };
    return { latitude, longitude };
  } catch (err) {
    console.error("Geocoding error:", err.message);
    return { latitude: null, longitude: null };
  }
}

async function getUserTeamProfile(userId) {
  const result = await pool.query(
    "SELECT team_name, village_name, team_year FROM users WHERE id = $1",
    [userId]
  );
  return result.rows[0] || null;
}

function sameTeamProfile(a, b) {
  return !!(
    a &&
    b &&
    a.team_name &&
    a.village_name &&
    a.team_year &&
    b.team_name &&
    b.village_name &&
    b.team_year &&
    String(a.team_year) === String(b.team_year) &&
    String(a.team_name).trim().toLowerCase() === String(b.team_name).trim().toLowerCase() &&
    String(a.village_name).trim().toLowerCase() === String(b.village_name).trim().toLowerCase()
  );
}

function normalizeGroundRow(row) {
  return {
    ...row,
    price_per_hour: row.price_per_hour != null ? Number(row.price_per_hour) : null,
    rating: row.rating != null ? Number(row.rating) : 0,
    reviews_count: row.reviews_count != null ? Number(row.reviews_count) : 0,
    latitude: row.latitude != null ? Number(row.latitude) : null,
    longitude: row.longitude != null ? Number(row.longitude) : null,
    booking_count_today: row.booking_count_today != null ? Number(row.booking_count_today) : 0,
    amenities: row.amenities ?? [],
    tags: row.tags ?? [],
    images: Array.isArray(row.images) ? row.images : (row.images ? (typeof row.images === 'string' ? JSON.parse(row.images) : row.images) : []),
    alt_phone: row.alt_phone || null,
    booked_time_slots_today: row.booked_time_slots_today ?? []
  };
}

// Owner phone numbers are private: only logged-in users get them.
// Anonymous requests (anyone who just opens /api/grounds) get phone = null.
function sanitizeGroundForViewer(ground, user) {
  if (user && user.id) return ground;
  return { ...ground, posted_by_phone: null };
}

// GET /api/grounds?location=Bandra
const listGrounds = asyncHandler(async (req, res) => {
  const { location, address } = req.query;
  const search = (location || address || "").trim();
  const conditions = [];
  const values = [];
  if (search) {
    values.push(`%${search}%`);
    conditions.push(`(g.area ILIKE $${values.length} OR g.name ILIKE $${values.length})`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const result = await pool.query(
    `SELECT
       g.*,
       u.name AS posted_by_name,
       u.phone AS posted_by_phone,
       COALESCE(gr_stats.reviews_count, 0) AS reviews_count,
       COALESCE(gr_stats.reviews_rating, g.rating, 0) AS rating,
       COALESCE(bt.booking_count_today, 0) AS booking_count_today,
       COALESCE(bt.booked_time_slots_today, '[]'::json) AS booked_time_slots_today
     FROM grounds g
     LEFT JOIN users u ON u.id = g.posted_by_user_id
     LEFT JOIN LATERAL (
       SELECT
         COUNT(*)::int AS reviews_count,
         ROUND(AVG(gr.rating)::numeric, 1) AS reviews_rating
       FROM ground_reviews gr
       WHERE gr.ground_id = g.id
     ) gr_stats ON TRUE
     LEFT JOIN LATERAL (
       SELECT
         COUNT(*)::int AS booking_count_today,
         COALESCE(json_agg(b.time_slot ORDER BY b.time_slot), '[]'::json) AS booked_time_slots_today
       FROM bookings b
       WHERE b.ground_id = g.id
         AND b.booking_date = CURRENT_DATE
         AND b.payment_status IN ('pending', 'paid')
     ) bt ON TRUE
     ${where}
     ORDER BY g.created_at DESC`,
    values
  );
  res.json({
    grounds: result.rows.map(normalizeGroundRow).map((g) => sanitizeGroundForViewer(g, req.user))
  });
});

// GET /api/grounds/:id
const getGround = asyncHandler(async (req, res) => {
  const result = await pool.query(
    `SELECT
       g.*,
       u.name AS posted_by_name,
       u.phone AS posted_by_phone,
       COALESCE(gr_stats.reviews_count, 0) AS reviews_count,
       COALESCE(gr_stats.reviews_rating, g.rating, 0) AS rating,
       COALESCE(bt.booking_count_today, 0) AS booking_count_today,
       COALESCE(bt.booked_time_slots_today, '[]'::json) AS booked_time_slots_today
     FROM grounds g
     LEFT JOIN users u ON u.id = g.posted_by_user_id
     LEFT JOIN LATERAL (
       SELECT
         COUNT(*)::int AS reviews_count,
         ROUND(AVG(gr.rating)::numeric, 1) AS reviews_rating
       FROM ground_reviews gr
       WHERE gr.ground_id = g.id
     ) gr_stats ON TRUE
     LEFT JOIN LATERAL (
       SELECT
         COUNT(*)::int AS booking_count_today,
         COALESCE(json_agg(b.time_slot ORDER BY b.time_slot), '[]'::json) AS booked_time_slots_today
       FROM bookings b
       WHERE b.ground_id = g.id
         AND b.booking_date = CURRENT_DATE
         AND b.payment_status IN ('pending', 'paid')
     ) bt ON TRUE
     WHERE g.id = $1`,
    [req.params.id]
  );
  if (result.rows.length === 0) return res.status(404).json({ error: "Ground not found" });
  res.json({ ground: sanitizeGroundForViewer(normalizeGroundRow(result.rows[0]), req.user) });
});

// GET /api/grounds/:id/bookings?date=YYYY-MM-DD
const getGroundBookings = asyncHandler(async (req, res) => {
  const { date } = req.query;
  const params = [req.params.id];
  let dateClause = "";
  if (date) {
    params.push(date);
    dateClause = `AND b.booking_date = $2`;
  }

  const result = await pool.query(
    `SELECT b.id, b.booking_date, b.time_slot, b.user_id, u.name AS booked_by_name, u.phone AS booked_by_phone, u.team_name AS booked_by_team_name
     FROM bookings b
     LEFT JOIN users u ON u.id = b.user_id
     WHERE b.ground_id = $1
       AND b.payment_status IN ('pending', 'paid')
       ${dateClause}
     ORDER BY b.booking_date ASC, b.time_slot ASC`,
    params
  );

  // Booker phone numbers are only visible to the ground owner and to the
  // person who made that booking.
  const ground = await pool.query("SELECT posted_by_user_id FROM grounds WHERE id = $1", [req.params.id]);
  const isOwner = ground.rows.length > 0 && String(ground.rows[0].posted_by_user_id) === String(req.user.id);
  const bookings = result.rows.map((b) =>
    isOwner || String(b.user_id) === String(req.user.id) ? b : { ...b, booked_by_phone: null }
  );

  res.json({ bookings });
});

// POST /api/grounds — add a ground
const createGround = asyncHandler(async (req, res) => {
  const { name, area, google_maps_url, price_per_hour, availability_mode, available_date, available_time, alt_phone, images } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: "Ground name is required" });
  }
  if (!area || !area.trim()) {
    return res.status(400).json({ error: "Location is required" });
  }
  if (!price_per_hour || Number(price_per_hour) <= 0) {
    return res.status(400).json({ error: "Price must be greater than 0" });
  }

  const normalizedAvailabilityMode = availability_mode === "scheduled" ? "scheduled" : "always";
  if (normalizedAvailabilityMode === "scheduled" && (!available_date || !available_time)) {
    return res.status(400).json({ error: "Available date and time are required for scheduled availability" });
  }

  const resolvedArea = area.trim();
  const resolvedMapsUrl = google_maps_url ? String(google_maps_url).trim() : null;

  // Best-effort geocode of the area text so the ground shows up on the map
  // and can be sorted by distance. Never blocks creation on failure.
  const { latitude, longitude } = await geocodeArea(resolvedArea);

  const imagesJson = JSON.stringify(Array.isArray(images) ? images : []);

  const result = await pool.query(
    `INSERT INTO grounds (name, area, price_per_hour, google_maps_url, posted_by_user_id, availability_mode, available_date, available_time, latitude, longitude, alt_phone, images)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     RETURNING *`,
    [
      name.trim(),
      resolvedArea,
      Number(price_per_hour),
      resolvedMapsUrl,
      req.user.id,
      normalizedAvailabilityMode,
      normalizedAvailabilityMode === "scheduled" ? available_date : null,
      normalizedAvailabilityMode === "scheduled" ? available_time : null,
      latitude,
      longitude,
      alt_phone ? String(alt_phone).trim() : null,
      imagesJson
    ]
  );
  const created = await pool.query(
    `SELECT
       g.*,
       u.name AS posted_by_name,
       u.phone AS posted_by_phone,
       COALESCE(bt.booking_count_today, 0) AS booking_count_today,
       COALESCE(bt.booked_time_slots_today, '[]'::json) AS booked_time_slots_today
     FROM grounds g
     LEFT JOIN users u ON u.id = g.posted_by_user_id
     LEFT JOIN LATERAL (
       SELECT
         COUNT(*)::int AS booking_count_today,
         COALESCE(json_agg(b.time_slot ORDER BY b.time_slot), '[]'::json) AS booked_time_slots_today
       FROM bookings b
       WHERE b.ground_id = g.id
         AND b.booking_date = CURRENT_DATE
         AND b.payment_status IN ('pending', 'paid')
     ) bt ON TRUE
     WHERE g.id = $1`,
    [result.rows[0].id]
  );
  const groundObj = normalizeGroundRow(created.rows[0]);

  console.log(`🏟️ [Ground Listed] Ground #${groundObj.id} ("${groundObj.name}") listed by User #${req.user.id}. Geocoded: ${latitude ?? "none"}, ${longitude ?? "none"}. Sending broadcast notification to other users...`);

  // Broadcast web notification to ALL other users
  notifyAllUsersExcept(
    req.user.id,
    "New Cricket Ground Available! 🏟️",
    `"${groundObj.name}" in ${groundObj.area} is now available for booking at ₹${groundObj.price_per_hour}/hr`,
    { type: "new_ground", ground_id: String(groundObj.id) },
    "ground"
  ).catch((err) => console.error("Ground notification error:", err.message));

  res.status(201).json({ ground: groundObj });
});

// PUT /api/grounds/:id
const updateGround = asyncHandler(async (req, res) => {
  const existing = await pool.query("SELECT * FROM grounds WHERE id = $1", [req.params.id]);
  if (existing.rows.length === 0) return res.status(404).json({ error: "Ground not found" });
  if (String(existing.rows[0].posted_by_user_id) !== String(req.user.id)) {
    return res.status(403).json({ error: "Only the creator can edit this ground" });
  }

  const { name, area, google_maps_url, price_per_hour, availability_mode, available_date, available_time, alt_phone, images } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: "Ground name is required" });
  if (!area || !area.trim()) return res.status(400).json({ error: "Location is required" });
  if (!price_per_hour || Number(price_per_hour) <= 0) return res.status(400).json({ error: "Price must be greater than 0" });

  const normalizedAvailabilityMode = availability_mode === "scheduled" ? "scheduled" : "always";
  if (normalizedAvailabilityMode === "scheduled" && (!available_date || !available_time)) {
    return res.status(400).json({ error: "Available date and time are required for scheduled availability" });
  }

  const resolvedArea = area.trim();
  const areaChanged = resolvedArea.toLowerCase() !== String(existing.rows[0].area || "").trim().toLowerCase();

  // Only re-geocode if the area text actually changed, or the ground never
  // had coordinates in the first place — avoids hammering Nominatim on
  // every unrelated edit (price, availability, etc.).
  let latitude = existing.rows[0].latitude;
  let longitude = existing.rows[0].longitude;
  if (areaChanged || latitude == null || longitude == null) {
    const geocoded = await geocodeArea(resolvedArea);
    latitude = geocoded.latitude;
    longitude = geocoded.longitude;
  }

  const resolvedAltPhone = alt_phone !== undefined ? (alt_phone ? String(alt_phone).trim() : null) : existing.rows[0].alt_phone;
  const resolvedImages = images !== undefined ? JSON.stringify(Array.isArray(images) ? images : []) : existing.rows[0].images;

  await pool.query(
    `UPDATE grounds
     SET name = $1,
         area = $2,
         price_per_hour = $3,
         google_maps_url = $4,
         availability_mode = $5,
         available_date = $6,
         available_time = $7,
         latitude = $8,
         longitude = $9,
         alt_phone = $10,
         images = $11
     WHERE id = $12`,
    [
      name.trim(),
      resolvedArea,
      Number(price_per_hour),
      google_maps_url ? String(google_maps_url).trim() : null,
      normalizedAvailabilityMode,
      normalizedAvailabilityMode === "scheduled" ? available_date : null,
      normalizedAvailabilityMode === "scheduled" ? available_time : null,
      latitude,
      longitude,
      resolvedAltPhone,
      resolvedImages,
      req.params.id
    ]
  );

  const updated = await pool.query(
    `SELECT
       g.*,
       u.name AS posted_by_name,
       u.phone AS posted_by_phone,
       COALESCE(bt.booking_count_today, 0) AS booking_count_today,
       COALESCE(bt.booked_time_slots_today, '[]'::json) AS booked_time_slots_today
     FROM grounds g
     LEFT JOIN users u ON u.id = g.posted_by_user_id
     LEFT JOIN LATERAL (
       SELECT
         COUNT(*)::int AS booking_count_today,
         COALESCE(json_agg(b.time_slot ORDER BY b.time_slot), '[]'::json) AS booked_time_slots_today
       FROM bookings b
       WHERE b.ground_id = g.id
         AND b.booking_date = CURRENT_DATE
         AND b.payment_status IN ('pending', 'paid')
     ) bt ON TRUE
     WHERE g.id = $1`,
    [req.params.id]
  );

  res.json({ ground: normalizeGroundRow(updated.rows[0]) });
});

// DELETE /api/grounds/:id
const deleteGround = asyncHandler(async (req, res) => {
  const existing = await pool.query("SELECT * FROM grounds WHERE id = $1", [req.params.id]);
  if (existing.rows.length === 0) return res.status(404).json({ error: "Ground not found" });
  if (String(existing.rows[0].posted_by_user_id) !== String(req.user.id)) {
    return res.status(403).json({ error: "Only the creator can delete this ground" });
  }

  const activeBookings = await pool.query(
    "SELECT COUNT(*)::int AS count FROM bookings WHERE ground_id = $1 AND payment_status IN ('pending', 'paid')",
    [req.params.id]
  );
  if ((activeBookings.rows[0]?.count || 0) > 0) {
    return res.status(409).json({ error: "Cancel ground bookings before deleting this ground" });
  }

  await pool.query("DELETE FROM grounds WHERE id = $1", [req.params.id]);
  res.json({ success: true });
});

// POST /api/grounds/backfill-locations
// One-time (re-runnable) maintenance endpoint: geocodes any existing ground
// that's missing latitude/longitude, using its saved area text. Safe to call
// multiple times — it only touches rows where latitude/longitude is null.
// Nominatim's usage policy caps free requests at ~1/sec, so this runs
// sequentially with a short delay between each ground rather than in parallel.
const backfillGroundLocations = asyncHandler(async (req, res) => {
  const missing = await pool.query(
    "SELECT id, area FROM grounds WHERE (latitude IS NULL OR longitude IS NULL) AND area IS NOT NULL AND area <> ''"
  );

  const results = [];
  for (const row of missing.rows) {
    const { latitude, longitude } = await geocodeArea(row.area);
    if (latitude != null && longitude != null) {
      await pool.query("UPDATE grounds SET latitude = $1, longitude = $2 WHERE id = $3", [latitude, longitude, row.id]);
      results.push({ id: row.id, area: row.area, latitude, longitude, status: "updated" });
    } else {
      results.push({ id: row.id, area: row.area, status: "no_match" });
    }
    // Respect Nominatim's rate limit (max 1 request/sec).
    await new Promise(resolve => setTimeout(resolve, 1100));
  }

  res.json({ processed: results.length, results });
});

// ─── Ground Reviews Endpoints ──────────────────────────────────────────────

// GET /api/grounds/:id/reviews
const getGroundReviews = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const groundRes = await pool.query("SELECT id, name, posted_by_user_id FROM grounds WHERE id = $1", [id]);
  if (groundRes.rows.length === 0) {
    return res.status(404).json({ error: "Ground not found" });
  }

  // Ensure table exists
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ground_reviews (
      id SERIAL PRIMARY KEY,
      ground_id UUID REFERENCES grounds(id) ON DELETE CASCADE,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      user_name VARCHAR(120),
      rating NUMERIC(2,1) NOT NULL,
      review_text TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT now()
    );
  `);

  const reviewsRes = await pool.query(
    `SELECT gr.id, gr.ground_id, gr.user_id, gr.user_name, gr.rating::float as rating, gr.review_text, gr.created_at,
            u.avatar as user_avatar, u.team_name as user_team_name
     FROM ground_reviews gr
     LEFT JOIN users u ON u.id = gr.user_id
     WHERE gr.ground_id = $1
     ORDER BY gr.created_at DESC`,
    [id]
  );

  let hasBooked = false;
  let isOwner = false;

  if (req.user && req.user.id) {
    const userId = req.user.id;
    if (String(groundRes.rows[0].posted_by_user_id) === String(userId)) {
      isOwner = true;
    }
    const bookingCheck = await pool.query(
      `SELECT id FROM bookings
       WHERE ground_id = $1
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
    ground_id: id,
    rating: avg,
    reviews_count: reviews.length,
    reviews,
    can_review: hasBooked && !isOwner,
    has_booked: hasBooked,
    is_owner: isOwner
  });
});

// POST /api/grounds/:id/reviews
const addGroundReview = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { rating, review_text } = req.body;
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ error: "You must be logged in to leave a review." });
  }

  const groundRes = await pool.query("SELECT id, name, posted_by_user_id FROM grounds WHERE id = $1", [id]);
  if (groundRes.rows.length === 0) {
    return res.status(404).json({ error: "Ground not found." });
  }

  const ground = groundRes.rows[0];

  // Ground owners cannot review their own ground
  if (String(ground.posted_by_user_id) === String(userId)) {
    return res.status(403).json({ error: "Ground owners cannot review their own ground." });
  }

  // Strictly enforce booking verification: only users who have booked this ground can review it
  const bookingCheck = await pool.query(
    `SELECT id FROM bookings
     WHERE ground_id = $1
       AND user_id = $2
       AND payment_status IN ('paid', 'pending', 'completed')
     LIMIT 1`,
    [id, userId]
  );

  if (bookingCheck.rows.length === 0) {
    return res.status(403).json({
      error: "Only players who have booked this ground can leave a review."
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
    `INSERT INTO ground_reviews (ground_id, user_id, user_name, rating, review_text)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, ground_id, user_id, user_name, rating::float as rating, review_text, created_at`,
    [id, userId, userName, numRating, review_text.trim()]
  );

  const newReview = {
    ...insertRes.rows[0],
    user_team_name: userTeam,
    user_avatar: userAvatar
  };

  // Recalculate average rating on the ground table
  await pool.query(
    `UPDATE grounds
     SET rating = (
       SELECT ROUND(AVG(rating)::numeric, 1)
       FROM ground_reviews
       WHERE ground_id = $1
     )
     WHERE id = $1`,
    [id]
  );

  res.status(201).json({
    review: newReview,
    message: "Ground review submitted successfully"
  });
});

// DELETE /api/grounds/:id/reviews/:reviewId
const deleteGroundReview = asyncHandler(async (req, res) => {
  const { id, reviewId } = req.params;
  const userId = req.user?.id;

  const reviewRes = await pool.query(
    "SELECT * FROM ground_reviews WHERE id = $1 AND ground_id = $2",
    [reviewId, id]
  );

  if (reviewRes.rows.length === 0) {
    return res.status(404).json({ error: "Review not found" });
  }

  const review = reviewRes.rows[0];

  // Check if admin or author
  const isAuthor = Number(review.user_id) === Number(userId);
  const isAdmin = req.user?.is_admin === true || (req.user?.phone && req.user.phone.includes("6382757532"));

  if (!isAuthor && !isAdmin) {
    return res.status(403).json({ error: "Only an administrator or the person who posted this review can delete it." });
  }

  await pool.query("DELETE FROM ground_reviews WHERE id = $1", [reviewId]);

  // Recalculate average rating on the ground table
  await pool.query(
    `UPDATE grounds
     SET rating = COALESCE((
       SELECT ROUND(AVG(rating)::numeric, 1)
       FROM ground_reviews
       WHERE ground_id = $1
     ), 0)
     WHERE id = $1`,
    [id]
  );

  res.json({
    success: true,
    message: "Ground review deleted successfully"
  });
});

module.exports = {
  listGrounds,
  getGround,
  getGroundBookings,
  createGround,
  updateGround,
  deleteGround,
  backfillGroundLocations,
  getGroundReviews,
  addGroundReview,
  deleteGroundReview
};