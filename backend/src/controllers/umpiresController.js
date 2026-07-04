const pool = require("../config/db");
const asyncHandler = require("../utils/asyncHandler");

const MOBILE_RE = /^[0-9]{10,15}$/;
const VALID_ROLES = ["Umpire", "Scorer", "Umpire + Scorer"];

// GET /api/umpires
const listUmpires = asyncHandler(async (req, res) => {
  const result = await pool.query(`
    SELECT *
    FROM umpires
    ORDER BY created_at DESC
  `);
  res.json({
    umpires: result.rows,
  });
});

// GET /api/umpires/:id
const getUmpire = asyncHandler(async (req, res) => {
  const result = await pool.query(
    "SELECT * FROM umpires WHERE id=$1",
    [req.params.id]
  );
  if (result.rows.length === 0) {
    return res.status(404).json({
      error: "Umpire not found",
    });
  }
  res.json({
    umpire: result.rows[0],
  });
});

// POST /api/umpires
const createUmpire = asyncHandler(async (req, res) => {
  const {
    name,
    mobile,
    role,
    experience,
    fee_per_match,
  } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({
      error: "Name is required",
    });
  }
  if (!mobile || !MOBILE_RE.test(String(mobile).trim())) {
    return res.status(400).json({
      error: "Valid mobile number is required",
    });
  }
  const resolvedRole = role && VALID_ROLES.includes(role) ? role : "Umpire";
  if (Number(fee_per_match) <= 0) {
    return res.status(400).json({
      error: "Fee per match must be greater than 0",
    });
  }

  const result = await pool.query(
    `
    INSERT INTO umpires
    (
      name,
      mobile,
      role,
      experience,
      fee_per_match
    )
    VALUES
    (
      $1,$2,$3,$4,$5
    )
    RETURNING *
    `,
    [
      name.trim(),
      String(mobile).trim(),
      resolvedRole,
      Number(experience || 0),
      Number(fee_per_match),
    ]
  );
  res.status(201).json({
    umpire: result.rows[0],
  });
});

module.exports = {
  listUmpires,
  getUmpire,
  createUmpire,
};