-- ============================================================
-- CarbonTrack Initial Seed Data Script
-- Test dataset for IT Enterprise Carbon Accounting
-- ============================================================

-- Clean existing seed data
TRUNCATE TABLE activity_attachments CASCADE;
TRUNCATE TABLE emissions_records CASCADE;
TRUNCATE TABLE emission_targets CASCADE;
TRUNCATE TABLE facilities CASCADE;
TRUNCATE TABLE users CASCADE;
TRUNCATE TABLE organizations CASCADE;
TRUNCATE TABLE emission_factors CASCADE;
TRUNCATE TABLE carbon_benchmarks CASCADE;

-- 1. Seed Organization
INSERT INTO organizations (id, name, industry_vertical, headcount, ef_standard)
VALUES (1, 'Global Enterprise IT Solutions', 'Information Technology & Software Services', '1,250 FTE Engineers', 'DEFRA 2024');

-- 2. Seed Test Admin User (Password: password123)
-- bcrypt hash for 'password123': $2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW
INSERT INTO users (id, organization_id, email, password_hash, full_name, role)
VALUES (1, 1, 'admin@carbontrack.com', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'Sarah Jenkins', 'admin');

-- Reset sequences
SELECT setval('organizations_id_seq', (SELECT MAX(id) FROM organizations));
SELECT setval('users_id_seq', (SELECT MAX(id) FROM users));

-- 3. Seed Facilities
INSERT INTO facilities (id, organization_id, facility_name, location)
VALUES 
  (1, 1, 'Global Tech HQ (Owned Campus)', 'Building 4, Tech Park Boulevard'),
  (2, 1, 'Offshore Development Center (ODC)', 'Tower B, Silicon Zone');

SELECT setval('facilities_id_seq', (SELECT MAX(id) FROM facilities));

-- 4. Seed Emission Factors Registry
INSERT INTO emission_factors (id, category, sub_type, unit, factor_kg_co2e_per_unit, standard_source)
VALUES 
  (1, 'Purchased Electricity (Offices & Server Rooms)', 'Grid Power', 'kilowatt-hours (kWh)', 0.420000, 'DEFRA 2024 / IEA Grid'),
  (2, 'Stationary Combustion', 'Diesel', 'liters (L)', 2.680000, 'DEFRA 2024 Gas Oil'),
  (3, 'Cloud Hosting, SaaS & Purchased Services', 'Compute Cluster', 'USD', 0.350000, 'GHG Protocol Supply Chain EEIO'),
  (4, 'IT Hardware & Capital Goods', 'Developer Laptops & Switches', 'USD', 0.280000, 'GHG Protocol Supply Chain EEIO'),
  (5, 'Employee Commuting & Remote WFH Energy', 'Homeworking Power', 'kilowatt-hours (kWh)', 0.420000, 'EcoAct Homeworking Factor');

SELECT setval('emission_factors_id_seq', (SELECT MAX(id) FROM emission_factors));

-- 5. Seed Scope 1, 2, and 3 Emission Records
INSERT INTO emissions_records (
  id, organization_id, facility_id, scope, category, activity_type, equipment_type, quantity, unit, input_mode, currency, period_start, period_end, emissions_t_co2e, emission_factor_info, status, notes, created_at
) VALUES
  (
    'rec-172600101', 1, 1, 'scope1',
    'Stationary Combustion', 'Diesel', '500kVA Server Backup Generator',
    1450.0000, 'liters (L)', 'physical', NULL,
    '2026-01-01', '2026-01-31', 3.8860,
    'DEFRA 2024 Gas Oil / Diesel Factor: 2.68 kg CO₂e / L', 'validated',
    'Emergency generator fuel during grid outage', '2026-02-01 10:00:00+00'
  ),
  (
    'rec-172600102', 1, 2, 'scope2',
    'Purchased Electricity (Offices & Server Rooms)', 'Grid Electricity', 'Server Room & Office HVAC',
    128500.0000, 'kilowatt-hours (kWh)', 'physical', NULL,
    '2026-01-01', '2026-01-31', 53.9700,
    'IEA National Grid Average Electricity Factor: 0.42 kg CO₂e / kWh', 'validated',
    'Monthly utility power bill for 1,200-seat ODC facility', '2026-02-05 09:30:00+00'
  ),
  (
    'rec-172600103', 1, 1, 'scope3',
    'Cloud Hosting, SaaS & Purchased Services', 'AWS Compute', 'Cloud Compute Clusters',
    48500.0000, 'USD', 'spend_based', 'USD',
    '2026-01-01', '2026-01-31', 16.9750,
    'GHG Protocol EEIO Cloud Factor: 0.35 kg CO₂e / $ spend', 'validated',
    'AWS us-east-1 & eu-west-1 billing invoice', '2026-02-02 11:00:00+00'
  ),
  (
    'rec-172600104', 1, 1, 'scope3',
    'IT Hardware & Capital Goods', 'Laptops & Switches', 'Developer Workstations',
    72000.0000, 'USD', 'spend_based', 'USD',
    '2026-02-01', '2026-02-15', 20.1600,
    'GHG Protocol Supply Chain Factor: 0.28 kg CO₂e / $ spend', 'pending',
    'Procurement of 40 developer laptops (M3 Max) & network switches', '2026-02-16 14:20:00+00'
  ),
  (
    'rec-172600105', 1, 2, 'scope3',
    'Employee Commuting & Remote WFH Energy', 'Remote Power', 'Hybrid Engineer Devices',
    24500.0000, 'kilowatt-hours (kWh)', 'physical', NULL,
    '2026-01-01', '2026-01-31', 10.2900,
    'EcoAct WFH Homeworking Energy Factor: 0.42 kg CO₂e / kWh', 'validated',
    'Estimated power usage for 450 hybrid remote engineers', '2026-02-01 17:00:00+00'
  );

-- 6. Seed Evidence PDF Attachments
INSERT INTO activity_attachments (id, record_id, file_name, file_url, size_bytes, uploaded_at)
VALUES
  ('att-101', 'rec-172600101', 'Diesel_Fuel_Receipt_Jan2026.pdf', '#', 819200, '2026-02-03 08:45:00+00'),
  ('att-102', 'rec-172600102', 'Jan2026_TechPark_Electricity_Bill.pdf', '#', 2097152, '2026-02-05 09:30:00+00'),
  ('att-103', 'rec-172600103', 'AWS_Invoice_Jan2026_Account_9842.pdf', '#', 1468006, '2026-02-02 11:00:00+00'),
  ('att-104', 'rec-172600104', 'PO_Apple_Hardware_Batch_Q1.pdf', '#', 3145728, '2026-02-16 14:20:00+00');

-- 7. Seed Industry Benchmarks (illustrative reference ranges — not GHG Protocol limits)
INSERT INTO carbon_benchmarks (industry_vertical, metric, unit, low_threshold, moderate_threshold, high_threshold, source, source_year, notes)
VALUES
  ('Information Technology & Software Services', 'emission_intensity_per_employee', 'tCO2e/employee', 0.35, 0.60, 1.20, 'DEFRA 2024 / IEA reference ranges for IT & Services (illustrative)', 2024, 'Illustrative intensity bands. Not a GHG Protocol limit.'),
  ('Banking / Finance', 'emission_intensity_per_employee', 'tCO2e/employee', 0.40, 0.75, 1.50, 'CDP Financial Services sector references (illustrative)', 2024, 'Illustrative operational intensity bands.'),
  ('Manufacturing', 'emission_intensity_per_employee', 'tCO2e/employee', 2.50, 5.00, 12.00, 'IEA industrial intensity references (illustrative)', 2024, 'Illustrative manufacturing intensity bands.'),
  ('Retail', 'emission_intensity_per_employee', 'tCO2e/employee', 0.50, 1.00, 2.50, 'GHG Protocol Retail guidance context (illustrative)', 2024, 'Illustrative retail operational intensity bands.'),
  ('Healthcare', 'emission_intensity_per_employee', 'tCO2e/employee', 1.20, 2.80, 6.00, 'Healthcare footprint references (illustrative)', 2024, 'Illustrative healthcare facility intensity bands.'),
  ('Logistics / Transportation', 'emission_intensity_per_employee', 'tCO2e/employee', 3.00, 7.50, 18.00, 'GLEC-aligned logistics intensity context (illustrative)', 2024, 'Illustrative logistics intensity bands.'),
  ('Education', 'emission_intensity_per_employee', 'tCO2e/employee', 0.30, 0.65, 1.40, 'Higher education campus references (illustrative)', 2024, 'Illustrative campus intensity bands.'),
  ('Telecommunications', 'emission_intensity_per_employee', 'tCO2e/employee', 0.80, 1.80, 4.00, 'Telecom infrastructure references (illustrative)', 2024, 'Illustrative telecom intensity bands.'),
  ('Other', 'emission_intensity_per_employee', 'tCO2e/employee', 0.50, 1.00, 2.50, 'CarbonTrack Internal Reference Standard', 2026, 'CarbonTrack internal alert thresholds. Not an official external standard.');

-- 8. Optional sample org reduction target (company-specific — not a scientific standard claim)
INSERT INTO emission_targets (
  organization_id, target_type, baseline_period_start, baseline_period_end,
  target_year, reduction_percentage, target_emissions_t_co2e, scope, category, status
) VALUES (
  1, 'absolute_inventory', '2026-01-01', '2026-12-31',
  2027, 20.00, 80.0000, NULL, NULL, 'active'
);
