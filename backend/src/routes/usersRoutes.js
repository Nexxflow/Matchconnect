const express = require("express");
const router = express.Router();
const { teammates } = require("../controllers/usersController");
const { authRequired } = require("../middleware/auth");

router.get("/teammates", authRequired, teammates);

module.exports = router;