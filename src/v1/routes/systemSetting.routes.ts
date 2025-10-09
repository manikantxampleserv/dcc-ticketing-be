import { Router } from "express";
import { systemSettingController } from "../controllers/systemSetting.controller";

import { authenticateToken } from "../../middlewares/auth";
const router = Router();

router.post(
  "/system-setting",
  authenticateToken,
  systemSettingController.createSystemSetting
);

router.get(
  "/system-setting/:id",
  authenticateToken,
  systemSettingController.getSystemSettingById
);

router.get(
  "/system-setting",
  authenticateToken,
  systemSettingController.getAllSystemSetting
);
router.delete(
  "/system-setting/:id",
  authenticateToken,
  systemSettingController.deleteSystemSetting
);

router.put(
  "/system-setting/:id",
  authenticateToken,
  systemSettingController.updateSystemSetting
);

router.post(
  "/system-setting/upsert",
  authenticateToken,
  systemSettingController.upsertSystemSetting
);

export default router;
