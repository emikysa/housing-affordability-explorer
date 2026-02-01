-- Migration: Add actor_code column to actors table
-- Date: 2026-02-01
-- Purpose: Add short codes for actors similar to other entities (BAR-001, LEV-001, etc.)

-- Add actor_code column
ALTER TABLE actors ADD COLUMN IF NOT EXISTS actor_code VARCHAR(20);

-- Create unique index on actor_code
CREATE UNIQUE INDEX IF NOT EXISTS idx_actors_code ON actors(actor_code) WHERE actor_code IS NOT NULL;

-- Update existing actors with codes based on their current order
-- Using a CTE to assign sequential numbers
WITH numbered_actors AS (
  SELECT
    actor_id,
    ROW_NUMBER() OVER (ORDER BY actor_id) as rn
  FROM actors
)
UPDATE actors a
SET actor_code = 'ACT-' || LPAD(na.rn::text, 2, '0')
FROM numbered_actors na
WHERE a.actor_id = na.actor_id;

-- Add comment
COMMENT ON COLUMN actors.actor_code IS 'Short code identifier for the actor (e.g., ACT-01, ACT-02)';
