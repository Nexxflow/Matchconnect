const pool = require("../config/db");
const asyncHandler = require("../utils/asyncHandler");

const listTournaments = asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    `SELECT *
     FROM tournaments
     ORDER BY featured DESC, start_date ASC NULLS LAST, created_at DESC`
  );
  res.json(rows);
});

const getTournament = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const tRes = await pool.query(`SELECT * FROM tournaments WHERE id = $1`, [id]);
  if (tRes.rows.length === 0) return res.status(404).json({ error: "Tournament not found" });
  const tournament = tRes.rows[0];

  const teamsRes = await pool.query(
    `SELECT tm.id, tm.name, r.status, r.registered_at
     FROM tournament_registrations r
     JOIN teams tm ON tm.id = r.team_id
     WHERE r.tournament_id = $1 AND r.status != 'withdrawn'
     ORDER BY r.registered_at ASC`,
    [id]
  );

  const matchesRes = await pool.query(
    `SELECT m.*, t1.name AS team1_name, t2.name AS team2_name
     FROM matches m
     JOIN teams t1 ON t1.id = m.team1_id
     JOIN teams t2 ON t2.id = m.team2_id
     WHERE m.tournament_id = $1
     ORDER BY m.created_at ASC`,
    [id]
  );

  res.json({ ...tournament, teams: teamsRes.rows, matches: matchesRes.rows });
});

const registerTeam = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { team_id } = req.body;
  if (!team_id) return res.status(400).json({ error: "team_id is required" });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const tRes = await client.query(`SELECT * FROM tournaments WHERE id = $1 FOR UPDATE`, [id]);
    if (tRes.rows.length === 0) throw Object.assign(new Error("Tournament not found"), { status: 404 });
    const tournament = tRes.rows[0];

    if (tournament.status && tournament.status.toLowerCase() !== "registering") {
      throw Object.assign(new Error("Registration is closed for this tournament"), { status: 400 });
    }

    const existing = await client.query(
      `SELECT id FROM tournament_registrations WHERE tournament_id = $1 AND team_id = $2`,
      [id, team_id]
    );
    if (existing.rows.length > 0) {
      throw Object.assign(new Error("This team is already registered"), { status: 409 });
    }

    const inserted = await client.query(
      `INSERT INTO tournament_registrations (tournament_id, team_id, registered_by, status)
       VALUES ($1, $2, $3, 'confirmed') RETURNING *`,
      [id, team_id, req.user?.id || null]
    );

    await client.query(`UPDATE tournaments SET teams_count = teams_count + 1 WHERE id = $1`, [id]);

    await client.query("COMMIT");
    res.status(201).json({ ok: true, registration: inserted.rows[0] });
  } catch (err) {
    await client.query("ROLLBACK");
    if (err.status) return res.status(err.status).json({ error: err.message });
    throw err;
  } finally {
    client.release();
  }
});

const myTournaments = asyncHandler(async (req, res) => {
  const { teamId } = req.params;
  const { rows } = await pool.query(
    `SELECT t.*, r.status AS registration_status, r.registered_at
     FROM tournament_registrations r
     JOIN tournaments t ON t.id = r.tournament_id
     WHERE r.team_id = $1 AND r.status != 'withdrawn'
     ORDER BY t.start_date ASC NULLS LAST`,
    [teamId]
  );
  res.json(rows);
});

const createTournament = asyncHandler(async (req, res) => {
  const {
    name, format = "T20", venue = null,
    prize = null, start_date = null, featured = false,
  } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: "name is required" });
  }

  const { rows } = await pool.query(
    `INSERT INTO tournaments
       (name, format, venue, prize, start_date, featured, status, teams_count, matches_count, completed_count)
     VALUES ($1,$2,$3,$4,$5,$6,'Registering',0,0,0)
     RETURNING *`,
    [name.trim(), format, venue, prize, start_date, featured]
  );

  res.status(201).json(rows[0]);
});

module.exports = {
  listTournaments,
  getTournament,
  registerTeam,
  myTournaments,
  createTournament,
};
