import type { ScopeCategoryDefinition, ScopeType } from "../types/emissions";

export const CURRENCY_OPTIONS = [
  { code: "USD", symbol: "$", label: "USD ($) - US Dollar" },
  { code: "EUR", symbol: "€", label: "EUR (€) - Euro" },
  { code: "GBP", symbol: "£", label: "GBP (£) - British Pound" },
  { code: "INR", symbol: "₹", label: "INR (₹) - Indian Rupee" },
  { code: "CAD", symbol: "C$", label: "CAD ($) - Canadian Dollar" },
  { code: "AUD", symbol: "A$", label: "AUD ($) - Australian Dollar" },
  { code: "SGD", symbol: "S$", label: "SGD ($) - Singapore Dollar" },
];

export const IT_FACILITY_OPTIONS = [
  "Global Tech HQ (Owned/Leased Campus)",
  "Offshore Development Center (ODC)",
  "Co-location Data Center / Colocate Facility",
  "Cloud Infrastructure (AWS / Azure / GCP)",
  "Regional Client Delivery Office",
  "Remote Workforce / Work From Home (WFH)",
  "R&D / Hardware Testing Lab",
];

export const GHG_CATEGORIES: ScopeCategoryDefinition[] = [
  // ============================================================
  // SCOPE 1 - Direct Emissions
  // ============================================================
  {
    id: "s1-stationary",
    name: "Stationary Combustion",
    scope: "scope1",
    description: "Diesel generators, boilers and other fixed fuel-burning equipment",
    defaultInputMode: "physical",
    allowedUnits: ["Liters (L)", "kg", "m³", "gallons (gal)"],
    defaultUnit: "Liters (L)",
  },
  {
    id: "s1-mobile",
    name: "Mobile Combustion",
    scope: "scope1",
    description: "Company-owned / controlled vehicles and shuttle buses",
    defaultInputMode: "physical",
    allowedUnits: ["Liters (L)", "kg", "m³"],
    defaultUnit: "Liters (L)",
  },
  {
    id: "s1-fugitive",
    name: "Fugitive / Refrigerant Emissions",
    scope: "scope1",
    description: "AC, chiller and HVAC refrigerant leakage or refill",
    defaultInputMode: "physical",
    allowedUnits: ["Kilograms (kg)"],
    defaultUnit: "Kilograms (kg)",
  },
  {
    id: "s1-other",
    name: "Other Direct Emissions",
    scope: "scope1",
    description: "Other direct emission sources owned or controlled by the organization",
    defaultInputMode: "physical",
    allowedUnits: ["kg", "Liters (L)", "m³", "other"],
    defaultUnit: "kg",
  },

  // ============================================================
  // SCOPE 2 - Purchased Energy for IT Offices & Server Rooms
  // ============================================================
  {
    id: "s2-electricity",
    name: "Purchased Electricity (Offices & Server Rooms)",
    scope: "scope2",
    description: "Grid power consumed at IT campuses, offshore centers, and owned server rooms",
    defaultInputMode: "physical",
    allowedUnits: ["kilowatt-hours (kWh)", "megawatt-hours (MWh)", "gigajoules (GJ)"],
    defaultUnit: "kilowatt-hours (kWh)",
  },
  {
    id: "s2-steam-heat",
    name: "Purchased Steam / District Cooling / Heat",
    scope: "scope2",
    description: "District chilled water / cooling systems servicing IT tech parks",
    defaultInputMode: "physical",
    allowedUnits: ["kilowatt-hours (kWh)", "megawatt-hours (MWh)", "gigajoules (GJ)"],
    defaultUnit: "megawatt-hours (MWh)",
  },

  // ============================================================
  // SCOPE 3 - Value Chain: UPSTREAM (IT Supply Chain, Cloud & WFH)
  // ============================================================
  {
    id: "s3-cat1",
    name: "Cloud Hosting, SaaS & Purchased Services",
    scope: "scope3",
    section: "Upstream",
    description: "Cat 1: Public cloud (AWS, Azure, GCP), SaaS subscriptions, consulting & vendor services",
    defaultInputMode: "spend_based",
    allowedUnits: ["USD", "EUR", "GBP", "INR", "SGD", "metric tons (t)", "kilograms (kg)"],
    defaultUnit: "USD",
  },
  {
    id: "s3-cat2",
    name: "IT Hardware & Capital Goods",
    scope: "scope3",
    section: "Upstream",
    description: "Cat 2: Procurement of developer laptops, monitors, rack servers, networking gear & office furniture",
    defaultInputMode: "spend_based",
    allowedUnits: ["USD", "EUR", "GBP", "INR", "units", "metric tons (t)"],
    defaultUnit: "USD",
  },
  {
    id: "s3-cat3",
    name: "Fuel- & Energy-Related Activities (Not Scope 1/2)",
    scope: "scope3",
    section: "Upstream",
    description: "Cat 3: T&D grid losses and upstream fuel extraction for IT power generation",
    defaultInputMode: "physical",
    allowedUnits: ["kilowatt-hours (kWh)", "megawatt-hours (MWh)", "liters (L)", "gigajoules (GJ)"],
    defaultUnit: "kilowatt-hours (kWh)",
  },
  {
    id: "s3-cat4",
    name: "Upstream IT Hardware Logistics & Freight",
    scope: "scope3",
    section: "Upstream",
    description: "Cat 4: Inbound shipping & courier freight of IT equipment, servers, and devices",
    defaultInputMode: "physical",
    allowedUnits: ["kilometers (km)", "miles (mi)", "tonne-km (t-km)", "USD"],
    defaultUnit: "kilometers (km)",
  },
  {
    id: "s3-cat5",
    name: "E-Waste & Operational Waste",
    scope: "scope3",
    section: "Upstream",
    description: "Cat 5: Disposal & certified recycling of obsolete IT assets, batteries, and office waste",
    defaultInputMode: "physical",
    allowedUnits: ["kilograms (kg)", "metric tons (t)", "units"],
    defaultUnit: "kilograms (kg)",
  },
  {
    id: "s3-cat6",
    name: "Business Travel (Flights & Client Visits)",
    scope: "scope3",
    section: "Upstream",
    description: "Cat 6: Client onsite visits, tech conferences, air travel, hotel stays, and cabs",
    defaultInputMode: "physical",
    allowedUnits: ["kilometers (km)", "miles (mi)", "passenger-km (p-km)", "USD"],
    defaultUnit: "kilometers (km)",
  },
  {
    id: "s3-cat7",
    name: "Employee Commuting & Remote WFH Energy",
    scope: "scope3",
    section: "Upstream",
    description: "Cat 7: Daily employee commutes + estimated Work-From-Home (WFH) laptop & heating/cooling energy",
    defaultInputMode: "physical",
    allowedUnits: ["kilowatt-hours (kWh)", "kilometers (km)", "miles (mi)", "person-days"],
    defaultUnit: "kilowatt-hours (kWh)",
  },
  {
    id: "s3-cat8",
    name: "Co-location Data Center Leased Assets",
    scope: "scope3",
    section: "Upstream",
    description: "Cat 8: Third-party co-location data center space, server racks, and leased IT infrastructure",
    defaultInputMode: "physical",
    allowedUnits: ["kilowatt-hours (kWh)", "megawatt-hours (MWh)", "rack-months", "USD"],
    defaultUnit: "kilowatt-hours (kWh)",
  },

  // ============================================================
  // SCOPE 3 - Value Chain: DOWNSTREAM (Software Delivery & Lifecycle)
  // ============================================================
  {
    id: "s3-cat9",
    name: "Downstream Software Shipping & Distribution",
    scope: "scope3",
    section: "Downstream",
    description: "Cat 9: Outbound distribution of physical IT products or client-managed device logistics",
    defaultInputMode: "physical",
    allowedUnits: ["kilometers (km)", "miles (mi)", "tonne-km (t-km)", "USD"],
    defaultUnit: "kilometers (km)",
  },
  {
    id: "s3-cat10",
    name: "Processing of Sold Tech Components",
    scope: "scope3",
    section: "Downstream",
    description: "Cat 10: Integration of proprietary software/SDKs into third-party hardware devices",
    defaultInputMode: "physical",
    allowedUnits: ["units", "metric tons (t)", "USD"],
    defaultUnit: "units",
  },
  {
    id: "s3-cat11",
    name: "Use Phase of Sold Software & Hardware",
    scope: "scope3",
    section: "Downstream",
    description: "Cat 11: End-user compute & server energy consumed running deployed software applications",
    defaultInputMode: "physical",
    allowedUnits: ["kilowatt-hours (kWh)", "megawatt-hours (MWh)", "gigajoules (GJ)"],
    defaultUnit: "kilowatt-hours (kWh)",
  },
  {
    id: "s3-cat12",
    name: "End-of-Life Recycling of Deployed Hardware",
    scope: "scope3",
    section: "Downstream",
    description: "Cat 12: E-waste treatment & recycling of hardware products sold or leased to clients",
    defaultInputMode: "physical",
    allowedUnits: ["kilograms (kg)", "metric tons (t)", "units"],
    defaultUnit: "kilograms (kg)",
  },
  {
    id: "s3-cat13",
    name: "Downstream Leased IT Assets",
    scope: "scope3",
    section: "Downstream",
    description: "Cat 13: Servers, laptops or appliances owned by IT firm and leased to enterprise clients",
    defaultInputMode: "physical",
    allowedUnits: ["kilowatt-hours (kWh)", "units", "USD"],
    defaultUnit: "kilowatt-hours (kWh)",
  },
  {
    id: "s3-cat14",
    name: "Franchises & Partner Delivery Nodes",
    scope: "scope3",
    section: "Downstream",
    description: "Cat 14: Partner-managed delivery centers or franchised IT training centers",
    defaultInputMode: "spend_based",
    allowedUnits: ["USD", "EUR", "GBP", "INR", "kilowatt-hours (kWh)"],
    defaultUnit: "USD",
  },
  {
    id: "s3-cat15",
    name: "Financed IT Investments & Ventures",
    scope: "scope3",
    section: "Downstream",
    description: "Cat 15: Corporate venture investments, tech startup equity, and joint software ventures",
    defaultInputMode: "spend_based",
    allowedUnits: ["USD", "EUR", "GBP", "INR", "SGD"],
    defaultUnit: "USD",
  },
];

export function getCategoriesByScope(scope: ScopeType): ScopeCategoryDefinition[] {
  return GHG_CATEGORIES.filter((c) => c.scope === scope);
}

export function getCategoryByName(name: string): ScopeCategoryDefinition | undefined {
  return GHG_CATEGORIES.find((c) => c.name.toLowerCase() === name.toLowerCase() || c.id === name);
}
