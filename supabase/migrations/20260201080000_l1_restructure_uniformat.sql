-- ============================================
-- Migration: L1 Cost Element Restructure + UniFormat II Alignment
-- Date: 2026-02-01
-- Purpose:
--   1. Remove a/b suffixes from L1 codes
--   2. Remove B03-LandCarry as L1 (migrate content)
--   3. Renumber B-codes cleanly B01-B13
--   4. Rename B13-Contingtic to B12-Contingency
--   5. Add UniFormat II level 2 structure to ce_drilldown for B07-BuildCost
--   6. Add cost_composition tag field to ce_drilldown
-- ============================================

-- ============================================
-- STEP 0: Create backward compatibility alias table
-- ============================================
CREATE TABLE IF NOT EXISTS ce_code_alias (
    id SERIAL PRIMARY KEY,
    old_code VARCHAR(30) NOT NULL UNIQUE,
    new_code VARCHAR(30) NOT NULL,
    migration_date DATE DEFAULT CURRENT_DATE,
    notes TEXT
);

-- Enable RLS and grant access
ALTER TABLE ce_code_alias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read access" ON ce_code_alias FOR SELECT USING (true);
GRANT SELECT ON ce_code_alias TO anon, authenticated;

-- ============================================
-- STEP 1: Add cost_composition column to ce_drilldown
-- (for tagging material/labor/sub_op breakdown)
-- ============================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'ce_drilldown' AND column_name = 'cost_composition'
    ) THEN
        ALTER TABLE ce_drilldown ADD COLUMN cost_composition VARCHAR(20) DEFAULT 'mixed';
    END IF;
END $$;

-- Add check constraint for cost_composition values
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.constraint_column_usage
        WHERE table_name = 'ce_drilldown' AND constraint_name = 'chk_cost_composition'
    ) THEN
        ALTER TABLE ce_drilldown ADD CONSTRAINT chk_cost_composition
        CHECK (cost_composition IN ('mixed', 'material', 'labor', 'sub_op'));
    END IF;
EXCEPTION WHEN duplicate_object THEN
    NULL;
END $$;

-- ============================================
-- STEP 2: Add level5_name column to ce_drilldown (extending from 4 to 5 levels)
-- ============================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'ce_drilldown' AND column_name = 'level5_name'
    ) THEN
        ALTER TABLE ce_drilldown ADD COLUMN level5_name VARCHAR(200);
    END IF;
END $$;

-- Create index for level5
CREATE INDEX IF NOT EXISTS idx_ce_drilldown_level5 ON ce_drilldown(level5_name);

-- ============================================
-- STEP 3: Add uniformat_code column to ce_drilldown
-- (for UniFormat II system code reference)
-- ============================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'ce_drilldown' AND column_name = 'uniformat_code'
    ) THEN
        ALTER TABLE ce_drilldown ADD COLUMN uniformat_code VARCHAR(20);
    END IF;
END $$;

-- ============================================
-- STEP 4: Add sort_order column to ce_drilldown
-- ============================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'ce_drilldown' AND column_name = 'sort_order'
    ) THEN
        ALTER TABLE ce_drilldown ADD COLUMN sort_order INTEGER;
    END IF;
END $$;

-- ============================================
-- STEP 5: L1 Cost Element Renumbering
-- Order of operations matters due to FK constraints
-- We must update in a specific order to avoid conflicts
-- ============================================

-- 5a. Record old->new mappings in alias table BEFORE making changes
INSERT INTO ce_code_alias (old_code, new_code, notes) VALUES
    ('B03-LandCarry', 'B10-Finance', 'LandCarry concept merged into Finance. Holding costs = financing during predevelopment.'),
    ('B04a-PermitsAdmin', 'B03-Permits', 'Renumbered; dropped a suffix'),
    ('B04b-UtilityFees', 'B04-Utilities', 'Renumbered; dropped b suffix'),
    ('B09-TempIndirect', 'B08-TempIndirect', 'Renumbered to fill B08 gap'),
    ('B10-RiskIns', 'B09-RiskIns', 'Renumbered'),
    ('B11-Finance', 'B10-Finance', 'Renumbered'),
    ('B12-Overhead', 'B11-Overhead', 'Renumbered'),
    ('B13-Contingtic', 'B12-Contingency', 'Renumbered and renamed'),
    ('B14-Return', 'B13-Return', 'Renumbered')
ON CONFLICT (old_code) DO NOTHING;

-- 5b. Create temporary placeholder CEs to avoid FK conflicts during rename
-- We'll use these to chain the renames without breaking constraints

-- First, handle B03-LandCarry -> merge into B11-Finance (which becomes B10-Finance)
-- Strategy: Don't create a new CE, just migrate its drilldown data and delete it

-- 5c. Migrate B03-LandCarry drilldown data to B11-Finance (current name, will become B10-Finance)
-- Update ce_code reference for any LandCarry drilldown rows
UPDATE ce_drilldown
SET ce_code = 'B11-Finance',
    level1_name = COALESCE(level1_name, 'Land Carrying Costs (Migrated)')
WHERE ce_code = 'B03-LandCarry';

-- Migrate cro_ce_map references from LandCarry to Finance
UPDATE cro_ce_map SET ce_id = 'B11-Finance' WHERE ce_id = 'B03-LandCarry';

-- Migrate ce_actor_map references from LandCarry to Finance
UPDATE ce_actor_map SET ce_id = 'B11-Finance' WHERE ce_id = 'B03-LandCarry';

-- Migrate ce_scenario_values references from LandCarry to Finance
UPDATE ce_scenario_values SET ce_id = 'B11-Finance' WHERE ce_id = 'B03-LandCarry';

-- Now delete B03-LandCarry
DELETE FROM cost_elements WHERE ce_id = 'B03-LandCarry';

-- 5d. Rename L1 CEs in reverse order (highest to lowest) to avoid conflicts
-- We need temporary names to avoid duplicate key errors

-- B14-Return -> temp_B14
UPDATE cost_elements SET ce_id = 'temp_B14' WHERE ce_id = 'B14-Return';
UPDATE cro_ce_map SET ce_id = 'temp_B14' WHERE ce_id = 'B14-Return';
UPDATE ce_actor_map SET ce_id = 'temp_B14' WHERE ce_id = 'B14-Return';
UPDATE ce_drilldown SET ce_code = 'temp_B14' WHERE ce_code = 'B14-Return';
UPDATE ce_scenario_values SET ce_id = 'temp_B14' WHERE ce_id = 'B14-Return';

-- B13-Contingtic -> temp_B13
UPDATE cost_elements SET ce_id = 'temp_B13' WHERE ce_id = 'B13-Contingtic';
UPDATE cro_ce_map SET ce_id = 'temp_B13' WHERE ce_id = 'B13-Contingtic';
UPDATE ce_actor_map SET ce_id = 'temp_B13' WHERE ce_id = 'B13-Contingtic';
UPDATE ce_drilldown SET ce_code = 'temp_B13' WHERE ce_code = 'B13-Contingtic';
UPDATE ce_scenario_values SET ce_id = 'temp_B13' WHERE ce_id = 'B13-Contingtic';

-- B12-Overhead -> temp_B12
UPDATE cost_elements SET ce_id = 'temp_B12' WHERE ce_id = 'B12-Overhead';
UPDATE cro_ce_map SET ce_id = 'temp_B12' WHERE ce_id = 'B12-Overhead';
UPDATE ce_actor_map SET ce_id = 'temp_B12' WHERE ce_id = 'B12-Overhead';
UPDATE ce_drilldown SET ce_code = 'temp_B12' WHERE ce_code = 'B12-Overhead';
UPDATE ce_scenario_values SET ce_id = 'temp_B12' WHERE ce_id = 'B12-Overhead';

-- B11-Finance -> temp_B11
UPDATE cost_elements SET ce_id = 'temp_B11' WHERE ce_id = 'B11-Finance';
UPDATE cro_ce_map SET ce_id = 'temp_B11' WHERE ce_id = 'B11-Finance';
UPDATE ce_actor_map SET ce_id = 'temp_B11' WHERE ce_id = 'B11-Finance';
UPDATE ce_drilldown SET ce_code = 'temp_B11' WHERE ce_code = 'B11-Finance';
UPDATE ce_scenario_values SET ce_id = 'temp_B11' WHERE ce_id = 'B11-Finance';

-- B10-RiskIns -> temp_B10
UPDATE cost_elements SET ce_id = 'temp_B10' WHERE ce_id = 'B10-RiskIns';
UPDATE cro_ce_map SET ce_id = 'temp_B10' WHERE ce_id = 'B10-RiskIns';
UPDATE ce_actor_map SET ce_id = 'temp_B10' WHERE ce_id = 'B10-RiskIns';
UPDATE ce_drilldown SET ce_code = 'temp_B10' WHERE ce_code = 'B10-RiskIns';
UPDATE ce_scenario_values SET ce_id = 'temp_B10' WHERE ce_id = 'B10-RiskIns';

-- B09-TempIndirect -> temp_B09
UPDATE cost_elements SET ce_id = 'temp_B09' WHERE ce_id = 'B09-TempIndirect';
UPDATE cro_ce_map SET ce_id = 'temp_B09' WHERE ce_id = 'B09-TempIndirect';
UPDATE ce_actor_map SET ce_id = 'temp_B09' WHERE ce_id = 'B09-TempIndirect';
UPDATE ce_drilldown SET ce_code = 'temp_B09' WHERE ce_code = 'B09-TempIndirect';
UPDATE ce_scenario_values SET ce_id = 'temp_B09' WHERE ce_id = 'B09-TempIndirect';

-- B04b-UtilityFees -> temp_B04b
UPDATE cost_elements SET ce_id = 'temp_B04b' WHERE ce_id = 'B04b-UtilityFees';
UPDATE cro_ce_map SET ce_id = 'temp_B04b' WHERE ce_id = 'B04b-UtilityFees';
UPDATE ce_actor_map SET ce_id = 'temp_B04b' WHERE ce_id = 'B04b-UtilityFees';
UPDATE ce_drilldown SET ce_code = 'temp_B04b' WHERE ce_code = 'B04b-UtilityFees';
UPDATE ce_scenario_values SET ce_id = 'temp_B04b' WHERE ce_id = 'B04b-UtilityFees';

-- B04a-PermitsAdmin -> temp_B04a
UPDATE cost_elements SET ce_id = 'temp_B04a' WHERE ce_id = 'B04a-PermitsAdmin';
UPDATE cro_ce_map SET ce_id = 'temp_B04a' WHERE ce_id = 'B04a-PermitsAdmin';
UPDATE ce_actor_map SET ce_id = 'temp_B04a' WHERE ce_id = 'B04a-PermitsAdmin';
UPDATE ce_drilldown SET ce_code = 'temp_B04a' WHERE ce_code = 'B04a-PermitsAdmin';
UPDATE ce_scenario_values SET ce_id = 'temp_B04a' WHERE ce_id = 'B04a-PermitsAdmin';

-- 5e. Now assign final codes (no conflicts since all problematic ones are in temp_)

-- temp_B04a -> B03-Permits
UPDATE cost_elements
SET ce_id = 'B03-Permits',
    description = 'Permits, plan review, and administrative fees'
WHERE ce_id = 'temp_B04a';
UPDATE cro_ce_map SET ce_id = 'B03-Permits' WHERE ce_id = 'temp_B04a';
UPDATE ce_actor_map SET ce_id = 'B03-Permits' WHERE ce_id = 'temp_B04a';
UPDATE ce_drilldown SET ce_code = 'B03-Permits' WHERE ce_code = 'temp_B04a';
UPDATE ce_scenario_values SET ce_id = 'B03-Permits' WHERE ce_id = 'temp_B04a';

-- temp_B04b -> B04-Utilities
UPDATE cost_elements
SET ce_id = 'B04-Utilities',
    description = 'Utility connection, tap, and capacity fees'
WHERE ce_id = 'temp_B04b';
UPDATE cro_ce_map SET ce_id = 'B04-Utilities' WHERE ce_id = 'temp_B04b';
UPDATE ce_actor_map SET ce_id = 'B04-Utilities' WHERE ce_id = 'temp_B04b';
UPDATE ce_drilldown SET ce_code = 'B04-Utilities' WHERE ce_code = 'temp_B04b';
UPDATE ce_scenario_values SET ce_id = 'B04-Utilities' WHERE ce_id = 'temp_B04b';

-- temp_B09 -> B08-TempIndirect
UPDATE cost_elements
SET ce_id = 'B08-TempIndirect',
    description = 'Temporary, indirect, and jobsite costs'
WHERE ce_id = 'temp_B09';
UPDATE cro_ce_map SET ce_id = 'B08-TempIndirect' WHERE ce_id = 'temp_B09';
UPDATE ce_actor_map SET ce_id = 'B08-TempIndirect' WHERE ce_id = 'temp_B09';
UPDATE ce_drilldown SET ce_code = 'B08-TempIndirect' WHERE ce_code = 'temp_B09';
UPDATE ce_scenario_values SET ce_id = 'B08-TempIndirect' WHERE ce_id = 'temp_B09';

-- temp_B10 -> B09-RiskIns
UPDATE cost_elements
SET ce_id = 'B09-RiskIns',
    description = 'Construction insurance, bonding, and third-party risk'
WHERE ce_id = 'temp_B10';
UPDATE cro_ce_map SET ce_id = 'B09-RiskIns' WHERE ce_id = 'temp_B10';
UPDATE ce_actor_map SET ce_id = 'B09-RiskIns' WHERE ce_id = 'temp_B10';
UPDATE ce_drilldown SET ce_code = 'B09-RiskIns' WHERE ce_code = 'temp_B10';
UPDATE ce_scenario_values SET ce_id = 'B09-RiskIns' WHERE ce_id = 'temp_B10';

-- temp_B11 -> B10-Finance
UPDATE cost_elements
SET ce_id = 'B10-Finance',
    description = 'Development financing & capital costs'
WHERE ce_id = 'temp_B11';
UPDATE cro_ce_map SET ce_id = 'B10-Finance' WHERE ce_id = 'temp_B11';
UPDATE ce_actor_map SET ce_id = 'B10-Finance' WHERE ce_id = 'temp_B11';
UPDATE ce_drilldown SET ce_code = 'B10-Finance' WHERE ce_code = 'temp_B11';
UPDATE ce_scenario_values SET ce_id = 'B10-Finance' WHERE ce_id = 'temp_B11';

-- temp_B12 -> B11-Overhead
UPDATE cost_elements
SET ce_id = 'B11-Overhead',
    description = 'Developer overhead, sales, and marketing'
WHERE ce_id = 'temp_B12';
UPDATE cro_ce_map SET ce_id = 'B11-Overhead' WHERE ce_id = 'temp_B12';
UPDATE ce_actor_map SET ce_id = 'B11-Overhead' WHERE ce_id = 'temp_B12';
UPDATE ce_drilldown SET ce_code = 'B11-Overhead' WHERE ce_code = 'temp_B12';
UPDATE ce_scenario_values SET ce_id = 'B11-Overhead' WHERE ce_id = 'temp_B12';

-- temp_B13 -> B12-Contingency (rename from Contingtic)
UPDATE cost_elements
SET ce_id = 'B12-Contingency',
    description = 'Risk, uncertainty, and legal contingency'
WHERE ce_id = 'temp_B13';
UPDATE cro_ce_map SET ce_id = 'B12-Contingency' WHERE ce_id = 'temp_B13';
UPDATE ce_actor_map SET ce_id = 'B12-Contingency' WHERE ce_id = 'temp_B13';
UPDATE ce_drilldown SET ce_code = 'B12-Contingency' WHERE ce_code = 'temp_B13';
UPDATE ce_scenario_values SET ce_id = 'B12-Contingency' WHERE ce_id = 'temp_B13';

-- temp_B14 -> B13-Return
UPDATE cost_elements
SET ce_id = 'B13-Return',
    description = 'Required developer return'
WHERE ce_id = 'temp_B14';
UPDATE cro_ce_map SET ce_id = 'B13-Return' WHERE ce_id = 'temp_B14';
UPDATE ce_actor_map SET ce_id = 'B13-Return' WHERE ce_id = 'temp_B14';
UPDATE ce_drilldown SET ce_code = 'B13-Return' WHERE ce_code = 'temp_B14';
UPDATE ce_scenario_values SET ce_id = 'B13-Return' WHERE ce_id = 'temp_B14';

-- 5f. Update descriptions for CEs that didn't change codes but need new descriptions
UPDATE cost_elements
SET description = 'Land acquisition & assemblage'
WHERE ce_id = 'B01-Land';

UPDATE cost_elements
SET description = 'Pre-development, entitlement, and approvals'
WHERE ce_id = 'B02-PreDev';

UPDATE cost_elements
SET description = 'Site work & infrastructure construction'
WHERE ce_id = 'B05-SiteInfra';

UPDATE cost_elements
SET description = 'Professional, consulting, and admin soft costs'
WHERE ce_id = 'B06-SoftCosts';

UPDATE cost_elements
SET description = 'Hard construction (materials, labor, subcontractor O&P)'
WHERE ce_id = 'B07-BuildCost';

-- 5g. Update sort_order for all B-codes
UPDATE cost_elements SET sort_order = 1 WHERE ce_id = 'B01-Land';
UPDATE cost_elements SET sort_order = 2 WHERE ce_id = 'B02-PreDev';
UPDATE cost_elements SET sort_order = 3 WHERE ce_id = 'B03-Permits';
UPDATE cost_elements SET sort_order = 4 WHERE ce_id = 'B04-Utilities';
UPDATE cost_elements SET sort_order = 5 WHERE ce_id = 'B05-SiteInfra';
UPDATE cost_elements SET sort_order = 6 WHERE ce_id = 'B06-SoftCosts';
UPDATE cost_elements SET sort_order = 7 WHERE ce_id = 'B07-BuildCost';
UPDATE cost_elements SET sort_order = 8 WHERE ce_id = 'B08-TempIndirect';
UPDATE cost_elements SET sort_order = 9 WHERE ce_id = 'B09-RiskIns';
UPDATE cost_elements SET sort_order = 10 WHERE ce_id = 'B10-Finance';
UPDATE cost_elements SET sort_order = 11 WHERE ce_id = 'B11-Overhead';
UPDATE cost_elements SET sort_order = 12 WHERE ce_id = 'B12-Contingency';
UPDATE cost_elements SET sort_order = 13 WHERE ce_id = 'B13-Return';

-- 5h. Also rename O03-PropInsurance to O03-PropIns for consistency
UPDATE cost_elements
SET ce_id = 'O03-PropIns',
    description = 'Operating property insurance'
WHERE ce_id = 'O03-PropInsurance';
UPDATE cro_ce_map SET ce_id = 'O03-PropIns' WHERE ce_id = 'O03-PropInsurance';
UPDATE ce_actor_map SET ce_id = 'O03-PropIns' WHERE ce_id = 'O03-PropInsurance';
UPDATE ce_drilldown SET ce_code = 'O03-PropIns' WHERE ce_code = 'O03-PropInsurance';
UPDATE ce_scenario_values SET ce_id = 'O03-PropIns' WHERE ce_id = 'O03-PropInsurance';

-- Add to alias table
INSERT INTO ce_code_alias (old_code, new_code, notes) VALUES
    ('O03-PropInsurance', 'O03-PropIns', 'Shortened name for consistency')
ON CONFLICT (old_code) DO NOTHING;

-- ============================================
-- STEP 6: UniFormat II Level 2 Structure for B07-BuildCost
-- Create/Update ce_drilldown entries with UniFormat-like structure
-- ============================================

-- Update existing B07-BuildCost drilldown entries with UniFormat codes where applicable
-- This maps existing Level 1 names to UniFormat categories

-- Substructure (A) - Foundations, basement
UPDATE ce_drilldown
SET uniformat_code = 'A', sort_order = 10
WHERE ce_code = 'B07-BuildCost'
AND (
    lower(level1_name) LIKE '%foundation%'
    OR lower(level1_name) LIKE '%substructure%'
    OR lower(level1_name) LIKE '%basement%'
    OR lower(level1_name) LIKE '%footing%'
    OR lower(level1_name) LIKE '%slab%'
);

-- Shell (B) - Superstructure, exterior enclosure, roofing
UPDATE ce_drilldown
SET uniformat_code = 'B', sort_order = 20
WHERE ce_code = 'B07-BuildCost'
AND (
    lower(level1_name) LIKE '%shell%'
    OR lower(level1_name) LIKE '%superstructure%'
    OR lower(level1_name) LIKE '%framing%'
    OR lower(level1_name) LIKE '%structural%'
    OR lower(level1_name) LIKE '%exterior%'
    OR lower(level1_name) LIKE '%roof%'
    OR lower(level1_name) LIKE '%window%'
    OR lower(level1_name) LIKE '%door%'
    OR lower(level1_name) LIKE '%cladding%'
    OR lower(level1_name) LIKE '%siding%'
    OR lower(level1_name) LIKE '%wall%'
    OR lower(level1_name) LIKE '%insulation%'
);

-- Interiors (C) - Partitions, finishes, casework
UPDATE ce_drilldown
SET uniformat_code = 'C', sort_order = 30
WHERE ce_code = 'B07-BuildCost'
AND (
    lower(level1_name) LIKE '%interior%'
    OR lower(level1_name) LIKE '%partition%'
    OR lower(level1_name) LIKE '%finish%'
    OR lower(level1_name) LIKE '%flooring%'
    OR lower(level1_name) LIKE '%ceiling%'
    OR lower(level1_name) LIKE '%drywall%'
    OR lower(level1_name) LIKE '%paint%'
    OR lower(level1_name) LIKE '%trim%'
    OR lower(level1_name) LIKE '%millwork%'
    OR lower(level1_name) LIKE '%cabinet%'
    OR lower(level1_name) LIKE '%casework%'
    OR lower(level1_name) LIKE '%counter%'
);

-- Services (D) - MEP (Mechanical, Electrical, Plumbing)
UPDATE ce_drilldown
SET uniformat_code = 'D', sort_order = 40
WHERE ce_code = 'B07-BuildCost'
AND (
    lower(level1_name) LIKE '%service%'
    OR lower(level1_name) LIKE '%plumbing%'
    OR lower(level1_name) LIKE '%hvac%'
    OR lower(level1_name) LIKE '%mechanical%'
    OR lower(level1_name) LIKE '%electrical%'
    OR lower(level1_name) LIKE '%fire%'
    OR lower(level1_name) LIKE '%communication%'
    OR lower(level1_name) LIKE '%low voltage%'
    OR lower(level1_name) LIKE '%wiring%'
    OR lower(level1_name) LIKE '%heating%'
    OR lower(level1_name) LIKE '%cooling%'
    OR lower(level1_name) LIKE '%ventilat%'
    OR lower(level1_name) LIKE '%sprinkler%'
);

-- Equipment & Furnishings (E)
UPDATE ce_drilldown
SET uniformat_code = 'E', sort_order = 50
WHERE ce_code = 'B07-BuildCost'
AND (
    lower(level1_name) LIKE '%equipment%'
    OR lower(level1_name) LIKE '%furnish%'
    OR lower(level1_name) LIKE '%appliance%'
    OR lower(level1_name) LIKE '%fixture%'
);

-- Special Construction & Demolition (F)
UPDATE ce_drilldown
SET uniformat_code = 'F', sort_order = 60
WHERE ce_code = 'B07-BuildCost'
AND (
    lower(level1_name) LIKE '%special%'
    OR lower(level1_name) LIKE '%demolition%'
    OR lower(level1_name) LIKE '%hazmat%'
    OR lower(level1_name) LIKE '%abatement%'
);

-- Default: if no UniFormat code assigned, use 'Z' for uncategorized
UPDATE ce_drilldown
SET uniformat_code = 'Z', sort_order = 99
WHERE ce_code = 'B07-BuildCost'
AND uniformat_code IS NULL;

-- ============================================
-- STEP 7: Update v_ce_drilldown_hierarchy view to include new columns
-- ============================================
CREATE OR REPLACE VIEW v_ce_drilldown_hierarchy AS
SELECT DISTINCT
    ce_code,
    level1_name,
    level2_name,
    level3_name,
    level4_name,
    level5_name,
    cost_component,
    cost_composition,
    uniformat_code,
    sort_order
FROM ce_drilldown
ORDER BY ce_code, sort_order, level1_name, level2_name, level3_name, level4_name, level5_name;

-- Grant access to the view
GRANT SELECT ON v_ce_drilldown_hierarchy TO anon, authenticated;

-- ============================================
-- STEP 8: Update the v_cost_elements view (already exists, just refresh)
-- ============================================
CREATE OR REPLACE VIEW v_cost_elements AS
SELECT
    ce.ce_id,
    ce.description,
    ce.notes,
    ce.assumptions,
    ce.estimate,
    ce.annual_estimate,
    ce.unit,
    ce.cadence,
    ce.sort_order,
    s.stage_id,
    s.description AS stage_description
FROM cost_elements ce
LEFT JOIN stages s ON ce.stage_id = s.stage_id
ORDER BY s.sort_order, ce.sort_order;

-- ============================================
-- VERIFICATION QUERIES (run manually to verify)
-- ============================================

-- Check L1 CEs after migration:
-- SELECT ce_id, description, sort_order FROM cost_elements WHERE ce_id LIKE 'B%' ORDER BY sort_order;

-- Check for any a/b suffixes (should return 0):
-- SELECT ce_id FROM cost_elements WHERE ce_id ~ '[ab]-';

-- Check LandCarry is gone:
-- SELECT * FROM cost_elements WHERE ce_id LIKE '%LandCarry%';

-- Check alias table:
-- SELECT * FROM ce_code_alias ORDER BY old_code;

-- Check UniFormat assignments for B07:
-- SELECT uniformat_code, COUNT(*) FROM ce_drilldown WHERE ce_code = 'B07-BuildCost' GROUP BY uniformat_code ORDER BY uniformat_code;

-- Check total count matches expected:
-- SELECT COUNT(*) FROM cost_elements WHERE ce_id LIKE 'B%';  -- Should be 13
-- SELECT COUNT(*) FROM cost_elements WHERE ce_id LIKE 'O%';  -- Should be 5
-- SELECT COUNT(*) FROM cost_elements WHERE ce_id LIKE 'F%';  -- Should be 4
