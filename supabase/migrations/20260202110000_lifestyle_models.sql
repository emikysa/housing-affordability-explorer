-- Migration: Create lifestyle_models and consumption_factors tables
-- Part of Multi-Dimensional Model Architecture - Phase 2

-- ============================================
-- CONSUMPTION FACTORS (Reference Table)
-- ============================================
-- Stores how much water/electricity/gas each household activity uses

CREATE TABLE IF NOT EXISTS consumption_factors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_code text UNIQUE NOT NULL,          -- e.g., 'shower', 'bath', 'laundry_load'
  activity_name text NOT NULL,                  -- e.g., 'Shower', 'Bath', 'Laundry load'
  description text,
  -- Resource consumption per occurrence
  water_gallons numeric DEFAULT 0,              -- gallons per occurrence
  electric_kwh numeric DEFAULT 0,               -- kWh per occurrence
  gas_therms numeric DEFAULT 0,                 -- therms per occurrence
  -- Metadata
  applies_to text DEFAULT 'per_person',         -- 'per_person', 'per_household', 'per_adult', 'per_child'
  frequency_unit text DEFAULT 'week',           -- 'day', 'week', 'month'
  notes text,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now()
);

COMMENT ON TABLE consumption_factors IS 'Reference table: resource consumption per household activity';
COMMENT ON COLUMN consumption_factors.applies_to IS 'Who this consumption applies to: per_person, per_household, per_adult, per_child';
COMMENT ON COLUMN consumption_factors.frequency_unit IS 'Base unit for frequency: day, week, or month';

-- Insert consumption factors (based on typical US residential data)
INSERT INTO consumption_factors (activity_code, activity_name, description, water_gallons, electric_kwh, gas_therms, applies_to, frequency_unit, sort_order) VALUES
  -- Water-intensive activities
  ('shower', 'Shower', 'Standard 8-minute shower', 17.0, 0.5, 0.02, 'per_person', 'week', 1),
  ('bath', 'Bath', 'Full bathtub', 36.0, 0.3, 0.03, 'per_person', 'week', 2),
  ('laundry_load', 'Laundry load', 'One washer load (hot/warm)', 20.0, 0.5, 0.0, 'per_household', 'week', 3),
  ('dishwasher_load', 'Dishwasher load', 'One dishwasher cycle', 6.0, 1.8, 0.0, 'per_household', 'week', 4),
  ('hand_dishes', 'Hand washing dishes', 'One session of hand washing', 8.0, 0.0, 0.0, 'per_household', 'day', 5),
  ('toilet_flush', 'Toilet flush', 'Standard flush (1.6 gal)', 1.6, 0.0, 0.0, 'per_person', 'day', 6),
  ('cooking_meal', 'Cooking a meal', 'Stove/oven use for one meal', 0.5, 0.8, 0.05, 'per_household', 'day', 7),
  -- Electricity-intensive activities
  ('tv_hour', 'TV/entertainment hour', 'One hour of TV/gaming', 0.0, 0.1, 0.0, 'per_household', 'day', 8),
  ('computer_hour', 'Computer hour', 'Desktop/laptop usage', 0.0, 0.15, 0.0, 'per_person', 'day', 9),
  ('lighting_hour', 'Lighting hour', 'Average home lighting', 0.0, 0.06, 0.0, 'per_household', 'day', 10),
  -- Base loads (always-on)
  ('refrigerator', 'Refrigerator', 'Monthly refrigerator consumption', 0.0, 45.0, 0.0, 'per_household', 'month', 11),
  ('water_heater_standby', 'Water heater standby', 'Monthly standby losses', 0.0, 30.0, 3.0, 'per_household', 'month', 12),
  ('hvac_heating', 'HVAC heating', 'Monthly heating (winter avg)', 0.0, 50.0, 30.0, 'per_household', 'month', 13),
  ('hvac_cooling', 'HVAC cooling', 'Monthly cooling (summer avg)', 0.0, 150.0, 0.0, 'per_household', 'month', 14);

-- Enable RLS
ALTER TABLE consumption_factors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read access for consumption_factors" ON consumption_factors FOR SELECT USING (true);

-- ============================================
-- LIFESTYLE MODELS
-- ============================================
-- Stores preset consumption patterns users can choose from

CREATE TABLE IF NOT EXISTS lifestyle_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,                           -- e.g., 'Conservative', 'Moderate', 'High usage'
  description text,
  -- Per-person weekly frequencies (adults)
  showers_per_week numeric DEFAULT 7,           -- times per week
  baths_per_week numeric DEFAULT 0,             -- times per week
  -- Household weekly frequencies
  laundry_loads_per_week numeric DEFAULT 4,     -- loads per week
  dishwasher_loads_per_week numeric DEFAULT 5,  -- loads per week
  hand_wash_dishes_per_day numeric DEFAULT 1,   -- times per day
  -- Per-person daily frequencies
  toilet_flushes_per_day numeric DEFAULT 6,     -- per person per day
  -- Household daily frequencies
  meals_cooked_per_day numeric DEFAULT 2,       -- meals cooked at home
  tv_hours_per_day numeric DEFAULT 3,           -- hours per day
  computer_hours_per_day numeric DEFAULT 2,     -- hours per person per day
  lighting_hours_per_day numeric DEFAULT 6,     -- hours per day
  -- Multipliers for base loads (1.0 = average)
  heating_multiplier numeric DEFAULT 1.0,       -- 0.8 = efficient, 1.2 = inefficient
  cooling_multiplier numeric DEFAULT 1.0,
  -- Metadata
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

COMMENT ON TABLE lifestyle_models IS 'Preset consumption patterns for household resource usage';

-- Insert lifestyle presets
INSERT INTO lifestyle_models (id, name, description, showers_per_week, baths_per_week, laundry_loads_per_week, dishwasher_loads_per_week, hand_wash_dishes_per_day, toilet_flushes_per_day, meals_cooked_per_day, tv_hours_per_day, computer_hours_per_day, lighting_hours_per_day, heating_multiplier, cooling_multiplier, sort_order) VALUES
  ('00000000-0000-0000-0002-000000000001', 'Conservative', 'Eco-conscious, minimal usage',
    5, 0, 2, 3, 0.5, 5, 1.5, 2, 1, 4, 0.8, 0.8, 1),
  ('00000000-0000-0000-0002-000000000002', 'Moderate', 'Typical household usage',
    7, 0.5, 4, 5, 1, 6, 2, 3, 2, 6, 1.0, 1.0, 2),
  ('00000000-0000-0000-0002-000000000003', 'Comfort-focused', 'Higher comfort, more usage',
    10, 1, 6, 7, 1.5, 7, 2.5, 5, 3, 8, 1.2, 1.2, 3),
  ('00000000-0000-0000-0002-000000000004', 'Work from home', 'Higher daytime usage',
    7, 0.5, 5, 6, 1, 6, 2.5, 4, 6, 10, 1.1, 1.1, 4),
  ('00000000-0000-0000-0002-000000000005', 'Family with young children', 'Extra laundry, baths, etc.',
    5, 2, 8, 6, 2, 5, 3, 4, 1, 8, 1.0, 1.0, 5);

-- Enable RLS
ALTER TABLE lifestyle_models ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read access for lifestyle_models" ON lifestyle_models FOR SELECT USING (true);

-- Create index for sorting
CREATE INDEX IF NOT EXISTS idx_lifestyle_models_sort ON lifestyle_models(sort_order);
CREATE INDEX IF NOT EXISTS idx_consumption_factors_sort ON consumption_factors(sort_order);

-- ============================================
-- VIEW: v_lifestyle_models
-- ============================================
CREATE OR REPLACE VIEW v_lifestyle_models AS
SELECT
  id,
  name,
  description,
  showers_per_week,
  baths_per_week,
  laundry_loads_per_week,
  dishwasher_loads_per_week,
  hand_wash_dishes_per_day,
  toilet_flushes_per_day,
  meals_cooked_per_day,
  tv_hours_per_day,
  computer_hours_per_day,
  lighting_hours_per_day,
  heating_multiplier,
  cooling_multiplier,
  sort_order,
  created_at,
  updated_at
FROM lifestyle_models
ORDER BY sort_order;

-- Grant access
GRANT SELECT ON v_lifestyle_models TO anon, authenticated;
GRANT SELECT ON consumption_factors TO anon, authenticated;
