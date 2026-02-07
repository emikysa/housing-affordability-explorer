-- Allow level 6 in cost_elements_unified table
-- The original constraint limited levels to 1-5, but some items need 6 levels

-- Drop the existing check constraint
ALTER TABLE cost_elements_unified DROP CONSTRAINT IF EXISTS cost_elements_unified_level_check;

-- Add new constraint allowing levels 1-6
ALTER TABLE cost_elements_unified ADD CONSTRAINT cost_elements_unified_level_check CHECK (level >= 1 AND level <= 6);

COMMENT ON CONSTRAINT cost_elements_unified_level_check ON cost_elements_unified IS 'Allow hierarchy levels 1 through 6';
