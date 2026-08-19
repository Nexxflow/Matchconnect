const express = require("express");
const router = express.Router();
const { listUmpires, getUmpire, createUmpire, updateUmpire, deleteUmpire } = require("../controllers/umpiresController");
const { authRequired } = require("../middleware/auth");

router.get("/", listUmpires);
router.get("/:id", getUmpire);
router.post("/", authRequired, createUmpire);
router.put("/:id", authRequired, updateUmpire);
router.delete("/:id", authRequired, deleteUmpire);

module.exports = router;
