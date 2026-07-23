const pool = require("../config/db");

async function dropBookings() {
  try {
    console.log("Dropping bookings table...");
    await pool.query("DROP TABLE IF EXISTS bookings CASCADE;");
    console.log("✅ bookings table dropped.");
  } catch (err) {
    console.error("❌ Failed:", err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

dropBookings();