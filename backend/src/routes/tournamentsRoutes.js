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
} = require("../controllers/tournamentsController");
const { authRequired } = require("../middleware/auth");

router.get("/", listTournaments);
router.get("/mine/:team_id", myTournaments);
router.get("/:id", getTournament);
router.post("/", authRequired, createTournament);
router.put("/:id", authRequired, updateTournament);
router.delete("/:id", authRequired, deleteTournament);
router.post("/:id/register", authRequired, registerTeam);
router.post("/:id/unregister", authRequired, unregisterTeam);

module.exports = router;