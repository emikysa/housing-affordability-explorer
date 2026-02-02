# Housing Affordability Explorer - Changelog

> **For Claude Code:** Append a dated summary of significant changes at the end of each session.

---

## 2026-02-02 (Session 15 continued) - Phase 4: Occupant Finance Models

### Database: occupant_finance_models table
Created mortgage presets for end-user housing affordability calculations:

**Conventional Loans:**
| Name | Code | Term | Rate | Down | PMI |
|------|------|------|------|------|-----|
| Conv 30-yr (20% down) | Conv30-20 | 30yr | 6.875% | 20% | None |
| Conv 30-yr (10% down) | Conv30-10 | 30yr | 7.000% | 10% | 0.50% |
| Conv 30-yr (5% down) | Conv30-5 | 30yr | 7.125% | 5% | 0.80% |
| Conv 15-yr (20% down) | Conv15-20 | 15yr | 6.250% | 20% | None |
| Conv 20-yr (20% down) | Conv20-20 | 20yr | 6.500% | 20% | None |

**Government Loans:**
| Name | Code | Term | Rate | Down | MIP |
|------|------|------|------|------|-----|
| FHA 30-yr (3.5% down) | FHA30 | 30yr | 6.625% | 3.5% | 0.85% |
| FHA 30-yr (10% down) | FHA30-10 | 30yr | 6.500% | 10% | 0.80% |
| VA 30-yr (0% down) | VA30 | 30yr | 6.375% | 0% | None |
| USDA 30-yr (0% down) | USDA30 | 30yr | 6.500% | 0% | 0.35% |

**Other:**
| Name | Code | Description |
|------|------|-------------|
| Cash Purchase | Cash | All-cash, no mortgage |

### Database Function: calculate_mortgage_payment()
PostgreSQL function that returns:
- loan_amount, down_payment
- monthly_principal_interest, monthly_pmi
- total_monthly_payment
- closing_costs, total_cash_needed

### Frontend
- `FinanceContext.tsx` - Global state for finance model selection
- `FinanceSelector.tsx` - Dropdown in header (purple background)
- `useOccupantFinanceModels` hook
- TypeScript types: `OccupantFinanceModel`, `MortgagePaymentResult`

### UI Header - Now 7 selectors in 2 rows:
Row 1: Cost (gray) | Occupancy (blue) | Lifestyle (green)
Row 2: Water (cyan) | Electric (amber) | Gas (orange) | Finance (purple)

### Files Created
- `supabase/migrations/20260202130000_finance_model_presets.sql`
- `frontend/src/contexts/FinanceContext.tsx`
- `frontend/src/components/FinanceSelector.tsx`

### Deployed: Yes (Vercel auto-deploy)

---

## 2026-02-02 (Session 15 continued) - Phase 3: Utility Models

### Database: utility_models table
Created utility rate structures with tiered pricing support:

**Water Utilities:**
| Provider | Code | Base Fee | Tier 1 Rate |
|----------|------|----------|-------------|
| Fort Collins Utilities | FCU-W | $12.50/mo | $0.00425/gal |
| Fort Collins Loveland WD | FCLWD | $18.00/mo | $0.00475/gal |
| East Larimer County WD | ELCO | $15.00/mo | $0.00500/gal |

**Electric Utilities:**
| Provider | Code | Base Fee | Tier 1 Rate |
|----------|------|----------|-------------|
| Fort Collins Utilities | FCU-E | $8.50/mo | $0.0725/kWh |
| Poudre Valley REA | PVREA | $22.00/mo | $0.0850/kWh |
| Xcel Energy | XCEL-E | $10.25/mo | $0.0795/kWh |

**Gas Utilities:**
| Provider | Code | Base Fee | Tier 1 Rate |
|----------|------|----------|-------------|
| Xcel Energy | XCEL-G | $12.00/mo | $0.65/therm |
| Atmos Energy | ATMOS | $10.50/mo | $0.68/therm |
| No Gas Service | NONE | $0 | - |

### Database Function: calculate_utility_cost()
PostgreSQL function that calculates monthly cost given:
- Utility model ID
- Consumption amount
- Is summer (for seasonal multipliers)
Handles tiered rates stored as JSONB arrays.

### Frontend
- `UtilityContext.tsx` - Manages water, electric, gas selections
- `UtilitySelector.tsx` - Single component for all 3 utility types
- Hooks: `useWaterUtilityModels`, `useElectricUtilityModels`, `useGasUtilityModels`
- TypeScript types: `UtilityModel`, `UtilityRateTier`

### UI Header - Now 2 rows of selectors:
Row 1: Cost (gray) | Occupancy (blue) | Lifestyle (green)
Row 2: Water (cyan) | Electric (amber) | Gas (orange)

### Files Created
- `supabase/migrations/20260202120000_utility_models.sql`
- `frontend/src/contexts/UtilityContext.tsx`
- `frontend/src/components/UtilitySelector.tsx`

### Deployed: Yes (Vercel auto-deploy)

---

## 2026-02-02 (Session 15 continued) - Phase 2: Lifestyle Models

### Database: lifestyle_models table
Created lifestyle presets for household consumption patterns:

| Name | Showers/wk | Laundry/wk | Heating | Description |
|------|------------|------------|---------|-------------|
| Conservative | 5 | 2 | 0.8x | Eco-conscious, minimal usage |
| Moderate | 7 | 4 | 1.0x | Typical household usage |
| Comfort-focused | 10 | 6 | 1.2x | Higher comfort, more usage |
| Work from home | 7 | 5 | 1.1x | Higher daytime usage |
| Family with young children | 5 | 8 | 1.0x | Extra laundry, baths |

### Database: consumption_factors table
Reference data for resource usage per activity (14 factors):
- **Water-intensive:** Shower (17 gal), Bath (36 gal), Laundry (20 gal), Dishwasher (6 gal)
- **Electric-intensive:** HVAC cooling (150 kWh/mo), Refrigerator (45 kWh/mo)
- **Gas-intensive:** HVAC heating (30 therms/mo), Water heater (3 therms/mo)

### Frontend
- `LifestyleContext.tsx` - Global state management
- `LifestyleSelector.tsx` - Dropdown in header (green background)
- `useLifestyleModels` + `useConsumptionFactors` hooks
- TypeScript types: `LifestyleModel`, `ConsumptionFactor`

### UI Header now shows 3 selectors:
- Cost Model (gray) | Occupancy (blue) | Lifestyle (green)

### Files Created
- `supabase/migrations/20260202110000_lifestyle_models.sql`
- `frontend/src/contexts/LifestyleContext.tsx`
- `frontend/src/components/LifestyleSelector.tsx`

### Deployed: Yes (Vercel auto-deploy)

---

## 2026-02-02 (Session 15) - Multi-Dimensional Model Architecture Phase 1: Occupancy Models

### Architecture Design
Documented comprehensive plan for multi-dimensional model system in CLAUDE_CONTEXT.md:
- **6 independent model dimensions:** Build Cost, Water Utility, Electric Utility, Gas Utility, Occupancy, Lifestyle, Finance
- Users will select one model from each dimension to see combined housing costs
- Calculation chain: Occupancy × Lifestyle → Consumption → Utility Costs → Total Monthly

### Phase 1: Occupancy Models (Complete)
Created occupancy_models table to track household composition:

**Database:**
- `occupancy_models` table: id, name, description, adults, children, sort_order
- `v_occupancy_models` view: adds computed `total_occupants` column
- 10 sample household types seeded (single adult through multi-generational)

**Frontend:**
- `OccupancyContext.tsx` - Global state management for occupancy selection
- `OccupancySelector.tsx` - Dropdown component in header
- `useOccupancyModels` hook for data fetching
- TypeScript types for OccupancyModel

**Sample Data:**
| Name | Adults | Children | Total |
|------|--------|----------|-------|
| Single adult | 1 | 0 | 1 |
| Couple | 2 | 0 | 2 |
| Couple + 1 child | 2 | 1 | 3 |
| Couple + 2 children | 2 | 2 | 4 |
| Single parent + 2 children | 1 | 2 | 3 |
| Multi-generational (4 adults + 2 children) | 4 | 2 | 6 |

### Files Created
- `supabase/migrations/20260202100000_occupancy_models.sql`
- `frontend/src/contexts/OccupancyContext.tsx`
- `frontend/src/components/OccupancySelector.tsx`

### Files Modified
- `CLAUDE_CONTEXT.md` - Added full architecture documentation
- `frontend/src/main.tsx` - Added OccupancyProvider
- `frontend/src/components/Layout.tsx` - Added OccupancySelector to header
- `frontend/src/hooks/useData.ts` - Added useOccupancyModels hook
- `frontend/src/types/database.ts` - Added OccupancyModel type

### Next Steps (Future Sessions)
- Phase 2: Lifestyle Models + Consumption Factors
- Phase 3: Utility Models (Water, Electric, Gas with tiered rates)
- Phase 4: Finance Model enhancements
- Phase 5: UI integration and scenario comparison

### Deployed: Yes (Vercel auto-deploy)

---

## 2026-02-02 (Session 14 continued) - MECE Additions + Descriptions

### MECE Gap Analysis & Additions
Compared CE table against comprehensive construction cost breakdown; added 29 missing items:
- **B05f (Site improvements):** Retaining walls, Fencing (chain link, privacy, ornamental)
- **B07b (Shell):** Masonry (brick, block, stone, glass block), Structural steel, Attached garage
- **B07c (Services):** Plumbing specialties, Fire protection specialties
- **B07d (Interiors):** Ceilings (suspended, drywall, specialty), Window treatments, Interior specialties

Fixed duplication: Removed B07c09-Elevator (duplicate of B07c10b-Elevators)
Clarified garage split: B05e09 → "Parking structure" (site), B07b11 → "Attached garage" (building)

### Chronological Reordering (Final)
Reordered 4 additional sections for construction sequence:
- **B02 L2:** Planning before Engineering
- **B05f L3:** Retaining walls → Fencing order
- **B07b L3:** Attached garage to position 2 (after Structure)
- **B07d L3:** Ceilings to position 2 (after Drywall)

110 total IDs updated (29 direct + 81 descendants).

### Description Population
Added descriptions to all 402 L2-L5 elements (L1 already had descriptions):
- Short (few-word) scope clarifiers for each CE
- Examples: "Structural frame", "Wet area tile", "Power and lighting"
- Script: `loader/populate_descriptions.py`

### Final Counts
- **455 CE records** (22 L1 + 54 L2 + 160 L3 + 145 L4 + 51 L5 + 23 L6)
- **0 empty descriptions** (all levels populated)
- **312 rows** in flattened export (`cost_elements_flattened.tsv`)

### Files Modified
- `cost_elements_unified.tsv` - 455 rows with all descriptions
- `cost_elements_flattened.tsv` - 312 rows with L1-L5 hierarchy
- `loader/populate_descriptions.py` - Description mapping script
- `loader/reorder_final.py` - Final reordering script

---

## 2026-02-02 (Session 14) - CE ID Restructure + Chronological Ordering + L/M/S Removal

### Removed Labor/Material/SubOP Leaf Nodes
Removed 429 L/M/S breakdown nodes from cost_elements_unified:
- **Rationale:** Cost breakdown (material, labor, subOP) is captured in `cost_entries` columns, not in hierarchy
- **Before:** 856 rows (L5: 360, L6: 38 included many L/M/S nodes)
- **After:** 427 rows (L1: 22, L2: 54, L3: 156, L4: 130, L5: 42, L6: 23)
- Hierarchy now ends at **work item level** (e.g., `B05a01a-Demolition`, `B07b03b-Shingles`)
- Users enter costs at any level with breakdown in columns: `amount_material`, `amount_labor`, `amount_op_other`

### CE ID Nomenclature Restructure
Changed all ce_id values to build prefixes from the LEFT (not right):
- L1: `B07-BuildCost`
- L2: `B07a-Substructure`
- L3: `B07a01-Foundation`
- L4: `B07a01a-Basement`
- L5: `B07a01a01-Drilled shafts`
- L6: `B07a01a01a-...`

Pattern: alternating letters (a-z) and 2-digit numbers (01-99) building from left.

### Chronological Reordering
Reordered all levels so alphabetical sorting produces chronological project order:

**L2 (2 categories):**
- B02-PreDev: Surveys → Geotech → Environmental → Engineering → Planning → Legal → Public process
- B06-SoftCosts: Architecture → Engineering → Consultants → Legal → Dev mgmt → Accounting → Testing

**L3 (13 categories):** B02b, B02c, B02e, B05a, B05e, B05f, B05g, B06a, B06c, B06d, B07b, B07c, B07d

**L4 (14 categories):** B05a01, B05b01, B07b02, B07b03, B07b06, B07b10, B07b11, B07c02, B07c03, B07c04, B07c05, B07c10, B07d07, B07d09

**L5 (1 category):** B07b01b-Framing

### Files Created/Modified
- `cost_elements_unified.tsv` - All 856 IDs regenerated
- `loader/regenerate_ce_ids.py` - ID regeneration script
- `loader/reorder_l3.py`, `reorder_l4.py`, `reorder_l5.py` - Reordering scripts
- `loader/sample_data/sample_cost_model.csv` - Updated to new IDs

### Validation Results
- ✓ No orphans, no duplicates, no sort_order collisions
- ✓ All sample file IDs valid
- ✓ 427 total records (after L/M/S removal)

---

## 2026-02-01 (Session 13) - MECE Validation + Instructions Review

### Validation Checks (All Passed)
- **No "Total" nodes:** Confirmed none remain (removed in Session 12)
- **B07-BuildCost L2:** 6 MECE system-based categories in correct order ✓
- **B05-SiteInfra L2:** 7 chronological categories in correct order ✓
- **B06 Testing split:** Already has Field/materials testing + Commissioning ✓
- **node_class coverage:** 100% (856/856 rows populated)
- **Tree integrity:** No orphans, levels consistent, sort_order unique per sibling group

### Instructions Review
Reviewed proposed "CLAUDE CODE IMPLEMENTATION INSTRUCTIONS" for MECE restructure:
- **Sections A-E, G:** No-regret upgrades (already implemented in Session 12)
- **Section F (element_code):** Skipped - redundant with existing ce_id + sort_order architecture
- **Section H:** Path correction needed (instructions used /mnt/data/, we use project root)

### Files Created
- `cost_elements_unified.backup.[timestamp].tsv` - Backup before validation
- `cost-elements-validation-report.md` - Detailed validation results

### Current Counts
- 856 total CE nodes: 22 L1, 54 L2, 156 L3, 226 L4, 360 L5, 38 L6
- node_class: system (771), program (36), option (21), finance (18), regulatory (7), overhead (3)

### No Changes Required
Prior Session 12 work already achieved full MECE compliance.

---

## 2026-02-01 (Session 12) - MECE Restructure + Cost/Finance Model Architecture

### Cost Elements Transformation
- **Removed 205 "Total" pseudo-nodes** - Eliminated computed rollup rows that duplicated parent info
- **Restructured B07-BuildCost L2** to 6 MECE system-based categories:
  - Substructure, Shell, Interiors, Services, Special systems & options, Shared / accessory program spaces
- **Restructured B05-SiteInfra L2** to 7 chronological categories:
  - Site preparation, Earthwork & grading, Stormwater & drainage, Site utilities, Paving & transportation, Site improvements & amenities, Landscaping & irrigation
- **Fixed B06-SoftCosts**: Renamed Accounting → "Project accounting"
- **Added `phase` column**: acquisition, predesign, entitlement, precon, construction, closeout, operations, occupant_finance, crosscutting
- **Added `node_class` column**: system, program, option, regulatory, overhead, finance
- **Extended level constraint** to allow L6 (38 items needed deeper hierarchy)
- **Final counts**: L1: 17, L2: 35, L3: 126, L4: 226, L5: 360, L6: 38 = **802 total**

### New Cost/Finance Model Architecture
Separated project cost data from financing assumptions to enable mix-and-match scenario analysis:

- **`cost_time_models` table**: Project cost and schedule data
- **`cost_entries` table**: Line items with `date_paid` for time-value calculations
  - Columns: ce_id, date_paid, amount_total, amount_material, labor_hours, labor_rate, amount_labor, amount_op_other
- **`finance_models` table**: Cost of capital assumptions
- **`finance_assumptions` table**: Phase-specific rates with optional time-varying rates
  - Baseline rates by phase: acquisition 6%, predesign 7%, entitlement 8%, precon 9%, construction 10%, closeout 9%, operations 6%, occupant_finance 7%, crosscutting 8%
- **B10-Finance updated**: Now "Development financing fees (origination, points, commitment fees). Interest/carrying costs calculated separately."

### Files Created
- `supabase/migrations/20260201160000_add_phase_nodeclass_columns.sql`
- `supabase/migrations/20260201161000_allow_level_6.sql`
- `supabase/migrations/20260201170000_cost_finance_models.sql`
- `loader/transform_cost_elements.py` - MECE restructure script
- `loader/upload_unified_ce.py` - TSV → Supabase uploader
- `loader/calculate_carrying_costs.py` - Carrying cost calculation engine
- `migration_report.txt` - Detailed change log

### Design Decision: Carrying Cost Calculation
- One cost/time model × multiple finance models = "What if rates change?"
- Multiple cost/time models × one finance model = "What if we shorten entitlement?"
- Carrying costs compound annually, calculated from date_paid to project_end
- Interest expense calculated separately from explicit financing fees (B10)

### Deployed: Yes (database + data migration complete)

---

## 2026-02-01 (Session 11) - Unified Cost Elements Table

### Database Changes
- **Created `cost_elements_unified` table** - Single table for all cost elements at all levels (L1-L5)
  - Self-referential hierarchy via `parent_id` FK
  - 1,087 records total: 22 L1 + 56 L2 + 158 L3 + 347 L4 + 504 L5
  - Columns: ce_id, parent_id, level, short_name, description, stage_id, sort_order, estimate, annual_estimate, unit, cadence, notes, assumptions, is_computed
- **Hierarchical ID generation:**
  - L1: `B07-BuildCost` (existing format)
  - L2: `B07-BuildCosta`, `B07-BuildCostb` (append letter)
  - L3: `B07-BuildCosta01`, `B07-BuildCosta02` (append 2-digit number)
  - L4: `B07-BuildCosta01a`, `B07-BuildCosta01b` (append letter)
  - L5: `B07-BuildCosta01a01`, `B07-BuildCosta01a02` (append 2-digit number)
- **Migration via Supabase CLI:** `supabase db push` for DDL, Python script for data

### Files Created
- `supabase/migrations/20260201200000_create_unified_cost_elements.sql` - DDL for unified table
- `loader/create_unified_cost_elements.py` - Migration script to populate from old tables
- `cost_elements_unified.tsv` - Full export for review (1,002 lines)

### Key Learnings
- Supabase CLI (`supabase db push`) can run DDL migrations when logged in
- `supabase migration repair --status applied` marks already-applied migrations
- Old `ce_drilldown` table only had text names, not IDs for L2-L5

### Pending
- Review exported TSV and make any corrections
- Decide whether to keep or drop old `cost_elements` and `ce_drilldown` tables
- Update frontend to use new unified table

### Deployed: Database migration complete, frontend not yet updated

---

## 2026-02-01 (Session 10) - L1 CE Restructure

### Database Changes
- **L1 CE Renumbering:** Removed a/b suffixes, renumbered B01-B13 clean sequence
  - B04a-PermitsAdmin → B03-Permits
  - B04b-UtilityFees → B04-Utilities
  - B09-TempIndirect → B08-TempIndirect (filled gap)
  - B10-RiskIns → B09-RiskIns
  - B11-Finance → B10-Finance
  - B12-Overhead → B11-Overhead
  - B13-Contingtic → B12-Contingency (renamed)
  - B14-Return → B13-Return
- **LandCarry Removal:** B03-LandCarry removed as L1 CE
  - Drilldown data migrated to B10-Finance
  - Concept now handled via duration attributes + financing
- **O03 Rename:** O03-PropInsurance → O03-PropIns for consistency
- **New Table:** `ce_code_alias` for backward compatibility mapping
- **ce_drilldown Enhancements:**
  - Added `level5_name` column (5-level hierarchy support)
  - Added `cost_composition` column (mixed/material/labor/sub_op)
  - Added `sort_order` column
  - Updated `v_ce_drilldown_hierarchy` view

### Frontend Changes
- Updated `database.ts` types for ce_drilldown (new columns)
- Added CECodeAlias type export

### Documentation
- Created `MIGRATION.md` with full old→new CE mapping
- Updated `CLAUDE_CONTEXT.md` with new CE list

### Cost Elements (22 total after migration)
- Build: B01-B13 (13 elements)
- Operate: O01-O05 (5 elements)
- Finance: F01-F04 (4 elements)

### Migration File
- `20260201080000_l1_restructure.sql`

### Deployed: Pending (migration SQL ready)

---

## 2026-02-01 (Session 9) - Cost Element Consolidation, Explorer Fixes

### Database Changes
- Consolidated B07-HardMatl + B08-HardLabor into B07-BuildCost
  - Combined estimate: $247,500 ($125,000 materials + $122,500 labor)
  - Description: "Hard construction - materials and labor"
  - B08 gap intentionally left for future use
- Migrated all foreign key references (cro_ce_map, ce_actor_map, ce_drilldown)
- Migration: `20260201070000_rename_b07_remove_b08.sql`

### Frontend Changes
- Added `vercel.json` for SPA routing (fixes 404 on direct URL access/refresh)
- Fixed Explorer Barrier cards to show `description` instead of `short_name`
  - Line 1: barrier_id (monospace)
  - Line 2: description (human-readable)

### Cost Elements (23 total, B08 gap intentional)
- Build stage: B01-B07, B09-B14 (13 elements)
- Operate stage: O01-O05 (5 elements)
- Finance stage: F01-F04 (4 elements)

### Deployed: Yes (via git push to Vercel)

---

## 2026-02-01 (Session 8) - Barrier-CRO Many-to-Many, Simplified Barrier IDs, Models Rename

### Database Changes
- Created `barrier_cro_map` junction table for many-to-many Barrier-CRO relationships
- Migrated 71 existing barrier-CRO relationships from deprecated `cro_id` column
- Created `v_barrier_cros` view for querying barrier-CRO relationships
- Updated `v_barriers` view to include all description fields and `cro_count`
- Renamed all barrier IDs from `BAR-{CRO}-{NAME}` to `BAR-{NAME}` format
  - e.g., `BAR-DURATION-LONG_TIMELINES` → `BAR-LONG_TIMELINES`
- Added `actor_code` column to actors table (ACT-01 through ACT-11)
- Renamed "Scenarios" to "Models" throughout (database scenario renamed to "Model 1 - Illustrative")

### Frontend Changes
- Renamed `ScenarioContext.tsx` → `ModelContext.tsx`, `ScenarioSelector.tsx` → `ModelSelector.tsx`
- Renamed `Scenarios.tsx` → `Models.tsx`, updated route from `/scenarios` to `/models`
- Updated Barriers page:
  - Changed title from "Barriers & Levers" to "Barriers"
  - Replaced single CRO column with CRO count badge column
  - Detail panel now shows multiple linked CROs with descriptions
- Added new hooks: `useBarrierCros()`, `useCrosForBarrier()`, `useBarriersForCro()`
- Updated TypeScript types for new tables and views

### Migrations
- `20260201040000_actor_codes.sql` - Add actor_code column
- `20260201050000_barrier_cro_many_to_many.sql` - Junction table and views
- `20260201060000_rename_barrier_ids.sql` - Simplify barrier ID format

### Deployed: Yes (via git push to Vercel)

---

## 2026-02-01 (Session 7) - Multi-Select, Explorer Levers, Nav Simplification

### Cost Elements Page - Multi-Select Implementation
- Changed from single-select to multi-select for all columns
- Added "Select all" / "Deselect all" buttons to each column header
- Selection indicator shows count of selected items per level
- Added sort toggle (A-Z / By Count) matching Explorer page style

### Explorer Page - Levers Column Added
- Expanded from 4-column to 5-column layout: Costs → Opportunities → Barriers → Levers → Actors
- Added LeverCard component (purple color scheme)
- Added LeverDetail component showing implementation info and related barriers
- Clicking a lever filters to show related barriers, CROs, CEs, and actors
- Lever-barrier relationships flow through barrier_lever_map

### Navigation Simplification
- Renamed "Cost Elements" tab to "Costs"
- Renamed "Reduction Opportunities" tab to "Opportunities"
- Split "Barriers & Levers" into separate "Barriers" and "Levers" tabs

### Code Changes
- `frontend/src/pages/CostElements.tsx`: Multi-select with Sets, sort toggle, Select all/Deselect all
- `frontend/src/pages/Explorer.tsx`: Added Levers column, LeverCard, LeverDetail, lever filtering logic
- `frontend/src/components/Layout.tsx`: Updated nav labels

### Deployed: Yes (via git push to Vercel)

---

## 2026-02-01 (Session 6) - Levers as First-Class Entities

### Database Schema Changes
- Created `levers` table with columns: lever_id, lever_type_id, name, description, implementation_approach, typical_actors, typical_timeline, feasibility_notes
- Created `barrier_lever_map` junction table for many-to-many relationship between barriers and levers
- Created `v_levers` view (includes barrier_count)
- Created `v_barrier_levers` view for easy querying of relationships
- Migration: `20260201_levers_refactor_v2.sql`
- Migrated existing barrier lever_id data: 5 levers created, 71 barrier-lever mappings

### New Levers Page
- Added `/levers` route with AG Grid displaying all levers
- Filter by lever type
- Detail panel shows related barriers

### UI Changes
- Split "Barriers & Levers" nav item into separate "Barriers" and "Levers" links
- Cost Elements page: Renamed columns from "Cost Elements + CE Level 1-4" to "CE Level 1-5"

### Code Changes
- `frontend/src/types/database.ts`: Added Lever, BarrierLever, BarrierLeverMap types
- `frontend/src/hooks/useData.ts`: Added useLevers, useBarrierLevers, useLeversForBarrier, useBarriersForLever hooks
- `frontend/src/pages/Levers.tsx`: New page
- `frontend/src/App.tsx`: Added /levers route
- `frontend/src/components/Layout.tsx`: Updated navigation

### Deployed: Yes (via git push to Vercel)

---

## 2026-02-01 (Session 5) - Hierarchical Codes for CE Levels

### Cost Elements Page - Explorer-Style Layout
- Completely redesigned from grid+dropdowns to 5-column Explorer-style layout
- Column 1: Cost Elements (clickable cards with details button)
- Columns 2-5: CE Level 1-4 hierarchy items
- Clicking a CE filters hierarchy columns to show only that CE's breakdown
- Clicking hierarchy items cascades filtering downstream

### Auto-Generated Hierarchical Codes
- Added unique codes to each CE level display name
- Code pattern: `B07a` (L1) → `B07a01` (L2) → `B07a01a` (L3) → `B07a01a01` (L4)
- Letters and 2-digit numbers alternate at each level
- Codes based on alphabetical sort order within each level
- Codes shown in: column cards, filter breadcrumb bar, detail panel

### Code Changes
- `frontend/src/pages/CostElements.tsx`:
  - Added `indexToLetters()` and `generateHierarchyCodes()` functions
  - New components: `ExplorerColumn`, `CECard`, `HierarchyCard`
  - Filter breadcrumb bar shows current selection path with codes

### Deployed: Yes (via git push to Vercel)

---

## 2026-01-31 (Session 4) - CE Drilldown Hierarchy

### Database Changes
- Created `ce_drilldown` table with foreign key to `cost_elements`
- Added migration: `20260131030000_ce_drilldown.sql`
- Loaded 1,001 hierarchy records from `Housing-Affordability-Framework-CostElement-drilldown.xlsx`
- Note: `B07-HardCosts` in Excel maps to `B07-HardMatl` in database

### Cost Elements Page Enhancements
- Added 4 cascading level filter dropdowns (CE Level 1-4)
- Filters cascade: selecting a parent level limits child options to matching branches
- Clearing a parent filter clears all downstream selections
- Added "Cost Breakdown Hierarchy" section to detail panel showing drilldown levels
- Reorganized filter UI into two rows for better layout

### Code Changes
- Updated `frontend/src/types/database.ts`: Added `CEDrilldown` type
- Updated `frontend/src/hooks/useData.ts`: Added `useCEDrilldown` hook
- Updated `frontend/src/pages/CostElements.tsx`: Cascading filters + detail panel hierarchy

### Deployed: Yes

---

## 2026-01-31 (Session 3)

### Explorer Page Improvements
- Added sort toggle in header: A-Z (alphabetical) vs By Value (descending)
- Made cards more compact to reduce scrolling:
  - CE cards: Removed stage badges (redundant with B/O/F prefix in ID)
  - CRO cards: Removed stage badges
  - Barrier cards: Put type in parentheses after ID, removed redundant second row
  - Actor cards: Removed duplicate row
- Deployed via git push

### Documentation
- Updated `CLAUDE_CONTEXT.md` with:
  - Expanded file structure (contexts, migrations, new components)
  - Scenario architecture documentation
  - Key database functions
  - Current UI architecture details

---

## 2026-01-31 (Context Recovery Session)

- Created `CLAUDE_CONTEXT.md` with full project documentation
- Created `CHANGELOG.md` (this file) for tracking changes across sessions
- **Deployment reminder:** `git add . && git commit -m "message" && git push` triggers Vercel auto-deploy

---

## 2026-01-31 (Earlier Session)

- Dashboard: Added vertical bar charts side-by-side in 3-column grid layout
- Dashboard: Added `max-w-5xl mx-auto` constraint for comfortable reading width
- Dashboard: Monthly Payment Summary repositioned as compact card
- Dashboard: Limited legend items to 6 with "+X more" indicator
- Deployed to Vercel via git push

---

## Prior Work (Summary)

- Built full Housing Affordability Explorer application
- Set up Supabase database with 9 lookup tables, 3 core tables, 3 junction tables, 6 views
- Created Python data loader to import from Excel workbook
- Built React/TypeScript frontend with AG Grid and Recharts
- Deployed to Vercel with GitHub auto-deploy integration
- Added Dashboard with:
  - Build Cost Element Breakdown (stacked horizontal bar chart)
  - Operate + Finance Cost Element Breakdown (monthly, stacked horizontal bar)
  - Monthly Payment Summary Table
- Implemented full-width layout for data grid pages

---

<!-- 
TEMPLATE FOR NEW ENTRIES:

## YYYY-MM-DD

- Change 1
- Change 2
- Deployed: Yes/No

-->
