#!/usr/bin/env python3
"""
Add missing O element children from ce_drilldown to cost_elements_unified.
"""

import os
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)


def index_to_letter(i):
    """Convert 0-based index to letter (a, b, c, ... z, aa, ab, ...)"""
    result = ''
    i += 1
    while i > 0:
        i -= 1
        result = chr(ord('a') + (i % 26)) + result
        i //= 26
    return result


def generate_children_from_drilldown(ce_code: str):
    """
    Generate unified table entries from ce_drilldown for a given L1 ce_code.
    """
    # Get drilldown entries for this CE
    result = supabase.table('ce_drilldown').select('*').eq('ce_code', ce_code).execute()

    if not result.data:
        print(f"  No drilldown entries for {ce_code}")
        return []

    # Get the L1 element info
    l1_result = supabase.table('cost_elements_unified').select('*').eq('ce_id', ce_code).execute()
    if not l1_result.data:
        print(f"  ERROR: L1 element {ce_code} not found in unified table")
        return []

    l1 = l1_result.data[0]
    stage_id = l1['stage_id']
    phase = l1['phase']
    node_class = l1['node_class']

    # Build hierarchy from drilldown
    # Track unique names at each level
    l2_names = {}  # name -> {id, sort_order, children: {name -> ...}}

    for row in result.data:
        l1_name = row.get('level1_name')
        l2_name = row.get('level2_name')
        l3_name = row.get('level3_name')
        l4_name = row.get('level4_name')

        # L2 (first child level under L1)
        if l1_name and l1_name not in l2_names:
            l2_names[l1_name] = {'children': {}, 'sort_order': len(l2_names) + 1}

        # L3
        if l1_name and l2_name:
            if l2_name not in l2_names[l1_name]['children']:
                l2_names[l1_name]['children'][l2_name] = {'children': {}, 'sort_order': len(l2_names[l1_name]['children']) + 1}

            # L4
            if l3_name:
                if l3_name not in l2_names[l1_name]['children'][l2_name]['children']:
                    l2_names[l1_name]['children'][l2_name]['children'][l3_name] = {
                        'children': {},
                        'sort_order': len(l2_names[l1_name]['children'][l2_name]['children']) + 1
                    }

    # Generate entries
    entries = []

    for l2_idx, (l2_name, l2_data) in enumerate(l2_names.items()):
        l2_id = f"{ce_code}{index_to_letter(l2_idx)}"
        entries.append({
            'ce_id': l2_id,
            'parent_id': ce_code,
            'level': 2,
            'short_name': l2_name,
            'description': None,
            'stage_id': stage_id,
            'sort_order': l2_data['sort_order'],
            'phase': phase,
            'node_class': node_class
        })

        for l3_idx, (l3_name, l3_data) in enumerate(l2_data['children'].items()):
            l3_id = f"{l2_id}{str(l3_idx + 1).zfill(2)}"
            entries.append({
                'ce_id': l3_id,
                'parent_id': l2_id,
                'level': 3,
                'short_name': l3_name,
                'description': None,
                'stage_id': stage_id,
                'sort_order': l3_data['sort_order'],
                'phase': phase,
                'node_class': node_class
            })

            for l4_idx, (l4_name, l4_data) in enumerate(l3_data['children'].items()):
                l4_id = f"{l3_id}{index_to_letter(l4_idx)}"
                entries.append({
                    'ce_id': l4_id,
                    'parent_id': l3_id,
                    'level': 4,
                    'short_name': l4_name,
                    'description': None,
                    'stage_id': stage_id,
                    'sort_order': l4_data['sort_order'],
                    'phase': phase,
                    'node_class': node_class
                })

    return entries


def main():
    print("=" * 60)
    print("Adding missing O element children")
    print("=" * 60)

    # O elements that have drilldown data
    o_elements = ['O01-Utilities', 'O02-Maint', 'O04-Taxes', 'O05-HOA']

    all_entries = []

    for ce_code in o_elements:
        print(f"\nProcessing {ce_code}...")
        entries = generate_children_from_drilldown(ce_code)
        print(f"  Generated {len(entries)} entries")
        all_entries.extend(entries)

        # Show what will be added
        for e in entries:
            indent = "  " * e['level']
            print(f"  {indent}{e['ce_id']}: {e['short_name']}")

    print(f"\n{'=' * 60}")
    print(f"Total entries to add: {len(all_entries)}")
    print(f"{'=' * 60}")

    if not all_entries:
        print("Nothing to add.")
        return

    # Insert by level to respect FK constraints
    for level in [2, 3, 4, 5]:
        level_entries = [e for e in all_entries if e['level'] == level]
        if level_entries:
            print(f"\nInserting {len(level_entries)} L{level} entries...")
            try:
                result = supabase.table('cost_elements_unified').insert(level_entries).execute()
                print(f"  ✓ Inserted {len(result.data)} entries")
            except Exception as e:
                print(f"  ERROR: {e}")
                return

    print("\n✓ Done!")

    # Verify
    print("\nVerifying O element counts:")
    for ce_code in o_elements:
        result = supabase.table('cost_elements_unified').select('ce_id', count='exact').like('ce_id', f'{ce_code}%').execute()
        print(f"  {ce_code}: {result.count} entries")


if __name__ == "__main__":
    main()
