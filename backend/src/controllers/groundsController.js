const pool = require("../config/db");
const asyncHandler = require("../utils/asyncHandler");
const MOBILE_RE = /^[0-9]{10,15}$/;

// GET /api/grounds?address=Bandra
const listGrounds = asyncHandler(async (req, res) => {
  const { address } = req.query;
  const conditions = [];
  const values = [];
  if (address) {
    values.push(`%${address}%`);
    conditions.push(`address ILIKE $${values.length}`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const result = await pool.query(
    `SELECT * FROM grounds ${where} ORDER BY created_at DESC`,
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

// POST /api/grounds — add a ground
const createGround = asyncHandler(async (req, res) => {
  const { name, address, contact_no, price, area } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: "Ground name is required" });
  }
  if (!address || !address.trim()) {
    return res.status(400).json({ error: "Address is required" });
  }
  if (!contact_no || !MOBILE_RE.test(String(contact_no).trim())) {
    return res.status(400).json({ error: "Valid contact number is required" });
  }
  if (!price || Number(price) <= 0) {
    return res.status(400).json({ error: "Price must be greater than 0" });
  }

  // area isn't collected as a separate field on the form yet —
  // fall back to address so the NOT NULL constraint is always satisfied
  const resolvedArea = (area && area.trim()) || address.trim();

  const result = await pool.query(
    `INSERT INTO grounds (name, address, contact_no, price, area)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [name.trim(), address.trim(), String(contact_no).trim(), Number(price), resolvedArea]
  );
  res.status(201).json({ ground: result.rows[0] });
});

module.exports = { listGrounds, getGround, createGround };