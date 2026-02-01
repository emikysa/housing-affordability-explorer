#!/usr/bin/env python3
"""
Fix the migration - use delete + insert for primary key changes.
"""

import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

def get_client():
    return create_client(SUPABASE_URL, SUPABASE_KEY)

def rename_ce(supabase, old_id, new_id, new_desc):
    """Rename a CE by deleting and recreating with new ID."""
    print(f"  Renaming {old_id} -> {new_id}")

    # Get the current record
    result = supabase.table('cost_elements').select('*').eq('ce_id', old_id).execute()
    if not result.data:
        print(f"    (not found, skipping)")
        return False

    row = result.data[0]

    # Update foreign key references FIRST
    for table, column in [('cro_ce_map', 'ce_id'), ('ce_actor_map', 'ce_id'),
                          ('ce_drilldown', 'ce_code'), ('ce_scenario_values', 'ce_id')]:
        try:
            supabase.table(table).update({column: new_id}).eq(column, old_id).execute()
        except Exception as e:
            pass

    # Delete old record
    supabase.table('cost_elements').delete().eq('ce_id', old_id).execute()

    # Insert new record with new ID
    new_record = {
        'ce_id': new_id,
        'stage_id': row.get('stage_id'),
        'description': new_desc,
        'notes': row.get('notes'),
        'assumptions': row.get('assumptions'),
        'estimate': row.get('estimate'),
        'annual_estimate': row.get('annual_estimate'),
        'unit': row.get('unit'),
        'cadence': row.get('cadence'),
        'is_computed': row.get('is_computed', False),
        'sort_order': row.get('sort_order'),
    }
    # Remove None values
    new_record = {k: v for k, v in new_record.items() if v is not None}

    supabase.table('cost_elements').insert(new_record).execute()
    print(f"    ✓ Done")
    return True

def main():
    print("="*60)
    print("Fixing L1 CE Migration (delete+insert for PK changes)")
    print("="*60)

    supabase = get_client()

    # Check current state
    result = supabase.table('cost_elements').select('ce_id').execute()
    current_ces = sorted([row['ce_id'] for row in result.data])
    print(f"\nCurrent CEs: {current_ces}")

    # Define all needed renames
    renames_needed = [
        ('B04a-PermitsAdmin', 'B03-Permits', 'Permits, plan review, and administrative fees'),
        ('B04b-UtilityFees', 'B04-Utilities', 'Utility connection, tap, and capacity fees'),
        ('B09-TempIndirect', 'B08-TempIndirect', 'Temporary, indirect, and jobsite costs'),
        ('B10-RiskIns', 'B09-RiskIns', 'Construction insurance, bonding, and third-party risk'),
        ('B11-Finance', 'B10-Finance', 'Development financing & capital costs'),
        ('B12-Overhead', 'B11-Overhead', 'Developer overhead, sales, and marketing'),
        ('B13-Contingtic', 'B12-Contingency', 'Risk, uncertainty, and legal contingency'),
        ('B14-Return', 'B13-Return', 'Required developer return'),
        ('O03-PropInsurance', 'O03-PropIns', 'Operating property insurance'),
        # Also handle any temp_ codes left over
        ('temp_B04a', 'B03-Permits', 'Permits, plan review, and administrative fees'),
        ('temp_B04b', 'B04-Utilities', 'Utility connection, tap, and capacity fees'),
        ('temp_B09', 'B08-TempIndirect', 'Temporary, indirect, and jobsite costs'),
        ('temp_B10', 'B09-RiskIns', 'Construction insurance, bonding, and third-party risk'),
        ('temp_B11', 'B10-Finance', 'Development financing & capital costs'),
        ('temp_B12', 'B11-Overhead', 'Developer overhead, sales, and marketing'),
        ('temp_B13', 'B12-Contingency', 'Risk, uncertainty, and legal contingency'),
        ('temp_B14', 'B13-Return', 'Required developer return'),
        ('temp_O03', 'O03-PropIns', 'Operating property insurance'),
    ]

    print("\nPerforming renames...")
    for old_id, new_id, new_desc in renames_needed:
        if old_id in current_ces:
            rename_ce(supabase, old_id, new_id, new_desc)

    # Update descriptions for unchanged CEs
    print("\nUpdating descriptions...")
    desc_updates = [
        ('B01-Land', 'Land acquisition & assemblage'),
        ('B02-PreDev', 'Pre-development, entitlement, and approvals'),
        ('B05-SiteInfra', 'Site work & infrastructure construction'),
        ('B06-SoftCosts', 'Professional, consulting, and admin soft costs'),
        ('B07-BuildCost', 'Hard construction (materials, labor, subcontractor O&P)'),
    ]
    for ce_id, desc in desc_updates:
        supabase.table('cost_elements').update({'description': desc}).eq('ce_id', ce_id).execute()
        print(f"  ✓ {ce_id}")

    # Update sort orders
    print("\nSetting sort_order...")
    sort_orders = {
        'B01-Land': 1, 'B02-PreDev': 2, 'B03-Permits': 3, 'B04-Utilities': 4,
        'B05-SiteInfra': 5, 'B06-SoftCosts': 6, 'B07-BuildCost': 7, 'B08-TempIndirect': 8,
        'B09-RiskIns': 9, 'B10-Finance': 10, 'B11-Overhead': 11, 'B12-Contingency': 12,
        'B13-Return': 13,
        'O01-Utilities': 14, 'O02-Maint': 15, 'O03-PropIns': 16, 'O04-Taxes': 17, 'O05-HOA': 18,
        'F01-Principal': 19, 'F02-Interest': 20, 'F03-PMI': 21, 'F04-ClosingCosts': 22,
    }
    for ce_id, order in sort_orders.items():
        try:
            supabase.table('cost_elements').update({'sort_order': order}).eq('ce_id', ce_id).execute()
        except:
            pass
    print("✓ Sort orders updated")

    # Verify
    print("\n" + "="*60)
    print("VERIFICATION")
    print("="*60)

    result = supabase.table('cost_elements').select('ce_id, description, sort_order').order('sort_order').execute()
    print(f"\nFinal cost elements ({len(result.data)} total):")
    for row in result.data:
        print(f"  [{row.get('sort_order', '?'):2}] {row['ce_id']}: {row['description'][:45]}...")

    # Check for issues
    ab_codes = [row['ce_id'] for row in result.data if 'a-' in row['ce_id'] or 'b-' in row['ce_id']]
    temp_codes = [row['ce_id'] for row in result.data if row['ce_id'].startswith('temp_')]
    landcarry = [row for row in result.data if 'LandCarry' in row['ce_id']]

    print("\n--- CHECKS ---")
    if ab_codes:
        print(f"⚠ a/b suffixes remaining: {ab_codes}")
    else:
        print("✓ No a/b suffixes")

    if temp_codes:
        print(f"⚠ temp_ codes remaining: {temp_codes}")
    else:
        print("✓ No temp_ codes")

    if landcarry:
        print("⚠ LandCarry still exists")
    else:
        print("✓ LandCarry removed")

    b_codes = sorted([r['ce_id'] for r in result.data if r['ce_id'].startswith('B')])
    print(f"\nB-codes: {b_codes}")
    expected_b = ['B01-Land', 'B02-PreDev', 'B03-Permits', 'B04-Utilities', 'B05-SiteInfra',
                  'B06-SoftCosts', 'B07-BuildCost', 'B08-TempIndirect', 'B09-RiskIns',
                  'B10-Finance', 'B11-Overhead', 'B12-Contingency', 'B13-Return']
    if b_codes == expected_b:
        print("✓ B-codes match expected")
    else:
        print(f"⚠ Expected: {expected_b}")

    print("\n" + "="*60)
    print("MIGRATION FIX COMPLETE")
    print("="*60)

if __name__ == "__main__":
    main()
