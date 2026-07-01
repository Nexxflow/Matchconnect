const pool = require("../config/db");
const asyncHandler = require("../utils/asyncHandler");

// POST /api/teams — create a team owned by logged-in user
const createTeam = asyncHandler(async (req, res) => {
  const { name, specialty, established_year } = req.body;
  if (!name) return res.status(400).json({ error: "Team name is required" });

  const result = await pool.query(
    `INSERT INTO teams (owner_id, name, specialty, established_year)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [req.user.id, name, specialty || null, established_year || null]
  );
  res.status(201).json({ team: result.rows[0] });
});

// GET /api/teams/mine — team(s) owned by logged-in user
const myTeams = asyncHandler(async (req, res) => {
  const result = await pool.query("SELECT * FROM teams WHERE owner_id = $1", [req.user.id]);
  res.json({ teams: result.rows });
});

// GET /api/teams/:id — team detail with squad
const getTeam = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const team = await pool.query("SELECT * FROM teams WHERE id = $1", [id]);
  if (team.rows.length === 0) return res.status(404).json({ error: "Team not found" });

  const players = await pool.query("SELECT * FROM players WHERE team_id = $1", [id]);
  res.json({ team: team.rows[0], players: players.rows });
});

// POST /api/teams/:id/players — add a player to squad
const addPlayer = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, role, batting_avg, strike_rate, wickets } = req.body;
  if (!name) return res.status(400).json({ error: "Player name is required" });

  const result = await pool.query(
    `INSERT INTO players (team_id, name, role, batting_avg, strike_rate, wickets)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [id, name, role || null, batting_avg || null, strike_rate || null, wickets || null]
  );
  res.status(201).json({ player: result.rows[0] });
});

module.exports = { createTeam, myTeams, getTeam, addPlayer };
