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
│   │   │   ├── ScenarioSelector.tsx  # Dropdown for scenario selection
│   │   │   ├── FilterToggle.tsx      # "Populated only / Show all" toggle
│   │   │   └── DetailPanel.tsx       # Slide-out detail panels
│   │   ├── contexts/
│   │   │   └── ScenarioContext.tsx   # Global scenario state management
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx         # Two-tier: Framework Overview + Scenario Analysis
│   │   │   ├── CostElements.tsx      # AG Grid of cost elements
│   │   │   ├── Opportunities.tsx     # AG Grid of CROs
│   │   │   ├── Scenarios.tsx         # Scenario management cards
│   │   │   └── Explorer.tsx          # 4-column interactive explorer
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

- **9 lookup tables:** stages, actors, barrier_types, barrier_scopes, etc.
- **3 core tables:** cost_elements, cost_reduction_opportunities, barriers
- **3 junction tables:** cro_ce_map, ce_actor_map, barrier_authority_map
- **6 denormalized views:** For easy frontend queries (v_cost_elements, v_cros, v_barriers, etc.)
- **Row Level Security:** Public read access, restricted write

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

### Data Counts
| Entity | Count |
|--------|-------|
| Cost Elements | 24 |
| CROs | 22 |
| Barriers | 71 |
| Actor-CE mappings | 43 |
| CRO-CE mappings | 55 |

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
- 4-column interactive view: Cost Elements → CROs → Barriers → Actors
- Click any item to filter related items across all columns
- Sort toggle: A-Z (alphabetical) or By Value (descending)
- Semantic color coding: Gray (CE), Green (CRO), Amber (Barrier), Blue (Actor)

### Scenario Selector Placement
- **Dashboard:** Embedded in Scenario Analysis section (not in header)
- **Scenarios page:** No header selector (page manages scenarios directly)
- **Other pages:** Prominent selector in header

### Filter Toggle
- Cost Elements and Opportunities pages have "Populated only / Show all" toggle
- Default: "Populated only" (hides items with no estimate)

---

## Future Enhancements Discussed

- Custom domain setup (affordabilityexplorer.fcbsb.org)
- Migration to IONOS if needed

---

## Session Protocol

1. **Start of session:** Read this file (`cat CLAUDE_CONTEXT.md`)
2. **During session:** Test changes locally before deploying
3. **End of session:** Append summary of changes to `CHANGELOG.md`
