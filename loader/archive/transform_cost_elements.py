#!/usr/bin/env python3
"""
Transform cost_elements_unified.tsv according to the restructuring requirements.
"""

import csv
import io
from collections import defaultdict
from typing import Dict, List, Set, Tuple
from copy import deepcopy

# Migration report tracking
report = {
    'total_nodes_deleted': 0,
    'total_nodes_reparented': 0,
    'total_nodes_renamed': 0,
    'b07_moves': [],
    'b05_moves': [],
    'b06_moves': [],
    'nodes_for_review': [],
}


def load_tsv(filepath: str) -> Tuple[List[str], List[Dict]]:
    """Load TSV file and return headers and rows as list of dicts."""
    with open(filepath, 'r', encoding='utf-8') as f:
        lines = f.readlines()
        # Skip any empty lines at the start
        start_idx = 0
        for i, line in enumerate(lines):
            if line.strip():
                start_idx = i
                break
        content = ''.join(lines[start_idx:])

    reader = csv.DictReader(io.StringIO(content), delimiter='\t')
    headers = list(reader.fieldnames)
    rows = list(reader)
    return headers, rows


def save_tsv(filepath: str, headers: List[str], rows: List[Dict]):
    """Save rows to TSV file."""
    with open(filepath, 'w', encoding='utf-8', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=headers, delimiter='\t', extrasaction='ignore')
        writer.writeheader()
        writer.writerows(rows)


def build_tree(rows: List[Dict]) -> Tuple[Dict[str, Dict], Dict[str, List[str]]]:
    """Build a lookup dict by ce_id and parent-children relationships."""
    by_id = {r['ce_id']: r for r in rows}
    children = defaultdict(list)
    for r in rows:
        if r.get('parent_id'):
            children[r['parent_id']].append(r['ce_id'])
    return by_id, children


def is_total_node(row: Dict) -> bool:
    """Check if a node is a 'Total' pseudo-node."""
    short_name = (row.get('short_name') or '').strip().lower()
    return short_name == 'total'


def remove_total_nodes(rows: List[Dict]) -> List[Dict]:
    """Remove 'Total' pseudo-nodes, reparenting children if needed."""
    global report

    by_id, children = build_tree(rows)
    to_delete = set()
    reparent_map = {}  # child_id -> new_parent_id

    # Find all Total nodes
    total_nodes = [r['ce_id'] for r in rows if is_total_node(r)]

    for total_id in total_nodes:
        total_row = by_id.get(total_id)
        if not total_row:
            continue

        total_children = children.get(total_id, [])
        total_parent = total_row.get('parent_id')

        if total_children:
            # Has children - reparent them to Total's parent
            for child_id in total_children:
                reparent_map[child_id] = total_parent
                report['total_nodes_reparented'] += 1

        # Delete the Total node
        to_delete.add(total_id)
        report['total_nodes_deleted'] += 1

    # Apply reparenting and filtering
    result = []
    for row in rows:
        if row['ce_id'] in to_delete:
            continue
        row = dict(row)  # Copy
        if row['ce_id'] in reparent_map:
            row['parent_id'] = reparent_map[row['ce_id']]
        result.append(row)

    return result


def update_descendant_levels(rows: List[Dict], ce_id: str, level_delta: int):
    """Update levels of all descendants when a node moves."""
    by_id, children = build_tree(rows)

    def update_recursive(node_id):
        for child_id in children.get(node_id, []):
            child = by_id.get(child_id)
            if child:
                old_level = int(child.get('level', 0))
                child['level'] = str(old_level + level_delta)
                update_recursive(child_id)

    update_recursive(ce_id)


def rebuild_b07_l2(rows: List[Dict]) -> List[Dict]:
    """Rebuild B07-BuildCost L2 to be MECE + system-based."""
    global report

    by_id, children = build_tree(rows)

    # Find current B07 L2 nodes
    b07_l2_nodes = [r for r in rows if r.get('parent_id') == 'B07-BuildCost' and str(r.get('level')) == '2']

    # Target structure - map current nodes to new structure
    # Current: Envelope, Exterior, Interior, MEP, Multifamily, Specialty, Structure

    # First, identify existing L2 nodes by short_name
    l2_by_name = {}
    for node in b07_l2_nodes:
        name = node['short_name'].lower()
        l2_by_name[name] = node

    # Create the new L2 structure
    new_l2_ids = {
        'Substructure': 'B07-BuildCost-01',
        'Shell': 'B07-BuildCost-02',
        'Interiors': 'B07-BuildCost-03',
        'Services': 'B07-BuildCost-04',
        'Special systems & options': 'B07-BuildCost-05',
        'Shared / accessory program spaces': 'B07-BuildCost-06',
    }

    # Nodes to add
    new_nodes = []

    # Create Substructure if not exists
    if 'substructure' not in l2_by_name:
        new_nodes.append({
            'ce_id': new_l2_ids['Substructure'],
            'parent_id': 'B07-BuildCost',
            'level': '2',
            'short_name': 'Substructure',
            'description': '',
            'stage_id': 'Build',
            'sort_order': '1',
        })

    # Create Shell if not exists
    if 'shell' not in l2_by_name:
        new_nodes.append({
            'ce_id': new_l2_ids['Shell'],
            'parent_id': 'B07-BuildCost',
            'level': '2',
            'short_name': 'Shell',
            'description': '',
            'stage_id': 'Build',
            'sort_order': '2',
        })
        shell_id = new_l2_ids['Shell']
    else:
        shell_id = l2_by_name['shell']['ce_id']

    # Handle Structure -> move under Shell
    if 'structure' in l2_by_name:
        struct_node = l2_by_name['structure']
        struct_id = struct_node['ce_id']
        # Change parent to Shell, level to 3
        struct_node['parent_id'] = shell_id
        struct_node['level'] = '3'
        # Update all descendants
        for row in rows:
            if row['ce_id'] == struct_id:
                row['parent_id'] = shell_id
                row['level'] = '3'
        # Update children levels (+1)
        for child_id in children.get(struct_id, []):
            for row in rows:
                if row['ce_id'] == child_id:
                    row['level'] = str(int(row.get('level', 3)) + 1)
                    # And their children too
                    for grandchild_id in children.get(child_id, []):
                        for r2 in rows:
                            if r2['ce_id'] == grandchild_id:
                                r2['level'] = str(int(r2.get('level', 4)) + 1)
                                for ggc_id in children.get(grandchild_id, []):
                                    for r3 in rows:
                                        if r3['ce_id'] == ggc_id:
                                            r3['level'] = str(int(r3.get('level', 5)) + 1)

        report['b07_moves'].append(f"Structure -> Shell (as L3)")

    # Handle Envelope -> merge children into Shell
    if 'envelope' in l2_by_name:
        env_node = l2_by_name['envelope']
        env_id = env_node['ce_id']
        for child_id in children.get(env_id, []):
            for row in rows:
                if row['ce_id'] == child_id:
                    row['parent_id'] = shell_id
                    # Levels stay the same since Shell is L2
        report['b07_moves'].append(f"Envelope children -> Shell")

    # Handle Exterior -> merge children into Shell
    if 'exterior' in l2_by_name:
        ext_node = l2_by_name['exterior']
        ext_id = ext_node['ce_id']
        for child_id in children.get(ext_id, []):
            for row in rows:
                if row['ce_id'] == child_id:
                    row['parent_id'] = shell_id
        report['b07_moves'].append(f"Exterior children -> Shell")

    # Handle Interior -> rename to Interiors
    if 'interior' in l2_by_name:
        int_node = l2_by_name['interior']
        for row in rows:
            if row['ce_id'] == int_node['ce_id']:
                row['short_name'] = 'Interiors'
                row['sort_order'] = '3'
        report['b07_moves'].append(f"Interior -> Interiors")
        interiors_id = int_node['ce_id']
    else:
        new_nodes.append({
            'ce_id': new_l2_ids['Interiors'],
            'parent_id': 'B07-BuildCost',
            'level': '2',
            'short_name': 'Interiors',
            'description': '',
            'stage_id': 'Build',
            'sort_order': '3',
        })
        interiors_id = new_l2_ids['Interiors']

    # Handle MEP -> rename to Services
    if 'mep' in l2_by_name:
        mep_node = l2_by_name['mep']
        for row in rows:
            if row['ce_id'] == mep_node['ce_id']:
                row['short_name'] = 'Services'
                row['sort_order'] = '4'
        report['b07_moves'].append(f"MEP -> Services")
        services_id = mep_node['ce_id']
    else:
        new_nodes.append({
            'ce_id': new_l2_ids['Services'],
            'parent_id': 'B07-BuildCost',
            'level': '2',
            'short_name': 'Services',
            'description': '',
            'stage_id': 'Build',
            'sort_order': '4',
        })
        services_id = new_l2_ids['Services']

    # Create Special systems & options
    new_nodes.append({
        'ce_id': new_l2_ids['Special systems & options'],
        'parent_id': 'B07-BuildCost',
        'level': '2',
        'short_name': 'Special systems & options',
        'description': '',
        'stage_id': 'Build',
        'sort_order': '5',
    })
    special_id = new_l2_ids['Special systems & options']

    # Create Shared / accessory program spaces
    new_nodes.append({
        'ce_id': new_l2_ids['Shared / accessory program spaces'],
        'parent_id': 'B07-BuildCost',
        'level': '2',
        'short_name': 'Shared / accessory program spaces',
        'description': '',
        'stage_id': 'Build',
        'sort_order': '6',
    })
    shared_id = new_l2_ids['Shared / accessory program spaces']

    # Handle Specialty -> split children
    if 'specialty' in l2_by_name:
        spec_node = l2_by_name['specialty']
        spec_id = spec_node['ce_id']
        for child_id in children.get(spec_id, []):
            child = by_id.get(child_id)
            if not child:
                continue
            child_name = child['short_name'].lower()

            # MEP/service items go to Services
            if any(kw in child_name for kw in ['generator', 'water treatment', 'radon', 'central vacuum']):
                for row in rows:
                    if row['ce_id'] == child_id:
                        row['parent_id'] = services_id
                report['b07_moves'].append(f"Specialty/{child['short_name']} -> Services")
            # Elevator goes to Services
            elif 'elevator' in child_name:
                for row in rows:
                    if row['ce_id'] == child_id:
                        row['parent_id'] = services_id
                report['b07_moves'].append(f"Specialty/{child['short_name']} -> Services")
            # Optional add-ons go to Special systems & options
            else:
                for row in rows:
                    if row['ce_id'] == child_id:
                        row['parent_id'] = special_id
                report['b07_moves'].append(f"Specialty/{child['short_name']} -> Special systems & options")

    # Handle Multifamily -> split children
    if 'multifamily' in l2_by_name:
        mf_node = l2_by_name['multifamily']
        mf_id = mf_node['ce_id']
        for child_id in children.get(mf_id, []):
            child = by_id.get(child_id)
            if not child:
                continue
            child_name = child['short_name'].lower()

            # Vertical transport -> Services
            if any(kw in child_name for kw in ['vertical', 'elevator']):
                for row in rows:
                    if row['ce_id'] == child_id:
                        row['parent_id'] = services_id
                report['b07_moves'].append(f"Multifamily/{child['short_name']} -> Services")
            # Everything else -> Shared program spaces
            else:
                for row in rows:
                    if row['ce_id'] == child_id:
                        row['parent_id'] = shared_id
                report['b07_moves'].append(f"Multifamily/{child['short_name']} -> Shared program spaces")

    # Delete empty old L2 nodes
    nodes_to_delete = set()
    for name in ['envelope', 'exterior', 'specialty', 'multifamily']:
        if name in l2_by_name:
            nodes_to_delete.add(l2_by_name[name]['ce_id'])

    result = [r for r in rows if r['ce_id'] not in nodes_to_delete]
    report['total_nodes_deleted'] += len(nodes_to_delete)

    # Add new nodes
    result.extend(new_nodes)

    # Update sort_order for all B07 L2
    sort_map = {
        'substructure': '1',
        'shell': '2',
        'interiors': '3',
        'services': '4',
        'special systems & options': '5',
        'shared / accessory program spaces': '6',
    }

    for row in result:
        if row.get('parent_id') == 'B07-BuildCost' and str(row.get('level')) == '2':
            name_lower = row['short_name'].lower()
            if name_lower in sort_map:
                row['sort_order'] = sort_map[name_lower]

    return result


def rebuild_b05_l2(rows: List[Dict]) -> List[Dict]:
    """Reorder B05-SiteInfra L2 for chronology + MECE."""
    global report

    by_id, children = build_tree(rows)

    # Find current B05 L2 nodes
    b05_l2_nodes = [r for r in rows if r.get('parent_id') == 'B05-SiteInfra' and str(r.get('level')) == '2']
    l2_by_name = {node['short_name'].lower(): node for node in b05_l2_nodes}

    # New L2 structure IDs
    new_l2_ids = {
        'Site preparation': 'B05-SiteInfra-01',
        'Earthwork & grading': 'B05-SiteInfra-02',
        'Stormwater & drainage': 'B05-SiteInfra-03',
        'Site utilities (wet + dry)': 'B05-SiteInfra-04',
        'Paving & transportation': 'B05-SiteInfra-05',
        'Site improvements & amenities': 'B05-SiteInfra-06',
        'Landscaping & irrigation': 'B05-SiteInfra-07',
    }

    new_nodes = []
    nodes_to_delete = set()

    # Create Site preparation (new)
    new_nodes.append({
        'ce_id': new_l2_ids['Site preparation'],
        'parent_id': 'B05-SiteInfra',
        'level': '2',
        'short_name': 'Site preparation',
        'description': '',
        'stage_id': 'Build',
        'sort_order': '1',
    })
    site_prep_id = new_l2_ids['Site preparation']

    # Earthwork -> rename and move site prep items out
    if 'earthwork' in l2_by_name:
        ew_node = l2_by_name['earthwork']
        ew_id = ew_node['ce_id']

        # Move site prep items to new Site preparation
        for child_id in children.get(ew_id, []):
            child = by_id.get(child_id)
            if child and child['short_name'].lower() in ['site prep', 'erosion control']:
                for row in rows:
                    if row['ce_id'] == child_id:
                        row['parent_id'] = site_prep_id
                report['b05_moves'].append(f"Earthwork/{child['short_name']} -> Site preparation")

        # Rename Earthwork
        for row in rows:
            if row['ce_id'] == ew_id:
                row['short_name'] = 'Earthwork & grading'
                row['sort_order'] = '2'
        report['b05_moves'].append("Earthwork -> Earthwork & grading")

    # Stormwater -> rename
    if 'stormwater' in l2_by_name:
        sw_node = l2_by_name['stormwater']
        for row in rows:
            if row['ce_id'] == sw_node['ce_id']:
                row['short_name'] = 'Stormwater & drainage'
                row['sort_order'] = '3'
        report['b05_moves'].append("Stormwater -> Stormwater & drainage")

    # Utilities -> rename
    if 'utilities' in l2_by_name:
        ut_node = l2_by_name['utilities']
        for row in rows:
            if row['ce_id'] == ut_node['ce_id']:
                row['short_name'] = 'Site utilities (wet + dry)'
                row['sort_order'] = '4'
        report['b05_moves'].append("Utilities -> Site utilities (wet + dry)")

    # Roads + Parking -> merge into Paving & transportation
    paving_id = None
    if 'roads' in l2_by_name:
        roads_node = l2_by_name['roads']
        for row in rows:
            if row['ce_id'] == roads_node['ce_id']:
                row['short_name'] = 'Paving & transportation'
                row['sort_order'] = '5'
        paving_id = roads_node['ce_id']
        report['b05_moves'].append("Roads -> Paving & transportation")

    if 'parking' in l2_by_name:
        park_node = l2_by_name['parking']
        park_id = park_node['ce_id']
        if paving_id:
            # Merge parking children into paving
            for child_id in children.get(park_id, []):
                for row in rows:
                    if row['ce_id'] == child_id:
                        row['parent_id'] = paving_id
            nodes_to_delete.add(park_id)
            report['b05_moves'].append("Parking children -> Paving & transportation")
        else:
            # Rename parking to paving
            for row in rows:
                if row['ce_id'] == park_id:
                    row['short_name'] = 'Paving & transportation'
                    row['sort_order'] = '5'
            report['b05_moves'].append("Parking -> Paving & transportation")

    # Site amenities -> rename
    if 'site amenities' in l2_by_name:
        sa_node = l2_by_name['site amenities']
        for row in rows:
            if row['ce_id'] == sa_node['ce_id']:
                row['short_name'] = 'Site improvements & amenities'
                row['sort_order'] = '6'
        report['b05_moves'].append("Site amenities -> Site improvements & amenities")

    # Landscaping -> rename
    if 'landscaping' in l2_by_name:
        ls_node = l2_by_name['landscaping']
        for row in rows:
            if row['ce_id'] == ls_node['ce_id']:
                row['short_name'] = 'Landscaping & irrigation'
                row['sort_order'] = '7'
        report['b05_moves'].append("Landscaping -> Landscaping & irrigation")

    # Remove deleted nodes
    result = [r for r in rows if r['ce_id'] not in nodes_to_delete]
    report['total_nodes_deleted'] += len(nodes_to_delete)

    # Add new nodes
    result.extend(new_nodes)

    return result


def fix_b06_softcosts(rows: List[Dict]) -> List[Dict]:
    """Fix B06-SoftCosts misplaced items."""
    global report

    by_id, children = build_tree(rows)

    # Find B06 L2 nodes
    b06_l2_nodes = [r for r in rows if r.get('parent_id') == 'B06-SoftCosts' and str(r.get('level')) == '2']

    new_nodes = []

    for l2_node in b06_l2_nodes:
        name = l2_node['short_name'].lower()
        l2_id = l2_node['ce_id']

        if name == 'accounting':
            # Rename to "Project accounting"
            for row in rows:
                if row['ce_id'] == l2_id:
                    row['short_name'] = 'Project accounting'
            report['b06_moves'].append("Accounting -> Project accounting")
            report['total_nodes_renamed'] += 1

        elif name == 'testing':
            l2_children = children.get(l2_id, [])

            # Create two new L3 nodes under Testing
            field_testing_id = f"{l2_id}-field"
            commissioning_id = f"{l2_id}-comm"

            existing_ids = {r['ce_id'] for r in rows}

            if field_testing_id not in existing_ids:
                new_nodes.append({
                    'ce_id': field_testing_id,
                    'parent_id': l2_id,
                    'level': '3',
                    'short_name': 'Field / materials testing',
                    'description': '',
                    'stage_id': 'Build',
                    'sort_order': '1',
                })

            if commissioning_id not in existing_ids:
                new_nodes.append({
                    'ce_id': commissioning_id,
                    'parent_id': l2_id,
                    'level': '3',
                    'short_name': 'Commissioning',
                    'description': '',
                    'stage_id': 'Build',
                    'sort_order': '2',
                })

            # Reparent existing children
            for child_id in l2_children:
                child = by_id.get(child_id)
                if not child:
                    continue
                child_name = child['short_name'].lower()

                # Commissioning-related
                if any(kw in child_name for kw in ['commissioning', 'tab', 'functional', 'startup', 'balance']):
                    for row in rows:
                        if row['ce_id'] == child_id:
                            row['parent_id'] = commissioning_id
                            row['level'] = '4'
                    report['b06_moves'].append(f"Testing/{child['short_name']} -> Commissioning")
                else:
                    # Default to Field/materials testing
                    for row in rows:
                        if row['ce_id'] == child_id:
                            row['parent_id'] = field_testing_id
                            row['level'] = '4'
                    report['b06_moves'].append(f"Testing/{child['short_name']} -> Field / materials testing")

    rows.extend(new_nodes)
    return rows


def add_phase_column(rows: List[Dict]) -> List[Dict]:
    """Add phase attribute column."""

    phase_map = {
        'B01-Land': 'acquisition',
        'B02-PreDev': 'entitlement',
        'B03-Permits': 'entitlement',
        'B04-Utilities': 'entitlement',
        'B05-SiteInfra': 'construction',
        'B06-SoftCosts': 'crosscutting',
        'B07-BuildCost': 'construction',
        'B08-TempIndirect': 'construction',
        'B09-RiskIns': 'crosscutting',
        'B10-Finance': 'crosscutting',
        'B11-Overhead': 'crosscutting',
        'B12-Contingency': 'crosscutting',
        'B13-Return': 'crosscutting',
        'O01-Utilities': 'operations',
        'O02-Maint': 'operations',
        'O03-PropIns': 'operations',
        'O04-Taxes': 'operations',
        'O05-HOA': 'operations',
        'F01-Principal': 'occupant_finance',
        'F02-Interest': 'occupant_finance',
        'F03-PMI': 'occupant_finance',
        'F04-ClosingCosts': 'occupant_finance',
    }

    by_id = {r['ce_id']: r for r in rows}

    def get_l1_parent(ce_id):
        row = by_id.get(ce_id)
        if not row:
            return None
        if str(row.get('level')) == '1':
            return ce_id
        parent_id = row.get('parent_id')
        if parent_id:
            return get_l1_parent(parent_id)
        return None

    for row in rows:
        ce_id = row['ce_id']
        if ce_id in phase_map:
            row['phase'] = phase_map[ce_id]
        else:
            l1_parent = get_l1_parent(ce_id)
            if l1_parent and l1_parent in phase_map:
                row['phase'] = phase_map[l1_parent]
            else:
                row['phase'] = 'crosscutting'

    return rows


def add_node_class_column(rows: List[Dict]) -> List[Dict]:
    """Add node_class classification tag."""

    by_id = {r['ce_id']: r for r in rows}

    def get_l1_parent(ce_id):
        row = by_id.get(ce_id)
        if not row:
            return None
        if str(row.get('level')) == '1':
            return ce_id
        parent_id = row.get('parent_id')
        if parent_id:
            return get_l1_parent(parent_id)
        return None

    l1_class = {
        'B01-Land': 'system',
        'B02-PreDev': 'system',
        'B03-Permits': 'regulatory',
        'B04-Utilities': 'regulatory',
        'B05-SiteInfra': 'system',
        'B06-SoftCosts': 'system',
        'B07-BuildCost': 'system',
        'B08-TempIndirect': 'system',
        'B09-RiskIns': 'overhead',
        'B10-Finance': 'finance',
        'B11-Overhead': 'overhead',
        'B12-Contingency': 'overhead',
        'B13-Return': 'finance',
        'O01-Utilities': 'system',
        'O02-Maint': 'system',
        'O03-PropIns': 'overhead',
        'O04-Taxes': 'regulatory',
        'O05-HOA': 'system',
        'F01-Principal': 'finance',
        'F02-Interest': 'finance',
        'F03-PMI': 'finance',
        'F04-ClosingCosts': 'finance',
    }

    b07_l2_class = {
        'substructure': 'system',
        'shell': 'system',
        'interiors': 'system',
        'services': 'system',
        'special systems & options': 'option',
        'shared / accessory program spaces': 'program',
    }

    for row in rows:
        ce_id = row['ce_id']
        parent_id = row.get('parent_id', '')
        short_name = row.get('short_name', '').lower()
        level = str(row.get('level', ''))

        # B07 L2 specific
        if parent_id == 'B07-BuildCost' and level == '2':
            row['node_class'] = b07_l2_class.get(short_name, 'system')
        elif ce_id in l1_class:
            row['node_class'] = l1_class[ce_id]
        else:
            # Check if descendant of B07
            l1_parent = get_l1_parent(ce_id)
            if l1_parent == 'B07-BuildCost':
                # Find L2 ancestor
                current = row
                while current and str(current.get('level')) != '2':
                    p_id = current.get('parent_id')
                    current = by_id.get(p_id)

                if current and str(current.get('level')) == '2':
                    l2_name = current.get('short_name', '').lower()
                    row['node_class'] = b07_l2_class.get(l2_name, 'system')
                else:
                    row['node_class'] = 'system'
            elif l1_parent and l1_parent in l1_class:
                row['node_class'] = l1_class[l1_parent]
            else:
                row['node_class'] = 'system'

    return rows


def normalize_sort_orders(rows: List[Dict]) -> List[Dict]:
    """Normalize sort_order within each sibling group."""
    by_parent = defaultdict(list)
    for row in rows:
        by_parent[row.get('parent_id', '')].append(row)

    for parent_id, siblings in by_parent.items():
        siblings.sort(key=lambda r: (int(r.get('sort_order') or 0), r.get('short_name', '')))
        for i, row in enumerate(siblings, 1):
            row['sort_order'] = str(i)

    return rows


def validate_tree(rows: List[Dict]) -> List[str]:
    """Validate tree integrity."""
    errors = []
    by_id = {r['ce_id']: r for r in rows}

    for row in rows:
        parent_id = row.get('parent_id')
        if parent_id and parent_id not in by_id:
            errors.append(f"Dangling parent_id: {row['ce_id']} -> {parent_id}")

    return errors


def generate_report(rows: List[Dict]) -> str:
    """Generate migration report."""
    global report

    lines = [
        "=" * 60,
        "COST ELEMENTS MIGRATION REPORT",
        "=" * 60,
        "",
        f"Total nodes deleted: {report['total_nodes_deleted']}",
        f"Total nodes reparented: {report['total_nodes_reparented']}",
        f"Total nodes renamed: {report['total_nodes_renamed']}",
        "",
        "B07 MOVES:",
    ]

    for move in report['b07_moves']:
        lines.append(f"  - {move}")

    lines.append("")
    lines.append("B05 MOVES:")
    for move in report['b05_moves']:
        lines.append(f"  - {move}")

    lines.append("")
    lines.append("B06 MOVES:")
    for move in report['b06_moves']:
        lines.append(f"  - {move}")

    errors = validate_tree(rows)
    lines.append("")
    lines.append("VALIDATION:")
    if errors:
        for err in errors:
            lines.append(f"  ERROR: {err}")
    else:
        lines.append("  All validations passed!")

    by_level = defaultdict(int)
    for row in rows:
        by_level[str(row.get('level', '?'))] += 1

    lines.append("")
    lines.append("FINAL COUNTS BY LEVEL:")
    for level in sorted(by_level.keys()):
        lines.append(f"  L{level}: {by_level[level]}")
    lines.append(f"  Total: {len(rows)}")

    # B07 L2 check
    b07_l2 = [r for r in rows if r.get('parent_id') == 'B07-BuildCost' and str(r.get('level')) == '2']
    lines.append("")
    lines.append(f"B07 L2 NODES ({len(b07_l2)} found, should be 6):")
    for node in sorted(b07_l2, key=lambda x: int(x.get('sort_order', 0))):
        lines.append(f"  {node.get('sort_order', '?')}. {node['ce_id']}: {node['short_name']}")

    # B05 L2 check
    b05_l2 = [r for r in rows if r.get('parent_id') == 'B05-SiteInfra' and str(r.get('level')) == '2']
    lines.append("")
    lines.append(f"B05 L2 NODES ({len(b05_l2)} found, should be 7):")
    for node in sorted(b05_l2, key=lambda x: int(x.get('sort_order', 0))):
        lines.append(f"  {node.get('sort_order', '?')}. {node['ce_id']}: {node['short_name']}")

    return "\n".join(lines)


def main():
    input_file = '/Users/emikysa/Claude/HousingAffordabilityFramework/cost_elements_unified.tsv'
    output_file = input_file
    report_file = '/Users/emikysa/Claude/HousingAffordabilityFramework/migration_report.txt'

    print("Loading TSV...")
    headers, rows = load_tsv(input_file)
    print(f"Loaded {len(rows)} rows")

    # Add new columns
    if 'phase' not in headers:
        headers.append('phase')
    if 'node_class' not in headers:
        headers.append('node_class')

    for row in rows:
        row.setdefault('phase', '')
        row.setdefault('node_class', '')

    print("Step 1: Removing 'Total' pseudo-nodes...")
    rows = remove_total_nodes(rows)
    print(f"  Rows after: {len(rows)}")

    print("Step 2: Rebuilding B07-BuildCost L2...")
    rows = rebuild_b07_l2(rows)
    print(f"  Rows after: {len(rows)}")

    print("Step 3: Reordering B05-SiteInfra L2...")
    rows = rebuild_b05_l2(rows)
    print(f"  Rows after: {len(rows)}")

    print("Step 4: Fixing B06-SoftCosts...")
    rows = fix_b06_softcosts(rows)
    print(f"  Rows after: {len(rows)}")

    print("Step 5: Adding phase column...")
    rows = add_phase_column(rows)

    print("Step 6: Adding node_class column...")
    rows = add_node_class_column(rows)

    print("Step 7: Normalizing sort orders...")
    rows = normalize_sort_orders(rows)

    print("Generating report...")
    report_text = generate_report(rows)
    print(report_text)

    print(f"\nSaving report to {report_file}...")
    with open(report_file, 'w') as f:
        f.write(report_text)

    print(f"Saving transformed TSV to {output_file}...")
    save_tsv(output_file, headers, rows)

    print("Done!")


if __name__ == '__main__':
    main()
