-- ============================================
-- HOUSING AFFORDABILITY FRAMEWORK
-- PostgreSQL Schema for Supabase
-- ============================================

-- Enable UUID extension (Supabase has this by default)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- CONTROLLED VOCABULARY TABLES (Lookup/Reference)
-- ============================================

CREATE TABLE stages (
    stage_id VARCHAR(20) PRIMARY KEY,
    description TEXT,
    sort_order INTEGER DEFAULT 0
);

CREATE TABLE barrier_types (
    type_id VARCHAR(20) PRIMARY KEY,
    description TEXT
);

CREATE TABLE barrier_scopes (
    scope_id VARCHAR(20) PRIMARY KEY,
    description TEXT
);

CREATE TABLE lever_types (
    lever_id VARCHAR(50) PRIMARY KEY,
    description TEXT
);

CREATE TABLE feasibility_horizons (
    horizon_id VARCHAR(20) PRIMARY KEY,
    description TEXT,
    sort_order INTEGER DEFAULT 0
);

CREATE TABLE savings_cadences (
    cadence_id VARCHAR(20) PRIMARY KEY,
    description TEXT
);

CREATE TABLE primary_dependencies (
    dependency_id VARCHAR(20) PRIMARY KEY,
    description TEXT
);

CREATE TABLE actors (
    actor_id VARCHAR(50) PRIMARY KEY,
    description TEXT
);

CREATE TABLE cro_ce_relationships (
    relationship_id VARCHAR(20) PRIMARY KEY,
    description TEXT
);

-- ============================================
-- CORE DATA TABLES
-- ============================================

CREATE TABLE cost_elements (
    ce_id VARCHAR(30) PRIMARY KEY,
    stage_id VARCHAR(20) REFERENCES stages(stage_id),
    description TEXT NOT NULL,
    notes TEXT,
    assumptions TEXT,
    estimate NUMERIC(12,2),
    annual_estimate NUMERIC(12,2),
    unit VARCHAR(30),
    cadence VARCHAR(20),
    is_computed BOOLEAN DEFAULT FALSE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE cost_reduction_opportunities (
    cro_id VARCHAR(50) PRIMARY KEY,
    description TEXT NOT NULL,
    value_drivers TEXT,
    estimate NUMERIC(12,2),
    unit VARCHAR(30),
    stage_id VARCHAR(20) REFERENCES stages(stage_id),
    cadence_id VARCHAR(20) REFERENCES savings_cadences(cadence_id),
    dependency_id VARCHAR(20) REFERENCES primary_dependencies(dependency_id),
    requires_upfront_investment BOOLEAN DEFAULT FALSE,
    notes TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE barriers (
    barrier_id VARCHAR(80) PRIMARY KEY,
    cro_id VARCHAR(50) REFERENCES cost_reduction_opportunities(cro_id),
    description TEXT NOT NULL,
    short_name VARCHAR(50),
    type_id VARCHAR(20) REFERENCES barrier_types(type_id),
    scope_id VARCHAR(20) REFERENCES barrier_scopes(scope_id),
    pattern_id VARCHAR(50),
    effect_mechanism TEXT,
    lever_id VARCHAR(50) REFERENCES lever_types(lever_id),
    authority TEXT,
    horizon_id VARCHAR(20) REFERENCES feasibility_horizons(horizon_id),
    actor_scope VARCHAR(20),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- JUNCTION TABLES (Many-to-Many Relationships)
-- ============================================

CREATE TABLE cro_ce_map (
    id SERIAL PRIMARY KEY,
    cro_id VARCHAR(50) REFERENCES cost_reduction_opportunities(cro_id) ON DELETE CASCADE,
    ce_id VARCHAR(30) REFERENCES cost_elements(ce_id) ON DELETE CASCADE,
    relationship VARCHAR(20) REFERENCES cro_ce_relationships(relationship_id),
    UNIQUE (cro_id, ce_id, relationship)
);

CREATE TABLE ce_actor_map (
    id SERIAL PRIMARY KEY,
    ce_id VARCHAR(30) REFERENCES cost_elements(ce_id) ON DELETE CASCADE,
    actor_id VARCHAR(50) REFERENCES actors(actor_id) ON DELETE CASCADE,
    role VARCHAR(20) CHECK (role IN ('Primary', 'Secondary')),
    policy_lever TEXT,
    notes TEXT,
    UNIQUE (ce_id, actor_id, role)
);

CREATE TABLE barrier_authority_map (
    id SERIAL PRIMARY KEY,
    barrier_id VARCHAR(80) REFERENCES barriers(barrier_id) ON DELETE CASCADE,
    actor_id VARCHAR(50) REFERENCES actors(actor_id) ON DELETE CASCADE,
    UNIQUE (barrier_id, actor_id)
);

-- ============================================
-- SCENARIOS & PARAMETERS (Future expansion)
-- ============================================

CREATE TABLE scenario_parameters (
    id SERIAL PRIMARY KEY,
    category VARCHAR(30) NOT NULL,
    parameter_id VARCHAR(50) NOT NULL,
    description TEXT,
    default_value NUMERIC(15,6),
    unit VARCHAR(20),
    UNIQUE (category, parameter_id)
);

CREATE TABLE scenarios (
    scenario_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_default BOOLEAN DEFAULT FALSE,
    is_public BOOLEAN DEFAULT TRUE,
    created_by UUID, -- Future: link to auth.users
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE scenario_values (
    id SERIAL PRIMARY KEY,
    scenario_id UUID REFERENCES scenarios(scenario_id) ON DELETE CASCADE,
    parameter_id INTEGER REFERENCES scenario_parameters(id),
    value NUMERIC(15,6),
    UNIQUE (scenario_id, parameter_id)
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX idx_barriers_cro ON barriers(cro_id);
CREATE INDEX idx_barriers_type ON barriers(type_id);
CREATE INDEX idx_barriers_scope ON barriers(scope_id);
CREATE INDEX idx_barriers_horizon ON barriers(horizon_id);
CREATE INDEX idx_cro_ce_map_cro ON cro_ce_map(cro_id);
CREATE INDEX idx_cro_ce_map_ce ON cro_ce_map(ce_id);
CREATE INDEX idx_ce_actor_map_ce ON ce_actor_map(ce_id);
CREATE INDEX idx_ce_actor_map_actor ON ce_actor_map(actor_id);
CREATE INDEX idx_cost_elements_stage ON cost_elements(stage_id);
CREATE INDEX idx_cro_stage ON cost_reduction_opportunities(stage_id);
CREATE INDEX idx_scenario_values_scenario ON scenario_values(scenario_id);

-- ============================================
-- ROW LEVEL SECURITY (for Supabase)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE barrier_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE barrier_scopes ENABLE ROW LEVEL SECURITY;
ALTER TABLE lever_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE feasibility_horizons ENABLE ROW LEVEL SECURITY;
ALTER TABLE savings_cadences ENABLE ROW LEVEL SECURITY;
ALTER TABLE primary_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE actors ENABLE ROW LEVEL SECURITY;
ALTER TABLE cro_ce_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE cost_elements ENABLE ROW LEVEL SECURITY;
ALTER TABLE cost_reduction_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE barriers ENABLE ROW LEVEL SECURITY;
ALTER TABLE cro_ce_map ENABLE ROW LEVEL SECURITY;
ALTER TABLE ce_actor_map ENABLE ROW LEVEL SECURITY;
ALTER TABLE barrier_authority_map ENABLE ROW LEVEL SECURITY;
ALTER TABLE scenario_parameters ENABLE ROW LEVEL SECURITY;
ALTER TABLE scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE scenario_values ENABLE ROW LEVEL SECURITY;

-- Public read access for all reference data
CREATE POLICY "Public read access" ON stages FOR SELECT USING (true);
CREATE POLICY "Public read access" ON barrier_types FOR SELECT USING (true);
CREATE POLICY "Public read access" ON barrier_scopes FOR SELECT USING (true);
CREATE POLICY "Public read access" ON lever_types FOR SELECT USING (true);
CREATE POLICY "Public read access" ON feasibility_horizons FOR SELECT USING (true);
CREATE POLICY "Public read access" ON savings_cadences FOR SELECT USING (true);
CREATE POLICY "Public read access" ON primary_dependencies FOR SELECT USING (true);
CREATE POLICY "Public read access" ON actors FOR SELECT USING (true);
CREATE POLICY "Public read access" ON cro_ce_relationships FOR SELECT USING (true);
CREATE POLICY "Public read access" ON cost_elements FOR SELECT USING (true);
CREATE POLICY "Public read access" ON cost_reduction_opportunities FOR SELECT USING (true);
CREATE POLICY "Public read access" ON barriers FOR SELECT USING (true);
CREATE POLICY "Public read access" ON cro_ce_map FOR SELECT USING (true);
CREATE POLICY "Public read access" ON ce_actor_map FOR SELECT USING (true);
CREATE POLICY "Public read access" ON barrier_authority_map FOR SELECT USING (true);
CREATE POLICY "Public read access" ON scenario_parameters FOR SELECT USING (true);
CREATE POLICY "Public read access" ON scenarios FOR SELECT USING (is_public = true);
CREATE POLICY "Public read access" ON scenario_values FOR SELECT USING (
    EXISTS (SELECT 1 FROM scenarios WHERE scenarios.scenario_id = scenario_values.scenario_id AND scenarios.is_public = true)
);

-- ============================================
-- USEFUL VIEWS FOR THE FRONTEND
-- ============================================

-- Denormalized view of cost elements with stage info
CREATE OR REPLACE VIEW v_cost_elements AS
SELECT
    ce.ce_id,
    ce.description,
    ce.notes,
    ce.assumptions,
    ce.estimate,
    ce.annual_estimate,
    ce.unit,
    ce.cadence,
    ce.sort_order,
    s.stage_id,
    s.description AS stage_description
FROM cost_elements ce
LEFT JOIN stages s ON ce.stage_id = s.stage_id
ORDER BY s.sort_order, ce.sort_order;

-- Denormalized view of CROs with related info
CREATE OR REPLACE VIEW v_cost_reduction_opportunities AS
SELECT
    cro.cro_id,
    cro.description,
    cro.value_drivers,
    cro.estimate,
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

-- Denormalized view of barriers with all related info
CREATE OR REPLACE VIEW v_barriers AS
SELECT
    b.barrier_id,
    b.description,
    b.short_name,
    b.pattern_id,
    b.effect_mechanism,
    b.authority,
    b.actor_scope,
    b.cro_id,
    cro.description AS cro_description,
    bt.type_id AS barrier_type,
    bt.description AS barrier_type_description,
    bs.scope_id AS barrier_scope,
    bs.description AS barrier_scope_description,
    lt.lever_id AS lever_type,
    lt.description AS lever_type_description,
    fh.horizon_id AS feasibility_horizon,
    fh.description AS feasibility_horizon_description
FROM barriers b
LEFT JOIN cost_reduction_opportunities cro ON b.cro_id = cro.cro_id
LEFT JOIN barrier_types bt ON b.type_id = bt.type_id
LEFT JOIN barrier_scopes bs ON b.scope_id = bs.scope_id
LEFT JOIN lever_types lt ON b.lever_id = lt.lever_id
LEFT JOIN feasibility_horizons fh ON b.horizon_id = fh.horizon_id;

-- View showing which CROs affect which Cost Elements
CREATE OR REPLACE VIEW v_cro_cost_element_impact AS
SELECT
    m.cro_id,
    cro.description AS cro_description,
    cro.estimate AS cro_estimate,
    m.ce_id,
    ce.description AS ce_description,
    ce.estimate AS ce_estimate,
    m.relationship,
    r.description AS relationship_description
FROM cro_ce_map m
JOIN cost_reduction_opportunities cro ON m.cro_id = cro.cro_id
JOIN cost_elements ce ON m.ce_id = ce.ce_id
LEFT JOIN cro_ce_relationships r ON m.relationship = r.relationship_id
ORDER BY cro.sort_order, m.relationship;

-- View showing which actors control which cost elements
CREATE OR REPLACE VIEW v_actor_cost_control AS
SELECT
    m.ce_id,
    ce.description AS ce_description,
    ce.estimate AS ce_estimate,
    m.actor_id,
    a.description AS actor_description,
    m.role,
    m.policy_lever,
    m.notes
FROM ce_actor_map m
JOIN cost_elements ce ON m.ce_id = ce.ce_id
JOIN actors a ON m.actor_id = a.actor_id
ORDER BY ce.sort_order, m.role;

-- Summary statistics view
CREATE OR REPLACE VIEW v_summary_stats AS
SELECT
    (SELECT COUNT(*) FROM cost_elements) AS total_cost_elements,
    (SELECT COUNT(*) FROM cost_reduction_opportunities) AS total_cros,
    (SELECT COUNT(*) FROM barriers) AS total_barriers,
    (SELECT COUNT(*) FROM actors) AS total_actors,
    (SELECT COALESCE(SUM(estimate), 0) FROM cost_elements WHERE cadence = 'One-time') AS total_onetime_costs,
    (SELECT COALESCE(SUM(annual_estimate), 0) FROM cost_elements WHERE cadence != 'One-time') AS total_annual_costs,
    (SELECT COALESCE(SUM(estimate), 0) FROM cost_reduction_opportunities) AS total_potential_savings;

-- Grant access to views
GRANT SELECT ON v_cost_elements TO anon, authenticated;
GRANT SELECT ON v_cost_reduction_opportunities TO anon, authenticated;
GRANT SELECT ON v_barriers TO anon, authenticated;
GRANT SELECT ON v_cro_cost_element_impact TO anon, authenticated;
GRANT SELECT ON v_actor_cost_control TO anon, authenticated;
GRANT SELECT ON v_summary_stats TO anon, authenticated;
