export * from "./emissions";

export interface User {
  id: number;
  email: string;
  full_name: string;
  fullName?: string;
  role: 'admin' | 'analyst' | 'viewer' | string;
  organization_id: number;
  organizationId?: number;
}

export interface Organization {
  id: number;
  name: string;
  created_at: string;
}

export interface Activity {
  id: number;
  date: string;
  category: string;
  activity_type: string;
  quantity: number;
  unit: string;
  scope: 'Scope 1' | 'Scope 2' | 'Scope 3' | null;
  status: 'pending' | 'validated' | 'rejected';
  notes: string | null;
  emissions_t_co2e?: number;
}

export interface DashboardSummary {
  total_emissions_t_co2e: number;
  scope1_emissions_t_co2e: number;
  scope2_emissions_t_co2e: number;
  scope3_emissions_t_co2e: number;
  data_completeness_score: number;
  total_activities: number;
  validated_activities: number;

  hotspot_ranking: Array<{
    category: string;
    emissions_t_co2e: number;
    percentage: number;
  }>;

  monthly_trend: Array<{
    month: string;
    emissions: number;
  }>;
}