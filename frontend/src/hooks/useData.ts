import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useModel } from '../contexts/ModelContext'
import type {
  CostElement,
  CostReductionOpportunity,
  Barrier,
  CroImpact,
  ActorControl,
  SummaryStats,
  Actor,
  Stage,
  BarrierType,
  BarrierScope,
  LeverType,
  FeasibilityHorizon,
  CEDrilldown,
  Lever,
  BarrierLever,
  BarrierCro,
  OccupancyModel,
  LifestyleModel,
  ConsumptionFactor,
  UtilityModel,
  OccupantFinanceModel,
} from '../types/database'
// BASELINE_SCENARIO_ID available if needed for fallback

interface DataState<T> {
  data: T[]
  loading: boolean
  error: string | null
}

function useSupabaseQuery<T>(
  tableName: string,
  orderBy?: string
): DataState<T> & { refresh: () => void } {
  const [state, setState] = useState<DataState<T>>({
    data: [],
    loading: true,
    error: null,
  })

  const fetchData = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }))
    try {
      let query = supabase.from(tableName).select('*')
      if (orderBy) {
        query = query.order(orderBy)
      }
      const { data, error } = await query
      if (error) throw error
      setState({ data: (data || []) as T[], loading: false, error: null })
    } catch (err) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      }))
    }
  }, [tableName, orderBy])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { ...state, refresh: fetchData }
}

// Hook for calling RPC functions with model (scenario) support
function useModelRpc<T>(
  functionName: string,
  modelId: string,
  modelLoading: boolean
): DataState<T> & { refresh: () => void } {
  const [state, setState] = useState<DataState<T>>({
    data: [],
    loading: true,
    error: null,
  })

  const fetchData = useCallback(async () => {
    // Wait for model context to finish loading
    if (modelLoading) {
      return
    }
    setState((prev) => ({ ...prev, loading: true, error: null }))
    try {
      const { data, error } = await supabase.rpc(functionName as never, {
        p_scenario_id: modelId,
      } as never)
      if (error) throw error
      setState({ data: (data || []) as T[], loading: false, error: null })
    } catch (err) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      }))
    }
  }, [functionName, modelId, modelLoading])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { ...state, refresh: fetchData }
}

// ============================================
// MODEL-AWARE HOOKS (use these for estimate data)
// ============================================

// Cost Elements with model-specific estimates
export function useCostElements() {
  const { selectedModelId, loading } = useModel()
  return useModelRpc<CostElement>('get_cost_elements_for_scenario', selectedModelId, loading)
}

// CROs with model-specific estimates
export function useCostReductionOpportunities() {
  const { selectedModelId, loading } = useModel()
  return useModelRpc<CostReductionOpportunity>('get_cros_for_scenario', selectedModelId, loading)
}

// CRO-CE impact with model-specific estimates
export function useCroImpacts() {
  const { selectedModelId, loading } = useModel()
  return useModelRpc<CroImpact>('get_cro_ce_impact_for_scenario', selectedModelId, loading)
}

// Actor controls with model-specific CE estimates
export function useActorControls() {
  const { selectedModelId, loading } = useModel()
  return useModelRpc<ActorControl>('get_actor_cost_control_for_scenario', selectedModelId, loading)
}

// Summary stats with model-specific calculations
export function useSummaryStats() {
  const { selectedModelId, loading: modelLoading } = useModel()
  const [state, setState] = useState<{ data: SummaryStats | null; loading: boolean; error: string | null }>({
    data: null,
    loading: true,
    error: null,
  })

  useEffect(() => {
    // Wait for model context to finish loading
    if (modelLoading) {
      return
    }
    async function fetchStats() {
      setState((prev) => ({ ...prev, loading: true }))
      try {
        const { data, error } = await supabase.rpc('get_summary_stats_for_scenario' as never, {
          p_scenario_id: selectedModelId,
        } as never)
        if (error) throw error
        // RPC returns array, get first element
        const stats = Array.isArray(data) ? data[0] : data
        setState({ data: stats, loading: false, error: null })
      } catch (err) {
        setState({
          data: null,
          loading: false,
          error: err instanceof Error ? err.message : 'Unknown error',
        })
      }
    }
    fetchStats()
  }, [selectedModelId, modelLoading])

  return state
}

// ============================================
// MASTER COUNTS (Framework totals - not scenario-dependent)
// ============================================

interface MasterCounts {
  costElements: number
  cros: number
  barriers: number
  actors: number
  loading: boolean
  error: string | null
}

export function useMasterCounts(): MasterCounts {
  const [state, setState] = useState<MasterCounts>({
    costElements: 0,
    cros: 0,
    barriers: 0,
    actors: 0,
    loading: true,
    error: null,
  })

  useEffect(() => {
    async function fetchCounts() {
      try {
        // Fetch all counts in parallel
        const [ceResult, croResult, barrierResult, actorResult] = await Promise.all([
          supabase.from('cost_elements').select('*', { count: 'exact', head: true }),
          supabase.from('cost_reduction_opportunities').select('*', { count: 'exact', head: true }),
          supabase.from('barriers').select('*', { count: 'exact', head: true }),
          supabase.from('actors').select('*', { count: 'exact', head: true }),
        ])

        setState({
          costElements: ceResult.count || 0,
          cros: croResult.count || 0,
          barriers: barrierResult.count || 0,
          actors: actorResult.count || 0,
          loading: false,
          error: null,
        })
      } catch (err) {
        setState((prev) => ({
          ...prev,
          loading: false,
          error: err instanceof Error ? err.message : 'Unknown error',
        }))
      }
    }
    fetchCounts()
  }, [])

  return state
}

// ============================================
// NON-SCENARIO HOOKS (data that doesn't vary by scenario)
// ============================================

// Barriers don't have scenario-specific values (yet)
export function useBarriers() {
  return useSupabaseQuery<Barrier>('v_barriers')
}

export function useActors() {
  return useSupabaseQuery<Actor>('actors', 'actor_id')
}

export function useStages() {
  return useSupabaseQuery<Stage>('stages', 'sort_order')
}

export function useBarrierTypes() {
  return useSupabaseQuery<BarrierType>('barrier_types', 'type_id')
}

export function useBarrierScopes() {
  return useSupabaseQuery<BarrierScope>('barrier_scopes', 'scope_id')
}

export function useLeverTypes() {
  return useSupabaseQuery<LeverType>('lever_types', 'lever_id')
}

export function useFeasibilityHorizons() {
  return useSupabaseQuery<FeasibilityHorizon>('feasibility_horizons', 'sort_order')
}

// CE Drilldown hierarchy data
export function useCEDrilldown() {
  return useSupabaseQuery<CEDrilldown>('ce_drilldown')
}

// Levers (first-class entities with many-to-many to barriers)
export function useLevers() {
  return useSupabaseQuery<Lever>('v_levers', 'sort_order')
}

// Barrier-Lever mappings
export function useBarrierLevers() {
  return useSupabaseQuery<BarrierLever>('v_barrier_levers', 'barrier_id')
}

// Barrier-CRO mappings (many-to-many)
export function useBarrierCros() {
  return useSupabaseQuery<BarrierCro>('v_barrier_cros', 'barrier_id')
}

// Hook for getting CROs for a specific barrier
export function useCrosForBarrier(barrierId: string | null) {
  const [state, setState] = useState<DataState<BarrierCro>>({
    data: [],
    loading: false,
    error: null,
  })

  useEffect(() => {
    if (!barrierId) {
      setState({ data: [], loading: false, error: null })
      return
    }

    const currentBarrierId = barrierId
    async function fetchCros() {
      setState((prev) => ({ ...prev, loading: true }))
      try {
        const { data, error } = await supabase
          .from('v_barrier_cros')
          .select('*')
          .eq('barrier_id', currentBarrierId)
        if (error) throw error
        setState({ data: data || [], loading: false, error: null })
      } catch (err) {
        setState({
          data: [],
          loading: false,
          error: err instanceof Error ? err.message : 'Unknown error',
        })
      }
    }
    fetchCros()
  }, [barrierId])

  return state
}

// Hook for getting barriers for a specific CRO
export function useBarriersForCro(croId: string | null) {
  const [state, setState] = useState<DataState<BarrierCro>>({
    data: [],
    loading: false,
    error: null,
  })

  useEffect(() => {
    if (!croId) {
      setState({ data: [], loading: false, error: null })
      return
    }

    const currentCroId = croId
    async function fetchBarriers() {
      setState((prev) => ({ ...prev, loading: true }))
      try {
        const { data, error } = await supabase
          .from('v_barrier_cros')
          .select('*')
          .eq('cro_id', currentCroId)
        if (error) throw error
        setState({ data: data || [], loading: false, error: null })
      } catch (err) {
        setState({
          data: [],
          loading: false,
          error: err instanceof Error ? err.message : 'Unknown error',
        })
      }
    }
    fetchBarriers()
  }, [croId])

  return state
}

// Hook for getting levers for a specific barrier
export function useLeversForBarrier(barrierId: string | null) {
  const [state, setState] = useState<DataState<BarrierLever>>({
    data: [],
    loading: false,
    error: null,
  })

  useEffect(() => {
    if (!barrierId) {
      setState({ data: [], loading: false, error: null })
      return
    }

    const currentBarrierId = barrierId // Capture for closure
    async function fetchLevers() {
      setState((prev) => ({ ...prev, loading: true }))
      try {
        const { data, error } = await supabase
          .from('v_barrier_levers')
          .select('*')
          .eq('barrier_id', currentBarrierId)
        if (error) throw error
        setState({ data: data || [], loading: false, error: null })
      } catch (err) {
        setState({
          data: [],
          loading: false,
          error: err instanceof Error ? err.message : 'Unknown error',
        })
      }
    }
    fetchLevers()
  }, [barrierId])

  return state
}

// Hook for getting barriers for a specific lever
export function useBarriersForLever(leverId: string | null) {
  const [state, setState] = useState<DataState<BarrierLever>>({
    data: [],
    loading: false,
    error: null,
  })

  useEffect(() => {
    if (!leverId) {
      setState({ data: [], loading: false, error: null })
      return
    }

    const currentLeverId = leverId // Capture for closure
    async function fetchBarriers() {
      setState((prev) => ({ ...prev, loading: true }))
      try {
        const { data, error } = await supabase
          .from('v_barrier_levers')
          .select('*')
          .eq('lever_id', currentLeverId)
        if (error) throw error
        setState({ data: data || [], loading: false, error: null })
      } catch (err) {
        setState({
          data: [],
          loading: false,
          error: err instanceof Error ? err.message : 'Unknown error',
        })
      }
    }
    fetchBarriers()
  }, [leverId])

  return state
}

// ============================================
// RELATIONSHIP HOOKS
// ============================================

// Hook for getting barriers by CRO
export function useBarriersByCro(croId: string | null) {
  const [state, setState] = useState<DataState<Barrier>>({
    data: [],
    loading: false,
    error: null,
  })

  useEffect(() => {
    if (!croId) {
      setState({ data: [], loading: false, error: null })
      return
    }

    const currentCroId = croId // Capture for closure
    async function fetchBarriers() {
      setState((prev) => ({ ...prev, loading: true }))
      try {
        const { data, error } = await supabase
          .from('v_barriers')
          .select('*')
          .eq('cro_id', currentCroId)
        if (error) throw error
        setState({ data: data || [], loading: false, error: null })
      } catch (err) {
        setState({
          data: [],
          loading: false,
          error: err instanceof Error ? err.message : 'Unknown error',
        })
      }
    }
    fetchBarriers()
  }, [croId])

  return state
}

// Hook for getting CROs that affect a cost element (with model-aware estimates)
export function useCrosForCostElement(ceId: string | null) {
  const { selectedModelId, loading: modelLoading } = useModel()
  const [state, setState] = useState<DataState<CroImpact>>({
    data: [],
    loading: false,
    error: null,
  })

  useEffect(() => {
    if (!ceId || modelLoading) {
      setState({ data: [], loading: false, error: null })
      return
    }

    const currentCeId = ceId
    const currentModelId = selectedModelId

    async function fetchCros() {
      setState((prev) => ({ ...prev, loading: true }))
      try {
        // Use the model-aware function and filter client-side
        const { data, error } = await supabase.rpc('get_cro_ce_impact_for_scenario' as never, {
          p_scenario_id: currentModelId,
        } as never)
        if (error) throw error
        const filtered = ((data || []) as CroImpact[]).filter((d: CroImpact) => d.ce_id === currentCeId)
        setState({ data: filtered, loading: false, error: null })
      } catch (err) {
        setState({
          data: [],
          loading: false,
          error: err instanceof Error ? err.message : 'Unknown error',
        })
      }
    }
    fetchCros()
  }, [ceId, selectedModelId, modelLoading])

  return state
}

// ============================================
// MULTI-DIMENSIONAL MODEL HOOKS
// ============================================

// Occupancy Models (Phase 1 of Multi-Dimensional Model Architecture)
export function useOccupancyModels() {
  return useSupabaseQuery<OccupancyModel>('v_occupancy_models', 'sort_order')
}

// Lifestyle Models (Phase 2 of Multi-Dimensional Model Architecture)
export function useLifestyleModels() {
  return useSupabaseQuery<LifestyleModel>('v_lifestyle_models', 'sort_order')
}

// Consumption Factors (Reference data for Phase 2)
export function useConsumptionFactors() {
  return useSupabaseQuery<ConsumptionFactor>('consumption_factors', 'sort_order')
}

// Utility Models (Phase 3 of Multi-Dimensional Model Architecture)
export function useWaterUtilityModels() {
  return useSupabaseQuery<UtilityModel>('v_water_utility_models', 'sort_order')
}

export function useElectricUtilityModels() {
  return useSupabaseQuery<UtilityModel>('v_electric_utility_models', 'sort_order')
}

export function useGasUtilityModels() {
  return useSupabaseQuery<UtilityModel>('v_gas_utility_models', 'sort_order')
}

export function useSewerUtilityModels() {
  return useSupabaseQuery<UtilityModel>('v_sewer_utility_models', 'sort_order')
}

export function useAllUtilityModels() {
  return useSupabaseQuery<UtilityModel>('v_utility_models', 'sort_order')
}

// Occupant Finance Models (Phase 4 of Multi-Dimensional Model Architecture)
export function useOccupantFinanceModels() {
  return useSupabaseQuery<OccupantFinanceModel>('v_occupant_finance_models', 'sort_order')
}
