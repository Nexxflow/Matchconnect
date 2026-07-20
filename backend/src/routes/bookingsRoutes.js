const express = require("express");
const router = express.Router();
const { createOrder, verifyPayment, myBookings, cancelBooking } = require("../controllers/bookingsController");
const { authRequired } = require("../middleware/auth");

router.post("/create-order", authRequired, createOrder);
router.post("/verify-payment", authRequired, verifyPayment);
router.get("/mine", authRequired, myBookings);
router.delete("/:id", authRequired, cancelBooking);

module.exports = router;
