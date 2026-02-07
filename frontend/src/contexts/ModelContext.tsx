import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import type { Scenario } from '../types/database'

// Model is the user-facing name for what the database calls "scenario"
// We keep the database schema unchanged but rename UI references
type Model = Scenario

interface ModelContextType {
  models: Model[]
  selectedModel: Model | null
  selectedModelId: string
  setSelectedModelId: (id: string) => void
  loading: boolean
  error: string | null
}

const ModelContext = createContext<ModelContextType | undefined>(undefined)

// Slug helper: "Townhome Baseline" → "townhome-baseline"
function toSlug(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
}

export function ModelProvider({ children }: { children: ReactNode }) {
  const [models, setModels] = useState<Model[]>([])
  const [selectedModelId, setSelectedModelId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch models on mount
  useEffect(() => {
    async function fetchModels() {
      try {
        const { data, error } = await supabase
          .from('v_scenarios' as never)
          .select('*')
          .order('sort_order')

        if (error) throw error

        const modelData = (data || []) as Model[]
        setModels(modelData)

        // Deep-link: check URL for ?model=<slug>
        const urlParams = new URLSearchParams(window.location.search)
        const modelParam = urlParams.get('model')
        if (modelParam && modelData.length > 0) {
          const match = modelData.find(m => toSlug(m.name) === modelParam.toLowerCase())
          if (match) {
            setSelectedModelId(match.scenario_id)
            return
          }
        }

        // Set default model (first one with is_default=true, or first model, or baseline)
        const defaultModel = modelData.find((m) => m.is_default)
        const baselineModel = modelData.find((m) => m.is_baseline)
        const firstModel = modelData[0]
        const modelToSelect = defaultModel || baselineModel || firstModel
        if (modelToSelect) {
          setSelectedModelId(modelToSelect.scenario_id)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load models')
      } finally {
        setLoading(false)
      }
    }

    fetchModels()
  }, [])

  const selectedModel = models.find((m) => m.scenario_id === selectedModelId) || null

  return (
    <ModelContext.Provider
      value={{
        models,
        selectedModel,
        selectedModelId,
        setSelectedModelId,
        loading,
        error,
      }}
    >
      {children}
    </ModelContext.Provider>
  )
}

export function useModel() {
  const context = useContext(ModelContext)
  if (context === undefined) {
    throw new Error('useModel must be used within a ModelProvider')
  }
  return context
}
