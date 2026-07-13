require("dotenv").config();

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
   
    console.log("✅ PostgreSQL Connected");
    console.log(result.rows[0]);
    
  } catch (err) {
    
    console.error("❌ PostgreSQL Connection Error");
    console.error(err);
    
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

app.use(express.json());

app.use(
  express.urlencoded({
    extended: true,
  })
);

app.use(morgan("dev"));

// ====================================================
// Request Logger
// ====================================================

app.use((req, res, next) => {
  
  console.log("📥 Incoming Request");
  console.log("Time:", new Date().toLocaleString());
  console.log("Method:", req.method);
  console.log("URL:", req.originalUrl);
  console.log("Origin:", req.headers.origin);
  console.log("Authorization:", req.headers.authorization || "None");
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
// app.use("/api/teams", teamsRoutes);

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
    //console.log("===================================");
    console.log("❌ SMTP Connection Failed");
    console.error(error);
   
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