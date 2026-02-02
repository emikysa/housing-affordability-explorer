import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import type { OccupancyModel } from '../types/database'

interface OccupancyContextType {
  occupancyModels: OccupancyModel[]
  selectedOccupancyModel: OccupancyModel | null
  selectedOccupancyModelId: string
  setSelectedOccupancyModelId: (id: string) => void
  loading: boolean
  error: string | null
}

const OccupancyContext = createContext<OccupancyContextType | undefined>(undefined)

// Default occupancy model ID (Couple - most common household type)
const DEFAULT_OCCUPANCY_ID = '00000000-0000-0000-0001-000000000002'

export function OccupancyProvider({ children }: { children: ReactNode }) {
  const [occupancyModels, setOccupancyModels] = useState<OccupancyModel[]>([])
  const [selectedOccupancyModelId, setSelectedOccupancyModelId] = useState<string>(DEFAULT_OCCUPANCY_ID)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch occupancy models on mount
  useEffect(() => {
    async function fetchOccupancyModels() {
      try {
        const { data, error } = await supabase
          .from('v_occupancy_models')
          .select('*')
          .order('sort_order')

        if (error) throw error

        const modelData = (data || []) as OccupancyModel[]
        setOccupancyModels(modelData)

        // If selected ID doesn't exist in data, select first one
        if (modelData.length > 0 && !modelData.find(m => m.id === selectedOccupancyModelId)) {
          setSelectedOccupancyModelId(modelData[0].id)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load occupancy models')
      } finally {
        setLoading(false)
      }
    }

    fetchOccupancyModels()
  }, [selectedOccupancyModelId])

  const selectedOccupancyModel = occupancyModels.find((m) => m.id === selectedOccupancyModelId) || null

  return (
    <OccupancyContext.Provider
      value={{
        occupancyModels,
        selectedOccupancyModel,
        selectedOccupancyModelId,
        setSelectedOccupancyModelId,
        loading,
        error,
      }}
    >
      {children}
    </OccupancyContext.Provider>
  )
}

export function useOccupancy() {
  const context = useContext(OccupancyContext)
  if (context === undefined) {
    throw new Error('useOccupancy must be used within an OccupancyProvider')
  }
  return context
}
