const crypto = require("crypto");
const pool = require("../config/db");
const razorpay = require("../config/razorpay");
const asyncHandler = require("../utils/asyncHandler");

const PLATFORM_FEE_PCT = 0.05;
const GROUND_BOOKING_LIMIT_PER_DAY = 2;

async function getTeamProfile(userId) {
  const result = await pool.query(
    "SELECT team_name, village_name, team_year FROM users WHERE id = $1",
    [userId]
  );
  return result.rows[0] || null;
}

async function getTeamMemberIds(userId) {
  const profile = await getTeamProfile(userId);
  if (!profile || !profile.team_name || !profile.village_name || !profile.team_year) {
    return [userId];
  }

  const result = await pool.query(
    `SELECT id
     FROM users
     WHERE LOWER(TRIM(team_name)) = LOWER(TRIM($1))
       AND LOWER(TRIM(village_name)) = LOWER(TRIM($2))
       AND team_year = $3`,
    [profile.team_name, profile.village_name, profile.team_year]
  );
  return result.rows.map(row => row.id);
}

function sameTeam(a, b) {
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

// Detect placeholder/unconfigured Razorpay keys so local dev works without a real account
const isRazorpayConfigured =
  process.env.RAZORPAY_KEY_ID &&
  process.env.RAZORPAY_KEY_SECRET &&
  !process.env.RAZORPAY_KEY_ID.includes("dummy") &&
  !process.env.RAZORPAY_KEY_ID.includes("xxxx");

// POST /api/bookings/create-order
// Body: { booking_type: 'ground'|'umpire', ref_id, booking_date, time_slot, team_id }
const createOrder = asyncHandler(async (req, res) => {
  const { booking_type, ref_id, booking_date, time_slot, team_id } = req.body;

  if (!["ground", "umpire"].includes(booking_type) || !ref_id || !booking_date || !time_slot) {
    return res.status(400).json({ error: "booking_type, ref_id, booking_date and time_slot are required" });
  }

  const table = booking_type === "ground" ? "grounds" : "umpires";
  const priceCol = booking_type === "ground" ? "price_per_hour" : "price";
  const itemResult = await pool.query(`SELECT * FROM ${table} WHERE id = $1`, [ref_id]);
  if (itemResult.rows.length === 0) {
    return res.status(404).json({ error: `${booking_type} not found` });
  }
  const item = itemResult.rows[0];

  if (booking_type === "ground") {
    const ownerProfile = await getTeamProfile(item.posted_by_user_id);
    const requesterProfile = await getTeamProfile(req.user.id);

    if (item.availability_mode === "scheduled" && item.available_date && String(item.available_date).slice(0, 10) !== String(booking_date).slice(0, 10)) {
      return res.status(409).json({ error: "This ground is only available on its posted date" });
    }

    if (String(item.posted_by_user_id) === String(req.user.id) || sameTeam(ownerProfile, requesterProfile)) {
      return res.status(403).json({ error: "You and your teammates cannot book your own ground" });
    }

    const sameTeamBookings = await pool.query(
      `SELECT COUNT(*)::int AS count
       FROM bookings
       WHERE ground_id = $1
         AND booking_date = $2
         AND payment_status IN ('pending', 'paid')
         AND user_id = ANY($3::uuid[])`,
      [ref_id, booking_date, await getTeamMemberIds(req.user.id)]
    );
    if ((sameTeamBookings.rows[0]?.count || 0) > 0) {
      return res.status(409).json({ error: "Your team already booked this ground for that day" });
    }

    const dayBookingCount = await pool.query(
      `SELECT COUNT(*)::int AS count
       FROM bookings
       WHERE ground_id = $1
         AND booking_date = $2
         AND payment_status IN ('pending', 'paid')`,
      [ref_id, booking_date]
    );
    if ((dayBookingCount.rows[0]?.count || 0) >= GROUND_BOOKING_LIMIT_PER_DAY) {
      return res.status(409).json({ error: "This ground has reached the booking limit for the day" });
    }

    const slotTaken = await pool.query(
      `SELECT 1 FROM bookings
       WHERE ground_id = $1
         AND booking_date = $2
         AND time_slot = $3
         AND payment_status IN ('pending', 'paid')
       LIMIT 1`,
      [ref_id, booking_date, time_slot]
    );
    if (slotTaken.rows.length > 0) {
      return res.status(409).json({ error: "That time slot is already booked" });
    }
  }

  const baseAmount = Number(item[priceCol]);
  const platformFee = Math.round(baseAmount * PLATFORM_FEE_PCT);
  const totalAmount = baseAmount + platformFee;

  // Create booking row in 'pending' state
  const bookingInsert = await pool.query(
    `INSERT INTO bookings (user_id, team_id, booking_type, ground_id, umpire_id, booking_date, time_slot, base_amount, platform_fee, total_amount)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
    [
      req.user.id,
      team_id || null,
      booking_type,
      booking_type === "ground" ? ref_id : null,
      booking_type === "umpire" ? ref_id : null,
      booking_date,
      time_slot,
      baseAmount,
      platformFee,
      totalAmount
    ]
  );
  let booking = bookingInsert.rows[0];

  // TEST MODE: no real Razorpay keys configured — mark as paid immediately so local dev works.
  if (!isRazorpayConfigured) {
    const paidResult = await pool.query(
      `UPDATE bookings SET payment_status = 'paid', razorpay_order_id = 'test_order_' || id
       WHERE id = $1 RETURNING *`,
      [booking.id]
    );
    booking = paidResult.rows[0];
    return res.status(201).json({
      booking,
      test_mode: true,
      message: "Razorpay not configured — booking auto-confirmed in test mode."
    });
  }

  // Create Razorpay order (amount in paise)
  const order = await razorpay.orders.create({
    amount: Math.round(totalAmount * 100),
    currency: "INR",
    receipt: booking.id,
    notes: { booking_id: booking.id, booking_type }
  });

  await pool.query("UPDATE bookings SET razorpay_order_id = $1 WHERE id = $2", [order.id, booking.id]);

  res.status(201).json({
    booking,
    test_mode: false,
    razorpay_order: order,
    razorpay_key_id: process.env.RAZORPAY_KEY_ID
  });
});

// POST /api/bookings/verify-payment
// Body: { booking_id, razorpay_order_id, razorpay_payment_id, razorpay_signature }
const verifyPayment = asyncHandler(async (req, res) => {
  const { booking_id, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  if (!booking_id || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({ error: "Missing payment verification fields" });
  }

  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");

  if (expectedSignature !== razorpay_signature) {
    await pool.query("UPDATE bookings SET payment_status = 'failed' WHERE id = $1", [booking_id]);
    return res.status(400).json({ error: "Payment verification failed" });
  }

  const result = await pool.query(
    `UPDATE bookings
     SET payment_status = 'paid', razorpay_payment_id = $1
     WHERE id = $2 AND user_id = $3 RETURNING *`,
    [razorpay_payment_id, booking_id, req.user.id]
  );

  if (result.rows.length === 0) return res.status(404).json({ error: "Booking not found" });
  res.json({ booking: result.rows[0], message: "Payment verified, booking confirmed" });
});

// GET /api/bookings/mine
const myBookings = asyncHandler(async (req, res) => {
  const teamIds = await getTeamMemberIds(req.user.id);
  const result = await pool.query(
    `SELECT b.*, g.name AS ground_name, g.area AS ground_area, g.posted_by_user_id AS ground_owner_id, u.name AS umpire_name, booked_by.name AS booked_by_name, booked_by.phone AS booked_by_phone, booked_by.team_name AS booked_by_team_name
     FROM bookings b
     LEFT JOIN grounds g ON b.ground_id = g.id
     LEFT JOIN umpires u ON b.umpire_id = u.id
     LEFT JOIN users booked_by ON booked_by.id = b.user_id
     WHERE b.user_id = ANY($1::uuid[])
     ORDER BY b.created_at DESC`,
    [teamIds]
  );
  res.json({ bookings: result.rows });
});

// DELETE /api/bookings/:id
const cancelBooking = asyncHandler(async (req, res) => {
  const bookingResult = await pool.query(
    `SELECT b.*, g.posted_by_user_id AS ground_owner_id
     FROM bookings b
     LEFT JOIN grounds g ON b.ground_id = g.id
     WHERE b.id = $1`,
    [req.params.id]
  );
  const booking = bookingResult.rows[0];
  if (!booking) return res.status(404).json({ error: "Booking not found" });

  const teamIds = await getTeamMemberIds(req.user.id);
  const allowedToCancel =
    String(booking.user_id) === String(req.user.id) ||
    (booking.booking_type === "ground" && teamIds.includes(booking.user_id));

  if (!allowedToCancel) {
    return res.status(403).json({ error: "You can only cancel your own team bookings" });
  }

  await pool.query("DELETE FROM bookings WHERE id = $1", [req.params.id]);
  res.json({ success: true });
});

module.exports = { createOrder, verifyPayment, myBookings, cancelBooking };