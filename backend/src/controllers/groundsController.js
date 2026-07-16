const pool = require("../config/db");
const asyncHandler = require("../utils/asyncHandler");

const BOOKING_LIMIT_PER_DAY = 2;

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
    booking_count_today: row.booking_count_today != null ? Number(row.booking_count_today) : 0,
    amenities: row.amenities ?? [],
    tags: row.tags ?? [],
    booked_time_slots_today: row.booked_time_slots_today ?? []
  };
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
     ${where}
     ORDER BY g.created_at DESC`,
    values
  );
  res.json({ grounds: result.rows.map(normalizeGroundRow) });
});

// GET /api/grounds/:id
const getGround = asyncHandler(async (req, res) => {
  const result = await pool.query(
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
  if (result.rows.length === 0) return res.status(404).json({ error: "Ground not found" });
  res.json({ ground: normalizeGroundRow(result.rows[0]) });
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

  res.json({ bookings: result.rows });
});

// POST /api/grounds — add a ground
const createGround = asyncHandler(async (req, res) => {
  const { name, area, google_maps_url, price_per_hour, availability_mode, available_date, available_time } = req.body;

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

  const result = await pool.query(
    `INSERT INTO grounds (name, area, price_per_hour, google_maps_url, posted_by_user_id, availability_mode, available_date, available_time)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      name.trim(),
      resolvedArea,
      Number(price_per_hour),
      resolvedMapsUrl,
      req.user.id,
      normalizedAvailabilityMode,
      normalizedAvailabilityMode === "scheduled" ? available_date : null,
      normalizedAvailabilityMode === "scheduled" ? available_time : null
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
  res.status(201).json({ ground: normalizeGroundRow(created.rows[0]) });
});

// PUT /api/grounds/:id
const updateGround = asyncHandler(async (req, res) => {
  const existing = await pool.query("SELECT * FROM grounds WHERE id = $1", [req.params.id]);
  if (existing.rows.length === 0) return res.status(404).json({ error: "Ground not found" });
  if (String(existing.rows[0].posted_by_user_id) !== String(req.user.id)) {
    return res.status(403).json({ error: "Only the creator can edit this ground" });
  }

  const { name, area, google_maps_url, price_per_hour, availability_mode, available_date, available_time } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: "Ground name is required" });
  if (!area || !area.trim()) return res.status(400).json({ error: "Location is required" });
  if (!price_per_hour || Number(price_per_hour) <= 0) return res.status(400).json({ error: "Price must be greater than 0" });

  const normalizedAvailabilityMode = availability_mode === "scheduled" ? "scheduled" : "always";
  if (normalizedAvailabilityMode === "scheduled" && (!available_date || !available_time)) {
    return res.status(400).json({ error: "Available date and time are required for scheduled availability" });
  }

  await pool.query(
    `UPDATE grounds
     SET name = $1,
         area = $2,
         price_per_hour = $3,
         google_maps_url = $4,
         availability_mode = $5,
         available_date = $6,
         available_time = $7
     WHERE id = $8`,
    [
      name.trim(),
      area.trim(),
      Number(price_per_hour),
      google_maps_url ? String(google_maps_url).trim() : null,
      normalizedAvailabilityMode,
      normalizedAvailabilityMode === "scheduled" ? available_date : null,
      normalizedAvailabilityMode === "scheduled" ? available_time : null,
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

module.exports = { listGrounds, getGround, getGroundBookings, createGround, updateGround, deleteGround };