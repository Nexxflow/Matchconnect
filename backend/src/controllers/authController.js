const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const pool = require("../config/db");
const asyncHandler = require("../utils/asyncHandler");

const RESET_TOKEN_EXPIRY_MS = 60 * 60 * 1000; // 1 hour

// Columns that are safe to return to the client. password_hash and reset
// token fields never leave this file.
// NOTE: team_id is included here on purpose — without it the frontend's
// `myTeamId` is always empty, which is what caused teammates like D to fall
// through to name-matching on every single tournament request.
const PUBLIC_USER_COLUMNS =
  "id, name, email, phone, team_id, team_name, village_name, team_year, COALESCE(is_admin, false) AS is_admin, created_at";

const ADMIN_PHONE = "6382757532";

function isAdminPhone(phone) {
  if (!phone) return false;
  const digits = String(phone).replace(/\D/g, "");
  return digits.endsWith(ADMIN_PHONE) || digits === ADMIN_PHONE;
}

function signToken(user) {
  return jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d"
  });
}

// ─── Team self-heal ─────────────────────────────────────────────────────────
async function backfillTeamId(user) {
  if (!user || user.team_id || !user.team_name?.trim()) return user;

  const teamRes = await pool.query(
    `SELECT id FROM teams WHERE LOWER(TRIM(name)) = LOWER(TRIM($1)) LIMIT 1`,
    [user.team_name.trim()]
  );
  const team = teamRes.rows[0];
  if (!team) return user;

  await pool.query(`UPDATE users SET team_id = $1 WHERE id = $2`, [team.id, user.id]);
  user.team_id = team.id;
  return user;
}

// ─── Mailer setup ───────────────────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: process.env.SMTP_SECURE === "true",
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
const signup = asyncHandler(async (req, res) => {
  const { name, email, phone, password, team_name, village_name, team_year, terms_accepted } = req.body;

  if (!name || !email || !phone || !password) {
    return res.status(400).json({ error: "name, email, phone and password are required" });
  }

  if (terms_accepted !== true && terms_accepted !== "true" && terms_accepted !== 1) {
    return res.status(400).json({ error: "You must accept the Terms & Conditions to create an account." });
  }

  let parsedYear = null;
  if (team_year !== undefined && team_year !== null && team_year !== "") {
    parsedYear = parseInt(team_year, 10);
    const currentYear = new Date().getFullYear();
    if (Number.isNaN(parsedYear) || parsedYear < 1900 || parsedYear > currentYear) {
      return res.status(400).json({ error: "Please enter a valid year the team was formed" });
    }
  }

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
  let result;
  try {
    result = await pool.query(
      `INSERT INTO users (name, email, phone, password_hash, team_name, village_name, team_year, terms_accepted, terms_accepted_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, true, now())
       RETURNING ${PUBLIC_USER_COLUMNS}`,
      [name, email, phone, passwordHash, team_name || null, village_name || null, parsedYear]
    );
  } catch (dbErr) {
    if (dbErr.message && dbErr.message.includes("terms_accepted")) {
      result = await pool.query(
        `INSERT INTO users (name, email, phone, password_hash, team_name, village_name, team_year)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING ${PUBLIC_USER_COLUMNS}`,
        [name, email, phone, passwordHash, team_name || null, village_name || null, parsedYear]
      );
    } else {
      throw dbErr;
    }
  }

  const user = await backfillTeamId(result.rows[0]);

  res.status(201).json({ user, message: "Account created. Please log in." });
});

// POST /api/auth/login
const login = asyncHandler(async (req, res) => {
  const { identifier, password } = req.body;
  if (!identifier || !password) {
    return res.status(400).json({ error: "Email or phone number and password are required" });
  }

  const cleanId = String(identifier).trim();
  const digits = cleanId.replace(/\D/g, "");

  const result = await pool.query(
    `SELECT * FROM users
     WHERE LOWER(TRIM(email)) = LOWER($1)
        OR phone = $1
        OR ($2 != '' AND LENGTH($2) >= 10 AND RIGHT(REGEXP_REPLACE(phone, '\\D', '', 'g'), 10) = RIGHT($2, 10))
     LIMIT 1`,
    [cleanId, digits]
  );
  const user = result.rows[0];
  if (!user) {
    return res.status(401).json({ error: "Invalid credentials. No user found with these credentials in database." });
  }

  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) {
    return res.status(401).json({ error: "Invalid credentials. Password does not match." });
  }

  await backfillTeamId(user);

  if (isAdminPhone(user.phone) && !user.is_admin) {
    try {
      await pool.query("UPDATE users SET is_admin = true WHERE id = $1", [user.id]);
      user.is_admin = true;
    } catch {}
  }

  try {
    await pool.query("UPDATE users SET last_login = NOW() WHERE id = $1", [user.id]);
  } catch {}

  console.log(`🔐 [Auth Login] User ${user.name} (${user.phone}) logged in. ADMIN: ${user.is_admin ? "YES (ADMIN)" : "NO (REGULAR)"}`);

  const token = signToken(user);
  delete user.password_hash;
  delete user.reset_password_token;
  delete user.reset_password_expires;
  res.json({ user, token });
});

// GET /api/auth/me
const me = asyncHandler(async (req, res) => {
  const result = await pool.query(
    `SELECT ${PUBLIC_USER_COLUMNS} FROM users WHERE id = $1`,
    [req.user.id]
  );
  if (result.rows.length === 0) return res.status(404).json({ error: "User not found" });

  const user = await backfillTeamId(result.rows[0]);
  if (isAdminPhone(user.phone) && !user.is_admin) {
    try {
      await pool.query("UPDATE users SET is_admin = true WHERE id = $1", [user.id]);
      user.is_admin = true;
    } catch {}
  }
  console.log(`👤 [Auth /me] Profile fetched for ${user.name} (${user.phone}). ADMIN: ${user.is_admin ? "YES (ADMIN)" : "NO (REGULAR)"}`);
  res.json({ user });
});

// PUT /api/auth/profile
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
    [name, email, phone, team_name || null, village_name || null, parsedYear, req.user.id]
  );

  const user = await backfillTeamId(result.rows[0]);

  res.json({ user, message: "Profile updated" });
});

// POST /api/auth/forgot-password
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "email is required" });

  const result = await pool.query("SELECT id FROM users WHERE email = $1", [email]);
  const user = result.rows[0];

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

// DELETE /api/auth/account
// Body: { password }  — user must re-enter their password to confirm deletion.
// Deletes/detaches the user's data across every table that references
// users.id, then deletes the user row itself, all inside one transaction.
//
// Order matters here: messages/challenges/tournament_registrations have a
// plain FK to users (no ON DELETE behaviour), so those rows must be cleared
// or detached BEFORE the user row is deleted, or Postgres will reject the
// delete with a foreign key violation. bookings.user_id has ON DELETE
// CASCADE, so it must be nulled out first too — otherwise deleting the user
// would silently cascade-delete the booking/payment records we want to keep
// for accounting. grounds.posted_by_user_id and umpires.created_by /
// user_id are all declared ON DELETE SET NULL in the schema, so Postgres
// clears those automatically — no explicit cleanup needed for those two.
// Note: teams.owner_id is typed UUID while users.id is an integer, so it
// can never reference a user row — nothing to clean up there either.
const deleteAccount = asyncHandler(async (req, res) => {
  const { password } = req.body;
  if (!password) {
    return res.status(400).json({ error: "Please re-enter your password to confirm account deletion." });
  }

  const result = await pool.query("SELECT * FROM users WHERE id = $1", [req.user.id]);
  const user = result.rows[0];
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) {
    return res.status(401).json({ error: "Incorrect password." });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1. Messages this user sent.
    await client.query("DELETE FROM messages WHERE sender_id = $1", [req.user.id]);

    // 2. Challenges this user created — cascades to any remaining messages
    //    tied to those challenges (messages.challenge_id ON DELETE CASCADE).
    await client.query("DELETE FROM challenges WHERE creator_id = $1", [req.user.id]);

    // 3. Challenges this user *accepted* (created by someone else) — keep
    //    the challenge for the other team, just clear who accepted it.
    await client.query(
      "UPDATE challenges SET accepted_by_user_id = NULL WHERE accepted_by_user_id = $1",
      [req.user.id]
    );

    // 4. Tournament registrations — keep the team's registration record,
    //    clear who registered it.
    await client.query(
      "UPDATE tournament_registrations SET registered_by = NULL WHERE registered_by = $1",
      [req.user.id]
    );

    // 5. Bookings — retain for accounting/Razorpay records, just detach the
    //    user. Must run before deleting the user row (see comment above).
    await client.query("UPDATE bookings SET user_id = NULL WHERE user_id = $1", [req.user.id]);

    // 6. In-app notifications (plain text user_id column, no FK).
    await client.query("DELETE FROM in_app_notifications WHERE user_id = $1::text", [req.user.id]);

    // 7. Finally, delete the user's own row.
    await client.query("DELETE FROM users WHERE id = $1", [req.user.id]);

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }

  console.log(`🗑️ [Delete Account] User ${user.name} (${user.phone}) deleted their account.`);
  res.json({ message: "Your account has been deleted." });
});

module.exports = { signup, login, me, updateProfile, forgotPassword, resetPassword, deleteAccount };