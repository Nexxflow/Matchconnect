const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const pool = require("../config/db");
const asyncHandler = require("../utils/asyncHandler");

const RESET_TOKEN_EXPIRY_MS = 60 * 60 * 1000; // 1 hour

function signToken(user) {
  return jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d"
  });
}

// ─── Mailer setup ───────────────────────────────────────────────────────────
// Configure these in your .env file:
//   SMTP_HOST=smtp.gmail.com
//   SMTP_PORT=587
//   SMTP_SECURE=false
//   SMTP_USER=you@gmail.com
//   SMTP_PASS=your-app-password        <- Gmail: use an "App Password", not your real password
//   MAIL_FROM="MatchConnect <no-reply@matchconnect.com>"
//
// Any SMTP provider works the same way (SendGrid, Mailtrap, AWS SES, Resend SMTP, etc).
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: process.env.SMTP_SECURE === "true", // true for port 465, false for 587/25
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

async function sendResetEmail(toEmail, resetUrl) {
  const info = await transporter.sendMail({
    from: process.env.MAIL_FROM || process.env.SMTP_USER,
    to: toEmail,
    subject: "Reset your MatchConnect password",
    text: `We received a request to reset your password.\n\nClick the link below to choose a new one (valid for 1 hour):\n${resetUrl}\n\nIf you didn't request this, you can safely ignore this email.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color:#111;">Reset your password</h2>
        <p style="color:#444;">We received a request to reset your MatchConnect password. This link is valid for 1 hour.</p>
        <p style="margin: 24px 0;">
          <a href="${resetUrl}" style="background:#22c55e;color:#000;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:bold;">
            Reset Password
          </a>
        </p>
        <p style="color:#888;font-size:12px;">If you didn't request this, you can safely ignore this email.</p>
      </div>
    `
  });

  // Helpful during development: logs a preview URL only if you're using something
  // like Ethereal test SMTP. Safe to leave in — it's a no-op on real providers.
  console.log("Reset email sent:", info.messageId);
}

// POST /api/auth/signup
const signup = asyncHandler(async (req, res) => {
  const { name, email, phone, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: "name, email and password are required" });
  }

  const existing = await pool.query("SELECT id FROM users WHERE email = $1", [email]);
  if (existing.rows.length > 0) {
    return res.status(409).json({ error: "Email already registered" });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const result = await pool.query(
    `INSERT INTO users (name, email, phone, password_hash)
     VALUES ($1, $2, $3, $4)
     RETURNING id, name, email, phone, created_at`,
    [name, email, phone || null, passwordHash]
  );

  const user = result.rows[0];
  const token = signToken(user);
  res.status(201).json({ user, token });
});

// POST /api/auth/login
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "email and password are required" });
  }

  const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
  const user = result.rows[0];
  if (!user) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  const token = signToken(user);
  delete user.password_hash;
  res.json({ user, token });
});

// GET /api/auth/me
const me = asyncHandler(async (req, res) => {
  const result = await pool.query(
    "SELECT id, name, email, phone, created_at FROM users WHERE id = $1",
    [req.user.id]
  );
  if (result.rows.length === 0) return res.status(404).json({ error: "User not found" });
  res.json({ user: result.rows[0] });
});

// POST /api/auth/forgot-password
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "email is required" });

  const result = await pool.query("SELECT id FROM users WHERE email = $1", [email]);
  const user = result.rows[0];

  // Respond the same way whether or not the email exists, so this endpoint
  // can't be used to discover which emails are registered.
  if (!user) {
    return res.json({ message: "If that email is registered, a reset link has been sent." });
  }

  

  const rawToken = crypto.randomBytes(32).toString("hex");
  const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");
  const expires = new Date(Date.now() + RESET_TOKEN_EXPIRY_MS);

  await pool.query(
    "UPDATE users SET reset_password_token = $1, reset_password_expires = $2 WHERE id = $3",
    [hashedToken, expires, user.id]
  );

  const resetUrl = `${process.env.FRONTEND_URL || "http://localhost:5173"}/reset-password/${rawToken}`;

  try {
    await sendResetEmail(email, resetUrl);
  } catch (err) {
    // Don't leak email-provider failures to the client (would reveal whether
    // the email exists / expose internal errors). Log it for yourself instead.
    console.error("Failed to send reset email:", err);
  }

  res.json({ message: "If that email is registered, a reset link has been sent." });
});

// POST /api/auth/reset-password/:token
const resetPassword = asyncHandler(async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: "New password is required" });
  if (password.length < 8) return res.status(400).json({ error: "Password must be at least 8 characters" });

  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

  const result = await pool.query(
    "SELECT id FROM users WHERE reset_password_token = $1 AND reset_password_expires > NOW()",
    [hashedToken]
  );
  const user = result.rows[0];
  if (!user) {
    return res.status(400).json({ error: "Reset link is invalid or has expired" });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await pool.query(
    "UPDATE users SET password_hash = $1, reset_password_token = NULL, reset_password_expires = NULL WHERE id = $2",
    [passwordHash, user.id]
  );

  res.json({ message: "Password has been reset. You can now log in." });
});

module.exports = { signup, login, me, forgotPassword, resetPassword };