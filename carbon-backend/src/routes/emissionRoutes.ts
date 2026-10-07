import { Router } from "express";
import {
  createEmissionRecord,
  getAllEmissionsRecords,
  getEmissionRecordById,
  updateEmissionRecord,
  deleteEmissionRecord,
} from "../controllers/emissionController";
import { authenticateJWT } from "../middleware/authMiddleware";

const router = Router();

// Protect all emission routes with JWT authentication
router.use(authenticateJWT);

router.post("/", createEmissionRecord);
router.get("/", getAllEmissionsRecords);
router.get("/:id", getEmissionRecordById);
router.put("/:id", updateEmissionRecord);
router.delete("/:id", deleteEmissionRecord);

export default router;
