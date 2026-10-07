import { useState } from "react";
import { motion } from "framer-motion";
import { useEmissionsRecords } from "../utils/useEmissionsRecords";
import {
  ArrowTrendingDownIcon,
  SparklesIcon,
  BuildingOfficeIcon,
  BoltIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";

export default function Analytics() {
  const { records, resetToInitial } = useEmissionsRecords();
  const [selectedFacilityFilter, setSelectedFacilityFilter] = useState<string>("all");

  const facilities = Array.from(new Set(records.map((r) => r.facility).filter(Boolean))) as string[];

  const filteredRecords = selectedFacilityFilter === "all"
    ? records
    : records.filter((r) => r.facility === selectedFacilityFilter);

  const totalEmissions = filteredRecords.reduce((sum, r) => sum + (r.emissions_t_co2e || 0), 0);
  const scope1Total = filteredRecords.filter((r) => r.scope === "scope1").reduce((sum, r) => sum + (r.emissions_t_co2e || 0), 0);
  const scope2Total = filteredRecords.filter((r) => r.scope === "scope2").reduce((sum, r) => sum + (r.emissions_t_co2e || 0), 0);
  const scope3Total = filteredRecords.filter((r) => r.scope === "scope3").reduce((sum, r) => sum + (r.emissions_t_co2e || 0), 0);

  // Group by Category for Hotspot Ranking
  const categoryMap: Record<string, { scope: string; tco2e: number; count: number }> = {};
  filteredRecords.forEach((r) => {
    if (!categoryMap[r.category]) {
      categoryMap[r.category] = { scope: r.scope, tco2e: 0, count: 0 };
    }
    categoryMap[r.category].tco2e += r.emissions_t_co2e || 0;
    categoryMap[r.category].count += 1;
  });

  const categoryHotspots = Object.entries(categoryMap)
    .map(([cat, data]) => ({
      category: cat,
      scope: data.scope,
      tco2e: data.tco2e,
      percentage: totalEmissions > 0 ? (data.tco2e / totalEmissions) * 100 : 0,
      recordsCount: data.count,
    }))
    .sort((a, b) => b.tco2e - a.tco2e);

  const primaryHotspot = categoryHotspots[0] || { category: "None", tco2e: 0, percentage: 0 };

  // Physical vs Spend-based breakdown
  const physicalEmissions = filteredRecords
    .filter((r) => r.inputMode === "physical")
    .reduce((sum, r) => sum + (r.emissions_t_co2e || 0), 0);

  const spendEmissions = filteredRecords
    .filter((r) => r.inputMode === "spend_based")
    .reduce((sum, r) => sum + (r.emissions_t_co2e || 0), 0);

  return (
    <div className="space-y-6 pb-12">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2 text-emerald-600 font-semibold text-xs tracking-wider uppercase">
            <ArrowTrendingDownIcon className="w-4 h-4" />
            Carbon Intelligence Analytics
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mt-1">Analytics & Hotspot Diagnostics</h1>
          <p className="text-sm text-slate-500 mt-1">
            Identify core carbon drivers, scope distributions, and facility hotspots dynamically from your logged data.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={resetToInitial}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition"
          >
            <ArrowPathIcon className="w-4 h-4" />
            Reset Data
          </button>
        </div>
      </div>

      {/* FACILITY FILTER & KPI BAR */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <BuildingOfficeIcon className="w-5 h-5 text-slate-400" />
          <span className="text-xs font-semibold text-slate-700">Filter by Facility:</span>
          <select
            value={selectedFacilityFilter}
            onChange={(e) => setSelectedFacilityFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl text-xs font-medium border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          >
            <option value="all">All Facilities ({records.length} records)</option>
            {facilities.map((fac) => (
              <option key={fac} value={fac}>
                {fac}
              </option>
            ))}
          </select>
        </div>

        <div className="text-xs text-slate-500">
          Showing <span className="font-bold text-slate-900">{filteredRecords.length}</span> records ({totalEmissions.toFixed(2)} tCO₂e)
        </div>
      </div>

      {/* TOP KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <p className="text-xs font-semibold text-slate-500">Primary Carbon Driver</p>
          <p className="text-lg font-bold text-slate-900 truncate mt-1">{primaryHotspot.category}</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-rose-600">
              {primaryHotspot.percentage.toFixed(1)}%
            </span>
            <span className="text-xs text-slate-400">({primaryHotspot.tco2e.toFixed(1)} tCO₂e)</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <p className="text-xs font-semibold text-slate-500">Scope 1 Direct Share</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-600">
              {totalEmissions > 0 ? ((scope1Total / totalEmissions) * 100).toFixed(1) : 0}%
            </span>
            <span className="text-xs text-slate-400">({scope1Total.toFixed(1)} tCO₂e)</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">Boilers, Generators & HVAC</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <p className="text-xs font-semibold text-slate-500">Scope 2 Electricity Share</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-blue-600">
              {totalEmissions > 0 ? ((scope2Total / totalEmissions) * 100).toFixed(1) : 0}%
            </span>
            <span className="text-xs text-slate-400">({scope2Total.toFixed(1)} tCO₂e)</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">Purchased power & cooling</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <p className="text-xs font-semibold text-slate-500">Scope 3 Value Chain Share</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-amber-600">
              {totalEmissions > 0 ? ((scope3Total / totalEmissions) * 100).toFixed(1) : 0}%
            </span>
            <span className="text-xs text-slate-400">({scope3Total.toFixed(1)} tCO₂e)</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">Cloud hosting, IT equipment & WFH</p>
        </div>
      </div>

      {/* HOTSPOT RANKING TABLE & METHODOLOGY BREAKDOWN */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* HOTSPOT RANKING PROGRESS BARS */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Emissions Hotspot Ranking</h2>
              <p className="text-xs text-slate-500 mt-0.5">Ranked by overall contribution to total carbon output</p>
            </div>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
              GHG Ranked
            </span>
          </div>

          <div className="space-y-5">
            {categoryHotspots.map((item, idx) => (
              <div key={item.category} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-slate-100 font-bold text-slate-600 flex items-center justify-center text-[10px]">
                      #{idx + 1}
                    </span>
                    <span className="font-bold text-slate-900">{item.category}</span>
                    <span className="text-[10px] uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-semibold">
                      {item.scope}
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="font-extrabold text-slate-900 mr-2">
                      {item.tco2e.toFixed(2)} tCO₂e
                    </span>
                    <span className="font-bold text-emerald-600">{item.percentage.toFixed(1)}%</span>
                  </div>
                </div>

                <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${item.percentage}%` }}
                    transition={{ duration: 0.8, delay: idx * 0.1 }}
                    className={`h-full rounded-full ${
                      item.scope === "scope1"
                        ? "bg-emerald-500"
                        : item.scope === "scope2"
                        ? "bg-blue-500"
                        : "bg-amber-500"
                    }`}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* METHODOLOGY & DATA QUALITY SIDEBAR */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between space-y-6">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <BoltIcon className="w-5 h-5 text-emerald-600" />
              Calculation Methodology
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Comparison between physical activity metering and spend-based EEIO estimations.
            </p>

            <div className="mt-6 space-y-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-800">Physical Metering (kWh / L)</span>
                  <span className="font-extrabold text-emerald-700">{physicalEmissions.toFixed(1)} tCO₂e</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">High accuracy (Tier 1 & Tier 2 factors)</p>
                <div className="mt-2 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-600 rounded-full"
                    style={{ width: `${totalEmissions > 0 ? (physicalEmissions / totalEmissions) * 100 : 0}%` }}
                  />
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-800">Spend-based EEIO ($ USD)</span>
                  <span className="font-extrabold text-amber-700">{spendEmissions.toFixed(1)} tCO₂e</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">Supply chain EEIO factors (Cloud & Procurement)</p>
                <div className="mt-2 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-500 rounded-full"
                    style={{ width: `${totalEmissions > 0 ? (spendEmissions / totalEmissions) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs">
            <div className="flex items-center gap-1.5 text-emerald-800 font-bold">
              <SparklesIcon className="w-4 h-4 text-emerald-600" />
              Hotspot Insight
            </div>
            <p className="text-emerald-900 mt-1.5 leading-relaxed text-[11px]">
              Focus decarbonization efforts on your top 2 categories (
              <strong>{categoryHotspots[0]?.category || "Top Source"}</strong> and{" "}
              <strong>{categoryHotspots[1]?.category || "Secondary Source"}</strong>) to reduce over 75% of total enterprise emissions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}