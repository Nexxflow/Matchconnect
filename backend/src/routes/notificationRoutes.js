const express = require("express");
const router = express.Router();

const notificationController = require("../controllers/notificationController");
const { authRequired } = require("../middleware/auth");

router.post("/test", notificationController.sendTestNotification);
router.post("/save-token", authRequired, notificationController.saveFcmToken);
router.post("/clear-token", authRequired, notificationController.clearFcmToken);
router.get("/", authRequired, notificationController.getNotifications);
router.put("/mark-read", authRequired, notificationController.markNotificationsAsRead);
router.delete("/", authRequired, notificationController.clearAllNotifications);

module.exports = router;