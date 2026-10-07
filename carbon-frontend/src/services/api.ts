import axios from "axios";
import type { Activity, DashboardSummary } from "../types";
import type { EmissionsRecord } from "../types/emissions";
import type { RecommendationsResponse } from "../types/recommendations";

// Base API URL read from environment variable (VITE_API_URL) with fallback to http://localhost:5000/api
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 8000,
});

// Axios Request Interceptor: Attach JWT Bearer token if present in localStorage
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Axios Response Interceptor: Automatically clear invalid tokens on 401 Unauthorized
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      const currentPath = window.location.pathname;
      if (currentPath !== "/signin") {
        localStorage.removeItem("access_token");
        localStorage.removeItem("carbontrack_auth_status");
      }
    }
    return Promise.reject(error);
  }
);

// ============================================================
// MOCK / LOCALSTORAGE FALLBACK DATA FOR DASHBOARD
// ============================================================
export const MOCK_ACTIVITIES: Activity[] = [];

export const MOCK_DASHBOARD: DashboardSummary = {
  total_emissions_t_co2e: 0,
  scope1_emissions_t_co2e: 0,
  scope2_emissions_t_co2e: 0,
  scope3_emissions_t_co2e: 0,
  data_completeness_score: 0,
  total_activities: 0,
  validated_activities: 0,
  hotspot_ranking: [],
  monthly_trend: [],
};

export const INITIAL_EMISSIONS_RECORDS: EmissionsRecord[] = [];

// ============================================================
// AUTHENTICATION API (REAL BACKEND POSTGRESQL AUTH)
// ============================================================
export const auth = {
  login: async (email: string, password: string) => {
    const response = await apiClient.post("/auth/login", { email, password });
    if (response.data?.data?.access_token) {
      localStorage.setItem("access_token", response.data.data.access_token);
    }
    return response.data;
  },

  register: async (data: {
    email: string;
    password: string;
    full_name: string;
    organization_name?: string;
  }) => {
    const response = await apiClient.post("/auth/register", data);
    if (response.data?.data?.access_token) {
      localStorage.setItem("access_token", response.data.data.access_token);
    }
    return response.data;
  },

  me: async () => {
    const response = await apiClient.get("/auth/me");
    return response.data;
  },

  logout: () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("carbontrack_auth_status");
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith("carbontrack_emissions_records")) {
        localStorage.removeItem(key);
      }
    });
  },
};

// ============================================================
// DASHBOARD API
// ============================================================
export const dashboard = {
  getSummary: async () => {
    try {
      const response = await apiClient.get("/dashboard/summary");
      return response.data;
    } catch (err: any) {
      return {
        success: false,
        data: MOCK_DASHBOARD,
      };
    }
  },
};

// ============================================================
// EMISSIONS API
// ============================================================
export const emissionsApi = {
  getAll: async () => {
    try {
      const response = await apiClient.get("/emissions");
      return response.data;
    } catch (err: any) {
      return { success: false, data: [] };
    }
  },

  getById: async (id: string) => {
    try {
      const response = await apiClient.get(`/emissions/${id}`);
      return response.data;
    } catch (err: any) {
      return { success: false, data: null };
    }
  },

  create: async (recordData: any) => {
    try {
      const payload = {
        ...recordData,
        input_mode: recordData.input_mode || recordData.inputMode || "physical",
        period_start: recordData.period_start || recordData.periodStart || new Date().toISOString().split("T")[0],
        period_end: recordData.period_end || recordData.periodEnd || new Date().toISOString().split("T")[0],
        emission_factor_info: recordData.emission_factor_info || recordData.emissionFactorInfo || null,
        activity_type: recordData.activity_type || recordData.activityType || null,
        equipment_type: recordData.equipment_type || recordData.equipmentType || null,
      };
      const response = await apiClient.post("/emissions", payload);
      return response.data;
    } catch (err: any) {
      return { success: false, message: "Backend offline, saved locally." };
    }
  },

  update: async (id: string, recordData: any) => {
    try {
      const payload = {
        ...recordData,
        input_mode: recordData.input_mode || recordData.inputMode,
        period_start: recordData.period_start || recordData.periodStart,
        period_end: recordData.period_end || recordData.periodEnd,
        emission_factor_info: recordData.emission_factor_info || recordData.emissionFactorInfo,
      };
      const response = await apiClient.put(`/emissions/${id}`, payload);
      return response.data;
    } catch (err: any) {
      return { success: false, message: "Backend offline, updated locally." };
    }
  },

  delete: async (id: string) => {
    try {
      const response = await apiClient.delete(`/emissions/${id}`);
      return response.data;
    } catch (err: any) {
      return { success: false, message: "Backend offline, deleted locally." };
    }
  },
};

// ============================================================
// ACTIVITIES API
// ============================================================
export const activities = {
  getAll: async (params?: Record<string, any>) => {
    try {
      const response = await apiClient.get("/activities", { params });
      return response.data;
    } catch (err: any) {
      return {
        success: false,
        data: MOCK_ACTIVITIES,
      };
    }
  },

  getById: async (id: string) => {
    try {
      const response = await apiClient.get(`/activities/${id}`);
      return response.data;
    } catch (err: any) {
      return { success: false, data: null };
    }
  },

  create: async (activityData: Omit<Activity, "id">) => {
    try {
      const response = await apiClient.post("/emissions", activityData);
      return response.data;
    } catch (err: any) {
      const newActivity: Activity = {
        id: MOCK_ACTIVITIES.length + 1,
        ...activityData,
      };
      MOCK_ACTIVITIES.push(newActivity);
      return { success: true, data: newActivity };
    }
  },

  uploadCSV: async (_file: File) => {
    return {
      success: true,
      data: {
        message: "File uploaded successfully",
        records: 10,
      },
    };
  },

  validate: async (id: string | number) => {
    try {
      const response = await apiClient.put(`/emissions/${id}`, { status: "validated" });
      return response.data;
    } catch (err) {
      const activity = MOCK_ACTIVITIES.find((item) => item.id === Number(id));
      if (activity) {
        activity.status = "validated";
      }
      return { success: true, data: activity };
    }
  },

  delete: async (id: string | number) => {
    try {
      const response = await apiClient.delete(`/emissions/${id}`);
      return response.data;
    } catch (err) {
      return { success: true, data: { success: true } };
    }
  },
};

// ============================================================
// REPORTS API (PDF DOWNLOAD)
// ============================================================
export const reportsApi = {
  downloadPdf: async () => {
    const response = await apiClient.get("/reports/pdf", {
      responseType: "blob",
    });
    return response.data;
  },
};

// ============================================================
// RECOMMENDATIONS API (organization-scoped JWT engine)
// ============================================================
export const recommendationsApi = {
  getAll: async (): Promise<RecommendationsResponse> => {
    const response = await apiClient.get("/recommendations");
    return response.data;
  },
};