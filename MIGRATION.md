# L1 Cost Element Restructure + UniFormat II Alignment

**Migration Date:** 2026-02-01
**Migration File:** `supabase/migrations/20260201080000_l1_restructure_uniformat.sql`

---

## Overview

This migration performs three major changes:
1. **L1 CE Restructure** - Removes a/b suffixes, renumbers to B01-B13 clean sequence
2. **LandCarry Removal** - Removes B03-LandCarry as L1 CE, migrates concept to B10-Finance
3. **UniFormat II Alignment** - Adds systems-based categorization to B07-BuildCost drilldown

---

## Old → New CE Code Mapping

### Build Stage (B01-B13)

| Old Code | New Code | Description |
|----------|----------|-------------|
| B01-Land | B01-Land | Land acquisition & assemblage |
| B02-PreDev | B02-PreDev | Pre-development, entitlement, and approvals |
| **B03-LandCarry** | **REMOVED** | Migrated to B10-Finance |
| B04a-PermitsAdmin | **B03-Permits** | Permits, plan review, and administrative fees |
| B04b-UtilityFees | **B04-Utilities** | Utility connection, tap, and capacity fees |
| B05-SiteInfra | B05-SiteInfra | Site work & infrastructure construction |
| B06-SoftCosts | B06-SoftCosts | Professional, consulting, and admin soft costs |
| B07-BuildCost | B07-BuildCost | Hard construction (materials, labor, subcontractor O&P) |
| B09-TempIndirect | **B08-TempIndirect** | Temporary, indirect, and jobsite costs |
| B10-RiskIns | **B09-RiskIns** | Construction insurance, bonding, and third-party risk |
| B11-Finance | **B10-Finance** | Development financing & capital costs |
| B12-Overhead | **B11-Overhead** | Developer overhead, sales, and marketing |
| B13-Contingtic | **B12-Contingency** | Risk, uncertainty, and legal contingency |
| B14-Return | **B13-Return** | Required developer return |

### Operations Stage (O01-O05) - Unchanged

| Code | Description |
|------|-------------|
| O01-Utilities | Operating utilities |
| O02-Maint | Maintenance, repairs, and capital reserves |
| O03-PropIns | Operating property insurance *(renamed from O03-PropInsurance)* |
| O04-Taxes | Property taxes & special assessments |
| O05-HOA | HOA fees and assessments |

### Occupant Finance Stage (F01-F04) - Unchanged

| Code | Description |
|------|-------------|
| F01-Principal | Mortgage principal payment |
| F02-Interest | Mortgage interest payment |
| F03-PMI | Private mortgage insurance (PMI) |
| F04-Closing | Buyer closing costs (one-time) |

---

## LandCarry Migration Strategy

The concept of "land carrying costs" (B03-LandCarry) represented costs incurred during the predevelopment/entitlement phase due to time delays. Rather than tracking these as a separate L1 element, they are now handled through:

### 1. Migrated Data
- All `ce_drilldown` entries for B03-LandCarry → moved to B10-Finance
- All `cro_ce_map` references → updated to B10-Finance
- All `ce_actor_map` references → updated to B10-Finance
- All `ce_scenario_values` → updated to B10-Finance

### 2. Duration Attributes (Recommended Model Implementation)
For future scenario modeling, track duration explicitly via scenario parameters:
- `entitlement_duration_months`
- `precon_duration_months`
- `construction_duration_months`
- `leaseup_or_sale_duration_months`

Finance costs can then be computed as: `(total_capital_deployed * interest_rate * duration_months / 12)`

### 3. No Double Counting Safeguard
By consolidating LandCarry into Finance, the model prevents:
- ❌ Explicit "holding cost" line item + computed interest during predevelopment
- ✅ Single source of truth for time-based financing costs

---

## UniFormat II Grouping for B07-BuildCost

The `ce_drilldown` table now includes a `uniformat_code` column for B07-BuildCost entries:

| UniFormat Code | Category | Example Level 1 Names |
|----------------|----------|----------------------|
| **A** | Substructure | Foundations, Footings, Basement, Slab |
| **B** | Shell | Framing, Exterior Walls, Roofing, Windows, Doors |
| **C** | Interiors | Partitions, Finishes, Flooring, Ceilings, Millwork |
| **D** | Services | Plumbing, HVAC, Electrical, Fire Protection |
| **E** | Equipment & Furnishings | Appliances, Fixtures |
| **F** | Special Construction | Demolition, Hazmat Abatement |
| **Z** | Uncategorized | Items not matching above patterns |

### Sort Order
Drilldown entries are now sorted by:
1. `uniformat_code` (A → Z)
2. `level1_name` (alphabetical)
3. `level2_name` → `level5_name` (alphabetical)

---

## New Database Schema Elements

### `ce_code_alias` Table
For backward compatibility, maps old codes to new codes:

```sql
CREATE TABLE ce_code_alias (
    id SERIAL PRIMARY KEY,
    old_code VARCHAR(30) NOT NULL UNIQUE,
    new_code VARCHAR(30) NOT NULL,
    migration_date DATE,
    notes TEXT
);
```

**Usage:** Application logic can query this table to resolve legacy references.

### New `ce_drilldown` Columns

| Column | Type | Description |
|--------|------|-------------|
| `level5_name` | VARCHAR(200) | Fifth hierarchy level (optional) |
| `cost_composition` | VARCHAR(20) | 'mixed', 'material', 'labor', or 'sub_op' |
| `uniformat_code` | VARCHAR(20) | UniFormat II category code (A-F, Z) |
| `sort_order` | INTEGER | Display order within CE |

---

## Verification Queries

```sql
-- Check L1 CEs after migration (should be 13 B-codes)
SELECT ce_id, description, sort_order
FROM cost_elements
WHERE ce_id LIKE 'B%'
ORDER BY sort_order;

-- Check for any a/b suffixes (should return 0 rows)
SELECT ce_id FROM cost_elements WHERE ce_id ~ '[ab]-';

-- Verify LandCarry is removed
SELECT * FROM cost_elements WHERE ce_id LIKE '%LandCarry%';

-- Check alias table has all mappings
SELECT * FROM ce_code_alias ORDER BY old_code;

-- Check UniFormat distribution for B07
SELECT uniformat_code, COUNT(*)
FROM ce_drilldown
WHERE ce_code = 'B07-BuildCost'
GROUP BY uniformat_code
ORDER BY uniformat_code;

-- Total CE count by stage prefix
SELECT
    LEFT(ce_id, 1) AS stage_prefix,
    COUNT(*)
FROM cost_elements
GROUP BY LEFT(ce_id, 1);
-- Expected: B=13, O=5, F=4
```

---

## Breaking Changes

1. **CE IDs Changed** - Any hardcoded references to old IDs (B04a, B04b, B09-B14, B03-LandCarry, O03-PropInsurance) will break
2. **B08 No Longer a Gap** - B08-TempIndirect now exists (was intentional gap before)
3. **LandCarry Concept** - Must be modeled via Finance + duration, not as separate line item

---

## Rollback (Emergency Only)

If rollback is required, the `ce_code_alias` table can be used to reverse the mapping:

```sql
-- Example rollback for one CE (not recommended for production)
UPDATE cost_elements SET ce_id = 'B04a-PermitsAdmin' WHERE ce_id = 'B03-Permits';
-- ... repeat for all changed CEs using alias table
```

**Note:** Rollback is complex due to FK cascade. Test thoroughly in staging first.
