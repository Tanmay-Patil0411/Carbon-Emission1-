import { Router } from "express";
import { generatePdfReport } from "../controllers/reportController";
import { authenticateJWT } from "../middleware/authMiddleware";

const router = Router();

// GET /api/reports/pdf - Generate & Download Server-Side Text-Based PDF Report
router.get("/pdf", authenticateJWT, generatePdfReport);

// GET /api/reports/download - Alias Endpoint for PDF Download
router.get("/download", authenticateJWT, generatePdfReport);

export default router;
