// const pool = require("../config/db");
// const asyncHandler = require("../utils/asyncHandler");

// const PUBLIC_USER_COLUMNS =
//   "id, name, email, phone, team_name, village_name, team_year, created_at";

// // GET /api/teams/mine
// // A "team" isn't a row someone owns — it's the group of users who registered
// // with the same team_name + village_name + team_year. This returns everyone
// // who matches the logged-in user's own team details (their "squad").
// const myTeam = asyncHandler(async (req, res) => {
//   const me = await pool.query(
//     "SELECT team_name, village_name, team_year FROM users WHERE id = $1",
//     [req.user.id]
//   );

//   const profile = me.rows[0];
//   if (!profile) return res.status(404).json({ error: "User not found" });

//   const { team_name, village_name, team_year } = profile;

//   // Can't group people until all three identifying fields are filled in.
//   if (!team_name || !village_name || !team_year) {
//     return res.json({
//       team_name: team_name || null,
//       village_name: village_name || null,
//       team_year: team_year || null,
//       members: [],
//       message: "Add your team name, village and year formed in Edit Profile to see your teammates."
//     });
//   }

//   // Case/whitespace-insensitive match, so "Royal Strikers" and " royal strikers"
//   // are treated as the same team.
//   const result = await pool.query(
//     `SELECT ${PUBLIC_USER_COLUMNS}
//      FROM users
//      WHERE LOWER(TRIM(team_name)) = LOWER(TRIM($1))
//        AND LOWER(TRIM(village_name)) = LOWER(TRIM($2))
//        AND team_year = $3
//      ORDER BY created_at ASC`,
//     [team_name, village_name, team_year]
//   );

//   res.json({
//     team_name,
//     village_name,
//     team_year,
//     members: result.rows
//   });
// });

// module.exports = { myTeam };