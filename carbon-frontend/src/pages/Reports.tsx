import { useState } from "react";
import { useEmissionsRecords } from "../utils/useEmissionsRecords";
import { reportsApi } from "../services/api";
import {
  DocumentTextIcon,
  PrinterIcon,
  CheckCircleIcon,
  ArrowPathIcon,
  ArrowDownTrayIcon,
  ExclamationCircleIcon,
} from "@heroicons/react/24/outline";

export default function Reports() {
  const { records, resetToInitial } = useEmissionsRecords();
  const [reportType, setReportType] = useState<"ghg" | "executive" | "audit">("ghg");
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState("");

  const totalEmissions = records.reduce((sum, r) => sum + (r.emissions_t_co2e || 0), 0);
  const scope1Total = records.filter((r) => r.scope === "scope1").reduce((sum, r) => sum + (r.emissions_t_co2e || 0), 0);
  const scope2Total = records.filter((r) => r.scope === "scope2").reduce((sum, r) => sum + (r.emissions_t_co2e || 0), 0);
  const scope3Total = records.filter((r) => r.scope === "scope3").reduce((sum, r) => sum + (r.emissions_t_co2e || 0), 0);

  const evidenceCount = records.reduce((sum, r) => sum + (r.attachments ? r.attachments.length : 0), 0);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    setIsDownloading(true);
    setDownloadError("");
    try {
      const blobData = await reportsApi.downloadPdf();
      const blob = new Blob([blobData], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "CarbonTrack_Emissions_Report.pdf";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error("Error downloading PDF report:", err);
      if (err.response?.status === 401) {
        setDownloadError("Please log in to download the report.");
      } else {
        setDownloadError("Unable to generate report. Please try again.");
      }
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2 text-emerald-600 font-semibold text-xs tracking-wider uppercase">
            <DocumentTextIcon className="w-4 h-4" />
            Compliance & ESG Reporting
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mt-1">Sustainability Reports</h1>
          <p className="text-sm text-slate-500 mt-1">
            Generate audit-ready GHG Protocol corporate standards reports dynamically from logged activity data.
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
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition"
          >
            <PrinterIcon className="w-4 h-4" />
            Print Preview
          </button>
          <button
            onClick={handleDownloadPdf}
            disabled={isDownloading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 shadow-sm transition"
          >
            <ArrowDownTrayIcon className="w-4 h-4" />
            {isDownloading ? "Generating PDF..." : "Download PDF Report"}
          </button>
        </div>
      </div>

      {downloadError && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-3 text-xs font-semibold text-rose-700">
          <ExclamationCircleIcon className="w-5 h-5 shrink-0" />
          <span>{downloadError}</span>
        </div>
      )}

      {/* REPORT TYPE TABS */}
      <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl w-fit">
        {[
          { key: "ghg", label: "GHG Protocol Standard Report" },
          { key: "executive", label: "Executive ESG Summary" },
          { key: "audit", label: "Evidence Audit Trail" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setReportType(tab.key as any)}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition ${
              reportType === tab.key
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* DYNAMIC REPORT DOCUMENT CARD */}
      <div className="bg-white border border-slate-200 rounded-3xl p-8 sm:p-10 shadow-lg space-y-8 max-w-4xl mx-auto print:shadow-none print:border-none">
        {/* DOCUMENT HEADER */}
        <div className="flex justify-between items-start border-b border-slate-200 pb-6">
          <div>
            <div className="flex items-center gap-2 text-emerald-600 font-black text-lg">
              <span className="w-7 h-7 rounded-lg bg-emerald-500 text-white flex items-center justify-center font-bold text-xs">
                CT
              </span>
              CarbonTrack Enterprise ESG Report
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mt-3">
              {reportType === "ghg"
                ? "GHG Protocol Corporate Standard Emissions Inventory"
                : reportType === "executive"
                ? "Executive Sustainability & Net-Zero Overview"
                : "Supporting PDF Evidence Audit Trail"}
            </h2>
            <p className="text-xs text-slate-400 mt-1">Reporting Period: FY2026 Q1 | Date Generated: 2026-09-11</p>
          </div>

          <div className="text-right">
            <span className="inline-block px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 font-bold text-xs border border-emerald-200">
              GHG Verified
            </span>
            <p className="text-[11px] text-slate-400 mt-2">ISO 14064-1 Compliant</p>
          </div>
        </div>

        {/* METRICS OVERVIEW TABLE */}
        <div>
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider text-slate-500 mb-4">
            Emissions Inventory Summary
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <p className="text-[11px] font-semibold text-slate-500">Total Enterprise Footprint</p>
              <p className="text-2xl font-black text-slate-900 mt-1">{totalEmissions.toFixed(2)}</p>
              <p className="text-[11px] text-slate-400">tCO₂e</p>
            </div>
            <div className="bg-emerald-50/60 p-4 rounded-2xl border border-emerald-200">
              <p className="text-[11px] font-semibold text-emerald-800">Scope 1 Direct</p>
              <p className="text-2xl font-extrabold text-emerald-700 mt-1">{scope1Total.toFixed(2)}</p>
              <p className="text-[11px] text-emerald-600">tCO₂e</p>
            </div>
            <div className="bg-blue-50/60 p-4 rounded-2xl border border-blue-200">
              <p className="text-[11px] font-semibold text-blue-800">Scope 2 Electricity</p>
              <p className="text-2xl font-extrabold text-blue-700 mt-1">{scope2Total.toFixed(2)}</p>
              <p className="text-[11px] text-blue-600">tCO₂e</p>
            </div>
            <div className="bg-amber-50/60 p-4 rounded-2xl border border-amber-200">
              <p className="text-[11px] font-semibold text-amber-800">Scope 3 Value Chain</p>
              <p className="text-2xl font-extrabold text-amber-700 mt-1">{scope3Total.toFixed(2)}</p>
              <p className="text-[11px] text-amber-600">tCO₂e</p>
            </div>
          </div>
        </div>

        {/* DETAILED CATEGORY BREAKDOWN TABLE */}
        <div>
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider text-slate-500 mb-4">
            Categorized GHG Activity Inventory
          </h3>
          <div className="border border-slate-200 rounded-2xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-600">
                <tr>
                  <th className="py-3 px-4">Activity Category</th>
                  <th className="py-3 px-4">Scope</th>
                  <th className="py-3 px-4 text-right">Volume / Spend</th>
                  <th className="py-3 px-4 text-right">Emissions (tCO₂e)</th>
                  <th className="py-3 px-4 text-center">Evidences</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {records.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/60">
                    <td className="py-3 px-4 font-bold text-slate-900">
                      {r.category}
                      <p className="text-[11px] font-normal text-slate-400">{r.facility || r.periodStart}</p>
                    </td>
                    <td className="py-3 px-4 uppercase font-bold text-[10px] text-slate-600">{r.scope}</td>
                    <td className="py-3 px-4 text-right font-medium text-slate-800">
                      {r.quantity.toLocaleString()} {r.unit}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-emerald-700">{r.emissions_t_co2e} tCO₂e</td>
                    <td className="py-3 px-4 text-center">
                      {r.attachments && r.attachments.length > 0 ? (
                        <span className="text-emerald-600 font-semibold">{r.attachments.length} PDF</span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* AUDIT SIGN-OFF FOOTER */}
        <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <div className="flex items-center gap-2">
            <CheckCircleIcon className="w-5 h-5 text-emerald-600" />
            <span>Calculated using DEFRA 2024 / EPA AR5 emission factors.</span>
          </div>

          <div className="text-right">
            <p className="font-semibold text-slate-700">CarbonTrack Assurance Engine</p>
            <p className="text-[10px] text-slate-400">Total Attached Evidence PDF Files: {evidenceCount}</p>
          </div>
        </div>
      </div>
    </div>
  );
}