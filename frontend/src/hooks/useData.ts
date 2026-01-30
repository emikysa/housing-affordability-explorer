import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
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
} from '../types/database'

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

// Specific data hooks
export function useCostElements() {
  return useSupabaseQuery<CostElement>('v_cost_elements', 'sort_order')
}

export function useCostReductionOpportunities() {
  return useSupabaseQuery<CostReductionOpportunity>('v_cost_reduction_opportunities', 'sort_order')
}

export function useBarriers() {
  return useSupabaseQuery<Barrier>('v_barriers')
}

export function useCroImpacts() {
  return useSupabaseQuery<CroImpact>('v_cro_cost_element_impact')
}

export function useActorControls() {
  return useSupabaseQuery<ActorControl>('v_actor_cost_control')
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

export function useSummaryStats() {
  const [state, setState] = useState<{ data: SummaryStats | null; loading: boolean; error: string | null }>({
    data: null,
    loading: true,
    error: null,
  })

  useEffect(() => {
    async function fetchStats() {
      try {
        const { data, error } = await supabase.from('v_summary_stats').select('*').single()
        if (error) throw error
        setState({ data, loading: false, error: null })
      } catch (err) {
        setState({
          data: null,
          loading: false,
          error: err instanceof Error ? err.message : 'Unknown error',
        })
      }
    }
    fetchStats()
  }, [])

  return state
}

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

    async function fetchBarriers() {
      setState((prev) => ({ ...prev, loading: true }))
      try {
        const { data, error } = await supabase
          .from('v_barriers')
          .select('*')
          .eq('cro_id', croId)
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

// Hook for getting CROs that affect a cost element
export function useCrosForCostElement(ceId: string | null) {
  const [state, setState] = useState<DataState<CroImpact>>({
    data: [],
    loading: false,
    error: null,
  })

  useEffect(() => {
    if (!ceId) {
      setState({ data: [], loading: false, error: null })
      return
    }

    async function fetchCros() {
      setState((prev) => ({ ...prev, loading: true }))
      try {
        const { data, error } = await supabase
          .from('v_cro_cost_element_impact')
          .select('*')
          .eq('ce_id', ceId)
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
  }, [ceId])

  return state
}
