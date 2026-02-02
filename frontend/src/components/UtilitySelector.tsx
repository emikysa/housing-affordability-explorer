import { useUtility } from '../contexts/UtilityContext'
import type { UtilityModel } from '../types/database'

type UtilityType = 'water' | 'electric' | 'gas' | 'sewer'

interface UtilitySelectorProps {
  /** Which utility type to select */
  utilityType: UtilityType
  /** Display style variant */
  variant?: 'default' | 'prominent'
  /** Optional label to show before the dropdown */
  label?: string
  /** Additional CSS classes */
  className?: string
}

export default function UtilitySelector({
  utilityType,
  variant = 'default',
  label,
  className = '',
}: UtilitySelectorProps) {
  const {
    waterModels, selectedWaterModelId, setSelectedWaterModelId,
    electricModels, selectedElectricModelId, setSelectedElectricModelId,
    gasModels, selectedGasModelId, setSelectedGasModelId,
    sewerModels, selectedSewerModelId, setSelectedSewerModelId,
    loading,
  } = useUtility()

  // Get the appropriate models and state based on utility type
  const getConfig = (): {
    models: UtilityModel[]
    selectedId: string
    setSelectedId: (id: string) => void
    defaultLabel: string
  } => {
    switch (utilityType) {
      case 'water':
        return {
          models: waterModels,
          selectedId: selectedWaterModelId,
          setSelectedId: setSelectedWaterModelId,
          defaultLabel: 'Water',
        }
      case 'electric':
        return {
          models: electricModels,
          selectedId: selectedElectricModelId,
          setSelectedId: setSelectedElectricModelId,
          defaultLabel: 'Electric',
        }
      case 'gas':
        return {
          models: gasModels,
          selectedId: selectedGasModelId,
          setSelectedId: setSelectedGasModelId,
          defaultLabel: 'Gas',
        }
      case 'sewer':
        return {
          models: sewerModels,
          selectedId: selectedSewerModelId,
          setSelectedId: setSelectedSewerModelId,
          defaultLabel: 'Sewer',
        }
    }
  }

  const config = getConfig()
  const displayLabel = label ?? config.defaultLabel

  if (loading) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <span className="text-sm text-gray-500">Loading...</span>
      </div>
    )
  }

  const isProminent = variant === 'prominent'

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {displayLabel && (
        <label
          htmlFor={`${utilityType}-utility-select`}
          className={`text-sm font-medium ${isProminent ? 'text-gray-700' : 'text-gray-600'}`}
        >
          {displayLabel}:
        </label>
      )}
      <select
        id={`${utilityType}-utility-select`}
        value={config.selectedId}
        onChange={(e) => config.setSelectedId(e.target.value)}
        className={`
          rounded-md border text-sm font-medium
          focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500
          ${
            isProminent
              ? 'px-4 py-2 border-gray-300 bg-white shadow-sm text-gray-900'
              : 'px-3 py-1.5 border-gray-200 bg-gray-50 text-gray-700'
          }
        `}
      >
        {config.models.map((model) => (
          <option key={model.id} value={model.id}>
            {model.provider_code || model.provider_name}
          </option>
        ))}
      </select>
    </div>
  )
}
