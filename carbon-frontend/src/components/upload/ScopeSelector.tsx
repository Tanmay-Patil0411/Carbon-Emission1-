import type { ScopeType } from "../../types/emissions";
import {
  FireIcon,
  BoltIcon,
  GlobeAmericasIcon,
} from "@heroicons/react/24/outline";

interface ScopeSelectorProps {
  activeScope: ScopeType;
  onSelectScope: (scope: ScopeType) => void;
  recordCounts: Record<ScopeType, number>;
}

const SCOPES: Array<{
  id: ScopeType;
  name: string;
  subtitle: string;
  description: string;
  icon: typeof FireIcon;
  badgeColor: string;
  activeBorder: string;
  activeBg: string;
}> = [
  {
    id: "scope1",
    name: "Scope 1",
    subtitle: "Direct Emissions",
    description: "Combustion, vehicles, refrigerants & on-site industrial processes",
    icon: FireIcon,
    badgeColor: "bg-rose-500/10 text-rose-600 border-rose-200",
    activeBorder: "border-rose-500",
    activeBg: "bg-rose-50/50",
  },
  {
    id: "scope2",
    name: "Scope 2",
    subtitle: "Purchased Energy",
    description: "Purchased electricity, steam, heating & cooling consumption",
    icon: BoltIcon,
    badgeColor: "bg-amber-500/10 text-amber-600 border-amber-200",
    activeBorder: "border-amber-500",
    activeBg: "bg-amber-50/50",
  },
  {
    id: "scope3",
    name: "Scope 3",
    subtitle: "Value Chain",
    description: "Upstream supply chain & downstream product lifecycle (15 categories)",
    icon: GlobeAmericasIcon,
    badgeColor: "bg-emerald-500/10 text-emerald-600 border-emerald-200",
    activeBorder: "border-emerald-500",
    activeBg: "bg-emerald-50/50",
  },
];

export default function ScopeSelector({
  activeScope,
  onSelectScope,
  recordCounts,
}: ScopeSelectorProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {SCOPES.map((scope) => {
        const Icon = scope.icon;
        const isActive = activeScope === scope.id;
        const count = recordCounts[scope.id] || 0;

        return (
          <button
            key={scope.id}
            type="button"
            onClick={() => onSelectScope(scope.id)}
            className={`relative flex flex-col p-5 rounded-2xl border-2 text-left transition-all duration-200 shadow-sm ${
              isActive
                ? `bg-white border-emerald-600 ring-2 ring-emerald-500/20 ${scope.activeBg}`
                : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/60"
            }`}
          >
            {/* Top row */}
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center border ${scope.badgeColor}`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 leading-tight">
                    {scope.name}
                  </h3>
                  <p className="text-xs font-semibold text-slate-500">
                    {scope.subtitle}
                  </p>
                </div>
              </div>

              {/* Entry Count Badge */}
              <span
                className={`px-2.5 py-1 text-xs font-bold rounded-full border ${
                  count > 0
                    ? "bg-slate-900 text-white border-slate-900"
                    : "bg-slate-100 text-slate-400 border-slate-200"
                }`}
              >
                {count} {count === 1 ? "entry" : "entries"}
              </span>
            </div>

            {/* Description */}
            <p className="mt-3 text-xs text-slate-600 line-clamp-2 leading-relaxed">
              {scope.description}
            </p>

            {/* Selection indicator pill */}
            {isActive && (
              <div className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Selected Scope
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
