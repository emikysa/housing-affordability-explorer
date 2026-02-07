#!/usr/bin/env python3
"""
Regenerate ce_ids to follow the correct hierarchical pattern:
- L1: B07-BuildCost
- L2: B07a-Substructure, B07b-Shell, etc.
- L3: B07a01-Foundation, B07a02-Basement, etc.
- L4: B07a01a-Basement, B07a01b-Crawlspace, etc.
- L5: B07a01a01-Drilled shafts, etc.
- L6: B07a01a01a-..., etc.

Pattern: prefix builds from left with alternating letters (a-z) and 2-digit numbers (01-99)
Format: {prefix}-{short_name}
"""

import csv
from collections import defaultdict

def index_to_letter(i):
    """Convert 0-based index to letter (a-z, aa-az, ba-bz, etc.)"""
    if i < 26:
        return chr(ord('a') + i)
    else:
        # For > 26 items, use aa, ab, ac... (unlikely but handle it)
        return chr(ord('a') + (i // 26) - 1) + chr(ord('a') + (i % 26))

def index_to_number(i):
    """Convert 0-based index to 2-digit number (01-99)"""
    return f"{i + 1:02d}"

def generate_new_id(parent_prefix, sibling_index, level, short_name):
    """
    Generate new ce_id based on parent prefix and sibling index.

    Level pattern:
    - L1: Just the base (e.g., B07-BuildCost) - keep as-is
    - L2: parent + letter (e.g., B07a)
    - L3: parent + 2-digit number (e.g., B07a01)
    - L4: parent + letter (e.g., B07a01a)
    - L5: parent + 2-digit number (e.g., B07a01a01)
    - L6: parent + letter (e.g., B07a01a01a)
    """
    if level == 1:
        # L1 nodes keep their original format
        return parent_prefix  # This is already the full ID like B07-BuildCost

    # Determine suffix type based on level (even levels = letters, odd levels > 1 = numbers)
    if level % 2 == 0:  # L2, L4, L6 = letters
        suffix = index_to_letter(sibling_index)
    else:  # L3, L5 = numbers
        suffix = index_to_number(sibling_index)

    new_prefix = parent_prefix + suffix
    return f"{new_prefix}-{short_name}"

def extract_prefix_from_id(ce_id):
    """Extract the hierarchical prefix from a ce_id (everything before the last hyphen)"""
    # For L1, the prefix is the full ID
    # For others, split on hyphen and take the first part
    parts = ce_id.split('-')
    if len(parts) <= 2:
        return ce_id  # L1 like B07-BuildCost
    return parts[0]  # Return just the prefix part

def main():
    input_file = '/Users/emikysa/Claude/HousingAffordabilityFramework/cost_elements_unified.tsv'
    output_file = '/Users/emikysa/Claude/HousingAffordabilityFramework/cost_elements_unified_new.tsv'

    # Read all rows
    with open(input_file, 'r') as f:
        reader = csv.DictReader(f, delimiter='\t')
        fieldnames = reader.fieldnames
        rows = list(reader)

    print(f"Read {len(rows)} rows")

    # Build tree structure: parent_id -> list of children (sorted by sort_order)
    children_by_parent = defaultdict(list)
    row_by_old_id = {}

    for row in rows:
        old_id = row['ce_id']
        parent_id = row['parent_id'] or None
        row_by_old_id[old_id] = row
        children_by_parent[parent_id].append(row)

    # Sort children by sort_order
    for parent_id in children_by_parent:
        children_by_parent[parent_id].sort(key=lambda r: int(r['sort_order']))

    # Map old_id -> new_id
    id_mapping = {}

    # Process tree level by level using BFS
    def process_node(row, parent_new_prefix):
        old_id = row['ce_id']
        level = int(row['level'])
        short_name = row['short_name']
        parent_id = row['parent_id'] or None

        # Find sibling index
        siblings = children_by_parent[parent_id]
        sibling_index = next(i for i, r in enumerate(siblings) if r['ce_id'] == old_id)

        if level == 1:
            # L1 nodes keep their original ID
            new_id = old_id
            new_prefix = old_id.split('-')[0] + old_id.split('-')[1][0:1]  # e.g., B07 from B07-BuildCost
            # Actually for L1, prefix for children should be like "B07" not "B07B"
            # Let me reconsider...
            # B07-BuildCost -> children should be B07a-xxx, B07b-xxx
            # So prefix passed to children is "B07"
            new_prefix = old_id.split('-')[0]  # Just "B07"
        else:
            new_id = generate_new_id(parent_new_prefix, sibling_index, level, short_name)
            # Extract prefix for passing to children
            # The prefix is everything before the hyphen-shortname
            new_prefix = new_id.rsplit('-', 1)[0]

        id_mapping[old_id] = new_id

        # Process children
        for child_row in children_by_parent.get(old_id, []):
            process_node(child_row, new_prefix)

    # Start with root nodes (L1, no parent)
    for row in children_by_parent[None]:
        # For L1, we pass the base prefix (e.g., "B07" from "B07-BuildCost")
        old_id = row['ce_id']
        id_mapping[old_id] = old_id  # L1 keeps same ID
        base_prefix = old_id.split('-')[0]  # e.g., "B07"

        # Process children of this L1 node
        for child_row in children_by_parent.get(old_id, []):
            process_node(child_row, base_prefix)

    # Now update all rows with new IDs
    updated_rows = []
    for row in rows:
        new_row = dict(row)
        old_id = row['ce_id']
        old_parent = row['parent_id']

        new_row['ce_id'] = id_mapping.get(old_id, old_id)
        if old_parent:
            new_row['parent_id'] = id_mapping.get(old_parent, old_parent)

        updated_rows.append(new_row)

    # Write output
    with open(output_file, 'w', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames, delimiter='\t')
        writer.writeheader()
        writer.writerows(updated_rows)

    print(f"Wrote {len(updated_rows)} rows to {output_file}")

    # Print sample mappings
    print("\n=== Sample ID mappings ===")
    samples = [
        'B07-BuildCost',
        'B07-BuildCost-01',
        'B07-BuildCost-02',
        'B07-BuildCostc',
        'B07-BuildCostd',
        'B07-BuildCost-05',
        'B07-BuildCost-06',
    ]
    for old_id in samples:
        if old_id in id_mapping:
            print(f"  {old_id} -> {id_mapping[old_id]}")

    # Print some deeper examples
    print("\n=== Deeper level examples ===")
    for old_id, new_id in sorted(id_mapping.items()):
        if old_id.startswith('B07') and '-' in new_id:
            level = row_by_old_id[old_id]['level']
            if level in ['3', '4', '5']:
                print(f"  L{level}: {old_id} -> {new_id}")
                if int(level) == 5:
                    break

    # Return mapping for other scripts to use
    return id_mapping

if __name__ == '__main__':
    main()
