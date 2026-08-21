const pool = require("../config/db");

async function clearTournaments() {
  try {
    console.log("Clearing tournaments and tournament registrations...");
    await pool.query("TRUNCATE TABLE tournament_registrations, tournaments CASCADE;");
    console.log("✅ Tournaments table cleared successfully.");
  } catch (err) {
    console.error("❌ Failed to clear tournaments:", err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

clearTournaments();
