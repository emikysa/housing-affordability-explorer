import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import type { OccupantFinanceModel } from '../types/database'

interface FinanceContextType {
  financeModels: OccupantFinanceModel[]
  selectedFinanceModel: OccupantFinanceModel | null
  selectedFinanceModelId: string
  setSelectedFinanceModelId: (id: string) => void
  loading: boolean
  error: string | null
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined)

// Default to Conventional 30-Year Fixed (20% down)
const DEFAULT_FINANCE_MODEL_ID = '00000000-0000-0000-0004-000000000001'

export function FinanceProvider({ children }: { children: ReactNode }) {
  const [financeModels, setFinanceModels] = useState<OccupantFinanceModel[]>([])
  const [selectedFinanceModelId, setSelectedFinanceModelId] = useState<string>(DEFAULT_FINANCE_MODEL_ID)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch finance models on mount
  useEffect(() => {
    async function fetchFinanceModels() {
      try {
        const { data, error: fetchError } = await supabase
          .from('v_occupant_finance_models')
          .select('*')
          .order('sort_order')

        if (fetchError) throw fetchError

        const models = (data || []) as OccupantFinanceModel[]
        setFinanceModels(models)

        // Validate that selected model exists
        if (models.length > 0 && !models.find(m => m.id === selectedFinanceModelId)) {
          setSelectedFinanceModelId(models[0].id)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load finance models')
      } finally {
        setLoading(false)
      }
    }

    fetchFinanceModels()
  }, [selectedFinanceModelId])

  const selectedFinanceModel = financeModels.find((m) => m.id === selectedFinanceModelId) || null

  return (
    <FinanceContext.Provider
      value={{
        financeModels,
        selectedFinanceModel,
        selectedFinanceModelId,
        setSelectedFinanceModelId,
        loading,
        error,
      }}
    >
      {children}
    </FinanceContext.Provider>
  )
}

export function useFinance() {
  const context = useContext(FinanceContext)
  if (context === undefined) {
    throw new Error('useFinance must be used within a FinanceProvider')
  }
  return context
}
