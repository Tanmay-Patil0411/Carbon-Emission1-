import { useState } from "react";
import { useEmissionsRecords } from "../utils/useEmissionsRecords";
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  DocumentCheckIcon,
  ShieldCheckIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";

export default function Validation() {
  const { records, resetToInitial } = useEmissionsRecords();
  const [validatedIds, setValidatedIds] = useState<Set<string>>(new Set());

  const handleToggleValidate = (id: string) => {
    setValidatedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Compute audit flags dynamically
  const totalRecords = records.length;
  const recordsWithEvidence = records.filter((r) => r.attachments && r.attachments.length > 0);
  const totalFootprint = records.reduce((acc, r) => acc + (r.emissions_t_co2e || 0), 0);

  const auditItems = records.map((rec) => {
    const hasPDF = rec.attachments && rec.attachments.length > 0;
    const isHighImpact = (rec.emissions_t_co2e || 0) > 15;
    const isOutlier = totalFootprint > 0 && ((rec.emissions_t_co2e || 0) / totalFootprint) > 0.35;
    const isValidated = validatedIds.has(rec.id) || hasPDF;

    let flag: { status: "valid" | "warning" | "error"; text: string } = {
      status: "valid",
      text: "Passed GHG Protocol verification standards",
    };

    if (!hasPDF && (rec.scope === "scope1" || rec.scope === "scope2")) {
      flag = {
        status: "warning",
        text: "Missing PDF utility bill / invoice attachment for Scope 1/2 verification",
      };
    } else if (isOutlier) {
      flag = {
        status: "warning",
        text: "High carbon intensity outlier (>35% of total enterprise footprint)",
      };
    }

    return {
      record: rec,
      hasPDF,
      isHighImpact,
      isOutlier,
      isValidated,
      flag,
    };
  });

  const validCount = auditItems.filter((i) => i.isValidated).length;
  const warningCount = auditItems.filter((i) => i.flag.status === "warning").length;
  const dataQualityScore = totalRecords > 0 ? Math.round((validCount / totalRecords) * 100) : 0;

  return (
    <div className="space-y-6 pb-12">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2 text-emerald-600 font-semibold text-xs tracking-wider uppercase">
            <ShieldCheckIcon className="w-4 h-4" />
            GHG Protocol Assurance & QA
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mt-1">Environmental Data Audit</h1>
          <p className="text-sm text-slate-500 mt-1">
            Automated quality control, evidence verification, and outlier audit trail for your logged carbon activity data.
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

      {/* METRICS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <p className="text-xs font-semibold text-slate-500">Data Completeness Score</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black text-emerald-600">{dataQualityScore}%</span>
            <span className="text-xs text-slate-400">GHG compliant</span>
          </div>
          <div className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${dataQualityScore}%` }} />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <p className="text-xs font-semibold text-slate-500">Verified Activities</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">{validCount}</span>
            <span className="text-xs text-slate-400">of {totalRecords} records</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">Evidence attached or approved</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <p className="text-xs font-semibold text-slate-500">Audit Warnings</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-amber-600">{warningCount}</span>
            <span className="text-xs text-slate-400">flags</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">Missing evidence or high intensity</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <p className="text-xs font-semibold text-slate-500">Document Evidence Count</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-blue-600">{recordsWithEvidence.length}</span>
            <span className="text-xs text-slate-400">PDF files</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">Attached utility bills & invoices</p>
        </div>
      </div>

      {/* AUDIT LOG TABLE */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">Activity Record Audit Queue</h2>
          <span className="text-xs font-medium text-slate-500">{auditItems.length} records evaluated</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Activity Category</th>
                <th className="py-3.5 px-4">Scope</th>
                <th className="py-3.5 px-4">Quantity & Emissions</th>
                <th className="py-3.5 px-4">Audit Assessment</th>
                <th className="py-3.5 px-4">Evidence</th>
                <th className="py-3.5 px-4 text-right">Verification</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {auditItems.map(({ record, hasPDF, isValidated, flag }) => (
                <tr key={record.id} className="hover:bg-slate-50/80 transition">
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    {isValidated ? (
                      <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full font-bold text-[11px] border border-emerald-200">
                        <CheckCircleIcon className="w-3.5 h-3.5" />
                        Verified
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full font-bold text-[11px] border border-amber-200">
                        <ExclamationTriangleIcon className="w-3.5 h-3.5" />
                        Needs Review
                      </span>
                    )}
                  </td>

                  <td className="py-3.5 px-4 min-w-[180px]">
                    <p className="font-bold text-slate-900">{record.category}</p>
                    <p className="text-[11px] text-slate-400">{record.facility || record.periodStart}</p>
                  </td>

                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <span className="uppercase font-extrabold text-[10px] text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                      {record.scope}
                    </span>
                  </td>

                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <p className="font-medium text-slate-900">
                      {record.quantity.toLocaleString()} {record.unit}
                    </p>
                    <p className="font-bold text-emerald-700 text-xs">
                      {record.emissions_t_co2e} tCO₂e
                    </p>
                  </td>

                  <td className="py-3.5 px-4 max-w-xs">
                    <p className={`text-[11px] ${flag.status === "warning" ? "text-amber-800 font-medium" : "text-slate-600"}`}>
                      {flag.text}
                    </p>
                  </td>

                  <td className="py-3.5 px-4 whitespace-nowrap">
                    {hasPDF ? (
                      <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold text-[11px]">
                        <DocumentCheckIcon className="w-4 h-4 text-emerald-600" />
                        {record.attachments[0].fileName}
                      </span>
                    ) : (
                      <a
                        href="/upload"
                        className="text-emerald-600 hover:text-emerald-700 font-semibold text-[11px] underline"
                      >
                        Attach PDF Evidence
                      </a>
                    )}
                  </td>

                  <td className="py-3.5 px-4 text-right whitespace-nowrap">
                    <button
                      onClick={() => handleToggleValidate(record.id)}
                      className={`px-3 py-1.5 rounded-xl font-bold text-xs transition ${
                        isValidated
                          ? "bg-slate-100 text-slate-700 hover:bg-slate-200"
                          : "bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm"
                      }`}
                    >
                      {isValidated ? "Mark Pending" : "Approve Record"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}