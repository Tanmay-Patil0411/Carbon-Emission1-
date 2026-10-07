/**
 * CarbonTrack Recommendation Engine Types
 *
 * Threshold notes:
 * - Category hotspot (>=15%), trend (±10%), and scope-dominance cutoffs are
 *   CarbonTrack INTERNAL analytical rules — not GHG Protocol limits.
 */

export type TrendDirection = "INCREASING" | "DECREASING" | "STABLE" | "NO_DATA";
export type Priority = "HIGH" | "MEDIUM" | "LOW";
export type Confidence = "HIGH" | "MEDIUM" | "LOW";
export type BenchmarkStatus = "LOW" | "MODERATE" | "HIGH" | "NOT_AVAILABLE";
export type TargetStatus = "ON_TRACK" | "AT_RISK" | "OFF_TRACK" | "ACHIEVED" | "NOT_SET";
export type ImpactLevel = "HIGH" | "MEDIUM" | "LOW";
export type EffortLevel = "LOW" | "MEDIUM" | "HIGH";

export interface CarbonBenchmarkRow {
  id: number;
  industry_vertical: string;
  metric: string;
  unit: string;
  low_threshold: string | number | null;
  moderate_threshold: string | number | null;
  high_threshold: string | number | null;
  source: string;
  source_year: number;
  notes: string;
}

export interface EmissionRecordRow {
  id: string;
  organization_id: number;
  facility_id: number | null;
  facility_name: string | null;
  scope: string;
  category: string;
  activity_type: string | null;
  equipment_type: string | null;
  quantity: string | number;
  unit: string;
  input_mode: string;
  period_start: string | Date;
  period_end: string | Date;
  emissions_t_co2e: string | number;
  emission_factor_info: string | null;
  status: string | null;
  notes: string | null;
}

export interface EmissionTargetRow {
  id: number;
  organization_id: number;
  target_type: string;
  baseline_period_start: string | Date | null;
  baseline_period_end: string | Date | null;
  target_year: number | null;
  reduction_percentage: string | number | null;
  target_emissions_t_co2e: string | number | null;
  scope: string | null;
  category: string | null;
  status: string;
}

export interface TrendResult {
  trend: TrendDirection;
  changePercentage: number;
  currentEmissions: number;
  previousEmissions: number;
  explanation: string;
  method: string;
}

export interface ScopeAnalysisItem {
  scope: string;
  name: string;
  emissions: number;
  percentage: number;
  recordCount: number;
  trend: TrendDirection;
}

export interface CategoryAnalysisItem {
  name: string;
  scope: string;
  emissions: number;
  percentage: number;
  recordCount: number;
  trend: TrendDirection;
  isHotspot: boolean;
}

export interface FacilityAnalysisItem {
  facilityId: number | null;
  facilityName: string;
  emissions: number;
  percentage: number;
  recordCount: number;
  trend: TrendDirection;
  scopeBreakdown: { scope: string; emissions: number; percentage: number }[];
  topCategories: { category: string; emissions: number; percentage: number }[];
  isHotspot: boolean;
}

export interface DataQualityReport {
  totalRecords: number;
  completeRecords: number;
  incompleteRecords: number;
  pendingRecords: number;
  missingFacility: number;
  missingEmissionFactor: number;
  missingCategory: number;
  missingUnit: number;
  missingDates: number;
  zeroOrInvalidQuantity: number;
  completenessPercentage: number;
  status: "GOOD" | "NEEDS_REVIEW" | "POOR" | "NO_DATA";
  issues: string[];
}

export interface TargetProgress {
  targetStatus: TargetStatus;
  hasTarget: boolean;
  targets: Array<{
    id: number;
    targetType: string;
    targetYear: number | null;
    reductionPercentage: number | null;
    targetEmissions: number | null;
    scope: string | null;
    category: string | null;
    currentEmissions: number;
    progressPercentage: number | null;
    status: TargetStatus;
    notes: string;
  }>;
}

export interface RecommendationItem {
  id: string;
  priority: Priority;
  score: number;
  confidence: Confidence;
  scoreFactors: string[];
  scope: string;
  category: string;
  facility: string | null;
  title: string;
  problem: string;
  reason: string;
  actions: string[];
  expectedImpact: ImpactLevel;
  effort: EffortLevel;
  timeframe: string;
  trend: TrendDirection;
  sourceContributionPercentage: number;
  emissions: number;
  expectedBenefit: string;
  benchmarkStatus: BenchmarkStatus;
}

export interface RecommendationPayload {
  success: true;
  meta: {
    ruleNotes: string[];
    generatedAt: string;
  };
  summary: {
    organizationId: number;
    organizationName: string;
    industryVertical: string;
    headcountRaw: string;
    numericHeadcount: number | null;
    totalEmissions: number;
    emissionIntensity: number | null;
    intensityUnit: string;
    intensityCalculable: boolean;
    intensityMessage: string;
    highestScope: string;
    highestScopeEmissions: number;
    highestScopePercentage: number;
    highestCategory: string;
    highestCategoryEmissions: number;
    highestCategoryPercentage: number;
    highestFacility: string;
    highestFacilityEmissions: number;
    highestFacilityPercentage: number;
    recordCount: number;
    facilityCount: number;
    reportingPeriodStart: string | null;
    reportingPeriodEnd: string | null;
    trend: TrendDirection;
    trendPercentageChange: number;
    trendExplanation: string;
    benchmarkStatus: BenchmarkStatus;
    targetStatus: TargetStatus;
  };
  benchmark: {
    isAvailable: boolean;
    industryVertical: string;
    metric: string;
    unit: string;
    lowThreshold: number | null;
    moderateThreshold: number | null;
    highThreshold: number | null;
    status: BenchmarkStatus;
    source: string;
    sourceYear: number | null;
    notes: string;
    classificationNote: string;
  };
  scopeAnalysis: ScopeAnalysisItem[];
  topCategories: CategoryAnalysisItem[];
  facilityAnalysis: FacilityAnalysisItem[];
  trend: TrendResult;
  targetProgress: TargetProgress;
  dataQuality: DataQualityReport;
  recommendations: RecommendationItem[];
}
