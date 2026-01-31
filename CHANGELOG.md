# Housing Affordability Explorer - Changelog

> **For Claude Code:** Append a dated summary of significant changes at the end of each session.

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
