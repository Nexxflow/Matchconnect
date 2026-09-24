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
  acceptTournamentRegistration,
  rejectTournamentRegistration,
  addConfirmedTeam,
  removeConfirmedTeam,
  myTournaments,
  getTournamentMatches,
  createTournamentMatch,
  updateTournamentMatch,
  deleteTournamentMatch,
} = require("../controllers/tournamentsController");
const { authRequired, optionalAuth } = require("../middleware/auth");

router.get("/", optionalAuth, listTournaments);
router.get("/mine/:team_id", myTournaments);
router.get("/:id", optionalAuth, getTournament);
router.post("/", authRequired, createTournament);
router.put("/:id", authRequired, updateTournament);
router.delete("/:id", authRequired, deleteTournament);
router.post("/:id/register", authRequired, registerTeam);
router.post("/:id/unregister", authRequired, unregisterTeam);

// Tournament registration requests approval by creator
router.post("/:id/registrations/:registrationId/accept", authRequired, acceptTournamentRegistration);
router.post("/:id/registrations/:registrationId/reject", authRequired, rejectTournamentRegistration);

// Custom confirmed team management by tournament creator
router.post("/:id/teams", authRequired, addConfirmedTeam);
router.delete("/:id/teams/:teamId", authRequired, removeConfirmedTeam);

// Tournament match details and management
router.get("/:id/matches", optionalAuth, getTournamentMatches);
router.post("/:id/matches", authRequired, createTournamentMatch);
router.put("/:id/matches/:matchId", authRequired, updateTournamentMatch);
router.delete("/:id/matches/:matchId", authRequired, deleteTournamentMatch);

module.exports = router;