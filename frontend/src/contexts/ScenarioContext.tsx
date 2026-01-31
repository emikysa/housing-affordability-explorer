import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import type { Scenario } from '../types/database'
import { BASELINE_SCENARIO_ID } from '../types/database'

interface ScenarioContextType {
  scenarios: Scenario[]
  selectedScenario: Scenario | null
  selectedScenarioId: string
  setSelectedScenarioId: (id: string) => void
  loading: boolean
  error: string | null
}

const ScenarioContext = createContext<ScenarioContextType | undefined>(undefined)

export function ScenarioProvider({ children }: { children: ReactNode }) {
  const [scenarios, setScenarios] = useState<Scenario[]>([])
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>(BASELINE_SCENARIO_ID)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch scenarios on mount
  useEffect(() => {
    async function fetchScenarios() {
      try {
        const { data, error } = await supabase
          .from('v_scenarios' as never)
          .select('*')
          .order('sort_order')

        if (error) throw error

        const scenarioData = (data || []) as Scenario[]
        setScenarios(scenarioData)

        // Set default scenario if available
        const defaultScenario = scenarioData.find((s) => s.is_default)
        if (defaultScenario) {
          setSelectedScenarioId(defaultScenario.scenario_id)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load scenarios')
      } finally {
        setLoading(false)
      }
    }

    fetchScenarios()
  }, [])

  const selectedScenario = scenarios.find((s) => s.scenario_id === selectedScenarioId) || null

  return (
    <ScenarioContext.Provider
      value={{
        scenarios,
        selectedScenario,
        selectedScenarioId,
        setSelectedScenarioId,
        loading,
        error,
      }}
    >
      {children}
    </ScenarioContext.Provider>
  )
}

export function useScenario() {
  const context = useContext(ScenarioContext)
  if (context === undefined) {
    throw new Error('useScenario must be used within a ScenarioProvider')
  }
  return context
}
