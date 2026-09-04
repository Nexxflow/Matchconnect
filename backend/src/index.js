require("dotenv").config();

process.on("uncaughtException", (err) => {
  console.error("💥 [Uncaught Exception] Handled gracefully:", err.message);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("💥 [Unhandled Rejection] Handled gracefully:", reason);
});

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const nodemailer = require("nodemailer");

const pool = require("./config/db");
const errorHandler = require("./middleware/errorHandler");

// =========================
// Routes
// =========================
const authRoutes = require("./routes/authRoutes");
const teamsRoutes = require("./routes/teamsRoutes");
const groundsRoutes = require("./routes/groundsRoutes");
const umpiresRoutes = require("./routes/umpiresRoutes");
const bookingsRoutes = require("./routes/bookingsRoutes");
const tournamentsRoutes = require("./routes/tournamentsRoutes");
const challengesRoutes = require("./routes/challengesRoutes");
const usersRoutes = require("./routes/usersRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const liveScoreRoutes = require("./routes/liveScoreRoutes");

const app = express();

// ====================================================
// Test PostgreSQL Connection
// ====================================================

(async () => {
  try {
    const result = await pool.query("SELECT NOW()");
   
    console.log("✅ PostgreSQL Connected:", result.rows[0].now);

    // Auto-patch missing columns and tables to guarantee all queries never fail
    await pool.query(`
      ALTER TABLE matches ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
      ALTER TABLE matches ADD COLUMN IF NOT EXISTS result TEXT;
      ALTER TABLE matches ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id) ON DELETE SET NULL;
      ALTER TABLE overs ADD COLUMN IF NOT EXISTS is_completed BOOLEAN DEFAULT false;
      ALTER TABLE overs ADD COLUMN IF NOT EXISTS runs_conceded INT DEFAULT 0;
      ALTER TABLE overs ADD COLUMN IF NOT EXISTS wickets INT DEFAULT 0;
      ALTER TABLE batting_stats ADD COLUMN IF NOT EXISTS is_on_strike BOOLEAN DEFAULT false;
      ALTER TABLE bowling_stats ADD COLUMN IF NOT EXISTS is_current BOOLEAN DEFAULT false;
      ALTER TABLE players ADD COLUMN IF NOT EXISTS match_id UUID REFERENCES matches(id) ON DELETE CASCADE;
      ALTER TABLE matches ADD COLUMN IF NOT EXISTS tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE;
      ALTER TABLE matches ADD COLUMN IF NOT EXISTS team1_name VARCHAR(150);
      ALTER TABLE matches ADD COLUMN IF NOT EXISTS team2_name VARCHAR(150);
      ALTER TABLE matches ADD COLUMN IF NOT EXISTS man_of_the_match VARCHAR(150);
      ALTER TABLE matches ADD COLUMN IF NOT EXISTS mom VARCHAR(150);
      ALTER TABLE matches ADD COLUMN IF NOT EXISTS scoreboard_url TEXT;
      ALTER TABLE matches ADD COLUMN IF NOT EXISTS scoreboard_name VARCHAR(255);
      ALTER TABLE matches ADD COLUMN IF NOT EXISTS round VARCHAR(100);
      ALTER TABLE matches ADD COLUMN IF NOT EXISTS match_date TIMESTAMPTZ;
      CREATE INDEX IF NOT EXISTS idx_matches_tournament_id ON matches(tournament_id);

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

      CREATE TABLE IF NOT EXISTS challenge_acceptances (
        id SERIAL PRIMARY KEY,
        challenge_id UUID,
        accepted_by_user_id INTEGER,
        accepted_by_team_name VARCHAR(120),
        creator_team_name VARCHAR(120),
        created_at TIMESTAMPTZ DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS challenge_cancellations (
        id SERIAL PRIMARY KEY,
        challenge_id UUID,
        cancelled_by_user_id INTEGER,
        cancelled_by_team_name VARCHAR(120),
        created_at TIMESTAMPTZ DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS team_reviews (
        id SERIAL PRIMARY KEY,
        team_name VARCHAR(120) NOT NULL,
        reviewer_user_id INTEGER,
        reviewer_name VARCHAR(120),
        reviewer_team_name VARCHAR(120),
        rating NUMERIC(2,1) NOT NULL,
        review_text TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT now()
      );

      CREATE INDEX IF NOT EXISTS idx_team_reviews_team ON team_reviews(team_name);
      CREATE INDEX IF NOT EXISTS idx_cancellations_team ON challenge_cancellations(cancelled_by_team_name);
      CREATE INDEX IF NOT EXISTS idx_acceptances_team ON challenge_acceptances(accepted_by_team_name);

      ALTER TABLE teams ADD COLUMN IF NOT EXISTS created_by INTEGER;
      ALTER TABLE umpires ADD COLUMN IF NOT EXISTS created_by INTEGER;
      ALTER TABLE umpires ADD COLUMN IF NOT EXISTS user_id INTEGER;
    `);
    console.log("✅ Database schema auto-patch completed");
    
  } catch (err) {
    console.error("❌ PostgreSQL Connection / Schema Patch Error:", err.message);
  }
})();

// ====================================================
// Allowed Frontend Origins
// ====================================================

const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "https://hdr2k2kf-5173.inc1.devtunnels.ms",
  process.env.FRONTEND_URL,
].filter(Boolean);

// ====================================================
// Middleware
// ====================================================

app.use(helmet());

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      
      console.log("❌ CORS BLOCKED");
      console.log("Origin:", origin);
      console.log("Allowed:", allowedOrigins);
      

      callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);

app.use(express.json({ limit: "50mb" }));

app.use(
  express.urlencoded({
    extended: true,
    limit: "50mb",
  })
);

app.use(morgan("dev"));

// ====================================================
// Request Logger
// ====================================================

app.use((req, res, next) => {
  // Only log detailed multi-line payload for state-modifying requests (POST, PUT, PATCH, DELETE)
  // Routine GET requests are already logged in a single concise line by morgan("dev")
  if (req.method === "GET") {
    return next();
  }

  console.log("📥 Incoming Mutation Request");
  console.log("Time:", new Date().toLocaleString());
  console.log("Method:", req.method);
  console.log("URL:", req.originalUrl);
  console.log("Origin:", req.headers.origin);
  console.log("Authorization:", req.headers.authorization ? "Present" : "None");
  console.log("Body:", req.body);

  next();
});

// ====================================================
// Health Check
// ====================================================

app.get("/health", (req, res) => {
  res.json({
    success: true,
    service: "MatchConnect Backend",
    status: "Running",
    timestamp: new Date(),
  });
});

// ====================================================
// Routes
// ====================================================

app.use("/api/auth", authRoutes);
app.use("/api/teams", teamsRoutes);

app.use("/api/grounds", groundsRoutes);
app.use("/api/umpires", umpiresRoutes);
app.use("/api/bookings", bookingsRoutes);
app.use("/api/tournaments", tournamentsRoutes);
app.use("/api/challenges", challengesRoutes);
app.use("/api/matches", liveScoreRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/notifications", notificationRoutes);

// ====================================================
// 404
// ====================================================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Route not found",
  });
});

// ====================================================
// Error Handler
// ====================================================

app.use(errorHandler);

// ====================================================
// SMTP
// ====================================================

// ====================================================
// SMTP
// ====================================================

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

transporter.verify((error) => {
  if (error) {
    console.error("❌ SMTP unreachable (email sending will fail until network/DNS is fixed):", error.message);
    // Non-fatal — the server keeps running. Password-reset emails will
    // silently fail (already caught in forgotPassword) until this resolves.
  } else {
    console.log("✅ SMTP Ready");
  }
});


// ====================================================
// Start Server
// ====================================================

const PORT = process.env.PORT || 8000;

app.listen(PORT, () => {
 
  console.log("🏏 MatchConnect Backend Started");
  console.log(`🌐 Port: ${PORT}`);
  console.log(`🔗 Local: http://localhost:${PORT}`);
  console.log("Allowed Origins:");
  console.log(allowedOrigins);
 
});