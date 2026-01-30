#!/usr/bin/env python3
"""
Housing Affordability Framework - Data Loader
Loads data from Excel workbook into Supabase PostgreSQL database.

Usage:
    1. Copy .env.example to .env and fill in your Supabase credentials
    2. Run: python load_data.py

The script will:
    1. Load controlled vocabularies (lookup tables)
    2. Load core data tables (cost_elements, CROs, barriers)
    3. Load junction tables (cro_ce_map, ce_actor_map, barrier_authority_map)
    4. Load scenario parameters
"""

import os
import sys
import re
from pathlib import Path
from typing import Any

import pandas as pd
from openpyxl import load_workbook
from dotenv import load_dotenv
from supabase import create_client, Client

# Load environment variables
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY")
EXCEL_PATH = os.getenv("EXCEL_FILE_PATH", "../Housing-Affordability-Framework-MASTER 2026-01-30-1120T_DBReady.xlsx")


def get_supabase_client() -> Client:
    """Create and return Supabase client."""
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("Error: SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in .env file")
        sys.exit(1)
    return create_client(SUPABASE_URL, SUPABASE_KEY)


def clean_value(value: Any) -> Any:
    """Clean a value for database insertion."""
    if pd.isna(value) or value is None:
        return None
    if isinstance(value, str):
        value = value.strip()
        if value == "" or value.lower() in ("none", "n/a", "-"):
            return None
    return value


def parse_bool(value: Any) -> bool:
    """Parse a boolean value from various formats."""
    if pd.isna(value) or value is None:
        return False
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        return value.strip().upper() in ("Y", "YES", "TRUE", "1")
    return bool(value)


def load_excel_data(file_path: str) -> dict[str, pd.DataFrame]:
    """Load all sheets from Excel file into DataFrames."""
    print(f"Loading Excel file: {file_path}")

    sheets = {
        "cost_elements": "1) Cost Elements",
        "cros": "2) Reduction Opportunities",
        "barriers": "3) Barriers and Levers",
        "actor_matrix": "4) Actor Control Matrix",
        "cro_ce_map": "6) CRO-CE Map",
        "vocabularies": "7) Controlled Vocabularies",
        "scenarios": "8) Scenarios",
    }

    data = {}
    for key, sheet_name in sheets.items():
        try:
            df = pd.read_excel(file_path, sheet_name=sheet_name)
            data[key] = df
            print(f"  Loaded {sheet_name}: {len(df)} rows")
        except Exception as e:
            print(f"  Warning: Could not load {sheet_name}: {e}")
            data[key] = pd.DataFrame()

    return data


def load_vocabularies(supabase: Client, vocab_df: pd.DataFrame) -> None:
    """Load controlled vocabulary tables."""
    print("\nLoading controlled vocabularies...")

    # Group by vocab_type
    vocab_groups = vocab_df.groupby("vocab_type")

    # Mapping from vocab_type to table name and column names
    vocab_mapping = {
        "STAGES": ("stages", "stage_id", "description"),
        "BARRIER_TYPES": ("barrier_types", "type_id", "description"),
        "BARRIER_SCOPES": ("barrier_scopes", "scope_id", "description"),
        "LEVER_TYPES": ("lever_types", "lever_id", "description"),
        "FEASIBILITY_HORIZONS": ("feasibility_horizons", "horizon_id", "description"),
        "SAVINGS_CADENCE": ("savings_cadences", "cadence_id", "description"),
        "PRIMARY_DEPENDENCY": ("primary_dependencies", "dependency_id", "description"),
        "ACTORS": ("actors", "actor_id", "description"),
        "CRO_CE_RELATIONSHIP": ("cro_ce_relationships", "relationship_id", "description"),
    }

    # Sort order for stages and horizons
    stage_order = {"Build": 1, "Operate": 2, "Finance": 3, "Total": 4}
    horizon_order = {"Near": 1, "Medium": 2, "Long": 3}

    for vocab_type, group in vocab_groups:
        if vocab_type not in vocab_mapping:
            print(f"  Skipping unknown vocab type: {vocab_type}")
            continue

        table_name, id_col, desc_col = vocab_mapping[vocab_type]

        records = []
        for _, row in group.iterrows():
            record = {
                id_col: clean_value(row["vocab_id"]),
                desc_col: clean_value(row["description"]),
            }

            # Add sort_order for stages and horizons
            if table_name == "stages" and record[id_col] in stage_order:
                record["sort_order"] = stage_order[record[id_col]]
            elif table_name == "feasibility_horizons" and record[id_col] in horizon_order:
                record["sort_order"] = horizon_order[record[id_col]]

            if record[id_col]:  # Only add if ID exists
                records.append(record)

        if records:
            try:
                supabase.table(table_name).upsert(records).execute()
                print(f"  Loaded {table_name}: {len(records)} records")
            except Exception as e:
                print(f"  Error loading {table_name}: {e}")


def load_cost_elements(supabase: Client, df: pd.DataFrame) -> None:
    """Load cost elements table."""
    print("\nLoading cost elements...")

    records = []
    for idx, row in df.iterrows():
        ce_id = clean_value(row.get("Cost Element ID"))
        if not ce_id:
            continue

        record = {
            "ce_id": ce_id,
            "stage_id": clean_value(row.get("Stage")),
            "description": clean_value(row.get("Description")),
            "notes": clean_value(row.get("Notes")),
            "assumptions": clean_value(row.get("Assumptions")),
            "estimate": clean_value(row.get("Estimate (USD)")),
            "annual_estimate": clean_value(row.get("Annual (USD)")),
            "unit": clean_value(row.get("Unit")),
            "cadence": clean_value(row.get("Costs Incurred")),
            "sort_order": idx + 1,
        }
        records.append(record)

    if records:
        try:
            supabase.table("cost_elements").upsert(records).execute()
            print(f"  Loaded cost_elements: {len(records)} records")
        except Exception as e:
            print(f"  Error loading cost_elements: {e}")


def load_cros(supabase: Client, df: pd.DataFrame) -> None:
    """Load cost reduction opportunities table."""
    print("\nLoading cost reduction opportunities...")

    # Valid stages - map "Both" to "Build" since it's not a valid stage
    valid_stages = {"Build", "Operate", "Finance", "Total"}

    records = []
    for idx, row in df.iterrows():
        cro_id = clean_value(row.get("CRO ID"))
        if not cro_id:
            continue

        # Map cadence value
        cadence = clean_value(row.get("Savings cadence"))

        # Handle stage_id - "Both" is not a valid stage, map to "Build"
        stage = clean_value(row.get("Primary stage"))
        if stage and stage not in valid_stages:
            stage = "Build"  # Default to Build for invalid stages like "Both"

        record = {
            "cro_id": cro_id,
            "description": clean_value(row.get("Primary value driver(s)")),
            "value_drivers": clean_value(row.get("Primary value driver(s)")),
            "estimate": clean_value(row.get("Estimated value (USD)")),
            "unit": clean_value(row.get("Unit")),
            "stage_id": stage,
            "cadence_id": cadence,
            "dependency_id": clean_value(row.get("Primary dependency")),
            "requires_upfront_investment": parse_bool(row.get("Requires upfront investment? (Y/N)")),
            "notes": clean_value(row.get("Notes / assumptions")),
            "sort_order": idx + 1,
        }
        records.append(record)

    if records:
        try:
            supabase.table("cost_reduction_opportunities").upsert(records).execute()
            print(f"  Loaded cost_reduction_opportunities: {len(records)} records")
        except Exception as e:
            print(f"  Error loading cost_reduction_opportunities: {e}")


def load_barriers(supabase: Client, df: pd.DataFrame) -> None:
    """Load barriers table."""
    print("\nLoading barriers...")

    records = []
    for _, row in df.iterrows():
        barrier_id = clean_value(row.get("Barrier_ID"))
        if not barrier_id:
            continue

        record = {
            "barrier_id": barrier_id,
            "cro_id": clean_value(row.get("CRO_ID")),
            "description": clean_value(row.get("Barrier Description")),
            "short_name": clean_value(row.get("Barrier Short Name")),
            "type_id": clean_value(row.get("Barrier Type")),
            "scope_id": clean_value(row.get("Barrier Scope")),
            "pattern_id": clean_value(row.get("Barrier Pattern ID")),
            "effect_mechanism": clean_value(row.get("Effect (mechanism)")),
            "lever_id": clean_value(row.get("Lever Type")),
            "authority": clean_value(row.get("Authority")),
            "horizon_id": clean_value(row.get("Feasibility Horizon")),
            "actor_scope": clean_value(row.get("AS*")),
        }
        records.append(record)

    if records:
        try:
            supabase.table("barriers").upsert(records).execute()
            print(f"  Loaded barriers: {len(records)} records")
        except Exception as e:
            print(f"  Error loading barriers: {e}")


def load_cro_ce_map(supabase: Client, df: pd.DataFrame, valid_cro_ids: set, valid_ce_ids: set) -> None:
    """Load CRO to Cost Element mapping table."""
    print("\nLoading CRO-CE mappings...")

    records = []
    skipped = 0
    for _, row in df.iterrows():
        cro_id = clean_value(row.get("CRO_ID"))
        ce_id = clean_value(row.get("CE_ID"))
        relationship = clean_value(row.get("Relationship"))

        # Only add if both IDs are valid
        if cro_id and ce_id:
            if cro_id in valid_cro_ids and ce_id in valid_ce_ids:
                records.append({
                    "cro_id": cro_id,
                    "ce_id": ce_id,
                    "relationship": relationship,
                })
            else:
                skipped += 1

    if skipped:
        print(f"  Skipped {skipped} records with invalid CRO/CE references")

    if records:
        try:
            # Delete existing records first to avoid conflicts
            supabase.table("cro_ce_map").delete().neq("id", 0).execute()
            supabase.table("cro_ce_map").insert(records).execute()
            print(f"  Loaded cro_ce_map: {len(records)} records")
        except Exception as e:
            print(f"  Error loading cro_ce_map: {e}")


def load_ce_actor_map(supabase: Client, df: pd.DataFrame, valid_actors: set, valid_ce_ids: set) -> None:
    """Load Cost Element to Actor mapping table from Actor Control Matrix."""
    print("\nLoading CE-Actor mappings...")

    records = []
    skipped = 0
    for _, row in df.iterrows():
        ce_id = clean_value(row.get("Cost Element ID"))
        if not ce_id:
            continue

        # Skip if CE ID is not valid (some rows have descriptions instead of IDs)
        if ce_id not in valid_ce_ids:
            skipped += 1
            continue

        primary_actors = clean_value(row.get("Primary Actor(s)"))
        secondary_actors = clean_value(row.get("Secondary Actor(s)"))
        policy_lever = clean_value(row.get("Primary Policy Lever"))
        notes = clean_value(row.get("Notes on Actor Influence"))

        # Parse primary actors (may be comma-separated)
        if primary_actors:
            for actor in str(primary_actors).split(","):
                actor = actor.strip()
                # Only add if it's a valid actor (not a long description)
                if actor and actor in valid_actors:
                    records.append({
                        "ce_id": ce_id,
                        "actor_id": actor,
                        "role": "Primary",
                        "policy_lever": policy_lever,
                        "notes": notes,
                    })

        # Parse secondary actors (may be comma-separated)
        # Note: Some cells contain policy descriptions instead of actor names
        if secondary_actors:
            for actor in str(secondary_actors).split(","):
                actor = actor.strip()
                # Only add if it's a valid actor (not a long description)
                if actor and actor in valid_actors:
                    records.append({
                        "ce_id": ce_id,
                        "actor_id": actor,
                        "role": "Secondary",
                        "policy_lever": None,
                        "notes": None,
                    })

    if skipped:
        print(f"  Skipped {skipped} rows with invalid CE IDs")

    if records:
        try:
            # Delete existing records first
            supabase.table("ce_actor_map").delete().neq("id", 0).execute()
            supabase.table("ce_actor_map").insert(records).execute()
            print(f"  Loaded ce_actor_map: {len(records)} records")
        except Exception as e:
            print(f"  Error loading ce_actor_map: {e}")


def load_barrier_authority_map(supabase: Client, barriers_df: pd.DataFrame, actors_df: pd.DataFrame) -> None:
    """Extract and load barrier to authority/actor mappings."""
    print("\nLoading barrier-authority mappings...")

    # Get list of valid actors
    valid_actors = set()
    for _, row in actors_df[actors_df["vocab_type"] == "ACTORS"].iterrows():
        valid_actors.add(clean_value(row["vocab_id"]))

    records = []
    for _, row in barriers_df.iterrows():
        barrier_id = clean_value(row.get("Barrier_ID"))
        authority = clean_value(row.get("Authority"))

        if not barrier_id or not authority:
            continue

        # Authority field may contain multiple actors
        # Try to match against known actors
        for actor in valid_actors:
            if actor and actor.lower() in authority.lower():
                records.append({
                    "barrier_id": barrier_id,
                    "actor_id": actor,
                })

    if records:
        try:
            # Delete existing records first
            supabase.table("barrier_authority_map").delete().neq("id", 0).execute()
            supabase.table("barrier_authority_map").insert(records).execute()
            print(f"  Loaded barrier_authority_map: {len(records)} records")
        except Exception as e:
            print(f"  Error loading barrier_authority_map: {e}")


def load_scenario_parameters(supabase: Client, df: pd.DataFrame) -> None:
    """Load scenario parameters."""
    print("\nLoading scenario parameters...")

    records = []
    for _, row in df.iterrows():
        category = clean_value(row.get("category"))
        param_id = clean_value(row.get("parameter_id"))

        if not category or not param_id:
            continue

        value = clean_value(row.get("value"))
        # Convert to numeric if possible
        try:
            value = float(value) if value is not None else None
        except (ValueError, TypeError):
            value = None

        record = {
            "category": category,
            "parameter_id": param_id,
            "description": clean_value(row.get("description")),
            "default_value": value,
            "unit": clean_value(row.get("unit")),
        }
        records.append(record)

    if records:
        try:
            # Use upsert with conflict on (category, parameter_id)
            supabase.table("scenario_parameters").upsert(
                records,
                on_conflict="category,parameter_id"
            ).execute()
            print(f"  Loaded scenario_parameters: {len(records)} records")
        except Exception as e:
            print(f"  Error loading scenario_parameters: {e}")


def create_default_scenario(supabase: Client) -> None:
    """Create a default baseline scenario."""
    print("\nCreating default scenario...")

    try:
        # Check if default scenario exists
        result = supabase.table("scenarios").select("*").eq("is_default", True).execute()

        if not result.data:
            scenario = {
                "name": "Baseline",
                "description": "Default baseline scenario with standard assumptions",
                "is_default": True,
                "is_public": True,
            }
            supabase.table("scenarios").insert(scenario).execute()
            print("  Created default 'Baseline' scenario")
        else:
            print("  Default scenario already exists")
    except Exception as e:
        print(f"  Error creating default scenario: {e}")


def main():
    """Main entry point."""
    print("=" * 60)
    print("Housing Affordability Framework - Data Loader")
    print("=" * 60)

    # Validate environment
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("\nError: Missing Supabase credentials!")
        print("Please copy .env.example to .env and fill in your credentials.")
        sys.exit(1)

    # Check Excel file exists
    excel_path = Path(EXCEL_PATH)
    if not excel_path.exists():
        # Try relative to script location
        script_dir = Path(__file__).parent
        excel_path = script_dir / EXCEL_PATH
        if not excel_path.exists():
            print(f"\nError: Excel file not found: {EXCEL_PATH}")
            sys.exit(1)

    # Initialize Supabase client
    print(f"\nConnecting to Supabase: {SUPABASE_URL}")
    supabase = get_supabase_client()

    # Load Excel data
    data = load_excel_data(str(excel_path))

    # Load data in dependency order
    # 1. Vocabularies (no dependencies)
    load_vocabularies(supabase, data["vocabularies"])

    # Get valid actors for validation
    valid_actors = set()
    for _, row in data["vocabularies"][data["vocabularies"]["vocab_type"] == "ACTORS"].iterrows():
        actor = clean_value(row["vocab_id"])
        if actor:
            valid_actors.add(actor)
    print(f"\nValid actors: {valid_actors}")

    # Get valid CE IDs
    valid_ce_ids = set()
    for _, row in data["cost_elements"].iterrows():
        ce_id = clean_value(row.get("Cost Element ID"))
        if ce_id:
            valid_ce_ids.add(ce_id)

    # Get valid CRO IDs
    valid_cro_ids = set()
    for _, row in data["cros"].iterrows():
        cro_id = clean_value(row.get("CRO ID"))
        if cro_id:
            valid_cro_ids.add(cro_id)

    # 2. Core tables (depend on vocabularies)
    load_cost_elements(supabase, data["cost_elements"])
    load_cros(supabase, data["cros"])
    load_barriers(supabase, data["barriers"])

    # 3. Junction tables (depend on core tables)
    load_cro_ce_map(supabase, data["cro_ce_map"], valid_cro_ids, valid_ce_ids)
    load_ce_actor_map(supabase, data["actor_matrix"], valid_actors, valid_ce_ids)
    load_barrier_authority_map(supabase, data["barriers"], data["vocabularies"])

    # 4. Scenario parameters
    load_scenario_parameters(supabase, data["scenarios"])
    create_default_scenario(supabase)

    print("\n" + "=" * 60)
    print("Data loading complete!")
    print("=" * 60)


if __name__ == "__main__":
    main()
