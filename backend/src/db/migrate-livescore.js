const fs = require("fs");
const path = require("path");
const pool = require("../config/db");

async function migrateLiveScore() {
  const schemaPath = path.join(__dirname, "livescore_schema.sql");
  const sql = fs.readFileSync(schemaPath, "utf8");
  try {
    console.log("Running Live Score migration...");
    await pool.query(sql);
    console.log("✅ Live Score migration complete — all scoring tables created successfully.");
  } catch (err) {
    console.error("❌ Live Score migration failed:", err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

migrateLiveScore();
