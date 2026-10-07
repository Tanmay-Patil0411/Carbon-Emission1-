/**
 * CarbonTrack Recommendation Engine — unit tests (no DB required)
 * Run: npx ts-node --transpile-only src/__tests__/recommendationEngine.test.ts
 */
import assert from "assert";
import {
  analyzeDataQuality,
  analyzeTargets,
  assessConfidence,
  CATEGORY_HOTSPOT_PCT,
  classifyBenchmarkStatusCorrected,
  computeTrend,
  parseNumericHeadcount,
  scoreRecommendation,
  TREND_CHANGE_PCT,
} from "../services/recommendationEngine";
import type { EmissionRecordRow, EmissionTargetRow } from "../types/recommendations";

function rec(partial: Partial<EmissionRecordRow> & { id: string }): EmissionRecordRow {
  return {
    organization_id: 1,
    facility_id: 1,
    facility_name: "HQ",
    scope: "scope2",
    category: "Purchased Electricity",
    activity_type: null,
    equipment_type: null,
    quantity: 100,
    unit: "kWh",
    input_mode: "physical",
    period_start: "2026-01-01",
    period_end: "2026-01-31",
    emissions_t_co2e: 10,
    emission_factor_info: "DEFRA",
    status: "validated",
    notes: "ok",
    ...partial,
  };
}

let passed = 0;
function test(name: string, fn: () => void) {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (e: any) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${e.message}`);
    process.exitCode = 1;
  }
}

console.log("\nRecommendation Engine Tests\n");

test("1. No emissions → trend NO_DATA", () => {
  const t = computeTrend([]);
  assert.strictEqual(t.trend, "NO_DATA");
});

test("2. Scope 2 dominant contribution math", () => {
  // Internal rule documented; verify hotspot threshold constant
  assert.strictEqual(CATEGORY_HOTSPOT_PCT, 15);
  const scoring = scoreRecommendation({
    contributionPct: 56,
    isScopeDominant: true,
    trend: "STABLE",
    benchmarkStatus: "MODERATE",
    targetStatus: "NOT_SET",
    dataQualityIssue: false,
    facilityHotspot: false,
  });
  assert.ok(scoring.score >= 75);
  assert.strictEqual(scoring.priority, "HIGH");
});

test("3. Scope 1 / Scope 3 scoring differs by contribution", () => {
  const s1 = scoreRecommendation({
    contributionPct: 30,
    isScopeDominant: true,
    trend: "STABLE",
    benchmarkStatus: "NOT_AVAILABLE",
    targetStatus: "NOT_SET",
    dataQualityIssue: false,
    facilityHotspot: false,
  });
  const s3 = scoreRecommendation({
    contributionPct: 10,
    isScopeDominant: false,
    trend: "STABLE",
    benchmarkStatus: "NOT_AVAILABLE",
    targetStatus: "NOT_SET",
    dataQualityIssue: false,
    facilityHotspot: false,
  });
  assert.ok(s1.score > s3.score);
});

test("4. Category hotspot threshold is CarbonTrack internal 15%", () => {
  assert.strictEqual(CATEGORY_HOTSPOT_PCT, 15);
});

test("5. Increasing trend (≥ +10%)", () => {
  const records = [
    rec({ id: "a", period_start: "2026-01-01", emissions_t_co2e: 10 }),
    rec({ id: "b", period_start: "2026-02-01", emissions_t_co2e: 10 }),
    rec({ id: "c", period_start: "2026-03-01", emissions_t_co2e: 20 }),
    rec({ id: "d", period_start: "2026-04-01", emissions_t_co2e: 20 }),
  ];
  const t = computeTrend(records);
  assert.strictEqual(t.trend, "INCREASING");
  assert.ok(t.changePercentage >= TREND_CHANGE_PCT);
});

test("6. Benchmark HIGH when intensity > high", () => {
  const status = classifyBenchmarkStatusCorrected(2.0, 0.35, 0.6, 1.2);
  assert.strictEqual(status, "HIGH");
});

test("7. Benchmark uses moderate_threshold", () => {
  assert.strictEqual(classifyBenchmarkStatusCorrected(0.3, 0.35, 0.6, 1.2), "LOW");
  assert.strictEqual(classifyBenchmarkStatusCorrected(0.5, 0.35, 0.6, 1.2), "MODERATE");
  assert.strictEqual(classifyBenchmarkStatusCorrected(1.0, 0.35, 0.6, 1.2), "MODERATE");
  assert.strictEqual(classifyBenchmarkStatusCorrected(1.5, 0.35, 0.6, 1.2), "HIGH");
  assert.strictEqual(classifyBenchmarkStatusCorrected(null, 0.35, 0.6, 1.2), "NOT_AVAILABLE");
});

test("8. Facility hotspot scoring boost", () => {
  const withFac = scoreRecommendation({
    contributionPct: 30,
    isScopeDominant: false,
    trend: "STABLE",
    benchmarkStatus: "NOT_AVAILABLE",
    targetStatus: "NOT_SET",
    dataQualityIssue: false,
    facilityHotspot: true,
  });
  const without = scoreRecommendation({
    contributionPct: 30,
    isScopeDominant: false,
    trend: "STABLE",
    benchmarkStatus: "NOT_AVAILABLE",
    targetStatus: "NOT_SET",
    dataQualityIssue: false,
    facilityHotspot: false,
  });
  assert.ok(withFac.score > without.score);
});

test("9. Target AT_RISK / OFF_TRACK", () => {
  const targets: EmissionTargetRow[] = [
    {
      id: 1,
      organization_id: 1,
      target_type: "absolute",
      baseline_period_start: null,
      baseline_period_end: null,
      target_year: 2027,
      reduction_percentage: 20,
      target_emissions_t_co2e: 50,
      scope: null,
      category: null,
      status: "active",
    },
  ];
  const progress = analyzeTargets(targets, 80, []);
  assert.strictEqual(progress.hasTarget, true);
  assert.ok(progress.targetStatus === "AT_RISK" || progress.targetStatus === "OFF_TRACK");
});

test("10. Poor data quality detection", () => {
  const dq = analyzeDataQuality([
    rec({
      id: "bad",
      facility_id: null,
      facility_name: null,
      emission_factor_info: null,
      status: "pending",
      quantity: 0,
      unit: "",
      category: "",
    }),
  ]);
  assert.ok(dq.incompleteRecords >= 1);
  assert.ok(dq.pendingRecords >= 1);
  assert.ok(dq.status === "NEEDS_REVIEW" || dq.status === "POOR");
});

test("11. Missing benchmark → NOT_AVAILABLE", () => {
  assert.strictEqual(classifyBenchmarkStatusCorrected(1, null, null, null), "NOT_AVAILABLE");
});

test("12. Missing headcount parsing returns null", () => {
  assert.strictEqual(parseNumericHeadcount(null), null);
  assert.strictEqual(parseNumericHeadcount(""), null);
  assert.strictEqual(parseNumericHeadcount("unknown"), null);
  assert.strictEqual(parseNumericHeadcount("1,250 FTE Engineers"), 1250);
  assert.strictEqual(parseNumericHeadcount("100-500 Employees"), 300);
});

test("13. Organization isolation constant: targets empty → NOT_SET", () => {
  const progress = analyzeTargets([], 100, []);
  assert.strictEqual(progress.targetStatus, "NOT_SET");
  assert.strictEqual(progress.hasTarget, false);
});

test("14. Confidence HIGH with strong supporting data", () => {
  const c = assessConfidence({
    recordCount: 8,
    hasCategory: true,
    hasFacility: true,
    contributionPct: 40,
    trend: "INCREASING",
    dataQualityStatus: "GOOD",
  });
  assert.strictEqual(c, "HIGH");
});

test("15. Confidence LOW with weak data", () => {
  const c = assessConfidence({
    recordCount: 1,
    hasCategory: false,
    hasFacility: false,
    contributionPct: 2,
    trend: "NO_DATA",
    dataQualityStatus: "POOR",
  });
  assert.strictEqual(c, "LOW");
});

console.log(`\nPassed ${passed} tests.\n`);
if (process.exitCode) {
  console.error("Some tests failed.");
} else {
  console.log("All recommendation engine unit tests passed.");
}
