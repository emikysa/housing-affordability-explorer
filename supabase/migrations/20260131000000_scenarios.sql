-- ============================================
-- HOUSING AFFORDABILITY FRAMEWORK
-- Migration: Multi-Scenario Support
-- ============================================

-- ============================================
-- 1. MODIFY SCENARIOS TABLE
-- ============================================

-- Add parent_scenario_id for sub-scenario inheritance
ALTER TABLE scenarios
ADD COLUMN IF NOT EXISTS parent_scenario_id UUID REFERENCES scenarios(scenario_id) ON DELETE SET NULL;

-- Add is_baseline to mark the original data scenario
ALTER TABLE scenarios
ADD COLUMN IF NOT EXISTS is_baseline BOOLEAN DEFAULT FALSE;

-- Add sort_order for display ordering
ALTER TABLE scenarios
ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- Create index for parent lookups
CREATE INDEX IF NOT EXISTS idx_scenarios_parent ON scenarios(parent_scenario_id);

-- ============================================
-- 2. CREATE SCENARIO VALUE TABLES
-- ============================================

-- Cost Element values per scenario
CREATE TABLE IF NOT EXISTS ce_scenario_values (
    id SERIAL PRIMARY KEY,
    scenario_id UUID NOT NULL REFERENCES scenarios(scenario_id) ON DELETE CASCADE,
    ce_id VARCHAR(30) NOT NULL REFERENCES cost_elements(ce_id) ON DELETE CASCADE,
    estimate NUMERIC(12,2),
    annual_estimate NUMERIC(12,2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (scenario_id, ce_id)
);

-- CRO values per scenario
CREATE TABLE IF NOT EXISTS cro_scenario_values (
    id SERIAL PRIMARY KEY,
    scenario_id UUID NOT NULL REFERENCES scenarios(scenario_id) ON DELETE CASCADE,
    cro_id VARCHAR(50) NOT NULL REFERENCES cost_reduction_opportunities(cro_id) ON DELETE CASCADE,
    estimate NUMERIC(12,2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (scenario_id, cro_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_ce_scenario_values_scenario ON ce_scenario_values(scenario_id);
CREATE INDEX IF NOT EXISTS idx_ce_scenario_values_ce ON ce_scenario_values(ce_id);
CREATE INDEX IF NOT EXISTS idx_cro_scenario_values_scenario ON cro_scenario_values(scenario_id);
CREATE INDEX IF NOT EXISTS idx_cro_scenario_values_cro ON cro_scenario_values(cro_id);

-- ============================================
-- 3. ROW LEVEL SECURITY
-- ============================================

ALTER TABLE ce_scenario_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE cro_scenario_values ENABLE ROW LEVEL SECURITY;

-- Public read access for scenario values (if scenario is public)
CREATE POLICY "Public read access" ON ce_scenario_values FOR SELECT USING (
    EXISTS (SELECT 1 FROM scenarios WHERE scenarios.scenario_id = ce_scenario_values.scenario_id AND scenarios.is_public = true)
);

CREATE POLICY "Public read access" ON cro_scenario_values FOR SELECT USING (
    EXISTS (SELECT 1 FROM scenarios WHERE scenarios.scenario_id = cro_scenario_values.scenario_id AND scenarios.is_public = true)
);

-- ============================================
-- 4. INSERT BASELINE SCENARIO
-- ============================================

-- Create "Scenario 1 - Illustrative" as the baseline
INSERT INTO scenarios (scenario_id, name, description, is_baseline, is_default, is_public, sort_order)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'Scenario 1 - Illustrative',
    'The original baseline scenario representing illustrative housing costs and reduction opportunities.',
    TRUE,
    TRUE,
    TRUE,
    1
)
ON CONFLICT (scenario_id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    is_baseline = EXCLUDED.is_baseline,
    is_default = EXCLUDED.is_default;

-- ============================================
-- 5. SCENARIO-AWARE FUNCTIONS
-- ============================================

-- Function to get CE estimate with scenario override support (handles inheritance)
CREATE OR REPLACE FUNCTION get_ce_estimate(
    p_scenario_id UUID,
    p_ce_id VARCHAR(30)
) RETURNS TABLE(estimate NUMERIC(12,2), annual_estimate NUMERIC(12,2)) AS $$
DECLARE
    v_scenario_id UUID := p_scenario_id;
    v_estimate NUMERIC(12,2);
    v_annual_estimate NUMERIC(12,2);
    v_parent_id UUID;
    v_is_baseline BOOLEAN;
BEGIN
    -- Walk up the scenario hierarchy looking for values
    LOOP
        -- Check if this scenario has override values
        SELECT csv.estimate, csv.annual_estimate
        INTO v_estimate, v_annual_estimate
        FROM ce_scenario_values csv
        WHERE csv.scenario_id = v_scenario_id AND csv.ce_id = p_ce_id;

        -- If we found values, return them
        IF v_estimate IS NOT NULL OR v_annual_estimate IS NOT NULL THEN
            RETURN QUERY SELECT v_estimate, v_annual_estimate;
            RETURN;
        END IF;

        -- Check if this is the baseline scenario
        SELECT s.is_baseline, s.parent_scenario_id
        INTO v_is_baseline, v_parent_id
        FROM scenarios s WHERE s.scenario_id = v_scenario_id;

        -- If baseline, use the original table values
        IF v_is_baseline THEN
            RETURN QUERY
            SELECT ce.estimate, ce.annual_estimate
            FROM cost_elements ce WHERE ce.ce_id = p_ce_id;
            RETURN;
        END IF;

        -- If no parent, return NULLs (standalone scenario with no value set)
        IF v_parent_id IS NULL THEN
            RETURN QUERY SELECT NULL::NUMERIC(12,2), NULL::NUMERIC(12,2);
            RETURN;
        END IF;

        -- Move up to parent scenario
        v_scenario_id := v_parent_id;
    END LOOP;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to get CRO estimate with scenario override support (handles inheritance)
CREATE OR REPLACE FUNCTION get_cro_estimate(
    p_scenario_id UUID,
    p_cro_id VARCHAR(50)
) RETURNS NUMERIC(12,2) AS $$
DECLARE
    v_scenario_id UUID := p_scenario_id;
    v_estimate NUMERIC(12,2);
    v_parent_id UUID;
    v_is_baseline BOOLEAN;
BEGIN
    -- Walk up the scenario hierarchy looking for values
    LOOP
        -- Check if this scenario has override value
        SELECT csv.estimate INTO v_estimate
        FROM cro_scenario_values csv
        WHERE csv.scenario_id = v_scenario_id AND csv.cro_id = p_cro_id;

        -- If we found a value, return it
        IF v_estimate IS NOT NULL THEN
            RETURN v_estimate;
        END IF;

        -- Check if this is the baseline scenario
        SELECT s.is_baseline, s.parent_scenario_id
        INTO v_is_baseline, v_parent_id
        FROM scenarios s WHERE s.scenario_id = v_scenario_id;

        -- If baseline, use the original table value
        IF v_is_baseline THEN
            SELECT cro.estimate INTO v_estimate
            FROM cost_reduction_opportunities cro WHERE cro.cro_id = p_cro_id;
            RETURN v_estimate;
        END IF;

        -- If no parent, return NULL (standalone scenario with no value set)
        IF v_parent_id IS NULL THEN
            RETURN NULL;
        END IF;

        -- Move up to parent scenario
        v_scenario_id := v_parent_id;
    END LOOP;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- 6. SCENARIO-AWARE VIEWS
-- ============================================

-- View for scenarios list
CREATE OR REPLACE VIEW v_scenarios AS
SELECT
    s.scenario_id,
    s.name,
    s.description,
    s.parent_scenario_id,
    ps.name AS parent_scenario_name,
    s.is_baseline,
    s.is_default,
    s.is_public,
    s.sort_order,
    s.created_at,
    s.updated_at
FROM scenarios s
LEFT JOIN scenarios ps ON s.parent_scenario_id = ps.scenario_id
WHERE s.is_public = true
ORDER BY s.sort_order, s.created_at;

-- Function to get cost elements for a specific scenario
CREATE OR REPLACE FUNCTION get_cost_elements_for_scenario(p_scenario_id UUID)
RETURNS TABLE (
    ce_id VARCHAR(30),
    description TEXT,
    notes TEXT,
    assumptions TEXT,
    estimate NUMERIC(12,2),
    annual_estimate NUMERIC(12,2),
    unit VARCHAR(30),
    cadence VARCHAR(20),
    sort_order INTEGER,
    stage_id VARCHAR(20),
    stage_description TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ce.ce_id,
        ce.description,
        ce.notes,
        ce.assumptions,
        (get_ce_estimate(p_scenario_id, ce.ce_id)).estimate,
        (get_ce_estimate(p_scenario_id, ce.ce_id)).annual_estimate,
        ce.unit,
        ce.cadence,
        ce.sort_order,
        s.stage_id,
        s.description AS stage_description
    FROM cost_elements ce
    LEFT JOIN stages s ON ce.stage_id = s.stage_id
    ORDER BY s.sort_order, ce.sort_order;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to get CROs for a specific scenario
CREATE OR REPLACE FUNCTION get_cros_for_scenario(p_scenario_id UUID)
RETURNS TABLE (
    cro_id VARCHAR(50),
    description TEXT,
    value_drivers TEXT,
    estimate NUMERIC(12,2),
    unit VARCHAR(30),
    requires_upfront_investment BOOLEAN,
    notes TEXT,
    sort_order INTEGER,
    stage_id VARCHAR(20),
    stage_description TEXT,
    cadence_id VARCHAR(20),
    cadence_description TEXT,
    dependency_id VARCHAR(20),
    dependency_description TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        cro.cro_id,
        cro.description,
        cro.value_drivers,
        get_cro_estimate(p_scenario_id, cro.cro_id),
        cro.unit,
        cro.requires_upfront_investment,
        cro.notes,
        cro.sort_order,
        s.stage_id,
        s.description AS stage_description,
        sc.cadence_id,
        sc.description AS cadence_description,
        pd.dependency_id,
        pd.description AS dependency_description
    FROM cost_reduction_opportunities cro
    LEFT JOIN stages s ON cro.stage_id = s.stage_id
    LEFT JOIN savings_cadences sc ON cro.cadence_id = sc.cadence_id
    LEFT JOIN primary_dependencies pd ON cro.dependency_id = pd.dependency_id
    ORDER BY cro.sort_order;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to get CRO-CE impact for a specific scenario
CREATE OR REPLACE FUNCTION get_cro_ce_impact_for_scenario(p_scenario_id UUID)
RETURNS TABLE (
    cro_id VARCHAR(50),
    cro_description TEXT,
    cro_estimate NUMERIC(12,2),
    ce_id VARCHAR(30),
    ce_description TEXT,
    ce_estimate NUMERIC(12,2),
    relationship VARCHAR(20),
    relationship_description TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        m.cro_id,
        cro.description AS cro_description,
        get_cro_estimate(p_scenario_id, m.cro_id) AS cro_estimate,
        m.ce_id,
        ce.description AS ce_description,
        (get_ce_estimate(p_scenario_id, m.ce_id)).estimate AS ce_estimate,
        m.relationship,
        r.description AS relationship_description
    FROM cro_ce_map m
    JOIN cost_reduction_opportunities cro ON m.cro_id = cro.cro_id
    JOIN cost_elements ce ON m.ce_id = ce.ce_id
    LEFT JOIN cro_ce_relationships r ON m.relationship = r.relationship_id
    ORDER BY cro.sort_order, m.relationship;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to get actor cost control for a specific scenario
CREATE OR REPLACE FUNCTION get_actor_cost_control_for_scenario(p_scenario_id UUID)
RETURNS TABLE (
    ce_id VARCHAR(30),
    ce_description TEXT,
    ce_estimate NUMERIC(12,2),
    actor_id VARCHAR(50),
    actor_description TEXT,
    role VARCHAR(20),
    policy_lever TEXT,
    notes TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        m.ce_id,
        ce.description AS ce_description,
        (get_ce_estimate(p_scenario_id, m.ce_id)).estimate AS ce_estimate,
        m.actor_id,
        a.description AS actor_description,
        m.role,
        m.policy_lever,
        m.notes
    FROM ce_actor_map m
    JOIN cost_elements ce ON m.ce_id = ce.ce_id
    JOIN actors a ON m.actor_id = a.actor_id
    ORDER BY ce.sort_order, m.role;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to get summary stats for a specific scenario
CREATE OR REPLACE FUNCTION get_summary_stats_for_scenario(p_scenario_id UUID)
RETURNS TABLE (
    total_cost_elements BIGINT,
    total_cros BIGINT,
    total_barriers BIGINT,
    total_actors BIGINT,
    total_onetime_costs NUMERIC,
    total_annual_costs NUMERIC,
    total_potential_savings NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        (SELECT COUNT(*) FROM cost_elements)::BIGINT AS total_cost_elements,
        (SELECT COUNT(*) FROM cost_reduction_opportunities)::BIGINT AS total_cros,
        (SELECT COUNT(*) FROM barriers)::BIGINT AS total_barriers,
        (SELECT COUNT(*) FROM actors)::BIGINT AS total_actors,
        (
            SELECT COALESCE(SUM((get_ce_estimate(p_scenario_id, ce.ce_id)).estimate), 0)
            FROM cost_elements ce WHERE ce.cadence = 'One-time'
        ) AS total_onetime_costs,
        (
            SELECT COALESCE(SUM((get_ce_estimate(p_scenario_id, ce.ce_id)).annual_estimate), 0)
            FROM cost_elements ce WHERE ce.cadence != 'One-time'
        ) AS total_annual_costs,
        (
            SELECT COALESCE(SUM(get_cro_estimate(p_scenario_id, cro.cro_id)), 0)
            FROM cost_reduction_opportunities cro
        ) AS total_potential_savings;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- 7. GRANT PERMISSIONS
-- ============================================

GRANT SELECT ON v_scenarios TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_ce_estimate(UUID, VARCHAR) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_cro_estimate(UUID, VARCHAR) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_cost_elements_for_scenario(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_cros_for_scenario(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_cro_ce_impact_for_scenario(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_actor_cost_control_for_scenario(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_summary_stats_for_scenario(UUID) TO anon, authenticated;
