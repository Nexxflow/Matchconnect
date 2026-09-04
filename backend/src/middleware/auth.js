const jwt = require("jsonwebtoken");
const pool = require("../config/db");

async function authRequired(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or invalid Authorization header" });
  }
  const token = header.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Verify user strictly exists in the database
    const userRes = await pool.query(
      "SELECT id, name, email, phone, team_id, team_name, village_name, team_year FROM users WHERE id = $1",
      [decoded.id]
    );
    if (userRes.rows.length === 0) {
      return res.status(401).json({ error: "User account not found in database. Please log in again." });
    }

    req.user = userRes.rows[0];
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

async function optionalAuth(req, res, next) {
  const header = req.headers.authorization;
  if (header && header.startsWith("Bearer ")) {
    const token = header.split(" ")[1];
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const userRes = await pool.query(
        "SELECT id, name, email, phone, team_id, team_name, village_name, team_year FROM users WHERE id = $1",
        [decoded.id]
      );
      if (userRes.rows.length > 0) {
        req.user = userRes.rows[0];
      }
    } catch (err) {}
  }
  next();
}

module.exports = { authRequired, optionalAuth };
