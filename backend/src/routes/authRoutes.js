const express = require("express");
const router = express.Router();
const { signup, login, me, forgotPassword, resetPassword } = require("../controllers/authController");
const { authRequired } = require("../middleware/auth");

router.post("/signup", signup);
router.post("/login", login);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password/:token", resetPassword);
router.get("/me", authRequired, me);

module.exports = router;
