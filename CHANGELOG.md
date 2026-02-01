# Housing Affordability Explorer - Changelog

> **For Claude Code:** Append a dated summary of significant changes at the end of each session.

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
