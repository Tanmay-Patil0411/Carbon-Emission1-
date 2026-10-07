import { Router } from "express";
import { getActivities, getActivityById } from "../controllers/activityController";
import { authenticateJWT } from "../middleware/authMiddleware";

const router = Router();

router.use(authenticateJWT);

router.get("/", getActivities);
router.get("/:id", getActivityById);

export default router;
