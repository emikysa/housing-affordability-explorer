# Housing Affordability Framework (HAF) — Briefing Note for External Review

> **Date:** 2026-02-06
> **Audience:** ChatGPT or other external reviewer analyzing `cost_elements_flattened.tsv`
> **Companion files:** `cost_elements_flattened.tsv`, `CONTEXT.md`

---

## What This Framework Is

The Housing Affordability Framework (HAF) maps the **full lifecycle cost of delivering and occupying a housing unit** — from land acquisition through construction, sale, financing, and ongoing operations. It is designed to help people understand *why housing costs what it does* and *where the levers for cost reduction exist*.

The framework is used in the Affordability Series of monthly [fcbsb.org](https://www.fcbsb.org) meetings. The audience ranges from policymakers and developers to general public.

**Sister project:** The Building Performance Framework (BPF) maps the *performance* side of housing (durability, safety, comfort, etc.). The two frameworks share a database and will eventually be cross-linked.

---

## Data Model

The HAF uses a **strict tree hierarchy** with up to 5 levels of cost elements (CEL1–CEL5). Each child has exactly one parent — no many-to-many relationships in the cost tree itself.

### The Three Stages

Cost elements are organized into three chronological stages:

| Stage | Prefix | Scope | When |
|-------|--------|-------|------|
| **Build / Development** | B01–B08 | All costs to acquire land, design, permit, build, and sell a unit | Pre-acquisition through sale |
| **Occupant Finance** | F00–F04 | Construction financing and buyer mortgage/closing costs | During construction and at purchase |
| **Operations** | O01–O05 | Ongoing costs of occupying the unit | Monthly/annual post-occupancy |

### Build Stage (B01–B08) — Chronological Order

The B-series IDs are **intentionally sorted in chronological project order**, reflecting when money is spent during development:

```
B01-Land           Land acquisition & assemblage (earliest spend)
B02-PreDev         Pre-development, entitlement, approvals, permits
B05-SiteInfra      Site work & infrastructure construction
B06-SoftCosts      Architecture, engineering, consulting, developer management
B07-BuildCost      Hard construction (materials, labor, subcontractor O&P)
B08-SalesDisp      Sales, marketing, brokerage, seller closing costs (final spend)
```

> **Why this matters for finance calculations:** The chronological ordering directly drives construction financing costs. Money spent on land (B01) is carried at interest for the entire project duration. Money spent on interiors (late B07) is carried for only weeks. F00 (construction financing) is fundamentally a function of *how much* was spent × *how long ago* it was spent × *what interest rate* applies.

### Occupant Finance (F00–F04)

| ID | Name | Nature |
|----|------|--------|
| F00 | Construction Financing | **Time-weighted cost of capital during development** |
| F01 | Principal | Monthly mortgage principal (amortized) |
| F02 | Interest | Monthly mortgage interest |
| F03 | PMI | Private mortgage insurance (if <20% down) |
| F04 | Closing Costs | One-time buyer transaction costs |

#### F00 — Construction Financing: The Key Concept

F00 deserves special explanation because it's where **cost of capital meets project timeline**:

- **F00a — Construction loan costs:** Fees and interest on drawn funds during active construction. Interest accrues only on the *cumulative amount drawn*, not the full loan commitment. Each draw (for foundation, framing, mechanicals, etc.) starts its own interest clock.

- **F00b — Carry costs:** Costs of holding land and the project before completion — land carry interest (from acquisition date), pre-occupancy property taxes, builder's risk insurance.

The total F00 cost depends on:
1. **Interest rate** on construction/bridge financing
2. **Draw schedule** — when and how much is disbursed (driven by B01–B07 timing)
3. **Project duration** — longer projects carry more interest
4. **Financing structure** — not every project uses every instrument (construction loan vs. bridge loan vs. cash carry)

This is why F00 descriptions include the note: *"Not every project incurs every sub-item; these represent common financing structures and may be alternatives."*

### Operations (O01–O05)

| ID | Name | Driver |
|----|------|--------|
| O01 | Utilities | Monthly bills (electric, gas, water, sewer, trash, internet) |
| O02 | Maintenance | Repairs, reserves, pest control, warranty |
| O03 | Insurance | Homeowner's insurance |
| O04 | Taxes | Property taxes & special assessments |
| O05 | HOA | Fees, management, insurance, reserves |

---

## About the Flat TSV File

`cost_elements_flattened.tsv` is the **primary working file** for the HAF cost element hierarchy. Unlike the BPF (which has a CSV source and derives the TSV), this flat file IS the source of truth for the framework structure we're developing.

**15 tab-separated columns:**

| Column | Description |
|--------|-------------|
| CEL1 ID | Top-level category ID (e.g., B07-BuildCost) |
| CEL1 short_name | Display name (e.g., BuildCost) |
| CEL1 description | Scope description |
| CEL2 ID | Second-level ID (e.g., B07b-Shell) |
| CEL2 short_name | Display name |
| CEL2 description | Scope description |
| CEL3 ID | Third-level ID (e.g., B07b01-Structure) |
| CEL3 short_name | Display name |
| CEL3 description | Scope description |
| CEL4 ID | Fourth-level ID (e.g., B07b01a-Foundation) |
| CEL4 short_name | Display name |
| CEL4 description | Scope description |
| CEL5 ID | Fifth-level ID (e.g., B07b01a01-Basement) |
| CEL5 short_name | Display name |
| CEL5 description | Scope description |

**343 lines** (1 header + 342 leaf rows).

### ID Convention

IDs build hierarchically from the left, alternating letters and 2-digit numbers:
```
B07          → L1 (top category)
B07b         → L2 (letter suffix)
B07b01       → L3 (2-digit number)
B07b01a      → L4 (letter)
B07b01a01    → L5 (2-digit number)
```

### Leaf-Only Rows

The TSV contains **only leaf nodes** — the most granular level for each branch. Parent categories appear as ancestor context (filled in the L1–L4 columns) but don't get their own standalone row. If a node has children, it doesn't appear as a leaf.

---

## Relationship to the Database

The live web app has a more detailed database (`cost_elements_unified`, 455 records across 6 levels) that includes additional fields (stage, phase, node_class, sort_order) and goes one level deeper (L6). The flat TSV represents the **target structure** we're iterating on. The two are converging but not yet identical — the TSV is ahead on some structural decisions (e.g., B08 Sales/Disposition exists in the TSV but not yet in the database).

The database also contains:
- **22 Cost Reduction Opportunities (CROs)** — ways to reduce costs
- **71 Barriers** — obstacles preventing cost reduction
- **5 Levers** — policy interventions that address barriers
- **Actors** — who controls each cost element and lever
- **Scenarios** — model different assumptions (finance terms, utility rates, occupancy, lifestyle)

These are not in the flat file but inform how the framework is used.

---

## Multi-Dimensional Cost Calculator

The app includes a Monthly Housing Cost Calculator that combines 8 model dimensions:

```
Build Cost Model × Finance Terms = Monthly Mortgage (F01–F03)
Occupancy × Lifestyle = Monthly Consumption (gallons, kWh, therms)
Consumption × Utility Rates = Monthly Utility Costs (O01)
Sum All Monthly = Total Monthly Housing Cost
```

This is relevant because the cost elements in the TSV aren't just a taxonomy — they're the **input structure for actual calculations**. Each leaf node will eventually have dollar amounts driven by selected models.

---

## Recent Changes (this session)

### Rows added (312 → 342 leaf rows):
- **Round 1 (19 rows):** Developer overhead/fee/profit (B06e02–04), permits breakdown (B02h01–05), contingency/escalation (B07h01–04), construction financing (F00a01–03, F00b01–03), homeowner's insurance (O03a01)
- **Round 2 (11 rows):** Sales/disposition category (B08a01–04, B08b01–02, B08c01–03, B08d01–02)

### Wording improvements:
- Monthly bill labels now specific (e.g., "Monthly electric bill" not just "Monthly")
- Insurance labels disambiguated (PMI premium, HOA master policy, mortgage escrow)
- Construction financing descriptions clarify "not every project incurs every sub-item"
- Property tax timing clarified: "pre-occupancy" (F00b02) vs "ongoing post-occupancy" (O04a)
- Impact fees: "varies widely by jurisdiction" (not "municipality")

### Items we considered and deliberately skipped:
- **Glossary as static file:** Better implemented as a derived page in the app. Deferred.

---

## Risk, Determinism, and Cost of Capital

**Core principle:** Risk is not a cost itself. Risk is priced through time, capital, buffers, and transaction friction.

We want risk to be explicit, teachable, and parameterized — but NOT baked redundantly into every cost element. The following four risk parameters are **conceptual multipliers** that flow through existing cost elements, not new line items.

### R1 — Schedule Uncertainty (Duration Variance)

**What it represents:** Approval unpredictability, rework risk, supply chain volatility, inspection/enforcement inconsistency.

**Where it affects existing costs:**
- Project duration assumptions (all carry costs scale with time)
- Developer overhead (B06e02) — longer projects consume more overhead
- Construction interest (F00a02) — interest accrues for each additional month
- Carry costs (F00b) — land carry, taxes, insurance all scale with duration
- Sales holding time and concessions (B08a, B08d) — unsold units carry cost

**Teaching sentence:** "Two projects with the same average timeline but different uncertainty can have very different total costs."

### R2 — Cost-of-Capital Risk Premium

**What it represents:** Market risk, political/regulatory risk, entitlement risk, liquidity risk.

**Where it affects existing costs:**
- Construction loan interest rates (F00a02) — riskier projects pay higher rates
- Equity return targets / developer profit (B06e04) — capital demands higher returns for higher risk
- Required contingency levels (B07h) — lenders and investors require larger buffers

**Teaching sentence:** "Lower risk doesn't just reduce fees; it reduces the price of money."

### R3 — Scope and Cost Uncertainty

**What it represents:** Incomplete design, ambiguous requirements, late-stage changes, interpretation variability.

**Where it affects existing costs:**
- Design contingency (B07h01) — priced uncertainty in design completeness
- Construction contingency (B07h02) — priced uncertainty in field conditions
- Allowances (B07h04) — placeholder budgets for unresolved selections

**Teaching sentence:** "Contingency is not waste — it is priced uncertainty."

### R4 — Market Absorption / Exit Risk

**What it represents:** Uncertainty about if, when, and at what price a unit will sell.

**Where it affects existing costs:**
- Marketing spend (B08a) — harder-to-sell units require more marketing
- Seller concessions and incentives (B08d) — market softness drives concessions
- Carry costs during sales period (F00b) — unsold inventory carries interest and taxes
- Required return (B06e04) — exit risk is a major component of required return

**Teaching sentence:** "A unit can be inexpensive to build and still expensive to buy if exit risk is high."

### Risk Compounding

R1 and R2 interact multiplicatively. A project with high schedule uncertainty (R1) in a high-rate environment (R2) gets hit twice: longer duration × higher rate. This compounding is why process improvements (faster approvals, predictable inspections) can have outsized cost impacts relative to their direct fee savings.

### Municipal Leverage — The Key Insight

Many public-sector actions reduce housing cost **not by lowering nominal fees**, but by **reducing uncertainty** — shortening timelines, lowering variance, and reducing the risk premiums embedded in financing, contingency, and required returns.

A jurisdiction that:
- Processes permits in 2 weeks instead of 12 → reduces R1 (schedule uncertainty)
- Has predictable, published impact fees → reduces R3 (cost uncertainty)
- Has a track record of consistent code interpretation → reduces R2 (regulatory risk)
- Has strong market demand → reduces R4 (absorption risk)

...will attract capital at lower rates, require smaller contingencies, and ultimately deliver cheaper housing — even if its fees are not the lowest.

This is a core teaching objective of the framework.

---

## Guardrails — What NOT to Add

1. **Do not add "risk" as a generic cost element.** Risk is not a line item — it's priced through the four R-parameters above, which flow through existing elements (F00, B06e04, B07h, B08d).

2. **Do not add standalone cross-cutting theme nodes** (e.g., "Sustainability premium", "Affordable housing costs") that span multiple categories. These break MECE. They're better represented through scenario models or filtered views.

3. **Do not double-count risk.** If contingency (B07h) already prices scope uncertainty (R3), adding a separate "uncertainty surcharge" elsewhere creates double-counting.

---

## Glossary — Planned Approach (not yet implemented)

A glossary will be implemented as a **derived view/page** pulling directly from cost element names and descriptions, not as a static file. This ensures it stays in sync as the framework evolves.

When built, the glossary will include:
- A `synonyms` field for jargon terms (e.g., PMI = private mortgage insurance, DWV = drain/waste/vent, LVP = luxury vinyl plank)
- Plain-English definitions for all UI-visible nodes
- "Varies by jurisdiction" / "market dependent" qualifiers where appropriate

---

## What Would Be Most Helpful From Your Review

1. **Completeness:** Are there real-world housing costs missing from the framework? Think about costs that surprise first-time buyers, hidden development costs, or regional-specific items.

2. **MECE integrity:** Are any items duplicated or overlapping? Is anything categorized under the wrong parent?

3. **Description clarity:** Can a general audience understand what each leaf node represents? Are any descriptions too jargon-heavy or too vague?

4. **Finance logic:** Does the F00 construction financing structure make sense? Are there common financing structures we're missing?

5. **B08 Sales/Disposition:** Is this new section complete? Are there seller-side costs we missed?

6. **Operations (O01–O05):** Are there ongoing housing costs missing? (e.g., pest control, lawn service, security monitoring — some of these might be lifestyle choices vs. true housing costs)

7. **Cross-framework opportunities:** Where should the HAF and BPF connect? For example, BPF's "Durability" outcomes (A5) directly affect HAF's maintenance costs (O02). What other links would be most valuable?
