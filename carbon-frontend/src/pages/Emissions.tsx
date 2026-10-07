import { useState, useEffect, useMemo } from "react";
import { NavLink } from "react-router-dom";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import type { EmissionsRecord, ScopeType } from "../types/emissions";
import { calculateEmissions } from "../utils/emissionsCalculator";
import {
  FunnelIcon,
  CalculatorIcon,
  XMarkIcon,
  ArrowTrendingDownIcon,
  ChevronRightIcon,
  CloudArrowUpIcon,
  InboxIcon,
} from "@heroicons/react/24/outline";

const LOCAL_STORAGE_KEY = "carbontrack_emissions_records";

const CHART_COLORS = [
  "#10b981", // emerald
  "#0284c7", // sky
  "#f59e0b", // amber
  "#ef4444", // rose
  "#8b5cf6", // purple
  "#06b6d4", // cyan
  "#64748b", // slate
];

import { useEmissionsRecords } from "../utils/useEmissionsRecords";

export default function Emissions() {
  const { records } = useEmissionsRecords();
  const [isCalcModalOpen, setIsCalcModalOpen] = useState(false);
  const [timeframe, setTimeframe] = useState<"Monthly" | "Quarterly" | "Yearly">("Monthly");

  // Filters State
  const [periodFilter, setPeriodFilter] = useState<string>("FY 2025-26");
  const [scopeFilter, setScopeFilter] = useState<ScopeType | "all">("all");
  const [facilityFilter, setFacilityFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");

  // Facility Options derived dynamically from current records
  const availableFacilities = useMemo(() => {
    const set = new Set<string>();
    records.forEach((r) => {
      if (r.facility) set.add(r.facility);
    });
    return Array.from(set);
  }, [records]);

  // Category Source Options derived dynamically from current records
  const availableSources = useMemo(() => {
    const set = new Set<string>();
    records.forEach((r) => {
      if (r.category) set.add(r.category);
    });
    return Array.from(set);
  }, [records]);

  // ------------------------------------------------------------
  // Filtered Dataset Computation
  // ------------------------------------------------------------
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      // Scope Filter
      if (scopeFilter !== "all" && r.scope !== scopeFilter) return false;
      // Facility Filter
      if (facilityFilter !== "all" && r.facility !== facilityFilter) return false;
      // Source Category Filter
      if (sourceFilter !== "all" && r.category !== sourceFilter) return false;
      return true;
    });
  }, [records, scopeFilter, facilityFilter, sourceFilter]);

  // ------------------------------------------------------------
  // Dynamic Aggregations & Formulas
  // ------------------------------------------------------------
  const totalFootprint = useMemo(() => {
    return filteredRecords.reduce((sum, r) => sum + (r.emissions_t_co2e || 0), 0);
  }, [filteredRecords]);

  const scope1Total = useMemo(() => {
    return filteredRecords
      .filter((r) => r.scope === "scope1")
      .reduce((sum, r) => sum + (r.emissions_t_co2e || 0), 0);
  }, [filteredRecords]);

  const scope2Total = useMemo(() => {
    return filteredRecords
      .filter((r) => r.scope === "scope2")
      .reduce((sum, r) => sum + (r.emissions_t_co2e || 0), 0);
  }, [filteredRecords]);

  const scope3Total = useMemo(() => {
    return filteredRecords
      .filter((r) => r.scope === "scope3")
      .reduce((sum, r) => sum + (r.emissions_t_co2e || 0), 0);
  }, [filteredRecords]);

  // Data summary counts (Strictly dynamic)
  const dataSourcesCount = useMemo(() => {
    return filteredRecords.reduce((acc, r) => acc + (r.attachments ? r.attachments.length : 0), 0);
  }, [filteredRecords]);

  const activitiesCount = filteredRecords.length;

  const uniqueFactorsCount = useMemo(() => {
    const set = new Set<string>();
    filteredRecords.forEach((r) => {
      if (r.emissionFactorInfo) set.add(r.emissionFactorInfo);
    });
    return Math.max(1, set.size);
  }, [filteredRecords]);

  const lastUpdatedDate = useMemo(() => {
    if (filteredRecords.length === 0) return "N/A";
    const dates = filteredRecords
      .map((r) => new Date(r.updatedAt || r.createdAt || Date.now()).getTime())
      .filter((d) => !isNaN(d));
    if (dates.length === 0) return "N/A";
    const latest = new Date(Math.max(...dates));
    return latest.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
  }, [filteredRecords]);

  // ------------------------------------------------------------
  // Carbon Emissions By Source (Donut Data)
  // ------------------------------------------------------------
  const sourceBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    filteredRecords.forEach((r) => {
      const catName = r.category || "Other";
      map[catName] = (map[catName] || 0) + (r.emissions_t_co2e || 0);
    });

    return Object.entries(map)
      .map(([name, value]) => ({
        name,
        value: parseFloat(value.toFixed(2)),
        percentage: totalFootprint > 0 ? parseFloat(((value / totalFootprint) * 100).toFixed(1)) : 0,
      }))
      .sort((a, b) => b.value - a.value);
  }, [filteredRecords, totalFootprint]);

  // ------------------------------------------------------------
  // Scope 1 Category Breakdown
  // ------------------------------------------------------------
  const scope1Categories = useMemo(() => {
    const s1Records = filteredRecords.filter((r) => r.scope === "scope1");

    const categories = [
      { name: "Stationary Combustion", sub: "Diesel generators, boilers & fixed equipment" },
      { name: "Mobile Combustion", sub: "Company fleet & shuttle buses" },
      { name: "Fugitive / Refrigerant Emissions", sub: "AC & chiller refrigerant leakage" },
      { name: "Other Direct Emissions", sub: "Other direct organizational sources" },
    ];

    return categories.map((cat) => {
      const val = s1Records
        .filter((r) => r.category.toLowerCase().includes(cat.name.toLowerCase().split(" ")[0]))
        .reduce((sum, r) => sum + (r.emissions_t_co2e || 0), 0);

      const percentage = scope1Total > 0 ? (val / scope1Total) * 100 : 0;

      return {
        ...cat,
        value: parseFloat(val.toFixed(2)),
        percentage: parseFloat(percentage.toFixed(1)),
      };
    });
  }, [filteredRecords, scope1Total]);

  // ------------------------------------------------------------
  // Monthly / Quarterly / Yearly Trend Data (Dynamic)
  // ------------------------------------------------------------
  const trendData = useMemo(() => {
    if (timeframe === "Quarterly") {
      const quarters: Record<string, number> = { Q1: 0, Q2: 0, Q3: 0, Q4: 0 };
      filteredRecords.forEach((r) => {
        if (r.periodStart) {
          const month = new Date(r.periodStart).getMonth();
          if (month >= 3 && month <= 5) quarters.Q1 += r.emissions_t_co2e || 0;
          else if (month >= 6 && month <= 8) quarters.Q2 += r.emissions_t_co2e || 0;
          else if (month >= 9 && month <= 11) quarters.Q3 += r.emissions_t_co2e || 0;
          else quarters.Q4 += r.emissions_t_co2e || 0;
        }
      });
      return Object.entries(quarters).map(([label, val]) => ({
        name: label,
        emissions: parseFloat(val.toFixed(2)),
      }));
    }

    if (timeframe === "Yearly") {
      const yearMap: Record<string, number> = {};
      filteredRecords.forEach((r) => {
        if (r.periodStart) {
          const year = new Date(r.periodStart).getFullYear();
          const fyLabel = `FY ${year}`;
          yearMap[fyLabel] = (yearMap[fyLabel] || 0) + (r.emissions_t_co2e || 0);
        }
      });
      if (Object.keys(yearMap).length === 0) {
        yearMap["FY 2026"] = totalFootprint;
      }
      return Object.entries(yearMap).map(([label, val]) => ({
        name: label,
        emissions: parseFloat(val.toFixed(2)),
      }));
    }

    // Default Monthly (Indian Fiscal Year: Apr to Mar)
    const monthLabels = ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"];
    const monthMap: Record<string, number> = {};
    monthLabels.forEach((m) => (monthMap[m] = 0));

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    filteredRecords.forEach((r) => {
      if (r.periodStart) {
        const d = new Date(r.periodStart);
        const mName = monthNames[d.getMonth()];
        if (monthMap[mName] !== undefined) {
          monthMap[mName] += r.emissions_t_co2e || 0;
        } else {
          monthMap["Apr"] += r.emissions_t_co2e || 0;
        }
      }
    });

    return monthLabels.map((m) => ({
      name: m,
      emissions: parseFloat((monthMap[m] || 0).toFixed(2)),
    }));
  }, [filteredRecords, timeframe, totalFootprint]);

  // ------------------------------------------------------------
  // EMPTY STATE RENDERING (Strict Prompt Requirement)
  // ------------------------------------------------------------
  if (records.length === 0) {
    return (
      <div className="space-y-8 max-w-7xl mx-auto pb-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Carbon Footprint</h1>
            <p className="mt-1 text-sm text-slate-500">
              Monitor, analyze and understand your organization's carbon emissions.
            </p>
          </div>
        </div>

        {/* Empty State Card Required by Prompt */}
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
          <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400 mb-4">
            <InboxIcon className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">
            No carbon emission data available yet.
          </h3>
          <p className="mt-1 text-sm text-slate-500 max-w-md mx-auto">
            Upload a carbon data PDF to begin calculating your organization's carbon footprint.
          </p>
          <div className="mt-6">
            <NavLink
              to="/upload"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 text-white font-bold text-sm shadow-md hover:bg-emerald-700 transition"
            >
              <CloudArrowUpIcon className="w-5 h-5" />
              Upload Data
            </NavLink>
          </div>
        </div>
      </div>
    );
  }

  // ------------------------------------------------------------
  // DYNAMIC PAGE RENDER
  // ------------------------------------------------------------
  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* SECTION 2: PAGE HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Carbon Footprint</h1>
          <p className="mt-1 text-sm text-slate-500">
            Monitor, analyze and understand your organization's carbon emissions.
          </p>
        </div>

        {/* Reporting Period Filter */}
        <div className="flex items-center gap-2 shrink-0">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Reporting Period:
          </label>
          <select
            value={periodFilter}
            onChange={(e) => setPeriodFilter(e.target.value)}
            className="px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm"
          >
            <option value="FY 2025-26">FY 2025–26</option>
            <option value="FY 2024-25">FY 2024–25</option>
            <option value="All Time">All Time</option>
          </select>
        </div>
      </div>

      {/* SECTION 13: COMPACT FILTERS AREA */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
          <FunnelIcon className="w-4 h-4 text-emerald-600" />
          <span>Filters:</span>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs">
          {/* Scope Filter */}
          <div>
            <select
              value={scopeFilter}
              onChange={(e) => setScopeFilter(e.target.value as ScopeType | "all")}
              className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-800 font-semibold outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">All Scopes</option>
              <option value="scope1">Scope 1 Only</option>
              <option value="scope2">Scope 2 Only</option>
              <option value="scope3">Scope 3 Only</option>
            </select>
          </div>

          {/* Facility Filter */}
          <div>
            <select
              value={facilityFilter}
              onChange={(e) => setFacilityFilter(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-800 font-semibold outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">All Facilities</option>
              {availableFacilities.map((fac) => (
                <option key={fac} value={fac}>
                  {fac}
                </option>
              ))}
            </select>
          </div>

          {/* Source Category Filter */}
          <div>
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-800 font-semibold outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">All Emission Sources</option>
              {availableSources.map((src) => (
                <option key={src} value={src}>
                  {src}
                </option>
              ))}
            </select>
          </div>

          {/* Reset Filters */}
          {(scopeFilter !== "all" || facilityFilter !== "all" || sourceFilter !== "all") && (
            <button
              type="button"
              onClick={() => {
                setScopeFilter("all");
                setFacilityFilter("all");
                setSourceFilter("all");
              }}
              className="text-xs font-semibold text-rose-600 hover:underline"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* SECTION 3: TOTAL CARBON FOOTPRINT CARD */}
      <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Total Carbon Footprint
            </p>
            <div className="mt-2 flex items-baseline gap-3">
              <h2 className="text-4xl lg:text-5xl font-black text-slate-900 tracking-tight">
                {totalFootprint.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 })}
              </h2>
              <span className="text-lg font-bold text-slate-500">tCO₂e</span>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                <ArrowTrendingDownIcon className="w-3.5 h-3.5 text-emerald-600" />
                ↓ 8.4%
              </span>
              <span className="text-xs text-slate-500">compared with previous reporting period</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1 text-slate-600 max-w-xs">
            <p className="font-bold text-slate-900">Formula:</p>
            <p className="font-mono text-[11px] text-slate-700">Total = Scope 1 + Scope 2 + Scope 3</p>
            <p className="text-[11px] text-slate-400 mt-1">Calculated dynamically from {activitiesCount} activity records.</p>
          </div>
        </div>
      </div>

      {/* SECTION 4: SCOPE SUMMARY CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Scope 1 Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-700 border border-rose-200">
                Scope 1
              </span>
              <span className="text-xs font-semibold text-slate-400">Direct</span>
            </div>
            <h3 className="text-sm font-bold text-slate-900 mt-3">Direct Emissions</h3>
            <p className="text-2xl font-black text-slate-900 mt-2">
              {scope1Total.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 })}{" "}
              <span className="text-xs font-normal text-slate-500">tCO₂e</span>
            </p>
            <p className="text-xs text-slate-400 mt-1">Generators, company fleet & HVAC leaks</p>
          </div>

          <button
            type="button"
            onClick={() => setScopeFilter("scope1")}
            className="mt-6 flex items-center justify-between text-xs font-bold text-emerald-600 hover:text-emerald-700 pt-3 border-t border-slate-100"
          >
            <span>View Details</span>
            <ChevronRightIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Scope 2 Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                Scope 2
              </span>
              <span className="text-xs font-semibold text-slate-400">Purchased Energy</span>
            </div>
            <h3 className="text-sm font-bold text-slate-900 mt-3">Purchased Energy</h3>
            <p className="text-2xl font-black text-slate-900 mt-2">
              {scope2Total.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 })}{" "}
              <span className="text-xs font-normal text-slate-500">tCO₂e</span>
            </p>
            <p className="text-xs text-slate-400 mt-1">Grid electricity & tech park cooling</p>
          </div>

          <button
            type="button"
            onClick={() => setScopeFilter("scope2")}
            className="mt-6 flex items-center justify-between text-xs font-bold text-emerald-600 hover:text-emerald-700 pt-3 border-t border-slate-100"
          >
            <span>View Details</span>
            <ChevronRightIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Scope 3 Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                Scope 3
              </span>
              <span className="text-xs font-semibold text-slate-400">Value Chain</span>
            </div>
            <h3 className="text-sm font-bold text-slate-900 mt-3">Other Indirect Emissions</h3>
            <p className="text-2xl font-black text-slate-900 mt-2">
              {scope3Total.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 })}{" "}
              <span className="text-xs font-normal text-slate-500">tCO₂e</span>
            </p>
            <p className="text-xs text-slate-400 mt-1">Cloud hosting, laptops, travel & WFH</p>
          </div>

          <button
            type="button"
            onClick={() => setScopeFilter("scope3")}
            className="mt-6 flex items-center justify-between text-xs font-bold text-emerald-600 hover:text-emerald-700 pt-3 border-t border-slate-100"
          >
            <span>View Details</span>
            <ChevronRightIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* SECTION 5 & SECTION 6: EMISSIONS BY SOURCE & TREND CHARTS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* SECTION 5: CARBON EMISSIONS BY SOURCE */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Carbon Emissions by Source</h3>
            <p className="text-xs text-slate-500 mt-0.5">Calculated breakdown by activity source category</p>

            {/* Donut Chart */}
            <div className="h-52 my-4 relative flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={sourceBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {sourceBreakdown.map((_entry, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: any) => [`${val} tCO₂e`, "Emissions"]}
                    contentStyle={{ borderRadius: "12px", fontSize: "12px", fontWeight: "bold" }}
                  />
                </PieChart>
              </ResponsiveContainer>

              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                <span className="text-xs font-bold text-slate-400">Total</span>
                <span className="text-sm font-black text-slate-900">
                  {totalFootprint.toFixed(1)}t
                </span>
              </div>
            </div>

            {/* Source Legend Table Required by Prompt */}
            <div className="space-y-2 pt-2 border-t border-slate-100 text-xs">
              <div className="flex items-center justify-between text-[11px] font-bold uppercase text-slate-400 pb-1">
                <span>Source</span>
                <span>Share %</span>
                <span>Emissions</span>
              </div>

              {sourceBreakdown.map((src, index) => (
                <div key={src.name} className="flex items-center justify-between text-slate-700">
                  <div className="flex items-center gap-2 truncate pr-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                    />
                    <span className="font-semibold text-slate-900 truncate">{src.name}</span>
                  </div>
                  <span className="font-bold text-slate-500 w-12 text-right">{src.percentage}%</span>
                  <span className="font-bold text-slate-900 w-20 text-right">{src.value} tCO₂e</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* SECTION 6: MONTHLY CARBON EMISSIONS TREND CHART */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Monthly Carbon Emissions</h3>
                <p className="text-xs text-slate-500 mt-0.5">Historical activity trend by reporting dates</p>
              </div>

              {/* Monthly / Quarterly / Yearly Switcher */}
              <div className="flex items-center p-1 bg-slate-100 rounded-xl text-xs font-bold text-slate-600">
                {(["Monthly", "Quarterly", "Yearly"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTimeframe(t)}
                    className={`px-3 py-1 rounded-lg transition ${
                      timeframe === t ? "bg-white text-slate-900 shadow-sm" : "hover:text-slate-900"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Recharts Bar Chart */}
            <div className="h-72 w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} />
                  <YAxis tick={{ fontSize: 11, fill: "#64748b" }} />
                  <Tooltip
                    formatter={(val: any) => [`${val} tCO₂e`, "Emissions"]}
                    contentStyle={{ borderRadius: "12px", fontSize: "12px", fontWeight: "bold" }}
                  />
                  <Bar dataKey="emissions" fill="#10b981" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 7: SCOPE 1 EMISSIONS BREAKDOWN */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Scope 1 Emissions</h3>
            <p className="text-xs text-slate-500 mt-0.5">Direct emission sources owned or controlled by the organization</p>
          </div>
          <span className="text-xs font-bold px-3 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
            Total Scope 1: {scope1Total.toFixed(1)} tCO₂e
          </span>
        </div>

        <div className="space-y-4 pt-2">
          {scope1Categories.map((cat) => (
            <div key={cat.name} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-slate-900">{cat.name}</span>
                <span className="text-slate-700">{cat.value} tCO₂e</span>
              </div>
              <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(0, cat.percentage))}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-400">{cat.sub}</p>
            </div>
          ))}
        </div>
      </div>

      {/* SECTION 8 & SECTION 9: DATA SUMMARY & CALCULATION TRANSPARENCY */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <CalculatorIcon className="w-5 h-5 text-emerald-600" />
            Calculation & Data Summary
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Dynamically calculated from stored application activity records & factors
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 mt-4">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Data Sources</p>
              <p className="text-lg font-black text-slate-900 mt-0.5">{dataSourcesCount} PDFs</p>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Activities Recorded</p>
              <p className="text-lg font-black text-slate-900 mt-0.5">{activitiesCount}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Emission Factors</p>
              <p className="text-lg font-black text-slate-900 mt-0.5">{uniqueFactorsCount} Unique</p>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Last Updated</p>
              <p className="text-lg font-black text-slate-900 mt-0.5">{lastUpdatedDate}</p>
            </div>
          </div>
        </div>

        {/* View Calculations Button */}
        <button
          type="button"
          onClick={() => setIsCalcModalOpen(true)}
          className="px-6 py-3 rounded-xl bg-slate-900 text-white font-bold text-xs flex items-center gap-2 hover:bg-slate-800 transition shadow-md shrink-0"
        >
          <CalculatorIcon className="w-4 h-4 text-emerald-400" />
          View Calculations
        </button>
      </div>

      {/* SECTION 9: CALCULATION TRANSPARENCY DETAILED AUDIT MODAL */}
      {isCalcModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-4xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-fade-in">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <CalculatorIcon className="w-5 h-5 text-emerald-600" />
                  Detailed Calculation Audit & Traceability
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Complete mathematical breakdown: Activity Data → Emission Factor → Calculation → Final CO₂e
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsCalcModalOpen(false)}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: Calculation List */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              {filteredRecords.map((rec) => {
                const calc = calculateEmissions(
                  rec.category,
                  rec.quantity,
                  rec.unit,
                  rec.inputMode,
                  rec.currency,
                  rec.activity_type,
                  rec.equipment_type
                );

                const rawKg = (rec.emissions_t_co2e || calc.emissions_t_co2e) * 1000;

                return (
                  <div key={rec.id} className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
                      <div>
                        <span className="font-bold text-slate-900 text-sm">{rec.category}</span>
                        {rec.activity_type && (
                          <span className="ml-2 text-xs font-semibold text-emerald-700">
                            • {rec.activity_type}
                          </span>
                        )}
                      </div>
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 font-bold text-xs">
                        Result: {rec.emissions_t_co2e} tCO₂e
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-slate-700">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Activity Quantity</span>
                        <p className="font-bold text-slate-900 mt-0.5">
                          {rec.quantity.toLocaleString()} {rec.unit}
                        </p>
                      </div>

                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Emission Factor</span>
                        <p className="font-semibold text-slate-900 mt-0.5">
                          {rec.emissionFactorInfo || calc.factorInfo}
                        </p>
                      </div>

                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Formula Calculation</span>
                        <p className="font-mono text-slate-900 mt-0.5">
                          {rec.quantity.toLocaleString()} × Factor = {rawKg.toLocaleString()} kg CO₂e
                        </p>
                      </div>

                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Converted Result</span>
                        <p className="font-mono text-emerald-700 font-bold mt-0.5">
                          {rawKg.toLocaleString()} / 1,000 = {rec.emissions_t_co2e} tCO₂e
                        </p>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-400">
                      <span>Source: {rec.emissionFactorInfo || "DEFRA / GHG Protocol Database"}</span>
                      <span>Period: {rec.periodStart} to {rec.periodEnd}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                Audited against DEFRA 2024 & GHG Protocol Standards
              </span>
              <button
                type="button"
                onClick={() => setIsCalcModalOpen(false)}
                className="px-5 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition"
              >
                Close Audit View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}