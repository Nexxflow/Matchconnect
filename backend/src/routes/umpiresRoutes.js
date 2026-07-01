const express = require("express");
const router = express.Router();
const { listUmpires, getUmpire, createUmpire } = require("../controllers/umpiresController");
const { authRequired } = require("../middleware/auth");

router.get("/", listUmpires);
router.get("/:id", getUmpire);
router.post("/", authRequired, createUmpire);

module.exports = router;
