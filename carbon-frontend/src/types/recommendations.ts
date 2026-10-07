export type TrendDirection = "INCREASING" | "DECREASING" | "STABLE" | "NO_DATA";
export type Priority = "HIGH" | "MEDIUM" | "LOW";
export type Confidence = "HIGH" | "MEDIUM" | "LOW";
export type BenchmarkStatus = "LOW" | "MODERATE" | "HIGH" | "NOT_AVAILABLE";
export type TargetStatus = "ON_TRACK" | "AT_RISK" | "OFF_TRACK" | "ACHIEVED" | "NOT_SET";
export type ImpactLevel = "HIGH" | "MEDIUM" | "LOW";
export type EffortLevel = "LOW" | "MEDIUM" | "HIGH";

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

export interface RecommendationsResponse {
  success: boolean;
  message?: string;
  meta?: {
    ruleNotes: string[];
    generatedAt: string;
  };
  summary?: {
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
  benchmark?: {
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
  scopeAnalysis?: Array<{
    scope: string;
    name: string;
    emissions: number;
    percentage: number;
    recordCount: number;
    trend: TrendDirection;
  }>;
  topCategories?: Array<{
    name: string;
    scope: string;
    emissions: number;
    percentage: number;
    recordCount: number;
    trend: TrendDirection;
    isHotspot: boolean;
  }>;
  facilityAnalysis?: Array<{
    facilityId: number | null;
    facilityName: string;
    emissions: number;
    percentage: number;
    recordCount: number;
    trend: TrendDirection;
    isHotspot: boolean;
  }>;
  trend?: {
    trend: TrendDirection;
    changePercentage: number;
    currentEmissions: number;
    previousEmissions: number;
    explanation: string;
    method: string;
  };
  targetProgress?: {
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
  };
  dataQuality?: {
    totalRecords: number;
    completeRecords: number;
    incompleteRecords: number;
    pendingRecords: number;
    completenessPercentage: number;
    status: "GOOD" | "NEEDS_REVIEW" | "POOR" | "NO_DATA";
    issues: string[];
  };
  recommendations?: RecommendationItem[];
}
