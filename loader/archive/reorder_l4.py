#!/usr/bin/env python3
"""
Reorder L4 cost elements to follow chronological project order.
Updates ce_id prefixes and all descendant references.
"""

import csv
from collections import defaultdict

def index_to_letter(i):
    """Convert 0-based index to letter (a-z)"""
    if i < 26:
        return chr(ord('a') + i)
    else:
        return chr(ord('a') + (i // 26) - 1) + chr(ord('a') + (i % 26))

# Define the chronological order for each L3 parent that needs reordering
# Format: parent_id -> list of short_names in desired order
L4_REORDER_MAP = {
    # B05a01: Demolition → Clearing
    "B05a01-Site prep": [
        "Demolition",
        "Clearing",
    ],

    # B05b01: Rough grading → Import/export → Fine grading
    "B05b01-Grading": [
        "Rough grading",
        "Import/export",
        "Fine grading",
    ],

    # B07b02: House wrap → Flashing → Sealants → Rain screen
    "B07b02-Weather barriers": [
        "House wrap",
        "Flashing",
        "Sealants",
        "Rain screen",
    ],

    # B07b03: Underlayment → (materials) → Flashing → Vents → Gutters
    "B07b03-Roofing": [
        "Underlayment",
        "Shingles",
        "Tile",
        "Metal roofing",
        "Flat roof membrane",
        "Flashing",
        "Vents",
        "Gutters and downspouts",
    ],

    # B07b06: Basement → Floor → Walls → Continuous → Attic
    "B07b06-Insulation": [
        "Basement",
        "Floor",
        "Walls",
        "Continuous",
        "Attic",
    ],

    # B07b10: Structure → Decking → Railing
    "B07b10-Deck": [
        "Structure",
        "Decking",
        "Railing",
    ],

    # B07b11: Slab → Walls and ceiling → Fire separation
    "B07b11-Garage": [
        "Slab",
        "Walls and ceiling",
        "Fire separation",
    ],

    # B07c02: Rough → Gas piping → Water heater → Fixtures
    "B07c02-Plumbing": [
        "Rough",
        "Gas piping",
        "Water heater",
        "Fixtures",
    ],

    # B07c03: Service → Rough → Solar ready → EV ready → Low voltage → Safety → Devices → Lighting
    "B07c03-Electrical": [
        "Service",
        "Rough",
        "Solar ready",
        "EV ready",
        "Low voltage",
        "Safety",
        "Devices",
        "Lighting",
    ],

    # B07c04: Distribution → Heating → Cooling → Ventilation → Controls
    "B07c04-HVAC": [
        "Distribution",
        "Heating",
        "Cooling",
        "Ventilation",
        "Controls",
    ],

    # B07c05: Sprinkler → Fire alarm
    "B07c05-Fire protection": [
        "Sprinkler",
        "Fire alarm",
    ],

    # B07c10: Stairs → Elevators
    "B07c10-Vertical transport": [
        "Stairs",
        "Elevators",
    ],

    # B07d07: Subfloor prep → Tile → Hardwood → LVP/LVT → Laminate → Carpet → Transitions
    "B07d07-Flooring": [
        "Subfloor prep",
        "Tile",
        "Hardwood",
        "LVP/LVT",
        "Laminate",
        "Carpet",
        "Transitions",
    ],

    # B07d09: Interior doors → Closet doors → Hardware
    "B07d09-Doors": [
        "Interior doors",
        "Closet doors",
        "Hardware",
    ],
}

def main():
    input_file = '/Users/emikysa/Claude/HousingAffordabilityFramework/cost_elements_unified.tsv'
    output_file = '/Users/emikysa/Claude/HousingAffordabilityFramework/cost_elements_unified.tsv'

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

    # Sort children by sort_order
    for parent_id in children_by_parent:
        children_by_parent[parent_id].sort(key=lambda r: int(r['sort_order']))

    # Track ID mappings: old_id -> new_id
    id_mapping = {}

    # Process each L3 parent that needs reordering
    for parent_id, desired_order in L4_REORDER_MAP.items():
        if parent_id not in row_by_id:
            print(f"  WARNING: Parent {parent_id} not found")
            continue

        # Get current L4 children
        l4_children = [r for r in children_by_parent.get(parent_id, []) if r['level'] == '4']

        if not l4_children:
            print(f"  WARNING: No L4 children for {parent_id}")
            continue

        # Map short_name to row
        child_by_name = {r['short_name']: r for r in l4_children}

        # Verify all expected children exist
        missing = [name for name in desired_order if name not in child_by_name]
        if missing:
            print(f"  WARNING: Missing children for {parent_id}: {missing}")

        extra = [name for name in child_by_name if name not in desired_order]
        if extra:
            print(f"  WARNING: Extra children for {parent_id} not in desired order: {extra}")

        # Get parent prefix (e.g., "B07b03" from "B07b03-Roofing")
        parent_prefix = parent_id.split('-')[0]

        print(f"\n=== Reordering {parent_id} ===")

        # Generate new IDs and sort_orders in desired order
        for new_index, short_name in enumerate(desired_order):
            if short_name not in child_by_name:
                continue

            row = child_by_name[short_name]
            old_id = row['ce_id']

            # L4 uses letters (a, b, c, etc.)
            new_suffix = index_to_letter(new_index)
            new_id = f"{parent_prefix}{new_suffix}-{short_name}"
            new_sort_order = new_index + 1

            if old_id != new_id:
                print(f"  {old_id} -> {new_id} (sort_order: {row['sort_order']} -> {new_sort_order})")
                id_mapping[old_id] = new_id

            row['sort_order'] = str(new_sort_order)

    print(f"\n=== Total L4 IDs to remap: {len(id_mapping)} ===")

    # Now we need to update all descendants of remapped L4 nodes
    def get_all_descendants(parent_id):
        """Recursively get all descendants of a node"""
        descendants = []
        for child in children_by_parent.get(parent_id, []):
            descendants.append(child)
            descendants.extend(get_all_descendants(child['ce_id']))
        return descendants

    # Build mapping for descendants
    descendant_mappings = {}
    for old_l4_id, new_l4_id in id_mapping.items():
        old_prefix = old_l4_id.split('-')[0]  # e.g., "B07b03a"
        new_prefix = new_l4_id.split('-')[0]  # e.g., "B07b03c"

        # Get all descendants
        descendants = get_all_descendants(old_l4_id)
        for desc in descendants:
            old_desc_id = desc['ce_id']
            old_desc_prefix = old_desc_id.split('-')[0]

            # Replace the L4 portion of the prefix
            new_desc_prefix = old_desc_prefix.replace(old_prefix, new_prefix, 1)
            new_desc_id = old_desc_id.replace(old_desc_prefix, new_desc_prefix, 1)

            if old_desc_id != new_desc_id:
                descendant_mappings[old_desc_id] = new_desc_id

    print(f"=== Total descendant IDs to remap: {len(descendant_mappings)} ===")

    # Merge all mappings
    all_mappings = {**id_mapping, **descendant_mappings}

    # Two-pass update to avoid collisions
    # Pass 1: Add TEMP_ prefix to all IDs that will change
    for row in rows:
        old_id = row['ce_id']
        if old_id in all_mappings:
            row['ce_id'] = 'TEMP_' + old_id

        old_parent = row['parent_id']
        if old_parent and old_parent in all_mappings:
            row['parent_id'] = 'TEMP_' + old_parent

    # Pass 2: Replace TEMP_ with final IDs
    for row in rows:
        if row['ce_id'].startswith('TEMP_'):
            old_id = row['ce_id'][5:]  # Remove TEMP_
            row['ce_id'] = all_mappings[old_id]

        if row['parent_id'] and row['parent_id'].startswith('TEMP_'):
            old_parent = row['parent_id'][5:]  # Remove TEMP_
            row['parent_id'] = all_mappings[old_parent]

    # Write output
    with open(output_file, 'w', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames, delimiter='\t')
        writer.writeheader()
        writer.writerows(rows)

    print(f"\nWrote {len(rows)} rows to {output_file}")

    # Print summary
    print("\n=== SUMMARY ===")
    for parent_id in L4_REORDER_MAP:
        count = sum(1 for old_id in all_mappings if old_id.startswith(parent_id.split('-')[0]))
        if count > 0:
            print(f"  {parent_id}: {count} IDs updated")

if __name__ == '__main__':
    main()
