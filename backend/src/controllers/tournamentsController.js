const pool = require("../config/db");
const asyncHandler = require("../utils/asyncHandler");
const { notifyAllUsersExcept, notifyTeammatesOnly } = require("../services/notificationService");

// Live data only, ordered ascending by start_date (undated tournaments last),
// then by created_at as a tiebreaker.
const listTournaments = asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    `SELECT
       t.*,
       ct.name AS creator_team_name,
       COALESCE(reg.team_count, 0)::int   AS team_count,
       GREATEST(t.max_teams - COALESCE(reg.team_count, 0), 0)::int AS spots_left,
       COALESCE(mt.matches_count, 0)::int AS matches_count,
       COALESCE(mt.completed_count, 0)::int AS completed_count
     FROM tournaments t
     LEFT JOIN teams ct ON ct.id = t.creator_team_id
     LEFT JOIN (
       SELECT tournament_id, COUNT(*) AS team_count
       FROM tournament_registrations
       WHERE status = 'confirmed'
       GROUP BY tournament_id
     ) reg ON reg.tournament_id = t.id
     LEFT JOIN (
       SELECT 
         tournament_id, 
         COUNT(*)::int AS matches_count,
         COUNT(*) FILTER (WHERE LOWER(status) = 'completed')::int AS completed_count
       FROM matches
       GROUP BY tournament_id
     ) mt ON mt.tournament_id = t.id
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
    `SELECT m.*, 
            COALESCE(m.team1_name, t1.name, 'Team 1') AS team1_name, 
            COALESCE(m.team2_name, t2.name, 'Team 2') AS team2_name,
            COALESCE(m.mom, m.man_of_the_match) AS mom
     FROM matches m
     LEFT JOIN teams t1 ON t1.id = m.team1_id
     LEFT JOIN teams t2 ON t2.id = m.team2_id
     WHERE m.tournament_id = $1
     ORDER BY m.match_date ASC NULLS LAST, m.created_at ASC`,
    [id]
  );

  const completedCount = matchesRes.rows.filter(
    (m) => m.status && m.status.toLowerCase() === "completed"
  ).length;

  res.json({
    tournament: {
      ...tournament,
      team_count: teamsRes.rows.length,
      spots_left: Math.max(tournament.max_teams - teamsRes.rows.length, 0),
      teams: teamsRes.rows,
      matches: matchesRes.rows,
      matches_count: matchesRes.rows.length,
      completed_count: completedCount,
      pending_count: matchesRes.rows.length - completedCount,
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
//
// NOTE: every write that belongs to this operation — including the
// users.team_id self-heal below — MUST go through `client` (the same
// transaction), never the shared `pool`. A `pool.query` call commits
// immediately on its own connection, outside the BEGIN/COMMIT/ROLLBACK
// block. If the team INSERT here later gets rolled back (e.g. a later
// validation step in this same request fails), a `pool.query`-based
// users.team_id update would already be permanently committed and would
// end up pointing at a team row that no longer exists — which is exactly
// what caused the "insert or update on table users violates foreign key
// constraint users_team_id_fkey" bug. Keep this on `client`.
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
      const teamRes = await client.query(`SELECT id, name FROM teams WHERE id = $1`, [user.team_id]);
      myTeam = teamRes.rows[0] || null;
    }

    // Fallback: match team by name if team_id isn't directly populated on user
    if (!myTeam && user?.team_name?.trim()) {
      const teamByNameRes = await client.query(
        `SELECT id, name FROM teams WHERE LOWER(TRIM(name)) = LOWER(TRIM($1)) LIMIT 1`,
        [user.team_name.trim()]
      );
      myTeam = teamByNameRes.rows[0] || null;

      if (!myTeam) {
        const teamName = user.team_name.trim();
        const village = user?.village_name?.trim() || null;
        const year = user?.team_year ? Number(user.team_year) : new Date().getFullYear();
        const insRes = await client.query(
          `INSERT INTO teams (name, village_name, year_formed, created_by)
           VALUES ($1, $2, $3, $4)
           RETURNING id, name`,
          [teamName, village, year, req.user.id]
        );
        myTeam = insRes.rows[0] || null;
      }

      // Self-heal: persist the resolved team_id onto the user row so future
      // requests don't need to re-derive it by name every time.
      // IMPORTANT: use `client` here, not `pool` — this must be part of the
      // same transaction as the team INSERT above, or a later rollback in
      // this request leaves users.team_id pointing at a team row that was
      // never actually committed (foreign key violation on next write).
      if (myTeam) {
        await client.query(
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

    // Users and teams can create multiple tournaments concurrently.

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

    console.log(`🏆 [Tournament Created] Tournament #${tournament.id} ("${name.trim()}") created by User #${req.user.id}. Sending broadcast notification to other users...`);

    // Send web notification to ALL other users
    const formatText = format ? ` (${format})` : "";
    const venueText = venue ? ` at ${venue}` : "";
    notifyAllUsersExcept(
      req.user.id,
      "New Tournament Announced! 🏆",
      `"${name.trim()}"${formatText} tournament is now open for registration${venueText}!`,
      { type: "new_tournament", tournament_id: String(tournament.id) },
      "tournament"
    ).catch((err) => console.error("Tournament notification error:", err.message));

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

    // Notify team's teammates that their team registered
    notifyTeammatesOnly(
      req.user.id,
      "Tournament Registration Confirmed! 🏆",
      `Your team registered for "${tournament.name}"!`,
      { type: "tournament_registration", tournament_id: String(id) },
      "tournament"
    ).catch(() => {});

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

// Helper to verify if user is tournament creator or a member of creator's team,
// or if tournament is open/seeded without a specific creator.
async function canUserManageTournament(userId, tournament) {
  if (!userId || !tournament) return false;

  // If tournament has no specific created_by (e.g. seeded/public tournaments like Monsoon Mavericks),
  // any logged-in user can add matches and scorecards!
  if (!tournament.created_by) return true;

  // 1. Direct creator
  if (String(tournament.created_by) === String(userId)) return true;

  // 2. Teammate check via creator_team_id
  if (tournament.creator_team_id) {
    const userRes = await pool.query(
      `SELECT id, team_id, team_name FROM users WHERE id = $1`,
      [userId]
    );
    const user = userRes.rows[0];

    if (user?.team_id && String(user.team_id) === String(tournament.creator_team_id)) {
      return true;
    }

    const teamRes = await pool.query(
      `SELECT id, name, created_by, owner_id FROM teams WHERE id = $1`,
      [tournament.creator_team_id]
    );
    const team = teamRes.rows[0];
    if (team) {
      if (String(team.created_by) === String(userId) || String(team.owner_id) === String(userId)) {
        return true;
      }
      if (user?.team_name && team.name && user.team_name.trim().toLowerCase() === team.name.trim().toLowerCase()) {
        return true;
      }
    }
  }

  // 3. Teammate check by comparing creator user's team with current user's team
  if (tournament.created_by) {
    const creatorUserRes = await pool.query(
      `SELECT id, team_id, team_name FROM users WHERE id = $1`,
      [tournament.created_by]
    );
    const creatorUser = creatorUserRes.rows[0];
    const currUserRes = await pool.query(
      `SELECT id, team_id, team_name FROM users WHERE id = $1`,
      [userId]
    );
    const currUser = currUserRes.rows[0];

    if (creatorUser && currUser) {
      if (creatorUser.team_id && currUser.team_id && String(creatorUser.team_id) === String(currUser.team_id)) {
        return true;
      }
      if (
        creatorUser.team_name &&
        currUser.team_name &&
        creatorUser.team_name.trim().toLowerCase() === currUser.team_name.trim().toLowerCase()
      ) {
        return true;
      }
    }
  }

  // 4. Check if user is a member of any registered team in this tournament
  try {
    const regRes = await pool.query(
      `SELECT tr.id FROM tournament_registrations tr
       LEFT JOIN users u ON u.id = $1
       WHERE tr.tournament_id = $2
         AND (
           tr.user_id = $1
           OR (u.team_id IS NOT NULL AND tr.team_id = u.team_id)
           OR (u.team_name IS NOT NULL AND LOWER(TRIM(tr.team_name)) = LOWER(TRIM(u.team_name)))
         )
       LIMIT 1`,
      [userId, tournament.id]
    );
    if (regRes.rows.length > 0) return true;
  } catch {}

  return false;
}

// GET /api/tournaments/:id/matches
const getTournamentMatches = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const tRes = await pool.query(`SELECT * FROM tournaments WHERE id = $1`, [id]);
  if (tRes.rows.length === 0) return res.status(404).json({ error: "Tournament not found" });
  const tournament = tRes.rows[0];

  const matchesRes = await pool.query(
    `SELECT m.*, 
            COALESCE(m.team1_name, t1.name, 'Team 1') AS team1_name, 
            COALESCE(m.team2_name, t2.name, 'Team 2') AS team2_name,
            COALESCE(m.mom, m.man_of_the_match) AS mom
     FROM matches m
     LEFT JOIN teams t1 ON t1.id = m.team1_id
     LEFT JOIN teams t2 ON t2.id = m.team2_id
     WHERE m.tournament_id = $1
     ORDER BY m.match_date ASC NULLS LAST, m.created_at ASC`,
    [id]
  );

  const canManage = req.user?.id ? await canUserManageTournament(req.user.id, tournament) : false;
  const total = matchesRes.rows.length;
  const completed = matchesRes.rows.filter((m) => m.status && m.status.toLowerCase() === "completed").length;
  const pending = total - completed;

  res.json({
    tournament_id: id,
    total_matches: total,
    completed_matches: completed,
    pending_matches: pending,
    can_manage: canManage,
    matches: matchesRes.rows,
  });
});

// POST /api/tournaments/:id/matches
const createTournamentMatch = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {
    team1_name,
    team2_name,
    team1_id = null,
    team2_id = null,
    status = "scheduled",
    result = null,
    mom = null,
    scoreboard_url = null,
    scoreboard_name = null,
    venue = null,
    match_date = null,
    round = null,
    overs_limit = 20,
  } = req.body;

  if (!team1_name || !team1_name.trim() || !team2_name || !team2_name.trim()) {
    return res.status(400).json({ error: "Both Team 1 and Team 2 names are required" });
  }

  const tRes = await pool.query(`SELECT * FROM tournaments WHERE id = $1`, [id]);
  if (tRes.rows.length === 0) return res.status(404).json({ error: "Tournament not found" });
  const tournament = tRes.rows[0];

  const canManage = await canUserManageTournament(req.user.id, tournament);
  if (!canManage) {
    return res.status(403).json({
      error: "Only the tournament creator or creator team members can add matches",
    });
  }

  let resolvedTeam1Id = team1_id;
  let resolvedTeam2Id = team2_id;

  if (!resolvedTeam1Id && team1_name) {
    const t1 = await pool.query(
      `SELECT id FROM teams WHERE LOWER(TRIM(name)) = LOWER(TRIM($1)) LIMIT 1`,
      [team1_name.trim()]
    );
    if (t1.rows.length > 0) resolvedTeam1Id = t1.rows[0].id;
  }
  if (!resolvedTeam2Id && team2_name) {
    const t2 = await pool.query(
      `SELECT id FROM teams WHERE LOWER(TRIM(name)) = LOWER(TRIM($1)) LIMIT 1`,
      [team2_name.trim()]
    );
    if (t2.rows.length > 0) resolvedTeam2Id = t2.rows[0].id;
  }

  const insertRes = await pool.query(
    `INSERT INTO matches
       (tournament_id, team1_id, team2_id, team1_name, team2_name, status, result, mom, man_of_the_match, scoreboard_url, scoreboard_name, venue, match_date, round, overs_limit, created_by)
     VALUES
       ($1, $2, $3, $4, $5, $6, $7, $8, $8, $9, $10, $11, $12, $13, $14, $15)
     RETURNING *`,
    [
      id,
      resolvedTeam1Id,
      resolvedTeam2Id,
      team1_name.trim(),
      team2_name.trim(),
      status || "scheduled",
      result ? result.trim() : null,
      mom ? mom.trim() : null,
      scoreboard_url,
      scoreboard_name,
      venue ? venue.trim() : (tournament.venue || null),
      match_date ? new Date(match_date) : null,
      round ? round.trim() : null,
      Number(overs_limit) || 20,
      req.user.id,
    ]
  );

  const match = insertRes.rows[0];

  res.status(201).json({
    message: "Tournament match created successfully",
    match: {
      ...match,
      team1_name: team1_name.trim(),
      team2_name: team2_name.trim(),
      mom: mom ? mom.trim() : null,
    },
  });
});

// PUT /api/tournaments/:id/matches/:matchId
const updateTournamentMatch = asyncHandler(async (req, res) => {
  const { id, matchId } = req.params;
  const {
    team1_name,
    team2_name,
    team1_id = null,
    team2_id = null,
    status,
    result,
    mom,
    scoreboard_url,
    scoreboard_name,
    venue,
    match_date,
    round,
    overs_limit,
  } = req.body;

  const tRes = await pool.query(`SELECT * FROM tournaments WHERE id = $1`, [id]);
  if (tRes.rows.length === 0) return res.status(404).json({ error: "Tournament not found" });
  const tournament = tRes.rows[0];

  const canManage = await canUserManageTournament(req.user.id, tournament);
  if (!canManage) {
    return res.status(403).json({
      error: "Only the tournament creator or creator team members can update matches",
    });
  }

  const mRes = await pool.query(
    `SELECT * FROM matches WHERE id = $1 AND tournament_id = $2`,
    [matchId, id]
  );
  if (mRes.rows.length === 0) return res.status(404).json({ error: "Match not found in this tournament" });
  const existing = mRes.rows[0];

  const updatedTeam1Name = team1_name !== undefined ? (team1_name ? team1_name.trim() : null) : existing.team1_name;
  const updatedTeam2Name = team2_name !== undefined ? (team2_name ? team2_name.trim() : null) : existing.team2_name;
  const updatedStatus = status !== undefined ? status : existing.status;
  const updatedResult = result !== undefined ? (result ? result.trim() : null) : existing.result;
  const updatedMom = mom !== undefined ? (mom ? mom.trim() : null) : (existing.mom || existing.man_of_the_match);
  const updatedScoreboardUrl = scoreboard_url !== undefined ? scoreboard_url : existing.scoreboard_url;
  const updatedScoreboardName = scoreboard_name !== undefined ? scoreboard_name : existing.scoreboard_name;
  const updatedVenue = venue !== undefined ? (venue ? venue.trim() : null) : existing.venue;
  const updatedDate = match_date !== undefined ? (match_date ? new Date(match_date) : null) : existing.match_date;
  const updatedRound = round !== undefined ? (round ? round.trim() : null) : existing.round;
  const updatedOvers = overs_limit !== undefined ? Number(overs_limit) || 20 : existing.overs_limit;

  const updateRes = await pool.query(
    `UPDATE matches
     SET team1_name = $1,
         team2_name = $2,
         team1_id = COALESCE($3, team1_id),
         team2_id = COALESCE($4, team2_id),
         status = $5,
         result = $6,
         mom = $7,
         man_of_the_match = $7,
         scoreboard_url = $8,
         scoreboard_name = $9,
         venue = $10,
         match_date = $11,
         round = $12,
         overs_limit = $13,
         updated_at = now()
     WHERE id = $14 AND tournament_id = $15
     RETURNING *`,
    [
      updatedTeam1Name,
      updatedTeam2Name,
      team1_id,
      team2_id,
      updatedStatus,
      updatedResult,
      updatedMom,
      updatedScoreboardUrl,
      updatedScoreboardName,
      updatedVenue,
      updatedDate,
      updatedRound,
      updatedOvers,
      matchId,
      id,
    ]
  );

  res.json({
    message: "Tournament match updated successfully",
    match: {
      ...updateRes.rows[0],
      team1_name: updatedTeam1Name,
      team2_name: updatedTeam2Name,
      mom: updatedMom,
    },
  });
});

// DELETE /api/tournaments/:id/matches/:matchId
const deleteTournamentMatch = asyncHandler(async (req, res) => {
  const { id, matchId } = req.params;

  const tRes = await pool.query(`SELECT * FROM tournaments WHERE id = $1`, [id]);
  if (tRes.rows.length === 0) return res.status(404).json({ error: "Tournament not found" });
  const tournament = tRes.rows[0];

  const canManage = await canUserManageTournament(req.user.id, tournament);
  if (!canManage) {
    return res.status(403).json({
      error: "Only the tournament creator or creator team members can delete matches",
    });
  }

  const delRes = await pool.query(
    `DELETE FROM matches WHERE id = $1 AND tournament_id = $2 RETURNING id`,
    [matchId, id]
  );
  if (delRes.rows.length === 0) return res.status(404).json({ error: "Match not found in this tournament" });

  res.json({ message: "Tournament match deleted successfully", match_id: matchId });
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
  getTournamentMatches,
  createTournamentMatch,
  updateTournamentMatch,
  deleteTournamentMatch,
};