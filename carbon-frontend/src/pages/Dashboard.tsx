import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Html } from "@react-three/drei";
import { useRef, useState, useEffect } from "react";
import { motion } from "framer-motion";
import * as THREE from "three";
import type { EmissionsRecord } from "../types/emissions";
import {
  ArrowUpRightIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";

const LOCAL_STORAGE_KEY = "carbontrack_emissions_records";

type EmissionSource = {
  id: string;
  name: string;
  icon: string;
  value: number;
  scope: string;
  description: string;
  color: string;
  position: [number, number, number];
};

function Earth({
  sources,
  selectedSourceId,
  onSelect,
}: {
  sources: EmissionSource[];
  selectedSourceId: string;
  onSelect: (source: EmissionSource) => void;
}) {
  const earthRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (earthRef.current) {
      earthRef.current.rotation.y += 0.0018;
    }
  });

  return (
    <group ref={earthRef}>
      {/* Main digital Earth */}
      <mesh>
        <sphereGeometry args={[1.65, 64, 64]} />
        <meshStandardMaterial color="#064e3b" roughness={0.85} metalness={0.1} />
      </mesh>

      {/* Digital grid */}
      <mesh scale={1.012}>
        <sphereGeometry args={[1.65, 32, 32]} />
        <meshBasicMaterial color="#34d399" wireframe transparent opacity={0.16} />
      </mesh>

      {/* Atmosphere glow */}
      <mesh scale={1.08}>
        <sphereGeometry args={[1.65, 32, 32]} />
        <meshBasicMaterial color="#10b981" transparent opacity={0.06} side={THREE.BackSide} />
      </mesh>

      {/* Emission source markers on 3D globe */}
      {sources.map((source) => {
        const isSelected = selectedSourceId === source.id;

        return (
          <group key={source.id} position={source.position}>
            {/* Marker point */}
            <mesh>
              <sphereGeometry args={[0.045, 16, 16]} />
              <meshBasicMaterial color={source.color} />
            </mesh>

            {/* Pulse ring */}
            <mesh scale={isSelected ? 1.4 : 1}>
              <ringGeometry args={[0.05, 0.08, 16]} />
              <meshBasicMaterial color={source.color} transparent opacity={0.7} side={THREE.DoubleSide} />
            </mesh>

            {/* Small source label */}
            <Html distanceFactor={7} position={[0.08, 0.12, 0]} center>
              <div
                className={`pointer-events-auto cursor-pointer whitespace-nowrap rounded-lg border px-2 py-1 shadow-lg backdrop-blur-md transition-all ${
                  isSelected
                    ? "border-emerald-400/50 bg-slate-900/95 scale-105"
                    : "border-slate-700 bg-slate-950/80 opacity-80 hover:opacity-100"
                }`}
                onClick={(event) => {
                  event.stopPropagation();
                  onSelect(source);
                }}
              >
                <div className="flex items-center gap-1.5">
                  <span className="text-sm">{source.icon}</span>
                  <span className="text-[10px] font-semibold text-white">{source.name}</span>
                </div>
                <p className="mt-0.5 text-[10px] font-bold" style={{ color: source.color }}>
                  {source.value.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 })} tCO₂e
                </p>
              </div>
            </Html>
          </group>
        );
      })}

      {/* Orbit ring */}
      <mesh rotation={[Math.PI / 2.7, 0, 0]}>
        <torusGeometry args={[2.05, 0.008, 16, 100]} />
        <meshBasicMaterial color="#34d399" transparent opacity={0.4} />
      </mesh>

      <ambientLight intensity={1.6} />
      <pointLight position={[3, 2, 4]} intensity={5} color="#ffffff" />
    </group>
  );
}

function EarthScene({
  sources,
  selectedSourceId,
  onSelect,
}: {
  sources: EmissionSource[];
  selectedSourceId: string;
  onSelect: (source: EmissionSource) => void;
}) {
  return (
    <Canvas camera={{ position: [0, 0, 5], fov: 45 }}>
      <Earth sources={sources} selectedSourceId={selectedSourceId} onSelect={onSelect} />
      <OrbitControls enablePan={false} minDistance={3.5} maxDistance={7} autoRotate={false} enableZoom={true} />
    </Canvas>
  );
}

import { useEmissionsRecords } from "../utils/useEmissionsRecords";
import { useAuth } from "../context/AuthContext";

export default function Dashboard() {
  const { records } = useEmissionsRecords();
  const { user } = useAuth();
  const fullName = user?.full_name || user?.fullName || "Enterprise User";

  // Compute live metrics from actual logged records
  const totalEmissions = records.reduce((acc, r) => acc + (r.emissions_t_co2e || 0), 0);
  const scope1Emissions = records.filter((r) => r.scope === "scope1").reduce((acc, r) => acc + (r.emissions_t_co2e || 0), 0);
  const scope2Emissions = records.filter((r) => r.scope === "scope2").reduce((acc, r) => acc + (r.emissions_t_co2e || 0), 0);
  const scope3Emissions = records.filter((r) => r.scope === "scope3").reduce((acc, r) => acc + (r.emissions_t_co2e || 0), 0);

  const evidenceCount = records.reduce((acc, r) => acc + (r.attachments ? r.attachments.length : 0), 0);
  const dataCompleteness = records.length > 0
    ? Math.min(100, Math.max(65, Math.round(((records.length * 2 + evidenceCount * 2) / Math.max(1, records.length * 3)) * 100)))
    : 0;

  // Dynamic Emission Sources mapped for 3D Globe & Cards
  const energyEmissions = records
    .filter((r) => r.category.toLowerCase().includes("electricity") || r.category.toLowerCase().includes("energy") || r.category.toLowerCase().includes("steam"))
    .reduce((sum, r) => sum + (r.emissions_t_co2e || 0), 0);

  const cloudEmissions = records
    .filter((r) => r.category.toLowerCase().includes("cloud") || r.category.toLowerCase().includes("hardware") || r.category.toLowerCase().includes("saas"))
    .reduce((sum, r) => sum + (r.emissions_t_co2e || 0), 0);

  const opsEmissions = records
    .filter((r) => r.scope === "scope1")
    .reduce((sum, r) => sum + (r.emissions_t_co2e || 0), 0);

  const travelEmissions = records
    .filter((r) => r.category.toLowerCase().includes("travel") || r.category.toLowerCase().includes("commuting") || r.category.toLowerCase().includes("wfh"))
    .reduce((sum, r) => sum + (r.emissions_t_co2e || 0), 0);

  const dynamicSources: EmissionSource[] = [
    {
      id: "energy",
      name: "Purchased Energy",
      icon: "⚡",
      value: parseFloat(energyEmissions.toFixed(2)),
      scope: "Scope 2",
      description: "Grid electricity and tech park cooling consumption",
      color: "#34d399",
      position: [0.9, 0.7, 1.15],
    },
    {
      id: "cloud",
      name: "Cloud & IT Hardware",
      icon: "💻",
      value: parseFloat(cloudEmissions.toFixed(2)),
      scope: "Scope 3",
      description: "AWS/Azure cloud hosting, SaaS & developer laptops",
      color: "#fbbf24",
      position: [-1.15, 0.35, 0.9],
    },
    {
      id: "operations",
      name: "Direct Operations",
      icon: "🏭",
      value: parseFloat(opsEmissions.toFixed(2)),
      scope: "Scope 1",
      description: "Generator diesel, vehicle fleet & HVAC refrigerants",
      color: "#fb7185",
      position: [0.25, -0.95, 1.25],
    },
    {
      id: "travel",
      name: "Travel & Remote WFH",
      icon: "✈️",
      value: parseFloat(travelEmissions.toFixed(2)),
      scope: "Scope 3",
      description: "Business flights, employee commuting & remote energy",
      color: "#60a5fa",
      position: [-0.65, -0.7, 1.35],
    },
  ];

  const [selectedSource, setSelectedSource] = useState<EmissionSource>(dynamicSources[0]);

  // Dynamic monthly distribution derived from logged activity period dates
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const monthlySums: Record<string, number> = {};
  monthNames.slice(0, 6).forEach((m) => (monthlySums[m] = 0));

  records.forEach((r) => {
    if (r.periodStart) {
      const date = new Date(r.periodStart);
      const mName = monthNames[date.getMonth()];
      if (monthlySums[mName] !== undefined) {
        monthlySums[mName] += r.emissions_t_co2e || 0;
      } else {
        monthlySums["Jan"] += r.emissions_t_co2e || 0;
      }
    }
  });

  const maxMonthValue = Math.max(...Object.values(monthlySums), 1);
  const monthlyChartData = Object.entries(monthlySums).map(([month, val]) => ({
    month,
    value: parseFloat(val.toFixed(2)),
    heightPx: Math.max(12, Math.round((val / maxMonthValue) * 160)),
  }));

  const metricsCards = [
    {
      title: "Total Footprint",
      value: totalEmissions.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 }),
      unit: "tCO₂e",
      change: `${records.length} records`,
      description: "Aggregated live emissions",
    },
    {
      title: "Scope 1 Direct",
      value: scope1Emissions.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 }),
      unit: "tCO₂e",
      change: "Direct",
      description: "Generators, fleet & HVAC",
    },
    {
      title: "Scope 2 Energy",
      value: scope2Emissions.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 }),
      unit: "tCO₂e",
      change: "Indirect",
      description: "Grid electricity & cooling",
    },
    {
      title: "Scope 3 Value Chain",
      value: scope3Emissions.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 }),
      unit: "tCO₂e",
      change: `${evidenceCount} evidences`,
      description: "Cloud, IT hardware, travel & WFH",
    },
  ];

  return (
    <div className="space-y-8 pb-10">
      {/* HERO SECTION */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative overflow-hidden rounded-3xl bg-slate-950 text-white border border-slate-800"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_40%,rgba(16,185,129,0.18),transparent_35%)]" />

        <div className="relative grid grid-cols-1 lg:grid-cols-2 min-h-[460px]">
          {/* LEFT SIDE */}
          <div className="flex flex-col justify-center p-8 lg:p-12 z-10">
            <div className="inline-flex items-center gap-2 text-emerald-400 text-sm font-semibold mb-5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              WELCOME BACK, {fullName.toUpperCase()}
            </div>

            <h1 className="text-4xl lg:text-5xl font-bold tracking-tight leading-tight">
              Measure.
              <br />
              Understand.
              <br />
              <span className="text-emerald-400">Reduce.</span>
            </h1>

            <p className="text-slate-400 mt-6 max-w-lg leading-relaxed">
              Real-time GHG emissions dashboard powered by your logged activity records. Monitor Scope 1, Scope 2, and Scope 3 IT enterprise footprint dynamically.
            </p>

            <div className="flex items-center gap-8 mt-8">
              <div>
                <p className="text-2xl font-bold">
                  {totalEmissions.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-slate-500 uppercase tracking-wider">tCO₂e tracked</p>
              </div>

              <div className="h-10 w-px bg-slate-700" />

              <div>
                <p className="text-2xl font-bold text-emerald-400">{dataCompleteness}%</p>
                <p className="text-xs text-slate-500 uppercase tracking-wider">data quality</p>
              </div>
            </div>

            <div className="mt-8 flex items-center gap-2 text-xs text-slate-500">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              Click an emission source on the globe or cards below
            </div>
          </div>

          {/* 3D GLOBE */}
          <div className="relative h-[400px] lg:h-auto">
            <div className="absolute inset-0">
              <EarthScene
                sources={dynamicSources}
                selectedSourceId={selectedSource.id}
                onSelect={setSelectedSource}
              />
            </div>

            {/* SELECTED SOURCE CALLOUT */}
            <motion.div
              key={selectedSource.id}
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              className="absolute top-8 right-8 w-56 rounded-2xl border border-slate-700 bg-slate-900/85 backdrop-blur-md p-4"
            >
              <div className="flex items-center gap-2">
                <span className="text-xl">{selectedSource.icon}</span>
                <div>
                  <p className="text-[11px] text-slate-400">Selected Source</p>
                  <p className="font-semibold text-white text-sm">{selectedSource.name}</p>
                </div>
              </div>

              <p className="text-2xl font-bold text-emerald-400 mt-3">
                {selectedSource.value.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 })}
                <span className="text-xs text-slate-400 ml-1">tCO₂e</span>
              </p>

              <p className="text-xs font-semibold text-slate-300 mt-1">{selectedSource.scope}</p>

              <p className="text-xs text-slate-400 mt-2 leading-relaxed">{selectedSource.description}</p>
            </motion.div>
          </div>
        </div>
      </motion.section>

      {/* METRICS OVERVIEW CARDS */}
      <section>
        <div className="mb-4">
          <p className="text-sm font-medium text-emerald-600">Environmental Overview</p>
          <h2 className="text-2xl font-bold text-slate-900">Your Live Carbon Impact</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
          {metricsCards.map((metric, index) => (
            <motion.div
              key={metric.title}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ y: -5 }}
              className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-lg transition-all"
            >
              <div className="flex justify-between items-start">
                <p className="text-sm font-semibold text-slate-500">{metric.title}</p>
                <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-bold">
                  {metric.change}
                </span>
              </div>

              <div className="mt-5 flex items-baseline gap-2">
                <p className="text-3xl font-black text-slate-900">{metric.value}</p>
                <span className="text-sm font-medium text-slate-500">{metric.unit}</span>
              </div>

              <p className="text-xs text-slate-400 mt-2">{metric.description}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* DYNAMIC EMISSION CATEGORY BREAKDOWN CARDS */}
      <section>
        <div className="mb-4">
          <p className="text-sm font-medium text-emerald-600">Emission Intelligence</p>
          <h2 className="text-2xl font-bold text-slate-900">Where your emissions come from</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {dynamicSources.map((source) => {
            const percentage = totalEmissions > 0 ? ((source.value / totalEmissions) * 100).toFixed(1) : "0.0";

            return (
              <motion.button
                key={source.id}
                whileHover={{ y: -4 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSelectedSource(source)}
                className={`text-left bg-white rounded-2xl border p-5 transition-all ${
                  selectedSource.id === source.id
                    ? "border-emerald-500 shadow-lg ring-2 ring-emerald-500/20"
                    : "border-slate-200 hover:border-emerald-300"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-2xl">{source.icon}</span>
                  <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                    {source.scope}
                  </span>
                </div>

                <h3 className="font-bold text-slate-900 mt-4">{source.name}</h3>

                <div className="flex items-baseline justify-between mt-2">
                  <p className="text-2xl font-black text-slate-900">
                    {source.value.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 })}
                    <span className="text-xs font-normal text-slate-500 ml-1">tCO₂e</span>
                  </p>
                  <span className="text-xs font-bold text-emerald-600">{percentage}%</span>
                </div>

                {/* Progress bar relative to total footprint */}
                <div className="mt-4 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    transition={{ duration: 0.8 }}
                    className="h-full rounded-full bg-emerald-500"
                  />
                </div>
              </motion.button>
            );
          })}
        </div>
      </section>

      {/* LOWER SECTION: MONTHLY TREND & RECENT LOGGED ACTIVITIES */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* MONTHLY TREND CHART */}
        <motion.div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex justify-between items-start mb-8">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Emissions Trend</p>
              <h3 className="text-xl font-bold text-slate-900 mt-1">Monthly Carbon Footprint (tCO₂e)</h3>
            </div>
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
              Live Logged Period
            </span>
          </div>

          <div className="flex items-end gap-4 h-52 pt-4">
            {monthlyChartData.map((item, index) => (
              <div key={item.month} className="flex-1 h-full flex flex-col justify-end items-center gap-2">
                <span className="text-[10px] font-bold text-slate-600">
                  {item.value > 0 ? `${item.value}t` : "0"}
                </span>
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${item.heightPx}px` }}
                  transition={{ duration: 0.8, delay: index * 0.08 }}
                  className="w-full max-w-[55px] rounded-t-xl bg-gradient-to-t from-emerald-700 to-emerald-400"
                />
                <span className="text-xs font-bold text-slate-500">{item.month}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* RECENT LOGGED ACTIVITIES STREAM */}
        <motion.div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <SparklesIcon className="w-5 h-5 text-emerald-600" />
                Recently Logged Activities
              </h3>
              <span className="text-xs font-semibold text-slate-400">Latest</span>
            </div>

            <div className="space-y-3">
              {records.slice(0, 4).map((rec) => (
                <div key={rec.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                  <div className="min-w-0 pr-2">
                    <p className="font-bold text-slate-900 truncate">{rec.category}</p>
                    <p className="text-[11px] text-slate-400 truncate mt-0.5">{rec.facility || rec.activity_type || rec.scope}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-extrabold text-emerald-700">
                      {(rec.emissions_t_co2e || 0).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 })} tCO₂e
                    </p>
                    <span className="text-[10px] text-slate-400">{rec.periodStart}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">Syncing with Upload Data page</span>
            <a href="/upload" className="font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1">
              Add Activity <ArrowUpRightIcon className="w-3.5 h-3.5" />
            </a>
          </div>
        </motion.div>
      </section>
    </div>
  );
}