require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");

const errorHandler = require("./middleware/errorHandler");

const authRoutes = require("./routes/authRoutes");
const teamsRoutes = require("./routes/teamsRoutes");
const groundsRoutes = require("./routes/groundsRoutes");
const umpiresRoutes = require("./routes/umpiresRoutes");
const bookingsRoutes = require("./routes/bookingsRoutes");
const tournamentsRoutes = require("./routes/tournamentsRoutes");
const challengesRoutes = require("./routes/challengesRoutes");

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:5173" }));
app.use(express.json());
app.use(morgan("dev"));

app.get("/health", (req, res) => res.json({ status: "ok", service: "matchconnect-backend" }));

app.use("/api/auth", authRoutes);
app.use("/api/teams", teamsRoutes);
app.use("/api/grounds", groundsRoutes);
app.use("/api/umpires", umpiresRoutes);
app.use("/api/bookings", bookingsRoutes);
app.use("/api/tournaments", tournamentsRoutes);
app.use("/api/challenges", challengesRoutes);

app.use((req, res) => res.status(404).json({ error: "Route not found" }));
app.use(errorHandler);

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`🏏 MatchConnect backend running on http://localhost:${PORT}`);
});
