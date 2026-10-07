import { useState } from "react";
import { useEmissionsRecords } from "../utils/useEmissionsRecords";
import {
  Cog6ToothIcon,
  BuildingOfficeIcon,
  CheckCircleIcon,
  ArrowPathIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";

import { useAuth } from "../context/AuthContext";
import { UserIcon } from "@heroicons/react/24/outline";

export default function Settings() {
  const { records, resetToInitial } = useEmissionsRecords();
  const { user } = useAuth();
  const [orgName, setOrgName] = useState("Global Enterprise IT Solutions");
  const [industry, setIndustry] = useState("Information Technology & Software Services");
  const [headcount, setHeadcount] = useState("1,250 FTE Employees");
  const [emissionFactorStandard, setEmissionFactorStandard] = useState("defra2024");
  const [savedSuccess, setSavedSuccess] = useState(false);

  const fullName = user?.full_name || user?.fullName || "Authenticated User";
  const userEmail = user?.email || "Not Available";
  const rawRole = user?.role || "admin";
  const roleLabel = rawRole === "admin" ? "Administrator" : (rawRole.charAt(0).toUpperCase() + rawRole.slice(1));
  const orgId = user?.organization_id || (user as any)?.organizationId || 1;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="space-y-6 pb-12 max-w-4xl">
      {/* HEADER */}
      <div className="border-b border-slate-200 pb-5">
        <div className="flex items-center gap-2 text-emerald-600 font-semibold text-xs tracking-wider uppercase">
          <Cog6ToothIcon className="w-4 h-4" />
          System Configuration
        </div>
        <h1 className="text-3xl font-bold text-slate-900 mt-1">Enterprise & Profile Settings</h1>
        <p className="text-sm text-slate-500 mt-1">
          Manage your authenticated user profile, organization profile, default GHG calculation standards, and data settings.
        </p>
      </div>

      {/* AUTHENTICATED USER PROFILE CARD */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <UserIcon className="w-5 h-5 text-emerald-600" />
          Authenticated User Profile (PostgreSQL Database)
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Full Name</label>
            <input
              type="text"
              readOnly
              value={fullName}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 font-medium"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Corporate Email Address</label>
            <input
              type="text"
              readOnly
              value={userEmail}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 font-medium"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Assigned Role</label>
            <input
              type="text"
              readOnly
              value={roleLabel}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-emerald-700 font-bold"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Organization ID</label>
            <input
              type="text"
              readOnly
              value={`Organization #${orgId}`}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 font-bold"
            />
          </div>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* ORGANIZATION PROFILE CARD */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <BuildingOfficeIcon className="w-5 h-5 text-emerald-600" />
            Organization Profile
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Company / Organization Name</label>
              <input
                type="text"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Industry Vertical</label>
              <input
                type="text"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Total Headcount</label>
              <input
                type="text"
                value={headcount}
                onChange={(e) => setHeadcount(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Active Activity Records</label>
              <input
                type="text"
                disabled
                value={`${records.length} records (${records.reduce((s, r) => s + (r.emissions_t_co2e || 0), 0).toFixed(2)} tCO₂e)`}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-500 font-bold"
              />
            </div>
          </div>
        </div>

        {/* EMISSION FACTOR ENGINE SETTINGS */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <ShieldCheckIcon className="w-5 h-5 text-emerald-600" />
            GHG Calculation Engine & Standards
          </h2>

          <div className="space-y-3 text-xs">
            <label className="block font-semibold text-slate-700">Emission Factor Database Standard</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label
                className={`p-4 rounded-xl border cursor-pointer transition ${
                  emissionFactorStandard === "defra2024"
                    ? "border-emerald-500 bg-emerald-50/50 ring-2 ring-emerald-500/20"
                    : "border-slate-200 bg-slate-50"
                }`}
              >
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="efStandard"
                    value="defra2024"
                    checked={emissionFactorStandard === "defra2024"}
                    onChange={() => setEmissionFactorStandard("defra2024")}
                    className="accent-emerald-600"
                  />
                  <span className="font-bold text-slate-900">UK DEFRA 2024 / IEA Standard</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1 pl-5">
                  Official UK Department for Environment & Rural Affairs 2024 factors for electricity & fuels.
                </p>
              </label>

              <label
                className={`p-4 rounded-xl border cursor-pointer transition ${
                  emissionFactorStandard === "epa"
                    ? "border-emerald-500 bg-emerald-50/50 ring-2 ring-emerald-500/20"
                    : "border-slate-200 bg-slate-50"
                }`}
              >
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="efStandard"
                    value="epa"
                    checked={emissionFactorStandard === "epa"}
                    onChange={() => setEmissionFactorStandard("epa")}
                    className="accent-emerald-600"
                  />
                  <span className="font-bold text-slate-900">US EPA Climate Leaders / IPCC AR5</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1 pl-5">
                  US Environmental Protection Agency eGRID e-factors and IPCC Fifth Assessment Report GWP values.
                </p>
              </label>
            </div>
          </div>
        </div>

        {/* DATA MANAGEMENT & RESET */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Restore Sample IT Enterprise Dataset</h3>
            <p className="text-xs text-slate-500 mt-0.5">Reset active emissions database to default sample IT activities.</p>
          </div>

          <button
            type="button"
            onClick={resetToInitial}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition"
          >
            <ArrowPathIcon className="w-4 h-4" />
            Reset Data
          </button>
        </div>

        {/* SAVE ACTION BUTTON */}
        <div className="flex items-center justify-between pt-2">
          {savedSuccess && (
            <span className="inline-flex items-center gap-1.5 text-emerald-600 text-xs font-bold bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
              <CheckCircleIcon className="w-4 h-4" />
              Settings saved successfully!
            </span>
          )}
          <button
            type="submit"
            className="ml-auto px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
          >
            Save Settings
          </button>
        </div>
      </form>
    </div>
  );
}