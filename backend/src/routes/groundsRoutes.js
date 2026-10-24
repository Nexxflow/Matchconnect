const express = require("express");
const router = express.Router();
const { listGrounds, getGround, getGroundBookings, createGround, updateGround, deleteGround, backfillGroundLocations } = require("../controllers/groundsController");
const { authRequired, optionalAuth } = require("../middleware/auth");

// Public list/detail. optionalAuth fills req.user when a valid token is sent,
// so logged-in users can see owner phone numbers and anonymous callers cannot.
router.get("/", optionalAuth, listGrounds);
router.get("/:id", optionalAuth, getGround);
router.get("/:id/bookings", authRequired, getGroundBookings);
router.post("/", authRequired, createGround);
router.post("/backfill-locations", authRequired, backfillGroundLocations);
router.put("/:id", authRequired, updateGround);
router.delete("/:id", authRequired, deleteGround);

module.exports = router;