-- Migration: Create barrier_cro_map junction table for many-to-many relationship
-- Date: 2026-02-01
-- Purpose: Allow barriers to be linked to multiple CROs and vice versa

-- ============================================
-- 1. CREATE JUNCTION TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS barrier_cro_map (
    id SERIAL PRIMARY KEY,
    barrier_id VARCHAR(100) NOT NULL REFERENCES barriers(barrier_id) ON DELETE CASCADE,
    cro_id VARCHAR(50) NOT NULL REFERENCES cost_reduction_opportunities(cro_id) ON DELETE CASCADE,
    relationship_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(barrier_id, cro_id)
);

-- Create indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_barrier_cro_map_barrier ON barrier_cro_map(barrier_id);
CREATE INDEX IF NOT EXISTS idx_barrier_cro_map_cro ON barrier_cro_map(cro_id);

-- Enable RLS
ALTER TABLE barrier_cro_map ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access
DROP POLICY IF EXISTS "Allow public read access on barrier_cro_map" ON barrier_cro_map;
CREATE POLICY "Allow public read access on barrier_cro_map" ON barrier_cro_map
    FOR SELECT USING (true);

-- ============================================
-- 2. MIGRATE EXISTING DATA
-- ============================================
-- Copy existing barrier -> cro_id relationships to the junction table
INSERT INTO barrier_cro_map (barrier_id, cro_id)
SELECT barrier_id, cro_id
FROM barriers
WHERE cro_id IS NOT NULL
ON CONFLICT (barrier_id, cro_id) DO NOTHING;

-- ============================================
-- 3. CREATE VIEW FOR EASY QUERYING
-- ============================================
CREATE OR REPLACE VIEW v_barrier_cros AS
SELECT
    bcm.id,
    bcm.barrier_id,
    b.short_name as barrier_short_name,
    b.description as barrier_description,
    bcm.cro_id,
    cro.description as cro_description,
    bcm.relationship_notes,
    bcm.created_at
FROM barrier_cro_map bcm
JOIN barriers b ON bcm.barrier_id = b.barrier_id
JOIN cost_reduction_opportunities cro ON bcm.cro_id = cro.cro_id;

-- ============================================
-- 4. UPDATE V_BARRIERS VIEW
-- ============================================
-- Add cro_count to v_barriers view and include description fields
DROP VIEW IF EXISTS v_barriers CASCADE;
CREATE VIEW v_barriers AS
SELECT
    b.barrier_id,
    b.cro_id,  -- Keep for backwards compatibility
    b.description,
    b.short_name,
    bt.type_id as barrier_type,
    bt.description as barrier_type_description,
    bs.scope_id as barrier_scope,
    bs.description as barrier_scope_description,
    b.pattern_id,
    b.effect_mechanism,
    b.lever_id,
    lt.lever_id as lever_type,
    lt.description as lever_type_description,
    b.authority,
    fh.horizon_id as feasibility_horizon,
    fh.description as feasibility_horizon_description,
    b.actor_scope,
    cro.description as cro_description,
    (SELECT COUNT(*) FROM barrier_cro_map bcm WHERE bcm.barrier_id = b.barrier_id) as cro_count
FROM barriers b
LEFT JOIN barrier_types bt ON b.type_id = bt.type_id
LEFT JOIN barrier_scopes bs ON b.scope_id = bs.scope_id
LEFT JOIN feasibility_horizons fh ON b.horizon_id = fh.horizon_id
LEFT JOIN lever_types lt ON b.lever_id = lt.lever_id
LEFT JOIN cost_reduction_opportunities cro ON b.cro_id = cro.cro_id;

-- Note: We're keeping the cro_id column in barriers table for backwards compatibility
-- New relationships should be added via barrier_cro_map
-- In future, the cro_id column could be deprecated

COMMENT ON TABLE barrier_cro_map IS 'Junction table for many-to-many relationship between barriers and CROs';
COMMENT ON COLUMN barriers.cro_id IS 'DEPRECATED: Use barrier_cro_map for new relationships. Kept for backwards compatibility.';
