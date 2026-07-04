const crypto = require("crypto");
const pool = require("../config/db");
const razorpay = require("../config/razorpay");
const asyncHandler = require("../utils/asyncHandler");

const PLATFORM_FEE_PCT = 0.05;

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
  const result = await pool.query(
    `SELECT b.*, g.name AS ground_name, u.name AS umpire_name
     FROM bookings b
     LEFT JOIN grounds g ON b.ground_id = g.id
     LEFT JOIN umpires u ON b.umpire_id = u.id
     WHERE b.user_id = $1
     ORDER BY b.created_at DESC`,
    [req.user.id]
  );
  res.json({ bookings: result.rows });
});

module.exports = { createOrder, verifyPayment, myBookings };