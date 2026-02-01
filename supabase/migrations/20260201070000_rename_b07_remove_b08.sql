-- Migration: Rename B07-HardMatl to B07-BuildCost and remove B08-HardLabor
-- Date: 2026-02-01
-- Purpose: Consolidate hard construction cost elements (materials + labor)
-- Status: APPLIED via REST API on 2026-02-01
--
-- Changes made:
-- 1. Created B07-BuildCost with combined estimate ($247,500 = $125,000 materials + $122,500 labor)
-- 2. Updated cro_ce_map references from B07-HardMatl to B07-BuildCost
-- 3. Updated ce_actor_map references from B07-HardMatl to B07-BuildCost
-- 4. Updated ce_drilldown references from B07-HardMatl to B07-BuildCost
-- 5. Deleted B07-HardMatl
-- 6. Deleted B08-HardLabor and all its references
--
-- Note: B08 gap intentionally left for future use

-- ============================================
-- STEP 1: Create new B07-BuildCost (combining materials + labor)
-- ============================================
INSERT INTO cost_elements (
    ce_id, stage_id, description, notes, assumptions,
    estimate, annual_estimate, unit, cadence, is_computed, sort_order
) VALUES (
    'B07-BuildCost',
    'Build',
    'Hard construction - materials and labor',
    'Combines materials and field labor. Some choices increase first cost but reduce operating costs (see CRO-EFFICIENCY, CRO-DURABILITY).',
    'Productivity-sensitive; assumes typical market conditions',
    247500.00,
    NULL,
    '$/home',
    'One-time',
    false,
    8
);

-- ============================================
-- STEP 2: Update references to point to new B07-BuildCost
-- ============================================
UPDATE cro_ce_map SET ce_id = 'B07-BuildCost' WHERE ce_id = 'B07-HardMatl';
UPDATE ce_actor_map SET ce_id = 'B07-BuildCost' WHERE ce_id = 'B07-HardMatl';
UPDATE ce_drilldown SET ce_code = 'B07-BuildCost' WHERE ce_code = 'B07-HardMatl';
UPDATE ce_scenario_values SET ce_id = 'B07-BuildCost' WHERE ce_id = 'B07-HardMatl';

-- ============================================
-- STEP 3: Delete old B07-HardMatl
-- ============================================
DELETE FROM cost_elements WHERE ce_id = 'B07-HardMatl';

-- ============================================
-- STEP 4: Delete B08-HardLabor and all references
-- ============================================
DELETE FROM cro_ce_map WHERE ce_id = 'B08-HardLabor';
DELETE FROM ce_actor_map WHERE ce_id = 'B08-HardLabor';
DELETE FROM ce_drilldown WHERE ce_code = 'B08-HardLabor';
DELETE FROM ce_scenario_values WHERE ce_id = 'B08-HardLabor';
DELETE FROM cost_elements WHERE ce_id = 'B08-HardLabor';

-- ============================================
-- VERIFICATION
-- ============================================
-- Expected result: B07-BuildCost exists, B07-HardMatl and B08-HardLabor do not exist
-- SELECT ce_id, description, estimate FROM cost_elements WHERE ce_id LIKE 'B07%' OR ce_id LIKE 'B08%';
