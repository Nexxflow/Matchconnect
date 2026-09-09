const express = require("express");
const router = express.Router();
const { authRequired, adminRequired } = require("../middleware/auth");
const {
  getAdminStats,
  getAdminUsers,
  createAdminUser,
  updateUserRole
} = require("../controllers/adminController");

// All admin routes strictly require valid auth and admin status
router.use(authRequired);
router.use(adminRequired);

router.get("/stats", getAdminStats);
router.get("/users", getAdminUsers);
router.post("/users", createAdminUser);
router.patch("/users/:id/role", updateUserRole);

module.exports = router;
