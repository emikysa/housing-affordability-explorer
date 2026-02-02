import { useState, useMemo } from 'react'
import { useModel } from '../contexts/ModelContext'
import { useOccupancy } from '../contexts/OccupancyContext'
import { useLifestyle } from '../contexts/LifestyleContext'
import { useUtility } from '../contexts/UtilityContext'
import { useFinance } from '../contexts/FinanceContext'
import type {
  Scenario,
  OccupancyModel,
  LifestyleModel,
  UtilityModel,
  OccupantFinanceModel,
} from '../types/database'
import DetailPanel, { Backdrop, DetailItem, DetailSection } from '../components/DetailPanel'
import VersionStamp from '../components/VersionStamp'

// Tab configuration
type ModelTab = 'cost' | 'occupancy' | 'lifestyle' | 'utility' | 'finance'

const tabs: { id: ModelTab; label: string; color: string; bgColor: string; borderColor: string }[] = [
  { id: 'cost', label: 'Cost Models', color: 'text-gray-700', bgColor: 'bg-gray-100', borderColor: 'border-gray-300' },
  { id: 'occupancy', label: 'Occupancy', color: 'text-blue-700', bgColor: 'bg-blue-50', borderColor: 'border-blue-300' },
  { id: 'lifestyle', label: 'Lifestyle', color: 'text-green-700', bgColor: 'bg-green-50', borderColor: 'border-green-300' },
  { id: 'utility', label: 'Utilities', color: 'text-cyan-700', bgColor: 'bg-cyan-50', borderColor: 'border-cyan-300' },
  { id: 'finance', label: 'Finance', color: 'text-purple-700', bgColor: 'bg-purple-50', borderColor: 'border-purple-300' },
]

// Utility sub-tabs
type UtilitySubTab = 'water' | 'electric' | 'gas'

export default function Models() {
  const [activeTab, setActiveTab] = useState<ModelTab>('cost')
  const [utilitySubTab, setUtilitySubTab] = useState<UtilitySubTab>('water')

  // Get all contexts
  const { models, selectedModelId, setSelectedModelId } = useModel()
  const { occupancyModels, selectedOccupancyModelId, setSelectedOccupancyModelId } = useOccupancy()
  const { lifestyleModels, selectedLifestyleModelId, setSelectedLifestyleModelId } = useLifestyle()
  const {
    waterModels, selectedWaterModelId, setSelectedWaterModelId,
    electricModels, selectedElectricModelId, setSelectedElectricModelId,
    gasModels, selectedGasModelId, setSelectedGasModelId,
  } = useUtility()
  const { financeModels, selectedFinanceModelId, setSelectedFinanceModelId } = useFinance()

  // Detail panel state
  const [selectedCostModel, setSelectedCostModel] = useState<Scenario | null>(null)
  const [selectedOccupancyModel, setSelectedOccupancyModel] = useState<OccupancyModel | null>(null)
  const [selectedLifestyleModel, setSelectedLifestyleModel] = useState<LifestyleModel | null>(null)
  const [selectedUtilityModel, setSelectedUtilityModel] = useState<UtilityModel | null>(null)
  const [selectedFinanceModel, setSelectedFinanceModel] = useState<OccupantFinanceModel | null>(null)

  const formatCurrency = (value: number | null | undefined) => {
    if (value == null) return '-'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)
  }

  const formatPercent = (value: number | null | undefined) => {
    if (value == null) return '-'
    return `${(value * 100).toFixed(3)}%`
  }

  const formatRate = (value: number | null | undefined, decimals: number = 4) => {
    if (value == null) return '-'
    return `$${value.toFixed(decimals)}`
  }

  // Get utility models for current sub-tab
  const currentUtilityModels = useMemo(() => {
    switch (utilitySubTab) {
      case 'water': return waterModels
      case 'electric': return electricModels
      case 'gas': return gasModels
    }
  }, [utilitySubTab, waterModels, electricModels, gasModels])

  const currentUtilitySelectedId = useMemo(() => {
    switch (utilitySubTab) {
      case 'water': return selectedWaterModelId
      case 'electric': return selectedElectricModelId
      case 'gas': return selectedGasModelId
    }
  }, [utilitySubTab, selectedWaterModelId, selectedElectricModelId, selectedGasModelId])

  const setCurrentUtilitySelectedId = useMemo(() => {
    switch (utilitySubTab) {
      case 'water': return setSelectedWaterModelId
      case 'electric': return setSelectedElectricModelId
      case 'gas': return setSelectedGasModelId
    }
  }, [utilitySubTab, setSelectedWaterModelId, setSelectedElectricModelId, setSelectedGasModelId])

  const closeAllPanels = () => {
    setSelectedCostModel(null)
    setSelectedOccupancyModel(null)
    setSelectedLifestyleModel(null)
    setSelectedUtilityModel(null)
    setSelectedFinanceModel(null)
  }

  const activeTabConfig = tabs.find(t => t.id === activeTab)!

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Models<VersionStamp /></h1>
        <p className="mt-1 text-gray-500">
          View and manage all model types. Click any model to see details, or set it as active.
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-1" aria-label="Model types">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${
                activeTab === tab.id
                  ? `${tab.bgColor} ${tab.color} border-current`
                  : 'text-gray-500 border-transparent hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              {tab.label}
              <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${
                activeTab === tab.id ? 'bg-white/50' : 'bg-gray-200'
              }`}>
                {tab.id === 'cost' && models.length}
                {tab.id === 'occupancy' && occupancyModels.length}
                {tab.id === 'lifestyle' && lifestyleModels.length}
                {tab.id === 'utility' && (waterModels.length + electricModels.length + gasModels.length)}
                {tab.id === 'finance' && financeModels.length}
              </span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className={`${activeTabConfig.bgColor} rounded-lg p-6 border ${activeTabConfig.borderColor}`}>
        {/* Cost Models Tab */}
        {activeTab === 'cost' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900">Cost Models (Scenarios)</h2>
              <p className="text-sm text-gray-600">
                Development cost assumptions for building a home
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {models.map((model) => {
                const isActive = selectedModelId === model.scenario_id
                return (
                  <div
                    key={model.scenario_id}
                    onClick={() => setSelectedCostModel(model)}
                    className={`bg-white rounded-lg border-2 p-4 cursor-pointer hover:shadow-md transition-all ${
                      isActive ? 'border-gray-500 ring-2 ring-gray-200' : 'border-gray-200'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-medium text-gray-900">{model.name}</h3>
                      <div className="flex gap-1">
                        {model.is_baseline && (
                          <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded">
                            Baseline
                          </span>
                        )}
                        {isActive && (
                          <span className="px-2 py-0.5 text-xs font-medium bg-gray-200 text-gray-700 rounded">
                            Active
                          </span>
                        )}
                      </div>
                    </div>
                    {model.description && (
                      <p className="text-sm text-gray-600 line-clamp-2">{model.description}</p>
                    )}
                    <div className="mt-3 flex justify-between items-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedModelId(model.scenario_id)
                        }}
                        disabled={isActive}
                        className={`text-xs font-medium ${
                          isActive ? 'text-gray-400' : 'text-gray-600 hover:text-gray-800'
                        }`}
                      >
                        {isActive ? 'Currently Active' : 'Set as Active'}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Occupancy Models Tab */}
        {activeTab === 'occupancy' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900">Occupancy Models</h2>
              <p className="text-sm text-gray-600">
                Household composition affects consumption calculations
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {occupancyModels.map((model) => {
                const isActive = selectedOccupancyModelId === model.id
                return (
                  <div
                    key={model.id}
                    onClick={() => setSelectedOccupancyModel(model)}
                    className={`bg-white rounded-lg border-2 p-4 cursor-pointer hover:shadow-md transition-all ${
                      isActive ? 'border-blue-500 ring-2 ring-blue-200' : 'border-blue-200'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-medium text-gray-900">{model.name}</h3>
                      {isActive && (
                        <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded">
                          Active
                        </span>
                      )}
                    </div>
                    <div className="flex gap-4 text-sm text-gray-600 mb-2">
                      <span>{model.adults} adult{model.adults !== 1 ? 's' : ''}</span>
                      <span>{model.children} child{model.children !== 1 ? 'ren' : ''}</span>
                    </div>
                    <div className="text-lg font-semibold text-blue-600">
                      {model.total_occupants} total
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedOccupancyModelId(model.id)
                      }}
                      disabled={isActive}
                      className={`mt-2 text-xs font-medium ${
                        isActive ? 'text-gray-400' : 'text-blue-600 hover:text-blue-800'
                      }`}
                    >
                      {isActive ? 'Currently Active' : 'Set as Active'}
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Lifestyle Models Tab */}
        {activeTab === 'lifestyle' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900">Lifestyle Models</h2>
              <p className="text-sm text-gray-600">
                Consumption patterns that drive utility usage
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {lifestyleModels.map((model) => {
                const isActive = selectedLifestyleModelId === model.id
                return (
                  <div
                    key={model.id}
                    onClick={() => setSelectedLifestyleModel(model)}
                    className={`bg-white rounded-lg border-2 p-4 cursor-pointer hover:shadow-md transition-all ${
                      isActive ? 'border-green-500 ring-2 ring-green-200' : 'border-green-200'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-medium text-gray-900">{model.name}</h3>
                      {isActive && (
                        <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded">
                          Active
                        </span>
                      )}
                    </div>
                    {model.description && (
                      <p className="text-sm text-gray-600 mb-3">{model.description}</p>
                    )}
                    <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
                      <span>🚿 {model.showers_per_week}/wk</span>
                      <span>👕 {model.laundry_loads_per_week}/wk</span>
                      <span>🍳 {model.meals_cooked_per_day}/day</span>
                      <span>🌡️ {model.heating_multiplier}x heat</span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedLifestyleModelId(model.id)
                      }}
                      disabled={isActive}
                      className={`mt-3 text-xs font-medium ${
                        isActive ? 'text-gray-400' : 'text-green-600 hover:text-green-800'
                      }`}
                    >
                      {isActive ? 'Currently Active' : 'Set as Active'}
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Utility Models Tab */}
        {activeTab === 'utility' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900">Utility Models</h2>
              <p className="text-sm text-gray-600">
                Rate structures from local utility providers
              </p>
            </div>

            {/* Utility Sub-tabs */}
            <div className="flex space-x-2 border-b border-cyan-200 pb-2">
              <button
                onClick={() => setUtilitySubTab('water')}
                className={`px-4 py-2 text-sm font-medium rounded-t-lg ${
                  utilitySubTab === 'water'
                    ? 'bg-cyan-100 text-cyan-700'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                💧 Water ({waterModels.length})
              </button>
              <button
                onClick={() => setUtilitySubTab('electric')}
                className={`px-4 py-2 text-sm font-medium rounded-t-lg ${
                  utilitySubTab === 'electric'
                    ? 'bg-amber-100 text-amber-700'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                ⚡ Electric ({electricModels.length})
              </button>
              <button
                onClick={() => setUtilitySubTab('gas')}
                className={`px-4 py-2 text-sm font-medium rounded-t-lg ${
                  utilitySubTab === 'gas'
                    ? 'bg-orange-100 text-orange-700'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                🔥 Gas ({gasModels.length})
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {currentUtilityModels.map((model) => {
                const isActive = currentUtilitySelectedId === model.id
                const subTabColor = utilitySubTab === 'water' ? 'cyan'
                  : utilitySubTab === 'electric' ? 'amber' : 'orange'
                return (
                  <div
                    key={model.id}
                    onClick={() => setSelectedUtilityModel(model)}
                    className={`bg-white rounded-lg border-2 p-4 cursor-pointer hover:shadow-md transition-all ${
                      isActive
                        ? `border-${subTabColor}-500 ring-2 ring-${subTabColor}-200`
                        : `border-${subTabColor}-200`
                    }`}
                    style={{
                      borderColor: isActive
                        ? (subTabColor === 'cyan' ? '#06b6d4' : subTabColor === 'amber' ? '#f59e0b' : '#f97316')
                        : undefined
                    }}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-medium text-gray-900">{model.provider_name}</h3>
                        {model.provider_code && (
                          <span className="text-xs text-gray-500">{model.provider_code}</span>
                        )}
                      </div>
                      {isActive && (
                        <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                          subTabColor === 'cyan' ? 'bg-cyan-100 text-cyan-700'
                          : subTabColor === 'amber' ? 'bg-amber-100 text-amber-700'
                          : 'bg-orange-100 text-orange-700'
                        }`}>
                          Active
                        </span>
                      )}
                    </div>
                    {model.service_area && (
                      <p className="text-sm text-gray-600 mb-2">{model.service_area}</p>
                    )}
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Base fee:</span>
                      <span className="font-medium">{formatCurrency(model.base_monthly_fee)}/mo</span>
                    </div>
                    {model.rate_tiers && model.rate_tiers.length > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Tier 1 rate:</span>
                        <span className="font-medium">
                          {formatRate(model.rate_tiers[0]?.rate, 5)}/{model.unit_name}
                        </span>
                      </div>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setCurrentUtilitySelectedId(model.id)
                      }}
                      disabled={isActive}
                      className={`mt-3 text-xs font-medium ${
                        isActive ? 'text-gray-400'
                        : subTabColor === 'cyan' ? 'text-cyan-600 hover:text-cyan-800'
                        : subTabColor === 'amber' ? 'text-amber-600 hover:text-amber-800'
                        : 'text-orange-600 hover:text-orange-800'
                      }`}
                    >
                      {isActive ? 'Currently Active' : 'Set as Active'}
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Finance Models Tab */}
        {activeTab === 'finance' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900">Finance Models</h2>
              <p className="text-sm text-gray-600">
                Mortgage terms affecting monthly housing payment
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {financeModels.map((model) => {
                const isActive = selectedFinanceModelId === model.id
                return (
                  <div
                    key={model.id}
                    onClick={() => setSelectedFinanceModel(model)}
                    className={`bg-white rounded-lg border-2 p-4 cursor-pointer hover:shadow-md transition-all ${
                      isActive ? 'border-purple-500 ring-2 ring-purple-200' : 'border-purple-200'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-medium text-gray-900">{model.name}</h3>
                        {model.short_code && (
                          <span className="text-xs text-gray-500">{model.short_code}</span>
                        )}
                      </div>
                      {isActive && (
                        <span className="px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-700 rounded">
                          Active
                        </span>
                      )}
                    </div>
                    <div className="space-y-1 text-sm">
                      {model.loan_term_years > 0 ? (
                        <>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Term:</span>
                            <span className="font-medium">{model.loan_term_years} years</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Rate:</span>
                            <span className="font-medium">{formatPercent(model.annual_interest_rate)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Down:</span>
                            <span className="font-medium">{formatPercent(model.down_payment_percent)}</span>
                          </div>
                        </>
                      ) : (
                        <div className="text-center py-2 text-gray-600">
                          All-cash purchase
                        </div>
                      )}
                      {model.pmi_rate > 0 && (
                        <div className="flex justify-between text-amber-600">
                          <span>PMI:</span>
                          <span className="font-medium">{formatPercent(model.pmi_rate)}</span>
                        </div>
                      )}
                    </div>
                    <div className="mt-2">
                      <span className={`px-2 py-0.5 text-xs rounded ${
                        model.loan_type === 'conventional' ? 'bg-gray-100 text-gray-700'
                        : model.loan_type === 'fha' ? 'bg-blue-100 text-blue-700'
                        : model.loan_type === 'va' ? 'bg-green-100 text-green-700'
                        : model.loan_type === 'usda' ? 'bg-lime-100 text-lime-700'
                        : 'bg-purple-100 text-purple-700'
                      }`}>
                        {model.loan_type.toUpperCase()}
                      </span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedFinanceModelId(model.id)
                      }}
                      disabled={isActive}
                      className={`mt-3 text-xs font-medium ${
                        isActive ? 'text-gray-400' : 'text-purple-600 hover:text-purple-800'
                      }`}
                    >
                      {isActive ? 'Currently Active' : 'Set as Active'}
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Currently Active Models Summary */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Currently Active Models</h3>
        <div className="flex flex-wrap gap-2">
          <span className="px-3 py-1 text-xs rounded-full bg-gray-100 border border-gray-300">
            Cost: {models.find(m => m.scenario_id === selectedModelId)?.name || '-'}
          </span>
          <span className="px-3 py-1 text-xs rounded-full bg-blue-50 border border-blue-200">
            Occupancy: {occupancyModels.find(m => m.id === selectedOccupancyModelId)?.name || '-'}
          </span>
          <span className="px-3 py-1 text-xs rounded-full bg-green-50 border border-green-200">
            Lifestyle: {lifestyleModels.find(m => m.id === selectedLifestyleModelId)?.name || '-'}
          </span>
          <span className="px-3 py-1 text-xs rounded-full bg-cyan-50 border border-cyan-200">
            Water: {waterModels.find(m => m.id === selectedWaterModelId)?.provider_code || '-'}
          </span>
          <span className="px-3 py-1 text-xs rounded-full bg-amber-50 border border-amber-200">
            Electric: {electricModels.find(m => m.id === selectedElectricModelId)?.provider_code || '-'}
          </span>
          <span className="px-3 py-1 text-xs rounded-full bg-orange-50 border border-orange-200">
            Gas: {gasModels.find(m => m.id === selectedGasModelId)?.provider_code || '-'}
          </span>
          <span className="px-3 py-1 text-xs rounded-full bg-purple-50 border border-purple-200">
            Finance: {financeModels.find(m => m.id === selectedFinanceModelId)?.short_code || '-'}
          </span>
        </div>
      </div>

      {/* Detail Panels */}
      {selectedCostModel && (
        <>
          <Backdrop onClick={closeAllPanels} />
          <DetailPanel title={selectedCostModel.name} onClose={closeAllPanels}>
            <DetailSection title="Cost Model Details">
              <DetailItem label="Name" value={selectedCostModel.name} />
              <DetailItem label="Description" value={selectedCostModel.description} />
              {selectedCostModel.parent_scenario_name && (
                <DetailItem label="Based On" value={selectedCostModel.parent_scenario_name} />
              )}
              <DetailItem label="Baseline" value={selectedCostModel.is_baseline ? 'Yes' : 'No'} />
            </DetailSection>
          </DetailPanel>
        </>
      )}

      {selectedOccupancyModel && (
        <>
          <Backdrop onClick={closeAllPanels} />
          <DetailPanel title={selectedOccupancyModel.name} onClose={closeAllPanels}>
            <DetailSection title="Occupancy Details">
              <DetailItem label="Name" value={selectedOccupancyModel.name} />
              <DetailItem label="Description" value={selectedOccupancyModel.description} />
              <DetailItem label="Adults" value={selectedOccupancyModel.adults} />
              <DetailItem label="Children" value={selectedOccupancyModel.children} />
              <DetailItem label="Total Occupants" value={selectedOccupancyModel.total_occupants} />
            </DetailSection>
          </DetailPanel>
        </>
      )}

      {selectedLifestyleModel && (
        <>
          <Backdrop onClick={closeAllPanels} />
          <DetailPanel title={selectedLifestyleModel.name} onClose={closeAllPanels}>
            <DetailSection title="Lifestyle Details">
              <DetailItem label="Name" value={selectedLifestyleModel.name} />
              <DetailItem label="Description" value={selectedLifestyleModel.description} />
            </DetailSection>
            <DetailSection title="Water Usage">
              <DetailItem label="Showers per week" value={`${selectedLifestyleModel.showers_per_week} per person`} />
              <DetailItem label="Baths per week" value={`${selectedLifestyleModel.baths_per_week} per person`} />
              <DetailItem label="Laundry loads/week" value={selectedLifestyleModel.laundry_loads_per_week} />
              <DetailItem label="Dishwasher loads/week" value={selectedLifestyleModel.dishwasher_loads_per_week} />
              <DetailItem label="Toilet flushes/day" value={`${selectedLifestyleModel.toilet_flushes_per_day} per person`} />
            </DetailSection>
            <DetailSection title="Energy Usage">
              <DetailItem label="Meals cooked/day" value={selectedLifestyleModel.meals_cooked_per_day} />
              <DetailItem label="TV hours/day" value={selectedLifestyleModel.tv_hours_per_day} />
              <DetailItem label="Computer hours/day" value={selectedLifestyleModel.computer_hours_per_day} />
              <DetailItem label="Lighting hours/day" value={selectedLifestyleModel.lighting_hours_per_day} />
              <DetailItem label="Heating multiplier" value={`${selectedLifestyleModel.heating_multiplier}x`} />
              <DetailItem label="Cooling multiplier" value={`${selectedLifestyleModel.cooling_multiplier}x`} />
            </DetailSection>
          </DetailPanel>
        </>
      )}

      {selectedUtilityModel && (
        <>
          <Backdrop onClick={closeAllPanels} />
          <DetailPanel title={selectedUtilityModel.provider_name} onClose={closeAllPanels}>
            <DetailSection title="Provider Details">
              <DetailItem label="Provider" value={selectedUtilityModel.provider_name} />
              <DetailItem label="Code" value={selectedUtilityModel.provider_code} />
              <DetailItem label="Type" value={selectedUtilityModel.utility_type} />
              <DetailItem label="Service Area" value={selectedUtilityModel.service_area} />
              <DetailItem label="Description" value={selectedUtilityModel.description} />
            </DetailSection>
            <DetailSection title="Rate Structure">
              <DetailItem label="Base Monthly Fee" value={formatCurrency(selectedUtilityModel.base_monthly_fee)} />
              <DetailItem label="Unit" value={selectedUtilityModel.unit_name} />
              {selectedUtilityModel.rate_tiers && selectedUtilityModel.rate_tiers.length > 0 && (
                <div className="mt-2">
                  <p className="text-sm font-medium text-gray-700 mb-2">Tiered Rates:</p>
                  <div className="space-y-1">
                    {selectedUtilityModel.rate_tiers.map((tier, idx) => (
                      <div key={idx} className="flex justify-between text-sm bg-gray-50 px-3 py-1 rounded">
                        <span>
                          {tier.max_units === null
                            ? `Over ${selectedUtilityModel.rate_tiers[idx - 1]?.max_units?.toLocaleString() || 0}`
                            : `Up to ${tier.max_units.toLocaleString()}`}
                          {' '}{selectedUtilityModel.unit_name}
                        </span>
                        <span className="font-medium">{formatRate(tier.rate, 5)}/{selectedUtilityModel.unit_name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </DetailSection>
            {selectedUtilityModel.has_seasonal_rates && (
              <DetailSection title="Seasonal Adjustments">
                <DetailItem label="Summer Multiplier" value={`${selectedUtilityModel.summer_multiplier}x`} />
                <DetailItem label="Winter Multiplier" value={`${selectedUtilityModel.winter_multiplier}x`} />
              </DetailSection>
            )}
          </DetailPanel>
        </>
      )}

      {selectedFinanceModel && (
        <>
          <Backdrop onClick={closeAllPanels} />
          <DetailPanel title={selectedFinanceModel.name} onClose={closeAllPanels}>
            <DetailSection title="Loan Details">
              <DetailItem label="Name" value={selectedFinanceModel.name} />
              <DetailItem label="Code" value={selectedFinanceModel.short_code} />
              <DetailItem label="Loan Type" value={selectedFinanceModel.loan_type.toUpperCase()} />
              <DetailItem label="Description" value={selectedFinanceModel.description} />
            </DetailSection>
            {selectedFinanceModel.loan_term_years > 0 && (
              <DetailSection title="Terms">
                <DetailItem label="Loan Term" value={`${selectedFinanceModel.loan_term_years} years`} />
                <DetailItem label="Interest Rate" value={formatPercent(selectedFinanceModel.annual_interest_rate)} />
                <DetailItem label="Down Payment" value={formatPercent(selectedFinanceModel.down_payment_percent)} />
                {selectedFinanceModel.min_down_payment_percent && (
                  <DetailItem label="Minimum Down" value={formatPercent(selectedFinanceModel.min_down_payment_percent)} />
                )}
                <DetailItem label="Closing Costs" value={formatPercent(selectedFinanceModel.closing_cost_percent)} />
              </DetailSection>
            )}
            {selectedFinanceModel.pmi_rate > 0 && (
              <DetailSection title="PMI / MIP">
                <DetailItem label="Annual PMI Rate" value={formatPercent(selectedFinanceModel.pmi_rate)} />
                <DetailItem label="PMI Drops at" value={formatPercent(selectedFinanceModel.pmi_threshold)} />
              </DetailSection>
            )}
          </DetailPanel>
        </>
      )}
    </div>
  )
}
