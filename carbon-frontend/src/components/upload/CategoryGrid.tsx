import type { ScopeCategoryDefinition, ScopeType } from "../../types/emissions";
import { getCategoriesByScope } from "../../constants/ghgCategories";
import {
  TagIcon,
  CheckCircleIcon,
  ArrowUpRightIcon,
  ArrowDownRightIcon,
} from "@heroicons/react/24/outline";

interface CategoryGridProps {
  activeScope: ScopeType;
  selectedCategoryId: string;
  onSelectCategory: (category: ScopeCategoryDefinition) => void;
}

export default function CategoryGrid({
  activeScope,
  selectedCategoryId,
  onSelectCategory,
}: CategoryGridProps) {
  const categories = getCategoriesByScope(activeScope);

  // If Scope 3, split into Upstream and Downstream sections
  const isScope3 = activeScope === "scope3";
  const upstreamCategories = categories.filter((c) => c.section === "Upstream");
  const downstreamCategories = categories.filter((c) => c.section === "Downstream");

  const renderCategoryCard = (category: ScopeCategoryDefinition) => {
    const isSelected = selectedCategoryId === category.id;

    return (
      <button
        key={category.id}
        type="button"
        onClick={() => onSelectCategory(category)}
        className={`group text-left p-4 rounded-xl border transition-all duration-200 flex flex-col justify-between ${
          isSelected
            ? "bg-emerald-50/80 border-emerald-500 ring-2 ring-emerald-500/20 shadow-sm"
            : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/70"
        }`}
      >
        <div>
          <div className="flex items-start justify-between gap-2">
            <span
              className={`text-xs font-bold px-2 py-0.5 rounded-md border ${
                isSelected
                  ? "bg-emerald-600 text-white border-emerald-600"
                  : "bg-slate-100 text-slate-600 border-slate-200 group-hover:bg-slate-200"
              }`}
            >
              {category.defaultInputMode === "spend_based" ? "Spend-based" : "Physical"}
            </span>

            {isSelected && (
              <CheckCircleIcon className="w-5 h-5 text-emerald-600 shrink-0" />
            )}
          </div>

          <h4 className="mt-2.5 text-sm font-bold text-slate-900 group-hover:text-emerald-700 transition">
            {category.name}
          </h4>

          <p className="mt-1 text-xs text-slate-500 line-clamp-2 leading-relaxed">
            {category.description}
          </p>
        </div>

        <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
          <span>Units: {category.allowedUnits.slice(0, 3).join(", ")}{category.allowedUnits.length > 3 ? "..." : ""}</span>
          <span className="font-semibold text-slate-500">Default: {category.defaultUnit}</span>
        </div>
      </button>
    );
  };

  return (
    <div className="space-y-6">
      {!isScope3 ? (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <TagIcon className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">
              Select Activity Category ({categories.length})
            </h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {categories.map(renderCategoryCard)}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Upstream Section */}
          <div>
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-200">
              <div className="p-1 rounded-md bg-blue-100 text-blue-700">
                <ArrowUpRightIcon className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Upstream Categories (Cat 1 – 8)
                </h3>
                <p className="text-xs text-slate-500">
                  Emissions associated with purchased goods, energy, freight, waste, travel & employee commuting
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {upstreamCategories.map(renderCategoryCard)}
            </div>
          </div>

          {/* Downstream Section */}
          <div>
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-200">
              <div className="p-1 rounded-md bg-purple-100 text-purple-700">
                <ArrowDownRightIcon className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Downstream Categories (Cat 9 – 15)
                </h3>
                <p className="text-xs text-slate-500">
                  Emissions associated with product distribution, processing, use, end-of-life, franchises & investments
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {downstreamCategories.map(renderCategoryCard)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
