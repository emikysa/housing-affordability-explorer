-- Migration: Create utility_models table with tiered rate support
-- Part of Multi-Dimensional Model Architecture - Phase 3

-- ============================================
-- UTILITY MODELS
-- ============================================
-- Stores utility rate structures for water, electric, and gas providers

CREATE TABLE IF NOT EXISTS utility_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  utility_type text NOT NULL CHECK (utility_type IN ('water', 'electric', 'gas')),
  provider_name text NOT NULL,                  -- e.g., "Fort Collins Utilities - Water"
  provider_code text,                           -- Short code for display
  description text,
  service_area text,                            -- e.g., "Fort Collins, CO"
  -- Base charges (monthly fixed fees)
  base_monthly_fee numeric DEFAULT 0,           -- Fixed monthly service charge
  -- Rate tiers stored as JSONB for flexibility
  -- Format: [{"max_units": 5000, "rate": 0.005}, {"max_units": 10000, "rate": 0.007}, {"max_units": null, "rate": 0.009}]
  -- null max_units means "and above"
  rate_tiers jsonb NOT NULL DEFAULT '[]',
  -- Unit information
  unit_name text NOT NULL,                      -- 'gallons', 'kWh', 'therms', 'ccf'
  unit_display text,                            -- Display name like "per 1,000 gallons"
  -- Seasonal adjustments (optional)
  has_seasonal_rates boolean DEFAULT false,
  summer_multiplier numeric DEFAULT 1.0,        -- Multiply rates in summer months
  winter_multiplier numeric DEFAULT 1.0,        -- Multiply rates in winter months
  -- Metadata
  effective_date date DEFAULT CURRENT_DATE,
  source_url text,                              -- Link to official rate schedule
  notes text,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

COMMENT ON TABLE utility_models IS 'Utility rate structures for water, electric, and gas providers';
COMMENT ON COLUMN utility_models.rate_tiers IS 'JSONB array of tier objects: [{max_units: number|null, rate: number}]. null max_units means unlimited.';

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_utility_models_type ON utility_models(utility_type);
CREATE INDEX IF NOT EXISTS idx_utility_models_sort ON utility_models(sort_order);

-- Enable RLS
ALTER TABLE utility_models ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read access for utility_models" ON utility_models FOR SELECT USING (true);

-- ============================================
-- SEED DATA: Fort Collins Area Utilities
-- ============================================

-- WATER UTILITIES
INSERT INTO utility_models (id, utility_type, provider_name, provider_code, description, service_area, base_monthly_fee, rate_tiers, unit_name, unit_display, effective_date, sort_order) VALUES
  ('00000000-0000-0000-0003-000000000001', 'water', 'Fort Collins Utilities - Water', 'FCU-W',
   'City of Fort Collins municipal water service',
   'Fort Collins, CO',
   12.50,
   '[{"max_units": 7000, "rate": 0.00425}, {"max_units": 13000, "rate": 0.00525}, {"max_units": null, "rate": 0.00675}]',
   'gallons', 'per gallon',
   '2026-01-01', 1),

  ('00000000-0000-0000-0003-000000000002', 'water', 'Fort Collins Loveland Water District', 'FCLWD',
   'Regional water district serving areas between Fort Collins and Loveland',
   'Fort Collins-Loveland corridor',
   18.00,
   '[{"max_units": 6000, "rate": 0.00475}, {"max_units": 12000, "rate": 0.00575}, {"max_units": null, "rate": 0.00725}]',
   'gallons', 'per gallon',
   '2026-01-01', 2),

  ('00000000-0000-0000-0003-000000000003', 'water', 'East Larimer County Water District', 'ELCO',
   'Serves eastern Larimer County',
   'Eastern Larimer County',
   15.00,
   '[{"max_units": 5000, "rate": 0.00500}, {"max_units": 10000, "rate": 0.00600}, {"max_units": null, "rate": 0.00750}]',
   'gallons', 'per gallon',
   '2026-01-01', 3);

-- ELECTRIC UTILITIES
INSERT INTO utility_models (id, utility_type, provider_name, provider_code, description, service_area, base_monthly_fee, rate_tiers, unit_name, unit_display, has_seasonal_rates, summer_multiplier, winter_multiplier, effective_date, sort_order) VALUES
  ('00000000-0000-0000-0003-000000000011', 'electric', 'Fort Collins Utilities - Electric', 'FCU-E',
   'City of Fort Collins municipal electric service',
   'Fort Collins, CO',
   8.50,
   '[{"max_units": 500, "rate": 0.0725}, {"max_units": 1000, "rate": 0.0875}, {"max_units": null, "rate": 0.1025}]',
   'kWh', 'per kWh',
   true, 1.15, 1.0,
   '2026-01-01', 11),

  ('00000000-0000-0000-0003-000000000012', 'electric', 'Poudre Valley REA', 'PVREA',
   'Rural electric cooperative serving northern Colorado',
   'Northern Colorado rural areas',
   22.00,
   '[{"max_units": 500, "rate": 0.0850}, {"max_units": 1000, "rate": 0.0950}, {"max_units": null, "rate": 0.1100}]',
   'kWh', 'per kWh',
   true, 1.10, 1.0,
   '2026-01-01', 12),

  ('00000000-0000-0000-0003-000000000013', 'electric', 'Xcel Energy - Colorado', 'XCEL-E',
   'Investor-owned utility serving parts of Colorado',
   'Various Colorado locations',
   10.25,
   '[{"max_units": 500, "rate": 0.0795}, {"max_units": 1000, "rate": 0.0925}, {"max_units": null, "rate": 0.1075}]',
   'kWh', 'per kWh',
   true, 1.12, 1.0,
   '2026-01-01', 13);

-- GAS UTILITIES
INSERT INTO utility_models (id, utility_type, provider_name, provider_code, description, service_area, base_monthly_fee, rate_tiers, unit_name, unit_display, has_seasonal_rates, summer_multiplier, winter_multiplier, effective_date, sort_order) VALUES
  ('00000000-0000-0000-0003-000000000021', 'gas', 'Xcel Energy - Natural Gas', 'XCEL-G',
   'Natural gas service from Xcel Energy',
   'Fort Collins and surrounding areas',
   12.00,
   '[{"max_units": 50, "rate": 0.65}, {"max_units": 100, "rate": 0.72}, {"max_units": null, "rate": 0.80}]',
   'therms', 'per therm',
   true, 0.85, 1.20,
   '2026-01-01', 21),

  ('00000000-0000-0000-0003-000000000022', 'gas', 'Atmos Energy', 'ATMOS',
   'Natural gas service from Atmos Energy',
   'Select Colorado communities',
   10.50,
   '[{"max_units": 50, "rate": 0.68}, {"max_units": 100, "rate": 0.75}, {"max_units": null, "rate": 0.82}]',
   'therms', 'per therm',
   true, 0.85, 1.25,
   '2026-01-01', 22),

  ('00000000-0000-0000-0003-000000000023', 'gas', 'No Gas Service', 'NONE',
   'All-electric home (no natural gas)',
   'Any',
   0,
   '[]',
   'therms', 'per therm',
   false, 1.0, 1.0,
   '2026-01-01', 99);

-- ============================================
-- VIEWS
-- ============================================

CREATE OR REPLACE VIEW v_utility_models AS
SELECT
  id,
  utility_type,
  provider_name,
  provider_code,
  description,
  service_area,
  base_monthly_fee,
  rate_tiers,
  unit_name,
  unit_display,
  has_seasonal_rates,
  summer_multiplier,
  winter_multiplier,
  effective_date,
  source_url,
  notes,
  sort_order,
  created_at,
  updated_at
FROM utility_models
ORDER BY utility_type, sort_order;

-- Separate views by utility type for convenience
CREATE OR REPLACE VIEW v_water_utility_models AS
SELECT * FROM v_utility_models WHERE utility_type = 'water';

CREATE OR REPLACE VIEW v_electric_utility_models AS
SELECT * FROM v_utility_models WHERE utility_type = 'electric';

CREATE OR REPLACE VIEW v_gas_utility_models AS
SELECT * FROM v_utility_models WHERE utility_type = 'gas';

-- Grant access
GRANT SELECT ON v_utility_models TO anon, authenticated;
GRANT SELECT ON v_water_utility_models TO anon, authenticated;
GRANT SELECT ON v_electric_utility_models TO anon, authenticated;
GRANT SELECT ON v_gas_utility_models TO anon, authenticated;

-- ============================================
-- UTILITY COST CALCULATION FUNCTION
-- ============================================
-- Calculate monthly cost given consumption and utility model

CREATE OR REPLACE FUNCTION calculate_utility_cost(
  p_utility_model_id uuid,
  p_consumption numeric,
  p_is_summer boolean DEFAULT false
) RETURNS numeric AS $$
DECLARE
  v_model utility_models%ROWTYPE;
  v_tier jsonb;
  v_remaining numeric;
  v_total_cost numeric := 0;
  v_tier_max numeric;
  v_tier_rate numeric;
  v_prev_max numeric := 0;
  v_tier_usage numeric;
  v_seasonal_multiplier numeric;
BEGIN
  -- Get the utility model
  SELECT * INTO v_model FROM utility_models WHERE id = p_utility_model_id;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- Start with base fee
  v_total_cost := v_model.base_monthly_fee;

  -- Determine seasonal multiplier
  IF v_model.has_seasonal_rates THEN
    v_seasonal_multiplier := CASE WHEN p_is_summer THEN v_model.summer_multiplier ELSE v_model.winter_multiplier END;
  ELSE
    v_seasonal_multiplier := 1.0;
  END IF;

  -- Process tiered rates
  v_remaining := p_consumption;

  FOR v_tier IN SELECT * FROM jsonb_array_elements(v_model.rate_tiers)
  LOOP
    IF v_remaining <= 0 THEN
      EXIT;
    END IF;

    v_tier_max := (v_tier->>'max_units')::numeric;
    v_tier_rate := (v_tier->>'rate')::numeric * v_seasonal_multiplier;

    IF v_tier_max IS NULL THEN
      -- Unlimited tier - use all remaining
      v_tier_usage := v_remaining;
    ELSE
      -- Limited tier - use up to max minus previous tiers
      v_tier_usage := LEAST(v_remaining, v_tier_max - v_prev_max);
    END IF;

    v_total_cost := v_total_cost + (v_tier_usage * v_tier_rate);
    v_remaining := v_remaining - v_tier_usage;
    v_prev_max := COALESCE(v_tier_max, v_prev_max);
  END LOOP;

  RETURN ROUND(v_total_cost, 2);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_utility_cost IS 'Calculate monthly utility cost given consumption and utility model ID';
