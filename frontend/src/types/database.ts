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
          description: string | null
        }
        Insert: {
          actor_id: string
          description?: string | null
        }
        Update: {
          actor_id?: string
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
          cost_component: string
          created_at: string
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
          cro_id: string | null
          cro_description: string | null
          barrier_type: string | null
          barrier_type_description: string | null
          barrier_scope: string | null
          barrier_scope_description: string | null
          lever_type: string | null
          lever_type_description: string | null
          feasibility_horizon: string | null
          feasibility_horizon_description: string | null
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
