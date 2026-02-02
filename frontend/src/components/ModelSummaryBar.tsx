import { useState } from 'react'
import { Cog6ToothIcon } from '@heroicons/react/24/outline'
import ModelConfigModal from './ModelConfigModal'
import { useModel } from '../contexts/ModelContext'
import { useOccupancy } from '../contexts/OccupancyContext'
import { useLifestyle } from '../contexts/LifestyleContext'
import { useUtility } from '../contexts/UtilityContext'
import { useFinance } from '../contexts/FinanceContext'

export default function ModelSummaryBar() {
  const [isModalOpen, setIsModalOpen] = useState(false)

  const { selectedModel } = useModel()
  const { selectedOccupancyModel } = useOccupancy()
  const { selectedLifestyleModel } = useLifestyle()
  const { selectedWaterModel, selectedElectricModel, selectedGasModel, selectedSewerModel } = useUtility()
  const { selectedFinanceModel } = useFinance()

  // Build summary parts
  const summaryParts: { label: string; value: string; color: string }[] = []

  if (selectedModel) {
    summaryParts.push({
      label: 'Cost',
      value: selectedModel.name.replace('Model ', '').substring(0, 12),
      color: 'bg-gray-100 text-gray-700 border-gray-300',
    })
  }

  if (selectedOccupancyModel) {
    const occupancy = `${selectedOccupancyModel.total_occupants} person${selectedOccupancyModel.total_occupants !== 1 ? 's' : ''}`
    summaryParts.push({
      label: 'Household',
      value: occupancy,
      color: 'bg-blue-50 text-blue-700 border-blue-200',
    })
  }

  if (selectedLifestyleModel) {
    summaryParts.push({
      label: 'Lifestyle',
      value: selectedLifestyleModel.name.substring(0, 10),
      color: 'bg-green-50 text-green-700 border-green-200',
    })
  }

  if (selectedWaterModel && selectedElectricModel && selectedGasModel && selectedSewerModel) {
    const utilities = [
      selectedWaterModel.provider_code,
      selectedElectricModel.provider_code,
      selectedGasModel.provider_code,
      selectedSewerModel.provider_code,
    ].join('/')
    summaryParts.push({
      label: 'Utilities',
      value: utilities,
      color: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    })
  }

  if (selectedFinanceModel) {
    summaryParts.push({
      label: 'Finance',
      value: selectedFinanceModel.short_code || 'Conv30',
      color: 'bg-purple-50 text-purple-700 border-purple-200',
    })
  }

  return (
    <>
      <div className="flex items-center gap-2">
        {/* Summary chips */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {summaryParts.map((part, index) => (
            <span
              key={index}
              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${part.color}`}
              title={part.label}
            >
              {part.value}
            </span>
          ))}
        </div>

        {/* Configure button */}
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          title="Configure models"
        >
          <Cog6ToothIcon className="w-4 h-4" />
          <span className="hidden sm:inline">Configure</span>
        </button>
      </div>

      <ModelConfigModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  )
}
