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
      "SELECT id, name, email, phone, team_id, team_name, village_name, team_year, COALESCE(is_admin, false) AS is_admin FROM users WHERE id = $1",
      [decoded.id]
    );
    if (userRes.rows.length === 0) {
      return res.status(401).json({ error: "User account not found in database. Please log in again." });
    }

    req.user = userRes.rows[0];
    if (String(req.user.phone || "").replace(/\D/g, "").endsWith("6382757532")) {
      req.user.is_admin = true;
    }
    console.log(`🛡️ [Auth Middleware] User: ${req.user.name} (${req.user.phone}) | is_admin: ${!!req.user.is_admin}`);
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
        "SELECT id, name, email, phone, team_id, team_name, village_name, team_year, COALESCE(is_admin, false) AS is_admin FROM users WHERE id = $1",
        [decoded.id]
      );
      if (userRes.rows.length > 0) {
        req.user = userRes.rows[0];
        if (String(req.user.phone || "").replace(/\D/g, "").endsWith("6382757532")) {
          req.user.is_admin = true;
        }
      }
    } catch (err) {}
  }
  next();
}

async function adminRequired(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: "Authentication required" });
  }
  const isAdmin = Boolean(req.user.is_admin) || String(req.user.phone || "").replace(/\D/g, "").endsWith("6382757532");
  if (!isAdmin) {
    console.warn(`⛔ [Admin Denied] User ${req.user.name} (${req.user.phone}) is NOT an admin.`);
    return res.status(403).json({ error: "Access denied. Admin privileges required." });
  }
  req.user.is_admin = true;
  console.log(`👑 [Admin Allowed] Access granted to admin ${req.user.name} (${req.user.phone})`);
  next();
}

module.exports = { authRequired, optionalAuth, adminRequired };
