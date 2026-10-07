import { useState, useEffect, type FormEvent } from "react";
import type {
  EmissionsRecord,
  ScopeCategoryDefinition,
  ScopeType,
  InputMode,
  ActivityAttachment,
} from "../../types/emissions";
import {
  GHG_CATEGORIES,
  getCategoriesByScope,
  CURRENCY_OPTIONS,
  IT_FACILITY_OPTIONS,
} from "../../constants/ghgCategories";
import PdfUploader from "./PdfUploader";
import { calculateEmissions } from "../../utils/emissionsCalculator";
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  CalendarIcon,
  BuildingOffice2Icon,
  PencilSquareIcon,
  PlusIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/outline";

interface EmissionsFormProps {
  activeScope: ScopeType;
  selectedCategory: ScopeCategoryDefinition;
  editingRecord?: EmissionsRecord | null;
  onSaveRecord: (record: Omit<EmissionsRecord, "id" | "createdAt" | "updatedAt"> & { id?: string }) => void;
  onCancelEdit?: () => void;
}

export default function EmissionsForm({
  activeScope,
  selectedCategory,
  editingRecord,
  onSaveRecord,
  onCancelEdit,
}: EmissionsFormProps) {
  // Form Base State
  const [categoryId, setCategoryId] = useState(selectedCategory.id);
  const [inputMode, setInputMode] = useState<InputMode>(selectedCategory.defaultInputMode);
  const [quantity, setQuantity] = useState<string>("");
  const [unit, setUnit] = useState<string>(selectedCategory.defaultUnit);
  const [currency, setCurrency] = useState<string>("USD");

  // Dynamic Category Specific State
  const [fuelType, setFuelType] = useState<string>("Diesel");
  const [equipmentType, setEquipmentType] = useState<string>("Air Conditioner");
  const [refrigerantType, setRefrigerantType] = useState<string>("R-410A");
  const [emissionSource, setEmissionSource] = useState<string>("");

  // Common Fields State
  const [periodStart, setPeriodStart] = useState<string>("");
  const [periodEnd, setPeriodEnd] = useState<string>("");
  const [facility, setFacility] = useState<string>("");
  const [customFacility, setCustomFacility] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [attachments, setAttachments] = useState<ActivityAttachment[]>([]);

  // Validation State & Feedback
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Available categories for current scope
  const availableCategories = getCategoriesByScope(activeScope);
  const currentCategoryDef =
    GHG_CATEGORIES.find((c) => c.id === categoryId) || selectedCategory;

  // Category identification helpers
  const isStationary = currentCategoryDef.id === "s1-stationary" || currentCategoryDef.name === "Stationary Combustion";
  const isMobile = currentCategoryDef.id === "s1-mobile" || currentCategoryDef.name === "Mobile Combustion";
  const isFugitive = currentCategoryDef.id === "s1-fugitive" || currentCategoryDef.name.includes("Fugitive");
  const isOtherDirect = currentCategoryDef.id === "s1-other" || currentCategoryDef.name.includes("Other Direct");

  // Sync state when selected category changes or editing record is populated
  useEffect(() => {
    if (editingRecord) {
      const catDef = GHG_CATEGORIES.find((c) => c.name === editingRecord.category) || selectedCategory;
      setCategoryId(catDef.id);
      setInputMode(editingRecord.inputMode);
      setQuantity(editingRecord.quantity.toString());
      setUnit(editingRecord.unit);
      setCurrency(editingRecord.currency || "USD");
      setFuelType(editingRecord.activity_type || "Diesel");
      setEquipmentType(editingRecord.equipment_type || "Air Conditioner");
      setRefrigerantType(editingRecord.activity_type || "R-410A");
      setEmissionSource(editingRecord.activity_type || "");
      setPeriodStart(editingRecord.periodStart);
      setPeriodEnd(editingRecord.periodEnd);
      setFacility(editingRecord.facility || "");
      setNotes(editingRecord.notes || "");
      setAttachments(editingRecord.attachments || []);
    } else {
      setCategoryId(selectedCategory.id);
      setInputMode(selectedCategory.defaultInputMode);
      setQuantity("");
      setPeriodStart("");
      setPeriodEnd("");
      setFacility("");
      setCustomFacility("");
      setNotes("");
      setAttachments([]);
      setTouched({});

      // Set default category specific states & units
      if (selectedCategory.id === "s1-stationary" || selectedCategory.name === "Stationary Combustion") {
        setFuelType("Diesel");
        setUnit("Liters (L)");
      } else if (selectedCategory.id === "s1-mobile" || selectedCategory.name === "Mobile Combustion") {
        setFuelType("Petrol");
        setUnit("Liters (L)");
      } else if (selectedCategory.id === "s1-fugitive" || selectedCategory.name.includes("Fugitive")) {
        setEquipmentType("Air Conditioner");
        setRefrigerantType("R-410A");
        setUnit("Kilograms (kg)");
      } else if (selectedCategory.id === "s1-other" || selectedCategory.name.includes("Other Direct")) {
        setEmissionSource("");
        setUnit("kg");
      } else {
        setUnit(selectedCategory.defaultUnit);
      }
    }
  }, [selectedCategory, editingRecord]);

  // Handle Category dropdown change
  const handleCategoryChange = (newCatId: string) => {
    setCategoryId(newCatId);
    const catDef = GHG_CATEGORIES.find((c) => c.id === newCatId);
    if (catDef) {
      setInputMode(catDef.defaultInputMode);
      setQuantity("");

      if (catDef.id === "s1-stationary" || catDef.name === "Stationary Combustion") {
        setFuelType("Diesel");
        setUnit("Liters (L)");
      } else if (catDef.id === "s1-mobile" || catDef.name === "Mobile Combustion") {
        setFuelType("Petrol");
        setUnit("Liters (L)");
      } else if (catDef.id === "s1-fugitive" || catDef.name.includes("Fugitive")) {
        setEquipmentType("Air Conditioner");
        setRefrigerantType("R-410A");
        setUnit("Kilograms (kg)");
      } else if (catDef.id === "s1-other" || catDef.name.includes("Other Direct")) {
        setEmissionSource("");
        setUnit("kg");
      } else {
        setUnit(catDef.defaultUnit);
      }
    }
  };

  // Validation rules & Live Calculation
  const numQty = parseFloat(quantity);
  const isQuantityValid = !isNaN(numQty) && numQty > 0;
  const isUnitValid = !!unit;
  const isPeriodStartValid = !!periodStart;
  const isPeriodEndValid = !!periodEnd && (!periodStart || periodEnd >= periodStart);

  const isFormValid = isQuantityValid && isUnitValid && isPeriodStartValid && isPeriodEndValid;

  // Derive active activity/subType label for emissions calculation engine
  const activeSubType = isStationary || isMobile ? fuelType : isFugitive ? refrigerantType : emissionSource;

  // Real-time calculation engine call
  const liveCalc = calculateEmissions(
    currentCategoryDef.name,
    isQuantityValid ? numQty : 0,
    unit,
    inputMode,
    currency,
    activeSubType,
    equipmentType
  );

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!isFormValid) {
      setTouched({
        quantity: true,
        unit: true,
        periodStart: true,
        periodEnd: true,
      });
      return;
    }

    const finalFacility = facility === "CUSTOM" ? customFacility : facility;

    onSaveRecord({
      id: editingRecord?.id,
      scope: activeScope,
      category: currentCategoryDef.name,
      activity_type: activeSubType || currentCategoryDef.name,
      equipment_type: isFugitive ? equipmentType : undefined,
      quantity: numQty,
      unit: unit,
      inputMode: inputMode,
      currency: inputMode === "spend_based" ? currency : undefined,
      periodStart,
      periodEnd,
      facility: finalFacility || undefined,
      notes: notes || undefined,
      attachments,
      emissions_t_co2e: liveCalc.emissions_t_co2e,
      emissionFactorInfo: liveCalc.factorInfo,
    });

    // Reset or show success feedback
    setSuccessBanner(
      editingRecord
        ? `Successfully updated "${currentCategoryDef.name}" record (${liveCalc.emissions_t_co2e} tCO₂e)!`
        : `Successfully logged ${numQty.toLocaleString()} ${unit} (${liveCalc.emissions_t_co2e} tCO₂e) under ${currentCategoryDef.name}!`
    );

    setTimeout(() => {
      setSuccessBanner(null);
    }, 4000);

    if (!editingRecord) {
      setQuantity("");
      setNotes("");
      setAttachments([]);
      setTouched({});
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-slate-900 text-white uppercase tracking-wider">
              {activeScope.replace("scope", "Scope ")}
            </span>
            <h2 className="text-lg font-bold text-slate-900">
              {editingRecord ? "Edit Emissions Entry" : "Log Activity Data"}
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {currentCategoryDef.description}
          </p>
        </div>

        {editingRecord && onCancelEdit && (
          <button
            type="button"
            onClick={onCancelEdit}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100 transition"
          >
            Cancel Edit
          </button>
        )}
      </div>

      {/* Success Notification Banner */}
      {successBanner && (
        <div className="mx-6 mt-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-3 text-emerald-800 text-sm">
          <CheckCircleIcon className="w-5 h-5 text-emerald-600 shrink-0" />
          <span className="font-medium">{successBanner}</span>
        </div>
      )}

      {/* Form body */}
      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* 1. Activity Category Dropdown (Pre-filled / Editable) */}
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Activity Category <span className="text-rose-500">*</span>
            </label>
            <select
              value={categoryId}
              onChange={(e) => handleCategoryChange(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm text-slate-900 font-bold focus:ring-2 focus:ring-emerald-500 outline-none"
            >
              {availableCategories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name} {cat.section ? `(${cat.section})` : ""}
                </option>
              ))}
            </select>
          </div>

          {/* ============================================================
              DYNAMIC FIELDS BASED ON SCOPE 1 CATEGORY
             ============================================================ */}

          {/* CATEGORY 1: STATIONARY COMBUSTION */}
          {isStationary && (
            <>
              {/* Fuel Type */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Fuel Type <span className="text-rose-500">*</span>
                </label>
                <select
                  value={fuelType}
                  onChange={(e) => setFuelType(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                >
                  <option value="Diesel">Diesel</option>
                  <option value="PNG / Natural Gas">PNG / Natural Gas</option>
                  <option value="LPG">LPG</option>
                  <option value="Fuel Oil">Fuel Oil</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* Fuel Quantity */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Fuel Quantity <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  placeholder="e.g. 4500"
                  value={quantity}
                  onChange={(e) => {
                    setQuantity(e.target.value);
                    setTouched((prev) => ({ ...prev, quantity: true }));
                  }}
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-semibold text-slate-900 outline-none transition ${
                    touched.quantity && !isQuantityValid
                      ? "border-rose-500 bg-rose-50/30 focus:ring-2 focus:ring-rose-500"
                      : "border-slate-300 focus:ring-2 focus:ring-emerald-500"
                  }`}
                />
                {touched.quantity && !isQuantityValid && (
                  <p className="flex items-center gap-1 text-[11px] font-semibold text-rose-600 mt-1">
                    <ExclamationCircleIcon className="w-3.5 h-3.5 shrink-0" />
                    Fuel quantity must be a positive number greater than 0.
                  </p>
                )}
              </div>

              {/* Unit of Measure */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Unit of Measure <span className="text-rose-500">*</span>
                </label>
                <select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                >
                  {fuelType === "PNG / Natural Gas" ? (
                    <>
                      <option value="m³">m³</option>
                      <option value="kg">kg</option>
                      <option value="kWh">kWh</option>
                      <option value="other">other</option>
                    </>
                  ) : (
                    <>
                      <option value="Liters (L)">Liters (L)</option>
                      <option value="kg">kg</option>
                      <option value="m³">m³</option>
                      <option value="gallons (gal)">gallons (gal)</option>
                      <option value="other">other</option>
                    </>
                  )}
                </select>
              </div>
            </>
          )}

          {/* CATEGORY 2: MOBILE COMBUSTION */}
          {isMobile && (
            <>
              {/* Vehicle / Fuel Type */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Vehicle / Fuel Type <span className="text-rose-500">*</span>
                </label>
                <select
                  value={fuelType}
                  onChange={(e) => setFuelType(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                >
                  <option value="Petrol">Petrol</option>
                  <option value="Diesel">Diesel</option>
                  <option value="CNG">CNG</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* Fuel Quantity */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Fuel Quantity <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  placeholder="e.g. 1200"
                  value={quantity}
                  onChange={(e) => {
                    setQuantity(e.target.value);
                    setTouched((prev) => ({ ...prev, quantity: true }));
                  }}
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-semibold text-slate-900 outline-none transition ${
                    touched.quantity && !isQuantityValid
                      ? "border-rose-500 bg-rose-50/30 focus:ring-2 focus:ring-rose-500"
                      : "border-slate-300 focus:ring-2 focus:ring-emerald-500"
                  }`}
                />
                {touched.quantity && !isQuantityValid && (
                  <p className="flex items-center gap-1 text-[11px] font-semibold text-rose-600 mt-1">
                    <ExclamationCircleIcon className="w-3.5 h-3.5 shrink-0" />
                    Fuel quantity must be a positive number greater than 0.
                  </p>
                )}
              </div>

              {/* Unit of Measure */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Unit of Measure <span className="text-rose-500">*</span>
                </label>
                <select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                >
                  <option value="Liters (L)">Liters (L)</option>
                  <option value="kg">kg</option>
                  <option value="m³">m³</option>
                </select>
              </div>
            </>
          )}

          {/* CATEGORY 3: FUGITIVE / REFRIGERANT EMISSIONS */}
          {isFugitive && (
            <>
              {/* Equipment Type */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Equipment Type <span className="text-rose-500">*</span>
                </label>
                <select
                  value={equipmentType}
                  onChange={(e) => setEquipmentType(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                >
                  <option value="Air Conditioner">Air Conditioner</option>
                  <option value="Chiller">Chiller</option>
                  <option value="Refrigeration Equipment">Refrigeration Equipment</option>
                  <option value="Other HVAC Equipment">Other HVAC Equipment</option>
                </select>
              </div>

              {/* Refrigerant Type */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Refrigerant Type <span className="text-rose-500">*</span>
                </label>
                <select
                  value={refrigerantType}
                  onChange={(e) => setRefrigerantType(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                >
                  <option value="R-22">R-22</option>
                  <option value="R-32">R-32</option>
                  <option value="R-410A">R-410A</option>
                  <option value="R-134a">R-134a</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* Refrigerant Quantity */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Refrigerant Quantity <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  placeholder="e.g. 5"
                  value={quantity}
                  onChange={(e) => {
                    setQuantity(e.target.value);
                    setTouched((prev) => ({ ...prev, quantity: true }));
                  }}
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-semibold text-slate-900 outline-none transition ${
                    touched.quantity && !isQuantityValid
                      ? "border-rose-500 bg-rose-50/30 focus:ring-2 focus:ring-rose-500"
                      : "border-slate-300 focus:ring-2 focus:ring-emerald-500"
                  }`}
                />
                {touched.quantity && !isQuantityValid && (
                  <p className="flex items-center gap-1 text-[11px] font-semibold text-rose-600 mt-1">
                    <ExclamationCircleIcon className="w-3.5 h-3.5 shrink-0" />
                    Refrigerant quantity must be greater than 0.
                  </p>
                )}
              </div>

              {/* Unit of Measure (Fixed Kilograms) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Unit of Measure <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  readOnly
                  value="Kilograms (kg)"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-100 text-sm font-bold text-slate-800"
                />
              </div>

              {/* Required Helper Notice */}
              <div className="md:col-span-2 flex items-start gap-2.5 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs leading-relaxed">
                <InformationCircleIcon className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p>
                  <strong className="font-semibold">Important:</strong> The quantity represents refrigerant leaked, released, or added/refilled during HVAC maintenance.
                </p>
              </div>
            </>
          )}

          {/* CATEGORY 4: OTHER DIRECT EMISSIONS */}
          {isOtherDirect && (
            <>
              {/* Emission Source */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Emission Source <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Lab incinerator or chemical process"
                  value={emissionSource}
                  onChange={(e) => setEmissionSource(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              {/* Activity Quantity */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Activity Quantity <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  placeholder="e.g. 500"
                  value={quantity}
                  onChange={(e) => {
                    setQuantity(e.target.value);
                    setTouched((prev) => ({ ...prev, quantity: true }));
                  }}
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-semibold text-slate-900 outline-none transition ${
                    touched.quantity && !isQuantityValid
                      ? "border-rose-500 bg-rose-50/30 focus:ring-2 focus:ring-rose-500"
                      : "border-slate-300 focus:ring-2 focus:ring-emerald-500"
                  }`}
                />
                {touched.quantity && !isQuantityValid && (
                  <p className="flex items-center gap-1 text-[11px] font-semibold text-rose-600 mt-1">
                    <ExclamationCircleIcon className="w-3.5 h-3.5 shrink-0" />
                    Quantity must be a positive number.
                  </p>
                )}
              </div>

              {/* Unit of Measure */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Unit of Measure <span className="text-rose-500">*</span>
                </label>
                <select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                >
                  <option value="kg">kg</option>
                  <option value="Liters (L)">Liters (L)</option>
                  <option value="m³">m³</option>
                  <option value="other">other</option>
                </select>
              </div>
            </>
          )}

          {/* GENERAL FALLBACK FOR SCOPE 2 / SCOPE 3 CATEGORIES */}
          {!isStationary && !isMobile && !isFugitive && !isOtherDirect && (
            <>
              {/* Input Mode */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Measurement Mode <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-slate-100 border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setInputMode("physical")}
                    className={`py-2 text-xs font-bold rounded-lg transition ${
                      inputMode === "physical"
                        ? "bg-white text-slate-900 shadow-sm"
                        : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    Physical Quantity
                  </button>
                  <button
                    type="button"
                    onClick={() => setInputMode("spend_based")}
                    className={`py-2 text-xs font-bold rounded-lg transition ${
                      inputMode === "spend_based"
                        ? "bg-white text-slate-900 shadow-sm"
                        : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    Spend-based ($)
                  </button>
                </div>
              </div>

              {/* Quantity Input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  {inputMode === "spend_based" ? "Spend Amount" : "Activity Quantity"}{" "}
                  <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  placeholder={inputMode === "spend_based" ? "e.g. 12500.50" : "e.g. 45000"}
                  value={quantity}
                  onChange={(e) => {
                    setQuantity(e.target.value);
                    setTouched((prev) => ({ ...prev, quantity: true }));
                  }}
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-semibold text-slate-900 outline-none transition ${
                    touched.quantity && !isQuantityValid
                      ? "border-rose-500 bg-rose-50/30 focus:ring-2 focus:ring-rose-500"
                      : "border-slate-300 focus:ring-2 focus:ring-emerald-500"
                  }`}
                />
              </div>

              {/* Unit / Currency Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  {inputMode === "spend_based" ? "Currency" : "Unit of Measure"}{" "}
                  <span className="text-rose-500">*</span>
                </label>

                {inputMode === "spend_based" ? (
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                  >
                    {CURRENCY_OPTIONS.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                  >
                    {(currentCategoryDef.allowedUnits || []).map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </>
          )}

          {/* ============================================================
              COMMON UNCHANGED FIELDS (Required by prompt)
             ============================================================ */}

          {/* Period Start Date */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Period Start Date <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <CalendarIcon className="absolute left-3.5 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="date"
                value={periodStart}
                onChange={(e) => {
                  setPeriodStart(e.target.value);
                  setTouched((prev) => ({ ...prev, periodStart: true }));
                }}
                className={`w-full pl-10 pr-3.5 py-2.5 rounded-xl border text-sm text-slate-900 outline-none transition ${
                  touched.periodStart && !isPeriodStartValid
                    ? "border-rose-500 bg-rose-50/30"
                    : "border-slate-300 focus:ring-2 focus:ring-emerald-500"
                }`}
              />
            </div>
          </div>

          {/* Period End Date */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Period End Date <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <CalendarIcon className="absolute left-3.5 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="date"
                value={periodEnd}
                onChange={(e) => {
                  setPeriodEnd(e.target.value);
                  setTouched((prev) => ({ ...prev, periodEnd: true }));
                }}
                className={`w-full pl-10 pr-3.5 py-2.5 rounded-xl border text-sm text-slate-900 outline-none transition ${
                  touched.periodEnd && !isPeriodEndValid
                    ? "border-rose-500 bg-rose-50/30"
                    : "border-slate-300 focus:ring-2 focus:ring-emerald-500"
                }`}
              />
            </div>
            {touched.periodEnd && !isPeriodEndValid && (
              <p className="text-[11px] font-semibold text-rose-600 mt-1">
                End date is required and must be on or after start date.
              </p>
            )}
          </div>

          {/* Facility / Site / Cost Center */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Facility / Site / Cost Center <span className="font-normal text-slate-400">(Optional)</span>
            </label>
            <div className="space-y-2">
              <div className="relative">
                <BuildingOffice2Icon className="absolute left-3.5 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
                <select
                  value={facility}
                  onChange={(e) => setFacility(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">-- Select IT Facility / Data Center / WFH --</option>
                  {IT_FACILITY_OPTIONS.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                  <option value="CUSTOM">+ Custom Location / ODC / Cost Center...</option>
                </select>
              </div>

              {facility === "CUSTOM" && (
                <input
                  type="text"
                  placeholder="Enter custom facility, client site or ODC name"
                  value={customFacility}
                  onChange={(e) => setCustomFacility(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500"
                />
              )}
            </div>
          </div>

          {/* Additional Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Additional Notes / Source Reference <span className="font-normal text-slate-400">(Optional)</span>
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Generator logbook #4, AC maintenance invoice, or fuel receipt"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        {/* PDF Evidence Uploader Section (Unchanged) */}
        <div className="pt-4 border-t border-slate-200">
          <PdfUploader
            attachments={attachments}
            onAttachmentsChange={setAttachments}
          />
        </div>

        {/* Real-time Emissions Calculation Preview Badge */}
        {isQuantityValid && (
          <div className="p-4 rounded-xl bg-slate-900 text-white flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-lg">
                ⚡
              </div>
              <div>
                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
                  Calculated Carbon Footprint
                </p>
                <p className="text-xl font-black text-emerald-400">
                  {liveCalc.emissions_t_co2e.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}{" "}
                  <span className="text-xs text-white font-normal">tCO₂e (Metric Tons)</span>
                </p>
              </div>
            </div>
            <div className="text-right hidden sm:block">
              <p className="text-[11px] text-slate-400 max-w-xs font-medium">
                {liveCalc.factorInfo}
              </p>
            </div>
          </div>
        )}

        {/* Submit Actions */}
        <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
          {editingRecord && onCancelEdit && (
            <button
              type="button"
              onClick={onCancelEdit}
              className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-semibold text-sm hover:bg-slate-100 transition"
            >
              Cancel
            </button>
          )}

          <button
            type="submit"
            disabled={!isFormValid}
            className={`px-6 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-md ${
              isFormValid
                ? "bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-600/20 active:scale-[0.98]"
                : "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none"
            }`}
          >
            {editingRecord ? (
              <>
                <PencilSquareIcon className="w-4 h-4" />
                Update Record
              </>
            ) : (
              <>
                <PlusIcon className="w-4 h-4" />
                Log Emissions Activity
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
