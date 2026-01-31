-- ============================================
-- Fix summary stats function to handle edge cases
-- ============================================

-- The issue: get_summary_stats_for_scenario returns 0 for totals even when
-- get_cost_elements_for_scenario returns data. This is because the summary
-- function filters by cadence='One-time' but the actual data might have different
-- cadence values or the get_ce_estimate function might return NULLs.

-- Let's create a more robust version that:
-- 1. Uses stage_id for one-time vs recurring classification (Build = one-time, Operate/Finance = recurring)
-- 2. Falls back to base table values directly if scenario lookup fails

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
DECLARE
    v_is_baseline BOOLEAN;
BEGIN
    -- Check if this is the baseline scenario
    SELECT s.is_baseline INTO v_is_baseline
    FROM scenarios s WHERE s.scenario_id = p_scenario_id;

    -- If scenario not found or is baseline, use direct table values
    IF v_is_baseline IS NULL OR v_is_baseline = TRUE THEN
        RETURN QUERY
        SELECT
            (SELECT COUNT(*) FROM cost_elements)::BIGINT AS total_cost_elements,
            (SELECT COUNT(*) FROM cost_reduction_opportunities)::BIGINT AS total_cros,
            (SELECT COUNT(*) FROM barriers)::BIGINT AS total_barriers,
            (SELECT COUNT(*) FROM actors)::BIGINT AS total_actors,
            (
                SELECT COALESCE(SUM(ce.estimate), 0)
                FROM cost_elements ce
                WHERE ce.stage_id = 'Build'
            ) AS total_onetime_costs,
            (
                SELECT COALESCE(SUM(ce.annual_estimate), 0)
                FROM cost_elements ce
                WHERE ce.stage_id IN ('Operate', 'Finance')
            ) AS total_annual_costs,
            (
                SELECT COALESCE(SUM(cro.estimate), 0)
                FROM cost_reduction_opportunities cro
            ) AS total_potential_savings;
    ELSE
        -- For non-baseline scenarios, use the scenario-aware functions
        RETURN QUERY
        SELECT
            (SELECT COUNT(*) FROM cost_elements)::BIGINT AS total_cost_elements,
            (SELECT COUNT(*) FROM cost_reduction_opportunities)::BIGINT AS total_cros,
            (SELECT COUNT(*) FROM barriers)::BIGINT AS total_barriers,
            (SELECT COUNT(*) FROM actors)::BIGINT AS total_actors,
            (
                SELECT COALESCE(SUM((get_ce_estimate(p_scenario_id, ce.ce_id)).estimate), 0)
                FROM cost_elements ce WHERE ce.stage_id = 'Build'
            ) AS total_onetime_costs,
            (
                SELECT COALESCE(SUM((get_ce_estimate(p_scenario_id, ce.ce_id)).annual_estimate), 0)
                FROM cost_elements ce WHERE ce.stage_id IN ('Operate', 'Finance')
            ) AS total_annual_costs,
            (
                SELECT COALESCE(SUM(get_cro_estimate(p_scenario_id, cro.cro_id)), 0)
                FROM cost_reduction_opportunities cro
            ) AS total_potential_savings;
    END IF;
END;
$$ LANGUAGE plpgsql STABLE;
