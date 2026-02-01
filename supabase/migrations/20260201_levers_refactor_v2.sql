-- Migration: Create levers table and barrier_lever_map junction table
-- Date: 2026-02-01 (v2 - fixed ambiguous column references)
-- Purpose: Separate levers as first-class entities with many-to-many relationship to barriers

-- ============================================
-- 1. CREATE LEVERS TABLE
-- ============================================
-- Levers are specific interventions/actions that can address one or more barriers
-- lever_type_id references the existing lever_types lookup table (categories)

CREATE TABLE IF NOT EXISTS levers (
    lever_id VARCHAR(50) PRIMARY KEY,
    lever_type_id VARCHAR(50) REFERENCES lever_types(lever_id),
    name VARCHAR(200) NOT NULL,
    description TEXT,
    implementation_approach TEXT,
    typical_actors TEXT,
    typical_timeline VARCHAR(50),
    feasibility_notes TEXT,
    sort_order INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policy for public read access
ALTER TABLE levers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access on levers" ON levers
    FOR SELECT USING (true);

-- ============================================
-- 2. CREATE BARRIER_LEVER_MAP JUNCTION TABLE
-- ============================================
-- Many-to-many relationship: one lever can address multiple barriers,
-- one barrier can be addressed by multiple levers

CREATE TABLE IF NOT EXISTS barrier_lever_map (
    barrier_id VARCHAR(100) REFERENCES barriers(barrier_id) ON DELETE CASCADE,
    lever_id VARCHAR(50) REFERENCES levers(lever_id) ON DELETE CASCADE,
    relationship_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (barrier_id, lever_id)
);

-- Add RLS policy for public read access
ALTER TABLE barrier_lever_map ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access on barrier_lever_map" ON barrier_lever_map
    FOR SELECT USING (true);

-- ============================================
-- 3. CREATE INITIAL LEVERS FROM EXISTING DATA
-- ============================================
-- Create one lever per unique lever_type from barriers
-- Using explicit table aliases to avoid ambiguity

INSERT INTO levers (lever_id, lever_type_id, name, description, sort_order)
SELECT DISTINCT
    CONCAT('LEV-', UPPER(REPLACE(REPLACE(b.lever_id, ' ', '_'), '/', '_'))) as lever_id,
    b.lever_id as lever_type_id,
    CONCAT(b.lever_id, ' initiatives') as name,
    lt.description as description,
    ROW_NUMBER() OVER (ORDER BY b.lever_id) as sort_order
FROM barriers b
JOIN lever_types lt ON b.lever_id = lt.lever_id
WHERE b.lever_id IS NOT NULL
ON CONFLICT (lever_id) DO NOTHING;

-- ============================================
-- 4. POPULATE BARRIER_LEVER_MAP FROM EXISTING DATA
-- ============================================
-- Map each barrier to its corresponding lever based on the old lever_id column

INSERT INTO barrier_lever_map (barrier_id, lever_id)
SELECT DISTINCT
    b.barrier_id,
    CONCAT('LEV-', UPPER(REPLACE(REPLACE(b.lever_id, ' ', '_'), '/', '_'))) as lever_id
FROM barriers b
WHERE b.lever_id IS NOT NULL
ON CONFLICT (barrier_id, lever_id) DO NOTHING;

-- ============================================
-- 5. CREATE VIEW FOR EASY QUERYING
-- ============================================

CREATE OR REPLACE VIEW v_levers AS
SELECT
    l.lever_id,
    l.lever_type_id,
    lt.description as lever_type_description,
    l.name,
    l.description,
    l.implementation_approach,
    l.typical_actors,
    l.typical_timeline,
    l.feasibility_notes,
    l.sort_order,
    (SELECT COUNT(*) FROM barrier_lever_map blm WHERE blm.lever_id = l.lever_id) as barrier_count
FROM levers l
LEFT JOIN lever_types lt ON l.lever_type_id = lt.lever_id
ORDER BY l.sort_order, l.lever_id;

-- ============================================
-- 6. CREATE VIEW FOR BARRIERS WITH LEVERS
-- ============================================

CREATE OR REPLACE VIEW v_barrier_levers AS
SELECT
    blm.barrier_id,
    b.short_name as barrier_short_name,
    b.description as barrier_description,
    blm.lever_id,
    l.name as lever_name,
    l.lever_type_id,
    lt.description as lever_type_description,
    blm.relationship_notes
FROM barrier_lever_map blm
JOIN barriers b ON blm.barrier_id = b.barrier_id
JOIN levers l ON blm.lever_id = l.lever_id
LEFT JOIN lever_types lt ON l.lever_type_id = lt.lever_id
ORDER BY blm.barrier_id, l.lever_id;

-- Grant select on new views
GRANT SELECT ON v_levers TO anon, authenticated;
GRANT SELECT ON v_barrier_levers TO anon, authenticated;

-- ============================================
-- NOTE: The old barriers.lever_id column is preserved for now
-- It can be dropped in a future migration once the new structure is verified
-- ============================================
