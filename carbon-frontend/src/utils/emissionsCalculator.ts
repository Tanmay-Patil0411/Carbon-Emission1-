import type { InputMode } from "../types/emissions";

export interface CalculationResult {
  emissions_t_co2e: number;     // Metric tons of CO2 equivalent (tCO2e)
  factorInfo: string;           // Description & source of factor applied
  baseQuantity: number;         // Standardized volume or spend
  baseUnit: string;             // Standardized unit
}

/**
 * GHG Protocol Emission Factors Engine
 * Standard DEFRA 2024 / EPA / IPCC AR5 factors for IT enterprise emissions.
 */
export function calculateEmissions(
  categoryName: string,
  quantity: number,
  unit: string,
  inputMode: InputMode,
  currency?: string,
  subType?: string,       // Fuel Type or Refrigerant Type
  equipmentType?: string  // Equipment Type (for Refrigerants)
): CalculationResult {
  if (isNaN(quantity) || quantity <= 0) {
    return {
      emissions_t_co2e: 0,
      factorInfo: "No activity data entered",
      baseQuantity: 0,
      baseUnit: unit,
    };
  }

  const catLower = (categoryName || "").toLowerCase();
  const unitLower = (unit || "").toLowerCase();
  const subLower = (subType || "").toLowerCase();

  let emissions_kg_co2e = 0;
  let factorInfo = "";
  let baseQuantity = quantity;
  let baseUnit = unit;

  // ============================================================
  // SPEND-BASED CALCULATIONS (EEIO / GHG Protocol Spend Factors)
  // ============================================================
  if (inputMode === "spend_based") {
    if (catLower.includes("cloud") || catLower.includes("saas") || catLower.includes("services")) {
      emissions_kg_co2e = quantity * 0.35;
      factorInfo = `GHG Protocol EEIO Cloud Factor: 0.35 kg CO₂e / ${currency || "$"} spend`;
    } else if (catLower.includes("hardware") || catLower.includes("capital")) {
      emissions_kg_co2e = quantity * 0.28;
      factorInfo = `GHG Protocol Supply Chain Factor: 0.28 kg CO₂e / ${currency || "$"} spend`;
    } else if (catLower.includes("travel") || catLower.includes("flight")) {
      emissions_kg_co2e = quantity * 0.22;
      factorInfo = `DEFRA Travel Spend Factor: 0.22 kg CO₂e / ${currency || "$"} spend`;
    } else if (catLower.includes("investment") || catLower.includes("franchise")) {
      emissions_kg_co2e = quantity * 0.18;
      factorInfo = `PCAF Financed Emissions Factor: 0.18 kg CO₂e / ${currency || "$"} spend`;
    } else {
      emissions_kg_co2e = quantity * 0.25;
      factorInfo = `Generic EEIO Spend Factor: 0.25 kg CO₂e / ${currency || "$"} spend`;
    }
  } 
  // ============================================================
  // PHYSICAL QUANTITY CALCULATIONS (DEFRA / EPA Standard Factors)
  // ============================================================
  else {
    // ------------------------------------------------------------
    // 1. STATIONARY COMBUSTION
    // ------------------------------------------------------------
    if (catLower.includes("stationary")) {
      if (subLower.includes("png") || subLower.includes("natural gas")) {
        emissions_kg_co2e = quantity * 2.02;
        factorInfo = "DEFRA 2024 PNG / Natural Gas Factor: 2.02 kg CO₂e / m³";
      } else if (subLower.includes("lpg")) {
        if (unitLower.includes("l") || unitLower.includes("liter")) {
          emissions_kg_co2e = quantity * 1.55;
          factorInfo = "DEFRA 2024 LPG Fuel Factor: 1.55 kg CO₂e / Liters";
        } else {
          emissions_kg_co2e = quantity * 2.98;
          factorInfo = "DEFRA 2024 LPG Fuel Factor: 2.98 kg CO₂e / kg";
        }
      } else if (subLower.includes("fuel oil")) {
        emissions_kg_co2e = quantity * 3.18;
        factorInfo = "DEFRA 2024 Heavy Fuel Oil Factor: 3.18 kg CO₂e / Liters";
      } else if (subLower.includes("other")) {
        emissions_kg_co2e = quantity * 2.50;
        factorInfo = "Standard Fixed Fuel Factor: 2.50 kg CO₂e / unit";
      } else {
        // Default Diesel
        if (unitLower.includes("gal")) {
          baseQuantity = quantity * 3.78541;
          baseUnit = "Liters (L)";
          emissions_kg_co2e = baseQuantity * 2.68;
          factorInfo = "EPA Diesel Factor: 10.14 kg CO₂e / gal (2.68 kg CO₂e / L)";
        } else {
          emissions_kg_co2e = quantity * 2.68;
          factorInfo = "DEFRA 2024 Diesel Generator Factor: 2.68 kg CO₂e / L";
        }
      }
    }

    // ------------------------------------------------------------
    // 2. MOBILE COMBUSTION
    // ------------------------------------------------------------
    else if (catLower.includes("mobile")) {
      if (subLower.includes("petrol") || subLower.includes("gasoline")) {
        emissions_kg_co2e = quantity * 2.31;
        factorInfo = "DEFRA 2024 Petrol Fleet Factor: 2.31 kg CO₂e / Liters";
      } else if (subLower.includes("cng")) {
        if (unitLower.includes("m³")) {
          emissions_kg_co2e = quantity * 1.85;
          factorInfo = "DEFRA 2024 CNG Fleet Factor: 1.85 kg CO₂e / m³";
        } else {
          emissions_kg_co2e = quantity * 2.75;
          factorInfo = "DEFRA 2024 CNG Fleet Factor: 2.75 kg CO₂e / kg";
        }
      } else if (subLower.includes("other")) {
        emissions_kg_co2e = quantity * 2.20;
        factorInfo = "Standard Mobile Fuel Factor: 2.20 kg CO₂e / unit";
      } else {
        // Default Diesel
        emissions_kg_co2e = quantity * 2.68;
        factorInfo = "DEFRA 2024 Diesel Vehicle Fleet Factor: 2.68 kg CO₂e / Liters";
      }
    }

    // ------------------------------------------------------------
    // 3. FUGITIVE / REFRIGERANT EMISSIONS
    // ------------------------------------------------------------
    else if (catLower.includes("fugitive") || catLower.includes("refrigerant")) {
      let gwp = 2088; // Default R-410A GWP
      let refName = "R-410A";

      if (subLower.includes("r-134a")) {
        gwp = 1430;
        refName = "R-134a";
      } else if (subLower.includes("r-32")) {
        gwp = 675;
        refName = "R-32";
      } else if (subLower.includes("r-22")) {
        gwp = 1810;
        refName = "R-22";
      } else if (subLower.includes("other")) {
        gwp = 1500;
        refName = "Other Refrigerant";
      }

      emissions_kg_co2e = quantity * gwp;
      const eqText = equipmentType ? ` (${equipmentType})` : "";
      factorInfo = `IPCC AR5 ${refName}${eqText} GWP Factor: ${gwp} kg CO₂e / kg leaked`;
    }

    // ------------------------------------------------------------
    // 4. OTHER DIRECT EMISSIONS
    // ------------------------------------------------------------
    else if (catLower.includes("other direct")) {
      emissions_kg_co2e = quantity * 2.50;
      factorInfo = "GHG Protocol Direct Emission Factor: 2.50 kg CO₂e / unit";
    }

    // ------------------------------------------------------------
    // SCOPE 2 & SCOPE 3 CATEGORIES
    // ------------------------------------------------------------
    else if (catLower.includes("electricity")) {
      if (unitLower.includes("mwh")) {
        baseQuantity = quantity * 1000;
        baseUnit = "kWh";
        emissions_kg_co2e = baseQuantity * 0.42;
        factorInfo = "Grid Electricity Factor: 420 kg CO₂e / MWh";
      } else {
        emissions_kg_co2e = quantity * 0.42;
        factorInfo = "IEA National Grid Average Electricity Factor: 0.42 kg CO₂e / kWh";
      }
    } else if (catLower.includes("steam") || catLower.includes("district")) {
      emissions_kg_co2e = quantity * 0.18;
      factorInfo = "District Cooling Factor: 0.18 kg CO₂e / kWh";
    } else if (catLower.includes("travel") || catLower.includes("flight")) {
      emissions_kg_co2e = quantity * 0.15;
      factorInfo = "DEFRA Aviation Air Travel Factor: 0.15 kg CO₂e / km";
    } else if (catLower.includes("commuting") || catLower.includes("wfh") || catLower.includes("remote")) {
      emissions_kg_co2e = quantity * 0.42;
      factorInfo = "EcoAct WFH Homeworking Energy Factor: 0.42 kg CO₂e / kWh";
    } else if (catLower.includes("waste")) {
      emissions_kg_co2e = quantity * 0.05;
      factorInfo = "E-Waste Certified Recycling Factor: 0.05 kg CO₂e / kg";
    } else {
      emissions_kg_co2e = quantity * 0.50;
      factorInfo = "Standard Activity Factor: 0.50 kg CO₂e / unit";
    }
  }

  // Convert kg CO2e to Metric Tons (tCO2e)
  const emissions_t_co2e = parseFloat((emissions_kg_co2e / 1000).toFixed(4));

  return {
    emissions_t_co2e,
    factorInfo,
    baseQuantity,
    baseUnit,
  };
}

/**
 * Format bytes to readable string (e.g. 1.2 MB, 450 KB)
 */
export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}
