-- Add phase and node_class columns to cost_elements_unified table
-- These columns were added as part of the MECE restructure (Session 12)

-- Phase: indicates the development timeline phase for this cost element
-- Values: acquisition, predesign, entitlement, precon, construction, closeout, operations, occupant_finance, crosscutting
ALTER TABLE cost_elements_unified ADD COLUMN IF NOT EXISTS phase TEXT;

-- Node class: classification of the type of cost element
-- Values: system, program, option, regulatory, overhead, finance
ALTER TABLE cost_elements_unified ADD COLUMN IF NOT EXISTS node_class TEXT;

-- Add comments for documentation
COMMENT ON COLUMN cost_elements_unified.phase IS 'Development phase: acquisition, predesign, entitlement, precon, construction, closeout, operations, occupant_finance, crosscutting';
COMMENT ON COLUMN cost_elements_unified.node_class IS 'Node classification: system, program, option, regulatory, overhead, finance';
