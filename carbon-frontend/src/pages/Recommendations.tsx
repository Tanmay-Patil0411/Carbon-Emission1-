import { useCallback, useEffect, useState } from "react";
import {
  LightBulbIcon,
  SparklesIcon,
  ArrowPathIcon,
  ExclamationCircleIcon,
  BuildingOfficeIcon,
  ChartBarIcon,
  CheckBadgeIcon,
  ClipboardDocumentCheckIcon,
} from "@heroicons/react/24/outline";
import { recommendationsApi } from "../services/api";
import type {
  RecommendationItem,
  RecommendationsResponse,
} from "../types/recommendations";

function priorityClass(priority: string) {
  if (priority === "HIGH") return "bg-rose-50 text-rose-700 border-rose-200";
  if (priority === "MEDIUM") return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-emerald-50 text-emerald-700 border-emerald-200";
}

function confidenceClass(confidence: string) {
  if (confidence === "HIGH") return "text-emerald-700";
  if (confidence === "MEDIUM") return "text-amber-700";
  return "text-slate-500";
}

function trendLabel(trend?: string) {
  if (!trend || trend === "NO_DATA") return "No trend data";
  return trend;
}

export default function Recommendations() {
  const [data, setData] = useState<RecommendationsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await recommendationsApi.getAll();
      if (!res || res.success === false) {
        setError(res?.message || "Unable to load recommendations.");
        setData(null);
      } else {
        setData(res);
      }
    } catch (err: any) {
      if (err?.response?.status === 401) {
        setError("Please log in to view recommendations.");
      } else {
        setError("Unable to load recommendations. Please try again.");
      }
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const summary = data?.summary;
  const recommendations: RecommendationItem[] = data?.recommendations || [];
  const highPriorityCount = recommendations.filter((r) => r.priority === "HIGH").length;
  const totalEmissions = summary?.totalEmissions || 0;
  const isEmpty = !loading && !error && totalEmissions === 0 && (summary?.recordCount || 0) === 0;

  return (
    <div className="space-y-6 pb-12">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2 text-emerald-600 font-semibold text-xs tracking-wider uppercase">
            <LightBulbIcon className="w-4 h-4" />
            AI Decarbonization Engine
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mt-1">Recommendations & Reduction Roadmap</h1>
          <p className="text-sm text-slate-500 mt-1">
            Data-driven reduction initiatives generated from your organization&apos;s PostgreSQL emissions inventory.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={load}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition disabled:opacity-60"
          >
            <ArrowPathIcon className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-3 text-xs font-semibold text-rose-700">
          <ExclamationCircleIcon className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading && (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-sm text-slate-500">
          Analyzing organization emissions and generating recommendations…
        </div>
      )}

      {!loading && !error && data && (
        <>
          {/* SUMMARY BANNER */}
          <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-emerald-950 text-white rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 text-emerald-400 font-bold text-xs">
                <SparklesIcon className="w-4 h-4" />
                OVERALL CARBON STATUS
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
                Total Footprint:{" "}
                <span className="text-emerald-400">{totalEmissions.toFixed(1)} tCO₂e</span>
              </h2>
              <p className="text-xs text-slate-400 max-w-xl leading-relaxed">
                Highest scope: <strong className="text-white">{summary?.highestScope || "n/a"}</strong>
                {" · "}Highest category: <strong className="text-white">{summary?.highestCategory || "n/a"}</strong>
                {" · "}Highest facility: <strong className="text-white">{summary?.highestFacility || "n/a"}</strong>
              </p>
              <p className="text-xs text-slate-500">
                Trend: {trendLabel(summary?.trend)}
                {summary?.trendPercentageChange != null ? ` (${summary.trendPercentageChange >= 0 ? "+" : ""}${summary.trendPercentageChange}%)` : ""}
                {" · "}Benchmark: {summary?.benchmarkStatus || "NOT_AVAILABLE"}
                {" · "}Target: {summary?.targetStatus || "NOT_SET"}
              </p>
            </div>

            <div className="flex items-center gap-4 bg-slate-900/80 p-4 rounded-2xl border border-slate-800 shrink-0">
              <div className="text-center">
                <p className="text-3xl font-black text-emerald-400">{highPriorityCount}</p>
                <p className="text-[11px] text-slate-400 font-medium uppercase mt-0.5">High Priority</p>
              </div>
              <div className="h-10 w-px bg-slate-700" />
              <div className="text-center">
                <p className="text-3xl font-black text-white">{recommendations.length}</p>
                <p className="text-[11px] text-slate-400 font-medium uppercase mt-0.5">Active Projects</p>
              </div>
            </div>
          </div>

          {/* SCOPE ANALYSIS */}
          <section className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <ChartBarIcon className="w-5 h-5 text-emerald-600" />
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Scope Analysis</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {(data.scopeAnalysis || []).map((s) => (
                <div key={s.scope} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                  <p className="text-xs font-semibold text-slate-500">{s.name}</p>
                  <p className="text-xl font-black text-slate-900 mt-1">{s.emissions.toFixed(2)} tCO₂e</p>
                  <p className="text-xs text-slate-500 mt-1">
                    {s.percentage}% · {s.recordCount} records · {trendLabel(s.trend)}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* TOP SOURCES + FACILITIES */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <section className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-3">Top Emission Sources</h3>
              {(data.topCategories || []).length === 0 ? (
                <p className="text-xs text-slate-500">No categories logged yet.</p>
              ) : (
                <ul className="space-y-2">
                  {(data.topCategories || []).slice(0, 5).map((c) => (
                    <li key={c.name} className="flex items-center justify-between text-xs border-b border-slate-50 pb-2">
                      <div>
                        <p className="font-semibold text-slate-800">{c.name}</p>
                        <p className="text-slate-400">{c.scope} · {c.recordCount} records{c.isHotspot ? " · Hotspot" : ""}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-emerald-700">{c.emissions.toFixed(1)} tCO₂e</p>
                        <p className="text-slate-400">{c.percentage}%</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <BuildingOfficeIcon className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Facility Analysis</h3>
              </div>
              {(data.facilityAnalysis || []).length === 0 ? (
                <p className="text-xs text-slate-500">No facility emissions logged yet.</p>
              ) : (
                <ul className="space-y-2">
                  {(data.facilityAnalysis || []).slice(0, 5).map((f) => (
                    <li key={`${f.facilityId}-${f.facilityName}`} className="flex items-center justify-between text-xs border-b border-slate-50 pb-2">
                      <div>
                        <p className="font-semibold text-slate-800">{f.facilityName}</p>
                        <p className="text-slate-400">{f.recordCount} records · {trendLabel(f.trend)}{f.isHotspot ? " · Hotspot" : ""}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-emerald-700">{f.emissions.toFixed(1)} tCO₂e</p>
                        <p className="text-slate-400">{f.percentage}%</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          {/* TARGET PROGRESS */}
          <section className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <CheckBadgeIcon className="w-4 h-4 text-emerald-600" />
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Target Progress</h3>
            </div>
            {!data.targetProgress?.hasTarget ? (
              <p className="text-xs text-slate-500">No reduction target configured.</p>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-slate-600">
                  Overall status: <strong>{data.targetProgress.targetStatus}</strong>
                </p>
                {data.targetProgress.targets.map((t) => (
                  <div key={t.id} className="rounded-xl bg-slate-50 border border-slate-100 p-3 text-xs">
                    <p className="font-semibold text-slate-800">
                      {t.targetType} {t.targetYear ? `(${t.targetYear})` : ""} — {t.status}
                    </p>
                    <p className="text-slate-500 mt-1">{t.notes}</p>
                    {t.progressPercentage != null && (
                      <p className="text-emerald-700 font-semibold mt-1">Progress: {t.progressPercentage}%</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* DATA QUALITY */}
          <section className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <ClipboardDocumentCheckIcon className="w-4 h-4 text-emerald-600" />
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Data Quality</h3>
            </div>
            {data.dataQuality ? (
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center text-xs mb-3">
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-slate-400 uppercase font-semibold">Total</p>
                  <p className="text-lg font-black text-slate-900">{data.dataQuality.totalRecords}</p>
                </div>
                <div className="rounded-xl bg-emerald-50 p-3">
                  <p className="text-emerald-600 uppercase font-semibold">Complete</p>
                  <p className="text-lg font-black text-emerald-800">{data.dataQuality.completeRecords}</p>
                </div>
                <div className="rounded-xl bg-amber-50 p-3">
                  <p className="text-amber-600 uppercase font-semibold">Incomplete</p>
                  <p className="text-lg font-black text-amber-800">{data.dataQuality.incompleteRecords}</p>
                </div>
                <div className="rounded-xl bg-rose-50 p-3">
                  <p className="text-rose-600 uppercase font-semibold">Pending</p>
                  <p className="text-lg font-black text-rose-800">{data.dataQuality.pendingRecords}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-slate-400 uppercase font-semibold">Completeness</p>
                  <p className="text-lg font-black text-slate-900">{data.dataQuality.completenessPercentage}%</p>
                </div>
              </div>
            ) : null}
            <p className="text-xs text-slate-600">
              Status: <strong>{data.dataQuality?.status || "NO_DATA"}</strong>
            </p>
            {(data.dataQuality?.issues || []).length > 0 && (
              <ul className="mt-2 text-xs text-slate-500 list-disc pl-4 space-y-1">
                {data.dataQuality!.issues.map((issue) => (
                  <li key={issue}>{issue}</li>
                ))}
              </ul>
            )}
          </section>

          {/* RECOMMENDATIONS */}
          <section>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-4">Recommendations</h3>

            {isEmpty ? (
              <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-8 text-center">
                <p className="text-base font-bold text-slate-900">No emissions data available yet.</p>
                <p className="text-xs text-slate-500 mt-2 max-w-lg mx-auto">
                  Log electricity, fuel, cloud/SaaS, hardware, and commuting activities for your organization.
                  Assign facilities and attach evidence to unlock dynamic reduction recommendations.
                </p>
              </div>
            ) : recommendations.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center text-sm text-slate-500">
                No actionable recommendations generated for the current inventory.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {recommendations.map((rec) => (
                  <div
                    key={rec.id}
                    className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-[10px] font-black">
                            {rec.score}
                          </div>
                          <span className="text-xs font-bold text-slate-500 uppercase">{rec.scope}</span>
                        </div>
                        <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full border ${priorityClass(rec.priority)}`}>
                          {rec.priority}
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-slate-900">{rec.title}</h3>
                      <p className="text-xs text-slate-500 mt-1">
                        {rec.category}
                        {rec.facility ? ` · ${rec.facility}` : ""}
                      </p>
                      <p className="text-xs text-slate-600 mt-3 leading-relaxed">{rec.problem}</p>
                      <p className="text-[11px] text-slate-400 mt-2 italic">{rec.reason}</p>

                      {rec.actions?.length > 0 && (
                        <ul className="mt-3 space-y-1">
                          {rec.actions.slice(0, 3).map((a) => (
                            <li key={a} className="text-xs text-slate-600 flex gap-2">
                              <span className="text-emerald-500">•</span>
                              <span>{a}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    <div className="mt-6 pt-4 border-t border-slate-100 grid grid-cols-3 gap-2 text-center text-xs">
                      <div>
                        <p className="text-[10px] text-slate-400 font-semibold uppercase">Impact</p>
                        <p className="font-extrabold text-emerald-700 mt-0.5">{rec.expectedImpact}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 font-semibold uppercase">Effort</p>
                        <p className="font-bold text-slate-800 mt-0.5">{rec.effort}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 font-semibold uppercase">Timeframe</p>
                        <p className="font-bold text-slate-800 mt-0.5">{rec.timeframe}</p>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-[10px] text-slate-400">
                      <span>
                        Contribution: {rec.sourceContributionPercentage}% · Trend: {trendLabel(rec.trend)}
                      </span>
                      <span className={`font-bold ${confidenceClass(rec.confidence)}`}>
                        Confidence: {rec.confidence}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {data.meta?.ruleNotes && (
            <p className="text-[10px] text-slate-400 leading-relaxed">
              Note: Hotspot, trend, and scope-dominance cutoffs are CarbonTrack internal analytical rules — not GHG Protocol emission limits.
              Benchmarks are illustrative reference ranges.
            </p>
          )}
        </>
      )}
    </div>
  );
}
