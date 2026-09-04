const express = require("express");
const router = express.Router();
const {
  listTournaments,
  getTournament,
  createTournament,
  updateTournament,
  deleteTournament,
  registerTeam,
  unregisterTeam,
  myTournaments,
  getTournamentMatches,
  createTournamentMatch,
  updateTournamentMatch,
  deleteTournamentMatch,
} = require("../controllers/tournamentsController");
const { authRequired, optionalAuth } = require("../middleware/auth");

router.get("/", listTournaments);
router.get("/mine/:team_id", myTournaments);
router.get("/:id", getTournament);
router.post("/", authRequired, createTournament);
router.put("/:id", authRequired, updateTournament);
router.delete("/:id", authRequired, deleteTournament);
router.post("/:id/register", authRequired, registerTeam);
router.post("/:id/unregister", authRequired, unregisterTeam);

// Tournament match details and management
router.get("/:id/matches", optionalAuth, getTournamentMatches);
router.post("/:id/matches", authRequired, createTournamentMatch);
router.put("/:id/matches/:matchId", authRequired, updateTournamentMatch);
router.delete("/:id/matches/:matchId", authRequired, deleteTournamentMatch);

module.exports = router;