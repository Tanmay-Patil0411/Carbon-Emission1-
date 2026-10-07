export type ScopeType = "scope1" | "scope2" | "scope3";
export type ScopeSection = "Upstream" | "Downstream";
export type InputMode = "physical" | "spend_based";

export interface ActivityAttachment {
  id: string;
  fileName: string;
  fileUrl: string;
  uploadedAt: string;
  sizeBytes: number;
}

export interface EmissionsRecord {
  id: string;
  scope: ScopeType;
  category: string;
  activity_type?: string;        // e.g. "Diesel", "R-410A (Air Conditioner)", "Petrol Shuttle"
  equipment_type?: string;       // e.g. "Air Conditioner", "Chiller"
  quantity: number;
  unit: string;
  inputMode: InputMode;
  currency?: string;
  periodStart: string;           // YYYY-MM-DD
  periodEnd: string;             // YYYY-MM-DD
  facility?: string;
  notes?: string;
  attachments: ActivityAttachment[];
  emissions_t_co2e: number;      // Calculated metric tons of CO2 equivalent
  emissionFactorInfo?: string;   // Traceability details (e.g., DEFRA 2024 Diesel 2.68 kg CO2e/L)
  createdAt: string;
  updatedAt: string;
}

export interface ScopeCategoryDefinition {
  id: string;
  name: string;
  scope: ScopeType;
  section?: ScopeSection;
  description: string;
  defaultInputMode: InputMode;
  allowedUnits: string[];
  defaultUnit: string;
  iconName?: string;
}
