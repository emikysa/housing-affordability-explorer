// Database types for Supabase
export interface Database {
  public: {
    Tables: {
      stages: {
        Row: {
          stage_id: string
          description: string | null
          sort_order: number | null
        }
        Insert: {
          stage_id: string
          description?: string | null
          sort_order?: number | null
        }
        Update: {
          stage_id?: string
          description?: string | null
          sort_order?: number | null
        }
      }
      cost_elements: {
        Row: {
          ce_id: string
          stage_id: string | null
          description: string
          notes: string | null
          assumptions: string | null
          estimate: number | null
          annual_estimate: number | null
          unit: string | null
          cadence: string | null
          is_computed: boolean
          sort_order: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          ce_id: string
          stage_id?: string | null
          description: string
          notes?: string | null
          assumptions?: string | null
          estimate?: number | null
          annual_estimate?: number | null
          unit?: string | null
          cadence?: string | null
          is_computed?: boolean
          sort_order?: number | null
        }
        Update: Partial<Database['public']['Tables']['cost_elements']['Insert']>
      }
      cost_reduction_opportunities: {
        Row: {
          cro_id: string
          description: string
          value_drivers: string | null
          estimate: number | null
          unit: string | null
          stage_id: string | null
          cadence_id: string | null
          dependency_id: string | null
          requires_upfront_investment: boolean
          notes: string | null
          sort_order: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          cro_id: string
          description: string
          value_drivers?: string | null
          estimate?: number | null
          unit?: string | null
          stage_id?: string | null
          cadence_id?: string | null
          dependency_id?: string | null
          requires_upfront_investment?: boolean
          notes?: string | null
          sort_order?: number | null
        }
        Update: Partial<Database['public']['Tables']['cost_reduction_opportunities']['Insert']>
      }
      barriers: {
        Row: {
          barrier_id: string
          cro_id: string | null
          description: string
          short_name: string | null
          type_id: string | null
          scope_id: string | null
          pattern_id: string | null
          effect_mechanism: string | null
          lever_id: string | null
          authority: string | null
          horizon_id: string | null
          actor_scope: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          barrier_id: string
          cro_id?: string | null
          description: string
          short_name?: string | null
          type_id?: string | null
          scope_id?: string | null
          pattern_id?: string | null
          effect_mechanism?: string | null
          lever_id?: string | null
          authority?: string | null
          horizon_id?: string | null
          actor_scope?: string | null
        }
        Update: Partial<Database['public']['Tables']['barriers']['Insert']>
      }
      actors: {
        Row: {
          actor_id: string
          actor_code: string | null
          description: string | null
        }
        Insert: {
          actor_id: string
          actor_code?: string | null
          description?: string | null
        }
        Update: {
          actor_id?: string
          actor_code?: string | null
          description?: string | null
        }
      }
      barrier_types: {
        Row: {
          type_id: string
          description: string | null
        }
      }
      barrier_scopes: {
        Row: {
          scope_id: string
          description: string | null
        }
      }
      lever_types: {
        Row: {
          lever_id: string
          description: string | null
        }
      }
      feasibility_horizons: {
        Row: {
          horizon_id: string
          description: string | null
          sort_order: number | null
        }
      }
      cro_ce_map: {
        Row: {
          id: number
          cro_id: string | null
          ce_id: string | null
          relationship: string | null
        }
      }
      ce_actor_map: {
        Row: {
          id: number
          ce_id: string | null
          actor_id: string | null
          role: string | null
          policy_lever: string | null
          notes: string | null
        }
      }
      scenarios: {
        Row: {
          scenario_id: string
          name: string
          description: string | null
          parent_scenario_id: string | null
          is_baseline: boolean
          is_default: boolean
          is_public: boolean
          sort_order: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          scenario_id?: string
          name: string
          description?: string | null
          parent_scenario_id?: string | null
          is_baseline?: boolean
          is_default?: boolean
          is_public?: boolean
          sort_order?: number | null
        }
        Update: {
          name?: string
          description?: string | null
          parent_scenario_id?: string | null
          is_baseline?: boolean
          is_default?: boolean
          is_public?: boolean
          sort_order?: number | null
        }
      }
      ce_scenario_values: {
        Row: {
          id: number
          scenario_id: string
          ce_id: string
          estimate: number | null
          annual_estimate: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          scenario_id: string
          ce_id: string
          estimate?: number | null
          annual_estimate?: number | null
        }
        Update: {
          estimate?: number | null
          annual_estimate?: number | null
        }
      }
      cro_scenario_values: {
        Row: {
          id: number
          scenario_id: string
          cro_id: string
          estimate: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          scenario_id: string
          cro_id: string
          estimate?: number | null
        }
        Update: {
          estimate?: number | null
        }
      }
      ce_drilldown: {
        Row: {
          id: number
          ce_code: string
          level1_name: string
          level2_name: string
          level3_name: string | null
          level4_name: string | null
          level5_name: string | null
          cost_component: string
          cost_composition: 'mixed' | 'material' | 'labor' | 'sub_op'
          sort_order: number | null
          created_at: string
        }
      }
      ce_code_alias: {
        Row: {
          id: number
          old_code: string
          new_code: string
          migration_date: string
          notes: string | null
        }
      }
      levers: {
        Row: {
          lever_id: string
          lever_type_id: string | null
          name: string
          description: string | null
          implementation_approach: string | null
          typical_actors: string | null
          typical_timeline: string | null
          feasibility_notes: string | null
          sort_order: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          lever_id: string
          lever_type_id?: string | null
          name: string
          description?: string | null
          implementation_approach?: string | null
          typical_actors?: string | null
          typical_timeline?: string | null
          feasibility_notes?: string | null
          sort_order?: number | null
        }
        Update: Partial<Database['public']['Tables']['levers']['Insert']>
      }
      barrier_lever_map: {
        Row: {
          barrier_id: string
          lever_id: string
          relationship_notes: string | null
          created_at: string
        }
        Insert: {
          barrier_id: string
          lever_id: string
          relationship_notes?: string | null
        }
        Update: {
          relationship_notes?: string | null
        }
      }
      barrier_cro_map: {
        Row: {
          id: number
          barrier_id: string
          cro_id: string
          relationship_notes: string | null
          created_at: string
        }
        Insert: {
          barrier_id: string
          cro_id: string
          relationship_notes?: string | null
        }
        Update: {
          relationship_notes?: string | null
        }
      }
    }
    Views: {
      v_cost_elements: {
        Row: {
          ce_id: string
          description: string
          notes: string | null
          assumptions: string | null
          estimate: number | null
          annual_estimate: number | null
          unit: string | null
          cadence: string | null
          sort_order: number | null
          stage_id: string | null
          stage_description: string | null
        }
      }
      v_cost_reduction_opportunities: {
        Row: {
          cro_id: string
          description: string
          value_drivers: string | null
          estimate: number | null
          unit: string | null
          requires_upfront_investment: boolean
          notes: string | null
          sort_order: number | null
          stage_id: string | null
          stage_description: string | null
          cadence_id: string | null
          cadence_description: string | null
          dependency_id: string | null
          dependency_description: string | null
        }
      }
      v_barriers: {
        Row: {
          barrier_id: string
          description: string
          short_name: string | null
          pattern_id: string | null
          effect_mechanism: string | null
          authority: string | null
          actor_scope: string | null
          cro_id: string | null  // Deprecated: use barrier_cro_map
          cro_description: string | null
          barrier_type: string | null
          barrier_type_description: string | null
          barrier_scope: string | null
          barrier_scope_description: string | null
          lever_id: string | null
          lever_type: string | null
          lever_type_description: string | null
          feasibility_horizon: string | null
          feasibility_horizon_description: string | null
          cro_count: number
        }
      }
      v_barrier_cros: {
        Row: {
          id: number
          barrier_id: string
          barrier_short_name: string | null
          barrier_description: string
          cro_id: string
          cro_description: string
          relationship_notes: string | null
          created_at: string
        }
      }
      v_cro_cost_element_impact: {
        Row: {
          cro_id: string
          cro_description: string | null
          cro_estimate: number | null
          ce_id: string
          ce_description: string | null
          ce_estimate: number | null
          relationship: string | null
          relationship_description: string | null
        }
      }
      v_actor_cost_control: {
        Row: {
          ce_id: string
          ce_description: string | null
          ce_estimate: number | null
          actor_id: string
          actor_description: string | null
          role: string | null
          policy_lever: string | null
          notes: string | null
        }
      }
      v_levers: {
        Row: {
          lever_id: string
          lever_type_id: string | null
          lever_type_description: string | null
          name: string
          description: string | null
          implementation_approach: string | null
          typical_actors: string | null
          typical_timeline: string | null
          feasibility_notes: string | null
          sort_order: number | null
          barrier_count: number
        }
      }
      v_barrier_levers: {
        Row: {
          barrier_id: string
          barrier_short_name: string | null
          barrier_description: string
          lever_id: string
          lever_name: string
          lever_type_id: string | null
          lever_type_description: string | null
          relationship_notes: string | null
        }
      }
      v_summary_stats: {
        Row: {
          total_cost_elements: number
          total_cros: number
          total_barriers: number
          total_actors: number
          total_onetime_costs: number
          total_annual_costs: number
          total_potential_savings: number
        }
      }
      v_scenarios: {
        Row: {
          scenario_id: string
          name: string
          description: string | null
          parent_scenario_id: string | null
          parent_scenario_name: string | null
          is_baseline: boolean
          is_default: boolean
          is_public: boolean
          sort_order: number | null
          created_at: string
          updated_at: string
        }
      }
    }
  }
}

// Convenience types
export type CostElement = Database['public']['Views']['v_cost_elements']['Row']
export type CostReductionOpportunity = Database['public']['Views']['v_cost_reduction_opportunities']['Row']
export type Barrier = Database['public']['Views']['v_barriers']['Row']
export type CroImpact = Database['public']['Views']['v_cro_cost_element_impact']['Row']
export type ActorControl = Database['public']['Views']['v_actor_cost_control']['Row']
export type SummaryStats = Database['public']['Views']['v_summary_stats']['Row']
export type Actor = Database['public']['Tables']['actors']['Row']
export type Stage = Database['public']['Tables']['stages']['Row']
export type BarrierType = Database['public']['Tables']['barrier_types']['Row']
export type BarrierScope = Database['public']['Tables']['barrier_scopes']['Row']
export type LeverType = Database['public']['Tables']['lever_types']['Row']
export type FeasibilityHorizon = Database['public']['Tables']['feasibility_horizons']['Row']
export type Scenario = Database['public']['Views']['v_scenarios']['Row']

// Baseline scenario ID constant
export const BASELINE_SCENARIO_ID = '00000000-0000-0000-0000-000000000001'

// CE Drilldown type
export type CEDrilldown = Database['public']['Tables']['ce_drilldown']['Row']

// CE Code Alias type (for backward compatibility mapping)
export type CECodeAlias = Database['public']['Tables']['ce_code_alias']['Row']

// Lever types
export type Lever = Database['public']['Views']['v_levers']['Row']
export type BarrierLever = Database['public']['Views']['v_barrier_levers']['Row']
export type BarrierLeverMap = Database['public']['Tables']['barrier_lever_map']['Row']

// Barrier-CRO many-to-many types
export type BarrierCro = Database['public']['Views']['v_barrier_cros']['Row']
export type BarrierCroMap = Database['public']['Tables']['barrier_cro_map']['Row']

// Occupancy Models (Multi-Dimensional Model Architecture - Phase 1)
export interface OccupancyModel {
  id: string
  name: string
  description: string | null
  adults: number
  children: number
  total_occupants: number
  sort_order: number | null
  created_at: string
  updated_at: string
}

// Lifestyle Models (Multi-Dimensional Model Architecture - Phase 2)
export interface LifestyleModel {
  id: string
  name: string
  description: string | null
  // Per-person weekly frequencies
  showers_per_week: number
  baths_per_week: number
  // Household weekly frequencies
  laundry_loads_per_week: number
  dishwasher_loads_per_week: number
  hand_wash_dishes_per_day: number
  // Per-person daily frequencies
  toilet_flushes_per_day: number
  // Household daily frequencies
  meals_cooked_per_day: number
  tv_hours_per_day: number
  computer_hours_per_day: number
  lighting_hours_per_day: number
  // Multipliers for base loads
  heating_multiplier: number
  cooling_multiplier: number
  sort_order: number | null
  created_at: string
  updated_at: string
}

// Consumption Factors (Reference data for resource usage per activity)
export interface ConsumptionFactor {
  id: string
  activity_code: string
  activity_name: string
  description: string | null
  water_gallons: number
  electric_kwh: number
  gas_therms: number
  applies_to: 'per_person' | 'per_household' | 'per_adult' | 'per_child'
  frequency_unit: 'day' | 'week' | 'month'
  notes: string | null
  sort_order: number | null
  created_at: string
}

// Utility Rate Tier (for tiered pricing)
export interface UtilityRateTier {
  max_units: number | null  // null means unlimited
  rate: number
}

// Utility Models (Multi-Dimensional Model Architecture - Phase 3)
export interface UtilityModel {
  id: string
  utility_type: 'water' | 'electric' | 'gas'
  provider_name: string
  provider_code: string | null
  description: string | null
  service_area: string | null
  base_monthly_fee: number
  rate_tiers: UtilityRateTier[]
  unit_name: string
  unit_display: string | null
  has_seasonal_rates: boolean
  summer_multiplier: number
  winter_multiplier: number
  effective_date: string
  source_url: string | null
  notes: string | null
  sort_order: number | null
  created_at: string
  updated_at: string
}

// Occupant Finance Models (Multi-Dimensional Model Architecture - Phase 4)
export interface OccupantFinanceModel {
  id: string
  name: string
  short_code: string | null
  description: string | null
  loan_term_years: number
  annual_interest_rate: number        // Decimal: 0.06875 = 6.875%
  down_payment_percent: number        // Decimal: 0.20 = 20%
  min_down_payment_percent: number | null
  pmi_rate: number                    // Annual PMI rate as decimal
  pmi_threshold: number               // Equity % where PMI drops off
  closing_cost_percent: number        // Buyer closing costs as % of price
  loan_type: 'conventional' | 'fha' | 'va' | 'usda' | 'cash' | string
  is_adjustable: boolean
  effective_date: string
  source_description: string | null
  notes: string | null
  sort_order: number | null
  created_at: string
  updated_at: string
}

// Risk Models (Multi-Dimensional Model Architecture - Phase 5)
export interface RiskModel {
  id: string
  name: string
  description: string | null
  // R1: Schedule Uncertainty
  schedule_variance_pct: number
  // R2: Cost-of-Capital Risk Premium
  rate_premium_bps: number
  // R3: Scope and Cost Uncertainty
  design_contingency_pct: number
  construction_contingency_pct: number
  // R4: Market Absorption / Exit Risk
  marketing_multiplier: number
  sales_period_months: number
  sort_order: number | null
  created_at: string
  updated_at: string
}

// Mortgage Payment Calculation Result
export interface MortgagePaymentResult {
  loan_amount: number
  down_payment: number
  monthly_principal_interest: number
  monthly_pmi: number
  total_monthly_payment: number
  closing_costs: number
  total_cash_needed: number
}
