#!/usr/bin/env python3
"""
Final chronological reordering for 4 sections:
1. B02 L2: Planning before Engineering studies
2. B05f L3: Retaining walls → Fencing → Structures → Lighting → Recreation → Furniture
3. B07b L3: Move Attached garage to position 2 (after Structure)
4. B07d L3: Move Ceilings to position 2 (after Drywall, before Paint)
"""

import csv
from collections import defaultdict

def index_to_letter(i):
    """Convert 0-based index to letter (a-z)"""
    return chr(ord('a') + i)

def index_to_number(i):
    """Convert 0-based index to 2-digit number (01-99)"""
    return f"{i + 1:02d}"

# Define reorderings
REORDER_MAP = {
    # B02 L2: Swap Planning (currently d) and Engineering studies (currently e)
    # New order: Surveys(a) → Geotech(b) → Environmental(c) → Planning(d) → Engineering(e) → Legal(f) → Public(g)
    # Current: a=Surveys, b=Geotech, c=Environmental, d=Engineering, e=Planning, f=Legal, g=Public
    # Need: swap d and e
    "B02-PreDev": {
        "level": 2,
        "order": [
            "Surveys",           # a (was a) ✓
            "Geotechnical",      # b (was b) ✓
            "Environmental",     # c (was c) ✓
            "Planning",          # d (was e) - MOVE UP
            "Engineering studies", # e (was d) - MOVE DOWN
            "Legal",             # f (was f) ✓
            "Public process",    # g (was g) ✓
        ]
    },

    # B05f L3: Retaining walls → Fencing → Structures → Lighting → Recreation → Furniture
    # Current: Structures(01), Lighting(02), Recreation(03), Furniture(04), Fencing(05), Retaining walls(06)
    "B05f-Site improvements & amenities": {
        "level": 3,
        "order": [
            "Retaining walls",   # 01 (was 06) - MOVE TO FIRST
            "Fencing",           # 02 (was 05) - MOVE UP
            "Structures",        # 03 (was 01) - MOVE DOWN
            "Lighting",          # 04 (was 02) - MOVE DOWN
            "Recreation",        # 05 (was 03) - MOVE DOWN
            "Furniture",         # 06 (was 04) - MOVE DOWN
        ]
    },

    # B07b L3: Move Attached garage from 11 to 2
    # Current: Structure(01), Weather barriers(02), Roofing(03), Windows(04), Exterior doors(05),
    #          Insulation(06), Siding(07), Paint(08), Porch(09), Deck(10), Attached garage(11)
    "B07b-Shell": {
        "level": 3,
        "order": [
            "Structure",         # 01 (was 01) ✓
            "Attached garage",   # 02 (was 11) - MOVE UP
            "Weather barriers",  # 03 (was 02) - shift down
            "Roofing",           # 04 (was 03) - shift down
            "Windows",           # 05 (was 04) - shift down
            "Exterior doors",    # 06 (was 05) - shift down
            "Insulation",        # 07 (was 06) - shift down
            "Siding",            # 08 (was 07) - shift down
            "Paint",             # 09 (was 08) - shift down
            "Porch",             # 10 (was 09) - shift down
            "Deck",              # 11 (was 10) - shift down
        ]
    },

    # B07d L3: Move Ceilings from 12 to 2
    # Current: Drywall(01), Paint(02), Fireplace(03), Wall tile(04), Cabinets(05), Countertops(06),
    #          Flooring(07), Trim(08), Doors(09), Bath accessories(10), Appliances(11), Ceilings(12),
    #          Window treatments(13), Specialties(14)
    "B07d-Interiors": {
        "level": 3,
        "order": [
            "Drywall",           # 01 (was 01) ✓
            "Ceilings",          # 02 (was 12) - MOVE UP
            "Paint",             # 03 (was 02) - shift down
            "Fireplace",         # 04 (was 03) - shift down
            "Wall tile",         # 05 (was 04) - shift down
            "Cabinets",          # 06 (was 05) - shift down
            "Countertops",       # 07 (was 06) - shift down
            "Flooring",          # 08 (was 07) - shift down
            "Trim",              # 09 (was 08) - shift down
            "Doors",             # 10 (was 09) - shift down
            "Bath accessories",  # 11 (was 10) - shift down
            "Appliances",        # 12 (was 11) - shift down
            "Window treatments", # 13 (was 13) ✓
            "Specialties",       # 14 (was 14) ✓
        ]
    },
}

def main():
    input_file = '/Users/emikysa/Claude/HousingAffordabilityFramework/cost_elements_unified.tsv'

    # Read all rows
    with open(input_file, 'r') as f:
        reader = csv.DictReader(f, delimiter='\t')
        fieldnames = reader.fieldnames
        rows = list(reader)

    print(f"Read {len(rows)} rows")

    # Build indexes
    row_by_id = {row['ce_id']: row for row in rows}
    children_by_parent = defaultdict(list)
    for row in rows:
        if row['parent_id']:
            children_by_parent[row['parent_id']].append(row)

    # Track all ID mappings
    all_mappings = {}

    # Process each reordering
    for parent_id, config in REORDER_MAP.items():
        if parent_id not in row_by_id:
            print(f"  WARNING: Parent {parent_id} not found")
            continue

        level = config["level"]
        desired_order = config["order"]

        # Get current children at the target level
        children = [r for r in children_by_parent.get(parent_id, []) if r['level'] == str(level)]

        if not children:
            print(f"  WARNING: No L{level} children for {parent_id}")
            continue

        # Map short_name to row
        child_by_name = {r['short_name']: r for r in children}

        # Verify
        missing = [name for name in desired_order if name not in child_by_name]
        if missing:
            print(f"  WARNING: Missing children for {parent_id}: {missing}")

        extra = [name for name in child_by_name if name not in desired_order]
        if extra:
            print(f"  WARNING: Extra children for {parent_id} not in order: {extra}")

        # Get parent prefix
        parent_prefix = parent_id.split('-')[0]

        print(f"\n=== Reordering {parent_id} (L{level}) ===")

        # Generate new IDs based on level
        for new_index, short_name in enumerate(desired_order):
            if short_name not in child_by_name:
                continue

            row = child_by_name[short_name]
            old_id = row['ce_id']

            # L2 uses letters, L3 uses 2-digit numbers
            if level == 2:
                new_suffix = index_to_letter(new_index)
            else:
                new_suffix = index_to_number(new_index)

            new_id = f"{parent_prefix}{new_suffix}-{short_name}"
            new_sort_order = new_index + 1

            if old_id != new_id:
                print(f"  {old_id} -> {new_id}")
                all_mappings[old_id] = new_id

            row['sort_order'] = str(new_sort_order)

    print(f"\n=== Total IDs to remap: {len(all_mappings)} ===")

    # Get all descendants of remapped nodes
    def get_all_descendants(parent_id):
        descendants = []
        for child in children_by_parent.get(parent_id, []):
            descendants.append(child)
            descendants.extend(get_all_descendants(child['ce_id']))
        return descendants

    # Build descendant mappings
    descendant_mappings = {}
    for old_id, new_id in list(all_mappings.items()):
        old_prefix = old_id.split('-')[0]
        new_prefix = new_id.split('-')[0]

        descendants = get_all_descendants(old_id)
        for desc in descendants:
            old_desc_id = desc['ce_id']
            old_desc_prefix = old_desc_id.split('-')[0]

            new_desc_prefix = old_desc_prefix.replace(old_prefix, new_prefix, 1)
            new_desc_id = old_desc_id.replace(old_desc_prefix, new_desc_prefix, 1)

            if old_desc_id != new_desc_id:
                descendant_mappings[old_desc_id] = new_desc_id

    print(f"=== Total descendant IDs to remap: {len(descendant_mappings)} ===")

    # Merge all mappings
    all_mappings.update(descendant_mappings)

    # Two-pass update
    # Pass 1: Add TEMP_ prefix
    for row in rows:
        if row['ce_id'] in all_mappings:
            row['ce_id'] = 'TEMP_' + row['ce_id']
        if row['parent_id'] and row['parent_id'] in all_mappings:
            row['parent_id'] = 'TEMP_' + row['parent_id']

    # Pass 2: Replace with final IDs
    for row in rows:
        if row['ce_id'].startswith('TEMP_'):
            old_id = row['ce_id'][5:]
            row['ce_id'] = all_mappings[old_id]
        if row['parent_id'] and row['parent_id'].startswith('TEMP_'):
            old_parent = row['parent_id'][5:]
            row['parent_id'] = all_mappings[old_parent]

    # Write output
    with open(input_file, 'w', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames, delimiter='\t')
        writer.writeheader()
        writer.writerows(rows)

    print(f"\nWrote {len(rows)} rows")

if __name__ == '__main__':
    main()
