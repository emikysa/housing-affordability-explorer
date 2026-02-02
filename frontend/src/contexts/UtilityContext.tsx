import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import type { UtilityModel } from '../types/database'

interface UtilityContextType {
  // Water
  waterModels: UtilityModel[]
  selectedWaterModel: UtilityModel | null
  selectedWaterModelId: string
  setSelectedWaterModelId: (id: string) => void
  // Electric
  electricModels: UtilityModel[]
  selectedElectricModel: UtilityModel | null
  selectedElectricModelId: string
  setSelectedElectricModelId: (id: string) => void
  // Gas
  gasModels: UtilityModel[]
  selectedGasModel: UtilityModel | null
  selectedGasModelId: string
  setSelectedGasModelId: (id: string) => void
  // Loading state
  loading: boolean
  error: string | null
}

const UtilityContext = createContext<UtilityContextType | undefined>(undefined)

// Default utility model IDs (Fort Collins Utilities)
const DEFAULT_WATER_ID = '00000000-0000-0000-0003-000000000001'  // FCU Water
const DEFAULT_ELECTRIC_ID = '00000000-0000-0000-0003-000000000011'  // FCU Electric
const DEFAULT_GAS_ID = '00000000-0000-0000-0003-000000000021'  // Xcel Gas

export function UtilityProvider({ children }: { children: ReactNode }) {
  const [waterModels, setWaterModels] = useState<UtilityModel[]>([])
  const [electricModels, setElectricModels] = useState<UtilityModel[]>([])
  const [gasModels, setGasModels] = useState<UtilityModel[]>([])

  const [selectedWaterModelId, setSelectedWaterModelId] = useState<string>(DEFAULT_WATER_ID)
  const [selectedElectricModelId, setSelectedElectricModelId] = useState<string>(DEFAULT_ELECTRIC_ID)
  const [selectedGasModelId, setSelectedGasModelId] = useState<string>(DEFAULT_GAS_ID)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch all utility models on mount
  useEffect(() => {
    async function fetchUtilityModels() {
      try {
        const [waterResult, electricResult, gasResult] = await Promise.all([
          supabase.from('v_water_utility_models').select('*').order('sort_order'),
          supabase.from('v_electric_utility_models').select('*').order('sort_order'),
          supabase.from('v_gas_utility_models').select('*').order('sort_order'),
        ])

        if (waterResult.error) throw waterResult.error
        if (electricResult.error) throw electricResult.error
        if (gasResult.error) throw gasResult.error

        const waterData = (waterResult.data || []) as UtilityModel[]
        const electricData = (electricResult.data || []) as UtilityModel[]
        const gasData = (gasResult.data || []) as UtilityModel[]

        setWaterModels(waterData)
        setElectricModels(electricData)
        setGasModels(gasData)

        // Validate selections exist
        if (waterData.length > 0 && !waterData.find(m => m.id === selectedWaterModelId)) {
          setSelectedWaterModelId(waterData[0].id)
        }
        if (electricData.length > 0 && !electricData.find(m => m.id === selectedElectricModelId)) {
          setSelectedElectricModelId(electricData[0].id)
        }
        if (gasData.length > 0 && !gasData.find(m => m.id === selectedGasModelId)) {
          setSelectedGasModelId(gasData[0].id)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load utility models')
      } finally {
        setLoading(false)
      }
    }

    fetchUtilityModels()
  }, [selectedWaterModelId, selectedElectricModelId, selectedGasModelId])

  const selectedWaterModel = waterModels.find((m) => m.id === selectedWaterModelId) || null
  const selectedElectricModel = electricModels.find((m) => m.id === selectedElectricModelId) || null
  const selectedGasModel = gasModels.find((m) => m.id === selectedGasModelId) || null

  return (
    <UtilityContext.Provider
      value={{
        waterModels,
        selectedWaterModel,
        selectedWaterModelId,
        setSelectedWaterModelId,
        electricModels,
        selectedElectricModel,
        selectedElectricModelId,
        setSelectedElectricModelId,
        gasModels,
        selectedGasModel,
        selectedGasModelId,
        setSelectedGasModelId,
        loading,
        error,
      }}
    >
      {children}
    </UtilityContext.Provider>
  )
}

export function useUtility() {
  const context = useContext(UtilityContext)
  if (context === undefined) {
    throw new Error('useUtility must be used within a UtilityProvider')
  }
  return context
}
