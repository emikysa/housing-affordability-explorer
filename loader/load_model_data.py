#!/usr/bin/env python3
"""
Load cost and finance model data from CSV files.

This script demonstrates the data flow:
1. Load a cost model CSV → cost_time_models + cost_entries tables
2. Load a finance model CSV → finance_models + finance_assumptions tables
3. Calculate carrying costs using the loaded data

Usage:
    python load_model_data.py --cost sample_data/sample_cost_model.csv --cost-name "Sample SFH Project"
    python load_model_data.py --finance sample_data/sample_finance_model.csv --finance-name "2024 Market Rates"
    python load_model_data.py --calculate <cost_model_id> <finance_model_id>
"""

import os
import csv
import argparse
from datetime import date
from decimal import Decimal
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)


def load_cost_model(csv_path: str, model_name: str, description: str = None) -> str:
    """
    Load a cost model from CSV file.

    CSV columns (required: ce_id, date_paid, amount_total):
        ce_id, date_paid, amount_total, amount_material, labor_hours,
        labor_rate, amount_labor, amount_op_other, notes

    Returns the created model ID.
    """
    print(f"\n{'='*60}")
    print(f"LOADING COST MODEL: {model_name}")
    print(f"{'='*60}")
    print(f"Source: {csv_path}")

    # Read CSV
    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        rows = list(reader)

    print(f"Found {len(rows)} cost entries")

    # Validate CE codes exist
    print("\nValidating CE codes...")
    ce_ids = set(row['ce_id'] for row in rows)
    result = supabase.table('cost_elements_unified').select('ce_id').execute()
    valid_ce_ids = set(r['ce_id'] for r in result.data)

    invalid_ce_ids = ce_ids - valid_ce_ids
    if invalid_ce_ids:
        print(f"  WARNING: Invalid CE codes will be skipped: {invalid_ce_ids}")

    valid_rows = [r for r in rows if r['ce_id'] in valid_ce_ids]
    print(f"  Valid entries: {len(valid_rows)}")

    # Determine project date range from entries
    dates = [date.fromisoformat(r['date_paid']) for r in valid_rows]
    project_start = min(dates)
    project_end = max(dates)
    print(f"  Project period: {project_start} to {project_end}")

    # Calculate totals
    total_cost = sum(Decimal(r['amount_total']) for r in valid_rows)
    print(f"  Total cost: ${total_cost:,.2f}")

    # Create cost_time_model record
    print("\nCreating cost_time_model...")
    model_result = supabase.table('cost_time_models').insert({
        'name': model_name,
        'description': description or f"Loaded from {os.path.basename(csv_path)}",
        'project_start_date': str(project_start),
        'project_end_date': str(project_end),
        'source_file': os.path.basename(csv_path),
        'is_baseline': False,
        'is_public': True
    }).execute()

    model_id = model_result.data[0]['id']
    print(f"  Created model: {model_id}")

    # Prepare cost entries
    print("\nInserting cost entries...")
    entries = []
    for row in valid_rows:
        entry = {
            'cost_time_model_id': model_id,
            'ce_id': row['ce_id'],
            'date_paid': row['date_paid'],
            'amount_total': float(row['amount_total']),
        }

        # Optional fields - check for non-empty values
        if row.get('amount_material') and row['amount_material'].strip():
            entry['amount_material'] = float(row['amount_material'])
        if row.get('labor_hours') and row['labor_hours'].strip():
            entry['labor_hours'] = float(row['labor_hours'])
        if row.get('labor_rate') and row['labor_rate'].strip():
            entry['labor_rate'] = float(row['labor_rate'])
        if row.get('amount_labor') and row['amount_labor'].strip():
            entry['amount_labor'] = float(row['amount_labor'])
        if row.get('amount_op_other') and row['amount_op_other'].strip():
            entry['amount_op_other'] = float(row['amount_op_other'])
        if row.get('notes') and row['notes'].strip():
            entry['notes'] = row['notes']

        entries.append(entry)

    # Insert in batches
    batch_size = 50
    for i in range(0, len(entries), batch_size):
        batch = entries[i:i+batch_size]
        supabase.table('cost_entries').insert(batch).execute()
        print(f"  Inserted {min(i+batch_size, len(entries))}/{len(entries)} entries")

    print(f"\n✓ Cost model loaded successfully!")
    print(f"  Model ID: {model_id}")
    print(f"  Model Name: {model_name}")
    print(f"  Entries: {len(entries)}")
    print(f"  Total: ${total_cost:,.2f}")

    return model_id


def load_finance_model(csv_path: str, model_name: str, description: str = None) -> str:
    """
    Load a finance model from CSV file.

    CSV columns:
        phase, annual_rate, compound_annually, notes

    Returns the created model ID.
    """
    print(f"\n{'='*60}")
    print(f"LOADING FINANCE MODEL: {model_name}")
    print(f"{'='*60}")
    print(f"Source: {csv_path}")

    # Read CSV
    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        rows = list(reader)

    print(f"Found {len(rows)} rate assumptions")

    # Calculate default rate (average or use crosscutting)
    rates = [float(r['annual_rate']) for r in rows]
    default_rate = next((float(r['annual_rate']) for r in rows if r['phase'] == 'crosscutting'), sum(rates)/len(rates))

    # Create finance_model record
    print("\nCreating finance_model...")
    model_result = supabase.table('finance_models').insert({
        'name': model_name,
        'description': description or f"Loaded from {os.path.basename(csv_path)}",
        'default_annual_rate': default_rate,
        'is_baseline': False,
        'is_public': True
    }).execute()

    model_id = model_result.data[0]['id']
    print(f"  Created model: {model_id}")

    # Insert assumptions
    print("\nInserting finance assumptions...")
    assumptions = []
    for row in rows:
        assumption = {
            'finance_model_id': model_id,
            'phase': row['phase'],
            'annual_rate': float(row['annual_rate']),
            'compound_annually': row.get('compound_annually', 'true').lower() == 'true',
        }
        if row.get('notes'):
            assumption['notes'] = row['notes']
        assumptions.append(assumption)

    supabase.table('finance_assumptions').insert(assumptions).execute()

    print(f"\n✓ Finance model loaded successfully!")
    print(f"  Model ID: {model_id}")
    print(f"  Model Name: {model_name}")
    print(f"  Phases configured: {len(assumptions)}")
    print(f"  Default rate: {default_rate*100:.1f}%")

    # Show rate summary
    print("\n  Rates by phase:")
    for row in rows:
        print(f"    {row['phase']:20s}: {float(row['annual_rate'])*100:.1f}%")

    return model_id


def list_models():
    """List all available cost and finance models."""
    print("\n" + "="*60)
    print("AVAILABLE MODELS")
    print("="*60)

    print("\nCOST/TIME MODELS:")
    result = supabase.table('cost_time_models').select('id, name, project_start_date, project_end_date, is_baseline').execute()
    if result.data:
        for m in result.data:
            baseline = " (baseline)" if m['is_baseline'] else ""
            dates = f"{m['project_start_date']} to {m['project_end_date']}" if m['project_start_date'] else "no dates"
            print(f"  {m['id']}")
            print(f"    {m['name']}{baseline} [{dates}]")
    else:
        print("  (none)")

    # Count entries per model
    print("\n  Entry counts:")
    for m in result.data:
        count_result = supabase.table('cost_entries').select('id', count='exact').eq('cost_time_model_id', m['id']).execute()
        print(f"    {m['name']}: {count_result.count} entries")

    print("\nFINANCE MODELS:")
    result = supabase.table('finance_models').select('id, name, default_annual_rate, is_baseline').execute()
    if result.data:
        for m in result.data:
            baseline = " (baseline)" if m['is_baseline'] else ""
            rate = f"{float(m['default_annual_rate'])*100:.1f}%" if m['default_annual_rate'] else "varies"
            print(f"  {m['id']}")
            print(f"    {m['name']}{baseline} [default: {rate}]")
    else:
        print("  (none)")


def calculate_and_display(cost_model_id: str, finance_model_id: str):
    """Calculate and display carrying costs."""
    from calculate_carrying_costs import calculate_model_carrying_costs

    # Get model names
    cost_result = supabase.table('cost_time_models').select('name').eq('id', cost_model_id).execute()
    finance_result = supabase.table('finance_models').select('name').eq('id', finance_model_id).execute()

    cost_name = cost_result.data[0]['name'] if cost_result.data else cost_model_id
    finance_name = finance_result.data[0]['name'] if finance_result.data else finance_model_id

    print(f"\n{'='*60}")
    print(f"CARRYING COST CALCULATION")
    print(f"{'='*60}")
    print(f"Cost Model:    {cost_name}")
    print(f"Finance Model: {finance_name}")

    result = calculate_model_carrying_costs(cost_model_id, finance_model_id)

    print(f"\nProject Period: {result['project_start']} to {result['project_end']}")
    print(f"Cost Entries:   {result['entry_count']}")

    print(f"\n{'='*40}")
    print(f"{'SUMMARY':^40}")
    print(f"{'='*40}")
    print(f"  Base Cost:         ${result['total_base_cost']:>15,.2f}")
    print(f"  Carrying Cost:     ${result['total_carrying_cost']:>15,.2f}")
    print(f"                     {'-'*17}")
    print(f"  TOTAL:             ${result['total_with_carrying']:>15,.2f}")
    print(f"  Carrying %:        {result['carrying_cost_pct']:>15.1f}%")

    print(f"\n{'='*40}")
    print(f"{'BY PHASE':^40}")
    print(f"{'='*40}")
    for phase, vals in sorted(result['by_phase'].items()):
        pct = (vals['carrying'] / vals['base'] * 100) if vals['base'] > 0 else 0
        print(f"  {phase:20s}")
        print(f"    Base:     ${vals['base']:>12,.2f}")
        print(f"    Carrying: ${vals['carrying']:>12,.2f} ({pct:.1f}%)")


def main():
    parser = argparse.ArgumentParser(description='Load cost and finance model data')
    parser.add_argument('--cost', help='Path to cost model CSV file')
    parser.add_argument('--cost-name', help='Name for the cost model')
    parser.add_argument('--finance', help='Path to finance model CSV file')
    parser.add_argument('--finance-name', help='Name for the finance model')
    parser.add_argument('--list', action='store_true', help='List all models')
    parser.add_argument('--calculate', nargs=2, metavar=('COST_ID', 'FINANCE_ID'),
                        help='Calculate carrying costs for given model IDs')

    args = parser.parse_args()

    if args.list:
        list_models()
        return

    if args.cost:
        if not args.cost_name:
            args.cost_name = os.path.splitext(os.path.basename(args.cost))[0]
        load_cost_model(args.cost, args.cost_name)

    if args.finance:
        if not args.finance_name:
            args.finance_name = os.path.splitext(os.path.basename(args.finance))[0]
        load_finance_model(args.finance, args.finance_name)

    if args.calculate:
        calculate_and_display(args.calculate[0], args.calculate[1])

    if not any([args.cost, args.finance, args.list, args.calculate]):
        parser.print_help()
        print("\n" + "="*60)
        print("QUICK START EXAMPLES")
        print("="*60)
        print("\n1. Load sample cost model:")
        print("   python load_model_data.py --cost sample_data/sample_cost_model.csv --cost-name 'Sample SFH'")
        print("\n2. Load sample finance model:")
        print("   python load_model_data.py --finance sample_data/sample_finance_model.csv --finance-name '2024 Rates'")
        print("\n3. List all models:")
        print("   python load_model_data.py --list")
        print("\n4. Calculate carrying costs:")
        print("   python load_model_data.py --calculate <cost_model_id> <finance_model_id>")


if __name__ == "__main__":
    main()
