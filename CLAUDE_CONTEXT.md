# Housing Affordability Explorer - Project Context

> **For Claude Code:** Read this file at the start of every session. Append significant changes to CHANGELOG.md before ending.

---

## Project Overview

A public web application that helps people understand housing costs, cost reduction opportunities (CROs), barriers, and the actors who control them. Data originated from an Excel workbook and is now hosted as a live database-backed web app.

**Live Site:** Hosted on Vercel (auto-deploys from GitHub)

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Database | PostgreSQL via Supabase (free tier) |
| API | Auto-generated REST API from Supabase |
| Frontend | React 18 + TypeScript + Vite |
| Data Grid | AG Grid Community (free) |
| Charts | Recharts |
| Styling | Tailwind CSS |
| Hosting | Vercel (auto-deploys from GitHub) |
| Data Loader | Python with openpyxl and supabase-py |

---

## File Structure

```
/Users/emikysa/Claude/HousingAffordabilityFramework/
├── frontend/
│   ├── src/
│   │   ├── components/         # Reusable UI components
│   │   │   ├── Layout.tsx      # Main layout with nav, header, scenario selector
│   │   │   ├── ModelSelector.tsx      # Dropdown for model selection
│   │   │   ├── FilterToggle.tsx      # "Populated only / Show all" toggle
│   │   │   └── DetailPanel.tsx       # Slide-out detail panels
│   │   ├── contexts/
│   │   │   └── ModelContext.tsx      # Global model state management
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx         # Two-tier: Framework Overview + Scenario Analysis
│   │   │   ├── CostElements.tsx      # AG Grid of cost elements
│   │   │   ├── Opportunities.tsx     # AG Grid of CROs
│   │   │   ├── Models.tsx             # Model management cards
│   │   │   └── Explorer.tsx          # 5-column interactive explorer
│   │   ├── hooks/useData.ts    # Supabase data fetching hooks (scenario-aware)
│   │   ├── types/database.ts   # TypeScript types
│   │   └── lib/supabase.ts     # Supabase client config
│   ├── package.json
│   └── .env                    # Frontend Supabase credentials (not in git)
├── loader/
│   ├── load_data.py            # Python script to load Excel → Supabase
│   ├── venv/                   # Python virtual environment
│   └── .env                    # Loader credentials (not in git)
├── supabase/
│   └── migrations/             # SQL migration files for schema changes
├── CLAUDE_CONTEXT.md           # This file
├── CHANGELOG.md                # Running log of changes
├── README.md
└── SETUP_GUIDE.md
```

---

## Quick Commands

### Test Locally
```bash
cd /Users/emikysa/Claude/HousingAffordabilityFramework/frontend
npm run dev
```
Runs at http://localhost:3000

### Deploy to Production
```bash
cd /Users/emikysa/Claude/HousingAffordabilityFramework
git add .
git commit -m "Description of changes"
git push
```
Vercel auto-deploys in ~1-2 minutes. **No manual Vercel CLI needed.**

### Reload Data from Excel to Supabase
```bash
cd /Users/emikysa/Claude/HousingAffordabilityFramework/loader
source venv/bin/activate
python load_data.py
```
⚠️ This replaces existing data, doesn't merge.

### Modify Database Schema
Go to Supabase Dashboard → SQL Editor and run ALTER/CREATE statements.

---

## Environment Variables

### Supabase (database)
- **Project URL:** `https://bcpfmtnyqiqsmtrnkjec.supabase.co`
- **Anon Key:** Found in Supabase → Settings → API → anon public key

### Vercel Environment Variables
- `VITE_SUPABASE_URL` = Supabase project URL
- `VITE_SUPABASE_ANON_KEY` = Supabase anon public key

### Local .env files (not in git)
- `loader/.env` - Contains `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `EXCEL_FILE_PATH`
- `frontend/.env` - Contains `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

---

## Database Schema Highlights

- **9 lookup tables:** stages, actors, barrier_types, barrier_scopes, lever_types, etc.
- **4 core tables:** cost_elements, cost_reduction_opportunities, barriers, levers
- **6 junction tables:** cro_ce_map, ce_actor_map, barrier_authority_map, ce_drilldown, barrier_lever_map, barrier_cro_map
- **9 views:** v_cost_elements, v_cros, v_barriers, v_levers, v_barrier_levers, v_barrier_cros, etc.
- **Row Level Security:** Public read access, restricted write

### Levers (Many-to-Many with Barriers)

The `levers` table stores policy interventions that can address barriers:
- **lever_id:** Primary key (e.g., LEV-REGULATORY_REFORM)
- **lever_type_id:** References lever_types lookup table
- **name, description:** Lever details
- **implementation_approach, typical_actors, typical_timeline:** Implementation info
- **barrier_lever_map:** Junction table linking barriers to levers (many-to-many)
- **v_levers:** View with barrier_count
- **v_barrier_levers:** View for easy querying of relationships
- 5 levers created from existing barrier data, 71 barrier-lever mappings

### Barriers (Many-to-Many with CROs)

Barriers have a many-to-many relationship with CROs:
- **barrier_id:** Primary key in format `BAR-{NAME}` (e.g., BAR-LONG_TIMELINES)
- **barrier_cro_map:** Junction table linking barriers to CROs (many-to-many)
- **v_barrier_cros:** View for easy querying of barrier-CRO relationships
- **v_barriers:** View includes `cro_count` field showing number of linked CROs
- 71 barriers, 71 barrier-CRO mappings (migrated from original 1:1 relationship)
- Note: `barriers.cro_id` column is deprecated; use barrier_cro_map for new relationships

### Unified Cost Elements Table (Updated 2026-02-02)

The `cost_elements_unified` table is the single source of truth for all cost elements at all levels:
- **ce_id:** Primary key with hierarchical IDs building from the LEFT:
  - L1: `B07-BuildCost`
  - L2: `B07a-Substructure`
  - L3: `B07a01-Foundation`
  - L4: `B07a01a-Basement`
  - L5: `B07a01a01-Drilled shafts`
  - L6: `B07a01a01a-...`
  - Pattern: alternating letters (a-z) and 2-digit numbers (01-99)
- **parent_id:** FK to parent element (NULL for L1)
- **level:** 1-6 indicating hierarchy depth
- **short_name:** Display name (e.g., "BuildCost", "Substructure", "Roofing")
- **description:** All L1-L5 elements have descriptions populated (few-word scope clarifier)
- **stage_id:** Build/Finance/Operate
- **phase:** acquisition, predesign, entitlement, precon, construction, closeout, operations, occupant_finance, crosscutting
- **node_class:** system, program, option, regulatory, overhead, finance
- **sort_order:** Display order within siblings
- **455 records:** 22 L1 + 54 L2 + 160 L3 + 145 L4 + 51 L5 + 23 L6
- **No Labor/Material/SubOP nodes:** Cost breakdown captured in `cost_entries` columns, not hierarchy

**Chronological Ordering (updated 2026-02-02):**
- All IDs sort alphabetically in chronological project order
- L2-L5 reordered: B02, B05, B06, B07 categories follow construction sequence
- Example: B07b (Shell) children: Structure → Weather barriers → Roofing → Windows → ... → Deck → Garage

**MECE Structure (validated 2026-02-01):**
- B05-SiteInfra L2: 7 chronological categories (Site prep → Landscaping)
- B07-BuildCost L2: 6 system-based categories (Substructure, Shell, Services, Interiors, Special systems, Shared spaces)
- B06-SoftCosts: Testing split into Field/materials testing + Commissioning
- No "Total" pseudo-nodes remain

**Export File:** `cost_elements_unified.tsv` in project root (for review/editing)

### CE Drilldown Hierarchy (LEGACY - being replaced)

The `ce_drilldown` table stores a hierarchical breakdown of cost elements with up to 5 levels:
- **ce_code:** References cost_elements.ce_id
- **level1_name, level2_name:** Always populated
- **level3_name, level4_name, level5_name:** Optional deeper levels
- **cost_component:** 'Total', 'Material', 'Labor', or 'Sub-O+P'
- **cost_composition:** 'mixed' (default), 'material', 'labor', or 'sub_op' - for tagging bundled cost breakdown
- **sort_order:** Display order within CE
- **1,001 rows** loaded from `Housing-Affordability-Framework-CostElement-drilldown.xlsx`
- **Note:** This table only has text names, not IDs for L2-L5. Use `cost_elements_unified` for proper hierarchical IDs.

### Cost Elements (L1) - Updated 2026-02-01

**BUILD / DEVELOPMENT (B01-B13)**
```
B01-Land        - Land acquisition & assemblage
B02-PreDev      - Pre-development, entitlement, and approvals
B03-Permits     - Permits, plan review, and administrative fees
B04-Utilities   - Utility connection, tap, and capacity fees
B05-SiteInfra   - Site work & infrastructure construction
B06-SoftCosts   - Professional, consulting, and admin soft costs
B07-BuildCost   - Hard construction (materials, labor, subcontractor O&P)
B08-TempIndirect- Temporary, indirect, and jobsite costs
B09-RiskIns     - Construction insurance, bonding, and third-party risk
B10-Finance     - Development financing & capital costs
B11-Overhead    - Developer overhead, sales, and marketing
B12-Contingency - Risk, uncertainty, and legal contingency
B13-Return      - Required developer return
```

**OPERATIONS (O01-O05)**
```
O01-Utilities   - Operating utilities
O02-Maint       - Maintenance, repairs, and capital reserves
O03-PropIns     - Operating property insurance
O04-Taxes       - Property taxes & special assessments
O05-HOA         - HOA fees and assessments
```

**OCCUPANT FINANCE (F01-F04)**
```
F01-Principal   - Mortgage principal payment (monthly)
F02-Interest    - Mortgage interest payment (monthly)
F03-PMI         - Private mortgage insurance (PMI) (monthly)
F04-Closing     - Buyer closing costs (one-time)
```

**Migration Notes (2026-02-01):**
- Removed B03-LandCarry (migrated to B10-Finance; concept handled via duration + financing)
- Removed a/b suffixes (B04a/B04b → B03/B04)
- Renumbered B09-B14 → B08-B13 (filled the B08 gap)
- Renamed B13-Contingtic → B12-Contingency
- Shortened O03-PropInsurance → O03-PropIns
- Added `ce_code_alias` table for backward compatibility lookup
- See MIGRATION.md for full mapping details

### Scenario Architecture

Scenarios allow modeling different cost assumptions:

- **`scenarios` table:** Defines scenarios with `id`, `name`, `description`, `is_baseline`, `parent_scenario_id`
- **`ce_scenario_values` table:** Per-scenario cost element overrides (estimate, annual_estimate)
- **`cro_scenario_values` table:** Per-scenario CRO overrides
- **Baseline Scenario (ID: `00000000-0000-0000-0000-000000000001`):** Reads from base tables, no overrides
- **Sub-scenarios:** Inherit from parent, can override specific values
- **Standalone scenarios:** Must be fully populated (no inheritance)

### Key Database Functions

- `get_ce_values_for_scenario(scenario_uuid)` - Returns CE values with scenario inheritance
- `get_cro_values_for_scenario(scenario_uuid)` - Returns CRO values with scenario inheritance
- `get_summary_stats_for_scenario(scenario_uuid)` - Returns totals (one-time, annual, savings)

### Data Counts (Updated 2026-02-02)
| Entity | Count |
|--------|-------|
| Cost Elements (L1) | 22 (B01-B13, O01-O05, F01-F04) |
| Cost Elements Unified (all levels) | 455 (22 L1 + 54 L2 + 160 L3 + 145 L4 + 51 L5 + 23 L6) |
| CROs | 22 |
| Barriers | 71 |
| Levers | 5 |
| Actor-CE mappings | 43 |
| CRO-CE mappings | 55 |
| Barrier-CRO mappings | 71 |
| Barrier-Lever mappings | 71 |
| CE Drilldown entries (legacy) | 1,001 |

---

## Known Data Quirks (handled in loader)

1. **Stage "Both"** - Mapped to "Build" since "Both" isn't a valid stage_id
2. **Long actor names** - Secondary Actor column contained policy descriptions, not actor names; loader validates against known actors
3. **Missing FK references** - Some CRO/CE IDs in junction tables don't exist in core tables; loader skips invalid references

---

## Current UI Architecture

### Dashboard (Two-Tier Layout)
1. **Framework Overview** - Master counts from base tables (CEs, CROs, Barriers, Actors)
2. **Scenario Analysis** - Scenario-specific data with embedded scenario selector
   - Total One-Time Costs (Build stage)
   - Total Annual Costs (Operate + Finance stages)
   - Potential Savings

### Explorer Page
- 5-column interactive view: Costs → Opportunities → Barriers → Levers → Actors
- Click any item to filter related items across all columns
- Sort toggle: A-Z (alphabetical) or By Value (descending)
- Semantic color coding: Gray (CE), Green (CRO), Amber (Barrier), Purple (Lever), Blue (Actor)

### Scenario Selector Placement
- **Dashboard:** Embedded in Scenario Analysis section (not in header)
- **Scenarios page:** No header selector (page manages scenarios directly)
- **Other pages:** Prominent selector in header

### Filter Toggle
- Cost Elements and Opportunities pages have "Populated only / Show all" toggle
- Default: "Populated only" (hides items with no estimate)

### Cost Elements Page (Costs Tab)
- 5-column Explorer-style layout: CE Level 1 → CE Level 2 → CE Level 3 → CE Level 4 → CE Level 5
- Multi-select in all columns with "Select all" / "Deselect all" buttons
- Auto-generated hierarchical codes (e.g., B01 → B01a → B01a01 → B01a01a)
- Sort toggle: A-Z (alphabetical) or By Count (descending)
- Selecting items in one column filters downstream columns
- Detail panel shows cost breakdown hierarchy with codes

### Navigation Tabs
- Dashboard, Explorer, Models, Costs, Opportunities, Barriers, Levers, Actors, Relationships
- "Costs" = Cost Elements page, "Opportunities" = CROs page, "Models" = Scenarios page

### Version Stamp
- **Every page displays a build timestamp** next to the page title (e.g., `Dashboard ver. 2026-02-02-1215T`)
- Format: `ver. YYYY-MM-DD-HHmmT` (year-month-day-hourminuteT)
- **Timezone: US Mountain Time (America/Denver)** - configured in `vite.config.ts`
- Generated at build time via `vite.config.ts` → `import.meta.env.VITE_BUILD_TIME`
- Component: `frontend/src/components/VersionStamp.tsx`
- **Purpose:** Helps verify deployments succeeded and cache isn't stale
- **Automatic updates:** The timestamp updates on every `git push` since Vercel rebuilds the app
- **IMPORTANT for Claude:**
  - Every page must have `<VersionStamp />` after the `<h1>` title
  - When creating new pages, always include the VersionStamp
  - The stamp updates automatically on deploy - no manual version bumping needed
  - Always use US Mountain Time (America/Denver) for timestamps

---

## Multi-Dimensional Model Architecture (Planning - 2026-02-02)

### Vision

Users select one model from each independent dimension to see combined housing costs:

```
Example user selection:
├── Build Cost Model: "1400 sf, 3 bed, 2 bath, 1 story, detached carport, passive house"
├── Water Utility Model: "Fort Collins Loveland Water District"
├── Electric Utility Model: "Poudre Valley REA Coop"
├── Gas Utility Model: "Xcel Energy Gas"
├── Occupancy Model: "2 adults, 1 child"
├── Lifestyle Model: "Moderate consumption"
└── Finance Model: "30-year @ 6%, 20% down"
```

### Model Dimensions

| Dimension | Purpose | Drives |
|-----------|---------|--------|
| **Build Cost** | Construction costs mapped to CEs | One-time development costs, home price |
| **Water Utility** | Water/sewer rate structures | Monthly water bill (O01) |
| **Electric Utility** | Electric rate structures | Monthly electric bill (O01) |
| **Gas Utility** | Natural gas rate structures | Monthly gas bill (O01) |
| **Occupancy** | Household composition | Consumption multipliers |
| **Lifestyle** | Consumption patterns per person | Base consumption rates |
| **Finance** | Mortgage terms, down payment | F01-F04 costs |

### Calculation Chain

```
Occupancy × Lifestyle = Monthly Consumption (gallons, kWh, therms)
Consumption × Utility Rates = Monthly Utility Costs (O01 breakdown)
Build Cost × Finance Terms = Monthly Mortgage (F01-F03)
Sum All Monthly = Total Monthly Housing Cost
```

### Proposed Schema

#### 1. Occupancy Models (Starting here)
```sql
occupancy_models (
  id uuid PK,
  name text,                    -- "2 adults, 1 child"
  description text,
  adults integer,               -- Number of adults
  children integer,             -- Number of children
  created_at timestamp
)
```

#### 2. Lifestyle Models
```sql
lifestyle_models (
  id uuid PK,
  name text,                    -- "Moderate consumption"
  description text,
  -- Per-person monthly consumption rates
  showers_per_week numeric,
  bath_per_week numeric,
  laundry_loads_per_month numeric,
  dishwasher_loads_per_week numeric,
  -- Can add more consumption drivers as needed
  created_at timestamp
)
```

#### 3. Utility Models (Water/Electric/Gas)
```sql
utility_models (
  id uuid PK,
  utility_type text,            -- 'water', 'electric', 'gas'
  provider_name text,           -- "Fort Collins Loveland Water District"
  description text,
  -- Base charges
  base_monthly_fee numeric,
  -- Rate structure stored as JSONB for flexibility (tiered rates)
  rate_tiers jsonb,             -- [{max_units: 5000, rate: 0.005}, {max_units: null, rate: 0.008}]
  unit_name text,               -- 'gallons', 'kWh', 'therms'
  effective_date date,
  created_at timestamp
)
```

#### 4. Consumption Reference Table
```sql
consumption_factors (
  id uuid PK,
  activity text,                -- 'shower', 'bath', 'laundry_load', etc.
  water_gallons numeric,        -- gallons per occurrence
  electric_kwh numeric,         -- kWh per occurrence (water heating, appliance)
  gas_therms numeric,           -- therms per occurrence (if gas water heater)
  notes text
)
```

#### 5. Combined Scenario (User's Selection)
```sql
scenarios (
  id uuid PK,
  name text,
  build_cost_model_id uuid FK,
  water_utility_model_id uuid FK,
  electric_utility_model_id uuid FK,
  gas_utility_model_id uuid FK,
  occupancy_model_id uuid FK,
  lifestyle_model_id uuid FK,
  finance_model_id uuid FK,
  created_at timestamp
)
```

### Implementation Phases

**Phase 1: Occupancy Models** (COMPLETE - 2026-02-02)
- ✓ `occupancy_models` table with 10 household types
- ✓ `OccupancyContext` + `OccupancySelector` in header
- ✓ `useOccupancyModels` hook

**Phase 2: Lifestyle Models** (COMPLETE - 2026-02-02)
- ✓ `lifestyle_models` table with 5 presets (Conservative → Family with young children)
- ✓ `consumption_factors` reference table (14 activities with water/electric/gas usage)
- ✓ `LifestyleContext` + `LifestyleSelector` in header (green background)
- ✓ `useLifestyleModels` and `useConsumptionFactors` hooks

**Phase 3: Utility Models** (COMPLETE - 2026-02-02)
- ✓ `utility_models` table with tiered rate support (JSONB rate_tiers)
- ✓ Water: FCU, FCLWD, ELCO (3 providers)
- ✓ Electric: FCU, Poudre Valley REA, Xcel (3 providers)
- ✓ Gas: Xcel, Atmos, "No Gas Service" option (3 providers)
- ✓ `calculate_utility_cost()` PostgreSQL function for tiered rate calculation
- ✓ `UtilityContext` + `UtilitySelector` component (cyan/amber/orange backgrounds)
- ✓ Header now has 2 rows of selectors (6 total)

**Phase 4: Finance Models Enhancement** (Next)
- Enhance existing `finance_models` table
- Add mortgage calculator: home price × terms → F01-F03
- Wire to Finance stage CEs

**Phase 5: UI Integration**
- Multi-selector component for all dimensions
- Dashboard shows combined results
- Scenario comparison view

### Design Decisions

1. **Tiered utility rates** - Use JSONB for flexibility; can model flat, tiered, time-of-use
2. **Lifestyle as presets** - Admin creates presets; users choose from list (not custom entry)
3. **Consumption factors** - Reference table allows updating assumptions without schema changes
4. **Scenarios table** - One row per user scenario, FKs to each model dimension

### Open Questions

- Should utility models include seasonal variations?
- How to handle homes without gas (all-electric)?
- Should we model water heating fuel source (affects electric vs gas split)?

---

## Future Enhancements Discussed

- Custom domain setup (affordabilityexplorer.fcbsb.org)
- Migration to IONOS if needed
- **Multi-dimensional model architecture** (see section above)

---

## Session Protocol

1. **Start of session:** Read this file (`cat CLAUDE_CONTEXT.md`)
2. **During session:** Test changes locally before deploying
3. **End of session:** Append summary of changes to `CHANGELOG.md`

---

## IMPORTANT: Deployment Checklist

**Claude: DO NOT mark a task as complete until these steps are done!**

### Database Changes
When you create migration SQL files:
1. **Run the migration** - Use `loader/run_migration.py` or `loader/fix_migration.py` for data changes
2. **DDL changes** (CREATE TABLE, ALTER TABLE) - Use **Supabase CLI**:
   ```bash
   # Create migration file in supabase/migrations/
   # Then push to remote:
   supabase db push --linked

   # If migrations were already applied via other means:
   supabase migration repair --status applied <timestamp> --linked
   ```
3. **Verify** - Always verify the migration worked by querying the affected tables
4. **DO NOT ask user to run SQL in Supabase SQL Editor** - Use CLI instead

### Frontend Changes
When you modify frontend code:
1. **Git add** the changed files: `git add <files>`
2. **Git commit** with descriptive message
3. **Git push** to trigger Vercel deploy: `git push`
4. Wait for Vercel deploy to complete (~1-2 min)

### Migration Scripts Location
- `loader/run_migration.py` - Run L1 CE restructure via Python/REST
- `loader/fix_migration.py` - Fix migrations using delete+insert for PK changes
- `loader/add_new_columns.py` - Generate DDL SQL for Supabase SQL Editor
- `supabase/migrations/` - SQL migration files (reference, not auto-applied)

### Quick Deploy Commands
```bash
cd /Users/emikysa/Claude/HousingAffordabilityFramework
git add .
git commit -m "Description of changes"
git push
```

### Quick Migration Commands
```bash
cd /Users/emikysa/Claude/HousingAffordabilityFramework/loader
source venv/bin/activate
python run_migration.py  # or fix_migration.py
```
