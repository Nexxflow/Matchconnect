const express = require("express");
const router = express.Router();
const {
  listUmpires,
  getUmpire,
  createUmpire,
  updateUmpire,
  deleteUmpire,
  getUmpireReviews,
  addUmpireReview,
  deleteUmpireReview
} = require("../controllers/umpiresController");
const { authRequired, optionalAuth } = require("../middleware/auth");

router.get("/", listUmpires);
router.get("/:id", getUmpire);
router.get("/:id/reviews", optionalAuth, getUmpireReviews);
router.post("/:id/reviews", authRequired, addUmpireReview);
router.delete("/:id/reviews/:reviewId", authRequired, deleteUmpireReview);
router.post("/", authRequired, createUmpire);
router.put("/:id", authRequired, updateUmpire);
router.delete("/:id", authRequired, deleteUmpire);

module.exports = router;
