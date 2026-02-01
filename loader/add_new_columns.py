#!/usr/bin/env python3
"""
Add new database columns and tables via Supabase REST API.
Since we can't run raw DDL via REST, we'll use RPC or manual steps.
"""

import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

def get_client():
    return create_client(SUPABASE_URL, SUPABASE_KEY)

def main():
    print("="*60)
    print("Add ce_code_alias table and ce_drilldown columns")
    print("="*60)

    supabase = get_client()

    # Insert alias mappings - we can't create the table via REST API
    # but we can prepare the data
    alias_mappings = [
        ('B03-LandCarry', 'B10-Finance', 'LandCarry concept merged into Finance'),
        ('B04a-PermitsAdmin', 'B03-Permits', 'Renumbered; dropped a suffix'),
        ('B04b-UtilityFees', 'B04-Utilities', 'Renumbered; dropped b suffix'),
        ('B09-TempIndirect', 'B08-TempIndirect', 'Renumbered to fill B08 gap'),
        ('B10-RiskIns', 'B09-RiskIns', 'Renumbered'),
        ('B11-Finance', 'B10-Finance', 'Renumbered'),
        ('B12-Overhead', 'B11-Overhead', 'Renumbered'),
        ('B13-Contingtic', 'B12-Contingency', 'Renumbered and renamed'),
        ('B14-Return', 'B13-Return', 'Renumbered'),
        ('O03-PropInsurance', 'O03-PropIns', 'Shortened name for consistency'),
    ]

    print("\nce_code_alias table needs to be created in Supabase SQL Editor:")
    print("```sql")
    print("""CREATE TABLE IF NOT EXISTS ce_code_alias (
    id SERIAL PRIMARY KEY,
    old_code VARCHAR(30) NOT NULL UNIQUE,
    new_code VARCHAR(30) NOT NULL,
    migration_date DATE DEFAULT CURRENT_DATE,
    notes TEXT
);

ALTER TABLE ce_code_alias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read access" ON ce_code_alias FOR SELECT USING (true);
GRANT SELECT ON ce_code_alias TO anon, authenticated;

-- Insert mappings
INSERT INTO ce_code_alias (old_code, new_code, notes) VALUES""")
    for i, (old, new, notes) in enumerate(alias_mappings):
        comma = ',' if i < len(alias_mappings) - 1 else ';'
        print(f"    ('{old}', '{new}', '{notes}'){comma}")
    print("```")

    print("\n\nce_drilldown columns need to be added in Supabase SQL Editor:")
    print("```sql")
    print("""-- Add new columns to ce_drilldown
ALTER TABLE ce_drilldown ADD COLUMN IF NOT EXISTS level5_name VARCHAR(200);
ALTER TABLE ce_drilldown ADD COLUMN IF NOT EXISTS cost_composition VARCHAR(20) DEFAULT 'mixed';
ALTER TABLE ce_drilldown ADD COLUMN IF NOT EXISTS uniformat_code VARCHAR(20);
ALTER TABLE ce_drilldown ADD COLUMN IF NOT EXISTS sort_order INTEGER;

-- Add constraint
ALTER TABLE ce_drilldown ADD CONSTRAINT chk_cost_composition
    CHECK (cost_composition IN ('mixed', 'material', 'labor', 'sub_op'));

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_ce_drilldown_level5 ON ce_drilldown(level5_name);
CREATE INDEX IF NOT EXISTS idx_ce_drilldown_uniformat ON ce_drilldown(uniformat_code);

-- Update view
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

GRANT SELECT ON v_ce_drilldown_hierarchy TO anon, authenticated;
```""")

    print("\n\nUniFormat tagging for B07-BuildCost:")
    print("```sql")
    print("""-- Tag B07-BuildCost drilldown with UniFormat codes
UPDATE ce_drilldown SET uniformat_code = 'A', sort_order = 10
WHERE ce_code = 'B07-BuildCost' AND (
    lower(level1_name) LIKE '%foundation%' OR lower(level1_name) LIKE '%substructure%'
    OR lower(level1_name) LIKE '%basement%' OR lower(level1_name) LIKE '%footing%'
    OR lower(level1_name) LIKE '%slab%'
);

UPDATE ce_drilldown SET uniformat_code = 'B', sort_order = 20
WHERE ce_code = 'B07-BuildCost' AND (
    lower(level1_name) LIKE '%shell%' OR lower(level1_name) LIKE '%framing%'
    OR lower(level1_name) LIKE '%structural%' OR lower(level1_name) LIKE '%exterior%'
    OR lower(level1_name) LIKE '%roof%' OR lower(level1_name) LIKE '%window%'
    OR lower(level1_name) LIKE '%door%' OR lower(level1_name) LIKE '%wall%'
);

UPDATE ce_drilldown SET uniformat_code = 'C', sort_order = 30
WHERE ce_code = 'B07-BuildCost' AND (
    lower(level1_name) LIKE '%interior%' OR lower(level1_name) LIKE '%partition%'
    OR lower(level1_name) LIKE '%finish%' OR lower(level1_name) LIKE '%flooring%'
    OR lower(level1_name) LIKE '%ceiling%' OR lower(level1_name) LIKE '%drywall%'
    OR lower(level1_name) LIKE '%cabinet%' OR lower(level1_name) LIKE '%millwork%'
);

UPDATE ce_drilldown SET uniformat_code = 'D', sort_order = 40
WHERE ce_code = 'B07-BuildCost' AND (
    lower(level1_name) LIKE '%plumbing%' OR lower(level1_name) LIKE '%hvac%'
    OR lower(level1_name) LIKE '%mechanical%' OR lower(level1_name) LIKE '%electrical%'
    OR lower(level1_name) LIKE '%fire%' OR lower(level1_name) LIKE '%wiring%'
);

UPDATE ce_drilldown SET uniformat_code = 'E', sort_order = 50
WHERE ce_code = 'B07-BuildCost' AND (
    lower(level1_name) LIKE '%equipment%' OR lower(level1_name) LIKE '%appliance%'
    OR lower(level1_name) LIKE '%fixture%'
);

UPDATE ce_drilldown SET uniformat_code = 'Z', sort_order = 99
WHERE ce_code = 'B07-BuildCost' AND uniformat_code IS NULL;
```""")

    print("\n" + "="*60)
    print("Copy the SQL above and run it in Supabase SQL Editor")
    print("="*60)

if __name__ == "__main__":
    main()
