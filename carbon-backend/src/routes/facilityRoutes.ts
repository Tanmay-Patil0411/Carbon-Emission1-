import { Router } from "express";
import { getFacilities, createFacility } from "../controllers/facilityController";
import { authenticateJWT } from "../middleware/authMiddleware";

const router = Router();

router.use(authenticateJWT);

router.get("/", getFacilities);
router.post("/", createFacility);

export default router;
