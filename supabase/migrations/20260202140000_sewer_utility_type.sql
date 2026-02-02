-- Migration: Add sewer as utility type
-- Part of Multi-Dimensional Model Architecture - Phase 6a

-- ============================================
-- ALTER UTILITY TYPE CONSTRAINT
-- ============================================
-- Add 'sewer' to the allowed utility types

-- Drop the existing constraint
ALTER TABLE utility_models DROP CONSTRAINT IF EXISTS utility_models_utility_type_check;

-- Add the new constraint including 'sewer'
ALTER TABLE utility_models ADD CONSTRAINT utility_models_utility_type_check
  CHECK (utility_type IN ('water', 'electric', 'gas', 'sewer'));

-- Update table comment
COMMENT ON TABLE utility_models IS 'Utility rate structures for water, electric, gas, and sewer providers';

-- ============================================
-- SEED DATA: Sewer Utilities
-- ============================================

-- SEWER UTILITIES
INSERT INTO utility_models (id, utility_type, provider_name, provider_code, description, service_area, base_monthly_fee, rate_tiers, unit_name, unit_display, effective_date, notes, sort_order) VALUES
  ('00000000-0000-0000-0003-000000000031', 'sewer', 'Fort Collins Utilities - Sewer', 'FCU-S',
   'City of Fort Collins municipal sewer service',
   'Fort Collins, CO',
   15.00,
   '[{"max_units": 7000, "rate": 0.0055}, {"max_units": 13000, "rate": 0.0065}, {"max_units": null, "rate": 0.0075}]',
   'gallons', 'per gallon',
   '2026-01-01',
   'Based on winter water usage average. Residential sewer charges typically based on water consumption.',
   31),

  ('00000000-0000-0000-0003-000000000032', 'sewer', 'South Fort Collins Sanitation District', 'SFCSD',
   'Sanitation district serving south Fort Collins area',
   'South Fort Collins',
   18.50,
   '[{"max_units": 6000, "rate": 0.0060}, {"max_units": 12000, "rate": 0.0070}, {"max_units": null, "rate": 0.0080}]',
   'gallons', 'per gallon',
   '2026-01-01',
   'Based on winter water usage average.',
   32),

  ('00000000-0000-0000-0003-000000000033', 'sewer', 'Boxelder Sanitation District', 'BOXELDER',
   'Serves Boxelder area and portions of north Fort Collins',
   'Boxelder / North Fort Collins',
   20.00,
   '[{"max_units": 5000, "rate": 0.0058}, {"max_units": 10000, "rate": 0.0068}, {"max_units": null, "rate": 0.0078}]',
   'gallons', 'per gallon',
   '2026-01-01',
   'Based on winter water usage average.',
   33),

  ('00000000-0000-0000-0003-000000000034', 'sewer', 'Septic System', 'SEPTIC',
   'Private septic system - periodic pumping required',
   'Rural / unserved areas',
   0,
   '[]',
   'gallons', 'per gallon',
   '2026-01-01',
   'No monthly utility fee. Requires pump-out every 3-5 years (~$350-$500). Annual cost equivalent ~$100-$150/year or ~$8-$12/month amortized.',
   99);

-- ============================================
-- VIEW FOR SEWER UTILITIES
-- ============================================

CREATE OR REPLACE VIEW v_sewer_utility_models AS
SELECT * FROM v_utility_models WHERE utility_type = 'sewer';

-- Grant access
GRANT SELECT ON v_sewer_utility_models TO anon, authenticated;
