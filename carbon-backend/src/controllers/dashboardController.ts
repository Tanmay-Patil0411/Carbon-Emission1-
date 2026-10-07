import { Request, Response } from "express";
import pool from "../config/db";

/**
 * GET /api/dashboard/summary
 * SQL aggregation queries for Dashboard.tsx metrics
 */
export const getDashboardSummary = async (req: Request, res: Response): Promise<void> => {
  try {
    const orgId = req.user?.organizationId;
    if (!orgId) {
      res.status(401).json({ success: false, message: "Organization ID missing." });
      return;
    }

    // 1. Totals & Scope Aggregation
    const totalsQuery = `
      SELECT
        COALESCE(SUM(emissions_t_co2e), 0) AS total_emissions,
        COALESCE(SUM(CASE WHEN scope = 'scope1' THEN emissions_t_co2e ELSE 0 END), 0) AS scope1_emissions,
        COALESCE(SUM(CASE WHEN scope = 'scope2' THEN emissions_t_co2e ELSE 0 END), 0) AS scope2_emissions,
        COALESCE(SUM(CASE WHEN scope = 'scope3' THEN emissions_t_co2e ELSE 0 END), 0) AS scope3_emissions,
        COUNT(id) AS total_activities,
        COUNT(CASE WHEN status = 'validated' THEN 1 END) AS validated_activities
      FROM emissions_records
      WHERE organization_id = $1;
    `;
    const totalsRes = await pool.query(totalsQuery, [orgId]);
    const totalsRow = totalsRes.rows[0];

    const totalEmissions = parseFloat(totalsRow.total_emissions);
    const scope1Emissions = parseFloat(totalsRow.scope1_emissions);
    const scope2Emissions = parseFloat(totalsRow.scope2_emissions);
    const scope3Emissions = parseFloat(totalsRow.scope3_emissions);
    const totalActivities = parseInt(totalsRow.total_activities, 10);
    const validatedActivities = parseInt(totalsRow.validated_activities, 10);

    // 2. Category Hotspot Ranking
    const hotspotQuery = `
      SELECT
        category,
        COALESCE(SUM(emissions_t_co2e), 0) AS emissions_t_co2e
      FROM emissions_records
      WHERE organization_id = $1
      GROUP BY category
      ORDER BY emissions_t_co2e DESC;
    `;
    const hotspotRes = await pool.query(hotspotQuery, [orgId]);
    const hotspot_ranking = hotspotRes.rows.map((row) => {
      const em = parseFloat(row.emissions_t_co2e);
      return {
        category: row.category,
        emissions_t_co2e: em,
        percentage: totalEmissions > 0 ? parseFloat(((em / totalEmissions) * 100).toFixed(2)) : 0,
      };
    });

    // 3. Monthly Trend (Grouped by Month from period_start)
    const monthlyQuery = `
      SELECT
        TO_CHAR(period_start, 'Mon') AS month,
        DATE_TRUNC('month', period_start) AS month_date,
        COALESCE(SUM(emissions_t_co2e), 0) AS emissions
      FROM emissions_records
      WHERE organization_id = $1
      GROUP BY TO_CHAR(period_start, 'Mon'), DATE_TRUNC('month', period_start)
      ORDER BY month_date ASC;
    `;
    const monthlyRes = await pool.query(monthlyQuery, [orgId]);
    const monthly_trend = monthlyRes.rows.map((row) => ({
      month: row.month,
      emissions: parseFloat(parseFloat(row.emissions).toFixed(2)),
    }));

    // 4. Facility Breakdown
    const facilityQuery = `
      SELECT
        COALESCE(f.facility_name, 'Unassigned Facility') AS facility_name,
        COALESCE(SUM(r.emissions_t_co2e), 0) AS emissions_t_co2e
      FROM emissions_records r
      LEFT JOIN facilities f ON r.facility_id = f.id
      WHERE r.organization_id = $1
      GROUP BY f.facility_name
      ORDER BY emissions_t_co2e DESC;
    `;
    const facilityRes = await pool.query(facilityQuery, [orgId]);
    const facility_emissions = facilityRes.rows.map((row) => ({
      facility_name: row.facility_name,
      emissions_t_co2e: parseFloat(parseFloat(row.emissions_t_co2e).toFixed(2)),
    }));

    // Data Completeness Score Calculation
    const completenessScore = totalActivities > 0
      ? Math.min(100, Math.round((validatedActivities / totalActivities) * 100))
      : 0;

    res.json({
      success: true,
      data: {
        total_emissions_t_co2e: parseFloat(totalEmissions.toFixed(2)),
        scope1_emissions_t_co2e: parseFloat(scope1Emissions.toFixed(2)),
        scope2_emissions_t_co2e: parseFloat(scope2Emissions.toFixed(2)),
        scope3_emissions_t_co2e: parseFloat(scope3Emissions.toFixed(2)),
        total_activities: totalActivities,
        validated_activities: validatedActivities,
        data_completeness_score: completenessScore,
        hotspot_ranking,
        monthly_trend,
        facility_emissions,
      },
    });
  } catch (err: any) {
    console.error("Dashboard Summary Error:", err);
    res.status(500).json({ success: false, message: "Failed to generate dashboard summary." });
  }
};
