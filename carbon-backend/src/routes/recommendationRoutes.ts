import { Router } from "express";
import { getRecommendations } from "../controllers/recommendationController";
import { authenticateJWT } from "../middleware/authMiddleware";

const router = Router();

// All recommendation routes require JWT; organization scope comes from token only
router.use(authenticateJWT);

router.get("/", getRecommendations);

export default router;
