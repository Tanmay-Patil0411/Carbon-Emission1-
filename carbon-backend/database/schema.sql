-- ============================================================
-- CarbonTrack Enterprise ESG Database Schema
-- Standard PostgreSQL DDL Script
-- ============================================================

-- Drop tables if re-initialization is required
DROP TABLE IF EXISTS activity_attachments CASCADE;
DROP TABLE IF EXISTS emissions_records CASCADE;
DROP TABLE IF EXISTS emission_targets CASCADE;
DROP TABLE IF EXISTS facilities CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS organizations CASCADE;
DROP TABLE IF EXISTS emission_factors CASCADE;
DROP TABLE IF EXISTS carbon_benchmarks CASCADE;

-- 1. Organizations Table
CREATE TABLE organizations (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  industry_vertical VARCHAR(255),
  headcount VARCHAR(100),
  ef_standard VARCHAR(50) DEFAULT 'DEFRA 2024',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Users Table
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  organization_id INT REFERENCES organizations(id) ON DELETE CASCADE,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'admin',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Facilities & Tech Parks Table
CREATE TABLE facilities (
  id SERIAL PRIMARY KEY,
  organization_id INT REFERENCES organizations(id) ON DELETE CASCADE,
  facility_name VARCHAR(255) NOT NULL,
  location VARCHAR(255)
);

-- 4. Emissions Activity Records Table (Core GHG Registry)
CREATE TABLE emissions_records (
  id VARCHAR(100) PRIMARY KEY,
  organization_id INT REFERENCES organizations(id) ON DELETE CASCADE,
  facility_id INT REFERENCES facilities(id) ON DELETE SET NULL,
  scope VARCHAR(20) NOT NULL,
  category VARCHAR(255) NOT NULL,
  activity_type VARCHAR(255),
  equipment_type VARCHAR(255),
  quantity NUMERIC(15, 4) NOT NULL,
  unit VARCHAR(50) NOT NULL,
  input_mode VARCHAR(50) NOT NULL,
  currency VARCHAR(10),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  emissions_t_co2e NUMERIC(12, 4) NOT NULL,
  emission_factor_info TEXT,
  status VARCHAR(50) DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Activity PDF Evidence Attachments Table
CREATE TABLE activity_attachments (
  id VARCHAR(100) PRIMARY KEY,
  record_id VARCHAR(100) REFERENCES emissions_records(id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,
  file_url TEXT NOT NULL,
  size_bytes BIGINT NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Emission Factors Database Registry Table
CREATE TABLE emission_factors (
  id SERIAL PRIMARY KEY,
  category VARCHAR(255) NOT NULL,
  sub_type VARCHAR(255),
  unit VARCHAR(50) NOT NULL,
  factor_kg_co2e_per_unit NUMERIC(12, 6) NOT NULL,
  standard_source VARCHAR(100) NOT NULL
);

-- 7. Industry Carbon Intensity Benchmarks (global reference table)
-- Thresholds are illustrative reference ranges / CarbonTrack internal alert bands.
-- They are NOT GHG Protocol company emission limits.
CREATE TABLE carbon_benchmarks (
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

-- 8. Organization-specific Reduction Targets
CREATE TABLE emission_targets (
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

-- Performance Indexes for Analytics & Dashboard Aggregation
CREATE INDEX idx_emissions_org ON emissions_records(organization_id);
CREATE INDEX idx_emissions_scope ON emissions_records(scope);
CREATE INDEX idx_emissions_category ON emissions_records(category);
CREATE INDEX idx_emissions_period ON emissions_records(period_start, period_end);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_emission_targets_org ON emission_targets(organization_id);
CREATE INDEX idx_carbon_benchmarks_industry ON carbon_benchmarks(industry_vertical);
