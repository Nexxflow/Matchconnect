const express = require("express");
const router = express.Router();
const {
  listTournaments,
  getTournament,
  createTournament,
  updateTournament,
  deleteTournament,
  registerTeam,
  myTournaments,
} = require("../controllers/tournamentsController");
const { authRequired } = require("../middleware/auth");

router.get("/", listTournaments);
router.get("/:id", getTournament);
router.post("/", authRequired, createTournament);
router.put("/:id", authRequired, updateTournament);
router.delete("/:id", authRequired, deleteTournament);
router.post("/:id/register", authRequired, registerTeam);
router.get("/mine/:team_id", myTournaments);

module.exports = router;