const pool = require("../config/db");
const asyncHandler = require("../utils/asyncHandler");

// GET /api/umpires?available=true
const listUmpires = asyncHandler(async (req, res) => {
  const { available } = req.query;
  const conditions = [];
  const values = [];

  if (available !== undefined) {
    values.push(available === "true");
    conditions.push(`available = $${values.length}`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const result = await pool.query(`SELECT * FROM umpires ${where} ORDER BY experience_years DESC`, values);
  res.json({ umpires: result.rows });
});

// GET /api/umpires/:id
const getUmpire = asyncHandler(async (req, res) => {
  const result = await pool.query("SELECT * FROM umpires WHERE id = $1", [req.params.id]);
  if (result.rows.length === 0) return res.status(404).json({ error: "Umpire not found" });
  res.json({ umpire: result.rows[0] });
});

// POST /api/umpires — admin adds an umpire/scorer
const createUmpire = asyncHandler(async (req, res) => {
  const { name, role, experience_years, price } = req.body;
  if (!name || !role || !price) {
    return res.status(400).json({ error: "name, role and price are required" });
  }
  const result = await pool.query(
    `INSERT INTO umpires (name, role, experience_years, price)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [name, role, experience_years || null, price]
  );
  res.status(201).json({ umpire: result.rows[0] });
});

module.exports = { listUmpires, getUmpire, createUmpire };
