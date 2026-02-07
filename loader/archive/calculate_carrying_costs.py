#!/usr/bin/env python3
"""
Calculate carrying costs (cost of capital) for a cost/time model.

This module computes the time-value-of-money cost based on:
1. When costs were paid (from cost_entries)
2. Cost of capital rates by phase (from finance_assumptions)

The calculation:
- For each cost entry, track cumulative spend
- Calculate carrying cost from payment date to project end
- Apply phase-specific rates with annual compounding
"""

import os
from datetime import date, timedelta
from decimal import Decimal
from typing import Optional
from collections import defaultdict
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)


def get_finance_rates(finance_model_id: str) -> dict:
    """
    Get cost of capital rates by phase for a finance model.
    Returns dict: {phase: {'rate': Decimal, 'compound': bool}}
    """
    result = supabase.table('finance_assumptions').select('*').eq(
        'finance_model_id', finance_model_id
    ).execute()

    rates = {}
    default_rate = Decimal('0.08')  # Fallback

    # Get default rate from model
    model_result = supabase.table('finance_models').select('default_annual_rate').eq(
        'id', finance_model_id
    ).execute()
    if model_result.data and model_result.data[0]['default_annual_rate']:
        default_rate = Decimal(str(model_result.data[0]['default_annual_rate']))

    for row in result.data:
        rates[row['phase']] = {
            'rate': Decimal(str(row['annual_rate'])),
            'compound': row['compound_annually']
        }

    # Add default for any missing phases
    rates['_default'] = {'rate': default_rate, 'compound': True}

    return rates


def get_cost_entries(cost_time_model_id: str) -> list:
    """
    Get all cost entries for a model, ordered by date.
    """
    result = supabase.table('v_cost_entries').select('*').eq(
        'cost_time_model_id', cost_time_model_id
    ).order('date_paid').execute()

    return result.data


def get_project_dates(cost_time_model_id: str) -> tuple:
    """
    Get project start and end dates from the model or infer from entries.
    """
    # Try to get from model
    result = supabase.table('cost_time_models').select(
        'project_start_date, project_end_date'
    ).eq('id', cost_time_model_id).execute()

    if result.data:
        model = result.data[0]
        start = model.get('project_start_date')
        end = model.get('project_end_date')
        if start and end:
            return (date.fromisoformat(start), date.fromisoformat(end))

    # Infer from cost entries
    entries = get_cost_entries(cost_time_model_id)
    if entries:
        dates = [date.fromisoformat(e['date_paid']) for e in entries]
        return (min(dates), max(dates))

    # Default: today to 1 year from now
    today = date.today()
    return (today, today + timedelta(days=365))


def calculate_carrying_cost(
    amount: Decimal,
    days_held: int,
    annual_rate: Decimal,
    compound_annually: bool = True
) -> Decimal:
    """
    Calculate carrying cost for a single amount.

    Args:
        amount: Principal amount
        days_held: Number of days the money is held
        annual_rate: Annual interest rate as decimal (0.08 = 8%)
        compound_annually: If True, compound; if False, simple interest

    Returns:
        Carrying cost (interest/opportunity cost)
    """
    if days_held <= 0:
        return Decimal('0')

    years = Decimal(str(days_held)) / Decimal('365')

    if compound_annually:
        # Compound interest: A = P(1 + r)^t - P
        # Convert to float for exponentiation, then back to Decimal
        factor = (1 + float(annual_rate)) ** float(years)
        carrying_cost = amount * Decimal(str(factor - 1))
    else:
        # Simple interest: I = P * r * t
        carrying_cost = amount * annual_rate * years

    return carrying_cost.quantize(Decimal('0.01'))


def calculate_model_carrying_costs(
    cost_time_model_id: str,
    finance_model_id: str,
    verbose: bool = False
) -> dict:
    """
    Calculate total carrying costs for a cost/time model using a finance model.

    Returns:
        {
            'total_base_cost': Decimal,
            'total_carrying_cost': Decimal,
            'total_with_carrying': Decimal,
            'carrying_cost_pct': Decimal,
            'by_phase': {phase: {'base': Decimal, 'carrying': Decimal}},
            'by_ce': {ce_id: {'base': Decimal, 'carrying': Decimal}},
            'details': [list of entry-level calculations]
        }
    """
    entries = get_cost_entries(cost_time_model_id)
    rates = get_finance_rates(finance_model_id)
    project_start, project_end = get_project_dates(cost_time_model_id)

    if verbose:
        print(f"Project period: {project_start} to {project_end}")
        print(f"Entries: {len(entries)}")
        print(f"Rates by phase: {rates}")

    total_base = Decimal('0')
    total_carrying = Decimal('0')
    by_phase = defaultdict(lambda: {'base': Decimal('0'), 'carrying': Decimal('0')})
    by_ce = defaultdict(lambda: {'base': Decimal('0'), 'carrying': Decimal('0')})
    details = []

    for entry in entries:
        amount = Decimal(str(entry['amount_total']))
        entry_date = date.fromisoformat(entry['date_paid'])
        phase = entry['phase'] or 'crosscutting'
        ce_id = entry['ce_id']

        # Get rate for this phase
        rate_info = rates.get(phase, rates['_default'])
        rate = rate_info['rate']
        compound = rate_info['compound']

        # Calculate days from payment to project end
        days_held = (project_end - entry_date).days

        # Calculate carrying cost
        carrying = calculate_carrying_cost(amount, days_held, rate, compound)

        # Accumulate totals
        total_base += amount
        total_carrying += carrying
        by_phase[phase]['base'] += amount
        by_phase[phase]['carrying'] += carrying
        by_ce[ce_id]['base'] += amount
        by_ce[ce_id]['carrying'] += carrying

        details.append({
            'ce_id': ce_id,
            'ce_name': entry['ce_name'],
            'phase': phase,
            'date_paid': str(entry_date),
            'amount': float(amount),
            'days_held': days_held,
            'rate': float(rate),
            'carrying_cost': float(carrying)
        })

        if verbose:
            print(f"  {ce_id}: ${amount:,.2f} on {entry_date}, held {days_held}d @ {rate*100:.1f}% = ${carrying:,.2f}")

    # Calculate summary
    total_with_carrying = total_base + total_carrying
    carrying_pct = (total_carrying / total_base * 100) if total_base > 0 else Decimal('0')

    return {
        'total_base_cost': float(total_base),
        'total_carrying_cost': float(total_carrying),
        'total_with_carrying': float(total_with_carrying),
        'carrying_cost_pct': float(carrying_pct),
        'by_phase': {k: {'base': float(v['base']), 'carrying': float(v['carrying'])}
                     for k, v in by_phase.items()},
        'by_ce': {k: {'base': float(v['base']), 'carrying': float(v['carrying'])}
                  for k, v in by_ce.items()},
        'details': details,
        'project_start': str(project_start),
        'project_end': str(project_end),
        'entry_count': len(entries)
    }


def compare_finance_models(
    cost_time_model_id: str,
    finance_model_ids: list[str]
) -> list[dict]:
    """
    Compare carrying costs across multiple finance models for the same cost/time model.
    Useful for "what if rates change" analysis.
    """
    results = []

    for fm_id in finance_model_ids:
        # Get finance model name
        fm_result = supabase.table('finance_models').select('name').eq('id', fm_id).execute()
        fm_name = fm_result.data[0]['name'] if fm_result.data else fm_id

        # Calculate carrying costs
        calc = calculate_model_carrying_costs(cost_time_model_id, fm_id)

        results.append({
            'finance_model_id': fm_id,
            'finance_model_name': fm_name,
            'total_base_cost': calc['total_base_cost'],
            'total_carrying_cost': calc['total_carrying_cost'],
            'total_with_carrying': calc['total_with_carrying'],
            'carrying_cost_pct': calc['carrying_cost_pct']
        })

    return results


# ============================================================
# CLI Interface
# ============================================================

if __name__ == "__main__":
    import sys
    import json

    if len(sys.argv) < 3:
        print("Usage: python calculate_carrying_costs.py <cost_time_model_id> <finance_model_id> [--verbose]")
        print()
        print("Example:")
        print("  python calculate_carrying_costs.py xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx 00000000-0000-0000-0000-000000000002")
        print()

        # Show available models
        print("Available Finance Models:")
        result = supabase.table('finance_models').select('id, name, is_baseline').execute()
        for fm in result.data:
            baseline = " (baseline)" if fm['is_baseline'] else ""
            print(f"  {fm['id']}: {fm['name']}{baseline}")

        print()
        print("Available Cost/Time Models:")
        result = supabase.table('cost_time_models').select('id, name').execute()
        if result.data:
            for ctm in result.data:
                print(f"  {ctm['id']}: {ctm['name']}")
        else:
            print("  (none - create one first)")

        sys.exit(1)

    cost_time_model_id = sys.argv[1]
    finance_model_id = sys.argv[2]
    verbose = '--verbose' in sys.argv

    print(f"Calculating carrying costs...")
    print(f"  Cost/Time Model: {cost_time_model_id}")
    print(f"  Finance Model: {finance_model_id}")
    print()

    result = calculate_model_carrying_costs(cost_time_model_id, finance_model_id, verbose=verbose)

    print()
    print("=" * 60)
    print("RESULTS")
    print("=" * 60)
    print(f"Project Period: {result['project_start']} to {result['project_end']}")
    print(f"Cost Entries: {result['entry_count']}")
    print()
    print(f"Total Base Cost:     ${result['total_base_cost']:>15,.2f}")
    print(f"Total Carrying Cost: ${result['total_carrying_cost']:>15,.2f}")
    print(f"                     {'-' * 17}")
    print(f"Total with Carrying: ${result['total_with_carrying']:>15,.2f}")
    print(f"Carrying Cost %:     {result['carrying_cost_pct']:>15.1f}%")
    print()
    print("By Phase:")
    for phase, vals in sorted(result['by_phase'].items()):
        print(f"  {phase:20s}: Base ${vals['base']:>12,.2f}, Carrying ${vals['carrying']:>10,.2f}")
