const pool = require("../config/db");
const asyncHandler = require("../utils/asyncHandler");

const listTournaments = asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    `SELECT
       t.*,
       COALESCE(reg.team_count, 0)::int   AS team_count,
       GREATEST(t.max_teams - COALESCE(reg.team_count, 0), 0)::int AS spots_left,
       COALESCE(m.match_count, 0)::int    AS matches,
       COALESCE(m.done_count, 0)::int     AS matches_done
     FROM tournaments t
     LEFT JOIN (
       SELECT tournament_id, COUNT(*) AS team_count
       FROM tournament_registrations
       WHERE status = 'confirmed'
       GROUP BY tournament_id
     ) reg ON reg.tournament_id = t.id
     LEFT JOIN (
       SELECT tournament_id,
              COUNT(*) AS match_count,
              COUNT(*) FILTER (WHERE status = 'completed') AS done_count
       FROM matches
       WHERE tournament_id IS NOT NULL
       GROUP BY tournament_id
     ) m ON m.tournament_id = t.id
     ORDER BY t.is_featured DESC, t.start_date ASC NULLS LAST, t.created_at DESC`
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

  res.json({
    ...tournament,
    team_count: teamsRes.rows.length,
    spots_left: Math.max(tournament.max_teams - teamsRes.rows.length, 0),
    teams: teamsRes.rows,
    matches: matchesRes.rows,
  });
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

    if (tournament.status !== "registering") {
      throw Object.assign(new Error("Registration is closed for this tournament"), { status: 400 });
    }

    const countRes = await client.query(
      `SELECT COUNT(*)::int AS n FROM tournament_registrations
       WHERE tournament_id = $1 AND status = 'confirmed'`,
      [id]
    );
    if (countRes.rows[0].n >= tournament.max_teams) {
      throw Object.assign(new Error("Tournament is full"), { status: 400 });
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

module.exports = {
  listTournaments,
  getTournament,
  registerTeam,
  myTournaments,
};
