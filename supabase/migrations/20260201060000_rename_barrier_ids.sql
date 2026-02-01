-- Migration: Remove CRO portion from barrier IDs
-- Date: 2026-02-01
-- Purpose: Rename barrier IDs from BAR-{CRO_NAME}-{SPECIFIC} to BAR-{SPECIFIC}
--          since barriers now have many-to-many relationship with CROs

-- ============================================
-- 1. CREATE MAPPING TABLE FOR ID CHANGES
-- ============================================
CREATE TEMP TABLE barrier_id_map (
    old_id VARCHAR(100) PRIMARY KEY,
    new_id VARCHAR(100) NOT NULL
);

-- Insert all mappings (extracting the specific name after the second hyphen)
INSERT INTO barrier_id_map (old_id, new_id)
SELECT
    barrier_id as old_id,
    'BAR-' || SPLIT_PART(barrier_id, '-', 3) as new_id
FROM barriers
WHERE barrier_id LIKE 'BAR-%-_%';

-- ============================================
-- 2. TEMPORARILY DISABLE FOREIGN KEY CHECKS
-- ============================================
-- Drop foreign key constraints from all child tables
ALTER TABLE barrier_lever_map DROP CONSTRAINT IF EXISTS barrier_lever_map_barrier_id_fkey;
ALTER TABLE barrier_cro_map DROP CONSTRAINT IF EXISTS barrier_cro_map_barrier_id_fkey;
ALTER TABLE barrier_authority_map DROP CONSTRAINT IF EXISTS barrier_authority_map_barrier_id_fkey;

-- ============================================
-- 3. UPDATE BARRIER IDs IN ALL TABLES
-- ============================================

-- Update barrier_lever_map (child table)
UPDATE barrier_lever_map blm
SET barrier_id = m.new_id
FROM barrier_id_map m
WHERE blm.barrier_id = m.old_id;

-- Update barrier_cro_map (child table)
UPDATE barrier_cro_map bcm
SET barrier_id = m.new_id
FROM barrier_id_map m
WHERE bcm.barrier_id = m.old_id;

-- Update barrier_authority_map (child table)
UPDATE barrier_authority_map bam
SET barrier_id = m.new_id
FROM barrier_id_map m
WHERE bam.barrier_id = m.old_id;

-- Update barriers table (parent table) - must be last
UPDATE barriers b
SET barrier_id = m.new_id
FROM barrier_id_map m
WHERE b.barrier_id = m.old_id;

-- ============================================
-- 4. RE-ADD FOREIGN KEY CONSTRAINTS
-- ============================================
ALTER TABLE barrier_lever_map
ADD CONSTRAINT barrier_lever_map_barrier_id_fkey
FOREIGN KEY (barrier_id) REFERENCES barriers(barrier_id) ON DELETE CASCADE;

ALTER TABLE barrier_cro_map
ADD CONSTRAINT barrier_cro_map_barrier_id_fkey
FOREIGN KEY (barrier_id) REFERENCES barriers(barrier_id) ON DELETE CASCADE;

ALTER TABLE barrier_authority_map
ADD CONSTRAINT barrier_authority_map_barrier_id_fkey
FOREIGN KEY (barrier_id) REFERENCES barriers(barrier_id) ON DELETE CASCADE;

-- ============================================
-- 5. VERIFY CHANGES
-- ============================================
-- This will error if any old-style IDs remain
DO $$
DECLARE
    old_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO old_count FROM barriers WHERE barrier_id LIKE 'BAR-%-%-_%';
    IF old_count > 0 THEN
        RAISE EXCEPTION 'Migration incomplete: % barriers still have old-style IDs', old_count;
    END IF;
END $$;

-- Clean up
DROP TABLE barrier_id_map;

-- Add comment
COMMENT ON COLUMN barriers.barrier_id IS 'Barrier identifier in format BAR-{NAME}, e.g., BAR-LONG_TIMELINES';
