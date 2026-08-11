const express = require("express");
const router = express.Router();
const { getMyTeam } = require("../controllers/teamsController");
const { authRequired } = require("../middleware/auth");

router.get("/mine", authRequired, getMyTeam);

// ...mount your existing team routes here too if this file doesn't already exist elsewhere

module.exports = router;