const pool = require("../config/db");
const asyncHandler = require("../utils/asyncHandler");

// Returns the team owned by the logged-in user, or { team: null } if they
// haven't registered one yet. Used by the frontend to default the "team
// name" field and to know whether "include my team" is even possible,
// without the client ever needing to know its own team's UUID.
const getMyTeam = asyncHandler(async (req, res) => {
  if (!req.user?.id) return res.status(401).json({ error: "Not logged in" });

  const { rows } = await pool.query(`SELECT * FROM teams WHERE owner_id = $1`, [req.user.id]);
  res.json({ team: rows[0] || null });
});

module.exports = {
  getMyTeam,
  // ...spread/merge your existing team handlers here if you already have some
};