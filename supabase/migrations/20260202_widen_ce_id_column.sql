-- Widen ce_id and parent_id columns to accommodate longer IDs
-- First drop the dependent view
DROP VIEW IF EXISTS v_cost_entries;

-- Alter columns
ALTER TABLE cost_elements_unified ALTER COLUMN ce_id TYPE VARCHAR(50);
ALTER TABLE cost_elements_unified ALTER COLUMN parent_id TYPE VARCHAR(50);

-- Recreate the view (simplified version - actual may need adjustment)
CREATE OR REPLACE VIEW v_cost_entries AS
SELECT
    ce.id,
    ce.cost_time_model_id,
    ce.ce_id,
    ce.date_paid,
    ce.amount_total,
    ce.amount_material,
    ce.labor_hours,
    ce.labor_rate,
    ce.amount_labor,
    ce.amount_op_other,
    ce.created_at,
    ce.updated_at,
    ceu.short_name,
    ceu.description AS ce_description,
    ceu.level,
    ceu.parent_id
FROM cost_entries ce
LEFT JOIN cost_elements_unified ceu ON ce.ce_id = ceu.ce_id;

-- Grant access
GRANT SELECT ON v_cost_entries TO anon, authenticated;
