const pool = require("../config/db");
const asyncHandler = require("../utils/asyncHandler");

const PUBLIC_USER_COLUMNS =
  "id, name, email, phone, team_id, team_name, village_name, team_year, created_at";

// GET /api/users/teammates
// Groups the logged-in user with other users who share the same team_name
// (+ village_name + team_year if provided).
const teammates = asyncHandler(async (req, res) => {
  const me = await pool.query(
    "SELECT id, team_id, team_name, village_name, team_year FROM users WHERE id = $1",
    [req.user.id]
  );

  const profile = me.rows[0];
  if (!profile) return res.status(404).json({ error: "User not found" });

  const { team_name, village_name, team_year, team_id } = profile;

  if (!team_name || !team_name.trim()) {
    return res.json({ team: null, members: [] });
  }

  let result;
  if (village_name && team_year) {
    result = await pool.query(
      `SELECT ${PUBLIC_USER_COLUMNS}
       FROM users
       WHERE LOWER(TRIM(team_name)) = LOWER(TRIM($1))
         AND LOWER(TRIM(village_name)) = LOWER(TRIM($2))
         AND team_year = $3
       ORDER BY created_at ASC`,
      [team_name, village_name, team_year]
    );
  } else {
    result = await pool.query(
      `SELECT ${PUBLIC_USER_COLUMNS}
       FROM users
       WHERE LOWER(TRIM(team_name)) = LOWER(TRIM($1))
       ORDER BY created_at ASC`,
      [team_name]
    );
  }

  res.json({
    team: { team_name, village_name: village_name || null, team_year: team_year || null, team_id: team_id || null },
    members: result.rows.length > 0 ? result.rows : [profile]
  });
});

module.exports = { teammates };