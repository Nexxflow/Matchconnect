const express = require("express");
const router = express.Router();
const { createOrder, verifyPayment, myBookings } = require("../controllers/bookingsController");
const { authRequired } = require("../middleware/auth");

router.post("/create-order", authRequired, createOrder);
router.post("/verify-payment", authRequired, verifyPayment);
router.get("/mine", authRequired, myBookings);

module.exports = router;
