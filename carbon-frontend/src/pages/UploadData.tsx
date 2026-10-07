import { useState, useEffect } from "react";
import type {
  EmissionsRecord,
  ScopeCategoryDefinition,
  ScopeType,
} from "../types/emissions";
import { GHG_CATEGORIES, getCategoriesByScope } from "../constants/ghgCategories";
import { calculateEmissions } from "../utils/emissionsCalculator";

import ScopeSelector from "../components/upload/ScopeSelector";
import CategoryGrid from "../components/upload/CategoryGrid";
import EmissionsForm from "../components/upload/EmissionsForm";
import EntriesListTable from "../components/upload/EntriesListTable";

import {
  CloudArrowUpIcon,
  DocumentCheckIcon,
  PaperClipIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";

import { useEmissionsRecords } from "../utils/useEmissionsRecords";
import { emissionsApi } from "../services/api";

export default function UploadData() {
  const { records, addRecord, deleteRecord, saveRecords, clearAllRecords } = useEmissionsRecords();

  // Active state
  const [activeScope, setActiveScope] = useState<ScopeType>("scope1");
  const [selectedCategory, setSelectedCategory] = useState<ScopeCategoryDefinition>(
    GHG_CATEGORIES[0]
  );
  const [editingRecord, setEditingRecord] = useState<EmissionsRecord | null>(null);
  const [tableScopeFilter, setTableScopeFilter] = useState<ScopeType | "all">("all");

  // When scope changes, update selected category to first category in new scope if needed
  const handleScopeSelect = (scope: ScopeType) => {
    setActiveScope(scope);
    const scopeCategories = getCategoriesByScope(scope);
    if (scopeCategories.length > 0) {
      setSelectedCategory(scopeCategories[0]);
    }
    setEditingRecord(null);
  };

  // Handle category card selection
  const handleCategorySelect = (category: ScopeCategoryDefinition) => {
    setSelectedCategory(category);
    setEditingRecord(null);
  };

  // Create or Update record
  const handleSaveRecord = async (
    data: Omit<EmissionsRecord, "id" | "createdAt" | "updatedAt"> & { id?: string }
  ) => {
    const now = new Date().toISOString();

    if (data.id) {
      // Update existing
      const updatedList = records.map((rec) =>
        rec.id === data.id
          ? {
              ...rec,
              ...data,
              updatedAt: now,
            }
          : rec
      );
      saveRecords(updatedList);
      try {
        await emissionsApi.update(data.id, data);
      } catch (err) {}
      setEditingRecord(null);
    } else {
      // Create new
      const newRecord: EmissionsRecord = {
        id: `rec-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        scope: data.scope,
        category: data.category,
        activity_type: data.activity_type,
        equipment_type: data.equipment_type,
        quantity: data.quantity,
        unit: data.unit,
        inputMode: data.inputMode,
        currency: data.currency,
        periodStart: data.periodStart,
        periodEnd: data.periodEnd,
        facility: data.facility,
        notes: data.notes,
        attachments: data.attachments,
        emissions_t_co2e: data.emissions_t_co2e,
        emissionFactorInfo: data.emissionFactorInfo,
        createdAt: now,
        updatedAt: now,
      };

      await addRecord(newRecord);
    }
  };

  // Handle edit trigger from table
  const handleEditRecord = (record: EmissionsRecord) => {
    setEditingRecord(record);
    setActiveScope(record.scope);
    const categoryDef =
      GHG_CATEGORIES.find((c) => c.name === record.category) ||
      getCategoriesByScope(record.scope)[0];
    setSelectedCategory(categoryDef);

    // Scroll smoothly to form top
    window.scrollTo({ top: 320, behavior: "smooth" });
  };

  // Handle delete trigger from table
  const handleDeleteRecord = (id: string) => {
    deleteRecord(id);
    if (editingRecord?.id === id) {
      setEditingRecord(null);
    }
  };

  // Compute record stats per scope
  const scopeCounts: Record<ScopeType, number> = {
    scope1: records.filter((r) => r.scope === "scope1").length,
    scope2: records.filter((r) => r.scope === "scope2").length,
    scope3: records.filter((r) => r.scope === "scope3").length,
  };

  const totalEmissions_t_co2e = records.reduce(
    (acc, r) => acc + (r.emissions_t_co2e || 0),
    0
  );

  const totalAttachments = records.reduce(
    (acc, r) => acc + (r.attachments ? r.attachments.length : 0),
    0
  );

  const handleResetSampleData = () => {
    clearAllRecords();
    setEditingRecord(null);
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Top Banner & Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
        {/* Subtle background mesh visual */}
        <div className="absolute right-0 top-0 w-96 h-full opacity-10 bg-[radial-gradient(#34d399_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
                <CloudArrowUpIcon className="w-4 h-4" />
                <span>IT Enterprise GHG Protocol Accounting Engine</span>
              </div>

              <button
                type="button"
                onClick={handleResetSampleData}
                className="text-[11px] font-semibold text-slate-400 hover:text-white underline underline-offset-2 transition"
                title="Reset cache to initial IT sample records"
              >
                Reset IT Data
              </button>
            </div>

            <h1 className="text-3xl font-extrabold tracking-tight">
              IT Infrastructure & Operations Data Entry
            </h1>

            <p className="mt-2 text-sm text-slate-300 max-w-2xl leading-relaxed">
              Log activity data across cloud infrastructure (AWS/Azure/GCP), offshore delivery centers (ODC), developer laptops, business travel, Work From Home (WFH), and server room energy. Emissions are calculated in real time using official GHG Protocol & DEFRA factors.
            </p>
          </div>

          {/* Quick Stats Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full md:w-auto shrink-0">
            <div className="bg-emerald-500/20 backdrop-blur-md border border-emerald-500/30 rounded-2xl p-4 text-center">
              <p className="text-2xl font-black text-emerald-400">
                {totalEmissions_t_co2e.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 })}
              </p>
              <p className="text-[11px] font-semibold text-emerald-200 uppercase tracking-wider mt-0.5">
                Total tCO₂e Calculated
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl p-4 text-center">
              <p className="text-2xl font-black text-white">{records.length}</p>
              <p className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider mt-0.5">
                Activity Records
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl p-4 text-center col-span-2 sm:col-span-1">
              <p className="text-2xl font-black text-amber-400">
                {totalAttachments}
              </p>
              <p className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider mt-0.5">
                PDF Evidences
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 1. Scope Selector Tabs */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <SparklesIcon className="w-5 h-5 text-emerald-600" />
            1. Select GHG Protocol Emission Scope
          </h2>
          <span className="text-xs text-slate-500 font-medium">
            Step 1 of 3
          </span>
        </div>

        <ScopeSelector
          activeScope={activeScope}
          onSelectScope={handleScopeSelect}
          recordCounts={scopeCounts}
        />
      </section>

      {/* 2. Category Grid Selector */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <DocumentCheckIcon className="w-5 h-5 text-emerald-600" />
            2. Choose Activity Category
          </h2>
          <span className="text-xs text-slate-500 font-medium">
            Step 2 of 3
          </span>
        </div>

        <CategoryGrid
          activeScope={activeScope}
          selectedCategoryId={selectedCategory.id}
          onSelectCategory={handleCategorySelect}
        />
      </section>

      {/* 3. Numeric Data Entry Form + PDF Uploader */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <PaperClipIcon className="w-5 h-5 text-emerald-600" />
            3. Enter Numeric Data & Attach PDF Evidence
          </h2>
          <span className="text-xs text-slate-500 font-medium">
            Step 3 of 3
          </span>
        </div>

        <EmissionsForm
          activeScope={activeScope}
          selectedCategory={selectedCategory}
          editingRecord={editingRecord}
          onSaveRecord={handleSaveRecord}
          onCancelEdit={() => setEditingRecord(null)}
        />
      </section>

      {/* 4. Logged Entries List / Table */}
      <section className="pt-4">
        <EntriesListTable
          records={records}
          activeScopeFilter={tableScopeFilter}
          onScopeFilterChange={setTableScopeFilter}
          onEditRecord={handleEditRecord}
          onDeleteRecord={handleDeleteRecord}
        />
      </section>
    </div>
  );
}