const pool = require("../config/db");
const asyncHandler = require("../utils/asyncHandler");
// const asyncHandler = require("../utils/asyncHandler");
const {
  notifyChallengeAccepted,
  notifyChallengeCancelled,
} = require("../services/notificationService");

// ============================================================
// Helpers
// ============================================================

async function findOrCreateTeam(client, name) {
  const existing = await client.query(`SELECT id FROM teams WHERE name = $1`, [name]);
  if (existing.rows.length > 0) return existing.rows[0].id;
  const created = await client.query(
    `INSERT INTO teams (name) VALUES ($1) RETURNING id`,
    [name]
  );
  return created.rows[0].id;
}

async function createPlayers(client, teamId, names) {
  const ids = [];
  for (const name of names) {
    const res = await client.query(
      `INSERT INTO players (name, team_id) VALUES ($1, $2) RETURNING id`,
      [name, teamId]
    );
    ids.push(res.rows[0].id);
  }
  return ids;
}





// ============================================================
// POST /api/matches/:matchId/accept-challenge
// Called by the challenged user. Flips status to 'challenge_accepted'
// and notifies the user who originally posted the challenge.
// ============================================================
const acceptChallenge = asyncHandler(async (req, res) => {
  const { matchId } = req.params;

  const matchRes = await pool.query(
    `SELECT m.*, t1.name AS team1_name, t2.name AS team2_name,
            creator.fcm_token AS creator_token,
            challenged_team.name AS challenged_team_name
     FROM matches m
     JOIN teams t1 ON t1.id = m.team1_id
     JOIN teams t2 ON t2.id = m.team2_id
     JOIN users creator ON creator.id = m.created_by
     JOIN teams challenged_team
       ON challenged_team.id = CASE
            WHEN m.challenged_user_id = m.created_by THEN m.team1_id
            ELSE m.team2_id
          END
     WHERE m.id = $1`,
    [matchId]
  );
  if (matchRes.rows.length === 0) {
    return res.status(404).json({ error: "Match not found" });
  }
  const match = matchRes.rows[0];

  const updated = await pool.query(
    `UPDATE matches SET status = 'challenge_accepted', updated_at = now()
     WHERE id = $1 RETURNING *`,
    [matchId]
  );

  await notifyChallengeAccepted(match.creator_token, match.challenged_team_name, {
    match_id: String(matchId),
  });

  res.json({ ok: true, match: updated.rows[0] });
});

// ============================================================
// POST /api/matches/:matchId/cancel-challenge
// Called by the challenged user (or the creator) to withdraw/decline.
// Notifies the original creator that the challenge was cancelled.
// ============================================================
const cancelChallenge = asyncHandler(async (req, res) => {
  const { matchId } = req.params;

  const matchRes = await pool.query(
    `SELECT m.*, t1.name AS team1_name, t2.name AS team2_name,
            creator.fcm_token AS creator_token,
            challenged_team.name AS challenged_team_name
     FROM matches m
     JOIN teams t1 ON t1.id = m.team1_id
     JOIN teams t2 ON t2.id = m.team2_id
     JOIN users creator ON creator.id = m.created_by
     JOIN teams challenged_team
       ON challenged_team.id = CASE
            WHEN m.challenged_user_id = m.created_by THEN m.team1_id
            ELSE m.team2_id
          END
     WHERE m.id = $1`,
    [matchId]
  );
  if (matchRes.rows.length === 0) {
    return res.status(404).json({ error: "Match not found" });
  }
  const match = matchRes.rows[0];

  const updated = await pool.query(
    `UPDATE matches SET status = 'challenge_cancelled', updated_at = now()
     WHERE id = $1 RETURNING *`,
    [matchId]
  );

  await notifyChallengeCancelled(match.creator_token, match.challenged_team_name, {
    match_id: String(matchId),
  });

  res.json({ ok: true, match: updated.rows[0] });
});

// ============================================================
// GET /api/matches
// List every match for the home screen.
// ============================================================
const listMatches = asyncHandler(async (req, res) => {
  const matchesRes = await pool.query(
    `SELECT m.*, t1.name AS team1_name, t2.name AS team2_name
     FROM matches m
     JOIN teams t1 ON t1.id = m.team1_id
     JOIN teams t2 ON t2.id = m.team2_id
     ORDER BY m.updated_at DESC NULLS LAST, m.created_at DESC`
  );

  const matches = await Promise.all(
    matchesRes.rows.map(async (m) => {
      if (m.status === "not_started") {
        const countsRes = await pool.query(
          `SELECT
             (SELECT COUNT(*)::int FROM players WHERE team_id = $1) AS t1_count,
             (SELECT COUNT(*)::int FROM players WHERE team_id = $2) AS t2_count`,
          [m.team1_id, m.team2_id]
        );
        const { t1_count, t2_count } = countsRes.rows[0];
        return {
          ...m,
          current_innings_summary: null,
          needs_squads: t1_count < 2 || t2_count < 2,
        };
      }
      const inningsRes = await pool.query(
        `SELECT total_runs, wickets, overs_completed FROM innings
         WHERE match_id = $1 ORDER BY inning_number DESC LIMIT 1`,
        [m.id]
      );
      return {
        ...m,
        current_innings_summary: inningsRes.rows[0] || null,
      };
    })
  );

  res.json(matches);
});

// ============================================================
// POST /api/matches
// Body: { team1_name, team2_name, venue, overs_limit }
// (team1_players/team2_players still accepted for backwards compatibility,
// but the new flow adds squads separately via POST /:matchId/squads)
// Batting/bowling team is set later by the toss endpoint.
// ============================================================
const createMatch = asyncHandler(async (req, res) => {
  const {
    team1_name, team2_name, venue = null, overs_limit = 20,
    team1_players = [], team2_players = [],
  } = req.body;

  if (!team1_name || !team2_name) {
    return res.status(400).json({ error: "team1_name and team2_name are required" });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const team1Id = await findOrCreateTeam(client, team1_name.trim());
    const team2Id = await findOrCreateTeam(client, team2_name.trim());

    if (team1_players.length) await createPlayers(client, team1Id, team1_players);
    if (team2_players.length) await createPlayers(client, team2Id, team2_players);

    const matchRes = await client.query(
      `INSERT INTO matches (team1_id, team2_id, venue, overs_limit, status)
       VALUES ($1,$2,$3,$4,'not_started') RETURNING id`,
      [team1Id, team2Id, venue, overs_limit]
    );

    await client.query("COMMIT");
    res.status(201).json({ match_id: matchRes.rows[0].id });
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
});

// ============================================================
// POST /api/matches/:matchId/squads
// Body: { team1_players: string[], team2_players: string[] }
// Adds players to the two teams already attached to this match. Safe to
// call more than once (e.g. adding a few more names later) — it only adds.
// ============================================================
const addSquads = asyncHandler(async (req, res) => {
  const { matchId } = req.params;
  const { team1_players = [], team2_players = [] } = req.body;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const matchRes = await client.query(`SELECT team1_id, team2_id FROM matches WHERE id = $1 FOR UPDATE`, [matchId]);
    if (matchRes.rows.length === 0) throw new Error("Match not found");
    const { team1_id, team2_id } = matchRes.rows[0];

    if (team1_players.length) await createPlayers(client, team1_id, team1_players);
    if (team2_players.length) await createPlayers(client, team2_id, team2_players);

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }

  const [p1, p2] = await Promise.all([
    pool.query(
      `SELECT p.id, p.name FROM players p JOIN matches m ON m.team1_id = p.team_id WHERE m.id = $1 ORDER BY p.created_at`,
      [matchId]
    ),
    pool.query(
      `SELECT p.id, p.name FROM players p JOIN matches m ON m.team2_id = p.team_id WHERE m.id = $1 ORDER BY p.created_at`,
      [matchId]
    ),
  ]);
  const namesRes = await pool.query(
    `SELECT t1.name AS team1_name, t2.name AS team2_name FROM matches m
     JOIN teams t1 ON t1.id = m.team1_id JOIN teams t2 ON t2.id = m.team2_id WHERE m.id = $1`,
    [matchId]
  );
  const { team1_name, team2_name } = namesRes.rows[0];

  res.status(201).json({
    team1: { name: team1_name, players: p1.rows },
    team2: { name: team2_name, players: p2.rows },
  });
});

// ============================================================
// POST /api/matches/:matchId/toss
// Body: { toss_winner_team: "team1"|"team2", toss_decision: "bat"|"bowl" }
// Sets which side bats first, before any innings/openers are chosen.
// ============================================================
const recordToss = asyncHandler(async (req, res) => {
  const { matchId } = req.params;
  const { toss_winner_team, toss_decision } = req.body;

  if (!["team1", "team2"].includes(toss_winner_team) || !["bat", "bowl"].includes(toss_decision)) {
    return res.status(400).json({ error: "toss_winner_team must be 'team1'|'team2' and toss_decision must be 'bat'|'bowl'" });
  }

  const matchRes = await pool.query(`SELECT team1_id, team2_id FROM matches WHERE id = $1`, [matchId]);
  if (matchRes.rows.length === 0) return res.status(404).json({ error: "Match not found" });
  const { team1_id, team2_id } = matchRes.rows[0];

  const winnerTeamId = toss_winner_team === "team1" ? team1_id : team2_id;
  const loserTeamId = toss_winner_team === "team1" ? team2_id : team1_id;
  const battingTeamId = toss_decision === "bat" ? winnerTeamId : loserTeamId;
  const bowlingTeamId = battingTeamId === team1_id ? team2_id : team1_id;

  await pool.query(
    `UPDATE matches SET toss_winner_team = $1, toss_decision = $2,
       batting_team_id = $3, bowling_team_id = $4, updated_at = now()
     WHERE id = $5`,
    [toss_winner_team, toss_decision, battingTeamId, bowlingTeamId, matchId]
  );

  const live = await buildLiveState(matchId);
  res.json(live);
});

// ============================================================
// GET /api/matches/:matchId/squads
// ============================================================
const getSquads = asyncHandler(async (req, res) => {
  const { matchId } = req.params;

  const matchRes = await pool.query(
    `SELECT m.*, t1.name AS team1_name, t2.name AS team2_name
     FROM matches m JOIN teams t1 ON t1.id = m.team1_id JOIN teams t2 ON t2.id = m.team2_id
     WHERE m.id = $1`,
    [matchId]
  );
  if (matchRes.rows.length === 0) return res.status(404).json({ error: "Match not found" });
  const match = matchRes.rows[0];

  const [p1, p2] = await Promise.all([
    pool.query(`SELECT id, name FROM players WHERE team_id = $1 ORDER BY created_at`, [match.team1_id]),
    pool.query(`SELECT id, name FROM players WHERE team_id = $1 ORDER BY created_at`, [match.team2_id]),
  ]);

  res.json({
    team1: { name: match.team1_name, players: p1.rows },
    team2: { name: match.team2_name, players: p2.rows },
  });
});

// ============================================================
// POST /api/matches/:matchId/start-innings
// Body: { innings_number, batting_team, striker_id, non_striker_id, bowler_id }
// "batting_team" is a team NAME (matches what the frontend sends).
// ============================================================
const startInnings = asyncHandler(async (req, res) => {
  const { matchId } = req.params;
  const { innings_number = 1, batting_team, striker_id, non_striker_id, bowler_id } = req.body;

  if (!batting_team || !striker_id || !non_striker_id || !bowler_id) {
    return res.status(400).json({ error: "batting_team, striker_id, non_striker_id, bowler_id are required" });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const matchRes = await client.query(
      `SELECT m.*, t1.name AS team1_name, t2.name AS team2_name
       FROM matches m JOIN teams t1 ON t1.id = m.team1_id JOIN teams t2 ON t2.id = m.team2_id
       WHERE m.id = $1 FOR UPDATE`,
      [matchId]
    );
    if (matchRes.rows.length === 0) throw new Error("Match not found");
    const match = matchRes.rows[0];

    const battingTeamId = batting_team === match.team1_name ? match.team1_id : match.team2_id;
    const bowlingTeamId = battingTeamId === match.team1_id ? match.team2_id : match.team1_id;

    const inningsRes = await client.query(
      `INSERT INTO innings (match_id, inning_number, batting_team_id, bowling_team_id, total_runs, wickets, overs_completed, is_completed)
       VALUES ($1,$2,$3,$4,0,0,0,false) RETURNING *`,
      [matchId, innings_number, battingTeamId, bowlingTeamId]
    );
    const innings = inningsRes.rows[0];

    for (const [pid, onStrike] of [[striker_id, true], [non_striker_id, false]]) {
      await client.query(
        `INSERT INTO batting_stats (innings_id, player_id, runs, balls_faced, fours, sixes, is_out, is_on_strike)
         VALUES ($1,$2,0,0,0,0,false,$3)
         ON CONFLICT (innings_id, player_id) DO UPDATE SET is_on_strike = EXCLUDED.is_on_strike`,
        [innings.id, pid, onStrike]
      );
    }

    await client.query(
      `INSERT INTO bowling_stats (innings_id, player_id, overs_bowled, runs_conceded, wickets, is_current)
       VALUES ($1,$2,0,0,0,true)
       ON CONFLICT (innings_id, player_id) DO UPDATE SET is_current = true`,
      [innings.id, bowler_id]
    );

    await client.query(
      `UPDATE matches SET status = 'live', batting_team_id = $1, bowling_team_id = $2, updated_at = now() WHERE id = $3`,
      [battingTeamId, bowlingTeamId, matchId]
    );

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }

  const live = await buildLiveState(matchId);
  res.status(201).json(live);
});

// ============================================================
// POST /api/matches/:matchId/balls
// Body: { runs, extra_type, extra_runs, is_wicket, wicket_type,
//         dismissed_player_id, fielder_id, striker_id, non_striker_id, bowler_id }
// ============================================================
const recordBall = asyncHandler(async (req, res) => {
  const { matchId } = req.params;
  const {
    runs = 0, extra_type = null, extra_runs = 0,
    is_wicket = false, wicket_type = null, dismissed_player_id = null, fielder_id = null,
  } = req.body;
  let { striker_id, non_striker_id, bowler_id } = req.body;

  // If the frontend's local state was stale/missing these (e.g. right after
  // starting an innings), fall back to whatever the DB currently has as
  // on-strike / non-striker / current bowler for the active innings.
  if (!striker_id || !non_striker_id || !bowler_id) {
    const activeInningsRes = await pool.query(
      `SELECT id FROM innings WHERE match_id = $1 AND is_completed = false
       ORDER BY inning_number DESC LIMIT 1`,
      [matchId]
    );
    if (activeInningsRes.rows.length === 0) {
      return res.status(400).json({ error: "No active innings — start an innings before recording balls" });
    }
    const activeInningsId = activeInningsRes.rows[0].id;

    if (!striker_id || !non_striker_id) {
      const battingRes = await pool.query(
        `SELECT player_id, is_on_strike FROM batting_stats
         WHERE innings_id = $1 AND is_out = false ORDER BY is_on_strike DESC`,
        [activeInningsId]
      );
      striker_id ??= battingRes.rows.find((b) => b.is_on_strike)?.player_id;
      non_striker_id ??= battingRes.rows.find((b) => !b.is_on_strike)?.player_id;
    }
    if (!bowler_id) {
      const bowlingRes = await pool.query(
        `SELECT player_id FROM bowling_stats WHERE innings_id = $1 AND is_current = true LIMIT 1`,
        [activeInningsId]
      );
      bowler_id = bowlingRes.rows[0]?.player_id;
    }
  }

  if (!striker_id || !non_striker_id || !bowler_id) {
    return res.status(400).json({
      error: "Could not determine striker, non-striker and bowler. Has the innings been started with two batsmen and a bowler selected?",
    });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const matchRes = await client.query(`SELECT * FROM matches WHERE id = $1 FOR UPDATE`, [matchId]);
    if (matchRes.rows.length === 0) throw new Error("Match not found");
    const match = matchRes.rows[0];

    const inningsRes = await client.query(
      `SELECT * FROM innings WHERE match_id = $1 AND is_completed = false
       ORDER BY inning_number DESC LIMIT 1 FOR UPDATE`,
      [matchId]
    );
    if (inningsRes.rows.length === 0) throw new Error("No active innings for this match");
    const innings = inningsRes.rows[0];

    let overRes = await client.query(
      `SELECT * FROM overs WHERE innings_id = $1 AND is_completed = false
       ORDER BY over_number DESC LIMIT 1 FOR UPDATE`,
      [innings.id]
    );
    let currentOver;
    if (overRes.rows.length === 0) {
      const nextOverNumber = Math.floor(Number(innings.overs_completed)) + 1;
      const created = await client.query(
        `INSERT INTO overs (innings_id, over_number, bowler_id) VALUES ($1,$2,$3) RETURNING *`,
        [innings.id, nextOverNumber, bowler_id]
      );
      currentOver = created.rows[0];
    } else {
      currentOver = overRes.rows[0];
    }

    const isLegalDelivery = extra_type !== "wide" && extra_type !== "noball";

    const legalCountRes = await client.query(
      `SELECT COUNT(*)::int AS n FROM balls
       WHERE over_id = $1 AND extra_type IS DISTINCT FROM 'wide' AND extra_type IS DISTINCT FROM 'noball'`,
      [currentOver.id]
    );
    const legalBallsSoFar = legalCountRes.rows[0].n;
    const ballNumber = isLegalDelivery ? legalBallsSoFar + 1 : legalBallsSoFar;

    const totalRunsThisBall = Number(runs) + Number(extra_runs);
    // Runs off the bat: byes/leg-byes/wides don't credit the batsman
    const battingRunsCredit = ["bye", "legbye", "wide"].includes(extra_type) ? 0 : Number(runs);
    const countsAsFaced = extra_type !== "wide";

    await client.query(
      `INSERT INTO balls (over_id, ball_number, batsman_id, bowler_id, fielder_id, runs, extra_type, extra_runs,
                           is_wicket, wicket_type, dismissed_player_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [currentOver.id, ballNumber, striker_id, bowler_id, fielder_id, runs, extra_type, extra_runs,
       is_wicket, wicket_type, dismissed_player_id]
    );

    await client.query(
      `UPDATE overs SET runs_conceded = runs_conceded + $1, wickets = wickets + $2 WHERE id = $3`,
      [totalRunsThisBall, is_wicket ? 1 : 0, currentOver.id]
    );

    const isOverComplete = isLegalDelivery && ballNumber === 6;
    if (isOverComplete) {
      await client.query(`UPDATE overs SET is_completed = true WHERE id = $1`, [currentOver.id]);
    }

    const completedOvers = Math.floor(Number(innings.overs_completed));
    const newOversCompleted = isOverComplete
      ? completedOvers + 1
      : Number(`${completedOvers}.${isLegalDelivery ? legalBallsSoFar + 1 : legalBallsSoFar}`);

    const newTotalRuns = innings.total_runs + totalRunsThisBall;
    const newWickets = innings.wickets + (is_wicket ? 1 : 0);

    await client.query(
      `UPDATE innings SET total_runs = $1, wickets = $2, overs_completed = $3 WHERE id = $4`,
      [newTotalRuns, newWickets, newOversCompleted, innings.id]
    );

    await client.query(
      `INSERT INTO batting_stats (innings_id, player_id, runs, balls_faced, fours, sixes, is_on_strike)
       VALUES ($1,$2,$3,$4,$5,$6,true)
       ON CONFLICT (innings_id, player_id) DO UPDATE SET
         runs        = batting_stats.runs + EXCLUDED.runs,
         balls_faced = batting_stats.balls_faced + EXCLUDED.balls_faced,
         fours       = batting_stats.fours + EXCLUDED.fours,
         sixes       = batting_stats.sixes + EXCLUDED.sixes,
         is_on_strike = true`,
      [innings.id, striker_id, battingRunsCredit, countsAsFaced ? 1 : 0,
       battingRunsCredit === 4 ? 1 : 0, battingRunsCredit === 6 ? 1 : 0]
    );
    // make sure the non-striker has a row too
    await client.query(
      `INSERT INTO batting_stats (innings_id, player_id, runs, balls_faced, fours, sixes, is_on_strike)
       VALUES ($1,$2,0,0,0,0,false)
       ON CONFLICT (innings_id, player_id) DO NOTHING`,
      [innings.id, non_striker_id]
    );

    if (is_wicket && dismissed_player_id) {
      await client.query(
        `UPDATE batting_stats SET is_out = true, is_on_strike = false, dismissal = $1
         WHERE innings_id = $2 AND player_id = $3`,
        [wicket_type, innings.id, dismissed_player_id]
      );
    }

    await client.query(
      `INSERT INTO bowling_stats (innings_id, player_id, overs_bowled, runs_conceded, wickets, is_current)
       VALUES ($1,$2,$3,$4,$5,true)
       ON CONFLICT (innings_id, player_id) DO UPDATE SET
         overs_bowled  = bowling_stats.overs_bowled + EXCLUDED.overs_bowled,
         runs_conceded = bowling_stats.runs_conceded + EXCLUDED.runs_conceded,
         wickets       = bowling_stats.wickets + EXCLUDED.wickets,
         is_current    = true`,
      [innings.id, bowler_id, isOverComplete ? 1 : (isLegalDelivery ? 0.1 : 0), totalRunsThisBall, is_wicket ? 1 : 0]
    );

    // Strike rotation: odd runs off the bat, or odd bye/legbye runs, flips ends.
    const runsThatRotate = ["bye", "legbye"].includes(extra_type) ? Number(extra_runs) : Number(runs);
    if (!is_wicket && runsThatRotate % 2 === 1) {
      await client.query(
        `UPDATE batting_stats SET is_on_strike = NOT is_on_strike WHERE innings_id = $1 AND is_out = false`,
        [innings.id]
      );
    }
    if (isOverComplete) {
      await client.query(
        `UPDATE batting_stats SET is_on_strike = NOT is_on_strike WHERE innings_id = $1 AND is_out = false`,
        [innings.id]
      );
      await client.query(`UPDATE bowling_stats SET is_current = false WHERE innings_id = $1`, [innings.id]);
    }

    // How many batsmen has this team got available (squad size for the batting team)?
    const squadSizeRes = await client.query(
      `SELECT COUNT(*)::int AS n FROM players WHERE team_id = $1`,
      [innings.batting_team_id]
    );
    const squadSize = squadSizeRes.rows[0].n || 11;

    const allOut = newWickets >= (squadSize - 1);
    const oversUp = newOversCompleted >= Number(match.overs_limit);
    let inningsComplete = allOut || oversUp;

    // If this is the 2nd innings, check if the chase is already won
    let matchComplete = false;
    if (innings.inning_number === 2) {
      const firstInningsRes = await client.query(
        `SELECT total_runs FROM innings WHERE match_id = $1 AND inning_number = 1`,
        [matchId]
      );
      const target = (firstInningsRes.rows[0]?.total_runs ?? 0) + 1;
      if (newTotalRuns >= target) {
        inningsComplete = true;
        matchComplete = true;
      } else if (inningsComplete) {
        matchComplete = true;
      }
    }

    if (inningsComplete) {
      await client.query(`UPDATE innings SET is_completed = true WHERE id = $1`, [innings.id]);
    }
    if (matchComplete) {
      await client.query(`UPDATE matches SET status = 'completed', updated_at = now() WHERE id = $1`, [matchId]);
    } else {
      await client.query(`UPDATE matches SET updated_at = now() WHERE id = $1`, [matchId]);
    }

    await client.query("COMMIT");

    const live = await buildLiveState(matchId);
    res.status(201).json({
      ...live,
      prompts: {
        needs_new_batsman: is_wicket && !inningsComplete,
        needs_new_bowler: isOverComplete && !inningsComplete,
        innings_complete: inningsComplete,
        match_complete: matchComplete,
      },
    });
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
});

// ============================================================
// POST /api/matches/:matchId/balls/undo
// Deletes the most recent ball and recomputes everything from what's left,
// which is safer than trying to reverse increments by hand.
//
// FIX (DJ — 24 Jul): previously this always reset is_on_strike / is_current
// to false for every player after recompute, which wiped out who was
// batting/bowling and made the frontend fall back to the "Fix Current
// Players" recovery screen after every single undo. Now we replay the
// remaining balls (same over-completion + strike-rotation rules used in
// recordBall) to work out who SHOULD be on strike and who's bowling, and
// persist that instead of blanking it.
// ============================================================
const undoBall = asyncHandler(async (req, res) => {
  const { matchId } = req.params;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const inningsRes = await client.query(
      `SELECT * FROM innings WHERE match_id = $1 ORDER BY inning_number DESC LIMIT 1 FOR UPDATE`,
      [matchId]
    );
    if (inningsRes.rows.length === 0) throw new Error("No innings to undo");
    const innings = inningsRes.rows[0];

    const lastBallRes = await client.query(
      `SELECT b.* FROM balls b JOIN overs o ON o.id = b.over_id
       WHERE o.innings_id = $1 ORDER BY b.created_at DESC LIMIT 1`,
      [innings.id]
    );
    if (lastBallRes.rows.length === 0) throw new Error("No balls to undo");
    const lastBall = lastBallRes.rows[0];

    await client.query(`DELETE FROM balls WHERE id = $1`, [lastBall.id]);

    // Recompute the over this ball belonged to
    const remainingInOver = await client.query(
      `SELECT * FROM balls WHERE over_id = $1 ORDER BY ball_number`,
      [lastBall.over_id]
    );
    if (remainingInOver.rows.length === 0) {
      await client.query(`DELETE FROM overs WHERE id = $1`, [lastBall.over_id]);
    } else {
      const runs = remainingInOver.rows.reduce((s, b) => s + Number(b.runs) + Number(b.extra_runs), 0);
      const wkts = remainingInOver.rows.reduce((s, b) => s + (b.is_wicket ? 1 : 0), 0);
      await client.query(
        `UPDATE overs SET runs_conceded = $1, wickets = $2, is_completed = false WHERE id = $3`,
        [runs, wkts, lastBall.over_id]
      );
    }

    // Recompute the whole innings from remaining balls (simplest correct approach).
    // IMPORTANT: ordered by b.id (insertion order) rather than
    // (over_number, ball_number) — wides/no-balls can share a ball_number
    // with the legal delivery around them, which made ORDER BY ball_number
    // an unstable/wrong sort for reconstructing what actually happened.
    const allBallsRes = await client.query(
      `SELECT b.*, o.over_number FROM balls b JOIN overs o ON o.id = b.over_id
       WHERE o.innings_id = $1 ORDER BY b.id`,
      [innings.id]
    );
    const balls = allBallsRes.rows;

    let totalRuns = 0, wickets = 0, legalCountInOver = 0, oversCompleted = 0;
    const battingTotals = {}; // player_id -> {runs, balls_faced, fours, sixes, is_out, dismissal}
    const bowlingTotals = {}; // player_id -> {balls, runs, wickets}

    // Track who's on strike / who's bowling as we replay, the same way
    // recordBall() does live: strike rotates on odd runs (incl. byes/legbyes)
    // and at the end of every completed over; the bowler resets to "none"
    // at the end of a completed over (a new bowler must be picked, same as live).
    let onStrikeId = null;
    let currentBowlerId = null;

    for (const b of balls) {
      const isLegal = b.extra_type !== "wide" && b.extra_type !== "noball";
      const battingCredit = ["bye", "legbye", "wide"].includes(b.extra_type) ? 0 : Number(b.runs);
      totalRuns += Number(b.runs) + Number(b.extra_runs);
      if (b.is_wicket) wickets += 1;

      battingTotals[b.batsman_id] ??= { runs: 0, balls_faced: 0, fours: 0, sixes: 0, is_out: false, dismissal: null };
      battingTotals[b.batsman_id].runs += battingCredit;
      if (b.extra_type !== "wide") battingTotals[b.batsman_id].balls_faced += 1;
      if (battingCredit === 4) battingTotals[b.batsman_id].fours += 1;
      if (battingCredit === 6) battingTotals[b.batsman_id].sixes += 1;
      if (b.is_wicket && b.dismissed_player_id) {
        battingTotals[b.dismissed_player_id] ??= { runs: 0, balls_faced: 0, fours: 0, sixes: 0, is_out: false, dismissal: null };
        battingTotals[b.dismissed_player_id].is_out = true;
        battingTotals[b.dismissed_player_id].dismissal = b.wicket_type;
      }

      bowlingTotals[b.bowler_id] ??= { balls: 0, runs: 0, wickets: 0 };
      bowlingTotals[b.bowler_id].runs += Number(b.runs) + Number(b.extra_runs);
      if (b.is_wicket) bowlingTotals[b.bowler_id].wickets += 1;

      // Whoever bowled this ball is provisionally "current" until an over
      // completes, at which point we clear it (mirrors recordBall()).
      currentBowlerId = b.bowler_id;
      onStrikeId = b.batsman_id;

      if (isLegal) {
        bowlingTotals[b.bowler_id].balls += 1;
        legalCountInOver += 1;
      }

      const runsThatRotate = ["bye", "legbye"].includes(b.extra_type) ? Number(b.extra_runs) : Number(b.runs);
      let flip = !b.is_wicket && runsThatRotate % 2 === 1;

      if (isLegal && legalCountInOver === 6) {
        oversCompleted += 1;
        legalCountInOver = 0;
        flip = !flip;          // strike also rotates at the end of an over
        currentBowlerId = null; // over just completed — a new bowler must be selected
      }

      if (flip) {
        const notOut = Object.keys(battingTotals).filter((id) => !battingTotals[id].is_out);
        const other = notOut.find((id) => id !== String(onStrikeId));
        if (other) onStrikeId = other;
      }
    }

    // If the batsman currently "on strike" per the replay has since been
    // marked out (shouldn't normally happen, but guard anyway), fall back
    // to any not-out batsman so we never persist a striker who's out.
    if (onStrikeId != null && battingTotals[onStrikeId]?.is_out) {
      const notOut = Object.keys(battingTotals).find((id) => !battingTotals[id].is_out);
      onStrikeId = notOut ?? null;
    }

    const oversCompletedDecimal = Number(`${oversCompleted}.${legalCountInOver}`);

    await client.query(`DELETE FROM batting_stats WHERE innings_id = $1`, [innings.id]);
    await client.query(`DELETE FROM bowling_stats WHERE innings_id = $1`, [innings.id]);

    for (const [playerId, t] of Object.entries(battingTotals)) {
      const isOnStrike = !t.is_out && onStrikeId != null && String(playerId) === String(onStrikeId);
      await client.query(
        `INSERT INTO batting_stats (innings_id, player_id, runs, balls_faced, fours, sixes, is_out, dismissal, is_on_strike)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [innings.id, playerId, t.runs, t.balls_faced, t.fours, t.sixes, t.is_out, t.dismissal, isOnStrike]
      );
    }
    for (const [playerId, t] of Object.entries(bowlingTotals)) {
      const isCurrent = currentBowlerId != null && String(playerId) === String(currentBowlerId);
      await client.query(
        `INSERT INTO bowling_stats (innings_id, player_id, overs_bowled, runs_conceded, wickets, is_current)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [innings.id, playerId, Number(`${Math.floor(t.balls / 6)}.${t.balls % 6}`), t.runs, t.wickets, isCurrent]
      );
    }

    await client.query(
      `UPDATE innings SET total_runs = $1, wickets = $2, overs_completed = $3, is_completed = false WHERE id = $4`,
      [totalRuns, wickets, oversCompletedDecimal, innings.id]
    );
    await client.query(`UPDATE matches SET status = 'live', updated_at = now() WHERE id = $1`, [matchId]);

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }

  // NOTE: after an undo, striker/non-striker/current-bowler are now carried
  // forward correctly from the replay above. The one case where the frontend
  // will still (correctly) ask to reselect is when the undone ball was the
  // over's 6th legal delivery — in that case a bowler genuinely needs to be
  // picked again, same as it would live.
  const live = await buildLiveState(matchId);
  res.json(live);
});

// ============================================================
// POST /api/matches/:matchId/select-bowler
// ============================================================
const selectBowler = asyncHandler(async (req, res) => {
  const { matchId } = req.params;
  const { bowler_id } = req.body;
  if (!bowler_id) return res.status(400).json({ error: "bowler_id is required" });

  const inningsRes = await pool.query(
    `SELECT id FROM innings WHERE match_id = $1 AND is_completed = false ORDER BY inning_number DESC LIMIT 1`,
    [matchId]
  );
  if (inningsRes.rows.length === 0) return res.status(400).json({ error: "No active innings" });
  const inningsId = inningsRes.rows[0].id;

  await pool.query(
    `INSERT INTO bowling_stats (innings_id, player_id, overs_bowled, runs_conceded, wickets, is_current)
     VALUES ($1,$2,0,0,0,true)
     ON CONFLICT (innings_id, player_id) DO UPDATE SET is_current = true`,
    [inningsId, bowler_id]
  );

  const live = await buildLiveState(matchId);
  res.json(live);
});

// ============================================================
// POST /api/matches/:matchId/new-batsman
// ============================================================
const newBatsman = asyncHandler(async (req, res) => {
  const { matchId } = req.params;
  const { player_id } = req.body;
  if (!player_id) return res.status(400).json({ error: "player_id is required" });

  const inningsRes = await pool.query(
    `SELECT id FROM innings WHERE match_id = $1 AND is_completed = false ORDER BY inning_number DESC LIMIT 1`,
    [matchId]
  );
  if (inningsRes.rows.length === 0) return res.status(400).json({ error: "No active innings" });
  const inningsId = inningsRes.rows[0].id;

  await pool.query(
    `INSERT INTO batting_stats (innings_id, player_id, runs, balls_faced, fours, sixes, is_out, is_on_strike)
     VALUES ($1,$2,0,0,0,0,false,true)
     ON CONFLICT (innings_id, player_id) DO UPDATE SET is_on_strike = true`,
    [inningsId, player_id]
  );

  const live = await buildLiveState(matchId);
  res.json(live);
});

// ============================================================
// POST /api/matches/:matchId/complete
// Body: { result }
// ============================================================
const completeMatch = asyncHandler(async (req, res) => {
  const { matchId } = req.params;
  const { result } = req.body;

  await pool.query(
    `UPDATE matches SET status = 'completed', result = $1, updated_at = now() WHERE id = $2`,
    [result || null, matchId]
  );
  await pool.query(`UPDATE innings SET is_completed = true WHERE match_id = $1`, [matchId]);

  res.json({ ok: true });
});

// ============================================================
// GET /api/matches/:matchId/scoreboard
// ============================================================
const getScoreboard = asyncHandler(async (req, res) => {
  const { matchId } = req.params;

  const matchRes = await pool.query(
    `SELECT m.*, t1.name AS team1_name, t2.name AS team2_name
     FROM matches m JOIN teams t1 ON t1.id = m.team1_id JOIN teams t2 ON t2.id = m.team2_id
     WHERE m.id = $1`,
    [matchId]
  );
  if (matchRes.rows.length === 0) return res.status(404).json({ error: "Match not found" });
  const match = matchRes.rows[0];

  const inningsRes = await pool.query(
    `SELECT i.*, tb.name AS batting_team_name, tw.name AS bowling_team_name
     FROM innings i
     JOIN teams tb ON tb.id = i.batting_team_id
     JOIN teams tw ON tw.id = i.bowling_team_id
     WHERE i.match_id = $1 ORDER BY i.inning_number`,
    [matchId]
  );

  const innings = await Promise.all(
    inningsRes.rows.map(async (inn) => {
      const battingRes = await pool.query(
        `SELECT bs.*, p.name FROM batting_stats bs JOIN players p ON p.id = bs.player_id
         WHERE bs.innings_id = $1 ORDER BY bs.created_at`,
        [inn.id]
      );
      const bowlingRes = await pool.query(
        `SELECT bw.*, p.name FROM bowling_stats bw JOIN players p ON p.id = bw.player_id
         WHERE bw.innings_id = $1 ORDER BY bw.created_at`,
        [inn.id]
      );
      return {
        innings_number: inn.inning_number,
        batting_team_name: inn.batting_team_name,
        bowling_team_name: inn.bowling_team_name,
        total_runs: inn.total_runs,
        wickets: inn.wickets,
        overs: Number(inn.overs_completed).toFixed(1),
        batting: battingRes.rows,
        bowling: bowlingRes.rows,
      };
    })
  );

  res.json({ match, result: match.result, innings });
});

// ============================================================
// Shared: build the "live" payload shape used by getLiveScore,
// start-innings, recordBall, undoBall, selectBowler, newBatsman.
// ============================================================
async function buildLiveState(matchId) {
  const matchRes = await pool.query(
    `SELECT m.*, t1.name AS team1_name, t2.name AS team2_name
     FROM matches m JOIN teams t1 ON t1.id = m.team1_id JOIN teams t2 ON t2.id = m.team2_id
     WHERE m.id = $1`,
    [matchId]
  );
  if (matchRes.rows.length === 0) return null;
  let match = matchRes.rows[0];

  const inningsRes = await pool.query(
    `SELECT * FROM innings WHERE match_id = $1 ORDER BY inning_number`,
    [matchId]
  );

  const activeInnings = inningsRes.rows.find((i) => !i.is_completed);

  // Attach human-friendly batting_team / bowling_team names for the frontend
  const battingTeamId = activeInnings ? activeInnings.batting_team_id : match.batting_team_id;
  const bowlingTeamId = activeInnings ? activeInnings.bowling_team_id : match.bowling_team_id;
  match = {
    ...match,
    batting_team: battingTeamId === match.team1_id ? match.team1_name : match.team2_name,
    bowling_team: bowlingTeamId === match.team1_id ? match.team1_name : match.team2_name,
  };

  if (!activeInnings) {
    // Either nothing started, or the previous innings just completed and the
    // next one hasn't begun — either way the frontend shows OpeningSelectors.
    if (inningsRes.rows.length > 0 && match.status !== "completed") {
      const last = inningsRes.rows[inningsRes.rows.length - 1];
      // flip batting/bowling for the next innings
      match.batting_team = last.bowling_team_id === match.team1_id ? match.team1_name : match.team2_name;
      match.bowling_team = last.batting_team_id === match.team1_id ? match.team1_name : match.team2_name;
    }
    return { match, current_innings: null, batting: [], bowling: [], recent_balls: [] };
  }

  const battingRes = await pool.query(
    `SELECT bs.*, p.name FROM batting_stats bs JOIN players p ON p.id = bs.player_id
     WHERE bs.innings_id = $1 AND bs.is_out = false
     ORDER BY bs.is_on_strike DESC`,
    [activeInnings.id]
  );

  const bowlingRes = await pool.query(
    `SELECT bw.*, p.name FROM bowling_stats bw JOIN players p ON p.id = bw.player_id
     WHERE bw.innings_id = $1
     ORDER BY bw.is_current DESC, bw.overs_bowled DESC`,
    [activeInnings.id]
  );

  // FIX (DJ — 24 Jul): "This Over" was rendering out of order. Root cause —
  // wides/no-balls can share a ball_number with the legal delivery around
  // them (they don't increment the legal count), so ORDER BY ball_number
  // ASC hit ties and gave no guaranteed order across those. Ordering by
  // b.id (insertion order = the true chronological order balls were
  // recorded in) fixes this.
  const recentBallsRes = await pool.query(
    `SELECT b.* FROM balls b
     JOIN overs o ON o.id = b.over_id
     WHERE o.innings_id = $1 AND o.is_completed = false
     ORDER BY b.id ASC`,
    [activeInnings.id]
  );

  return {
    match,
    current_innings: activeInnings,
    batting: battingRes.rows.map((b) => ({ ...b, player_id: b.player_id })),
    bowling: bowlingRes.rows.map((b) => ({ ...b, player_id: b.player_id })),
    recent_balls: recentBallsRes.rows,
  };
}

// ============================================================
// GET /api/matches/:matchId/live
// ============================================================
const getLiveScore = asyncHandler(async (req, res) => {
  const live = await buildLiveState(req.params.matchId);
  if (!live) return res.status(404).json({ error: "Match not found" });
  res.json(live);
});

// ============================================================
// Fall of wickets for a single innings — derived from the balls table,
// no separate storage needed. For each wicket-ball we compute the
// cumulative team score up to and including that ball, and the over
// expressed the same way innings.overs_completed is (completed overs
// before this over + legal ball number within it, e.g. over_number=3,
// ball_number=4 -> "2.4").
// ============================================================
const getFallOfWickets = async (client, inningsId) => {
  const { rows } = await client.query(
    `SELECT
       ROW_NUMBER() OVER (ORDER BY b.created_at)   AS wicket_number,
       b.dismissed_player_id                       AS player_id,
       COALESCE(p.name, 'Unknown')                 AS player_name,
       running.score                                AS score,
       (o.over_number - 1) + (b.ball_number / 10.0) AS over
     FROM balls b
     JOIN overs o        ON o.id = b.over_id
     LEFT JOIN players p ON p.id = b.dismissed_player_id
     JOIN LATERAL (
       SELECT COALESCE(SUM(b2.runs + b2.extra_runs), 0) AS score
       FROM balls b2
       JOIN overs o2 ON o2.id = b2.over_id
       WHERE o2.innings_id = o.innings_id
         AND b2.created_at <= b.created_at
     ) running ON true
     WHERE o.innings_id = $1
       AND b.is_wicket = true
     ORDER BY b.created_at`,
    [inningsId]
  );
  return rows;
};
// ============================================================
// GET /api/matches/live/current
// ============================================================
const getCurrentLiveMatch = asyncHandler(async (req, res) => {
  const liveRes = await pool.query(
    `SELECT id FROM matches WHERE status = 'live' ORDER BY updated_at DESC NULLS LAST, created_at DESC LIMIT 1`
  );
  if (liveRes.rows.length > 0) return res.json({ match_id: liveRes.rows[0].id });

  const anyRes = await pool.query(`SELECT id FROM matches ORDER BY created_at DESC LIMIT 1`);
  if (anyRes.rows.length === 0) return res.status(404).json({ error: "No matches found" });
  res.json({ match_id: anyRes.rows[0].id });
});

// ============================================================
// POST /api/matches/:matchId/set-players
// Body: { striker_id, non_striker_id, bowler_id }
// Recovery endpoint: (re)assigns the on-strike batsman, non-striker, and
// current bowler for whichever innings is currently active, WITHOUT
// creating a new innings. Use this if the scoring screen ever shows up
// with no striker/bowler set (e.g. start-innings didn't fully persist).
// ============================================================
const setActivePlayers = asyncHandler(async (req, res) => {
  const { matchId } = req.params;
  const { striker_id, non_striker_id, bowler_id } = req.body;

  if (!striker_id || !non_striker_id || !bowler_id) {
    return res.status(400).json({ error: "striker_id, non_striker_id and bowler_id are required" });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const inningsRes = await client.query(
      `SELECT id FROM innings WHERE match_id = $1 AND is_completed = false
       ORDER BY inning_number DESC LIMIT 1 FOR UPDATE`,
      [matchId]
    );
    if (inningsRes.rows.length === 0) throw new Error("No active innings — start an innings first");
    const inningsId = inningsRes.rows[0].id;

    // Clear any existing strike/current flags for this innings, then set fresh ones
    await client.query(`UPDATE batting_stats SET is_on_strike = false WHERE innings_id = $1`, [inningsId]);
    await client.query(`UPDATE bowling_stats SET is_current = false WHERE innings_id = $1`, [inningsId]);

    for (const [pid, onStrike] of [[striker_id, true], [non_striker_id, false]]) {
      await client.query(
        `INSERT INTO batting_stats (innings_id, player_id, runs, balls_faced, fours, sixes, is_out, is_on_strike)
         VALUES ($1,$2,0,0,0,0,false,$3)
         ON CONFLICT (innings_id, player_id) DO UPDATE SET is_on_strike = EXCLUDED.is_on_strike`,
        [inningsId, pid, onStrike]
      );
    }
    await client.query(
      `INSERT INTO bowling_stats (innings_id, player_id, overs_bowled, runs_conceded, wickets, is_current)
       VALUES ($1,$2,0,0,0,true)
       ON CONFLICT (innings_id, player_id) DO UPDATE SET is_current = true`,
      [inningsId, bowler_id]
    );

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }

  const live = await buildLiveState(matchId);
  res.json(live);
});




module.exports = {
  listMatches,
  createMatch,
  addSquads,
  recordToss,
  getSquads,
  startInnings,
  recordBall,
  undoBall,
  selectBowler,
  newBatsman,
  completeMatch,
  getScoreboard,
  getLiveScore,
  getCurrentLiveMatch,
  setActivePlayers,
  acceptChallenge,
  cancelChallenge,
};