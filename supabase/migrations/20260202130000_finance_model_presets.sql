-- Migration: Add finance model presets for occupant mortgage scenarios
-- Part of Multi-Dimensional Model Architecture - Phase 4

-- ============================================
-- OCCUPANT FINANCE MODELS (for mortgage selection)
-- ============================================
-- These are selectable presets for end-user mortgage scenarios
-- Different from the existing finance_models which are for developer carrying costs

CREATE TABLE IF NOT EXISTS occupant_finance_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,                           -- e.g., "Conventional 30-year Fixed"
  short_code text,                              -- Short code for display
  description text,

  -- Loan terms
  loan_term_years integer NOT NULL DEFAULT 30,   -- Typical: 15, 20, 30
  annual_interest_rate numeric(6,5) NOT NULL,    -- e.g., 0.06875 for 6.875%

  -- Down payment
  down_payment_percent numeric(5,4) NOT NULL DEFAULT 0.20,  -- e.g., 0.20 for 20%
  min_down_payment_percent numeric(5,4),         -- Minimum allowed (e.g., 0.035 for FHA)

  -- Additional monthly costs as % of loan
  pmi_rate numeric(6,5) DEFAULT 0,               -- Private mortgage insurance rate (annual)
  pmi_threshold numeric(5,4) DEFAULT 0.20,       -- PMI drops off at this equity %

  -- Closing costs
  closing_cost_percent numeric(5,4) DEFAULT 0.03, -- Buyer closing costs as % of price

  -- Loan type info
  loan_type text DEFAULT 'conventional',         -- conventional, fha, va, usda, jumbo
  is_adjustable boolean DEFAULT false,           -- ARM vs fixed

  -- Metadata
  effective_date date DEFAULT CURRENT_DATE,
  source_description text,
  notes text,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

COMMENT ON TABLE occupant_finance_models IS 'Mortgage finance presets for end-user housing affordability calculations';
COMMENT ON COLUMN occupant_finance_models.annual_interest_rate IS 'Annual interest rate as decimal (0.06875 = 6.875%)';
COMMENT ON COLUMN occupant_finance_models.pmi_rate IS 'Annual PMI rate as decimal (0.005 = 0.5% annually)';

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_occupant_finance_models_type ON occupant_finance_models(loan_type);
CREATE INDEX IF NOT EXISTS idx_occupant_finance_models_sort ON occupant_finance_models(sort_order);

-- Enable RLS
ALTER TABLE occupant_finance_models ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read access for occupant_finance_models" ON occupant_finance_models FOR SELECT USING (true);

-- ============================================
-- SEED DATA: Common Mortgage Scenarios
-- ============================================

INSERT INTO occupant_finance_models (
  id, name, short_code, description, loan_term_years, annual_interest_rate,
  down_payment_percent, min_down_payment_percent, pmi_rate, pmi_threshold,
  closing_cost_percent, loan_type, is_adjustable, source_description, sort_order
) VALUES
  -- Conventional loans
  ('00000000-0000-0000-0004-000000000001',
   'Conventional 30-Year Fixed (20% down)', 'Conv30-20',
   'Standard 30-year fixed rate mortgage with 20% down payment (no PMI)',
   30, 0.06875, 0.20, 0.03, 0, 0.20, 0.03,
   'conventional', false, 'Average rates as of Feb 2026', 1),

  ('00000000-0000-0000-0004-000000000002',
   'Conventional 30-Year Fixed (10% down)', 'Conv30-10',
   '30-year fixed with 10% down payment (includes PMI)',
   30, 0.07000, 0.10, 0.03, 0.00500, 0.20, 0.03,
   'conventional', false, 'Average rates as of Feb 2026', 2),

  ('00000000-0000-0000-0004-000000000003',
   'Conventional 30-Year Fixed (5% down)', 'Conv30-5',
   '30-year fixed with 5% down payment (includes PMI)',
   30, 0.07125, 0.05, 0.03, 0.00800, 0.20, 0.03,
   'conventional', false, 'Average rates as of Feb 2026', 3),

  ('00000000-0000-0000-0004-000000000004',
   'Conventional 15-Year Fixed (20% down)', 'Conv15-20',
   '15-year fixed rate mortgage with 20% down payment',
   15, 0.06250, 0.20, 0.03, 0, 0.20, 0.03,
   'conventional', false, 'Average rates as of Feb 2026', 4),

  ('00000000-0000-0000-0004-000000000005',
   'Conventional 20-Year Fixed (20% down)', 'Conv20-20',
   '20-year fixed rate mortgage with 20% down payment',
   20, 0.06500, 0.20, 0.03, 0, 0.20, 0.03,
   'conventional', false, 'Average rates as of Feb 2026', 5),

  -- FHA loans
  ('00000000-0000-0000-0004-000000000011',
   'FHA 30-Year Fixed (3.5% down)', 'FHA30',
   'FHA-insured 30-year mortgage with minimum down payment',
   30, 0.06625, 0.035, 0.035, 0.00850, 0.20, 0.04,
   'fha', false, 'FHA MIP rates as of Feb 2026', 11),

  ('00000000-0000-0000-0004-000000000012',
   'FHA 30-Year Fixed (10% down)', 'FHA30-10',
   'FHA-insured 30-year mortgage with 10% down payment',
   30, 0.06500, 0.10, 0.035, 0.00800, 0.20, 0.04,
   'fha', false, 'FHA MIP rates as of Feb 2026', 12),

  -- VA loans (0% down, no PMI for veterans)
  ('00000000-0000-0000-0004-000000000021',
   'VA 30-Year Fixed (0% down)', 'VA30',
   'VA-guaranteed 30-year mortgage with no down payment required',
   30, 0.06375, 0.00, 0.00, 0, 0, 0.02,
   'va', false, 'VA rates as of Feb 2026', 21),

  -- USDA loans (rural)
  ('00000000-0000-0000-0004-000000000031',
   'USDA 30-Year Fixed (0% down)', 'USDA30',
   'USDA rural development loan with no down payment',
   30, 0.06500, 0.00, 0.00, 0.00350, 0, 0.03,
   'usda', false, 'USDA rates as of Feb 2026', 31),

  -- Cash purchase (no loan)
  ('00000000-0000-0000-0004-000000000099',
   'Cash Purchase', 'Cash',
   'All-cash purchase with no mortgage financing',
   0, 0, 1.00, 1.00, 0, 0, 0.02,
   'cash', false, 'No financing costs', 99);

-- ============================================
-- VIEW
-- ============================================

CREATE OR REPLACE VIEW v_occupant_finance_models AS
SELECT
  id,
  name,
  short_code,
  description,
  loan_term_years,
  annual_interest_rate,
  down_payment_percent,
  min_down_payment_percent,
  pmi_rate,
  pmi_threshold,
  closing_cost_percent,
  loan_type,
  is_adjustable,
  effective_date,
  source_description,
  notes,
  sort_order,
  created_at,
  updated_at
FROM occupant_finance_models
ORDER BY sort_order;

-- Grant access
GRANT SELECT ON v_occupant_finance_models TO anon, authenticated;

-- ============================================
-- MORTGAGE PAYMENT CALCULATION FUNCTION
-- ============================================
-- Calculate monthly mortgage payment given purchase price and finance model

CREATE OR REPLACE FUNCTION calculate_mortgage_payment(
  p_finance_model_id uuid,
  p_purchase_price numeric,
  p_custom_down_payment_percent numeric DEFAULT NULL  -- Override model default if provided
) RETURNS TABLE (
  loan_amount numeric,
  down_payment numeric,
  monthly_principal_interest numeric,
  monthly_pmi numeric,
  total_monthly_payment numeric,
  closing_costs numeric,
  total_cash_needed numeric
) AS $$
DECLARE
  v_model occupant_finance_models%ROWTYPE;
  v_down_pct numeric;
  v_down_payment numeric;
  v_loan_amount numeric;
  v_monthly_rate numeric;
  v_num_payments integer;
  v_monthly_pi numeric;
  v_monthly_pmi numeric;
  v_closing_costs numeric;
BEGIN
  -- Get the finance model
  SELECT * INTO v_model FROM occupant_finance_models WHERE id = p_finance_model_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Determine down payment percentage
  v_down_pct := COALESCE(p_custom_down_payment_percent, v_model.down_payment_percent);

  -- Calculate amounts
  v_down_payment := p_purchase_price * v_down_pct;
  v_loan_amount := p_purchase_price - v_down_payment;
  v_closing_costs := p_purchase_price * v_model.closing_cost_percent;

  -- Handle cash purchase (no loan)
  IF v_model.loan_term_years = 0 OR v_model.annual_interest_rate = 0 THEN
    RETURN QUERY SELECT
      0::numeric AS loan_amount,
      p_purchase_price AS down_payment,
      0::numeric AS monthly_principal_interest,
      0::numeric AS monthly_pmi,
      0::numeric AS total_monthly_payment,
      v_closing_costs AS closing_costs,
      (p_purchase_price + v_closing_costs) AS total_cash_needed;
    RETURN;
  END IF;

  -- Calculate monthly P&I using standard mortgage formula
  -- M = P * [r(1+r)^n] / [(1+r)^n - 1]
  v_monthly_rate := v_model.annual_interest_rate / 12;
  v_num_payments := v_model.loan_term_years * 12;

  v_monthly_pi := v_loan_amount *
    (v_monthly_rate * POWER(1 + v_monthly_rate, v_num_payments)) /
    (POWER(1 + v_monthly_rate, v_num_payments) - 1);

  -- Calculate PMI if applicable (below equity threshold)
  IF v_down_pct < v_model.pmi_threshold AND v_model.pmi_rate > 0 THEN
    v_monthly_pmi := (v_loan_amount * v_model.pmi_rate) / 12;
  ELSE
    v_monthly_pmi := 0;
  END IF;

  RETURN QUERY SELECT
    ROUND(v_loan_amount, 2) AS loan_amount,
    ROUND(v_down_payment, 2) AS down_payment,
    ROUND(v_monthly_pi, 2) AS monthly_principal_interest,
    ROUND(v_monthly_pmi, 2) AS monthly_pmi,
    ROUND(v_monthly_pi + v_monthly_pmi, 2) AS total_monthly_payment,
    ROUND(v_closing_costs, 2) AS closing_costs,
    ROUND(v_down_payment + v_closing_costs, 2) AS total_cash_needed;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_mortgage_payment IS 'Calculate monthly mortgage payment given purchase price and finance model ID';
