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

const checkUmpireOwnership = (umpire, user) => {
  if (!user) return false;
  const userId = user.id ? String(user.id) : null;
  if (umpire.created_by && userId && String(umpire.created_by) === userId) return true;
  if (umpire.user_id && userId && String(umpire.user_id) === userId) return true;

  const clean = (p) => (p ? String(p).replace(/\D/g, "") : "");
  const userPhone = clean(user.phone);
  const umpirePhone = clean(umpire.mobile);
  if (userPhone && umpirePhone && userPhone === umpirePhone) return true;

  return false;
};

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

  const userId = req.user?.id || null;

  const result = await pool.query(
    `
    INSERT INTO umpires
    (
      name,
      mobile,
      role,
      experience,
      fee_per_match,
      created_by,
      user_id
    )
    VALUES
    (
      $1,$2,$3,$4,$5,$6,$7
    )
    RETURNING *
    `,
    [
      name.trim(),
      String(mobile).trim(),
      resolvedRole,
      Number(experience || 0),
      Number(fee_per_match),
      userId,
      userId,
    ]
  );
  res.status(201).json({
    umpire: result.rows[0],
  });
});

// PUT /api/umpires/:id
const updateUmpire = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {
    name,
    mobile,
    role,
    experience,
    fee_per_match,
  } = req.body;

  const existing = await pool.query("SELECT * FROM umpires WHERE id=$1", [id]);
  if (existing.rows.length === 0) {
    return res.status(404).json({ error: "Umpire not found" });
  }

  const umpire = existing.rows[0];
  if (!checkUmpireOwnership(umpire, req.user)) {
    return res.status(403).json({
      error: "Forbidden: Only the user who registered this umpire can edit it.",
    });
  }

  if (!name || !name.trim()) {
    return res.status(400).json({ error: "Name is required" });
  }
  if (!mobile || !MOBILE_RE.test(String(mobile).trim())) {
    return res.status(400).json({ error: "Valid mobile number is required" });
  }
  const resolvedRole = role && VALID_ROLES.includes(role) ? role : "Umpire";
  if (Number(fee_per_match) <= 0) {
    return res.status(400).json({ error: "Fee per match must be greater than 0" });
  }

  const result = await pool.query(
    `
    UPDATE umpires
    SET name = $1,
        mobile = $2,
        role = $3,
        experience = $4,
        fee_per_match = $5
    WHERE id = $6
    RETURNING *
    `,
    [
      name.trim(),
      String(mobile).trim(),
      resolvedRole,
      Number(experience || 0),
      Number(fee_per_match),
      id,
    ]
  );
  res.json({ umpire: result.rows[0] });
});

// DELETE /api/umpires/:id
const deleteUmpire = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const existing = await pool.query("SELECT * FROM umpires WHERE id=$1", [id]);
  if (existing.rows.length === 0) {
    return res.status(404).json({ error: "Umpire not found" });
  }

  const umpire = existing.rows[0];
  if (!checkUmpireOwnership(umpire, req.user)) {
    return res.status(403).json({
      error: "Forbidden: Only the user who registered this umpire can delete it.",
    });
  }

  await pool.query("DELETE FROM umpires WHERE id=$1", [id]);
  res.json({ ok: true });
});

module.exports = {
  listUmpires,
  getUmpire,
  createUmpire,
  updateUmpire,
  deleteUmpire,
};