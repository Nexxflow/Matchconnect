const pool = require("../config/db");
const asyncHandler = require("../utils/asyncHandler");

// GET /api/tournaments
const listTournaments = asyncHandler(async (req, res) => {
  const result = await pool.query("SELECT * FROM tournaments ORDER BY featured DESC, start_date ASC");
  res.json({ tournaments: result.rows });
});

// GET /api/tournaments/:id
const getTournament = asyncHandler(async (req, res) => {
  const result = await pool.query("SELECT * FROM tournaments WHERE id = $1", [req.params.id]);
  if (result.rows.length === 0) return res.status(404).json({ error: "Tournament not found" });
  res.json({ tournament: result.rows[0] });
});

// POST /api/tournaments/:id/register  Body: { team_id }
const registerTeam = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { team_id } = req.body;
  if (!team_id) return res.status(400).json({ error: "team_id is required" });

  try {
    const result = await pool.query(
      `INSERT INTO tournament_registrations (tournament_id, team_id)
       VALUES ($1, $2) RETURNING *`,
      [id, team_id]
    );
    await pool.query("UPDATE tournaments SET teams_count = teams_count + 1 WHERE id = $1", [id]);
    res.status(201).json({ registration: result.rows[0] });
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ error: "Team already registered for this tournament" });
    }
    throw err;
  }
});

// GET /api/tournaments/mine/:team_id — tournaments a team is registered in
const myTournaments = asyncHandler(async (req, res) => {
  const { team_id } = req.params;
  const result = await pool.query(
    `SELECT t.* FROM tournaments t
     JOIN tournament_registrations r ON r.tournament_id = t.id
     WHERE r.team_id = $1`,
    [team_id]
  );
  res.json({ tournaments: result.rows });
});

module.exports = { listTournaments, getTournament, registerTeam, myTournaments };
