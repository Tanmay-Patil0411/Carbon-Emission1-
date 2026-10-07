/**
 * CarbonTrack Recommendation Engine (shared by API + PDF)
 *
 * INTERNAL ANALYTICAL RULES (not GHG Protocol limits):
 * - Category hotspot: contribution >= 15% of total
 * - Facility hotspot: contribution >= 25% of total
 * - Trend: +10% = INCREASING, -10% = DECREASING, else STABLE
 * - Scope dominance: Scope2/3 >= 35%, Scope1 >= 25% of total
 */

import pool from "../config/db";
import type {
  BenchmarkStatus,
  CarbonBenchmarkRow,
  CategoryAnalysisItem,
  Confidence,
  DataQualityReport,
  EffortLevel,
  EmissionRecordRow,
  EmissionTargetRow,
  FacilityAnalysisItem,
  ImpactLevel,
  Priority,
  RecommendationItem,
  RecommendationPayload,
  ScopeAnalysisItem,
  TargetProgress,
  TargetStatus,
  TrendDirection,
  TrendResult,
} from "../types/recommendations";

/** CarbonTrack internal: category hotspot share of total emissions */
export const CATEGORY_HOTSPOT_PCT = 15;
/** CarbonTrack internal: facility hotspot share of total emissions */
export const FACILITY_HOTSPOT_PCT = 25;
/** CarbonTrack internal: absolute % change for trend classification */
export const TREND_CHANGE_PCT = 10;
/** CarbonTrack internal: scope dominance cutoffs */
export const SCOPE_DOMINANCE = { scope1: 25, scope2: 35, scope3: 35 } as const;

export function parseNumericHeadcount(rawHeadcount?: string | null): number | null {
  if (!rawHeadcount || typeof rawHeadcount !== "string") return null;
  const trimmed = rawHeadcount.trim();
  if (!trimmed) return null;

  const rangeMatch = trimmed.match(/(\d[\d,]*)\s*-\s*(\d[\d,]*)/);
  if (rangeMatch) {
    const low = parseInt(rangeMatch[1].replace(/,/g, ""), 10);
    const high = parseInt(rangeMatch[2].replace(/,/g, ""), 10);
    if (!isNaN(low) && !isNaN(high) && low > 0 && high > 0) {
      return Math.round((low + high) / 2);
    }
  }

  const numMatch = trimmed.match(/(\d[\d,]*)/);
  if (numMatch) {
    const parsed = parseInt(numMatch[1].replace(/,/g, ""), 10);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  return null;
}

export function toNum(v: string | number | null | undefined): number {
  if (v === null || v === undefined) return 0;
  const n = typeof v === "number" ? v : parseFloat(v);
  return isNaN(n) ? 0 : n;
}

export function round2(n: number): number {
  return parseFloat(n.toFixed(2));
}

function monthKey(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function parseDate(v: string | Date | null | undefined): Date | null {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Period-aware trend: aggregate by month using period_start when possible.
 * Falls back to chronological half-split when fewer than 2 months exist.
 */
export function computeTrend(records: EmissionRecordRow[]): TrendResult {
  if (records.length === 0) {
    return {
      trend: "NO_DATA",
      changePercentage: 0,
      currentEmissions: 0,
      previousEmissions: 0,
      explanation: "No emission records available for trend analysis.",
      method: "none",
    };
  }

  const byMonth = new Map<string, number>();
  for (const r of records) {
    const d = parseDate(r.period_start);
    if (!d) continue;
    const key = monthKey(d);
    byMonth.set(key, (byMonth.get(key) || 0) + toNum(r.emissions_t_co2e));
  }

  const months = Array.from(byMonth.keys()).sort();

  if (months.length >= 2) {
    const mid = Math.floor(months.length / 2);
    const prevMonths = months.slice(0, mid);
    const currMonths = months.slice(mid);
    const previousEmissions = prevMonths.reduce((s, m) => s + (byMonth.get(m) || 0), 0);
    const currentEmissions = currMonths.reduce((s, m) => s + (byMonth.get(m) || 0), 0);

    if (previousEmissions <= 0) {
      return {
        trend: "STABLE",
        changePercentage: 0,
        currentEmissions: round2(currentEmissions),
        previousEmissions: 0,
        explanation: "Insufficient baseline monthly emissions to measure trend variation.",
        method: "monthly_period",
      };
    }

    const changePercentage = round2(((currentEmissions - previousEmissions) / previousEmissions) * 100);
    let trend: TrendDirection = "STABLE";
    if (changePercentage >= TREND_CHANGE_PCT) trend = "INCREASING";
    else if (changePercentage <= -TREND_CHANGE_PCT) trend = "DECREASING";

    return {
      trend,
      changePercentage,
      currentEmissions: round2(currentEmissions),
      previousEmissions: round2(previousEmissions),
      explanation:
        trend === "INCREASING"
          ? `Emissions increased by +${changePercentage}% across later reporting months vs earlier months (CarbonTrack internal threshold: ≥+${TREND_CHANGE_PCT}%).`
          : trend === "DECREASING"
          ? `Emissions decreased by ${changePercentage}% across later reporting months vs earlier months (CarbonTrack internal threshold: ≤-${TREND_CHANGE_PCT}%).`
          : `Emissions remained stable (${changePercentage >= 0 ? "+" : ""}${changePercentage}%) within CarbonTrack ±${TREND_CHANGE_PCT}% band.`,
      method: "monthly_period",
    };
  }

  // Fallback: chronological half-split by period_start
  if (records.length < 2) {
    return {
      trend: "NO_DATA",
      changePercentage: 0,
      currentEmissions: round2(records.reduce((s, r) => s + toNum(r.emissions_t_co2e), 0)),
      previousEmissions: 0,
      explanation: "Single period logged. Additional period data required for trend comparison.",
      method: "insufficient_data",
    };
  }

  const sorted = [...records].sort((a, b) => {
    const da = parseDate(a.period_start)?.getTime() || 0;
    const db = parseDate(b.period_start)?.getTime() || 0;
    return da - db;
  });
  const mid = Math.floor(sorted.length / 2);
  const previousEmissions = sorted.slice(0, mid).reduce((s, r) => s + toNum(r.emissions_t_co2e), 0);
  const currentEmissions = sorted.slice(mid).reduce((s, r) => s + toNum(r.emissions_t_co2e), 0);

  if (previousEmissions <= 0) {
    return {
      trend: "STABLE",
      changePercentage: 0,
      currentEmissions: round2(currentEmissions),
      previousEmissions: 0,
      explanation: "Insufficient baseline historical data to measure trend variation.",
      method: "chronological_half",
    };
  }

  const changePercentage = round2(((currentEmissions - previousEmissions) / previousEmissions) * 100);
  let trend: TrendDirection = "STABLE";
  if (changePercentage >= TREND_CHANGE_PCT) trend = "INCREASING";
  else if (changePercentage <= -TREND_CHANGE_PCT) trend = "DECREASING";

  return {
    trend,
    changePercentage,
    currentEmissions: round2(currentEmissions),
    previousEmissions: round2(previousEmissions),
    explanation:
      trend === "INCREASING"
        ? `Emissions increased by +${changePercentage}% vs earlier records (CarbonTrack internal threshold: ≥+${TREND_CHANGE_PCT}%).`
        : trend === "DECREASING"
        ? `Emissions decreased by ${changePercentage}% vs earlier records (CarbonTrack internal threshold: ≤-${TREND_CHANGE_PCT}%).`
        : `Emissions remained stable (${changePercentage >= 0 ? "+" : ""}${changePercentage}%) within CarbonTrack ±${TREND_CHANGE_PCT}% band.`,
    method: "chronological_half",
  };
}

/** LOW ≤ low; MODERATE ≤ high (moderate_threshold is mid-band); HIGH > high. */
export function classifyBenchmarkStatusCorrected(
  intensity: number | null,
  low: number | null,
  moderate: number | null,
  high: number | null
): BenchmarkStatus {
  if (intensity === null || low === null || high === null) return "NOT_AVAILABLE";
  if (intensity <= low) return "LOW";
  // Use moderate as upper bound of lower-moderate band when present
  if (moderate !== null && intensity <= moderate) return "MODERATE";
  if (intensity <= high) return "MODERATE";
  return "HIGH";
}

export function analyzeDataQuality(records: EmissionRecordRow[]): DataQualityReport {
  if (records.length === 0) {
    return {
      totalRecords: 0,
      completeRecords: 0,
      incompleteRecords: 0,
      pendingRecords: 0,
      missingFacility: 0,
      missingEmissionFactor: 0,
      missingCategory: 0,
      missingUnit: 0,
      missingDates: 0,
      zeroOrInvalidQuantity: 0,
      completenessPercentage: 0,
      status: "NO_DATA",
      issues: ["No emission records logged for this organization."],
    };
  }

  let completeRecords = 0;
  let pendingRecords = 0;
  let missingFacility = 0;
  let missingEmissionFactor = 0;
  let missingCategory = 0;
  let missingUnit = 0;
  let missingDates = 0;
  let zeroOrInvalidQuantity = 0;

  for (const r of records) {
    const issues: string[] = [];
    if (!r.facility_id) {
      missingFacility++;
      issues.push("facility");
    }
    if (!r.emission_factor_info || String(r.emission_factor_info).trim() === "") {
      missingEmissionFactor++;
      issues.push("factor");
    }
    if (!r.category || String(r.category).trim() === "") {
      missingCategory++;
      issues.push("category");
    }
    if (!r.unit || String(r.unit).trim() === "") {
      missingUnit++;
      issues.push("unit");
    }
    if (!r.period_start || !r.period_end) {
      missingDates++;
      issues.push("dates");
    }
    const qty = toNum(r.quantity);
    if (qty <= 0) {
      zeroOrInvalidQuantity++;
      issues.push("quantity");
    }
    const status = (r.status || "pending").toLowerCase();
    if (status === "pending") pendingRecords++;

    if (issues.length === 0 && status === "validated") completeRecords++;
    else if (issues.length === 0) completeRecords++;
  }

  // Recalculate complete as records without structural defects
  completeRecords = 0;
  for (const r of records) {
    const qty = toNum(r.quantity);
    const ok =
      !!r.facility_id &&
      !!r.emission_factor_info &&
      String(r.emission_factor_info).trim() !== "" &&
      !!r.category &&
      !!r.unit &&
      !!r.period_start &&
      !!r.period_end &&
      qty > 0;
    if (ok) completeRecords++;
  }

  const incompleteRecords = records.length - completeRecords;
  const completenessPercentage = Math.round((completeRecords / records.length) * 100);
  const issues: string[] = [];
  if (pendingRecords > 0) issues.push(`${pendingRecords} record(s) pending validation`);
  if (missingFacility > 0) issues.push(`${missingFacility} record(s) missing facility assignment`);
  if (missingEmissionFactor > 0) issues.push(`${missingEmissionFactor} record(s) missing emission factor info`);
  if (missingCategory > 0) issues.push(`${missingCategory} record(s) missing category`);
  if (missingUnit > 0) issues.push(`${missingUnit} record(s) missing unit`);
  if (missingDates > 0) issues.push(`${missingDates} record(s) missing period dates`);
  if (zeroOrInvalidQuantity > 0) issues.push(`${zeroOrInvalidQuantity} record(s) with zero/invalid quantity`);

  let status: DataQualityReport["status"] = "GOOD";
  if (completenessPercentage < 60 || pendingRecords / records.length > 0.5) status = "POOR";
  else if (completenessPercentage < 85 || pendingRecords > 0 || incompleteRecords > 0) status = "NEEDS_REVIEW";

  return {
    totalRecords: records.length,
    completeRecords,
    incompleteRecords,
    pendingRecords,
    missingFacility,
    missingEmissionFactor,
    missingCategory,
    missingUnit,
    missingDates,
    zeroOrInvalidQuantity,
    completenessPercentage,
    status,
    issues,
  };
}

export function analyzeTargets(
  targets: EmissionTargetRow[],
  totalEmissions: number,
  records: EmissionRecordRow[]
): TargetProgress {
  if (!targets || targets.length === 0) {
    return { targetStatus: "NOT_SET", hasTarget: false, targets: [] };
  }

  const mapped = targets.map((t) => {
    let current = totalEmissions;
    if (t.scope) {
      current = records
        .filter((r) => r.scope === t.scope)
        .reduce((s, r) => s + toNum(r.emissions_t_co2e), 0);
    }
    if (t.category) {
      current = records
        .filter((r) => (!t.scope || r.scope === t.scope) && r.category === t.category)
        .reduce((s, r) => s + toNum(r.emissions_t_co2e), 0);
    }

    const targetEmissions = t.target_emissions_t_co2e != null ? toNum(t.target_emissions_t_co2e) : null;
    const reductionPercentage = t.reduction_percentage != null ? toNum(t.reduction_percentage) : null;

    let status: TargetStatus = "NOT_SET";
    let progressPercentage: number | null = null;
    let notes = "Target configured; progress assessed against current inventory only.";

    if (targetEmissions != null && targetEmissions >= 0) {
      if (current <= targetEmissions) {
        status = "ACHIEVED";
        progressPercentage = 100;
        notes = `Current emissions (${round2(current)} tCO₂e) are at or below target (${round2(targetEmissions)} tCO₂e).`;
      } else {
        const overPct = targetEmissions > 0 ? ((current - targetEmissions) / targetEmissions) * 100 : 100;
        progressPercentage = round2(Math.max(0, 100 - overPct));
        if (overPct <= 10) status = "ON_TRACK";
        else if (overPct <= 25) status = "AT_RISK";
        else status = "OFF_TRACK";
        notes = `Current ${round2(current)} tCO₂e vs target ${round2(targetEmissions)} tCO₂e (${round2(overPct)}% above target). Status uses CarbonTrack internal progress bands.`;
      }
    } else if (reductionPercentage != null && reductionPercentage > 0) {
      notes = `Reduction target of ${reductionPercentage}% configured; absolute baseline target_emissions_t_co2e not set — cannot compute numeric progress.`;
      status = "AT_RISK";
    } else {
      status = "NOT_SET";
      notes = "Target row incomplete (no target_emissions_t_co2e or reduction_percentage).";
    }

    return {
      id: t.id,
      targetType: t.target_type,
      targetYear: t.target_year,
      reductionPercentage,
      targetEmissions,
      scope: t.scope,
      category: t.category,
      currentEmissions: round2(current),
      progressPercentage,
      status,
      notes,
    };
  });

  const priorityOrder: TargetStatus[] = ["OFF_TRACK", "AT_RISK", "ON_TRACK", "ACHIEVED", "NOT_SET"];
  let overall: TargetStatus = "NOT_SET";
  for (const s of priorityOrder) {
    if (mapped.some((m) => m.status === s)) {
      overall = s;
      break;
    }
  }

  return { targetStatus: overall, hasTarget: true, targets: mapped };
}

function categoryActionPack(catName: string): {
  title: string;
  actions: string[];
  expectedImpact: ImpactLevel;
  effort: EffortLevel;
  timeframe: string;
  benefit: string;
} {
  const n = catName.toLowerCase();
  if (n.includes("electricity") || n.includes("power")) {
    return {
      title: `Reduce purchased electricity — ${catName}`,
      actions: [
        "Conduct a facility energy audit focused on HVAC and lighting loads",
        "Optimize HVAC set-points and lighting controls",
        "Evaluate renewable electricity tariffs, RECs, or on-site solar feasibility",
        "Install sub-metering for server rooms and high-load zones",
      ],
      expectedImpact: "HIGH",
      effort: "MEDIUM",
      timeframe: "3-12 months",
      benefit: "Material Scope 2 reduction potential when electricity is a hotspot.",
    };
  }
  if (n.includes("cloud") || n.includes("saas") || n.includes("compute")) {
    return {
      title: `Optimize cloud & SaaS carbon footprint — ${catName}`,
      actions: [
        "Rightsize compute and decommission idle staging workloads",
        "Optimize storage and data transfer patterns",
        "Prefer lower-carbon cloud regions where latency allows",
        "Request supplier emissions data from major cloud/SaaS vendors",
      ],
      expectedImpact: "MEDIUM",
      effort: "LOW",
      timeframe: "1-3 months",
      benefit: "Operational and carbon efficiency gains across Scope 3 IT services.",
    };
  }
  if (n.includes("hardware") || n.includes("capital") || n.includes("laptop")) {
    return {
      title: `Sustainable IT hardware lifecycle — ${catName}`,
      actions: [
        "Extend device refresh cycles where performance allows",
        "Prioritize reuse and refurbishment before new procurement",
        "Apply sustainable procurement criteria (e.g. EPEAT / ENERGY STAR)",
        "Implement certified e-waste recycling",
      ],
      expectedImpact: "MEDIUM",
      effort: "LOW",
      timeframe: "Immediate–6 months",
      benefit: "Reduces embodied Scope 3 emissions from capital goods.",
    };
  }
  if (n.includes("commuting") || n.includes("remote") || n.includes("wfh") || n.includes("travel")) {
    return {
      title: `Reduce commuting & travel emissions — ${catName}`,
      actions: [
        "Improve commuting data collection quality",
        "Promote public transport and carpooling incentives",
        "Optimize hybrid work patterns to cut peak commuting",
        "Set sustainable business travel guidelines",
      ],
      expectedImpact: "MEDIUM",
      effort: "MEDIUM",
      timeframe: "3-9 months",
      benefit: "Cuts Scope 3 employee mobility footprint.",
    };
  }
  if (n.includes("combustion") || n.includes("diesel") || n.includes("fuel") || n.includes("generator")) {
    return {
      title: `Optimize fuel & combustion — ${catName}`,
      actions: [
        "Minimize backup generator runtime and improve maintenance schedules",
        "Monitor fuel use with clearer metering",
        "Evaluate electrification / heat-pump feasibility where applicable",
        "Review fleet or equipment efficiency upgrades",
      ],
      expectedImpact: "HIGH",
      effort: "MEDIUM",
      timeframe: "6-18 months",
      benefit: "Direct reduction of Scope 1 fossil combustion.",
    };
  }
  if (n.includes("purchased service") || n.includes("supplier") || n.includes("procurement")) {
    return {
      title: `Engage suppliers on carbon — ${catName}`,
      actions: [
        "Request supplier emissions reporting from top vendors",
        "Add carbon criteria to procurement decisions",
        "Prioritize suppliers with transparent GHG disclosures",
      ],
      expectedImpact: "MEDIUM",
      effort: "MEDIUM",
      timeframe: "6-12 months",
      benefit: "Improves Scope 3 purchased-services transparency and reduction leverage.",
    };
  }
  return {
    title: `Target reduction for ${catName}`,
    actions: [
      `Set category-specific reduction milestones for ${catName}`,
      "Request supplier or operational carbon transparency where relevant",
      "Improve metering and evidence attachments for this category",
    ],
    expectedImpact: "MEDIUM",
    effort: "MEDIUM",
    timeframe: "3-12 months",
    benefit: `Controlled reduction opportunity in ${catName}.`,
  };
}

export function scoreRecommendation(input: {
  contributionPct: number;
  isScopeDominant: boolean;
  trend: TrendDirection;
  benchmarkStatus: BenchmarkStatus;
  targetStatus: TargetStatus;
  dataQualityIssue: boolean;
  facilityHotspot: boolean;
}): { score: number; priority: Priority; scoreFactors: string[] } {
  let score = 20;
  const scoreFactors: string[] = [];

  if (input.contributionPct >= 40) {
    score += 35;
    scoreFactors.push(`Source contributes ${input.contributionPct}% of total emissions`);
  } else if (input.contributionPct >= 25) {
    score += 28;
    scoreFactors.push(`Source contributes ${input.contributionPct}% of total emissions`);
  } else if (input.contributionPct >= 15) {
    score += 20;
    scoreFactors.push(`Source contributes ${input.contributionPct}% of total emissions`);
  } else if (input.contributionPct > 0) {
    score += 8;
    scoreFactors.push(`Source contributes ${input.contributionPct}% of total emissions`);
  }

  if (input.isScopeDominant) {
    score += 18;
    scoreFactors.push("Scope dominance detected (CarbonTrack internal rule)");
  }
  if (input.facilityHotspot) {
    score += 10;
    scoreFactors.push("Facility is a significant emissions hotspot");
  }
  if (input.trend === "INCREASING") {
    score += 15;
    scoreFactors.push("Emissions trend is INCREASING");
  } else if (input.trend === "DECREASING") {
    score -= 5;
    scoreFactors.push("Emissions trend is DECREASING");
  }
  if (input.benchmarkStatus === "HIGH") {
    score += 12;
    scoreFactors.push("Industry intensity benchmark status is HIGH");
  } else if (input.benchmarkStatus === "MODERATE") {
    score += 5;
    scoreFactors.push("Industry intensity benchmark status is MODERATE");
  }
  if (input.targetStatus === "OFF_TRACK") {
    score += 12;
    scoreFactors.push("Organization reduction target is OFF_TRACK");
  } else if (input.targetStatus === "AT_RISK") {
    score += 8;
    scoreFactors.push("Organization reduction target is AT_RISK");
  }
  if (input.dataQualityIssue) {
    score += 6;
    scoreFactors.push("Data quality issues reduce assurance of inventory");
  }

  score = Math.max(0, Math.min(100, Math.round(score)));
  const priority: Priority = score >= 75 ? "HIGH" : score >= 45 ? "MEDIUM" : "LOW";
  return { score, priority, scoreFactors };
}

export function assessConfidence(input: {
  recordCount: number;
  hasCategory: boolean;
  hasFacility: boolean;
  contributionPct: number;
  trend: TrendDirection;
  dataQualityStatus: DataQualityReport["status"];
}): Confidence {
  let points = 0;
  if (input.recordCount >= 5) points += 2;
  else if (input.recordCount >= 2) points += 1;
  if (input.hasCategory) points += 1;
  if (input.hasFacility) points += 1;
  if (input.contributionPct >= 15) points += 1;
  if (input.trend === "INCREASING" || input.trend === "DECREASING" || input.trend === "STABLE") points += 1;
  if (input.dataQualityStatus === "GOOD") points += 1;
  else if (input.dataQualityStatus === "POOR" || input.dataQualityStatus === "NO_DATA") points -= 1;

  if (points >= 5) return "HIGH";
  if (points >= 3) return "MEDIUM";
  return "LOW";
}

export async function ensureSupportingTables(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS carbon_benchmarks (
      id SERIAL PRIMARY KEY,
      industry_vertical VARCHAR(255) NOT NULL,
      metric VARCHAR(255) NOT NULL,
      unit VARCHAR(50) NOT NULL,
      low_threshold NUMERIC(10, 2),
      moderate_threshold NUMERIC(10, 2),
      high_threshold NUMERIC(10, 2),
      source VARCHAR(255),
      source_year INT,
      notes TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS emission_targets (
      id SERIAL PRIMARY KEY,
      organization_id INT REFERENCES organizations(id) ON DELETE CASCADE,
      target_type VARCHAR(100) NOT NULL,
      baseline_period_start DATE,
      baseline_period_end DATE,
      target_year INT,
      reduction_percentage NUMERIC(8, 2),
      target_emissions_t_co2e NUMERIC(15, 4),
      scope VARCHAR(20),
      category VARCHAR(255),
      status VARCHAR(50) DEFAULT 'active',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const countRes = await pool.query("SELECT COUNT(*) FROM carbon_benchmarks");
  if (parseInt(countRes.rows[0].count, 10) === 0) {
    await pool.query(`
      INSERT INTO carbon_benchmarks (industry_vertical, metric, unit, low_threshold, moderate_threshold, high_threshold, source, source_year, notes)
      VALUES
        ('Information Technology & Software Services', 'emission_intensity_per_employee', 'tCO2e/employee', 0.35, 0.60, 1.20, 'DEFRA 2024 / IEA reference ranges for IT & Services (illustrative)', 2024, 'Illustrative intensity bands for software/IT office footprints. Not a GHG Protocol limit.'),
        ('Banking / Finance', 'emission_intensity_per_employee', 'tCO2e/employee', 0.40, 0.75, 1.50, 'CDP Financial Services sector references (illustrative)', 2024, 'Illustrative operational intensity bands. Not a universal regulatory threshold.'),
        ('Manufacturing', 'emission_intensity_per_employee', 'tCO2e/employee', 2.50, 5.00, 12.00, 'IEA industrial intensity references (illustrative)', 2024, 'Illustrative manufacturing intensity bands.'),
        ('Retail', 'emission_intensity_per_employee', 'tCO2e/employee', 0.50, 1.00, 2.50, 'GHG Protocol Retail guidance context (illustrative)', 2024, 'Illustrative retail operational intensity bands.'),
        ('Healthcare', 'emission_intensity_per_employee', 'tCO2e/employee', 1.20, 2.80, 6.00, 'Healthcare footprint references (illustrative)', 2024, 'Illustrative healthcare facility intensity bands.'),
        ('Logistics / Transportation', 'emission_intensity_per_employee', 'tCO2e/employee', 3.00, 7.50, 18.00, 'GLEC-aligned logistics intensity context (illustrative)', 2024, 'Illustrative logistics intensity bands.'),
        ('Education', 'emission_intensity_per_employee', 'tCO2e/employee', 0.30, 0.65, 1.40, 'Higher education campus references (illustrative)', 2024, 'Illustrative campus intensity bands.'),
        ('Telecommunications', 'emission_intensity_per_employee', 'tCO2e/employee', 0.80, 1.80, 4.00, 'Telecom infrastructure references (illustrative)', 2024, 'Illustrative telecom intensity bands.'),
        ('Other', 'emission_intensity_per_employee', 'tCO2e/employee', 0.50, 1.00, 2.50, 'CarbonTrack Internal Reference Standard', 2026, 'CarbonTrack internal alert thresholds for general commercial enterprise. Not an official external standard.');
    `);
  }
}

/**
 * Build full recommendation payload for a single organization.
 * organizationId MUST come from JWT (req.user.organizationId).
 */
export async function buildRecommendationPayload(organizationId: number): Promise<RecommendationPayload> {
  await ensureSupportingTables();

  const orgRes = await pool.query(
    "SELECT id, name, industry_vertical, headcount, ef_standard FROM organizations WHERE id = $1",
    [organizationId]
  );
  if (orgRes.rows.length === 0) {
    const err: any = new Error("Organization not found.");
    err.status = 404;
    throw err;
  }

  const org = orgRes.rows[0];
  const orgName = org.name || `Organization #${organizationId}`;
  const industryVertical = org.industry_vertical || "Other";
  const rawHeadcount = org.headcount || "";
  const numericHeadcount = parseNumericHeadcount(rawHeadcount);

  const recordsRes = await pool.query(
    `SELECT r.*, f.facility_name
     FROM emissions_records r
     LEFT JOIN facilities f ON r.facility_id = f.id AND f.organization_id = r.organization_id
     WHERE r.organization_id = $1
     ORDER BY r.period_start ASC, r.created_at ASC`,
    [organizationId]
  );
  const records: EmissionRecordRow[] = recordsRes.rows;

  const targetsRes = await pool.query(
    `SELECT * FROM emission_targets
     WHERE organization_id = $1 AND COALESCE(status, 'active') = 'active'
     ORDER BY id ASC`,
    [organizationId]
  );
  const targets: EmissionTargetRow[] = targetsRes.rows;

  const totalEmissions = round2(records.reduce((s, r) => s + toNum(r.emissions_t_co2e), 0));
  const recordCount = records.length;

  const scopeBuckets = ["scope1", "scope2", "scope3"] as const;
  const scopeTotals: Record<string, { emissions: number; count: number }> = {
    scope1: { emissions: 0, count: 0 },
    scope2: { emissions: 0, count: 0 },
    scope3: { emissions: 0, count: 0 },
  };
  for (const r of records) {
    const sc = (r.scope || "").toLowerCase();
    if (scopeTotals[sc]) {
      scopeTotals[sc].emissions += toNum(r.emissions_t_co2e);
      scopeTotals[sc].count += 1;
    }
  }
  for (const sc of scopeBuckets) {
    scopeTotals[sc].emissions = round2(scopeTotals[sc].emissions);
  }

  const pct = (part: number) => (totalEmissions > 0 ? round2((part / totalEmissions) * 100) : 0);

  let highestScope = "scope1";
  let highestScopeAmount = scopeTotals.scope1.emissions;
  for (const sc of scopeBuckets) {
    if (scopeTotals[sc].emissions >= highestScopeAmount) {
      highestScope = sc;
      highestScopeAmount = scopeTotals[sc].emissions;
    }
  }
  if (totalEmissions === 0) highestScope = "n/a";

  // Intensity
  let emissionIntensity: number | null = null;
  let intensityCalculable = false;
  let intensityMessage = "";
  if (numericHeadcount && numericHeadcount > 0 && totalEmissions > 0) {
    emissionIntensity = round2(totalEmissions / numericHeadcount);
    intensityCalculable = true;
    intensityMessage = `${emissionIntensity} tCO₂e per employee (${totalEmissions} / ${numericHeadcount})`;
  } else if (!numericHeadcount) {
    intensityMessage = "Emission intensity unavailable because organization headcount is not configured.";
  } else {
    intensityMessage = "Intensity not calculated — no active emission records.";
  }

  // Benchmarks (global industry table — not org-specific)
  const benchmarkRes = await pool.query(
    `SELECT * FROM carbon_benchmarks
     WHERE LOWER(industry_vertical) = LOWER($1)
        OR LOWER($1) LIKE '%' || LOWER(industry_vertical) || '%'
        OR LOWER(industry_vertical) LIKE '%' || LOWER($1) || '%'
     ORDER BY id ASC LIMIT 1`,
    [industryVertical]
  );
  let benchmarkRow: CarbonBenchmarkRow | null = benchmarkRes.rows[0] || null;
  if (!benchmarkRow) {
    const fb = await pool.query("SELECT * FROM carbon_benchmarks WHERE industry_vertical = 'Other' LIMIT 1");
    benchmarkRow = fb.rows[0] || null;
  }

  let benchmarkLow: number | null = null;
  let benchmarkModerate: number | null = null;
  let benchmarkHigh: number | null = null;
  let benchmarkStatus: BenchmarkStatus = "NOT_AVAILABLE";
  let benchmarkSource = "";
  let benchmarkYear: number | null = null;
  let benchmarkNotes = "";

  if (benchmarkRow) {
    benchmarkLow = benchmarkRow.low_threshold != null ? toNum(benchmarkRow.low_threshold) : null;
    benchmarkModerate = benchmarkRow.moderate_threshold != null ? toNum(benchmarkRow.moderate_threshold) : null;
    benchmarkHigh = benchmarkRow.high_threshold != null ? toNum(benchmarkRow.high_threshold) : null;
    benchmarkSource = benchmarkRow.source || "";
    benchmarkYear = benchmarkRow.source_year || null;
    benchmarkNotes = benchmarkRow.notes || "";
    benchmarkStatus = classifyBenchmarkStatusCorrected(
      emissionIntensity,
      benchmarkLow,
      benchmarkModerate,
      benchmarkHigh
    );
    if (!intensityCalculable) {
      benchmarkStatus = "NOT_AVAILABLE";
      benchmarkNotes = "Headcount not configured. Benchmark intensity comparison requires valid headcount.";
    }
  } else {
    benchmarkNotes = "No industry benchmark row available.";
  }

  // Categories
  const categoryMap = new Map<string, { scope: string; emissions: number; count: number; records: EmissionRecordRow[] }>();
  for (const r of records) {
    const cat = r.category || "Uncategorized";
    if (!categoryMap.has(cat)) {
      categoryMap.set(cat, { scope: r.scope || "scope1", emissions: 0, count: 0, records: [] });
    }
    const entry = categoryMap.get(cat)!;
    entry.emissions += toNum(r.emissions_t_co2e);
    entry.count += 1;
    entry.records.push(r);
  }

  const topCategories: CategoryAnalysisItem[] = Array.from(categoryMap.entries())
    .map(([name, data]) => {
      const percentage = pct(data.emissions);
      const catTrend = computeTrend(data.records);
      return {
        name,
        scope: data.scope,
        emissions: round2(data.emissions),
        percentage,
        recordCount: data.count,
        trend: catTrend.trend,
        isHotspot: percentage >= CATEGORY_HOTSPOT_PCT,
      };
    })
    .sort((a, b) => b.emissions - a.emissions);

  const highestCategory = topCategories[0]?.name || "N/A";
  const highestCategoryEmissions = topCategories[0]?.emissions || 0;
  const highestCategoryPct = topCategories[0]?.percentage || 0;

  // Facilities
  const facilityMap = new Map<
    string,
    {
      facilityId: number | null;
      facilityName: string;
      emissions: number;
      count: number;
      records: EmissionRecordRow[];
      scopes: Record<string, number>;
      categories: Record<string, number>;
    }
  >();

  for (const r of records) {
    const key = r.facility_id != null ? `id:${r.facility_id}` : "unassigned";
    const name = r.facility_name || "Unassigned Facility";
    if (!facilityMap.has(key)) {
      facilityMap.set(key, {
        facilityId: r.facility_id,
        facilityName: name,
        emissions: 0,
        count: 0,
        records: [],
        scopes: { scope1: 0, scope2: 0, scope3: 0 },
        categories: {},
      });
    }
    const f = facilityMap.get(key)!;
    const em = toNum(r.emissions_t_co2e);
    f.emissions += em;
    f.count += 1;
    f.records.push(r);
    const sc = (r.scope || "").toLowerCase();
    if (f.scopes[sc] !== undefined) f.scopes[sc] += em;
    const cat = r.category || "Uncategorized";
    f.categories[cat] = (f.categories[cat] || 0) + em;
  }

  const facilityAnalysis: FacilityAnalysisItem[] = Array.from(facilityMap.values())
    .map((f) => {
      const percentage = pct(f.emissions);
      const fTrend = computeTrend(f.records);
      const scopeBreakdown = Object.entries(f.scopes)
        .map(([scope, emissions]) => ({
          scope,
          emissions: round2(emissions),
          percentage: f.emissions > 0 ? round2((emissions / f.emissions) * 100) : 0,
        }))
        .filter((s) => s.emissions > 0);
      const topCats = Object.entries(f.categories)
        .map(([category, emissions]) => ({
          category,
          emissions: round2(emissions),
          percentage: f.emissions > 0 ? round2((emissions / f.emissions) * 100) : 0,
        }))
        .sort((a, b) => b.emissions - a.emissions)
        .slice(0, 5);

      return {
        facilityId: f.facilityId,
        facilityName: f.facilityName,
        emissions: round2(f.emissions),
        percentage,
        recordCount: f.count,
        trend: fTrend.trend,
        scopeBreakdown,
        topCategories: topCats,
        isHotspot: percentage >= FACILITY_HOTSPOT_PCT,
      };
    })
    .sort((a, b) => b.emissions - a.emissions);

  const facilityCount = new Set(records.map((r) => r.facility_id).filter((id) => id != null)).size;
  const highestFacility = facilityAnalysis[0]?.facilityName || "N/A";
  const highestFacilityEmissions = facilityAnalysis[0]?.emissions || 0;
  const highestFacilityPct = facilityAnalysis[0]?.percentage || 0;

  // Reporting period
  let reportingPeriodStart: string | null = null;
  let reportingPeriodEnd: string | null = null;
  const starts = records.map((r) => parseDate(r.period_start)).filter(Boolean) as Date[];
  const ends = records.map((r) => parseDate(r.period_end)).filter(Boolean) as Date[];
  if (starts.length) reportingPeriodStart = new Date(Math.min(...starts.map((d) => d.getTime()))).toISOString().slice(0, 10);
  if (ends.length) reportingPeriodEnd = new Date(Math.max(...ends.map((d) => d.getTime()))).toISOString().slice(0, 10);

  const overallTrend = computeTrend(records);
  const dataQuality = analyzeDataQuality(records);
  const targetProgress = analyzeTargets(targets, totalEmissions, records);

  const scopeAnalysis: ScopeAnalysisItem[] = scopeBuckets.map((sc) => {
    const scopeRecords = records.filter((r) => (r.scope || "").toLowerCase() === sc);
    const t = computeTrend(scopeRecords);
    const names: Record<string, string> = {
      scope1: "Scope 1 Direct",
      scope2: "Scope 2 Electricity",
      scope3: "Scope 3 Value Chain",
    };
    return {
      scope: sc,
      name: names[sc],
      emissions: scopeTotals[sc].emissions,
      percentage: pct(scopeTotals[sc].emissions),
      recordCount: scopeTotals[sc].count,
      trend: t.trend,
    };
  });

  // ---------- Generate recommendations ----------
  const recommendations: RecommendationItem[] = [];
  const seenKeys = new Set<string>();

  const pushRec = (rec: RecommendationItem) => {
    if (seenKeys.has(rec.id)) return;
    seenKeys.add(rec.id);
    recommendations.push(rec);
  };

  if (totalEmissions === 0) {
    // Empty state: only guidance to log data — no fake reduction projects
    pushRec({
      id: "rec-no-data",
      priority: "HIGH",
      score: 90,
      confidence: "HIGH",
      scoreFactors: ["No emissions inventory available"],
      scope: "general",
      category: "Emissions Logging & Ingestion",
      facility: null,
      title: "Start logging emissions activity data",
      problem: `No active emission activity records are logged for ${orgName}.`,
      reason: "Recommendations require organization-scoped emissions data in PostgreSQL.",
      actions: [
        "Log electricity, fuel, cloud/SaaS, hardware, and commuting activities",
        "Assign facilities to each activity where possible",
        "Attach evidence PDFs for audit readiness",
      ],
      expectedImpact: "HIGH",
      effort: "LOW",
      timeframe: "Immediate",
      trend: "NO_DATA",
      sourceContributionPercentage: 0,
      emissions: 0,
      expectedBenefit: "Establishes baseline inventory required for reduction analysis.",
      benchmarkStatus,
    });
  } else {
    // Scope dominance (CarbonTrack internal thresholds)
    const s2pct = pct(scopeTotals.scope2.emissions);
    const s1pct = pct(scopeTotals.scope1.emissions);
    const s3pct = pct(scopeTotals.scope3.emissions);

    if (highestScope === "scope2" && s2pct >= SCOPE_DOMINANCE.scope2) {
      const scoring = scoreRecommendation({
        contributionPct: s2pct,
        isScopeDominant: true,
        trend: scopeAnalysis.find((s) => s.scope === "scope2")?.trend || overallTrend.trend,
        benchmarkStatus,
        targetStatus: targetProgress.targetStatus,
        dataQualityIssue: dataQuality.status !== "GOOD",
        facilityHotspot: false,
      });
      pushRec({
        id: "rec-scope2-dominant",
        ...scoring,
        confidence: assessConfidence({
          recordCount: scopeTotals.scope2.count,
          hasCategory: true,
          hasFacility: facilityCount > 0,
          contributionPct: s2pct,
          trend: scopeAnalysis.find((s) => s.scope === "scope2")?.trend || "NO_DATA",
          dataQualityStatus: dataQuality.status,
        }),
        scope: "scope2",
        category: "Purchased Electricity",
        facility: highestFacility !== "N/A" ? highestFacility : null,
        title:
          highestFacility !== "N/A" && highestFacilityPct >= FACILITY_HOTSPOT_PCT
            ? `Reduce purchased electricity at ${highestFacility}`
            : "Reduce Scope 2 purchased electricity",
        problem: `Scope 2 represents ${s2pct}% of total emissions (${scopeTotals.scope2.emissions} tCO₂e).`,
        reason: `CarbonTrack internal scope-dominance rule: Scope 2 share ≥ ${SCOPE_DOMINANCE.scope2}%.`,
        actions: [
          "Transition power contracts toward renewable tariffs or PPAs where available",
          "Install smart sub-metering for IT/server rooms",
          "Optimize HVAC temperature set-points and lighting controls",
        ],
        expectedImpact: "HIGH",
        effort: "MEDIUM",
        timeframe: "3-12 months",
        trend: scopeAnalysis.find((s) => s.scope === "scope2")?.trend || overallTrend.trend,
        sourceContributionPercentage: s2pct,
        emissions: scopeTotals.scope2.emissions,
        expectedBenefit: "Material reduction opportunity in purchased electricity footprint.",
        benchmarkStatus,
      });
    } else if (highestScope === "scope1" && s1pct >= SCOPE_DOMINANCE.scope1) {
      const scoring = scoreRecommendation({
        contributionPct: s1pct,
        isScopeDominant: true,
        trend: scopeAnalysis.find((s) => s.scope === "scope1")?.trend || overallTrend.trend,
        benchmarkStatus,
        targetStatus: targetProgress.targetStatus,
        dataQualityIssue: dataQuality.status !== "GOOD",
        facilityHotspot: false,
      });
      pushRec({
        id: "rec-scope1-dominant",
        ...scoring,
        confidence: assessConfidence({
          recordCount: scopeTotals.scope1.count,
          hasCategory: true,
          hasFacility: facilityCount > 0,
          contributionPct: s1pct,
          trend: scopeAnalysis.find((s) => s.scope === "scope1")?.trend || "NO_DATA",
          dataQualityStatus: dataQuality.status,
        }),
        scope: "scope1",
        category: "Stationary & Mobile Combustion",
        facility: null,
        title: "Reduce Scope 1 direct combustion emissions",
        problem: `Scope 1 represents ${s1pct}% of total emissions (${scopeTotals.scope1.emissions} tCO₂e).`,
        reason: `CarbonTrack internal scope-dominance rule: Scope 1 share ≥ ${SCOPE_DOMINANCE.scope1}%.`,
        actions: [
          "Upgrade or optimize emergency generators",
          "Schedule burner/equipment maintenance",
          "Evaluate heat-pump electrification where feasible",
        ],
        expectedImpact: "HIGH",
        effort: "MEDIUM",
        timeframe: "6-18 months",
        trend: scopeAnalysis.find((s) => s.scope === "scope1")?.trend || overallTrend.trend,
        sourceContributionPercentage: s1pct,
        emissions: scopeTotals.scope1.emissions,
        expectedBenefit: "Direct reduction of onsite fossil fuel combustion.",
        benchmarkStatus,
      });
    } else if (highestScope === "scope3" && s3pct >= SCOPE_DOMINANCE.scope3) {
      const scoring = scoreRecommendation({
        contributionPct: s3pct,
        isScopeDominant: true,
        trend: scopeAnalysis.find((s) => s.scope === "scope3")?.trend || overallTrend.trend,
        benchmarkStatus,
        targetStatus: targetProgress.targetStatus,
        dataQualityIssue: dataQuality.status !== "GOOD",
        facilityHotspot: false,
      });
      pushRec({
        id: "rec-scope3-dominant",
        ...scoring,
        confidence: assessConfidence({
          recordCount: scopeTotals.scope3.count,
          hasCategory: true,
          hasFacility: facilityCount > 0,
          contributionPct: s3pct,
          trend: scopeAnalysis.find((s) => s.scope === "scope3")?.trend || "NO_DATA",
          dataQualityStatus: dataQuality.status,
        }),
        scope: "scope3",
        category: "Value Chain",
        facility: null,
        title: "Address Scope 3 value-chain hotspots",
        problem: `Scope 3 represents ${s3pct}% of total emissions (${scopeTotals.scope3.emissions} tCO₂e).`,
        reason: `CarbonTrack internal scope-dominance rule: Scope 3 share ≥ ${SCOPE_DOMINANCE.scope3}%.`,
        actions: [
          "Engage top suppliers on carbon reporting",
          "Optimize cloud server utilization and rightsizing",
          "Enforce sustainable business travel policies",
        ],
        expectedImpact: "HIGH",
        effort: "MEDIUM",
        timeframe: "3-12 months",
        trend: scopeAnalysis.find((s) => s.scope === "scope3")?.trend || overallTrend.trend,
        sourceContributionPercentage: s3pct,
        emissions: scopeTotals.scope3.emissions,
        expectedBenefit: "Systemic reduction across upstream IT services and supply chain.",
        benchmarkStatus,
      });
    }

    // Category hotspots — only categories present in data
    topCategories.forEach((cat, idx) => {
      if (!cat.isHotspot) return;
      const catLower = cat.name.toLowerCase();
      if (catLower.includes("electricity") && highestScope === "scope2" && s2pct >= SCOPE_DOMINANCE.scope2) {
        return; // avoid duplicate electricity/scope2 cards
      }

      const pack = categoryActionPack(cat.name);
      const scoring = scoreRecommendation({
        contributionPct: cat.percentage,
        isScopeDominant: false,
        trend: cat.trend,
        benchmarkStatus,
        targetStatus: targetProgress.targetStatus,
        dataQualityIssue: dataQuality.status !== "GOOD",
        facilityHotspot: false,
      });

      pushRec({
        id: `rec-cat-${idx}`,
        ...scoring,
        confidence: assessConfidence({
          recordCount: cat.recordCount,
          hasCategory: true,
          hasFacility: facilityCount > 0,
          contributionPct: cat.percentage,
          trend: cat.trend,
          dataQualityStatus: dataQuality.status,
        }),
        scope: cat.scope,
        category: cat.name,
        facility: null,
        title: pack.title,
        problem: `${cat.name} accounts for ${cat.percentage}% of total emissions (${cat.emissions} tCO₂e).`,
        reason: `CarbonTrack internal category hotspot rule: contribution ≥ ${CATEGORY_HOTSPOT_PCT}% of total.`,
        actions: pack.actions,
        expectedImpact: pack.expectedImpact,
        effort: pack.effort,
        timeframe: pack.timeframe,
        trend: cat.trend,
        sourceContributionPercentage: cat.percentage,
        emissions: cat.emissions,
        expectedBenefit: pack.benefit,
        benchmarkStatus,
      });
    });

    // Facility hotspots
    facilityAnalysis.forEach((fac, idx) => {
      if (!fac.isHotspot || fac.facilityName === "Unassigned Facility") return;
      const topCat = fac.topCategories[0]?.category || "operations";
      const scoring = scoreRecommendation({
        contributionPct: fac.percentage,
        isScopeDominant: false,
        trend: fac.trend,
        benchmarkStatus,
        targetStatus: targetProgress.targetStatus,
        dataQualityIssue: false,
        facilityHotspot: true,
      });
      pushRec({
        id: `rec-facility-${idx}`,
        ...scoring,
        confidence: assessConfidence({
          recordCount: fac.recordCount,
          hasCategory: !!topCat,
          hasFacility: true,
          contributionPct: fac.percentage,
          trend: fac.trend,
          dataQualityStatus: dataQuality.status,
        }),
        scope: fac.scopeBreakdown[0]?.scope || "general",
        category: topCat,
        facility: fac.facilityName,
        title: `Reduce emissions at ${fac.facilityName}`,
        problem: `${fac.facilityName} contributes ${fac.percentage}% of total emissions (${fac.emissions} tCO₂e).`,
        reason: `CarbonTrack internal facility hotspot rule: contribution ≥ ${FACILITY_HOTSPOT_PCT}% of total.`,
        actions: [
          `Prioritize metering and efficiency projects at ${fac.facilityName}`,
          `Focus first on ${topCat} at this site`,
          "Assign clear site-level reduction owners and evidence packs",
        ],
        expectedImpact: fac.percentage >= 40 ? "HIGH" : "MEDIUM",
        effort: "MEDIUM",
        timeframe: "3-12 months",
        trend: fac.trend,
        sourceContributionPercentage: fac.percentage,
        emissions: fac.emissions,
        expectedBenefit: `Site-specific reduction at ${fac.facilityName}.`,
        benchmarkStatus,
      });
    });

    // Trend alert
    if (overallTrend.trend === "INCREASING") {
      const scoring = scoreRecommendation({
        contributionPct: 100,
        isScopeDominant: false,
        trend: "INCREASING",
        benchmarkStatus,
        targetStatus: targetProgress.targetStatus,
        dataQualityIssue: false,
        facilityHotspot: false,
      });
      pushRec({
        id: "rec-trend-alert",
        ...scoring,
        confidence: assessConfidence({
          recordCount,
          hasCategory: true,
          hasFacility: facilityCount > 0,
          contributionPct: 100,
          trend: "INCREASING",
          dataQualityStatus: dataQuality.status,
        }),
        scope: "general",
        category: "Emission Trend Control",
        facility: null,
        title: "Arrest rising emissions trend",
        problem: overallTrend.explanation,
        reason: `CarbonTrack internal trend rule: change ≥ +${TREND_CHANGE_PCT}%.`,
        actions: [
          "Audit recent facility expansion and procurement invoices",
          "Review electricity and cloud spend spikes in the latest periods",
          "Set interim monthly monitoring checkpoints",
        ],
        expectedImpact: "HIGH",
        effort: "MEDIUM",
        timeframe: "1-3 months",
        trend: "INCREASING",
        sourceContributionPercentage: 100,
        emissions: totalEmissions,
        expectedBenefit: "Halts upward carbon trajectory.",
        benchmarkStatus,
      });
    }

    // Benchmark HIGH
    if (benchmarkStatus === "HIGH" && benchmarkHigh != null && emissionIntensity != null) {
      const scoring = scoreRecommendation({
        contributionPct: 100,
        isScopeDominant: false,
        trend: overallTrend.trend,
        benchmarkStatus: "HIGH",
        targetStatus: targetProgress.targetStatus,
        dataQualityIssue: false,
        facilityHotspot: false,
      });
      pushRec({
        id: "rec-benchmark-high",
        ...scoring,
        confidence: intensityCalculable ? "MEDIUM" : "LOW",
        scope: "general",
        category: "Industry Benchmark Alignment",
        facility: null,
        title: "Align intensity with industry benchmark band",
        problem: `Intensity ${emissionIntensity} tCO₂e/employee exceeds high threshold (${benchmarkHigh}) for ${industryVertical}.`,
        reason: "Industry benchmark comparison (illustrative reference ranges — not a GHG Protocol limit).",
        actions: [
          "Form a Net-Zero / energy efficiency working group",
          "Prioritize Scope 1 & 2 efficiency measures first",
          "Revisit headcount and intensity methodology assumptions",
        ],
        expectedImpact: "HIGH",
        effort: "HIGH",
        timeframe: "6-24 months",
        trend: overallTrend.trend,
        sourceContributionPercentage: 100,
        emissions: totalEmissions,
        expectedBenefit: "Moves intensity toward peer reference band.",
        benchmarkStatus,
      });
    }

    // Target risk
    if (targetProgress.hasTarget && (targetProgress.targetStatus === "AT_RISK" || targetProgress.targetStatus === "OFF_TRACK")) {
      const t = targetProgress.targets.find((x) => x.status === targetProgress.targetStatus) || targetProgress.targets[0];
      const scoring = scoreRecommendation({
        contributionPct: 50,
        isScopeDominant: false,
        trend: overallTrend.trend,
        benchmarkStatus,
        targetStatus: targetProgress.targetStatus,
        dataQualityIssue: false,
        facilityHotspot: false,
      });
      pushRec({
        id: "rec-target-risk",
        ...scoring,
        confidence: "MEDIUM",
        scope: t?.scope || "general",
        category: t?.category || "Reduction Target",
        facility: null,
        title: `Address ${targetProgress.targetStatus.replace("_", " ").toLowerCase()} reduction target`,
        problem: t?.notes || "Organization reduction target is not on track.",
        reason: "Company-specific emission_targets progress assessment (CarbonTrack internal bands).",
        actions: [
          "Re-baseline current inventory against the configured target",
          "Accelerate hotspot actions already identified in this report",
          "Update target owners and quarterly checkpoints",
        ],
        expectedImpact: "HIGH",
        effort: "HIGH",
        timeframe: "Ongoing",
        trend: overallTrend.trend,
        sourceContributionPercentage: 50,
        emissions: t?.currentEmissions || totalEmissions,
        expectedBenefit: "Improves likelihood of meeting configured organizational target.",
        benchmarkStatus,
      });
    }

    // Data quality — only when real issues exist
    if (dataQuality.status === "NEEDS_REVIEW" || dataQuality.status === "POOR") {
      const scoring = scoreRecommendation({
        contributionPct: 10,
        isScopeDominant: false,
        trend: "NO_DATA",
        benchmarkStatus,
        targetStatus: targetProgress.targetStatus,
        dataQualityIssue: true,
        facilityHotspot: false,
      });
      pushRec({
        id: "rec-data-quality",
        ...scoring,
        confidence: "HIGH",
        scope: "general",
        category: "ESG Data Quality",
        facility: null,
        title: "Improve emissions data quality",
        problem: dataQuality.issues.join("; ") || "Incomplete inventory records detected.",
        reason: `Completeness ${dataQuality.completenessPercentage}% with ${dataQuality.incompleteRecords} incomplete and ${dataQuality.pendingRecords} pending records.`,
        actions: [
          "Assign facilities to unassigned records",
          "Add emission factor information and units where missing",
          "Validate pending records and attach evidence PDFs",
        ],
        expectedImpact: "MEDIUM",
        effort: "LOW",
        timeframe: "Immediate–1 month",
        trend: overallTrend.trend,
        sourceContributionPercentage: 0,
        emissions: totalEmissions,
        expectedBenefit: "Improves audit readiness and recommendation confidence.",
        benchmarkStatus,
      });
    }
  }

  recommendations.sort((a, b) => b.score - a.score || (a.priority === b.priority ? 0 : a.priority === "HIGH" ? -1 : 1));

  return {
    success: true,
    meta: {
      ruleNotes: [
        `Category hotspot ≥ ${CATEGORY_HOTSPOT_PCT}% is a CarbonTrack internal analytical rule (not a GHG Protocol limit).`,
        `Facility hotspot ≥ ${FACILITY_HOTSPOT_PCT}% is a CarbonTrack internal analytical rule.`,
        `Trend ±${TREND_CHANGE_PCT}% bands are CarbonTrack internal analytical rules.`,
        "Industry benchmarks are illustrative reference ranges, not universal regulatory limits.",
        "GHG Protocol is an accounting/reporting framework, not a company emissions threshold standard.",
      ],
      generatedAt: new Date().toISOString(),
    },
    summary: {
      organizationId,
      organizationName: orgName,
      industryVertical,
      headcountRaw: rawHeadcount,
      numericHeadcount,
      totalEmissions,
      emissionIntensity,
      intensityUnit: "tCO2e/employee",
      intensityCalculable,
      intensityMessage,
      highestScope,
      highestScopeEmissions: round2(highestScopeAmount),
      highestScopePercentage: pct(highestScopeAmount),
      highestCategory,
      highestCategoryEmissions,
      highestCategoryPercentage: highestCategoryPct,
      highestFacility,
      highestFacilityEmissions,
      highestFacilityPercentage: highestFacilityPct,
      recordCount,
      facilityCount,
      reportingPeriodStart,
      reportingPeriodEnd,
      trend: overallTrend.trend,
      trendPercentageChange: overallTrend.changePercentage,
      trendExplanation: overallTrend.explanation,
      benchmarkStatus,
      targetStatus: targetProgress.targetStatus,
    },
    benchmark: {
      isAvailable: benchmarkStatus !== "NOT_AVAILABLE",
      industryVertical,
      metric: benchmarkRow?.metric || "emission_intensity_per_employee",
      unit: benchmarkRow?.unit || "tCO2e/employee",
      lowThreshold: benchmarkLow,
      moderateThreshold: benchmarkModerate,
      highThreshold: benchmarkHigh,
      status: benchmarkStatus,
      source: benchmarkSource,
      sourceYear: benchmarkYear,
      notes: benchmarkNotes,
      classificationNote:
        "LOW ≤ low_threshold; MODERATE ≤ high_threshold (moderate_threshold marks mid-band); HIGH > high_threshold. Illustrative only.",
    },
    scopeAnalysis,
    topCategories,
    facilityAnalysis,
    trend: overallTrend,
    targetProgress,
    dataQuality,
    recommendations,
  };
}
