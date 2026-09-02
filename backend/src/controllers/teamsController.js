const pool = require("../config/db");
const asyncHandler = require("../utils/asyncHandler");

// Returns the team owned by the logged-in user, or { team: null } if they
// haven't registered one yet. Used by the frontend to default the "team
// name" field and to know whether "include my team" is even possible,
// without the client ever needing to know its own team's UUID.
const getMyTeam = asyncHandler(async (req, res) => {
  if (!req.user?.id) return res.status(401).json({ error: "Not logged in" });

  const uRes = await pool.query(`SELECT id, team_name, team_id FROM users WHERE id = $1`, [req.user.id]);
  const u = uRes.rows[0];

  let team = null;
  if (u?.team_id) {
    const tRes = await pool.query(`SELECT * FROM teams WHERE id = $1`, [u.team_id]);
    team = tRes.rows[0] || null;
  }

  if (!team) {
    const tRes = await pool.query(`SELECT * FROM teams WHERE owner_id = $1 OR created_by = $1`, [req.user.id]);
    team = tRes.rows[0] || null;
  }

  if (!team && u?.team_name?.trim()) {
    const tRes = await pool.query(
      `SELECT * FROM teams WHERE LOWER(TRIM(name)) = LOWER(TRIM($1)) LIMIT 1`,
      [u.team_name.trim()]
    );
    team = tRes.rows[0] || null;
  }

  res.json({ team });
});

module.exports = {
  getMyTeam,
  // ...spread/merge your existing team handlers here if you already have some
};