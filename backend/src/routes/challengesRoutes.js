const express = require("express");
const router = express.Router();
const { listChallenges, createChallenge, acceptChallenge, cancelChallenge } = require("../controllers/challengesController");
const { listMessages, sendMessage } = require("../controllers/messagesController");
const { authRequired } = require("../middleware/auth");

router.get("/", listChallenges);
router.post("/", authRequired, createChallenge);
router.post("/:id/accept", authRequired, acceptChallenge);
router.post("/:id/cancel", authRequired, cancelChallenge);
router.get("/:id/messages", authRequired, listMessages);
router.post("/:id/messages", authRequired, sendMessage);

module.exports = router;