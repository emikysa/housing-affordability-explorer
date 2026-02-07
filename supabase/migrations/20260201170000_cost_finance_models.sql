-- ============================================================
-- Cost/Time Models and Finance Models Schema
-- ============================================================
-- This migration creates a separation between:
-- 1. Cost/Time Models: What was built, when, for how much
-- 2. Finance Models: Cost of capital assumptions by phase
--
-- This allows mixing and matching: one cost/time model can be
-- analyzed with multiple finance models to compare scenarios.
-- ============================================================

-- ============================================================
-- COST/TIME MODELS
-- ============================================================

-- Main table for cost/time models (project cost and schedule data)
CREATE TABLE IF NOT EXISTS cost_time_models (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    is_baseline BOOLEAN DEFAULT FALSE,
    is_public BOOLEAN DEFAULT TRUE,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Project timeline info
    project_start_date DATE,
    project_end_date DATE,

    -- Metadata
    source_file TEXT,  -- Original spreadsheet filename
    notes TEXT
);

COMMENT ON TABLE cost_time_models IS 'Project cost and schedule models - contains what was built, when, and for how much';

-- Cost entries: individual line items with dates
CREATE TABLE IF NOT EXISTS cost_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cost_time_model_id UUID NOT NULL REFERENCES cost_time_models(id) ON DELETE CASCADE,
    ce_id TEXT NOT NULL REFERENCES cost_elements_unified(ce_id),

    -- When the cost was paid
    date_paid DATE NOT NULL,

    -- Cost breakdown
    amount_total DECIMAL(12,2) NOT NULL,
    amount_material DECIMAL(12,2),
    labor_hours DECIMAL(10,2),
    labor_rate DECIMAL(8,2),
    amount_labor DECIMAL(12,2),  -- Could be computed as hours * rate
    amount_op_other DECIMAL(12,2),  -- O&P and other costs

    -- Metadata
    source_row TEXT,  -- Reference to original spreadsheet row
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE cost_entries IS 'Individual cost line items with payment dates for time-value calculations';
COMMENT ON COLUMN cost_entries.date_paid IS 'Date the cost was paid - used for carrying cost calculations';
COMMENT ON COLUMN cost_entries.amount_op_other IS 'Overhead, profit, and other costs not broken into material/labor';

-- Index for efficient queries
CREATE INDEX IF NOT EXISTS idx_cost_entries_model ON cost_entries(cost_time_model_id);
CREATE INDEX IF NOT EXISTS idx_cost_entries_ce ON cost_entries(ce_id);
CREATE INDEX IF NOT EXISTS idx_cost_entries_date ON cost_entries(cost_time_model_id, date_paid);

-- ============================================================
-- FINANCE MODELS
-- ============================================================

-- Main table for finance models (cost of capital assumptions)
CREATE TABLE IF NOT EXISTS finance_models (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    is_baseline BOOLEAN DEFAULT FALSE,
    is_public BOOLEAN DEFAULT TRUE,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Default rate if not specified by phase
    default_annual_rate DECIMAL(5,4),  -- e.g., 0.0800 for 8%

    notes TEXT
);

COMMENT ON TABLE finance_models IS 'Finance assumption models - cost of capital by phase for carrying cost calculations';

-- Finance assumptions: rate curves by phase
CREATE TABLE IF NOT EXISTS finance_assumptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    finance_model_id UUID NOT NULL REFERENCES finance_models(id) ON DELETE CASCADE,

    -- Which phase this rate applies to
    phase TEXT NOT NULL,  -- matches cost_elements_unified.phase

    -- Rate info
    annual_rate DECIMAL(5,4) NOT NULL,  -- e.g., 0.0800 for 8%
    compound_annually BOOLEAN DEFAULT TRUE,

    -- Optional: time-varying rates within a phase
    effective_from DATE,  -- NULL means "from project start"
    effective_to DATE,    -- NULL means "until project end"

    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Ensure unique phase per model (unless using time-varying rates)
    UNIQUE(finance_model_id, phase, effective_from)
);

COMMENT ON TABLE finance_assumptions IS 'Cost of capital rates by phase - allows different rates for acquisition, construction, etc.';
COMMENT ON COLUMN finance_assumptions.phase IS 'Phase from cost_elements_unified: acquisition, predesign, entitlement, precon, construction, closeout, operations, occupant_finance, crosscutting';
COMMENT ON COLUMN finance_assumptions.annual_rate IS 'Annual cost of capital rate as decimal (0.08 = 8%)';
COMMENT ON COLUMN finance_assumptions.compound_annually IS 'If true, compound interest annually; if false, simple interest';

-- Index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_finance_assumptions_model ON finance_assumptions(finance_model_id);
CREATE INDEX IF NOT EXISTS idx_finance_assumptions_phase ON finance_assumptions(finance_model_id, phase);

-- ============================================================
-- UPDATE B10-Finance DESCRIPTION
-- ============================================================

-- Update B10-Finance to clarify it's for explicit fees only
UPDATE cost_elements_unified
SET description = 'Development financing fees (origination, points, commitment fees). Interest/carrying costs calculated separately.'
WHERE ce_id = 'B10-Finance';

-- ============================================================
-- BASELINE DATA
-- ============================================================

-- Create a baseline finance model with typical rates
INSERT INTO finance_models (id, name, description, is_baseline, default_annual_rate, notes)
VALUES (
    '00000000-0000-0000-0000-000000000002',
    'Baseline Finance Assumptions',
    'Default cost of capital assumptions by development phase',
    TRUE,
    0.0800,
    'Based on typical 2024 market conditions'
);

-- Insert phase-specific rates for baseline
INSERT INTO finance_assumptions (finance_model_id, phase, annual_rate, compound_annually, notes)
VALUES
    ('00000000-0000-0000-0000-000000000002', 'acquisition', 0.0600, TRUE, 'Land holding - lower risk, equity-like'),
    ('00000000-0000-0000-0000-000000000002', 'predesign', 0.0700, TRUE, 'Early planning - moderate risk'),
    ('00000000-0000-0000-0000-000000000002', 'entitlement', 0.0800, TRUE, 'Entitlement risk - uncertain timeline'),
    ('00000000-0000-0000-0000-000000000002', 'precon', 0.0900, TRUE, 'Pre-construction - committed capital'),
    ('00000000-0000-0000-0000-000000000002', 'construction', 0.1000, TRUE, 'Construction loan rates'),
    ('00000000-0000-0000-0000-000000000002', 'closeout', 0.0900, TRUE, 'Project completion phase'),
    ('00000000-0000-0000-0000-000000000002', 'operations', 0.0600, TRUE, 'Stabilized operations - permanent debt'),
    ('00000000-0000-0000-0000-000000000002', 'occupant_finance', 0.0700, TRUE, 'Mortgage/consumer finance'),
    ('00000000-0000-0000-0000-000000000002', 'crosscutting', 0.0800, TRUE, 'Default rate for items spanning phases');

-- ============================================================
-- VIEWS FOR ANALYSIS
-- ============================================================

-- View: Cost entries with CE hierarchy info
CREATE OR REPLACE VIEW v_cost_entries AS
SELECT
    ce.id,
    ce.cost_time_model_id,
    ctm.name AS model_name,
    ce.ce_id,
    cu.short_name AS ce_name,
    cu.phase,
    cu.level AS ce_level,
    cu.parent_id AS ce_parent_id,
    ce.date_paid,
    ce.amount_total,
    ce.amount_material,
    ce.labor_hours,
    ce.labor_rate,
    ce.amount_labor,
    ce.amount_op_other,
    ce.notes
FROM cost_entries ce
JOIN cost_time_models ctm ON ce.cost_time_model_id = ctm.id
JOIN cost_elements_unified cu ON ce.ce_id = cu.ce_id;

-- View: Finance assumptions with model info
CREATE OR REPLACE VIEW v_finance_assumptions AS
SELECT
    fa.id,
    fa.finance_model_id,
    fm.name AS model_name,
    fa.phase,
    fa.annual_rate,
    fa.compound_annually,
    fa.effective_from,
    fa.effective_to,
    fa.notes
FROM finance_assumptions fa
JOIN finance_models fm ON fa.finance_model_id = fm.id;

-- ============================================================
-- RLS POLICIES
-- ============================================================

-- Enable RLS
ALTER TABLE cost_time_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE cost_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_assumptions ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Public read cost_time_models" ON cost_time_models FOR SELECT USING (is_public = TRUE);
CREATE POLICY "Public read cost_entries" ON cost_entries FOR SELECT USING (TRUE);
CREATE POLICY "Public read finance_models" ON finance_models FOR SELECT USING (is_public = TRUE);
CREATE POLICY "Public read finance_assumptions" ON finance_assumptions FOR SELECT USING (TRUE);
