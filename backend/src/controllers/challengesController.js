const pool = require("../config/db");
const asyncHandler = require("../utils/asyncHandler");
const { sendNotification } = require("../services/notificationService");
// Every user id that belongs to the same team as `userId`, using the same
// team_name + village_name + team_year triple that GET /users/teammates
// groups people by. Normalized with LOWER(TRIM(...)) on the text columns
// so minor differences in casing or stray whitespace between teammates'
// signup data don't cause one real team to get split into two "teams".
// If the user hasn't filled that in yet, "their team" is just themselves.
async function getTeamMemberIds(userId) {
  const userRes = await pool.query(
    `SELECT team_name, village_name, team_year FROM users WHERE id = $1`,
    [userId]
  );
  const u = userRes.rows[0];
  if (!u || !u.team_name || !u.village_name || !u.team_year) {
    return [userId];
  }
  const teamRes = await pool.query(
    `SELECT id FROM users
     WHERE LOWER(TRIM(team_name)) = LOWER(TRIM($1))
       AND LOWER(TRIM(village_name)) = LOWER(TRIM($2))
       AND team_year = $3`,
    [u.team_name, u.village_name, u.team_year]
  );
  return teamRes.rows.map(r => r.id);
}

// Used when POSTING a new challenge — a team can't have two challenges
// "live" (open, on_hold, or accepted) waiting on them AT THE SAME match_date.
// Different dates are allowed, so a team can have a Saturday match and a
// separate Sunday post open at the same time.
async function findActiveChallengeForTeam(userIds, matchDate, excludeChallengeId = null) {
  const result = await pool.query(
    `SELECT id FROM challenges
     WHERE (
       (creator_id = ANY($1::int[]) AND status IN ('open', 'on_hold', 'accepted'))
       OR (accepted_by_user_id = ANY($1::int[]) AND status = 'accepted')
     )
     AND match_date = $2::date
     AND ($3::uuid IS NULL OR id != $3::uuid)
     LIMIT 1`,
    [userIds, matchDate, excludeChallengeId]
  );
  return result.rows[0] || null;
}

// Used when ACCEPTING — a team can't be locked into two accepted matches on
// the SAME date, but an existing OPEN post of theirs on a different date no
// longer blocks them; an open post on the SAME date gets put on hold instead
// (see acceptChallenge below).
async function findAcceptedMatchForTeam(userIds, matchDate, excludeChallengeId = null) {
  const result = await pool.query(
    `SELECT id FROM challenges
     WHERE (
       (creator_id = ANY($1::int[]) AND status = 'accepted')
       OR (accepted_by_user_id = ANY($1::int[]) AND status = 'accepted')
     )
     AND match_date = $2::date
     AND ($3::uuid IS NULL OR id != $3::uuid)
     LIMIT 1`,
    [userIds, matchDate, excludeChallengeId]
  );
  return result.rows[0] || null;
}

// GET /api/challenges?format=T20&status=open
const listChallenges = asyncHandler(async (req, res) => {
  const { format, status } = req.query;
  const conditions = [];
  const values = [];

  if (format) {
    values.push(format);
    conditions.push(`c.format = $${values.length}`);
  }
  if (status) {
    values.push(status);
    conditions.push(`c.status = $${values.length}`);
  }

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

// POST /api/challenges  Body: { team_name, contact_no, format, match_date, time_slot, ground_id, urgent, note }
const createChallenge = asyncHandler(async (req, res) => {
  const {
    team_name,
    contact_no,
    format,
    match_date,
    time_slot,
    ground_id,
    urgent,
    note,
  } = req.body;

  if (!team_name || !team_name.trim() || !format || !match_date || !time_slot) {
    return res.status(400).json({
      error: "team_name, format, match_date and time_slot are required",
    });
  }

  if (!contact_no || !/^[0-9]{10,15}$/.test(contact_no.trim())) {
    return res.status(400).json({
      error: "A valid contact number (10-15 digits) is required",
    });
  }

  const teamMemberIds = await getTeamMemberIds(req.user.id);

  const active = await findActiveChallengeForTeam(teamMemberIds, match_date);

  if (active) {
    return res.status(409).json({
      error:
        "Your team already has an active challenge on that date. Cancel it or pick a different date.",
    });
  }

  const result = await pool.query(
    `
    INSERT INTO challenges
    (
      team_name,
      contact_no,
      format,
      match_date,
      time_slot,
      ground_id,
      urgent,
      note,
      creator_id,
      status
    )
    VALUES
    ($1,$2,$3,$4,$5,$6,$7,$8,$9,'open')
    RETURNING *
    `,
    [
      team_name.trim(),
      contact_no.trim(),
      format,
      match_date,
      time_slot,
      ground_id || null,
      urgent || false,
      note || null,
      req.user.id,
    ]
  );

  // ============================
  // Notify all other users
  // ============================

  try {
    const users = await pool.query(
      `
      SELECT
        id,
        name,
        fcm_token
      FROM users
      WHERE id != $1
      AND fcm_token IS NOT NULL
      `,
      [req.user.id]
    );

    for (const user of users.rows) {
      try {
        await sendNotification(
          user.fcm_token,
          "🏏 New Challenge",
          `${team_name} has posted a new ${format} challenge.`,
          {
            type: "new_challenge",
            challengeId: String(result.rows[0].id),
            teamName: team_name,
            format,
          }
        );
      } catch (err) {
        console.error(
          `Failed to send notification to User ${user.id}`,
          err.message
        );
      }
    }
  } catch (err) {
    console.error("Notification Error:", err);
  }

  // ============================
  // Confirm to the creator that their challenge was posted
  // ============================

  let creatorNotificationSent = false;

  try {
    const creatorRes = await pool.query(
      `SELECT id, name, fcm_token FROM users WHERE id = $1`,
      [req.user.id]
    );
    const creator = creatorRes.rows[0];

    if (creator && creator.fcm_token) {
      try {
        await sendNotification(
          creator.fcm_token,
          "✅ Challenge Posted",
          `Your challenge for ${team_name} (${format}) has been posted successfully.`,
          {
            type: "challenge_posted_confirmation",
            challengeId: String(result.rows[0].id),
            teamName: team_name,
            format,
          }
        );

        creatorNotificationSent = true;
      } catch (err) {
        console.error(
          `Failed to send confirmation notification to creator User ${req.user.id}`,
          err.message
        );
      }
    }
  } catch (err) {
    console.error("Creator Confirmation Notification Error:", err);
  }

  return res.status(201).json({
    success: true,
    challenge: result.rows[0],
    notificationSent: creatorNotificationSent,
  });
});

// POST /api/challenges/:id/accept  Body: { team_name, contact_no }
const acceptChallenge = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { team_name, contact_no } = req.body;

  if (!team_name || !team_name.trim()) {
    return res.status(400).json({ error: "team_name is required" });
  }

  if (!contact_no || !/^[0-9]{10,15}$/.test(contact_no.trim())) {
    return res
      .status(400)
      .json({ error: "A valid contact number (10-15 digits) is required" });
  }

  const target = await pool.query(
    "SELECT creator_id, status, match_date FROM challenges WHERE id = $1",
    [id]
  );

  const challenge = target.rows[0];

  if (!challenge) {
    return res.status(404).json({ error: "Challenge not found" });
  }

  const teamMemberIds = await getTeamMemberIds(req.user.id);

  if (teamMemberIds.includes(challenge.creator_id)) {
    return res
      .status(400)
      .json({ error: "You can't accept your own team's challenge" });
  }

  if (challenge.status !== "open") {
    return res.status(409).json({ error: "Challenge is no longer open" });
  }

  const activeMatch = await findAcceptedMatchForTeam(teamMemberIds, challenge.match_date, id);

  if (activeMatch) {
    return res.status(409).json({
      error:
        "Your team already has an active match on that date. Cancel it before accepting another.",
    });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const result = await client.query(
      `
      UPDATE challenges
      SET
        status='accepted',
        accepted_by_team_name=$1,
        accepted_by_contact_no=$2,
        accepted_by_user_id=$3
      WHERE id=$4
      AND status='open'
      RETURNING *
      `,
      [team_name.trim(), contact_no.trim(), req.user.id, id]
    );

    if (result.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(409).json({
        error: "Challenge is no longer open",
      });
    }

    await client.query(
      `
      UPDATE challenges
      SET status='on_hold'
      WHERE creator_id = ANY($1::int[])
      AND status='open'
      AND match_date = $2::date
      `,
      [teamMemberIds, challenge.match_date]
    );

    await client.query("COMMIT");

    // =====================================
    // Send Firebase Notification
    // =====================================

    try {
      const userResult = await pool.query(
        `
        SELECT
          id,
          name,
          team_name,
          fcm_token
        FROM users
        WHERE id=$1
        `,
        [challenge.creator_id]
      );

      if (userResult.rows.length > 0) {
        const receiver = userResult.rows[0];

        if (receiver.fcm_token) {
          await sendNotification(
            receiver.fcm_token,
            "🏏 Challenge Accepted",
            `${team_name} has accepted your challenge.`,
            {
              type: "challenge_accepted",
              challengeId: String(id),
              acceptedBy: team_name,
              acceptedByUserId: String(req.user.id),
            }
          );
        }
      }
    } catch (notificationError) {
      console.error("Notification Error:", notificationError);
    }

    return res.json({
      success: true,
      message: "Challenge accepted successfully.",
      challenge: result.rows[0],
    });
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
});
// POST /api/challenges/:id/cancel
// Any member of either the posting team or the accepting team can cancel —
// not just the exact account that clicked post/accept. Reverts to 'open',
// and restores either team's on_hold post (if the accepting team had put
// one on hold to accept this match) back to 'open' too.
const cancelChallenge = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const existing = await pool.query(
    `SELECT creator_id, accepted_by_user_id, match_date FROM challenges WHERE id = $1`,
    [id]
  );
  if (existing.rows.length === 0) return res.status(404).json({ error: "Challenge not found" });
  const { creator_id, accepted_by_user_id, match_date } = existing.rows[0];

  const teamMemberIds = await getTeamMemberIds(req.user.id);
  const canCancel =
    teamMemberIds.includes(creator_id) ||
    (accepted_by_user_id && teamMemberIds.includes(accepted_by_user_id));

  if (!canCancel) {
    return res.status(403).json({ error: "Only a member of one of the two teams involved can cancel this match" });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const result = await client.query(
      `UPDATE challenges
       SET status = 'open', accepted_by_team_name = NULL, accepted_by_contact_no = NULL, accepted_by_user_id = NULL
       WHERE id = $1 RETURNING *`,
      [id]
    );

    // Restore whichever side's on_hold post(s) belong to the two teams that
    // were actually involved in this match — the creator's team and (if
    // set) the accepter's team — back to 'open' now that the match is off.
    const creatorTeamIds = await getTeamMemberIds(creator_id);
    const accepterTeamIds = accepted_by_user_id ? await getTeamMemberIds(accepted_by_user_id) : [];
    const involvedTeamIds = [...new Set([...creatorTeamIds, ...accepterTeamIds])];

    if (involvedTeamIds.length) {
      await client.query(
        `UPDATE challenges SET status = 'open'
         WHERE creator_id = ANY($1::int[]) AND status = 'on_hold' AND match_date = $2::date`,
        [involvedTeamIds, match_date]
      );
    }

    await client.query("COMMIT");
    res.json({ challenge: result.rows[0] });
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
});


// DELETE /api/challenges/:id
// Only the exact user who created the challenge can delete it — unlike
// cancel, this is NOT team-wide. Only allowed while nobody has accepted it
// yet; once accepted, the poster (or accepter) should use cancel instead.
const deleteChallenge = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const existing = await pool.query(
    `SELECT creator_id, status FROM challenges WHERE id = $1`,
    [id]
  );
  if (existing.rows.length === 0) return res.status(404).json({ error: "Challenge not found" });
  const { creator_id, status } = existing.rows[0];

  if (creator_id !== req.user.id) {
    return res.status(403).json({ error: "Only the user who posted this challenge can delete it" });
  }
  if (status !== "open" && status !== "on_hold") {
    return res.status(409).json({ error: "This challenge has already been accepted — cancel the match instead of deleting it" });
  }

  await pool.query(`DELETE FROM challenges WHERE id = $1`, [id]);
  res.json({ ok: true, id });
});

module.exports = { listChallenges, createChallenge, deleteChallenge, acceptChallenge, cancelChallenge };