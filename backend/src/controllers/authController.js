const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const pool = require("../config/db");
const asyncHandler = require("../utils/asyncHandler");

const RESET_TOKEN_EXPIRY_MS = 60 * 60 * 1000; // 1 hour

// Columns that are safe to return to the client. password_hash and reset
// token fields never leave this file.
const PUBLIC_USER_COLUMNS =
  "id, name, email, phone, team_name, village_name, team_year, created_at";

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

  console.log("Reset email sent:", info.messageId);
}

// POST /api/auth/signup
// Body: { name, email, phone, password, team_name, village_name, team_year }
const signup = asyncHandler(async (req, res) => {
  const { name, email, phone, password, team_name, village_name, team_year } = req.body;

  // name, email, phone and password are all required. team_name, village_name
  // and team_year are optional at signup time — the user can also add them
  // later from Edit Profile — but if provided they're validated below.
  if (!name || !email || !phone || !password) {
    return res.status(400).json({ error: "name, email, phone and password are required" });
  }

  let parsedYear = null;
  if (team_year !== undefined && team_year !== null && team_year !== "") {
    parsedYear = parseInt(team_year, 10);
    const currentYear = new Date().getFullYear();
    if (Number.isNaN(parsedYear) || parsedYear < 1900 || parsedYear > currentYear) {
      return res.status(400).json({ error: "Please enter a valid year the team was formed" });
    }
  }

  // Check email and phone for existing use in a single query, then figure out
  // which one(s) collided so we can give a precise, helpful error message.
  const existing = await pool.query(
    "SELECT email, phone FROM users WHERE email = $1 OR phone = $2",
    [email, phone]
  );

  if (existing.rows.length > 0) {
    const emailTaken = existing.rows.some((row) => row.email === email);
    const phoneTaken = existing.rows.some((row) => row.phone === phone);

    if (emailTaken && phoneTaken) {
      return res.status(409).json({ error: "Email and phone number are already registered" });
    }
    if (emailTaken) {
      return res.status(409).json({ error: "Email already registered" });
    }
    if (phoneTaken) {
      return res.status(409).json({ error: "Phone number already registered" });
    }
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const result = await pool.query(
    `INSERT INTO users (name, email, phone, password_hash, team_name, village_name, team_year)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING ${PUBLIC_USER_COLUMNS}`,
    [
      name,
      email,
      phone,
      passwordHash,
      team_name || null,
      village_name || null,
      parsedYear
    ]
  );

  const user = result.rows[0];

  // Signing up no longer grants access. No token is issued here —
  // the user has to log in separately to get one.
  res.status(201).json({ user, message: "Account created. Please log in." });
});

// POST /api/auth/login
// POST /api/auth/login   Body: { identifier, password }
// `identifier` can be either the account's email or phone number.
const login = asyncHandler(async (req, res) => {
  const { identifier, password } = req.body;
  if (!identifier || !password) {
    return res.status(400).json({ error: "email/phone and password are required" });
  }

  const result = await pool.query(
    "SELECT * FROM users WHERE email = $1 OR phone = $1",
    [identifier.trim()]
  );
  const user = result.rows[0];
  if (!user) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const token = signToken(user);
  delete user.password_hash;
  delete user.reset_password_token;
  delete user.reset_password_expires;
  res.json({ user, token });
});

// GET /api/auth/me
// Returns the full profile (name, email, phone, team_name, village_name, team_year).
// The UI decides what to show at a glance (name + phone) vs. in the edit form.
const me = asyncHandler(async (req, res) => {
  const result = await pool.query(
    `SELECT ${PUBLIC_USER_COLUMNS} FROM users WHERE id = $1`,
    [req.user.id]
  );
  if (result.rows.length === 0) return res.status(404).json({ error: "User not found" });
  res.json({ user: result.rows[0] });
});

// PUT /api/auth/profile
// Body: any subset of { name, email, phone, team_name, village_name, team_year }
// Lets a logged-in user edit their own profile, including the team fields
// used to group teammates together in "My Team". Password changes are not
// handled here — that goes through the separate forgot/reset-password flow.
const updateProfile = asyncHandler(async (req, res) => {
  const { name, email, phone, team_name, village_name, team_year } = req.body;

  if (!name || !email || !phone) {
    return res.status(400).json({ error: "name, email and phone are required" });
  }

  let parsedYear = null;
  if (team_year !== undefined && team_year !== null && team_year !== "") {
    parsedYear = parseInt(team_year, 10);
    const currentYear = new Date().getFullYear();
    if (Number.isNaN(parsedYear) || parsedYear < 1900 || parsedYear > currentYear) {
      return res.status(400).json({ error: "Please enter a valid year the team was formed" });
    }
  }

  // Make sure the new email/phone isn't already used by a *different* account.
  const clash = await pool.query(
    "SELECT id FROM users WHERE (email = $1 OR phone = $2) AND id != $3",
    [email, phone, req.user.id]
  );
  if (clash.rows.length > 0) {
    return res.status(409).json({ error: "Email or phone number already in use by another account" });
  }

  const result = await pool.query(
    `UPDATE users
     SET name = $1,
         email = $2,
         phone = $3,
         team_name = $4,
         village_name = $5,
         team_year = $6
     WHERE id = $7
     RETURNING ${PUBLIC_USER_COLUMNS}`,
    [
      name,
      email,
      phone,
      team_name || null,
      village_name || null,
      parsedYear,
      req.user.id
    ]
  );

  res.json({ user: result.rows[0], message: "Profile updated" });
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

module.exports = { signup, login, me, updateProfile, forgotPassword, resetPassword };