const pool = require("../config/db");
const asyncHandler = require("../utils/asyncHandler");

// GET /api/challenges?format=T20&status=open
const listChallenges = asyncHandler(async (req, res) => {
  const { format, status } = req.query;
  const conditions = [];
  const values = [];

  if (format) {
    values.push(format);
    conditions.push(`c.format = $${values.length}`);
  }
  conditions.push(`c.status = $${values.push(status || "open")}`);

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const result = await pool.query(
    `SELECT c.*, g.name AS ground_name
     FROM challenges c
     LEFT JOIN grounds g ON c.ground_id = g.id
     ${where}
     ORDER BY c.urgent DESC, c.match_date ASC`,
    values
  );
  res.json({ challenges: result.rows });
});

// POST /api/challenges  Body: { team_name, format, match_date, time_slot, ground_id, urgent, note }
const createChallenge = asyncHandler(async (req, res) => {
  const { team_name, format, match_date, time_slot, ground_id, urgent, note } = req.body;
  if (!team_name || !team_name.trim() || !format || !match_date || !time_slot) {
    return res.status(400).json({ error: "team_name, format, match_date and time_slot are required" });
  }

  const result = await pool.query(
    `INSERT INTO challenges (team_name, format, match_date, time_slot, ground_id, urgent, note)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [team_name.trim(), format, match_date, time_slot, ground_id || null, urgent || false, note || null]
  );
  res.status(201).json({ challenge: result.rows[0] });
});

// POST /api/challenges/:id/accept  Body: { team_name }
const acceptChallenge = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { team_name } = req.body;
  if (!team_name) return res.status(400).json({ error: "team_name is required" });

  const result = await pool.query(
    `UPDATE challenges SET status = 'accepted', accepted_by_team_name = $1
     WHERE id = $2 AND status = 'open' RETURNING *`,
    [team_name, id]
  );
  if (result.rows.length === 0) {
    return res.status(409).json({ error: "Challenge is no longer open" });
  }
  res.json({ challenge: result.rows[0] });
});

// POST /api/challenges/:id/cancel
const cancelChallenge = asyncHandler(async (req, res) => {
  const result = await pool.query(
    `UPDATE challenges SET status = 'open', accepted_by_team_name = NULL
     WHERE id = $1 RETURNING *`,
    [req.params.id]
  );
  if (result.rows.length === 0) return res.status(404).json({ error: "Challenge not found" });
  res.json({ challenge: result.rows[0] });
});

module.exports = { listChallenges, createChallenge, acceptChallenge, cancelChallenge };