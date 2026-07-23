const pool = require("../config/db");

async function checkTypes() {
  try {
    const result = await pool.query(`
      SELECT table_name, column_name, data_type
      FROM information_schema.columns
      WHERE table_name IN ('users', 'bookings', 'teams', 'grounds')
        AND column_name IN ('id', 'user_id', 'team_id', 'ground_id', 'owner_id')
      ORDER BY table_name, column_name;
    `);
    console.table(result.rows);
  } catch (err) {
    console.error("Failed:", err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

checkTypes();