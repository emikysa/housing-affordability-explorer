-- Migration: Create occupancy_models table
-- Part of Multi-Dimensional Model Architecture - Phase 1

-- Create occupancy_models table
CREATE TABLE IF NOT EXISTS occupancy_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  adults integer NOT NULL DEFAULT 1 CHECK (adults >= 0),
  children integer NOT NULL DEFAULT 0 CHECK (children >= 0),
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Add comment for documentation
COMMENT ON TABLE occupancy_models IS 'Household composition models for consumption calculations';
COMMENT ON COLUMN occupancy_models.adults IS 'Number of adults (18+) in household';
COMMENT ON COLUMN occupancy_models.children IS 'Number of children (<18) in household';

-- Create index for sorting
CREATE INDEX IF NOT EXISTS idx_occupancy_models_sort ON occupancy_models(sort_order);

-- Enable Row Level Security
ALTER TABLE occupancy_models ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access
CREATE POLICY "Public read access for occupancy_models"
  ON occupancy_models
  FOR SELECT
  USING (true);

-- Insert sample data
INSERT INTO occupancy_models (id, name, description, adults, children, sort_order) VALUES
  ('00000000-0000-0000-0001-000000000001', 'Single adult', 'One adult living alone', 1, 0, 1),
  ('00000000-0000-0000-0001-000000000002', 'Couple', 'Two adults, no children', 2, 0, 2),
  ('00000000-0000-0000-0001-000000000003', 'Couple + 1 child', 'Two adults with one child', 2, 1, 3),
  ('00000000-0000-0000-0001-000000000004', 'Couple + 2 children', 'Two adults with two children', 2, 2, 4),
  ('00000000-0000-0000-0001-000000000005', 'Couple + 3 children', 'Two adults with three children', 2, 3, 5),
  ('00000000-0000-0000-0001-000000000006', 'Single parent + 1 child', 'One adult with one child', 1, 1, 6),
  ('00000000-0000-0000-0001-000000000007', 'Single parent + 2 children', 'One adult with two children', 1, 2, 7),
  ('00000000-0000-0000-0001-000000000008', 'Multi-generational (4 adults)', 'Four adults (e.g., parents + grandparents)', 4, 0, 8),
  ('00000000-0000-0000-0001-000000000009', 'Multi-generational (4 adults + 2 children)', 'Extended family household', 4, 2, 9),
  ('00000000-0000-0000-0001-000000000010', 'Roommates (3 adults)', 'Three unrelated adults sharing housing', 3, 0, 10);

-- Create view with total_occupants computed column
CREATE OR REPLACE VIEW v_occupancy_models AS
SELECT
  id,
  name,
  description,
  adults,
  children,
  (adults + children) as total_occupants,
  sort_order,
  created_at,
  updated_at
FROM occupancy_models
ORDER BY sort_order;

-- Grant access to view
GRANT SELECT ON v_occupancy_models TO anon, authenticated;
