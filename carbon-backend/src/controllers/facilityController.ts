import { Request, Response } from "express";
import pool from "../config/db";

/**
 * GET /api/facilities
 * Get facilities for authenticated user's organization
 */
export const getFacilities = async (req: Request, res: Response): Promise<void> => {
  try {
    const orgId = req.user?.organizationId;
    if (!orgId) {
      res.status(401).json({ success: false, message: "Organization ID missing." });
      return;
    }

    const result = await pool.query(
      "SELECT id, facility_name, location FROM facilities WHERE organization_id = $1 ORDER BY facility_name ASC",
      [orgId]
    );

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (err: any) {
    console.error("Get Facilities Error:", err);
    res.status(500).json({ success: false, message: "Failed to fetch facilities." });
  }
};

/**
 * POST /api/facilities
 * Create a new facility under authenticated user's organization
 */
export const createFacility = async (req: Request, res: Response): Promise<void> => {
  try {
    const orgId = req.user?.organizationId;
    if (!orgId) {
      res.status(401).json({ success: false, message: "Organization ID missing." });
      return;
    }

    const { facility_name, location } = req.body;
    if (!facility_name || !facility_name.trim()) {
      res.status(400).json({ success: false, message: "facility_name is required." });
      return;
    }

    const result = await pool.query(
      "INSERT INTO facilities (organization_id, facility_name, location) VALUES ($1, $2, $3) RETURNING *",
      [orgId, facility_name.trim(), location ? location.trim() : null]
    );

    res.status(201).json({
      success: true,
      data: result.rows[0],
    });
  } catch (err: any) {
    console.error("Create Facility Error:", err);
    res.status(500).json({ success: false, message: "Failed to create facility." });
  }
};
