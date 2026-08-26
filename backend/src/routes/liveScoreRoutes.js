const express = require("express");
const router = express.Router();
const {
  listMatches,
  createMatch,
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
} = require("../controllers/matchController");
const { authRequired } = require("../middleware/auth");

// Static/specific paths first, so Express doesn't swallow them into "/:matchId/..."
router.get("/live/current", getCurrentLiveMatch);

router.get("/", listMatches);         // GET  /api/matches
router.post("/", createMatch);        // POST /api/matches — public for now, no auth required

router.get("/:matchId/squads", getSquads);
router.post("/:matchId/squads", addSquads);   // add player names to the two teams
router.post("/:matchId/toss", recordToss);    // record toss winner + bat/bowl decision
router.get("/:matchId/live", getLiveScore);
router.get("/:matchId/scoreboard", getScoreboard);

router.post("/:matchId/start-innings", startInnings);
router.post("/:matchId/set-players", setActivePlayers);
router.post("/:matchId/balls", recordBall);
router.post("/:matchId/balls/undo", undoBall);
router.post("/:matchId/select-bowler", selectBowler);
router.post("/:matchId/new-batsman", newBatsman);
router.post("/:matchId/complete", completeMatch);

module.exports = router;

// In app.js / server.js (unchanged):
// app.use("/api/matches", require("./routes/liveScoreRoutes"));