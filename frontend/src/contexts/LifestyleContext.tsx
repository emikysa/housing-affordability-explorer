import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import type { LifestyleModel } from '../types/database'

interface LifestyleContextType {
  lifestyleModels: LifestyleModel[]
  selectedLifestyleModel: LifestyleModel | null
  selectedLifestyleModelId: string
  setSelectedLifestyleModelId: (id: string) => void
  loading: boolean
  error: string | null
}

const LifestyleContext = createContext<LifestyleContextType | undefined>(undefined)

// Default lifestyle model ID (Moderate - typical usage)
const DEFAULT_LIFESTYLE_ID = '00000000-0000-0000-0002-000000000002'

export function LifestyleProvider({ children }: { children: ReactNode }) {
  const [lifestyleModels, setLifestyleModels] = useState<LifestyleModel[]>([])
  const [selectedLifestyleModelId, setSelectedLifestyleModelId] = useState<string>(DEFAULT_LIFESTYLE_ID)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch lifestyle models on mount
  useEffect(() => {
    async function fetchLifestyleModels() {
      try {
        const { data, error } = await supabase
          .from('v_lifestyle_models')
          .select('*')
          .order('sort_order')

        if (error) throw error

        const modelData = (data || []) as LifestyleModel[]
        setLifestyleModels(modelData)

        // If selected ID doesn't exist in data, select first one
        if (modelData.length > 0 && !modelData.find(m => m.id === selectedLifestyleModelId)) {
          setSelectedLifestyleModelId(modelData[0].id)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load lifestyle models')
      } finally {
        setLoading(false)
      }
    }

    fetchLifestyleModels()
  }, [selectedLifestyleModelId])

  const selectedLifestyleModel = lifestyleModels.find((m) => m.id === selectedLifestyleModelId) || null

  return (
    <LifestyleContext.Provider
      value={{
        lifestyleModels,
        selectedLifestyleModel,
        selectedLifestyleModelId,
        setSelectedLifestyleModelId,
        loading,
        error,
      }}
    >
      {children}
    </LifestyleContext.Provider>
  )
}

export function useLifestyle() {
  const context = useContext(LifestyleContext)
  if (context === undefined) {
    throw new Error('useLifestyle must be used within a LifestyleProvider')
  }
  return context
}
