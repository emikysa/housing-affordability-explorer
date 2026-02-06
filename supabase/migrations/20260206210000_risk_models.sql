-- ============================================================================
-- Risk Models: 9th model dimension for the Multi-Dimensional Model Architecture
-- ============================================================================
-- Risk is not a cost itself. Risk is priced through time, capital, buffers,
-- and transaction friction. These four risk parameters (R1-R4) are conceptual
-- multipliers that flow through existing cost elements.
-- ============================================================================

CREATE TABLE IF NOT EXISTS risk_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  -- R1: Schedule Uncertainty (Duration Variance)
  schedule_variance_pct numeric NOT NULL DEFAULT 0,
  -- R2: Cost-of-Capital Risk Premium
  rate_premium_bps numeric NOT NULL DEFAULT 0,
  -- R3: Scope and Cost Uncertainty
  design_contingency_pct numeric NOT NULL DEFAULT 0,
  construction_contingency_pct numeric NOT NULL DEFAULT 0,
  -- R4: Market Absorption / Exit Risk
  marketing_multiplier numeric NOT NULL DEFAULT 1.0,
  sales_period_months numeric NOT NULL DEFAULT 0,
  sort_order integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS with public read
ALTER TABLE risk_models ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "risk_models_read" ON risk_models FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- View matching pattern of other model views
CREATE OR REPLACE VIEW v_risk_models AS
  SELECT * FROM risk_models ORDER BY sort_order;

-- Insert 4 preset risk models
INSERT INTO risk_models (id, name, description, schedule_variance_pct, rate_premium_bps, design_contingency_pct, construction_contingency_pct, marketing_multiplier, sales_period_months, sort_order)
VALUES
  ('00000000-0000-0000-0005-000000000001', 'Low Risk',
   'Well-defined project in a predictable jurisdiction with strong market demand. Experienced team, proven plans, by-right approvals.',
   0, 0, 3, 5, 1.0, 0, 1),

  ('00000000-0000-0000-0005-000000000002', 'Medium Risk',
   'Standard project with some regulatory uncertainty. Typical market conditions, standard design complexity, discretionary review likely.',
   10, 50, 5, 8, 1.2, 2, 2),

  ('00000000-0000-0000-0005-000000000003', 'High Risk',
   'Complex project with significant regulatory hurdles. Custom design, uncertain market, extended approval timelines expected.',
   25, 150, 8, 12, 1.5, 4, 3),

  ('00000000-0000-0000-0005-000000000004', 'Very High Risk',
   'Pioneering or first-of-kind project in a challenging jurisdiction. Untested market, novel construction methods, multiple entitlement barriers.',
   40, 300, 12, 18, 2.0, 8, 4)
ON CONFLICT (id) DO NOTHING;
