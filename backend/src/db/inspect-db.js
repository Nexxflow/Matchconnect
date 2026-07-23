const pool = require("../config/db");

async function inspect() {
  try {
    console.log("=== All columns referencing users or named *_id ===");
    const cols = await pool.query(`
      SELECT table_name, column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND (column_name ILIKE '%user_id%' OR column_name = 'id' OR column_name ILIKE '%owner_id%' OR column_name ILIKE '%posted_by%')
      ORDER BY table_name, column_name;
    `);
    console.table(cols.rows);

    console.log("\n=== Existing tables ===");
    const tables = await pool.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' ORDER BY table_name;
    `);
    console.table(tables.rows);

    console.log("\n=== Row counts ===");
    for (const t of tables.rows) {
      try {
        const c = await pool.query(`SELECT COUNT(*)::int AS count FROM "${t.table_name}"`);
        console.log(`${t.table_name}: ${c.rows[0].count}`);
      } catch (e) {
        console.log(`${t.table_name}: error - ${e.message}`);
      }
    }

    console.log("\n=== Foreign key constraints ===");
    const fks = await pool.query(`
      SELECT tc.table_name, kcu.column_name, ccu.table_name AS foreign_table, ccu.column_name AS foreign_column
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema='public'
      ORDER BY tc.table_name;
    `);
    console.table(fks.rows);
  } catch (err) {
    console.error("Failed:", err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

inspect();
