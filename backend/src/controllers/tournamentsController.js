const pool = require("../config/db");
const asyncHandler = require("../utils/asyncHandler");

// Live data only, ordered ascending by start_date (undated tournaments last),
// then by created_at as a tiebreaker.
const listTournaments = asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    `SELECT
       t.*,
       ct.name AS creator_team_name,
       COALESCE(reg.team_count, 0)::int   AS team_count,
       GREATEST(t.max_teams - COALESCE(reg.team_count, 0), 0)::int AS spots_left
     FROM tournaments t
     LEFT JOIN teams ct ON ct.id = t.creator_team_id
     LEFT JOIN (
       SELECT tournament_id, COUNT(*) AS team_count
       FROM tournament_registrations
       WHERE status = 'confirmed'
       GROUP BY tournament_id
     ) reg ON reg.tournament_id = t.id
     ORDER BY t.start_date ASC NULLS LAST, t.created_at ASC`
  );
  res.json({ tournaments: rows });
});

const getTournament = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const tRes = await pool.query(
    `SELECT t.*, ct.name AS creator_team_name
     FROM tournaments t
     LEFT JOIN teams ct ON ct.id = t.creator_team_id
     WHERE t.id = $1`,
    [id]
  );
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
    tournament: {
      ...tournament,
      team_count: teamsRes.rows.length,
      spots_left: Math.max(tournament.max_teams - teamsRes.rows.length, 0),
      teams: teamsRes.rows,
      matches: matchesRes.rows,
    },
  });
});

// ---------------------------------------------------------------------------
// Create a tournament. One active tournament (registering/ongoing) per TEAM,
// enforced server-side with FOR UPDATE row locking so two concurrent
// requests from the same team can't both slip through.
//
// REQUIRES: users.team_id (run add_users_team_id.sql first). "My team" is
// resolved by membership, not just ownership, so the one-tournament rule —
// and the Create button being disabled — applies to every teammate.
//
// IMPORTANT: `creator_team_name` is NOT a real column on `tournaments`. It
// only ever exists as a derived value via `LEFT JOIN teams ct ON ct.id =
// t.creator_team_id` (see listTournaments/getTournament above). Writing to
// it or filtering on it directly, as earlier versions of this function did,
// throws "column creator_team_name does not exist" (Postgres 42703). The
// persisted source of truth is always creator_team_id; anywhere we need the
// display name, we either derive it via join or pass it through in the JS
// response object without storing it.
// ---------------------------------------------------------------------------
const createTournament = asyncHandler(async (req, res) => {
  const {
    name,
    format = null,
    venue = null,
    start_date = null,
    include_own_team = true,
    max_teams,
    phone = null,
    co_phone = null,
    entry_fee = 0,
    description = null,
    prizes = [],
  } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: "Tournament name is required" });
  }
  if (!Number.isInteger(max_teams) || max_teams < 2) {
    return res.status(400).json({ error: "Number of teams must be an integer of at least 2" });
  }
  if (!req.user?.id) {
    return res.status(401).json({ error: "You must be logged in to create a tournament" });
  }
  if (!Array.isArray(prizes) || prizes.length < 1 || prizes.length > 3) {
    return res.status(400).json({ error: "Provide between 1 and 3 prizes" });
  }
  for (const p of prizes) {
    if (![1, 2, 3].includes(p.position)) {
      return res.status(400).json({ error: "Each prize needs a position of 1, 2, or 3" });
    }
    if (typeof p.money !== "number" || p.money < 0) {
      return res.status(400).json({ error: "Each prize needs a money amount >= 0" });
    }
    if (typeof p.trophy !== "boolean") {
      return res.status(400).json({ error: "Each prize needs trophy: true/false" });
    }
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Look up team via users.team_id OR by matching registered team_name
    const userRes = await client.query(
      `SELECT id, team_name, village_name, team_year, team_id FROM users WHERE id = $1`,
      [req.user.id]
    );
    const user = userRes.rows[0];

    let myTeam = null;
    if (user?.team_id) {
      const teamRes = await client.query(`SELECT id, name FROM teams WHERE id = $1 FOR UPDATE`, [user.team_id]);
      myTeam = teamRes.rows[0] || null;
    }

    // Fallback: match team by name if team_id isn't directly populated on user
    if (!myTeam && user?.team_name?.trim()) {
      const teamByNameRes = await client.query(
        `SELECT id, name FROM teams WHERE LOWER(TRIM(name)) = LOWER(TRIM($1)) LIMIT 1`,
        [user.team_name.trim()]
      );
      myTeam = teamByNameRes.rows[0] || null;

      // Self-heal: persist the resolved team_id onto the user row so future
      // requests don't need to re-derive it by name every time. Uses `pool`
      // (not `client`) so it commits independently of this transaction —
      // it must survive even if we're about to roll back on the 409 below.
      if (myTeam) {
        await pool.query(
          `UPDATE users SET team_id = $1 WHERE id = $2 AND team_id IS NULL`,
          [myTeam.id, req.user.id]
        );
      }
    }

    if (include_own_team && !myTeam && !user?.team_name?.trim()) {
      throw Object.assign(
        new Error("You don't have a team registered yet, so you can't include your own team. Register a team first in Edit Profile, or turn off 'include my team'."),
        { status: 400 }
      );
    }

    // Check for an active tournament already organized by this team.
    // See the note at the top of this function: creator_team_name isn't a
    // real column, so we match on the actual FK (creator_team_id) when we
    // have one, or join to teams for a name comparison when we don't.
    let activeRes;
    if (myTeam) {
      activeRes = await client.query(
        `SELECT id, name, status FROM tournaments
         WHERE creator_team_id = $1
           AND status IN ('registering', 'ongoing')`,
        [myTeam.id]
      );
    } else {
      activeRes = await client.query(
        `SELECT t.id, t.name, t.status
         FROM tournaments t
         LEFT JOIN teams ct ON ct.id = t.creator_team_id
         WHERE LOWER(TRIM(ct.name)) = LOWER(TRIM($1))
           AND t.status IN ('registering', 'ongoing')`,
        [user.team_name]
      );
    }
    if (activeRes.rows.length > 0) {
      const active = activeRes.rows[0];
      throw Object.assign(
        new Error(
          `Your team is already organizing "${active.name}" (${active.status}). Any team member can wait for it to complete, or the organizer can cancel/delete it before creating another.`
        ),
        { status: 409 }
      );
    }

    // teamName is only used for the JSON response below (and as a display
    // fallback) — it is never written to the DB. The persisted source of
    // truth for the organizing team is creator_team_id; the display name is
    // always derived via a join to teams, same as listTournaments/getTournament.
    const teamName = myTeam?.name || user?.team_name || null;
    const insertRes = await client.query(
      `INSERT INTO tournaments
         (name, format, venue, start_date, status, max_teams,
          created_by, creator_team_id, creator_included,
          phone, co_phone, entry_fee, description, prizes)
       VALUES
         ($1, $2, $3, $4, 'registering', $5,
          $6, $7, $8,
          $9, $10, $11, $12, $13::jsonb)
       RETURNING *`,
      [
        name.trim(),
        format,
        venue,
        start_date,
        max_teams,
        req.user.id,
        myTeam ? myTeam.id : null,
        include_own_team,
        phone,
        co_phone,
        entry_fee,
        description,
        JSON.stringify(prizes),
      ]
    );
    const tournament = insertRes.rows[0];

    if (include_own_team && myTeam?.id) {
      await client.query(
        `INSERT INTO tournament_registrations (tournament_id, team_id, registered_by, status)
         VALUES ($1, $2, $3, 'confirmed')
         ON CONFLICT DO NOTHING`,
        [tournament.id, myTeam.id, req.user.id]
      );
    }

    await client.query("COMMIT");

    const team_count = include_own_team ? 1 : 0;
    res.status(201).json({
      tournament: {
        ...tournament,
        creator_team_name: teamName,
        team_count,
        spots_left: Math.max(tournament.max_teams - team_count, 0),
      },
    });
  } catch (err) {
    await client.query("ROLLBACK");
    if (err.status) return res.status(err.status).json({ error: err.message });
    throw err;
  } finally {
    client.release();
  }
});

const registerTeam = asyncHandler(async (req, res) => {
  const { id } = req.params;
  let { team_id } = req.body;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Auto-resolve team_id if missing from req.body
    if (!team_id && req.user?.id) {
      const uRes = await client.query(
        `SELECT id, team_name, village_name, team_year, team_id FROM users WHERE id = $1`,
        [req.user.id]
      );
      const u = uRes.rows[0];
      if (u?.team_id) {
        team_id = u.team_id;
      } else {
        // Resolve or create team for the user automatically
        const teamName = u?.team_name?.trim() || `Team ${u?.id || "Player"}`;
        const village = u?.village_name?.trim() || null;
        const year = u?.team_year ? Number(u.team_year) : new Date().getFullYear();

        const findRes = await client.query(
          `SELECT id FROM teams WHERE LOWER(TRIM(name)) = LOWER(TRIM($1)) LIMIT 1`,
          [teamName]
        );
        if (findRes.rows.length > 0) {
          team_id = findRes.rows[0].id;
        } else {
          const insRes = await client.query(
            `INSERT INTO teams (name, village_name, year_formed, created_by)
             VALUES ($1, $2, $3, $4)
             RETURNING id`,
            [teamName, village, year, req.user.id]
          );
          team_id = insRes.rows[0].id;
        }
        await client.query(`UPDATE users SET team_id = $1 WHERE id = $2`, [team_id, req.user.id]);
      }
    }

    if (!team_id) {
      throw Object.assign(new Error("team_id is required"), { status: 400 });
    }

    const tRes = await client.query(`SELECT * FROM tournaments WHERE id = $1 FOR UPDATE`, [id]);
    if (tRes.rows.length === 0) throw Object.assign(new Error("Tournament not found"), { status: 404 });
    const tournament = tRes.rows[0];

    if (tournament.status && tournament.status.toLowerCase() !== "registering") {
      throw Object.assign(new Error("Registration is closed for this tournament"), { status: 400 });
    }

    const existing = await client.query(
      `SELECT id FROM tournament_registrations
       WHERE tournament_id = $1 AND team_id = $2 AND status != 'withdrawn'`,
      [id, team_id]
    );
    if (existing.rows.length > 0) {
      throw Object.assign(new Error("This team is already registered"), { status: 409 });
    }

    await client.query(
      `INSERT INTO tournament_registrations (tournament_id, team_id, registered_by, status)
       VALUES ($1, $2, $3, 'confirmed')`,
      [id, team_id, req.user?.id || null]
    );

    const updatedCountRes = await client.query(
      `SELECT COUNT(*)::int AS n FROM tournament_registrations
       WHERE tournament_id = $1 AND status = 'confirmed'`,
      [id]
    );
    const team_count = updatedCountRes.rows[0].n;

    const fullRes = await client.query(
      `SELECT t.*, ct.name AS creator_team_name
       FROM tournaments t LEFT JOIN teams ct ON ct.id = t.creator_team_id
       WHERE t.id = $1`,
      [id]
    );

    await client.query("COMMIT");

    res.status(201).json({
      tournament: {
        ...fullRes.rows[0],
        team_count,
        spots_left: Math.max(fullRes.rows[0].max_teams - team_count, 0),
      },
    });
  } catch (err) {
    await client.query("ROLLBACK");
    if (err.status) return res.status(err.status).json({ error: err.message });
    throw err;
  } finally {
    client.release();
  }
});

const unregisterTeam = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Resolve user's team ID
    const uRes = await client.query(
      `SELECT id, team_name, team_id FROM users WHERE id = $1`,
      [req.user.id]
    );
    const u = uRes.rows[0];
    let team_id = u?.team_id;
    if (!team_id) {
      const tRes = await client.query(`SELECT id FROM teams WHERE owner_id = $1 OR created_by = $1`, [req.user.id]);
      team_id = tRes.rows[0]?.id;
    }
    if (!team_id && u?.team_name?.trim()) {
      const tRes = await client.query(
        `SELECT id FROM teams WHERE LOWER(TRIM(name)) = LOWER(TRIM($1)) LIMIT 1`,
        [u.team_name.trim()]
      );
      team_id = tRes.rows[0]?.id;
    }

    if (!team_id) {
      throw Object.assign(new Error("Could not find your team to cancel registration"), { status: 400 });
    }

    await client.query(
      `UPDATE tournament_registrations
       SET status = 'withdrawn'
       WHERE tournament_id = $1 AND (team_id = $2 OR registered_by = $3)`,
      [id, team_id, req.user.id]
    );

    const updatedCountRes = await client.query(
      `SELECT COUNT(*)::int AS n FROM tournament_registrations
       WHERE tournament_id = $1 AND status = 'confirmed'`,
      [id]
    );
    const team_count = updatedCountRes.rows[0].n;

    const fullRes = await client.query(
      `SELECT t.*, ct.name AS creator_team_name
       FROM tournaments t LEFT JOIN teams ct ON ct.id = t.creator_team_id
       WHERE t.id = $1`,
      [id]
    );

    await client.query("COMMIT");

    res.json({
      message: "Successfully cancelled registration",
      tournament: {
        ...fullRes.rows[0],
        team_count,
        spots_left: Math.max(fullRes.rows[0].max_teams - team_count, 0),
      },
    });
  } catch (err) {
    await client.query("ROLLBACK");
    if (err.status) return res.status(err.status).json({ error: err.message });
    throw err;
  } finally {
    client.release();
  }
});

const myTournaments = asyncHandler(async (req, res) => {
  const { team_id } = req.params;
  const { rows } = await pool.query(
    `SELECT t.*, r.status AS registration_status, r.registered_at
     FROM tournament_registrations r
     JOIN tournaments t ON t.id = r.tournament_id
     WHERE r.team_id = $1 AND r.status != 'withdrawn'
     ORDER BY t.start_date ASC NULLS LAST, t.created_at ASC`,
    [team_id]
  );
  res.json({ tournaments: rows });
});

const updateTournament = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {
    name,
    format = null,
    venue = null,
    start_date = null,
    max_teams,
    phone = null,
    co_phone = null,
    entry_fee = 0,
    description = null,
    prizes = [],
  } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: "Tournament name is required" });
  }
  if (!Number.isInteger(max_teams) || max_teams < 2) {
    return res.status(400).json({ error: "Number of teams must be an integer of at least 2" });
  }
  if (!req.user?.id) {
    return res.status(401).json({ error: "You must be logged in to update a tournament" });
  }

  const existing = await pool.query(`SELECT * FROM tournaments WHERE id = $1`, [id]);
  if (existing.rows.length === 0) return res.status(404).json({ error: "Tournament not found" });

  // Only the specific user who created/published the tournament can edit it.
  const isCreator = String(existing.rows[0].created_by) === String(req.user.id);
  if (!isCreator) {
    return res.status(403).json({ error: "Only the user who created this tournament can edit it" });
  }

  if (!Array.isArray(prizes) || prizes.length < 1 || prizes.length > 3) {
    return res.status(400).json({ error: "Provide between 1 and 3 prizes" });
  }
  for (const p of prizes) {
    if (![1, 2, 3].includes(p.position)) {
      return res.status(400).json({ error: "Each prize needs a position of 1, 2, or 3" });
    }
    if (typeof p.money !== "number" || p.money < 0) {
      return res.status(400).json({ error: "Each prize needs a money amount >= 0" });
    }
    if (typeof p.trophy !== "boolean") {
      return res.status(400).json({ error: "Each prize needs trophy: true/false" });
    }
  }

  const updatedRes = await pool.query(
    `UPDATE tournaments
     SET name = $1,
         format = $2,
         venue = $3,
         start_date = $4,
         max_teams = $5,
         phone = $6,
         co_phone = $7,
         entry_fee = $8,
         description = $9,
         prizes = $10::jsonb,
         updated_at = now()
     WHERE id = $11
     RETURNING *`,
    [
      name.trim(),
      format,
      venue,
      start_date,
      max_teams,
      phone,
      co_phone,
      entry_fee,
      description,
      JSON.stringify(prizes),
      id,
    ]
  );

  const team_count_res = await pool.query(
    `SELECT COUNT(*)::int AS count FROM tournament_registrations WHERE tournament_id = $1 AND status = 'confirmed'`,
    [id]
  );
  const team_count = team_count_res.rows[0]?.count || 0;

  res.json({
    tournament: {
      ...updatedRes.rows[0],
      team_count,
      spots_left: Math.max(updatedRes.rows[0].max_teams - team_count, 0),
    },
  });
});

const deleteTournament = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!req.user?.id) {
    return res.status(401).json({ error: "You must be logged in to delete a tournament" });
  }

  const existing = await pool.query(`SELECT * FROM tournaments WHERE id = $1`, [id]);
  if (existing.rows.length === 0) return res.status(404).json({ error: "Tournament not found" });

  // Only the specific user who created/published the tournament can delete it.
  const isCreator = String(existing.rows[0].created_by) === String(req.user.id);
  if (!isCreator) {
    return res.status(403).json({ error: "Only the user who created this tournament can delete it" });
  }

  await pool.query(`DELETE FROM tournaments WHERE id = $1`, [id]);
  res.json({ message: "Tournament deleted successfully" });
});

module.exports = {
  listTournaments,
  getTournament,
  createTournament,
  updateTournament,
  deleteTournament,
  registerTeam,
  unregisterTeam,
  myTournaments,
};