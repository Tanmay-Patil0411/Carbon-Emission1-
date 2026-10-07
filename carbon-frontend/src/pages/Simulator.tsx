import { useState } from "react";
import { useEmissionsRecords } from "../utils/useEmissionsRecords";
import {
  ArrowTrendingDownIcon,
  SparklesIcon,
  BoltIcon,
  CloudIcon,
  FireIcon,
  UserGroupIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";

export default function Simulator() {
  const { records, resetToInitial } = useEmissionsRecords();

  const totalEmissions = records.reduce((sum, r) => sum + (r.emissions_t_co2e || 0), 0);
  const scope1Total = records.filter((r) => r.scope === "scope1").reduce((sum, r) => sum + (r.emissions_t_co2e || 0), 0);
  const scope2Total = records.filter((r) => r.scope === "scope2").reduce((sum, r) => sum + (r.emissions_t_co2e || 0), 0);
  const scope3Total = records.filter((r) => r.scope === "scope3").reduce((sum, r) => sum + (r.emissions_t_co2e || 0), 0);

  // Simulator Sliders (0 - 100%)
  const [recPpaPercent, setRecPpaPercent] = useState<number>(50); // Scope 2 Power
  const [cloudOptPercent, setCloudOptPercent] = useState<number>(40); // Scope 3 Cloud
  const [generatorBessPercent, setGeneratorBessPercent] = useState<number>(30); // Scope 1 Diesel
  const [wfhEnergyPercent, setWfhEnergyPercent] = useState<number>(25); // Scope 3 WFH

  // Dynamic Reductions
  const scope2Savings = scope2Total * (recPpaPercent / 100);
  const cloudSavings = scope3Total * 0.5 * (cloudOptPercent / 100);
  const scope1Savings = scope1Total * (generatorBessPercent / 100);
  const wfhSavings = scope3Total * 0.3 * (wfhEnergyPercent / 100);

  const totalSavings = scope2Savings + cloudSavings + scope1Savings + wfhSavings;
  const simulatedFootprint = Math.max(0, totalEmissions - totalSavings);
  const percentageReduced = totalEmissions > 0 ? (totalSavings / totalEmissions) * 100 : 0;

  return (
    <div className="space-y-6 pb-12">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2 text-emerald-600 font-semibold text-xs tracking-wider uppercase">
            <ArrowTrendingDownIcon className="w-4 h-4" />
            What-If Scenario Modeling
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mt-1">What-If Decarbonization Simulator</h1>
          <p className="text-sm text-slate-500 mt-1">
            Simulate operational decarbonization scenarios and forecast live carbon reduction on your logged dataset.
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

      {/* DASHBOARD COMPARISON HERO */}
      <div className="bg-slate-950 text-white rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-xl grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-3">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Current Baseline</p>
          <p className="text-4xl font-extrabold text-white">
            {totalEmissions.toFixed(2)} <span className="text-sm font-normal text-slate-400">tCO₂e</span>
          </p>
          <p className="text-xs text-slate-400">Aggregated footprint from active logged records</p>
        </div>

        <div className="space-y-3 border-t lg:border-t-0 lg:border-l border-slate-800 pt-4 lg:pt-0 lg:pl-6">
          <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Simulated Target Footprint</p>
          <p className="text-4xl font-extrabold text-emerald-400">
            {simulatedFootprint.toFixed(2)} <span className="text-sm font-normal text-slate-400">tCO₂e</span>
          </p>
          <p className="text-xs text-slate-400">Forecast footprint after scenario intervention</p>
        </div>

        <div className="space-y-3 border-t lg:border-t-0 lg:border-l border-slate-800 pt-4 lg:pt-0 lg:pl-6">
          <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Net Carbon Savings</p>
          <p className="text-4xl font-extrabold text-emerald-400">
            -{totalSavings.toFixed(2)} <span className="text-sm font-normal text-slate-400">tCO₂e ({percentageReduced.toFixed(1)}%)</span>
          </p>
          <div className="h-2 bg-slate-800 rounded-full overflow-hidden mt-2">
            <div className="h-full bg-emerald-400 rounded-full transition-all duration-300" style={{ width: `${percentageReduced}%` }} />
          </div>
        </div>
      </div>

      {/* INTERACTIVE SCENARIO SLIDERS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* SLIDERS PANEL */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <SparklesIcon className="w-5 h-5 text-emerald-600" />
            Operational Scenario Controls
          </h2>

          {/* Slider 1: Renewable Energy PPA */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-slate-800 flex items-center gap-1.5">
                <BoltIcon className="w-4 h-4 text-blue-600" /> Scope 2 Renewable PPA Adoption
              </span>
              <span className="font-extrabold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                {recPpaPercent}% ({scope2Savings.toFixed(1)} tCO₂e cut)
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={recPpaPercent}
              onChange={(e) => setRecPpaPercent(Number(e.target.value))}
              className="w-full accent-emerald-600 bg-slate-100 h-2 rounded-lg cursor-pointer"
            />
            <p className="text-[11px] text-slate-500">Procure zero-carbon renewable power tariffs for server rooms & office tech parks.</p>
          </div>

          {/* Slider 2: Cloud Workload Optimization */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-slate-800 flex items-center gap-1.5">
                <CloudIcon className="w-4 h-4 text-amber-600" /> Cloud Compute & SaaS Optimization
              </span>
              <span className="font-extrabold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                {cloudOptPercent}% ({cloudSavings.toFixed(1)} tCO₂e cut)
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={cloudOptPercent}
              onChange={(e) => setCloudOptPercent(Number(e.target.value))}
              className="w-full accent-emerald-600 bg-slate-100 h-2 rounded-lg cursor-pointer"
            />
            <p className="text-[11px] text-slate-500">Migrate AWS/Azure instances to eco-friendly regions and optimize server idle times.</p>
          </div>

          {/* Slider 3: Diesel Generator Replacement */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-slate-800 flex items-center gap-1.5">
                <FireIcon className="w-4 h-4 text-rose-600" /> Scope 1 Battery Generator Transition
              </span>
              <span className="font-extrabold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                {generatorBessPercent}% ({scope1Savings.toFixed(1)} tCO₂e cut)
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={generatorBessPercent}
              onChange={(e) => setGeneratorBessPercent(Number(e.target.value))}
              className="w-full accent-emerald-600 bg-slate-100 h-2 rounded-lg cursor-pointer"
            />
            <p className="text-[11px] text-slate-500">Replace diesel generator runtime with lithium battery storage systems (BESS).</p>
          </div>

          {/* Slider 4: Remote Employee WFH Energy Policy */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-slate-800 flex items-center gap-1.5">
                <UserGroupIcon className="w-4 h-4 text-emerald-600" /> Remote WFH Energy Efficiency Policy
              </span>
              <span className="font-extrabold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                {wfhEnergyPercent}% ({wfhSavings.toFixed(1)} tCO₂e cut)
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={wfhEnergyPercent}
              onChange={(e) => setWfhEnergyPercent(Number(e.target.value))}
              className="w-full accent-emerald-600 bg-slate-100 h-2 rounded-lg cursor-pointer"
            />
            <p className="text-[11px] text-slate-500">Subsidize Energy Star home electronics and smart power strips for hybrid engineers.</p>
          </div>
        </div>

        {/* VISUAL BREAKDOWN COMPARISON */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 mb-4">Baseline vs Simulated Footprint</h2>

            <div className="space-y-6 pt-4">
              <div>
                <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                  <span>Current Enterprise Baseline</span>
                  <span>{totalEmissions.toFixed(2)} tCO₂e</span>
                </div>
                <div className="h-6 bg-slate-100 rounded-xl overflow-hidden p-1">
                  <div className="h-full bg-slate-800 rounded-lg w-full" />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold text-emerald-700 mb-1">
                  <span>Simulated Footprint</span>
                  <span>{simulatedFootprint.toFixed(2)} tCO₂e</span>
                </div>
                <div className="h-6 bg-slate-100 rounded-xl overflow-hidden p-1">
                  <div
                    className="h-full bg-emerald-500 rounded-lg transition-all duration-300"
                    style={{ width: `${totalEmissions > 0 ? (simulatedFootprint / totalEmissions) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="mt-8 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
              <p className="font-bold text-slate-900">Scenario Breakdown by Scope:</p>
              <div className="flex justify-between text-slate-600">
                <span>Scope 1 Remaining:</span>
                <span className="font-bold text-slate-900">{(scope1Total - scope1Savings).toFixed(2)} tCO₂e</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Scope 2 Remaining:</span>
                <span className="font-bold text-slate-900">{(scope2Total - scope2Savings).toFixed(2)} tCO₂e</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Scope 3 Remaining:</span>
                <span className="font-bold text-slate-900">{(scope3Total - (cloudSavings + wfhSavings)).toFixed(2)} tCO₂e</span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-500">Live dynamic simulation</span>
            <button
              onClick={() => {
                setRecPpaPercent(0);
                setCloudOptPercent(0);
                setGeneratorBessPercent(0);
                setWfhEnergyPercent(0);
              }}
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700"
            >
              Reset Sliders
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}