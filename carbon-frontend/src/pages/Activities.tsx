import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useEmissionsRecords } from "../utils/useEmissionsRecords";
import type { EmissionsRecord } from "../types/emissions";
import {
  TableCellsIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  TrashIcon,
  DocumentCheckIcon,
  InformationCircleIcon,
  ArrowPathIcon,
  PlusIcon,
  XMarkIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";

export default function Activities() {
  const { records, deleteRecord, resetToInitial } = useEmissionsRecords();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedScope, setSelectedScope] = useState<"all" | "scope1" | "scope2" | "scope3">("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [inspectRecord, setInspectRecord] = useState<EmissionsRecord | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Extract unique categories for filter
  const uniqueCategories = Array.from(new Set(records.map((r) => r.category)));

  // Filtered records based on scope, search, and category
  const filteredRecords = records.filter((r) => {
    if (selectedScope !== "all" && r.scope !== selectedScope) return false;
    if (selectedCategory !== "all" && r.category !== selectedCategory) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchCat = r.category.toLowerCase().includes(q);
      const matchNotes = (r.notes || "").toLowerCase().includes(q);
      const matchFacility = (r.facility || "").toLowerCase().includes(q);
      const matchType = (r.activity_type || "").toLowerCase().includes(q);
      if (!matchCat && !matchNotes && !matchFacility && !matchType) return false;
    }
    return true;
  });

  const totalEmissions = filteredRecords.reduce((acc, r) => acc + (r.emissions_t_co2e || 0), 0);
  const totalEvidences = filteredRecords.reduce((acc, r) => acc + (r.attachments?.length || 0), 0);
  const scope1Count = records.filter((r) => r.scope === "scope1").length;
  const scope2Count = records.filter((r) => r.scope === "scope2").length;
  const scope3Count = records.filter((r) => r.scope === "scope3").length;

  return (
    <div className="space-y-6 pb-12">
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2 text-emerald-600 font-semibold text-xs tracking-wider uppercase">
            <TableCellsIcon className="w-4 h-4" />
            GHG Protocol Activity Registry
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mt-1">Environmental Activities</h1>
          <p className="text-sm text-slate-500 mt-1">
            Browse, filter, and audit all logged carbon-generating activity records across your IT enterprise.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={resetToInitial}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition"
            title="Reset to default IT enterprise sample data"
          >
            <ArrowPathIcon className="w-4 h-4" />
            Reset Data
          </button>
          <a
            href="/upload"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition"
          >
            <PlusIcon className="w-4 h-4" />
            Log New Activity
          </a>
        </div>
      </div>

      {/* METRICS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <p className="text-xs font-semibold text-slate-500">Filtered Footprint</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">
              {totalEmissions.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 })}
            </span>
            <span className="text-xs font-medium text-slate-500">tCO₂e</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">{filteredRecords.length} records matching</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <p className="text-xs font-semibold text-slate-500">Total Activity Records</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">{records.length}</span>
            <span className="text-xs font-medium text-slate-500">entries</span>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-1">
            <span className="text-emerald-600 font-bold">S1: {scope1Count}</span> |
            <span className="text-blue-600 font-bold">S2: {scope2Count}</span> |
            <span className="text-amber-600 font-bold">S3: {scope3Count}</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <p className="text-xs font-semibold text-slate-500">Evidence Verification</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-emerald-600">{totalEvidences}</span>
            <span className="text-xs font-medium text-slate-500">PDF documents</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">Utility bills, fuel logs & POs</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <p className="text-xs font-semibold text-slate-500">Audit Status</p>
          <div className="mt-2 flex items-center gap-2">
            <CheckCircleIcon className="w-6 h-6 text-emerald-500" />
            <span className="text-lg font-bold text-slate-900">100% GHG Verified</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">DEFRA 2024 / EPA AR5 Factors</p>
        </div>
      </div>

      {/* FILTER BAR */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Scope Tab Switcher */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl gap-1 shrink-0">
            {[
              { key: "all", label: `All Scopes (${records.length})` },
              { key: "scope1", label: `Scope 1 (${scope1Count})` },
              { key: "scope2", label: `Scope 2 (${scope2Count})` },
              { key: "scope3", label: `Scope 3 (${scope3Count})` },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setSelectedScope(tab.key as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  selectedScope === tab.key
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Box & Category Dropdown */}
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto flex-1 justify-end">
            <div className="relative w-full sm:w-64">
              <MagnifyingGlassIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search category, facility, notes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl text-xs border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
              />
            </div>

            <div className="relative w-full sm:w-56">
              <FunnelIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl text-xs border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition appearance-none"
              >
                <option value="all">All Categories</option>
                {uniqueCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* ACTIVITIES TABLE */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        {filteredRecords.length === 0 ? (
          <div className="p-12 text-center">
            <ExclamationTriangleIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-800">No Activity Records Found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              No logged activities matched your current search and scope filters.
            </p>
            <div className="mt-4 flex items-center justify-center gap-3">
              <button
                onClick={() => {
                  setSearchQuery("");
                  setSelectedScope("all");
                  setSelectedCategory("all");
                }}
                className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 underline"
              >
                Clear all filters
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Period / Date</th>
                  <th className="py-3.5 px-4">Scope</th>
                  <th className="py-3.5 px-4">Category & Sub-type</th>
                  <th className="py-3.5 px-4">Facility / Location</th>
                  <th className="py-3.5 px-4 text-right">Quantity</th>
                  <th className="py-3.5 px-4 text-right">Emissions (tCO₂e)</th>
                  <th className="py-3.5 px-4 text-center">Evidence</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredRecords.map((rec) => {
                  const scopeBadge =
                    rec.scope === "scope1"
                      ? { label: "Scope 1", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" }
                      : rec.scope === "scope2"
                      ? { label: "Scope 2", cls: "bg-blue-50 text-blue-700 border-blue-200" }
                      : { label: "Scope 3", cls: "bg-amber-50 text-amber-700 border-amber-200" };

                  return (
                    <tr key={rec.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3.5 px-4 font-medium whitespace-nowrap text-slate-900">
                        {rec.periodStart}
                        {rec.periodEnd && rec.periodEnd !== rec.periodStart ? ` to ${rec.periodEnd}` : ""}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${scopeBadge.cls}`}>
                          {scopeBadge.label}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 min-w-[200px]">
                        <p className="font-bold text-slate-900">{rec.category}</p>
                        {rec.activity_type && (
                          <p className="text-[11px] text-slate-500 mt-0.5">Sub-type: {rec.activity_type}</p>
                        )}
                        {rec.notes && (
                          <p className="text-[11px] text-slate-400 italic truncate max-w-xs mt-0.5">{rec.notes}</p>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                        {rec.facility || "—"}
                      </td>

                      <td className="py-3.5 px-4 text-right font-medium whitespace-nowrap text-slate-900">
                        {rec.quantity.toLocaleString()}{" "}
                        <span className="text-[11px] text-slate-500 font-normal">{rec.unit}</span>
                      </td>

                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <span className="font-extrabold text-emerald-700 text-sm">
                          {(rec.emissions_t_co2e || 0).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 3 })}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        {rec.attachments && rec.attachments.length > 0 ? (
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold text-[11px] border border-slate-200"
                            title={rec.attachments[0].fileName}
                          >
                            <DocumentCheckIcon className="w-3.5 h-3.5 text-emerald-600" />
                            PDF ({rec.attachments.length})
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">—</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setInspectRecord(rec)}
                            className="p-1.5 text-slate-400 hover:text-emerald-600 rounded-lg hover:bg-slate-100 transition"
                            title="View emission factor & audit details"
                          >
                            <InformationCircleIcon className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => setDeletingId(rec.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition"
                            title="Delete activity record"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* INSPECT MODAL */}
      <AnimatePresence>
        {inspectRecord && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-slate-200 rounded-2xl p-6 max-w-lg w-full shadow-2xl relative"
            >
              <button
                onClick={() => setInspectRecord(null)}
                className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs uppercase tracking-wider">
                <InformationCircleIcon className="w-5 h-5" />
                Calculation Audit Detail
              </div>

              <h3 className="text-xl font-bold text-slate-900 mt-2">{inspectRecord.category}</h3>

              <div className="mt-4 space-y-3 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Record ID:</span>
                  <span className="font-mono text-slate-800">{inspectRecord.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Scope:</span>
                  <span className="font-bold uppercase text-slate-800">{inspectRecord.scope}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Facility:</span>
                  <span className="text-slate-800 font-medium">{inspectRecord.facility || "Default HQ"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Input Volume / Spend:</span>
                  <span className="font-bold text-slate-900">
                    {inspectRecord.quantity.toLocaleString()} {inspectRecord.unit}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Calculated Emissions:</span>
                  <span className="font-extrabold text-emerald-600 text-sm">
                    {inspectRecord.emissions_t_co2e} tCO₂e
                  </span>
                </div>
              </div>

              <div className="mt-4">
                <p className="text-xs font-semibold text-slate-700">Applied Emission Factor Standard:</p>
                <p className="text-xs text-slate-600 mt-1 bg-emerald-50 border border-emerald-200 p-3 rounded-xl font-mono">
                  {inspectRecord.emissionFactorInfo || "GHG Protocol Standard DEFRA 2024 factor applied"}
                </p>
              </div>

              {inspectRecord.notes && (
                <div className="mt-4">
                  <p className="text-xs font-semibold text-slate-700">Auditor Notes:</p>
                  <p className="text-xs text-slate-600 mt-1 italic">{inspectRecord.notes}</p>
                </div>
              )}

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setInspectRecord(null)}
                  className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800"
                >
                  Close Audit
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CONFIRM DELETE MODAL */}
      <AnimatePresence>
        {deletingId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-slate-200 rounded-2xl p-6 max-w-sm w-full shadow-2xl"
            >
              <h3 className="text-lg font-bold text-slate-900">Delete Activity Record?</h3>
              <p className="text-xs text-slate-500 mt-2">
                This action will permanently delete this activity record and re-calculate your carbon footprint totals.
              </p>

              <div className="mt-6 flex items-center justify-end gap-3">
                <button
                  onClick={() => setDeletingId(null)}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    deleteRecord(deletingId);
                    setDeletingId(null);
                  }}
                  className="px-3.5 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-sm"
                >
                  Confirm Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}