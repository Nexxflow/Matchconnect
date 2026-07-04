const express = require("express");
const router = express.Router();
const { createTeam, myTeams, getTeam, addPlayer } = require("../controllers/teamsController");
const { authRequired } = require("../middleware/auth");

router.post("/", authRequired, createTeam);
router.get("/mine", authRequired, myTeams);
router.get("/:id", getTeam);
router.post("/:id/players", authRequired, addPlayer);

module.exports = router;
