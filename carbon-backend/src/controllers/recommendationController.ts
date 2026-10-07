import { Request, Response } from "express";
import {
  buildRecommendationPayload,
  ensureSupportingTables,
  parseNumericHeadcount,
} from "../services/recommendationEngine";

// Re-export helpers for backward compatibility / tests
export { parseNumericHeadcount, ensureSupportingTables };

/**
 * GET /api/recommendations
 * Generates organization-scoped recommendations from PostgreSQL emissions data.
 * organizationId ALWAYS comes from JWT (req.user.organizationId).
 */
export const getRecommendations = async (req: Request, res: Response): Promise<void> => {
  try {
    const orgId = req.user?.organizationId;
    if (!orgId) {
      res.status(401).json({
        success: false,
        message: "Organization ID missing from authenticated JWT token.",
      });
      return;
    }

    // Never trust frontend-supplied organization_id
    if (req.query.organization_id || req.body?.organization_id) {
      res.status(400).json({
        success: false,
        message: "organization_id must not be supplied by the client. JWT organization scope is authoritative.",
      });
      return;
    }

    const payload = await buildRecommendationPayload(orgId);
    res.json(payload);
  } catch (err: any) {
    console.error("Get Recommendations Error:", err);
    const status = err.status || 500;
    res.status(status).json({
      success: false,
      message: status === 404 ? err.message : "Failed to generate carbon recommendations.",
    });
  }
};
