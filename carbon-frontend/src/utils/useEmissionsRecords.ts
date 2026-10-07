import { useState, useEffect, useCallback } from "react";
import type { EmissionsRecord } from "../types/emissions";
import { emissionsApi } from "../services/api";
import { useAuth } from "../context/AuthContext";

export function useEmissionsRecords() {
  const { user } = useAuth();
  const [records, setRecords] = useState<EmissionsRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Compute account-scoped storage key to ensure 100% data isolation per user/organization
  const orgOrUserId = user?.organization_id || (user as any)?.organizationId || user?.id;
  const storageKey = orgOrUserId
    ? `carbontrack_emissions_records_org_${orgOrUserId}`
    : "carbontrack_emissions_records_guest";

  // Helper to load records from backend API first, falling back strictly to account-specific storage
  const loadRecords = useCallback(async () => {
    setIsLoading(true);

    // 1. Try Backend API as Source of Truth
    try {
      const apiRes = await emissionsApi.getAll();
      if (apiRes && apiRes.success && Array.isArray(apiRes.data)) {
        const backendRecords: EmissionsRecord[] = apiRes.data.map((r: any) => ({
          ...r,
          quantity: typeof r.quantity === "number" ? r.quantity : parseFloat(r.quantity || 0),
          emissions_t_co2e: typeof r.emissions_t_co2e === "number" ? r.emissions_t_co2e : parseFloat(r.emissions_t_co2e || 0),
          attachments: Array.isArray(r.attachments) ? r.attachments : [],
        }));

        setRecords(backendRecords);
        try {
          localStorage.setItem(storageKey, JSON.stringify(backendRecords));
        } catch (e) {}
        setIsLoading(false);
        return;
      }
    } catch (err) {
      console.warn("Backend API offline when fetching emissions records, using localStorage fallback.");
    }

    // 2. Account-Specific LocalStorage Fallback (only if API unreachable)
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const userOnlyRecords = parsed.map((r: any) => ({
            ...r,
            emissions_t_co2e: typeof r.emissions_t_co2e === "number" && !isNaN(r.emissions_t_co2e) ? r.emissions_t_co2e : 0,
            attachments: Array.isArray(r.attachments) ? r.attachments : [],
          }));
          setRecords(userOnlyRecords);
          setIsLoading(false);
          return;
        }
      }
    } catch (err) {
      console.error("Error reading emissions records from localStorage:", err);
    }

    setRecords([]);
    setIsLoading(false);
  }, [storageKey]);

  useEffect(() => {
    loadRecords();
    window.addEventListener("storage", loadRecords);
    return () => window.removeEventListener("storage", loadRecords);
  }, [loadRecords, orgOrUserId]);

  const saveRecords = (newRecords: EmissionsRecord[]) => {
    setRecords(newRecords);
    try {
      localStorage.setItem(storageKey, JSON.stringify(newRecords));
    } catch (err) {
      console.error("Failed to save records to localStorage", err);
    }
  };

  const deleteRecord = async (id: string) => {
    const updated = records.filter((r) => r.id !== id);
    saveRecords(updated);
    try {
      await emissionsApi.delete(id);
      loadRecords();
    } catch (err) {
      console.warn("Backend delete request failed, updated locally.");
    }
  };

  const addRecord = async (newRec: EmissionsRecord) => {
    const updated = [newRec, ...records];
    saveRecords(updated);
    try {
      await emissionsApi.create(newRec);
      loadRecords();
    } catch (err) {
      console.warn("Backend create request failed, saved locally.");
    }
  };

  const clearAllRecords = () => {
    saveRecords([]);
  };

  return {
    records,
    isLoading,
    loadRecords,
    saveRecords,
    deleteRecord,
    addRecord,
    clearAllRecords,
    resetToInitial: clearAllRecords,
  };
}
