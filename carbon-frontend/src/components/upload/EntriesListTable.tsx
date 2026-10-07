import { useState } from "react";
import type { EmissionsRecord, ScopeType } from "../../types/emissions";
import { formatBytes } from "../../utils/emissionsCalculator";
import {
  DocumentTextIcon,
  PencilSquareIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  ArrowDownTrayIcon,
  PaperClipIcon,
  InboxIcon,
} from "@heroicons/react/24/outline";

interface EntriesListTableProps {
  records: EmissionsRecord[];
  activeScopeFilter: ScopeType | "all";
  onScopeFilterChange: (scope: ScopeType | "all") => void;
  onEditRecord: (record: EmissionsRecord) => void;
  onDeleteRecord: (id: string) => void;
}

export default function EntriesListTable({
  records,
  activeScopeFilter,
  onScopeFilterChange,
  onEditRecord,
  onDeleteRecord,
}: EntriesListTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Filter records by Scope and Search term
  const filteredRecords = records.filter((rec) => {
    const matchesScope =
      activeScopeFilter === "all" || rec.scope === activeScopeFilter;

    const matchesSearch =
      rec.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (rec.facility && rec.facility.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (rec.notes && rec.notes.toLowerCase().includes(searchTerm.toLowerCase()));

    return matchesScope && matchesSearch;
  });

  const getScopeBadge = (scope: ScopeType) => {
    switch (scope) {
      case "scope1":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-700 border border-rose-200">
            Scope 1
          </span>
        );
      case "scope2":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
            Scope 2
          </span>
        );
      case "scope3":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            Scope 3
          </span>
        );
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-0">
      {/* Header & Controls */}
      <div className="p-6 border-b border-slate-200 bg-slate-50/70 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900">
            Logged Emissions Activities ({filteredRecords.length})
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            View, filter, edit, or manage supporting evidence for all submitted records
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Scope Pill Filter */}
          <div className="flex items-center p-1 bg-slate-200/80 rounded-xl text-xs font-bold text-slate-600">
            <button
              type="button"
              onClick={() => onScopeFilterChange("all")}
              className={`px-3 py-1.5 rounded-lg transition ${
                activeScopeFilter === "all"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "hover:text-slate-900"
              }`}
            >
              All Scopes ({records.length})
            </button>
            <button
              type="button"
              onClick={() => onScopeFilterChange("scope1")}
              className={`px-3 py-1.5 rounded-lg transition ${
                activeScopeFilter === "scope1"
                  ? "bg-white text-rose-700 shadow-sm"
                  : "hover:text-slate-900"
              }`}
            >
              Scope 1
            </button>
            <button
              type="button"
              onClick={() => onScopeFilterChange("scope2")}
              className={`px-3 py-1.5 rounded-lg transition ${
                activeScopeFilter === "scope2"
                  ? "bg-white text-amber-800 shadow-sm"
                  : "hover:text-slate-900"
              }`}
            >
              Scope 2
            </button>
            <button
              type="button"
              onClick={() => onScopeFilterChange("scope3")}
              className={`px-3 py-1.5 rounded-lg transition ${
                activeScopeFilter === "scope3"
                  ? "bg-white text-emerald-800 shadow-sm"
                  : "hover:text-slate-900"
              }`}
            >
              Scope 3
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative flex-1 md:w-56">
            <MagnifyingGlassIcon className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search activity or site..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-300 bg-white text-xs text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>
      </div>

      {/* Records Table */}
      {filteredRecords.length === 0 ? (
        <div className="p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400 mb-3">
            <InboxIcon className="w-8 h-8" />
          </div>
          <h4 className="text-base font-bold text-slate-800">
            No emissions records found
          </h4>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
            {records.length === 0
              ? "Use the form above to log your first Scope 1, 2, or 3 activity record."
              : "No records match the selected scope filter or search query."}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100/60 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="py-3.5 px-4">Scope & Category</th>
                <th className="py-3.5 px-4">Activity Volume / Spend</th>
                <th className="py-3.5 px-4">Calculated Footprint</th>
                <th className="py-3.5 px-4">Reporting Period</th>
                <th className="py-3.5 px-4">Facility / Site</th>
                <th className="py-3.5 px-4">Evidence (PDFs)</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {filteredRecords.map((record) => (
                <tr
                  key={record.id}
                  className="hover:bg-slate-50/80 transition-colors group"
                >
                  {/* Scope & Category */}
                  <td className="py-4 px-4">
                    <div className="flex items-start gap-2.5">
                      <div className="mt-0.5">{getScopeBadge(record.scope)}</div>
                      <div>
                        <p className="font-bold text-slate-900 text-sm">
                          {record.category}
                        </p>
                        {record.activity_type && record.activity_type !== record.category && (
                          <p className="text-[11px] font-semibold text-emerald-700 mt-0.5">
                            Sub-type: {record.activity_type} {record.equipment_type ? `(${record.equipment_type})` : ""}
                          </p>
                        )}
                        {record.notes && (
                          <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                            "{record.notes}"
                          </p>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Activity Quantity & Unit */}
                  <td className="py-4 px-4">
                    <p className="font-bold text-slate-900 text-sm">
                      {record.inputMode === "spend_based"
                        ? `${record.currency || "$"} ${(record.quantity ?? 0).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}`
                        : (record.quantity ?? 0).toLocaleString()}
                    </p>
                    <span className="text-[11px] font-semibold text-slate-500">
                      {record.unit || "N/A"} ({record.inputMode === "spend_based" ? "Spend" : "Physical"})
                    </span>
                  </td>

                  {/* Calculated Footprint (tCO2e) */}
                  <td className="py-4 px-4">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 font-bold text-sm">
                      <span className="text-emerald-600">⚡</span>
                      <span>{(record.emissions_t_co2e ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })} tCO₂e</span>
                    </div>
                    {record.emissionFactorInfo && (
                      <p className="text-[10px] text-slate-400 mt-1 max-w-[180px] truncate" title={record.emissionFactorInfo}>
                        {record.emissionFactorInfo}
                      </p>
                    )}
                  </td>

                  {/* Period */}
                  <td className="py-4 px-4 text-slate-600 font-medium whitespace-nowrap">
                    <div>
                      <span>{record.periodStart}</span>
                      <span className="mx-1 text-slate-400">to</span>
                      <span>{record.periodEnd}</span>
                    </div>
                  </td>

                  {/* Facility */}
                  <td className="py-4 px-4 text-slate-700 font-medium">
                    {record.facility ? (
                      <span className="inline-flex items-center gap-1 text-slate-800">
                        {record.facility}
                      </span>
                    ) : (
                      <span className="text-slate-400 italic">Not specified</span>
                    )}
                  </td>

                  {/* Evidence PDF Attachments */}
                  <td className="py-4 px-4">
                    {record.attachments && record.attachments.length > 0 ? (
                      <div className="flex flex-col gap-1">
                        {record.attachments.map((att) => (
                          <a
                            key={att.id}
                            href={att.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 transition max-w-[200px]"
                            title={`Download ${att.fileName} (${formatBytes(att.sizeBytes)})`}
                          >
                            <DocumentTextIcon className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate text-[11px] font-medium">
                              {att.fileName}
                            </span>
                            <ArrowDownTrayIcon className="w-3 h-3 shrink-0 text-rose-500" />
                          </a>
                        ))}
                      </div>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-slate-400 text-[11px]">
                        <PaperClipIcon className="w-3.5 h-3.5" /> None
                      </span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="py-4 px-4 text-right">
                    {deleteConfirmId === record.id ? (
                      <div className="flex items-center justify-end gap-2">
                        <span className="text-[11px] text-rose-600 font-bold">
                          Delete?
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            onDeleteRecord(record.id);
                            setDeleteConfirmId(null);
                          }}
                          className="px-2 py-1 bg-rose-600 text-white rounded text-[11px] font-bold hover:bg-rose-700"
                        >
                          Yes
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmId(null)}
                          className="px-2 py-1 bg-slate-200 text-slate-700 rounded text-[11px] font-bold"
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => onEditRecord(record)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 transition"
                          title="Edit activity record"
                        >
                          <PencilSquareIcon className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => setDeleteConfirmId(record.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                          title="Delete record"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
