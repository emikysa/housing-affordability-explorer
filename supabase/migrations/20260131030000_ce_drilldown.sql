-- ============================================
-- CE Drilldown Hierarchy Table
-- Stores the cost element breakdown hierarchy
-- from the Housing-Affordability-Framework-CostElement-drilldown.xlsx
-- ============================================

-- Create the ce_drilldown table
CREATE TABLE IF NOT EXISTS ce_drilldown (
    id SERIAL PRIMARY KEY,
    ce_code VARCHAR(30) NOT NULL REFERENCES cost_elements(ce_id) ON DELETE CASCADE,
    level1_name VARCHAR(200) NOT NULL,
    level2_name VARCHAR(200) NOT NULL,
    level3_name VARCHAR(200),
    level4_name VARCHAR(200),
    cost_component VARCHAR(50) NOT NULL DEFAULT 'Total',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for faster filtering
CREATE INDEX IF NOT EXISTS idx_ce_drilldown_ce_code ON ce_drilldown(ce_code);
CREATE INDEX IF NOT EXISTS idx_ce_drilldown_level1 ON ce_drilldown(level1_name);
CREATE INDEX IF NOT EXISTS idx_ce_drilldown_level2 ON ce_drilldown(level2_name);
CREATE INDEX IF NOT EXISTS idx_ce_drilldown_level3 ON ce_drilldown(level3_name);
CREATE INDEX IF NOT EXISTS idx_ce_drilldown_level4 ON ce_drilldown(level4_name);

-- Enable RLS
ALTER TABLE ce_drilldown ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access
CREATE POLICY "Public read access" ON ce_drilldown FOR SELECT USING (true);

-- Grant access to anonymous and authenticated users
GRANT SELECT ON ce_drilldown TO anon, authenticated;

-- Create a view for distinct hierarchy levels (useful for dropdowns)
CREATE OR REPLACE VIEW v_ce_drilldown_hierarchy AS
SELECT DISTINCT
    ce_code,
    level1_name,
    level2_name,
    level3_name,
    level4_name,
    cost_component
FROM ce_drilldown
ORDER BY ce_code, level1_name, level2_name, level3_name, level4_name;

-- Grant access to the view
GRANT SELECT ON v_ce_drilldown_hierarchy TO anon, authenticated;
