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

// Slug helper: "Low Risk" → "low-risk"
function toSlug(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
}

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

        // Deep-link: check URL for ?risk=<slug> (e.g., ?risk=high-risk)
        const urlParams = new URLSearchParams(window.location.search)
        const riskParam = urlParams.get('risk')
        if (riskParam && modelData.length > 0) {
          const match = modelData.find(m => toSlug(m.name) === riskParam.toLowerCase())
          if (match) {
            setSelectedRiskModelId(match.id)
            return
          }
        }

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
