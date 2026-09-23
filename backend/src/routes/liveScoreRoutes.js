const express = require("express");
const router = express.Router();
const {
  listMatches,
  createMatch,
  updateMatch,
  deleteMatch,
  addSquads,
  recordToss,
  getSquads,
  startInnings,
  recordBall,
  undoBall,
  selectBowler,
  newBatsman,
  completeMatch,
  getScoreboard,
  getLiveScore,
  getCurrentLiveMatch,
  setActivePlayers,
  updatePlayerName,
  endInnings,
} = require("../controllers/matchController");
const { authRequired, optionalAuth } = require("../middleware/auth");

// Static/specific paths first, so Express doesn't swallow them into "/:matchId/..."
router.get("/live/current", getCurrentLiveMatch);

router.get("/", optionalAuth, listMatches);         // GET  /api/matches
router.post("/", optionalAuth, createMatch);        // POST /api/matches — attaches user if logged in
router.put("/:matchId", optionalAuth, updateMatch);
router.post("/:matchId/update", optionalAuth, updateMatch);
router.delete("/:matchId", optionalAuth, deleteMatch);

router.get("/:matchId/squads", optionalAuth, getSquads);
router.post("/:matchId/squads", optionalAuth, addSquads);   // add player names to the two teams
router.post("/:matchId/toss", optionalAuth, recordToss);    // record toss winner + bat/bowl decision
router.get("/:matchId/live", optionalAuth, getLiveScore);
router.get("/:matchId/scoreboard", optionalAuth, getScoreboard);

router.post("/:matchId/start-innings", optionalAuth, startInnings);
router.post("/:matchId/set-players", optionalAuth, setActivePlayers);
router.post("/:matchId/balls", optionalAuth, recordBall);
router.post("/:matchId/balls/undo", optionalAuth, undoBall);
router.post("/:matchId/select-bowler", optionalAuth, selectBowler);
router.post("/:matchId/new-batsman", optionalAuth, newBatsman);
router.post("/:matchId/complete", optionalAuth, completeMatch);
router.post("/:matchId/end-innings", optionalAuth, endInnings);
router.post("/:matchId/players/:playerId/update-name", optionalAuth, updatePlayerName);

module.exports = router;

// In app.js / server.js (unchanged):
// app.use("/api/matches", require("./routes/liveScoreRoutes"));