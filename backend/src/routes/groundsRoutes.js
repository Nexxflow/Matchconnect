const express = require("express");
const router = express.Router();
const { listGrounds, getGround, getGroundBookings, createGround, updateGround, deleteGround } = require("../controllers/groundsController");
const { authRequired } = require("../middleware/auth");

router.get("/", listGrounds);
router.get("/:id", getGround);
router.get("/:id/bookings", authRequired, getGroundBookings);
router.post("/", authRequired, createGround);
router.put("/:id", authRequired, updateGround);
router.delete("/:id", authRequired, deleteGround);

module.exports = router;
