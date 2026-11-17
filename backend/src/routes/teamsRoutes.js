const express = require("express");
const router = express.Router();
const {
  getMyTeam,
  getTeamDetails,
  addTeamReview,
  deleteTeamReview,
  addTeamReviewReply,
  deleteTeamReviewReply,
} = require("../controllers/teamsController");
const { authRequired } = require("../middleware/auth");

router.get("/mine", authRequired, getMyTeam);
router.get("/details", getTeamDetails);
router.get("/:teamName/details", getTeamDetails);
router.post("/reviews", authRequired, addTeamReview);
router.delete("/reviews/:id", authRequired, deleteTeamReview);
router.post("/reviews/:id/replies", authRequired, addTeamReviewReply);
router.delete("/reviews/:id/replies/:replyId", authRequired, deleteTeamReviewReply);

module.exports = router;