import { Request, Response } from "express";
import pool from "../config/db";

/**
 * GET /api/activities
 * Returns emission activity records in a format compatible with Activities.tsx, with search & filtering
 */
export const getActivities = async (req: Request, res: Response): Promise<void> => {
  try {
    const orgId = req.user?.organizationId;
    if (!orgId) {
      res.status(401).json({ success: false, message: "Organization ID missing." });
      return;
    }

    const { scope, category, facility, status, q } = req.query;

    let query = `
      SELECT r.*, f.facility_name,
        COALESCE(
          json_agg(
            json_build_object(
              'id', a.id,
              'fileName', a.file_name,
              'fileUrl', a.file_url,
              'sizeBytes', a.size_bytes,
              'uploadedAt', a.uploaded_at
            )
          ) FILTER (WHERE a.id IS NOT NULL), '[]'
        ) AS attachments
      FROM emissions_records r
      LEFT JOIN facilities f ON r.facility_id = f.id
      LEFT JOIN activity_attachments a ON r.id = a.record_id
      WHERE r.organization_id = $1
    `;

    const values: any[] = [orgId];
    let paramIndex = 2;

    if (scope && scope !== "all") {
      query += ` AND r.scope = $${paramIndex}`;
      values.push(scope);
      paramIndex++;
    }

    if (category && category !== "all") {
      query += ` AND r.category = $${paramIndex}`;
      values.push(category);
      paramIndex++;
    }

    if (facility && facility !== "all") {
      query += ` AND (f.facility_name = $${paramIndex} OR r.facility_id::text = $${paramIndex})`;
      values.push(facility);
      paramIndex++;
    }

    if (status && status !== "all") {
      query += ` AND r.status = $${paramIndex}`;
      values.push(status);
      paramIndex++;
    }

    if (q && typeof q === "string" && q.trim()) {
      query += ` AND (
        LOWER(r.category) LIKE $${paramIndex} OR
        LOWER(COALESCE(r.notes, '')) LIKE $${paramIndex} OR
        LOWER(COALESCE(r.activity_type, '')) LIKE $${paramIndex} OR
        LOWER(COALESCE(f.facility_name, '')) LIKE $${paramIndex}
      )`;
      values.push(`%${q.toLowerCase().trim()}%`);
      paramIndex++;
    }

    query += ` GROUP BY r.id, f.facility_name ORDER BY r.created_at DESC;`;

    const result = await pool.query(query, values);

    const formatted = result.rows.map((row) => ({
      ...row,
      quantity: parseFloat(row.quantity),
      emissions_t_co2e: parseFloat(row.emissions_t_co2e),
      inputMode: row.input_mode,
      periodStart: row.period_start,
      periodEnd: row.period_end,
      facility: row.facility_name || row.facility_id || null,
    }));

    res.json({
      success: true,
      data: formatted,
    });
  } catch (err: any) {
    console.error("Get Activities Error:", err);
    res.status(500).json({ success: false, message: "Failed to retrieve activity records." });
  }
};

/**
 * GET /api/activities/:id
 * Single activity record
 */
export const getActivityById = async (req: Request, res: Response): Promise<void> => {
  try {
    const orgId = req.user?.organizationId;
    const { id } = req.params;

    const query = `
      SELECT r.*, f.facility_name,
        COALESCE(
          json_agg(
            json_build_object(
              'id', a.id,
              'fileName', a.file_name,
              'fileUrl', a.file_url,
              'sizeBytes', a.size_bytes,
              'uploadedAt', a.uploaded_at
            )
          ) FILTER (WHERE a.id IS NOT NULL), '[]'
        ) AS attachments
      FROM emissions_records r
      LEFT JOIN facilities f ON r.facility_id = f.id
      LEFT JOIN activity_attachments a ON r.id = a.record_id
      WHERE r.id = $1 AND r.organization_id = $2
      GROUP BY r.id, f.facility_name;
    `;

    const result = await pool.query(query, [id, orgId]);

    if (result.rows.length === 0) {
      res.status(404).json({ success: false, message: "Activity record not found." });
      return;
    }

    const row = result.rows[0];
    res.json({
      success: true,
      data: {
        ...row,
        quantity: parseFloat(row.quantity),
        emissions_t_co2e: parseFloat(row.emissions_t_co2e),
        inputMode: row.input_mode,
        periodStart: row.period_start,
        periodEnd: row.period_end,
      },
    });
  } catch (err: any) {
    console.error("Get Activity By ID Error:", err);
    res.status(500).json({ success: false, message: "Error fetching activity detail." });
  }
};
