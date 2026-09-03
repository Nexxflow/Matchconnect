const { Pool } = require("pg");
require("dotenv").config();

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set — check your .env file");
}

// SSL required for cloud-hosted PostgreSQL (Neon, Supabase, Railway, etc.)
// but must be off for local PostgreSQL running on localhost.
const isLocal = /localhost|127\.0\.0\.1/.test(process.env.DATABASE_URL);

// Log which host/mode we're connecting to (without leaking credentials) so
// misconfigured env vars are obvious immediately on startup.
try {
  const parsed = new URL(process.env.DATABASE_URL);
  console.log(`🗄️  DB target: ${parsed.hostname}:${parsed.port || 5432} (ssl: ${!isLocal})`);
} catch {
  console.warn("⚠️  DATABASE_URL doesn't look like a valid connection string");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isLocal ? false : { rejectUnauthorized: false },
  // Fail fast instead of hanging for 30+ seconds on a dead/unreachable host.
  // Bumped up a bit to tolerate cold starts on free-tier hosted Postgres
  // (Neon/Supabase/Railway suspend after inactivity and take a few seconds
  // to wake back up on the first query).
  connectionTimeoutMillis: 15000,
  idleTimeoutMillis: 30000,
  max: 10
});

pool.on("error", (err) => {
  console.error("Unexpected PG pool error:", err);
});

// Retries the initial connection a few times with backoff. Mainly there to
// smooth over free-tier DB cold starts — the first ping after idle can be
// slow, so a single failed attempt doesn't necessarily mean the DB is down.
async function connectWithRetry(retries = 3, delayMs = 2000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const result = await pool.query("SELECT NOW()");
      console.log("✅ PostgreSQL Connected:", result.rows[0].now);

      try {
        await pool.query(`
          CREATE TABLE IF NOT EXISTS in_app_notifications (
            id SERIAL PRIMARY KEY,
            user_id TEXT NOT NULL,
            title VARCHAR(255) NOT NULL,
            body TEXT NOT NULL,
            type VARCHAR(50) DEFAULT 'general',
            data JSONB DEFAULT '{}',
            is_read BOOLEAN DEFAULT false,
            created_at TIMESTAMPTZ DEFAULT now()
          );
        `);
        await pool.query(`
          ALTER TABLE in_app_notifications ALTER COLUMN user_id TYPE TEXT;
        `).catch(() => {});
        await pool.query(`
          CREATE INDEX IF NOT EXISTS idx_in_app_notifs_user ON in_app_notifications(user_id);
        `).catch(() => {});
        await pool.query(`
          CREATE INDEX IF NOT EXISTS idx_in_app_notifs_user_created ON in_app_notifications(user_id, created_at DESC);
        `).catch(() => {});
        console.log("✅ in_app_notifications table ready (user_id TEXT, indexed)");
      } catch (tblErr) {
        console.error("❌ in_app_notifications table creation error in db.js:", tblErr.message);
      }

      return true;
    } catch (err) {
      console.error(`❌ PG connect attempt ${attempt}/${retries} failed: ${err.message}`);
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, delayMs));
      }
    }
  }
  console.error("❌ Could not connect to PostgreSQL after retries — check DATABASE_URL, network, and provider status");
  return false;
}

// Fire on module load so it runs as soon as db.js is required by index.js.
connectWithRetry();

module.exports = pool;