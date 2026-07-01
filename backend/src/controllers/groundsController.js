const pool = require("../config/db");
const asyncHandler = require("../utils/asyncHandler");

// GET /api/grounds?rating=4.5&area=Bandra
const listGrounds = asyncHandler(async (req, res) => {
  const { rating, area } = req.query;
  const conditions = [];
  const values = [];

  if (rating) {
    values.push(Number(rating));
    conditions.push(`rating >= $${values.length}`);
  }
  if (area) {
    values.push(`%${area}%`);
    conditions.push(`area ILIKE $${values.length}`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const result = await pool.query(
    `SELECT * FROM grounds ${where} ORDER BY rating DESC`,
    values
  );
  res.json({ grounds: result.rows });
});

// GET /api/grounds/:id
const getGround = asyncHandler(async (req, res) => {
  const result = await pool.query("SELECT * FROM grounds WHERE id = $1", [req.params.id]);
  if (result.rows.length === 0) return res.status(404).json({ error: "Ground not found" });
  res.json({ ground: result.rows[0] });
});

// POST /api/grounds — admin/owner adds a ground
const createGround = asyncHandler(async (req, res) => {
  const { name, area, price_per_hour, rating, amenities, tags } = req.body;
  if (!name || !price_per_hour) {
    return res.status(400).json({ error: "name and price_per_hour are required" });
  }
  const result = await pool.query(
    `INSERT INTO grounds (name, area, price_per_hour, rating, amenities, tags)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [name, area || null, price_per_hour, rating || 0, JSON.stringify(amenities || []), JSON.stringify(tags || [])]
  );
  res.status(201).json({ ground: result.rows[0] });
});

module.exports = { listGrounds, getGround, createGround };
