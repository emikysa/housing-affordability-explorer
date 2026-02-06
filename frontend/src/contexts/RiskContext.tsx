import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import type { RiskModel } from '../types/database'

interface RiskContextType {
  riskModels: RiskModel[]
  selectedRiskModel: RiskModel | null
  selectedRiskModelId: string
  setSelectedRiskModelId: (id: string) => void
  loading: boolean
  error: string | null
}

const RiskContext = createContext<RiskContextType | undefined>(undefined)

// Default risk model ID (Medium Risk - most common starting point)
const DEFAULT_RISK_ID = '00000000-0000-0000-0005-000000000002'

export function RiskProvider({ children }: { children: ReactNode }) {
  const [riskModels, setRiskModels] = useState<RiskModel[]>([])
  const [selectedRiskModelId, setSelectedRiskModelId] = useState<string>(DEFAULT_RISK_ID)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch risk models on mount
  useEffect(() => {
    async function fetchRiskModels() {
      try {
        const { data, error } = await supabase
          .from('v_risk_models')
          .select('*')
          .order('sort_order')

        if (error) throw error

        const modelData = (data || []) as RiskModel[]
        setRiskModels(modelData)

        // If selected ID doesn't exist in data, select first one
        if (modelData.length > 0 && !modelData.find(m => m.id === selectedRiskModelId)) {
          setSelectedRiskModelId(modelData[0].id)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load risk models')
      } finally {
        setLoading(false)
      }
    }

    fetchRiskModels()
  }, [selectedRiskModelId])

  const selectedRiskModel = riskModels.find((m) => m.id === selectedRiskModelId) || null

  return (
    <RiskContext.Provider
      value={{
        riskModels,
        selectedRiskModel,
        selectedRiskModelId,
        setSelectedRiskModelId,
        loading,
        error,
      }}
    >
      {children}
    </RiskContext.Provider>
  )
}

export function useRisk() {
  const context = useContext(RiskContext)
  if (context === undefined) {
    throw new Error('useRisk must be used within a RiskProvider')
  }
  return context
}
