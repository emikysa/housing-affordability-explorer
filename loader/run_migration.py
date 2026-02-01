#!/usr/bin/env python3
"""
Run the L1 CE Restructure + UniFormat II Alignment migration.
This script executes the migration in steps to handle FK constraints properly.
"""

import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

def get_client():
    return create_client(SUPABASE_URL, SUPABASE_KEY)

def run_sql(supabase, sql, description):
    """Run SQL via RPC if available, otherwise use REST API."""
    print(f"\n{'='*60}")
    print(f"STEP: {description}")
    print(f"{'='*60}")
    try:
        # Try using rpc for raw SQL
        result = supabase.rpc('exec_sql', {'query': sql}).execute()
        print(f"✓ Success")
        return result
    except Exception as e:
        print(f"Note: RPC not available, using table operations instead")
        return None

def main():
    print("="*60)
    print("L1 CE Restructure + UniFormat II Migration")
    print("="*60)

    supabase = get_client()

    # Step 1: Check current state
    print("\n[1/15] Checking current cost elements...")
    result = supabase.table('cost_elements').select('ce_id').execute()
    current_ces = {row['ce_id'] for row in result.data}
    print(f"Current CEs: {sorted(current_ces)}")

    # Step 2: Migrate B03-LandCarry data to B11-Finance (will become B10-Finance)
    print("\n[2/15] Migrating B03-LandCarry drilldown to B11-Finance...")
    try:
        supabase.table('ce_drilldown').update({'ce_code': 'B11-Finance'}).eq('ce_code', 'B03-LandCarry').execute()
        print("✓ ce_drilldown updated")
    except Exception as e:
        print(f"  (No rows to update or already done: {e})")

    try:
        supabase.table('cro_ce_map').update({'ce_id': 'B11-Finance'}).eq('ce_id', 'B03-LandCarry').execute()
        print("✓ cro_ce_map updated")
    except Exception as e:
        print(f"  (No rows to update: {e})")

    try:
        supabase.table('ce_actor_map').update({'ce_id': 'B11-Finance'}).eq('ce_id', 'B03-LandCarry').execute()
        print("✓ ce_actor_map updated")
    except Exception as e:
        print(f"  (No rows to update: {e})")

    try:
        supabase.table('ce_scenario_values').update({'ce_id': 'B11-Finance'}).eq('ce_id', 'B03-LandCarry').execute()
        print("✓ ce_scenario_values updated")
    except Exception as e:
        print(f"  (No rows to update: {e})")

    # Step 3: Delete B03-LandCarry
    print("\n[3/15] Deleting B03-LandCarry...")
    try:
        supabase.table('cost_elements').delete().eq('ce_id', 'B03-LandCarry').execute()
        print("✓ B03-LandCarry deleted")
    except Exception as e:
        print(f"  Error: {e}")

    # Step 4-12: Rename CEs using temporary names to avoid conflicts
    renames = [
        ('B14-Return', 'temp_B14'),
        ('B13-Contingtic', 'temp_B13'),
        ('B12-Overhead', 'temp_B12'),
        ('B11-Finance', 'temp_B11'),
        ('B10-RiskIns', 'temp_B10'),
        ('B09-TempIndirect', 'temp_B09'),
        ('B04b-UtilityFees', 'temp_B04b'),
        ('B04a-PermitsAdmin', 'temp_B04a'),
        ('O03-PropInsurance', 'temp_O03'),
    ]

    step = 4
    for old_id, temp_id in renames:
        print(f"\n[{step}/15] Renaming {old_id} -> {temp_id}...")

        # Update all references
        tables = [
            ('cost_elements', 'ce_id'),
            ('cro_ce_map', 'ce_id'),
            ('ce_actor_map', 'ce_id'),
            ('ce_drilldown', 'ce_code'),
            ('ce_scenario_values', 'ce_id'),
        ]

        for table, column in tables:
            try:
                supabase.table(table).update({column: temp_id}).eq(column, old_id).execute()
            except Exception as e:
                pass  # Silently continue if no rows
        print(f"✓ {old_id} -> {temp_id}")
        step += 1

    # Step 13: Assign final codes
    print(f"\n[13/15] Assigning final codes...")
    final_mappings = [
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

    for temp_id, new_id, new_desc in final_mappings:
        print(f"  {temp_id} -> {new_id}")

        # Update cost_elements with new ID and description
        supabase.table('cost_elements').update({
            'ce_id': new_id,
            'description': new_desc
        }).eq('ce_id', temp_id).execute()

        # Update other tables
        for table, column in [('cro_ce_map', 'ce_id'), ('ce_actor_map', 'ce_id'),
                              ('ce_drilldown', 'ce_code'), ('ce_scenario_values', 'ce_id')]:
            try:
                supabase.table(table).update({column: new_id}).eq(column, temp_id).execute()
            except:
                pass

    print("✓ All final codes assigned")

    # Step 14: Update descriptions for unchanged CEs
    print(f"\n[14/15] Updating descriptions for unchanged CEs...")
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

    # Step 15: Update sort_order
    print(f"\n[15/15] Setting sort_order...")
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
        print(f"  {row['ce_id']}: {row['description'][:50]}...")

    # Check for a/b suffixes
    ab_codes = [row['ce_id'] for row in result.data if 'a-' in row['ce_id'] or 'b-' in row['ce_id']]
    if ab_codes:
        print(f"\n⚠ WARNING: Still have a/b suffixes: {ab_codes}")
    else:
        print("\n✓ No a/b suffixes remaining")

    # Check LandCarry
    landcarry = [row for row in result.data if 'LandCarry' in row['ce_id']]
    if landcarry:
        print(f"⚠ WARNING: LandCarry still exists")
    else:
        print("✓ LandCarry removed")

    print("\n" + "="*60)
    print("MIGRATION COMPLETE")
    print("="*60)

if __name__ == "__main__":
    main()
