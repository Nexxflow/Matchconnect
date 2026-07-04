const express = require("express");
const router = express.Router();
const { listGrounds, getGround, createGround } = require("../controllers/groundsController");
const { authRequired } = require("../middleware/auth");

router.get("/", listGrounds);
router.get("/:id", getGround);
router.post("/", authRequired, createGround);

module.exports = router;
