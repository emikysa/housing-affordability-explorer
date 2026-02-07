# Housing Affordability Framework (HAF)

A web application that maps the **full lifecycle cost of delivering and occupying a housing unit** — from land acquisition through construction, sale, financing, and ongoing operations.

Used in the Affordability Series of monthly [fcbsb.org](https://www.fcbsb.org) meetings.

## Quick Overview

- **9 model dimensions** (Cost, Occupancy, Lifestyle, Water, Sewer, Electric, Gas, Finance, Risk) drive a monthly housing cost calculator
- **444 leaf-level cost elements** organized into Build (B01–B13), Occupant Finance (F00–F04), and Operations (O01–O05)
- **20 policy levers** mapped to 71 barriers through 129 barrier–lever relationships
- **4 risk presets** (Low → Very High) modeling schedule, capital, scope, and market uncertainty

## Tech Stack

- **Database:** PostgreSQL on Supabase (shared with sister project BPF)
- **Frontend:** React 18 + TypeScript + Vite + Tailwind CSS
- **Deployment:** Vercel (auto-deploy from `main`)
- **Migrations:** Supabase CLI (`supabase db push --linked --include-all`)

## Project Structure

```
HousingAffordabilityFramework/
├── Admin/              # Documentation, briefing notes, data files for review
├── frontend/           # React application (src/pages, src/components, src/contexts)
├── loader/             # Python data loaders and archived one-off scripts
├── supabase/           # Migration SQL files
└── .gitignore
```

## Documentation

Detailed documentation lives in `Admin/`:

| File | Purpose |
|------|---------|
| `Admin/CONTEXT.md` | Full architecture, data model, calculation chain, schema reference |
| `Admin/CHANGELOG.md` | Session-by-session change log |
| `Admin/HAF-briefingnote.md` | Briefing note for external reviewers (ChatGPT data quality passes) |
| `Admin/cost_elements_flattened.tsv` | Leaf-only working file (444 rows) — source of truth for framework structure |
| `Admin/cost_elements_unified.tsv` | Full hierarchy export (606 records across all levels) |

## Sister Project

The **Building Performance Framework (BPF)** maps the performance side of housing (durability, safety, comfort). Both frameworks share a Supabase database and will eventually be cross-linked.

See: [BuildingPerformanceFramework](https://github.com/emikysa/BuildingPerformanceFramework)
