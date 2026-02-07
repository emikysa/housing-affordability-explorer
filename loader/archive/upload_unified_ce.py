#!/usr/bin/env python3
"""
Upload transformed cost_elements_unified.tsv to Supabase.
This script:
1. Reads the transformed TSV file
2. Clears existing data from cost_elements_unified table
3. Inserts all rows from the TSV
"""

import os
import csv
from dotenv import load_dotenv
from supabase import create_client, Client

# Load environment variables
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    raise ValueError("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

TSV_PATH = os.path.join(os.path.dirname(__file__), "..", "cost_elements_unified.tsv")


def load_tsv():
    """Load TSV file and return list of dicts."""
    rows = []
    with open(TSV_PATH, 'r', encoding='utf-8') as f:
        # Skip any empty lines at start
        lines = f.readlines()
        non_empty_lines = [line for line in lines if line.strip()]

        reader = csv.DictReader(non_empty_lines, delimiter='\t')
        for row in reader:
            # Convert empty strings to None for nullable fields
            cleaned = {}
            for key, value in row.items():
                if value == '' or value is None:
                    cleaned[key] = None
                elif key == 'level' or key == 'sort_order':
                    cleaned[key] = int(value) if value else None
                else:
                    cleaned[key] = value
            rows.append(cleaned)
    return rows


def main():
    print("Loading TSV file...")
    rows = load_tsv()
    print(f"Loaded {len(rows)} rows from TSV")

    # Check current table structure to see what columns exist
    print("\nChecking current table structure...")
    result = supabase.table("cost_elements_unified").select("*").limit(1).execute()
    if result.data:
        existing_columns = set(result.data[0].keys())
        print(f"Existing columns: {sorted(existing_columns)}")
    else:
        existing_columns = set()
        print("Table is empty, will check schema via insert")

    # Get columns from TSV
    tsv_columns = set(rows[0].keys()) if rows else set()
    print(f"TSV columns: {sorted(tsv_columns)}")

    # Check for new columns that need to be added
    new_columns = tsv_columns - existing_columns
    if new_columns and existing_columns:
        print(f"\n*** NEW COLUMNS DETECTED: {new_columns} ***")
        print("These columns should already exist if migration was run.")
        print("Continuing with upload...")

    # Delete all existing data
    print("\nDeleting existing data...")
    # Use a filter that matches all rows (level >= 0 matches everything)
    delete_result = supabase.table("cost_elements_unified").delete().gte("level", 0).execute()
    print(f"Deleted existing rows")

    # Sort rows by level to ensure parents are inserted before children
    rows_sorted = sorted(rows, key=lambda r: r['level'])

    # Insert in batches of 100, grouped by level
    batch_size = 100
    total_inserted = 0

    print(f"\nInserting {len(rows_sorted)} rows in batches of {batch_size} (sorted by level)...")

    # Group by level first
    from collections import defaultdict
    rows_by_level = defaultdict(list)
    for row in rows_sorted:
        rows_by_level[row['level']].append(row)

    for level in sorted(rows_by_level.keys()):
        level_rows = rows_by_level[level]
        print(f"\n  Level {level}: {len(level_rows)} rows")

        for i in range(0, len(level_rows), batch_size):
            batch = level_rows[i:i + batch_size]
            try:
                result = supabase.table("cost_elements_unified").insert(batch).execute()
                total_inserted += len(batch)
                print(f"    Inserted batch: {len(batch)} rows (total: {total_inserted})")
            except Exception as e:
                print(f"    ERROR inserting batch: {e}")
                print(f"    First row in failed batch: {batch[0]}")
                raise

    print(f"\n=== COMPLETE ===")
    print(f"Total rows inserted: {total_inserted}")

    # Verify counts by level
    print("\nVerifying counts by level...")
    for level in range(1, 7):
        result = supabase.table("cost_elements_unified").select("ce_id", count="exact").eq("level", level).execute()
        print(f"  L{level}: {result.count}")

    # Total count
    result = supabase.table("cost_elements_unified").select("ce_id", count="exact").execute()
    print(f"  Total: {result.count}")


if __name__ == "__main__":
    main()
