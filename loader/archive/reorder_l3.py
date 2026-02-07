#!/usr/bin/env python3
"""
Reorder L3 cost elements to follow chronological project order.
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

def index_to_number(i):
    """Convert 0-based index to 2-digit number (01-99)"""
    return f"{i + 1:02d}"

# Define the chronological order for each L2 parent that needs reordering
# Format: parent_id -> list of short_names in desired order
L3_REORDER_MAP = {
    # B02b: Soil investigation → Geotechnical report
    "B02b-Geotechnical": [
        "Soil investigation",
        "Geotechnical report",
    ],

    # B02c: Phase I → Phase II → Endangered species → Wetland
    "B02c-Environmental": [
        "Phase I ESA",
        "Phase II ESA",
        "Endangered species",
        "Wetland delineation",
    ],

    # B02e: Market study → Zoning analysis → Concept design
    "B02e-Planning": [
        "Market study",
        "Zoning analysis",
        "Concept design",
    ],

    # B05a: Site prep → Erosion control
    "B05a-Site preparation": [
        "Site prep",
        "Erosion control",
    ],

    # B05e: Subgrade → Curb/gutter → Paving → Driveways → Surface lot → Sidewalks → EV → Striping → Garage
    "B05e-Paving & transportation": [
        "Subgrade and base",
        "Curb and gutter",
        "Paving",
        "Driveways",
        "Surface lot",
        "Sidewalks",
        "EV charging",
        "Striping and signage",
        "Garage",
    ],

    # B05f: Structures → Lighting → Recreation → Furniture
    "B05f-Site improvements & amenities": [
        "Structures",
        "Lighting",
        "Recreation",
        "Furniture",
    ],

    # B05g: Irrigation → Hardscape → Trees → Shrubs → Sod
    "B05g-Landscaping & irrigation": [
        "Irrigation",
        "Hardscape",
        "Trees",
        "Shrubs and groundcover",
        "Sod and seed",
    ],

    # B06a: SD → DD → Interior → CD → CA (AIA phases)
    "B06a-Architecture": [
        "Schematic design",
        "Design development",
        "Interior design",
        "Construction documents",
        "Construction admin",
    ],

    # B06c: Landscape → Energy → Accessibility → Acoustical → Certifications → Commissioning
    "B06c-Consultants": [
        "Landscape architect",
        "Energy modeling",
        "Accessibility",
        "Acoustical",
        "Certifications",
        "Commissioning",
    ],

    # B06d: Entity → Contracts → HOA
    "B06d-Legal": [
        "Entity formation",
        "Contracts",
        "HOA formation",
    ],

    # B07b: Structure → Weather → Roofing → Windows → Ext doors → Insulation → Siding → Paint → Porch → Deck → Garage
    "B07b-Shell": [
        "Structure",
        "Weather barriers",
        "Roofing",
        "Windows",
        "Exterior doors",
        "Insulation",
        "Siding",
        "Paint",
        "Porch",
        "Deck",
        "Garage",
    ],

    # B07c: Radon → Plumbing → Electrical → HVAC → Fire → Central vac → Water treatment → Generator → Elevator → Vertical
    "B07c-Services": [
        "Radon mitigation",
        "Plumbing",
        "Electrical",
        "HVAC",
        "Fire protection",
        "Central vacuum",
        "Water treatment",
        "Generator",
        "Elevator",
        "Vertical transport",
    ],

    # B07d: Drywall → Paint → Fireplace → Wall tile → Cabinets → Countertops → Flooring → Trim → Doors → Bath acc → Appliances
    "B07d-Interiors": [
        "Drywall",
        "Paint",
        "Fireplace",
        "Wall tile",
        "Cabinets",
        "Countertops",
        "Flooring",
        "Trim",
        "Doors",
        "Bath accessories",
        "Appliances",
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

    # Process each L2 parent that needs reordering
    for parent_id, desired_order in L3_REORDER_MAP.items():
        if parent_id not in row_by_id:
            print(f"  WARNING: Parent {parent_id} not found")
            continue

        # Get current L3 children
        l3_children = [r for r in children_by_parent.get(parent_id, []) if r['level'] == '3']

        if not l3_children:
            print(f"  WARNING: No L3 children for {parent_id}")
            continue

        # Map short_name to row
        child_by_name = {r['short_name']: r for r in l3_children}

        # Verify all expected children exist
        missing = [name for name in desired_order if name not in child_by_name]
        if missing:
            print(f"  WARNING: Missing children for {parent_id}: {missing}")

        extra = [name for name in child_by_name if name not in desired_order]
        if extra:
            print(f"  WARNING: Extra children for {parent_id} not in desired order: {extra}")

        # Get parent prefix (e.g., "B07b" from "B07b-Shell")
        parent_prefix = parent_id.split('-')[0]

        print(f"\n=== Reordering {parent_id} ===")

        # Generate new IDs and sort_orders in desired order
        for new_index, short_name in enumerate(desired_order):
            if short_name not in child_by_name:
                continue

            row = child_by_name[short_name]
            old_id = row['ce_id']

            # L3 uses 2-digit numbers (01, 02, etc.)
            new_suffix = index_to_number(new_index)
            new_id = f"{parent_prefix}{new_suffix}-{short_name}"
            new_sort_order = new_index + 1

            if old_id != new_id:
                print(f"  {old_id} -> {new_id} (sort_order: {row['sort_order']} -> {new_sort_order})")
                id_mapping[old_id] = new_id

            row['sort_order'] = str(new_sort_order)

    print(f"\n=== Total L3 IDs to remap: {len(id_mapping)} ===")

    # Now we need to update all descendants of remapped L3 nodes
    # For each remapped L3, find all descendants and update their IDs and parent_ids

    def get_all_descendants(parent_id):
        """Recursively get all descendants of a node"""
        descendants = []
        for child in children_by_parent.get(parent_id, []):
            descendants.append(child)
            descendants.extend(get_all_descendants(child['ce_id']))
        return descendants

    # Build mapping for descendants
    descendant_mappings = {}
    for old_l3_id, new_l3_id in id_mapping.items():
        old_prefix = old_l3_id.split('-')[0]  # e.g., "B07b01"
        new_prefix = new_l3_id.split('-')[0]  # e.g., "B07b03"

        # Get all descendants
        descendants = get_all_descendants(old_l3_id)
        for desc in descendants:
            old_desc_id = desc['ce_id']
            old_desc_prefix = old_desc_id.split('-')[0]

            # Replace the L3 portion of the prefix
            # e.g., "B07b01a" -> "B07b03a" if B07b01 -> B07b03
            new_desc_prefix = old_desc_prefix.replace(old_prefix, new_prefix, 1)
            new_desc_id = old_desc_id.replace(old_desc_prefix, new_desc_prefix, 1)

            if old_desc_id != new_desc_id:
                descendant_mappings[old_desc_id] = new_desc_id

    print(f"=== Total descendant IDs to remap: {len(descendant_mappings)} ===")

    # Merge all mappings
    all_mappings = {**id_mapping, **descendant_mappings}

    # Two-pass update to avoid collisions: first add TEMP_ prefix, then final ID
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

    # Print summary of changes by L2 parent
    print("\n=== SUMMARY ===")
    for parent_id in L3_REORDER_MAP:
        count = sum(1 for old_id in all_mappings if old_id.startswith(parent_id.split('-')[0]))
        if count > 0:
            print(f"  {parent_id}: {count} IDs updated")

if __name__ == '__main__':
    main()
