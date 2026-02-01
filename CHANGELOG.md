# Housing Affordability Explorer - Changelog

> **For Claude Code:** Append a dated summary of significant changes at the end of each session.

---

## 2026-02-01 (Session 10) - L1 CE Restructure + UniFormat II Alignment

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
  - Added `uniformat_code` column (UniFormat II categories A-F, Z)
  - Added `sort_order` column
  - Updated `v_ce_drilldown_hierarchy` view

### UniFormat II Alignment
- B07-BuildCost drilldown entries tagged with UniFormat codes:
  - A = Substructure (foundations, slab)
  - B = Shell (framing, exterior, roofing)
  - C = Interiors (partitions, finishes)
  - D = Services (MEP)
  - E = Equipment & Furnishings
  - F = Special Construction
  - Z = Uncategorized

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
- `20260201080000_l1_restructure_uniformat.sql`

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
