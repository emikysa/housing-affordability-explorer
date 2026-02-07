-- Create new unified cost_elements table
CREATE TABLE IF NOT EXISTS cost_elements_unified (
    ce_id VARCHAR(30) PRIMARY KEY,
    parent_id VARCHAR(30),
    level INTEGER NOT NULL CHECK (level BETWEEN 1 AND 5),
    short_name VARCHAR(100) NOT NULL,
    description TEXT,
    stage_id VARCHAR(20),
    sort_order INTEGER,
    estimate NUMERIC(15,2),
    annual_estimate NUMERIC(15,2),
    unit VARCHAR(30),
    cadence VARCHAR(20),
    notes TEXT,
    assumptions TEXT,
    is_computed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_ce_unified_parent ON cost_elements_unified(parent_id);
CREATE INDEX IF NOT EXISTS idx_ce_unified_level ON cost_elements_unified(level);
CREATE INDEX IF NOT EXISTS idx_ce_unified_stage ON cost_elements_unified(stage_id);

-- Enable RLS
ALTER TABLE cost_elements_unified ENABLE ROW LEVEL SECURITY;

-- Create policy for public read
DROP POLICY IF EXISTS "Public read access" ON cost_elements_unified;
CREATE POLICY "Public read access" ON cost_elements_unified FOR SELECT USING (true);

-- Grant access
GRANT SELECT ON cost_elements_unified TO anon, authenticated;

-- Add FK constraint after table exists (self-referential)
ALTER TABLE cost_elements_unified
ADD CONSTRAINT fk_ce_unified_parent
FOREIGN KEY (parent_id) REFERENCES cost_elements_unified(ce_id);
