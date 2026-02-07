#!/usr/bin/env python3
"""
Create unified cost_elements table with hierarchical IDs for all levels.
Migrates data from old cost_elements (L1) and ce_drilldown (L2-L5).
"""

import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_KEY')

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# SQL to create the new unified table
CREATE_TABLE_SQL = """
-- Drop old table if exists (we'll rename current one first)
-- ALTER TABLE cost_elements RENAME TO cost_elements_old;

-- Create new unified cost_elements table
CREATE TABLE IF NOT EXISTS cost_elements_unified (
    ce_id VARCHAR(30) PRIMARY KEY,
    parent_id VARCHAR(30) REFERENCES cost_elements_unified(ce_id),
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
CREATE POLICY "Public read access" ON cost_elements_unified FOR SELECT USING (true);

-- Grant access
GRANT SELECT ON cost_elements_unified TO anon, authenticated;
"""

def generate_child_id(parent_id: str, level: int, index: int) -> str:
    """Generate child ID based on parent and position.

    Pattern:
    - L1: B07 (base)
    - L2: B07a, B07b (letters)
    - L3: B07a01, B07a02 (2-digit numbers)
    - L4: B07a01a, B07a01b (letters)
    - L5: B07a01a01, B07a01a02 (2-digit numbers)
    """
    if level == 2:
        # Add letter suffix
        letter = chr(ord('a') + index)
        return f"{parent_id}{letter}"
    elif level == 3:
        # Add 2-digit number
        return f"{parent_id}{index+1:02d}"
    elif level == 4:
        # Add letter suffix
        letter = chr(ord('a') + index)
        return f"{parent_id}{letter}"
    elif level == 5:
        # Add 2-digit number
        return f"{parent_id}{index+1:02d}"
    return parent_id


def migrate_data():
    """Migrate data from old tables to new unified table."""

    # Fetch all L1 cost elements
    l1_result = supabase.table('cost_elements').select('*').order('sort_order').execute()
    l1_elements = l1_result.data

    # Fetch all drilldown data
    drilldown_result = supabase.table('ce_drilldown').select('*').order('ce_code,level1_name,level2_name,level3_name,level4_name,cost_component').execute()
    drilldown_data = drilldown_result.data

    # Build unified records
    unified_records = []

    # 1. Insert L1 elements
    for l1 in l1_elements:
        # Extract short name from ce_id (e.g., "B07-BuildCost" -> "BuildCost")
        short_name = l1['ce_id'].split('-')[1] if '-' in l1['ce_id'] else l1['ce_id']

        unified_records.append({
            'ce_id': l1['ce_id'],
            'parent_id': None,
            'level': 1,
            'short_name': short_name,
            'description': l1.get('description'),
            'stage_id': l1.get('stage_id'),
            'sort_order': l1.get('sort_order'),
            'estimate': l1.get('estimate'),
            'annual_estimate': l1.get('annual_estimate'),
            'unit': l1.get('unit'),
            'cadence': l1.get('cadence'),
            'notes': l1.get('notes'),
            'assumptions': l1.get('assumptions'),
            'is_computed': l1.get('is_computed', False),
        })

    # 2. Build hierarchy from drilldown data
    # Group by ce_code -> level1 -> level2 -> level3 -> level4
    hierarchy = {}

    for row in drilldown_data:
        ce_code = row['ce_code']
        l1_name = row.get('level1_name') or ''
        l2_name = row.get('level2_name') or ''
        l3_name = row.get('level3_name') or ''
        l4_name = row.get('level4_name') or ''
        l5_name = row.get('cost_component') or ''

        if ce_code not in hierarchy:
            hierarchy[ce_code] = {}

        if l1_name and l1_name not in hierarchy[ce_code]:
            hierarchy[ce_code][l1_name] = {}

        if l1_name and l2_name and l2_name not in hierarchy[ce_code][l1_name]:
            hierarchy[ce_code][l1_name][l2_name] = {}

        if l1_name and l2_name and l3_name and l3_name not in hierarchy[ce_code][l1_name][l2_name]:
            hierarchy[ce_code][l1_name][l2_name][l3_name] = {}

        if l1_name and l2_name and l3_name and l4_name and l4_name not in hierarchy[ce_code][l1_name][l2_name][l3_name]:
            hierarchy[ce_code][l1_name][l2_name][l3_name][l4_name] = set()

        if l1_name and l2_name and l3_name and l4_name and l5_name:
            hierarchy[ce_code][l1_name][l2_name][l3_name][l4_name].add(l5_name)
        elif l1_name and l2_name and l3_name and l5_name and not l4_name:
            # L5 directly under L3 (no L4)
            if '__l5__' not in hierarchy[ce_code][l1_name][l2_name][l3_name]:
                hierarchy[ce_code][l1_name][l2_name][l3_name]['__l5__'] = set()
            hierarchy[ce_code][l1_name][l2_name][l3_name]['__l5__'].add(l5_name)
        elif l1_name and l2_name and l5_name and not l3_name:
            # L5 directly under L2 (no L3, L4)
            if '__l5__' not in hierarchy[ce_code][l1_name][l2_name]:
                hierarchy[ce_code][l1_name][l2_name]['__l5__'] = set()
            hierarchy[ce_code][l1_name][l2_name]['__l5__'].add(l5_name)
        elif l1_name and l5_name and not l2_name:
            # L5 directly under L1 (no L2, L3, L4)
            if '__l5__' not in hierarchy[ce_code][l1_name]:
                hierarchy[ce_code][l1_name]['__l5__'] = set()
            hierarchy[ce_code][l1_name]['__l5__'].add(l5_name)

    # Get stage_id for each ce_code
    ce_stages = {l1['ce_id']: l1.get('stage_id') for l1 in l1_elements}

    # 3. Generate IDs and records for L2-L5
    for ce_code, l1_dict in hierarchy.items():
        stage_id = ce_stages.get(ce_code)

        for l1_idx, (l1_name, l2_dict) in enumerate(sorted(l1_dict.items())):
            if l1_name == '__l5__':
                continue

            l2_id = generate_child_id(ce_code, 2, l1_idx)
            unified_records.append({
                'ce_id': l2_id,
                'parent_id': ce_code,
                'level': 2,
                'short_name': l1_name,
                'description': None,
                'stage_id': stage_id,
                'sort_order': l1_idx + 1,
            })

            # Handle L5 directly under L2
            if '__l5__' in l2_dict:
                for l5_idx, l5_name in enumerate(sorted(l2_dict['__l5__'])):
                    l5_id = generate_child_id(l2_id, 3, l5_idx)  # Use L3 pattern for direct children
                    unified_records.append({
                        'ce_id': l5_id,
                        'parent_id': l2_id,
                        'level': 3,  # Treat as L3 since no intermediate levels
                        'short_name': l5_name,
                        'description': None,
                        'stage_id': stage_id,
                        'sort_order': l5_idx + 1,
                    })

            for l2_idx, (l2_name, l3_dict) in enumerate(sorted([(k, v) for k, v in l2_dict.items() if k != '__l5__'])):
                l3_id = generate_child_id(l2_id, 3, l2_idx)
                unified_records.append({
                    'ce_id': l3_id,
                    'parent_id': l2_id,
                    'level': 3,
                    'short_name': l2_name,
                    'description': None,
                    'stage_id': stage_id,
                    'sort_order': l2_idx + 1,
                })

                # Handle L5 directly under L3
                if '__l5__' in l3_dict:
                    for l5_idx, l5_name in enumerate(sorted(l3_dict['__l5__'])):
                        l5_id = generate_child_id(l3_id, 4, l5_idx)
                        unified_records.append({
                            'ce_id': l5_id,
                            'parent_id': l3_id,
                            'level': 4,
                            'short_name': l5_name,
                            'description': None,
                            'stage_id': stage_id,
                            'sort_order': l5_idx + 1,
                        })

                for l3_idx, (l3_name, l4_dict) in enumerate(sorted([(k, v) for k, v in l3_dict.items() if k != '__l5__'])):
                    l4_id = generate_child_id(l3_id, 4, l3_idx)
                    unified_records.append({
                        'ce_id': l4_id,
                        'parent_id': l3_id,
                        'level': 4,
                        'short_name': l3_name,
                        'description': None,
                        'stage_id': stage_id,
                        'sort_order': l3_idx + 1,
                    })

                    # Handle L5 directly under L4
                    if '__l5__' in l4_dict:
                        for l5_idx, l5_name in enumerate(sorted(l4_dict['__l5__'])):
                            l5_id = generate_child_id(l4_id, 5, l5_idx)
                            unified_records.append({
                                'ce_id': l5_id,
                                'parent_id': l4_id,
                                'level': 5,
                                'short_name': l5_name,
                                'description': None,
                                'stage_id': stage_id,
                                'sort_order': l5_idx + 1,
                            })

                    for l4_idx, (l4_name, l5_set) in enumerate(sorted([(k, v) for k, v in l4_dict.items() if k != '__l5__'])):
                        l5_id = generate_child_id(l4_id, 5, l4_idx)
                        unified_records.append({
                            'ce_id': l5_id,
                            'parent_id': l4_id,
                            'level': 5,
                            'short_name': l4_name,
                            'description': None,
                            'stage_id': stage_id,
                            'sort_order': l4_idx + 1,
                        })

                        # L5 has children (l5_set is the cost_component values)
                        # These are actually L6 (Material, Labor, Sub-O+P, Total)
                        # We'll skip these for now as they're cost breakdowns, not hierarchy

    return unified_records


def print_ddl():
    """Print the DDL for manual execution in Supabase SQL Editor."""
    print("=" * 60)
    print("RUN THIS DDL IN SUPABASE SQL EDITOR:")
    print("=" * 60)
    print(CREATE_TABLE_SQL)
    print("=" * 60)


def insert_records(records):
    """Insert records into the unified table."""
    # Need to insert in order: L1 first, then L2, etc. due to FK constraints
    for level in range(1, 6):
        level_records = [r for r in records if r.get('level') == level]
        if level_records:
            print(f"Inserting {len(level_records)} L{level} records...")
            # Insert in batches
            batch_size = 100
            for i in range(0, len(level_records), batch_size):
                batch = level_records[i:i+batch_size]
                try:
                    supabase.table('cost_elements_unified').insert(batch).execute()
                except Exception as e:
                    print(f"Error inserting batch: {e}")
                    # Try one by one
                    for record in batch:
                        try:
                            supabase.table('cost_elements_unified').insert(record).execute()
                        except Exception as e2:
                            print(f"  Error inserting {record['ce_id']}: {e2}")


def export_tsv():
    """Export all records as TSV."""
    result = supabase.table('cost_elements_unified').select('*').order('ce_id').execute()

    print("\nce_id\tparent_id\tlevel\tshort_name\tdescription\tstage_id\tsort_order")
    for row in result.data:
        print(f"{row['ce_id']}\t{row.get('parent_id') or ''}\t{row['level']}\t{row['short_name']}\t{row.get('description') or ''}\t{row.get('stage_id') or ''}\t{row.get('sort_order') or ''}")


if __name__ == '__main__':
    import sys

    if len(sys.argv) > 1 and sys.argv[1] == '--ddl':
        print_ddl()
    elif len(sys.argv) > 1 and sys.argv[1] == '--export':
        export_tsv()
    elif len(sys.argv) > 1 and sys.argv[1] == '--migrate':
        records = migrate_data()
        print(f"Generated {len(records)} records")
        insert_records(records)
        print("Migration complete!")
    else:
        # Default: show what we would do
        records = migrate_data()
        print(f"Generated {len(records)} records")
        print("\nPreview (first 20):")
        for r in records[:20]:
            print(f"  {r['ce_id']} (L{r['level']}) -> {r['short_name']}")
        print("\nRun with --ddl to see DDL, --migrate to insert, --export to export TSV")
