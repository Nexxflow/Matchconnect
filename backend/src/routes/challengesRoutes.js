const express = require("express");
const router = express.Router();
const {
  listChallenges,
  createChallenge,
  updateChallenge,
  deleteChallenge,
  acceptChallenge,
  cancelChallenge,
  requestChallenge,
  getChallengeRequests,
  acceptChallengeRequest,
  rejectChallengeRequest,
  cancelChallengeRequest,
} = require("../controllers/challengesController");
const { listMessages, sendMessage } = require("../controllers/messagesController");
const { authRequired, optionalAuth } = require("../middleware/auth");

router.get("/", optionalAuth, listChallenges);
router.post("/", authRequired, createChallenge);
router.put("/:id", authRequired, updateChallenge);
router.post("/:id/request", authRequired, requestChallenge);
router.get("/:id/requests", authRequired, getChallengeRequests);
router.post("/:id/requests/:requestId/accept", authRequired, acceptChallengeRequest);
router.post("/:id/requests/:requestId/reject", authRequired, rejectChallengeRequest);
router.post("/:id/requests/cancel", authRequired, cancelChallengeRequest);
router.post("/:id/accept", authRequired, requestChallenge);
router.post("/:id/cancel", authRequired, cancelChallenge);
router.get("/:id/messages", authRequired, listMessages);
router.post("/:id/messages", authRequired, sendMessage);
router.delete("/:id", authRequired, deleteChallenge);

module.exports = router;