-- ============================================================
-- Safe additive migration for Recommendation Module
-- Does NOT drop existing tables or data.
-- ============================================================

CREATE TABLE IF NOT EXISTS carbon_benchmarks (
  id SERIAL PRIMARY KEY,
  industry_vertical VARCHAR(255) NOT NULL,
  metric VARCHAR(255) NOT NULL,
  unit VARCHAR(50) NOT NULL,
  low_threshold NUMERIC(10, 2),
  moderate_threshold NUMERIC(10, 2),
  high_threshold NUMERIC(10, 2),
  source VARCHAR(255),
  source_year INT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS emission_targets (
  id SERIAL PRIMARY KEY,
  organization_id INT REFERENCES organizations(id) ON DELETE CASCADE,
  target_type VARCHAR(100) NOT NULL,
  baseline_period_start DATE,
  baseline_period_end DATE,
  target_year INT,
  reduction_percentage NUMERIC(8, 2),
  target_emissions_t_co2e NUMERIC(15, 4),
  scope VARCHAR(20),
  category VARCHAR(255),
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_emission_targets_org ON emission_targets(organization_id);
CREATE INDEX IF NOT EXISTS idx_carbon_benchmarks_industry ON carbon_benchmarks(industry_vertical);

-- Seed benchmarks only when empty (preserves any existing runtime-seeded rows)
INSERT INTO carbon_benchmarks (industry_vertical, metric, unit, low_threshold, moderate_threshold, high_threshold, source, source_year, notes)
SELECT v.industry_vertical, v.metric, v.unit, v.low_threshold, v.moderate_threshold, v.high_threshold, v.source, v.source_year, v.notes
FROM (
  VALUES
    ('Information Technology & Software Services', 'emission_intensity_per_employee', 'tCO2e/employee', 0.35, 0.60, 1.20, 'DEFRA 2024 / IEA reference ranges for IT & Services (illustrative)', 2024, 'Illustrative intensity bands. Not a GHG Protocol limit.'),
    ('Banking / Finance', 'emission_intensity_per_employee', 'tCO2e/employee', 0.40, 0.75, 1.50, 'CDP Financial Services sector references (illustrative)', 2024, 'Illustrative operational intensity bands.'),
    ('Manufacturing', 'emission_intensity_per_employee', 'tCO2e/employee', 2.50, 5.00, 12.00, 'IEA industrial intensity references (illustrative)', 2024, 'Illustrative manufacturing intensity bands.'),
    ('Retail', 'emission_intensity_per_employee', 'tCO2e/employee', 0.50, 1.00, 2.50, 'GHG Protocol Retail guidance context (illustrative)', 2024, 'Illustrative retail operational intensity bands.'),
    ('Healthcare', 'emission_intensity_per_employee', 'tCO2e/employee', 1.20, 2.80, 6.00, 'Healthcare footprint references (illustrative)', 2024, 'Illustrative healthcare facility intensity bands.'),
    ('Logistics / Transportation', 'emission_intensity_per_employee', 'tCO2e/employee', 3.00, 7.50, 18.00, 'GLEC-aligned logistics intensity context (illustrative)', 2024, 'Illustrative logistics intensity bands.'),
    ('Education', 'emission_intensity_per_employee', 'tCO2e/employee', 0.30, 0.65, 1.40, 'Higher education campus references (illustrative)', 2024, 'Illustrative campus intensity bands.'),
    ('Telecommunications', 'emission_intensity_per_employee', 'tCO2e/employee', 0.80, 1.80, 4.00, 'Telecom infrastructure references (illustrative)', 2024, 'Illustrative telecom intensity bands.'),
    ('Other', 'emission_intensity_per_employee', 'tCO2e/employee', 0.50, 1.00, 2.50, 'CarbonTrack Internal Reference Standard', 2026, 'CarbonTrack internal alert thresholds. Not an official external standard.')
) AS v(industry_vertical, metric, unit, low_threshold, moderate_threshold, high_threshold, source, source_year, notes)
WHERE NOT EXISTS (SELECT 1 FROM carbon_benchmarks LIMIT 1);
