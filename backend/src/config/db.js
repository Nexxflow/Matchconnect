const { Pool } = require("pg");
require("dotenv").config();

// SSL required for cloud-hosted PostgreSQL (Neon, Supabase, Railway, etc.)
// but must be off for local PostgreSQL running on localhost.
const isLocal = /localhost|127\.0\.0\.1/.test(process.env.DATABASE_URL || "");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isLocal ? false : { rejectUnauthorized: false }
});

pool.on("error", (err) => {
  console.error("Unexpected PG pool error:", err);
});

module.exports = pool;
