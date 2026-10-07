import { Request, Response } from "express";
import PDFDocument from "pdfkit";
import pool from "../config/db";
import { buildRecommendationPayload } from "../services/recommendationEngine";

/**
 * GET /api/reports/pdf
 * GET /api/reports/download
 * Generates an audit-ready, text-based PDF report for the authenticated organization.
 * Recommendations come from the shared Recommendation Engine (same as GET /api/recommendations).
 */
export const generatePdfReport = async (req: Request, res: Response): Promise<void> => {
  try {
    const orgId = req.user?.organizationId;
    const userId = req.user?.userId;

    if (!orgId || !userId) {
      res.status(401).json({ success: false, message: "Unauthorized access. Token payload invalid." });
      return;
    }

    // Shared recommendation engine (identical source of truth as /api/recommendations)
    let enginePayload: Awaited<ReturnType<typeof buildRecommendationPayload>> | null = null;
    try {
      enginePayload = await buildRecommendationPayload(orgId);
    } catch (engineErr) {
      console.error("PDF recommendation engine error (continuing with empty recommendations):", engineErr);
    }

    // 1. Fetch Organization Details
    const orgRes = await pool.query(
      "SELECT name, industry_vertical, headcount, ef_standard FROM organizations WHERE id = $1",
      [orgId]
    );
    const orgData = orgRes.rows[0] || {};
    const orgName = orgData.name || `Organization #${orgId}`;
    const industry = orgData.industry_vertical || "Information Technology & Software Services";
    const headcount = orgData.headcount || "100-500 Employees";
    const efStandard = orgData.ef_standard || "DEFRA 2024 / US EPA AR5";

    // 2. Fetch Authenticated User Details
    const userRes = await pool.query(
      "SELECT full_name, email, role FROM users WHERE id = $1 AND organization_id = $2",
      [userId, orgId]
    );
    const userData = userRes.rows[0] || {};
    const adminName = userData.full_name || req.user?.email?.split("@")[0] || "Administrator";
    const adminEmail = userData.email || req.user?.email || "user@organization.com";
    const rawRole = userData.role || req.user?.role || "admin";
    const roleLabel = rawRole === "admin" ? "Administrator" : rawRole.charAt(0).toUpperCase() + rawRole.slice(1);

    // 3. Fetch Emission Records strictly scoped to organization
    const recordsRes = await pool.query(
      `SELECT r.*, f.facility_name
       FROM emissions_records r
       LEFT JOIN facilities f ON r.facility_id = f.id
       WHERE r.organization_id = $1
       ORDER BY r.created_at DESC`,
      [orgId]
    );
    const records = recordsRes.rows;

    // 4. Fetch Facility Summary
    const facilityRes = await pool.query(
      `SELECT COALESCE(f.facility_name, 'Unassigned Facility') as facility_name,
              COALESCE(SUM(r.emissions_t_co2e), 0) as emissions_t_co2e,
              COUNT(r.id) as record_count
       FROM emissions_records r
       LEFT JOIN facilities f ON r.facility_id = f.id
       WHERE r.organization_id = $1
       GROUP BY f.facility_name
       ORDER BY emissions_t_co2e DESC`,
      [orgId]
    );
    const facilities = facilityRes.rows;

    // 5. Compute Aggregations
    const totalEmissions = records.reduce((sum, r) => sum + parseFloat(r.emissions_t_co2e || 0), 0);
    const scope1Total = records.filter((r) => r.scope === "scope1").reduce((sum, r) => sum + parseFloat(r.emissions_t_co2e || 0), 0);
    const scope2Total = records.filter((r) => r.scope === "scope2").reduce((sum, r) => sum + parseFloat(r.emissions_t_co2e || 0), 0);
    const scope3Total = records.filter((r) => r.scope === "scope3").reduce((sum, r) => sum + parseFloat(r.emissions_t_co2e || 0), 0);

    const scope1Pct = totalEmissions > 0 ? ((scope1Total / totalEmissions) * 100).toFixed(1) : "0.0";
    const scope2Pct = totalEmissions > 0 ? ((scope2Total / totalEmissions) * 100).toFixed(1) : "0.0";
    const scope3Pct = totalEmissions > 0 ? ((scope3Total / totalEmissions) * 100).toFixed(1) : "0.0";

    const totalRecords = records.length;
    const validatedCount = records.filter((r) => r.status === "validated").length;
    const pendingCount = records.filter((r) => r.status === "pending" || !r.status).length;
    const rejectedCount = records.filter((r) => r.status === "rejected").length;

    // Highest Scope Calculation
    let highestScope = "Scope 1";
    if (scope2Total >= scope1Total && scope2Total >= scope3Total) {
      highestScope = "Scope 2";
    } else if (scope3Total >= scope1Total && scope3Total >= scope2Total) {
      highestScope = "Scope 3";
    }
    if (totalEmissions === 0) {
      highestScope = "N/A (No Emissions)";
    }

    // Category Breakdown (sorted highest to lowest)
    const categoryMap: Record<string, { scope: string; emissions: number; count: number }> = {};
    records.forEach((r) => {
      const cat = r.category || "Uncategorized";
      if (!categoryMap[cat]) {
        categoryMap[cat] = { scope: r.scope || "scope1", emissions: 0, count: 0 };
      }
      categoryMap[cat].emissions += parseFloat(r.emissions_t_co2e || 0);
      categoryMap[cat].count += 1;
    });

    const categoriesSorted = Object.entries(categoryMap)
      .map(([name, data]) => ({
        name,
        scope: data.scope,
        emissions: data.emissions,
        pct: totalEmissions > 0 ? ((data.emissions / totalEmissions) * 100).toFixed(1) : "0.0",
        count: data.count,
      }))
      .sort((a, b) => b.emissions - a.emissions);

    const highestCategory = categoriesSorted[0]?.name || "N/A";
    const highestCategoryEmissions = categoriesSorted[0]?.emissions || 0;
    const highestCategoryPct = categoriesSorted[0]?.pct || "0.0";

    // Reporting Period Determination
    let periodStartStr = "N/A";
    let periodEndStr = "N/A";
    if (records.length > 0) {
      const datesStart = records.map((r) => new Date(r.period_start || r.created_at).getTime()).filter((t) => !isNaN(t));
      const datesEnd = records.map((r) => new Date(r.period_end || r.created_at).getTime()).filter((t) => !isNaN(t));
      if (datesStart.length > 0) {
        periodStartStr = new Date(Math.min(...datesStart)).toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" });
      }
      if (datesEnd.length > 0) {
        periodEndStr = new Date(Math.max(...datesEnd)).toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" });
      }
    }
    const reportingPeriodText = records.length > 0 ? `${periodStartStr} – ${periodEndStr}` : "No Active Reporting Period";
    const reportGeneratedDate = new Date().toLocaleDateString("en-US", { day: "2-digit", month: "long", year: "numeric" });

    // 6. Set HTTP Headers for File Download
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", 'attachment; filename="CarbonTrack_Emissions_Report.pdf"');

    // 7. Initialize PDFKit Document with Buffer Pages for Footer Page Numbers
    const doc = new PDFDocument({ margin: 40, size: "A4", bufferPages: true });
    doc.pipe(res);

    // Color Palette
    const primaryDark = "#0f172a"; // Slate 900
    const primaryBrand = "#10b981"; // Emerald 500
    const brandDark = "#059669"; // Emerald 600
    const textDark = "#1e293b"; // Slate 800
    const textLight = "#64748b"; // Slate 500
    const bgBox = "#f8fafc"; // Slate 50
    const tableHeaderBg = "#f1f5f9"; // Slate 100

    // Helper: Section Title
    const addSectionTitle = (title: string) => {
      if (doc.y > 680) {
        doc.addPage();
      } else {
        doc.moveDown(1);
      }
      const y = doc.y;
      doc.rect(40, y, 4, 18).fill(brandDark);
      doc.fillColor(primaryDark).fontSize(13).font("Helvetica-Bold").text(title.toUpperCase(), 52, y + 2);
      doc.moveDown(0.6);
      doc.strokeColor("#e2e8f0").lineWidth(0.8).moveTo(40, doc.y).lineTo(555, doc.y).stroke();
      doc.moveDown(0.8);
    };

    // Helper: Check Page Boundary before rendering blocks
    const ensureSpace = (needed: number) => {
      if (doc.y + needed > 710) {
        doc.addPage();
      }
    };

    // ============================================================
    // PDF CONTENT GENERATION
    // ============================================================

    // --- COVER / HEADER BANNER ---
    doc.rect(40, 40, 515, 60).fill(primaryDark);
    doc.fillColor(primaryBrand).fontSize(18).font("Helvetica-Bold").text("CARBONTRACK", 55, 52);
    doc.fillColor("#ffffff").fontSize(12).font("Helvetica").text("CORPORATE ESG & CARBON EMISSIONS REPORT", 55, 74);
    doc.fillColor("#94a3b8").fontSize(8).font("Helvetica").text(`ISO 14064-1 & GHG PROTOCOL COMPLIANT`, 350, 65, { align: "right", width: 190 });

    doc.y = 115;

    // --- 1. ORGANIZATION & ADMINISTRATOR INFORMATION ---
    ensureSpace(120);
    doc.rect(40, doc.y, 250, 100).fill(bgBox);
    doc.rect(40, doc.y, 250, 100).strokeColor("#cbd5e1").lineWidth(0.5).stroke();
    
    doc.rect(305, doc.y, 250, 100).fill(bgBox);
    doc.rect(305, doc.y, 250, 100).strokeColor("#cbd5e1").lineWidth(0.5).stroke();

    const boxY = doc.y;
    // Left Box: Organization Info
    doc.fillColor(brandDark).fontSize(10).font("Helvetica-Bold").text("ORGANIZATION INFORMATION", 50, boxY + 10);
    doc.fillColor(textLight).fontSize(8).font("Helvetica").text("Organization Name:", 50, boxY + 28);
    doc.fillColor(textDark).fontSize(8).font("Helvetica-Bold").text(orgName, 135, boxY + 28, { width: 150 });

    doc.fillColor(textLight).fontSize(8).font("Helvetica").text("Industry Vertical:", 50, boxY + 42);
    doc.fillColor(textDark).fontSize(8).font("Helvetica").text(industry, 135, boxY + 42, { width: 150 });

    doc.fillColor(textLight).fontSize(8).font("Helvetica").text("Total Headcount:", 50, boxY + 56);
    doc.fillColor(textDark).fontSize(8).font("Helvetica").text(headcount, 135, boxY + 56);

    doc.fillColor(textLight).fontSize(8).font("Helvetica").text("EF Standard:", 50, boxY + 70);
    doc.fillColor(textDark).fontSize(8).font("Helvetica").text(efStandard, 135, boxY + 70);

    doc.fillColor(textLight).fontSize(8).font("Helvetica").text("Reporting Period:", 50, boxY + 84);
    doc.fillColor(brandDark).fontSize(8).font("Helvetica-Bold").text(reportingPeriodText, 135, boxY + 84);

    // Right Box: Administrator Info
    doc.fillColor(brandDark).fontSize(10).font("Helvetica-Bold").text("ADMINISTRATOR / AUDITOR DETAILS", 315, boxY + 10);
    doc.fillColor(textLight).fontSize(8).font("Helvetica").text("Account Admin:", 315, boxY + 28);
    doc.fillColor(textDark).fontSize(8).font("Helvetica-Bold").text(adminName, 400, boxY + 28, { width: 150 });

    doc.fillColor(textLight).fontSize(8).font("Helvetica").text("Email Address:", 315, boxY + 42);
    doc.fillColor(textDark).fontSize(8).font("Helvetica").text(adminEmail, 400, boxY + 42, { width: 150 });

    doc.fillColor(textLight).fontSize(8).font("Helvetica").text("Assigned Role:", 315, boxY + 56);
    doc.fillColor(textDark).fontSize(8).font("Helvetica-Bold").text(roleLabel, 400, boxY + 56);

    doc.fillColor(textLight).fontSize(8).font("Helvetica").text("Organization ID:", 315, boxY + 70);
    doc.fillColor(textDark).fontSize(8).font("Helvetica").text(`Org #${orgId}`, 400, boxY + 70);

    doc.fillColor(textLight).fontSize(8).font("Helvetica").text("Report Date:", 315, boxY + 84);
    doc.fillColor(textDark).fontSize(8).font("Helvetica").text(reportGeneratedDate, 400, boxY + 84);

    doc.y = boxY + 115;

    // --- 2. EXECUTIVE SUMMARY ---
    addSectionTitle("1. Executive Summary");

    if (totalEmissions === 0) {
      doc.rect(40, doc.y, 515, 45).fill("#fef2f2");
      doc.rect(40, doc.y, 515, 45).strokeColor("#fca5a5").lineWidth(0.5).stroke();
      doc.fillColor("#991b1b").fontSize(9).font("Helvetica-Bold").text("NO EMISSIONS DATA AVAILABLE FOR THIS ORGANIZATION", 55, doc.y + 12);
      doc.fillColor("#7f1d1d").fontSize(8).font("Helvetica").text("No emission activity records were found for this reporting period. Log activity entries to populate audit metrics.", 55, doc.y + 26);
      doc.y += 55;
    } else {
      ensureSpace(80);
      const sumY = doc.y;
      const cardW = 122;

      // Card 1: Total
      doc.rect(40, sumY, cardW, 55).fill("#ecfdf5");
      doc.rect(40, sumY, cardW, 55).strokeColor("#a7f3d0").lineWidth(0.5).stroke();
      doc.fillColor(brandDark).fontSize(7).font("Helvetica-Bold").text("TOTAL FOOTPRINT", 48, sumY + 8);
      doc.fillColor(primaryDark).fontSize(14).font("Helvetica-Bold").text(totalEmissions.toFixed(2), 48, sumY + 20);
      doc.fillColor(textLight).fontSize(7).font("Helvetica").text("tCO₂e", 48, sumY + 38);

      // Card 2: Scope 1
      doc.rect(171, sumY, cardW, 55).fill(bgBox);
      doc.rect(171, sumY, cardW, 55).strokeColor("#cbd5e1").lineWidth(0.5).stroke();
      doc.fillColor(textDark).fontSize(7).font("Helvetica-Bold").text("SCOPE 1 DIRECT", 179, sumY + 8);
      doc.fillColor(primaryDark).fontSize(14).font("Helvetica-Bold").text(scope1Total.toFixed(2), 179, sumY + 20);
      doc.fillColor(textLight).fontSize(7).font("Helvetica").text(`${scope1Pct}% of total`, 179, sumY + 38);

      // Card 3: Scope 2
      doc.rect(302, sumY, cardW, 55).fill(bgBox);
      doc.rect(302, sumY, cardW, 55).strokeColor("#cbd5e1").lineWidth(0.5).stroke();
      doc.fillColor(textDark).fontSize(7).font("Helvetica-Bold").text("SCOPE 2 ELECTRICITY", 310, sumY + 8);
      doc.fillColor(primaryDark).fontSize(14).font("Helvetica-Bold").text(scope2Total.toFixed(2), 310, sumY + 20);
      doc.fillColor(textLight).fontSize(7).font("Helvetica").text(`${scope2Pct}% of total`, 310, sumY + 38);

      // Card 4: Scope 3
      doc.rect(433, sumY, cardW, 55).fill(bgBox);
      doc.rect(433, sumY, cardW, 55).strokeColor("#cbd5e1").lineWidth(0.5).stroke();
      doc.fillColor(textDark).fontSize(7).font("Helvetica-Bold").text("SCOPE 3 VALUE CHAIN", 441, sumY + 8);
      doc.fillColor(primaryDark).fontSize(14).font("Helvetica-Bold").text(scope3Total.toFixed(2), 441, sumY + 20);
      doc.fillColor(textLight).fontSize(7).font("Helvetica").text(`${scope3Pct}% of total`, 441, sumY + 38);

      doc.y = sumY + 68;
    }

    // Key Highlights Grid
    ensureSpace(40);
    doc.fillColor(textDark).fontSize(9).font("Helvetica-Bold").text("Executive Inventory Highlights:", 40, doc.y);
    doc.moveDown(0.4);
    doc.fillColor(textLight).fontSize(8).font("Helvetica")
       .text(`• Total Active Records: ${totalRecords} logged entries across ${facilities.length} facility locations.`)
       .text(`• Dominant Emission Scope: ${highestScope}`)
       .text(`• Top Hotspot Category: ${highestCategory} (${highestCategoryEmissions.toFixed(2)} tCO₂e — ${highestCategoryPct}%)`);
    doc.moveDown(0.8);

    // --- 3. SCOPE & CATEGORY ANALYSIS ---
    addSectionTitle("2. Scope & Category Analysis");

    ensureSpace(120);
    // Table 1: Scope Analysis
    doc.fillColor(textDark).fontSize(9).font("Helvetica-Bold").text("A. GHG Protocol Scope Breakdown", 40, doc.y);
    doc.moveDown(0.4);

    let tY = doc.y;
    doc.rect(40, tY, 515, 18).fill(tableHeaderBg);
    doc.fillColor(primaryDark).fontSize(8).font("Helvetica-Bold");
    doc.text("GHG Scope Category", 50, tY + 5);
    doc.text("Classification Description", 180, tY + 5);
    doc.text("Emissions (tCO₂e)", 380, tY + 5, { width: 90, align: "right" });
    doc.text("Share (%)", 480, tY + 5, { width: 65, align: "right" });
    tY += 18;

    const scopesData = [
      { name: "Scope 1 Direct Emissions", desc: "Stationary/mobile combustion, refrigerants & generators", val: scope1Total, pct: scope1Pct },
      { name: "Scope 2 Indirect Electricity", desc: "Purchased grid electricity, steam & facility cooling", val: scope2Total, pct: scope2Pct },
      { name: "Scope 3 Value Chain", desc: "Cloud hosting, business travel, commuting & supply chain", val: scope3Total, pct: scope3Pct },
    ];

    scopesData.forEach((s, idx) => {
      if (idx % 2 === 1) doc.rect(40, tY, 515, 18).fill("#f8fafc");
      doc.strokeColor("#e2e8f0").lineWidth(0.5).moveTo(40, tY + 18).lineTo(555, tY + 18).stroke();
      doc.fillColor(textDark).fontSize(8).font("Helvetica-Bold").text(s.name, 50, tY + 4);
      doc.fillColor(textLight).fontSize(7.5).font("Helvetica").text(s.desc, 180, tY + 4, { width: 190 });
      doc.fillColor(primaryDark).fontSize(8).font("Helvetica-Bold").text(s.val.toFixed(2), 380, tY + 4, { width: 90, align: "right" });
      doc.fillColor(brandDark).fontSize(8).font("Helvetica-Bold").text(`${s.pct}%`, 480, tY + 4, { width: 65, align: "right" });
      tY += 18;
    });

    doc.y = tY + 15;

    // Table 2: Top Category Hotspots
    ensureSpace(120);
    doc.fillColor(textDark).fontSize(9).font("Helvetica-Bold").text("B. Top Emission Source Categories (Ranked)", 40, doc.y);
    doc.moveDown(0.4);

    tY = doc.y;
    doc.rect(40, tY, 515, 18).fill(tableHeaderBg);
    doc.fillColor(primaryDark).fontSize(8).font("Helvetica-Bold");
    doc.text("Rank & Category Name", 50, tY + 5);
    doc.text("Scope", 240, tY + 5);
    doc.text("Record Count", 320, tY + 5, { width: 60, align: "right" });
    doc.text("Emissions (tCO₂e)", 390, tY + 5, { width: 80, align: "right" });
    doc.text("Impact Share", 480, tY + 5, { width: 65, align: "right" });
    tY += 18;

    if (categoriesSorted.length === 0) {
      doc.rect(40, tY, 515, 18).fill("#ffffff");
      doc.fillColor(textLight).fontSize(8).font("Helvetica").text("No emission categories logged.", 50, tY + 4);
      tY += 18;
    } else {
      categoriesSorted.slice(0, 5).forEach((cat, idx) => {
        if (idx % 2 === 1) doc.rect(40, tY, 515, 18).fill("#f8fafc");
        doc.strokeColor("#e2e8f0").lineWidth(0.5).moveTo(40, tY + 18).lineTo(555, tY + 18).stroke();
        doc.fillColor(textDark).fontSize(8).font("Helvetica-Bold").text(`#${idx + 1} ${cat.name}`, 50, tY + 4, { width: 180 });
        doc.fillColor(textLight).fontSize(7.5).font("Helvetica").text(cat.scope.toUpperCase(), 240, tY + 4);
        doc.fillColor(textDark).fontSize(8).font("Helvetica").text(`${cat.count} rec`, 320, tY + 4, { width: 60, align: "right" });
        doc.fillColor(primaryDark).fontSize(8).font("Helvetica-Bold").text(cat.emissions.toFixed(2), 390, tY + 4, { width: 80, align: "right" });
        doc.fillColor(brandDark).fontSize(8).font("Helvetica-Bold").text(`${cat.pct}%`, 480, tY + 4, { width: 65, align: "right" });
        tY += 18;
      });
    }

    doc.y = tY + 15;

    // --- 4. DETAILED EMISSIONS BREAKDOWN TABLE ---
    addSectionTitle("3. Detailed Emissions Activity Inventory");

    ensureSpace(140);
    tY = doc.y;
    doc.rect(40, tY, 515, 18).fill(tableHeaderBg);
    doc.fillColor(primaryDark).fontSize(8).font("Helvetica-Bold");
    doc.text("Activity Category", 45, tY + 5);
    doc.text("Scope", 160, tY + 5);
    doc.text("Quantity / Unit", 215, tY + 5);
    doc.text("Emissions (tCO₂e)", 325, tY + 5, { width: 80, align: "right" });
    doc.text("Status", 415, tY + 5);
    doc.text("Facility / Period", 475, tY + 5);
    tY += 18;

    if (records.length === 0) {
      doc.rect(40, tY, 515, 22).fill("#ffffff");
      doc.fillColor(textLight).fontSize(8).font("Helvetica").text("No emission records found for this organization.", 50, tY + 6);
      tY += 22;
    } else {
      records.forEach((r, idx) => {
        if (tY > 700) {
          doc.addPage();
          tY = doc.y + 10;
          doc.rect(40, tY, 515, 18).fill(tableHeaderBg);
          doc.fillColor(primaryDark).fontSize(8).font("Helvetica-Bold");
          doc.text("Activity Category", 45, tY + 5);
          doc.text("Scope", 160, tY + 5);
          doc.text("Quantity / Unit", 215, tY + 5);
          doc.text("Emissions (tCO₂e)", 325, tY + 5, { width: 80, align: "right" });
          doc.text("Status", 415, tY + 5);
          doc.text("Facility / Period", 475, tY + 5);
          tY += 18;
        }

        if (idx % 2 === 1) doc.rect(40, tY, 515, 20).fill("#f8fafc");
        doc.strokeColor("#e2e8f0").lineWidth(0.5).moveTo(40, tY + 20).lineTo(555, tY + 20).stroke();

        const catName = r.category || "General Activity";
        const scopeStr = (r.scope || "scope1").toUpperCase();
        const qtyStr = `${parseFloat(r.quantity || 0).toLocaleString()} ${r.unit || ""}`;
        const emVal = parseFloat(r.emissions_t_co2e || 0).toFixed(2);
        const statusStr = (r.status || "pending").toUpperCase();
        const facilityStr = r.facility_name || r.period_start || "Default Site";

        doc.fillColor(textDark).fontSize(7.5).font("Helvetica-Bold").text(catName, 45, tY + 5, { width: 110, height: 12, ellipsis: true });
        doc.fillColor(textLight).fontSize(7).font("Helvetica").text(scopeStr, 160, tY + 5);
        doc.fillColor(textDark).fontSize(7.5).font("Helvetica").text(qtyStr, 215, tY + 5, { width: 105, height: 12, ellipsis: true });
        doc.fillColor(brandDark).fontSize(7.5).font("Helvetica-Bold").text(emVal, 325, tY + 5, { width: 80, align: "right" });

        const statusColor = r.status === "validated" ? "#047857" : r.status === "rejected" ? "#b91c1c" : "#b45309";
        doc.fillColor(statusColor).fontSize(7).font("Helvetica-Bold").text(statusStr, 415, tY + 5);

        doc.fillColor(textLight).fontSize(7).font("Helvetica").text(facilityStr, 475, tY + 5, { width: 75, height: 12, ellipsis: true });

        tY += 20;
      });
    }

    doc.y = tY + 15;

    // --- 5. FACILITY ANALYSIS ---
    addSectionTitle("4. Facility-Level Emissions Breakdown");

    ensureSpace(80);
    tY = doc.y;
    if (facilities.length === 0 || (facilities.length === 1 && facilities[0].facility_name === "Unassigned Facility" && totalEmissions === 0)) {
      doc.fillColor(textLight).fontSize(8.5).font("Helvetica-Oblique").text("No facility-level data available for this reporting period.", 40, tY);
      doc.y += 20;
    } else {
      doc.rect(40, tY, 515, 18).fill(tableHeaderBg);
      doc.fillColor(primaryDark).fontSize(8).font("Helvetica-Bold");
      doc.text("Facility Location / Site Name", 50, tY + 5);
      doc.text("Activity Record Count", 280, tY + 5, { width: 100, align: "right" });
      doc.text("Emissions (tCO₂e)", 400, tY + 5, { width: 85, align: "right" });
      doc.text("Site Share", 495, tY + 5, { width: 50, align: "right" });
      tY += 18;

      facilities.forEach((f, idx) => {
        if (idx % 2 === 1) doc.rect(40, tY, 515, 18).fill("#f8fafc");
        doc.strokeColor("#e2e8f0").lineWidth(0.5).moveTo(40, tY + 18).lineTo(555, tY + 18).stroke();
        const fEmissions = parseFloat(f.emissions_t_co2e || 0);
        const fShare = totalEmissions > 0 ? ((fEmissions / totalEmissions) * 100).toFixed(1) : "0.0";

        doc.fillColor(textDark).fontSize(8).font("Helvetica-Bold").text(f.facility_name, 50, tY + 4);
        doc.fillColor(textLight).fontSize(8).font("Helvetica").text(`${f.record_count} entries`, 280, tY + 4, { width: 100, align: "right" });
        doc.fillColor(primaryDark).fontSize(8).font("Helvetica-Bold").text(fEmissions.toFixed(2), 400, tY + 4, { width: 85, align: "right" });
        doc.fillColor(brandDark).fontSize(8).font("Helvetica-Bold").text(`${fShare}%`, 495, tY + 4, { width: 50, align: "right" });
        tY += 18;
      });
      doc.y = tY + 15;
    }

    // --- 6. DATA QUALITY & VALIDATION SUMMARY ---
    addSectionTitle("5. Data Quality & Audit Summary");

    ensureSpace(60);
    const dqY = doc.y;
    const dqW = 122;

    doc.rect(40, dqY, dqW, 45).fill(bgBox);
    doc.rect(40, dqY, dqW, 45).strokeColor("#cbd5e1").lineWidth(0.5).stroke();
    doc.fillColor(textLight).fontSize(7).font("Helvetica-Bold").text("TOTAL RECORDS", 48, dqY + 6);
    doc.fillColor(primaryDark).fontSize(12).font("Helvetica-Bold").text(totalRecords.toString(), 48, dqY + 18);

    doc.rect(171, dqY, dqW, 45).fill("#ecfdf5");
    doc.rect(171, dqY, dqW, 45).strokeColor("#a7f3d0").lineWidth(0.5).stroke();
    doc.fillColor("#047857").fontSize(7).font("Helvetica-Bold").text("VALIDATED (AUDITED)", 179, dqY + 6);
    doc.fillColor("#047857").fontSize(12).font("Helvetica-Bold").text(validatedCount.toString(), 179, dqY + 18);

    doc.rect(302, dqY, dqW, 45).fill("#fffbeb");
    doc.rect(302, dqY, dqW, 45).strokeColor("#fde68a").lineWidth(0.5).stroke();
    doc.fillColor("#b45309").fontSize(7).font("Helvetica-Bold").text("PENDING REVIEW", 310, dqY + 6);
    doc.fillColor("#b45309").fontSize(12).font("Helvetica-Bold").text(pendingCount.toString(), 310, dqY + 18);

    doc.rect(433, dqY, dqW, 45).fill("#fef2f2");
    doc.rect(433, dqY, dqW, 45).strokeColor("#fca5a5").lineWidth(0.5).stroke();
    doc.fillColor("#b91c1c").fontSize(7).font("Helvetica-Bold").text("REJECTED / ACTION", 441, dqY + 6);
    doc.fillColor("#b91c1c").fontSize(12).font("Helvetica-Bold").text(rejectedCount.toString(), 441, dqY + 18);

    doc.y = dqY + 58;

    // --- 7. KEY FINDINGS ---
    addSectionTitle("6. Automated Data Key Findings");

    ensureSpace(80);
    const findings = [
      `Dominant Footprint: ${highestScope} represents the largest portion of total corporate emissions (${highestScope === "Scope 1" ? scope1Pct : highestScope === "Scope 2" ? scope2Pct : scope3Pct}% of total).`,
      `Top Hotspot: Category '${highestCategory}' is the single highest emission source, generating ${highestCategoryEmissions.toFixed(2)} tCO₂e (${highestCategoryPct}% of inventory).`,
      `Data Assurance: ${validatedCount} of ${totalRecords} activity records (${totalRecords > 0 ? Math.round((validatedCount / totalRecords) * 100) : 0}%) have completed full verification and evidence audit review.`,
      `Reporting Scope: Data reflects activity records collected across ${facilities.length} facility site(s) for the period ${reportingPeriodText}.`,
    ];

    findings.forEach((finding) => {
      doc.fillColor(textDark).fontSize(8).font("Helvetica").text(`• ${finding}`, 45, doc.y, { width: 500 });
      doc.moveDown(0.3);
    });
    doc.moveDown(0.5);

    // --- 8. ACTIONABLE RECOMMENDATIONS (shared Recommendation Engine) ---
    addSectionTitle("7. Prioritized Carbon Reduction Recommendations");

    ensureSpace(120);
    const engineRecs = enginePayload?.recommendations || [];
    const recommendations = engineRecs.map((r) => ({
      priority: `${r.priority} Priority`,
      source: r.facility ? `${r.category} @ ${r.facility}` : r.category || r.title,
      action: (r.actions && r.actions[0]) || r.title,
      benefit: r.expectedBenefit || `Impact: ${r.expectedImpact}; Effort: ${r.effort}`,
      score: r.score,
      confidence: r.confidence,
    }));

    if (recommendations.length === 0) {
      recommendations.push({
        priority: "High Priority",
        source: "Emissions Logging & Ingestion",
        action: "Log corporate energy, fuel, cloud, and travel activity entries to establish baseline GHG inventory.",
        benefit: "Establishes regulatory ESG compliance baseline.",
        score: 90,
        confidence: "HIGH",
      });
    }

    tY = doc.y;
    doc.rect(40, tY, 515, 18).fill(tableHeaderBg);
    doc.fillColor(primaryDark).fontSize(8).font("Helvetica-Bold");
    doc.text("Priority Level", 48, tY + 5);
    doc.text("Target Emission Source", 130, tY + 5);
    doc.text("Recommended Action", 270, tY + 5);
    doc.text("Expected Benefit", 435, tY + 5);
    tY += 18;

    recommendations.forEach((rec, idx) => {
      ensureSpace(30);
      if (idx % 2 === 1) doc.rect(40, tY, 515, 26).fill("#f8fafc");
      doc.strokeColor("#e2e8f0").lineWidth(0.5).moveTo(40, tY + 26).lineTo(555, tY + 26).stroke();

      const pColor = rec.priority.startsWith("HIGH") || rec.priority.startsWith("High") ? "#b91c1c" : rec.priority.startsWith("MEDIUM") || rec.priority.startsWith("Medium") ? "#b45309" : "#047857";
      doc.fillColor(pColor).fontSize(7.5).font("Helvetica-Bold").text(rec.priority, 48, tY + 5);
      doc.fillColor(textDark).fontSize(7.5).font("Helvetica-Bold").text(rec.source, 130, tY + 5, { width: 130 });
      doc.fillColor(textDark).fontSize(7.5).font("Helvetica").text(rec.action, 270, tY + 5, { width: 155 });
      doc.fillColor(textLight).fontSize(7.5).font("Helvetica").text(rec.benefit, 435, tY + 5, { width: 115 });

      tY += 26;
    });

    doc.y = tY + 15;

    // --- 9. CONCLUSION ---
    addSectionTitle("8. Conclusion & Sign-Off");

    ensureSpace(60);
    const conclusionText =
      totalEmissions > 0
        ? `This GHG Protocol corporate carbon footprint report confirms a total carbon inventory of ${totalEmissions.toFixed(2)} tCO₂e for ${orgName} during ${reportingPeriodText}. By addressing hotspot emissions in ${highestCategory} (${highestScope}), ${orgName} can achieve meaningful progress towards net-zero ESG objectives. Generated automatically by CarbonTrack Assurance Engine.`
        : `This report reflects the current carbon accounting profile for ${orgName}. Additional activity entries should be logged across Scope 1, 2, and 3 to establish complete baseline data for target-setting. Generated automatically by CarbonTrack Assurance Engine.`;

    doc.fillColor(textDark).fontSize(8.5).font("Helvetica-Oblique").text(conclusionText, 45, doc.y, { width: 500, align: "justify" });
    doc.moveDown(1.5);

    // --- PAGE NUMBERS & HEADER/FOOTER BUFFER LOOP ---
    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i);

      // Running Header (Pages > 0 or all pages)
      doc.rect(40, 15, 515, 18).fill("#f8fafc");
      doc.fillColor(brandDark).fontSize(7.5).font("Helvetica-Bold").text("CARBONTRACK ESG ASSURANCE ENGINE", 45, 19);
      doc.fillColor(textLight).fontSize(7.5).font("Helvetica").text(`Organization: ${orgName} | Report Date: ${reportGeneratedDate}`, 200, 19, { width: 350, align: "right" });

      // Running Footer
      doc.strokeColor("#cbd5e1").lineWidth(0.5).moveTo(40, 792).lineTo(555, 792).stroke();
      doc.fillColor(textLight).fontSize(7.5).font("Helvetica").text("Confidential — Generated automatically from organization data in PostgreSQL.", 45, 797);
      doc.fillColor(textLight).fontSize(7.5).font("Helvetica-Bold").text(`Page ${i + 1} of ${range.count}`, 45, 797, { width: 510, align: "right" });
    }

    doc.end();
  } catch (err: any) {
    console.error("PDF Report Generation Error:", err);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: "Unable to generate PDF report due to a server error.",
      });
    }
  }
};
