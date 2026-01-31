import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { useScenario } from '../contexts/ScenarioContext'
import type { Scenario, CostElement, CostReductionOpportunity } from '../types/database'
import DetailPanel, { Backdrop, DetailItem, DetailSection } from '../components/DetailPanel'
import { BadgeRenderer } from '../components/DataGrid'

interface ScenarioWithStats extends Scenario {
  ce_count?: number
  cro_count?: number
  total_onetime?: number
  total_annual?: number
  total_savings?: number
}

export default function Scenarios() {
  const { scenarios, selectedScenarioId, setSelectedScenarioId } = useScenario()
  const [scenarioStats, setScenarioStats] = useState<Map<string, ScenarioWithStats>>(new Map())
  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null)
  const [scenarioCostElements, setScenarioCostElements] = useState<CostElement[]>([])
  const [scenarioCros, setScenarioCros] = useState<CostReductionOpportunity[]>([])
  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)

  // Fetch stats for each scenario
  useEffect(() => {
    async function fetchAllStats() {
      setLoading(true)
      const statsMap = new Map<string, ScenarioWithStats>()

      for (const scenario of scenarios) {
        try {
          const { data, error } = await supabase.rpc(
            'get_summary_stats_for_scenario' as never,
            { p_scenario_id: scenario.scenario_id } as never
          )
          if (!error && data) {
            const stats = (Array.isArray(data) ? data[0] : data) as {
              total_onetime_costs?: number
              total_annual_costs?: number
              total_potential_savings?: number
            } | null
            statsMap.set(scenario.scenario_id, {
              ...scenario,
              total_onetime: stats?.total_onetime_costs || 0,
              total_annual: stats?.total_annual_costs || 0,
              total_savings: stats?.total_potential_savings || 0,
            })
          } else {
            statsMap.set(scenario.scenario_id, scenario)
          }
        } catch {
          statsMap.set(scenario.scenario_id, scenario)
        }
      }

      setScenarioStats(statsMap)
      setLoading(false)
    }

    if (scenarios.length > 0) {
      fetchAllStats()
    }
  }, [scenarios])

  // Fetch detailed data when a scenario is selected for detail view
  useEffect(() => {
    if (!selectedScenario) {
      setScenarioCostElements([])
      setScenarioCros([])
      return
    }

    async function fetchScenarioData() {
      if (!selectedScenario) return
      setDetailLoading(true)
      const scenarioId = selectedScenario.scenario_id
      try {
        const [ceResult, croResult] = await Promise.all([
          supabase.rpc('get_cost_elements_for_scenario' as never, {
            p_scenario_id: scenarioId,
          } as never),
          supabase.rpc('get_cros_for_scenario' as never, {
            p_scenario_id: scenarioId,
          } as never),
        ])

        if (!ceResult.error) {
          setScenarioCostElements((ceResult.data || []) as CostElement[])
        }
        if (!croResult.error) {
          setScenarioCros((croResult.data || []) as CostReductionOpportunity[])
        }
      } catch (err) {
        console.error('Error fetching scenario data:', err)
      } finally {
        setDetailLoading(false)
      }
    }

    fetchScenarioData()
  }, [selectedScenario])

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
    scenarioCostElements.forEach((ce) => {
      const stage = ce.stage_id || 'Other'
      if (!grouped.has(stage)) grouped.set(stage, [])
      grouped.get(stage)!.push(ce)
    })
    return grouped
  }, [scenarioCostElements])

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Scenarios</h1>
        <p className="mt-1 text-gray-500">
          View and compare different cost scenarios. Click a scenario to see its detailed data.
        </p>
      </div>

      {/* Scenario Cards */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading scenarios...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {scenarios.map((scenario) => {
            const stats = scenarioStats.get(scenario.scenario_id)
            const isActive = selectedScenarioId === scenario.scenario_id

            return (
              <div
                key={scenario.scenario_id}
                className={`bg-white rounded-xl shadow-sm border-2 overflow-hidden transition-all cursor-pointer hover:shadow-md ${
                  isActive ? 'border-primary-500 ring-2 ring-primary-200' : 'border-gray-200'
                }`}
                onClick={() => setSelectedScenario(scenario)}
              >
                {/* Card Header */}
                <div className={`px-5 py-4 ${isActive ? 'bg-primary-50' : 'bg-gray-50'} border-b border-gray-200`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900">{scenario.name}</h3>
                      {scenario.parent_scenario_name && (
                        <p className="text-xs text-gray-500 mt-0.5">
                          Inherits from: {scenario.parent_scenario_name}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-1">
                      {scenario.is_baseline && (
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
                  {scenario.description && (
                    <p className="text-sm text-gray-600 mt-2 line-clamp-2">{scenario.description}</p>
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
                      setSelectedScenarioId(scenario.scenario_id)
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
      {!loading && scenarios.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <p className="text-gray-500">No scenarios found.</p>
        </div>
      )}

      {/* Detail Panel */}
      {selectedScenario && (
        <>
          <Backdrop onClick={() => setSelectedScenario(null)} />
          <DetailPanel
            title={selectedScenario.name}
            onClose={() => setSelectedScenario(null)}
          >
            <DetailSection title="Scenario Details">
              <DetailItem label="Name" value={selectedScenario.name} />
              <DetailItem label="Description" value={selectedScenario.description} />
              {selectedScenario.parent_scenario_name && (
                <DetailItem label="Parent Scenario" value={selectedScenario.parent_scenario_name} />
              )}
              <DetailItem
                label="Type"
                value={
                  selectedScenario.is_baseline ? (
                    <BadgeRenderer value="Baseline" />
                  ) : selectedScenario.parent_scenario_id ? (
                    <BadgeRenderer value="Sub-scenario" />
                  ) : (
                    <BadgeRenderer value="Standalone" />
                  )
                }
              />
            </DetailSection>

            {detailLoading ? (
              <div className="py-8 text-center text-gray-500">Loading scenario data...</div>
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
                {scenarioCros.length > 0 && (
                  <DetailSection title={`Cost Reduction Opportunities (${scenarioCros.length})`}>
                    <div className="space-y-2">
                      {scenarioCros.map((cro) => (
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
