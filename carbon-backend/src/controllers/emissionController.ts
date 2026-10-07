import { Request, Response } from "express";
import pool from "../config/db";
import { generateRecordId } from "../utils/generateId";

/**
 * POST /api/emissions
 * Create a new emission activity record
 */
export const createEmissionRecord = async (req: Request, res: Response): Promise<void> => {
  try {
    const orgId = req.user?.organizationId;
    if (!orgId) {
      res.status(401).json({ success: false, message: "Organization ID missing from token." });
      return;
    }

    const {
      scope,
      category,
      activity_type,
      equipment_type,
      quantity,
      unit,
      input_mode,
      currency,
      period_start,
      period_end,
      emissions_t_co2e,
      emission_factor_info,
      status,
      notes,
      facility_id,
      attachments,
    } = req.body;

    if (!scope || !category || quantity === undefined || !unit || !input_mode || !period_start || !period_end || emissions_t_co2e === undefined) {
      res.status(400).json({
        success: false,
        message: "Missing required fields: scope, category, quantity, unit, input_mode, period_start, period_end, emissions_t_co2e.",
      });
      return;
    }

    const recordId = generateRecordId("rec");

    // Insert into PostgreSQL
    const query = `
      INSERT INTO emissions_records (
        id, organization_id, facility_id, scope, category, activity_type, equipment_type,
        quantity, unit, input_mode, currency, period_start, period_end,
        emissions_t_co2e, emission_factor_info, status, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      RETURNING *;
    `;

    const values = [
      recordId,
      orgId,
      facility_id || null,
      scope,
      category,
      activity_type || null,
      equipment_type || null,
      quantity,
      unit,
      input_mode,
      currency || null,
      period_start,
      period_end,
      emissions_t_co2e,
      emission_factor_info || null,
      status || "pending",
      notes || null,
    ];

    const result = await pool.query(query, values);
    const newRecord = result.rows[0];

    // Insert attachments if provided
    let savedAttachments: any[] = [];
    if (Array.isArray(attachments) && attachments.length > 0) {
      for (const att of attachments) {
        const attId = att.id || generateRecordId("att");
        const attQuery = `
          INSERT INTO activity_attachments (id, record_id, file_name, file_url, size_bytes)
          VALUES ($1, $2, $3, $4, $5) RETURNING *;
        `;
        const attRes = await pool.query(attQuery, [
          attId,
          recordId,
          att.fileName || att.file_name || "Evidence.pdf",
          att.fileUrl || att.file_url || "#",
          att.sizeBytes || att.size_bytes || 1024,
        ]);
        savedAttachments.push(attRes.rows[0]);
      }
    }

    res.status(201).json({
      success: true,
      message: "Emission record created successfully.",
      data: {
        ...newRecord,
        attachments: savedAttachments,
      },
    });
  } catch (err: any) {
    console.error("Create Emission Record Error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to create emission record in database.",
    });
  }
};

/**
 * GET /api/emissions
 * Fetch all emission records for the authenticated organization
 */
export const getAllEmissionsRecords = async (req: Request, res: Response): Promise<void> => {
  try {
    const orgId = req.user?.organizationId;
    if (!orgId) {
      res.status(401).json({ success: false, message: "Organization ID missing." });
      return;
    }

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
      WHERE r.organization_id = $1
      GROUP BY r.id, f.facility_name
      ORDER BY r.created_at DESC;
    `;

    const result = await pool.query(query, [orgId]);

    const formattedRecords = result.rows.map((row) => ({
      ...row,
      quantity: parseFloat(row.quantity),
      emissions_t_co2e: parseFloat(row.emissions_t_co2e),
      inputMode: row.input_mode,
      periodStart: row.period_start,
      periodEnd: row.period_end,
      facility: row.facility_name || row.facility_id || null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    res.json({
      success: true,
      data: formattedRecords,
    });
  } catch (err: any) {
    console.error("Get All Emission Records Error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch emission records.",
    });
  }
};

/**
 * GET /api/emissions/:id
 * Fetch a single emission record by ID
 */
export const getEmissionRecordById = async (req: Request, res: Response): Promise<void> => {
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
      res.status(404).json({ success: false, message: "Emission record not found." });
      return;
    }

    const row = result.rows[0];
    const record = {
      ...row,
      quantity: parseFloat(row.quantity),
      emissions_t_co2e: parseFloat(row.emissions_t_co2e),
      inputMode: row.input_mode,
      periodStart: row.period_start,
      periodEnd: row.period_end,
    };

    res.json({ success: true, data: record });
  } catch (err: any) {
    console.error("Get Emission Record By Id Error:", err);
    res.status(500).json({ success: false, message: "Error retrieving emission record." });
  }
};

/**
 * PUT /api/emissions/:id
 * Update an existing emission record
 */
export const updateEmissionRecord = async (req: Request, res: Response): Promise<void> => {
  try {
    const orgId = req.user?.organizationId;
    const { id } = req.params;

    const {
      scope,
      category,
      activity_type,
      equipment_type,
      quantity,
      unit,
      input_mode,
      currency,
      period_start,
      period_end,
      emissions_t_co2e,
      emission_factor_info,
      status,
      notes,
      facility_id,
    } = req.body;

    const query = `
      UPDATE emissions_records SET
        scope = COALESCE($1, scope),
        category = COALESCE($2, category),
        activity_type = COALESCE($3, activity_type),
        equipment_type = COALESCE($4, equipment_type),
        quantity = COALESCE($5, quantity),
        unit = COALESCE($6, unit),
        input_mode = COALESCE($7, input_mode),
        currency = COALESCE($8, currency),
        period_start = COALESCE($9, period_start),
        period_end = COALESCE($10, period_end),
        emissions_t_co2e = COALESCE($11, emissions_t_co2e),
        emission_factor_info = COALESCE($12, emission_factor_info),
        status = COALESCE($13, status),
        notes = COALESCE($14, notes),
        facility_id = COALESCE($15, facility_id),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $16 AND organization_id = $17
      RETURNING *;
    `;

    const values = [
      scope,
      category,
      activity_type,
      equipment_type,
      quantity,
      unit,
      input_mode,
      currency,
      period_start,
      period_end,
      emissions_t_co2e,
      emission_factor_info,
      status,
      notes,
      facility_id,
      id,
      orgId,
    ];

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      res.status(404).json({ success: false, message: "Record not found or unauthorized." });
      return;
    }

    res.json({
      success: true,
      message: "Emission record updated successfully.",
      data: result.rows[0],
    });
  } catch (err: any) {
    console.error("Update Emission Record Error:", err);
    res.status(500).json({ success: false, message: "Failed to update emission record." });
  }
};

/**
 * DELETE /api/emissions/:id
 * Delete an emission record
 */
export const deleteEmissionRecord = async (req: Request, res: Response): Promise<void> => {
  try {
    const orgId = req.user?.organizationId;
    const { id } = req.params;

    const result = await pool.query(
      "DELETE FROM emissions_records WHERE id = $1 AND organization_id = $2 RETURNING id",
      [id, orgId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ success: false, message: "Record not found or unauthorized." });
      return;
    }

    res.json({
      success: true,
      message: "Emission record deleted successfully.",
      data: { id },
    });
  } catch (err: any) {
    console.error("Delete Emission Record Error:", err);
    res.status(500).json({ success: false, message: "Failed to delete emission record." });
  }
};
