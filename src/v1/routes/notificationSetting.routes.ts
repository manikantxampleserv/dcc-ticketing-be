import { Router } from "express";
import { notificationSettingController } from "../controllers/notificationSetting.controller";

import { authenticateToken } from "../../middlewares/auth";
const router = Router();

router.post(
  "/notification-setting",
  authenticateToken,
  notificationSettingController.createNotificationSetting
);

router.get(
  "/notification-setting/:id",
  authenticateToken,
  notificationSettingController.getNotificationSettingById
);

router.get(
  "/notification-setting",
  authenticateToken,
  notificationSettingController.getAllNotificationSetting
);
router.delete(
  "/notification-setting/:id",
  authenticateToken,
  notificationSettingController.deleteNotificationSetting
);

router.put(
  "/notification-setting/:id",
  authenticateToken,
  notificationSettingController.updateNotificationSetting
);

router.post(
  "/notification-setting/upsert",
  authenticateToken,
  notificationSettingController.upsertNotificationSetting
);

export default router;
