import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { useModel } from '../contexts/ModelContext'
import type { Scenario, CostElement, CostReductionOpportunity } from '../types/database'
import DetailPanel, { Backdrop, DetailItem, DetailSection } from '../components/DetailPanel'
import { BadgeRenderer } from '../components/DataGrid'

// Model is the user-facing name for what the database calls "scenario"
type Model = Scenario

interface ModelWithStats extends Model {
  ce_count?: number
  cro_count?: number
  total_onetime?: number
  total_annual?: number
  total_savings?: number
}

export default function Models() {
  const { models, selectedModelId, setSelectedModelId } = useModel()
  const [modelStats, setModelStats] = useState<Map<string, ModelWithStats>>(new Map())
  const [selectedModel, setSelectedModel] = useState<Model | null>(null)
  const [modelCostElements, setModelCostElements] = useState<CostElement[]>([])
  const [modelCros, setModelCros] = useState<CostReductionOpportunity[]>([])
  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)

  // Fetch stats for each model
  useEffect(() => {
    async function fetchAllStats() {
      setLoading(true)
      const statsMap = new Map<string, ModelWithStats>()

      for (const model of models) {
        try {
          const { data, error } = await supabase.rpc(
            'get_summary_stats_for_scenario' as never,
            { p_scenario_id: model.scenario_id } as never
          )
          if (!error && data) {
            const stats = (Array.isArray(data) ? data[0] : data) as {
              total_onetime_costs?: number
              total_annual_costs?: number
              total_potential_savings?: number
            } | null
            statsMap.set(model.scenario_id, {
              ...model,
              total_onetime: stats?.total_onetime_costs || 0,
              total_annual: stats?.total_annual_costs || 0,
              total_savings: stats?.total_potential_savings || 0,
            })
          } else {
            statsMap.set(model.scenario_id, model)
          }
        } catch {
          statsMap.set(model.scenario_id, model)
        }
      }

      setModelStats(statsMap)
      setLoading(false)
    }

    if (models.length > 0) {
      fetchAllStats()
    }
  }, [models])

  // Fetch detailed data when a model is selected for detail view
  useEffect(() => {
    if (!selectedModel) {
      setModelCostElements([])
      setModelCros([])
      return
    }

    async function fetchModelData() {
      if (!selectedModel) return
      setDetailLoading(true)
      const modelId = selectedModel.scenario_id
      try {
        const [ceResult, croResult] = await Promise.all([
          supabase.rpc('get_cost_elements_for_scenario' as never, {
            p_scenario_id: modelId,
          } as never),
          supabase.rpc('get_cros_for_scenario' as never, {
            p_scenario_id: modelId,
          } as never),
        ])

        if (!ceResult.error) {
          setModelCostElements((ceResult.data || []) as CostElement[])
        }
        if (!croResult.error) {
          setModelCros((croResult.data || []) as CostReductionOpportunity[])
        }
      } catch (err) {
        console.error('Error fetching model data:', err)
      } finally {
        setDetailLoading(false)
      }
    }

    fetchModelData()
  }, [selectedModel])

  const formatCurrency = (value: number | null | undefined) => {
    if (value == null) return '-'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  // Group cost elements by stage for the detail view
  const ceByStage = useMemo(() => {
    const grouped = new Map<string, CostElement[]>()
    modelCostElements.forEach((ce) => {
      const stage = ce.stage_id || 'Other'
      if (!grouped.has(stage)) grouped.set(stage, [])
      grouped.get(stage)!.push(ce)
    })
    return grouped
  }, [modelCostElements])

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Models</h1>
        <p className="mt-1 text-gray-500">
          View and compare different housing cost models. Click a model to see its detailed data.
        </p>
      </div>

      {/* Model Cards */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading models...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {models.map((model) => {
            const stats = modelStats.get(model.scenario_id)
            const isActive = selectedModelId === model.scenario_id

            return (
              <div
                key={model.scenario_id}
                className={`bg-white rounded-xl shadow-sm border-2 overflow-hidden transition-all cursor-pointer hover:shadow-md ${
                  isActive ? 'border-primary-500 ring-2 ring-primary-200' : 'border-gray-200'
                }`}
                onClick={() => setSelectedModel(model)}
              >
                {/* Card Header */}
                <div className={`px-5 py-4 ${isActive ? 'bg-primary-50' : 'bg-gray-50'} border-b border-gray-200`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900">{model.name}</h3>
                      {model.parent_scenario_name && (
                        <p className="text-xs text-gray-500 mt-0.5">
                          Based on: {model.parent_scenario_name}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-1">
                      {model.is_baseline && (
                        <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded">
                          Baseline
                        </span>
                      )}
                      {isActive && (
                        <span className="px-2 py-0.5 text-xs font-medium bg-primary-100 text-primary-700 rounded">
                          Active
                        </span>
                      )}
                    </div>
                  </div>
                  {model.description && (
                    <p className="text-sm text-gray-600 mt-2 line-clamp-2">{model.description}</p>
                  )}
                </div>

                {/* Card Stats */}
                <div className="px-5 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">One-time Costs</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {formatCurrency(stats?.total_onetime)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Annual Costs</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {formatCurrency(stats?.total_annual)}
                      </p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Potential Savings</p>
                      <p className="text-lg font-semibold text-green-600">
                        {formatCurrency(stats?.total_savings)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Card Footer */}
                <div className="px-5 py-3 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelectedModelId(model.scenario_id)
                    }}
                    disabled={isActive}
                    className={`text-sm font-medium ${
                      isActive
                        ? 'text-gray-400 cursor-default'
                        : 'text-primary-600 hover:text-primary-700'
                    }`}
                  >
                    {isActive ? 'Currently Active' : 'Set as Active'}
                  </button>
                  <span className="text-xs text-gray-500">
                    Click for details
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Empty State */}
      {!loading && models.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <p className="text-gray-500">No models found.</p>
        </div>
      )}

      {/* Detail Panel */}
      {selectedModel && (
        <>
          <Backdrop onClick={() => setSelectedModel(null)} />
          <DetailPanel
            title={selectedModel.name}
            onClose={() => setSelectedModel(null)}
          >
            <DetailSection title="Model Details">
              <DetailItem label="Name" value={selectedModel.name} />
              <DetailItem label="Description" value={selectedModel.description} />
              {selectedModel.parent_scenario_name && (
                <DetailItem label="Based On" value={selectedModel.parent_scenario_name} />
              )}
              <DetailItem
                label="Type"
                value={
                  selectedModel.is_baseline ? (
                    <BadgeRenderer value="Baseline" />
                  ) : selectedModel.parent_scenario_id ? (
                    <BadgeRenderer value="Variation" />
                  ) : (
                    <BadgeRenderer value="Standalone" />
                  )
                }
              />
            </DetailSection>

            {detailLoading ? (
              <div className="py-8 text-center text-gray-500">Loading model data...</div>
            ) : (
              <>
                {/* Cost Elements by Stage */}
                {Array.from(ceByStage.entries()).map(([stage, elements]) => (
                  <DetailSection key={stage} title={`${stage} Cost Elements (${elements.length})`}>
                    <div className="space-y-2">
                      {elements.map((ce) => (
                        <div
                          key={ce.ce_id}
                          className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {ce.ce_id}
                            </p>
                            <p className="text-xs text-gray-500 truncate">{ce.description}</p>
                          </div>
                          <div className="text-right ml-4">
                            {ce.estimate != null && (
                              <p className="text-sm font-medium text-gray-900">
                                {formatCurrency(ce.estimate)}
                              </p>
                            )}
                            {ce.annual_estimate != null && (
                              <p className="text-xs text-gray-500">
                                {formatCurrency(ce.annual_estimate)}/yr
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </DetailSection>
                ))}

                {/* CROs */}
                {modelCros.length > 0 && (
                  <DetailSection title={`Cost Reduction Opportunities (${modelCros.length})`}>
                    <div className="space-y-2">
                      {modelCros.map((cro) => (
                        <div
                          key={cro.cro_id}
                          className="flex items-center justify-between py-2 px-3 bg-green-50 rounded"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {cro.cro_id}
                            </p>
                            <p className="text-xs text-gray-500 truncate">{cro.description}</p>
                          </div>
                          <div className="text-right ml-4">
                            {cro.estimate != null && (
                              <p className="text-sm font-medium text-green-600">
                                {formatCurrency(cro.estimate)}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </DetailSection>
                )}
              </>
            )}
          </DetailPanel>
        </>
      )}
    </div>
  )
}
