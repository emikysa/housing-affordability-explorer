import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useScenario } from '../contexts/ScenarioContext'
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

// Hook for calling RPC functions with scenario support
function useScenarioRpc<T>(
  functionName: string,
  scenarioId: string,
  scenarioLoading: boolean
): DataState<T> & { refresh: () => void } {
  const [state, setState] = useState<DataState<T>>({
    data: [],
    loading: true,
    error: null,
  })

  const fetchData = useCallback(async () => {
    // Wait for scenario context to finish loading
    if (scenarioLoading) {
      return
    }
    setState((prev) => ({ ...prev, loading: true, error: null }))
    try {
      const { data, error } = await supabase.rpc(functionName as never, {
        p_scenario_id: scenarioId,
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
  }, [functionName, scenarioId, scenarioLoading])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { ...state, refresh: fetchData }
}

// ============================================
// SCENARIO-AWARE HOOKS (use these for estimate data)
// ============================================

// Cost Elements with scenario-specific estimates
export function useCostElements() {
  const { selectedScenarioId, loading } = useScenario()
  return useScenarioRpc<CostElement>('get_cost_elements_for_scenario', selectedScenarioId, loading)
}

// CROs with scenario-specific estimates
export function useCostReductionOpportunities() {
  const { selectedScenarioId, loading } = useScenario()
  return useScenarioRpc<CostReductionOpportunity>('get_cros_for_scenario', selectedScenarioId, loading)
}

// CRO-CE impact with scenario-specific estimates
export function useCroImpacts() {
  const { selectedScenarioId, loading } = useScenario()
  return useScenarioRpc<CroImpact>('get_cro_ce_impact_for_scenario', selectedScenarioId, loading)
}

// Actor controls with scenario-specific CE estimates
export function useActorControls() {
  const { selectedScenarioId, loading } = useScenario()
  return useScenarioRpc<ActorControl>('get_actor_cost_control_for_scenario', selectedScenarioId, loading)
}

// Summary stats with scenario-specific calculations
export function useSummaryStats() {
  const { selectedScenarioId, loading: scenarioLoading } = useScenario()
  const [state, setState] = useState<{ data: SummaryStats | null; loading: boolean; error: string | null }>({
    data: null,
    loading: true,
    error: null,
  })

  useEffect(() => {
    // Wait for scenario context to finish loading
    if (scenarioLoading) {
      return
    }
    async function fetchStats() {
      setState((prev) => ({ ...prev, loading: true }))
      try {
        const { data, error } = await supabase.rpc('get_summary_stats_for_scenario' as never, {
          p_scenario_id: selectedScenarioId,
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
  }, [selectedScenarioId, scenarioLoading])

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

// Hook for getting CROs that affect a cost element (with scenario-aware estimates)
export function useCrosForCostElement(ceId: string | null) {
  const { selectedScenarioId, loading: scenarioLoading } = useScenario()
  const [state, setState] = useState<DataState<CroImpact>>({
    data: [],
    loading: false,
    error: null,
  })

  useEffect(() => {
    if (!ceId || scenarioLoading) {
      setState({ data: [], loading: false, error: null })
      return
    }

    const currentCeId = ceId
    const currentScenarioId = selectedScenarioId

    async function fetchCros() {
      setState((prev) => ({ ...prev, loading: true }))
      try {
        // Use the scenario-aware function and filter client-side
        const { data, error } = await supabase.rpc('get_cro_ce_impact_for_scenario' as never, {
          p_scenario_id: currentScenarioId,
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
  }, [ceId, selectedScenarioId, scenarioLoading])

  return state
}
