import { useState, useMemo } from 'react'
import type { ColDef } from 'ag-grid-community'
import DataGrid, { currencyFormatter, BadgeRenderer, BooleanRenderer } from '../components/DataGrid'
import FilterBar from '../components/FilterBar'
import DetailPanel, { Backdrop, DetailItem, DetailSection } from '../components/DetailPanel'
import { useCostReductionOpportunities, useStages, useBarriersByCro, useCroImpacts } from '../hooks/useData'
import type { CostReductionOpportunity } from '../types/database'

export default function Opportunities() {
  const { data: cros, loading } = useCostReductionOpportunities()
  const { data: stages } = useStages()
  const [searchText, setSearchText] = useState('')
  const [stageFilter, setStageFilter] = useState('')
  const [dependencyFilter, setDependencyFilter] = useState('')
  const [selectedCro, setSelectedCro] = useState<CostReductionOpportunity | null>(null)

  // Get barriers and impacts for selected CRO
  const { data: relatedBarriers } = useBarriersByCro(selectedCro?.cro_id || null)
  const { data: allImpacts } = useCroImpacts()

  const impacts = useMemo(() => {
    if (!selectedCro) return []
    return allImpacts.filter((i) => i.cro_id === selectedCro.cro_id)
  }, [allImpacts, selectedCro])

  const columnDefs = useMemo<ColDef<CostReductionOpportunity>[]>(
    () => [
      {
        field: 'cro_id',
        headerName: 'ID',
        width: 150,
        pinned: 'left',
      },
      {
        field: 'description',
        headerName: 'Value Drivers',
        flex: 2,
        minWidth: 200,
      },
      {
        field: 'estimate',
        headerName: 'Est. Savings',
        width: 130,
        valueFormatter: currencyFormatter,
        type: 'numericColumn',
        cellStyle: { color: '#059669' },
      },
      {
        field: 'stage_id',
        headerName: 'Stage',
        width: 110,
        cellRenderer: (params: { value: string }) => <BadgeRenderer value={params.value} />,
      },
      {
        field: 'cadence_id',
        headerName: 'Cadence',
        width: 120,
      },
      {
        field: 'dependency_id',
        headerName: 'Dependency',
        width: 120,
        cellRenderer: (params: { value: string }) => <BadgeRenderer value={params.value} />,
      },
      {
        field: 'requires_upfront_investment',
        headerName: 'Upfront?',
        width: 100,
        cellRenderer: (params: { value: boolean }) => <BooleanRenderer value={params.value} />,
      },
    ],
    []
  )

  // Filter data
  const filteredData = useMemo(() => {
    let data = cros

    if (stageFilter) {
      data = data.filter((c) => c.stage_id === stageFilter)
    }

    if (dependencyFilter) {
      data = data.filter((c) => c.dependency_id === dependencyFilter)
    }

    return data
  }, [cros, stageFilter, dependencyFilter])

  const stageOptions = useMemo(
    () =>
      stages
        .filter((s) => s.stage_id !== 'Total')
        .map((s) => ({
          value: s.stage_id,
          label: s.stage_id,
        })),
    [stages]
  )

  const dependencyOptions = [
    { value: 'Policy', label: 'Policy' },
    { value: 'Market', label: 'Market' },
    { value: 'Both', label: 'Both' },
  ]

  const formatCurrency = (value: number | null) => {
    if (value == null) return '-'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(value)
  }

  // Calculate totals
  const totalSavings = useMemo(
    () => filteredData.reduce((sum, c) => sum + (c.estimate || 0), 0),
    [filteredData]
  )

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cost Reduction Opportunities</h1>
          <p className="mt-1 text-gray-500">
            Ways to reduce housing costs and their potential impact
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-500">Total Potential Savings</p>
          <p className="text-2xl font-bold text-green-600">{formatCurrency(totalSavings)}</p>
          <p className="text-xs text-gray-400">{filteredData.length} opportunities</p>
        </div>
      </div>

      {/* Filters */}
      <FilterBar
        searchValue={searchText}
        onSearchChange={setSearchText}
        placeholder="Search opportunities..."
        filters={[
          {
            id: 'stage',
            label: 'Stage',
            value: stageFilter,
            options: stageOptions,
            onChange: setStageFilter,
          },
          {
            id: 'dependency',
            label: 'Dependency',
            value: dependencyFilter,
            options: dependencyOptions,
            onChange: setDependencyFilter,
          },
        ]}
      />

      {/* Data Grid */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <DataGrid
          rowData={filteredData}
          columnDefs={columnDefs}
          loading={loading}
          quickFilterText={searchText}
          onRowClick={setSelectedCro}
          height="calc(100vh - 350px)"
        />
      </div>

      {/* Detail Panel */}
      {selectedCro && (
        <>
          <Backdrop onClick={() => setSelectedCro(null)} />
          <DetailPanel title={selectedCro.cro_id} onClose={() => setSelectedCro(null)}>
            <DetailSection title="Overview">
              <DetailItem label="Value Drivers" value={selectedCro.value_drivers} />
              <DetailItem
                label="Estimated Savings"
                value={
                  <span className="text-green-600 font-semibold">
                    {formatCurrency(selectedCro.estimate)}
                  </span>
                }
              />
              <DetailItem label="Unit" value={selectedCro.unit} />
              <DetailItem
                label="Stage"
                value={<BadgeRenderer value={selectedCro.stage_id} />}
              />
              <DetailItem label="Savings Cadence" value={selectedCro.cadence_description} />
              <DetailItem
                label="Primary Dependency"
                value={<BadgeRenderer value={selectedCro.dependency_id} />}
              />
              <DetailItem
                label="Requires Upfront Investment"
                value={<BooleanRenderer value={selectedCro.requires_upfront_investment} />}
              />
            </DetailSection>

            <DetailSection title="Notes">
              <DetailItem label="Notes & Assumptions" value={selectedCro.notes} />
            </DetailSection>

            {impacts.length > 0 && (
              <DetailSection title="Cost Elements Affected">
                <div className="space-y-2">
                  {impacts.map((impact) => (
                    <div
                      key={`${impact.ce_id}-${impact.relationship}`}
                      className="flex items-center justify-between p-2 bg-gray-50 rounded"
                    >
                      <div>
                        <span className="font-medium">{impact.ce_id}</span>
                        <span className="ml-2">
                          <BadgeRenderer value={impact.relationship} />
                        </span>
                        <p className="text-sm text-gray-600">{impact.ce_description}</p>
                      </div>
                      {impact.ce_estimate && (
                        <span className="text-gray-600 text-sm">
                          {formatCurrency(impact.ce_estimate)}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </DetailSection>
            )}

            {relatedBarriers.length > 0 && (
              <DetailSection title={`Barriers (${relatedBarriers.length})`}>
                <div className="space-y-3">
                  {relatedBarriers.map((barrier) => (
                    <div key={barrier.barrier_id} className="p-3 bg-red-50 rounded-lg border border-red-100">
                      <div className="flex items-start gap-2 flex-wrap">
                        <BadgeRenderer value={barrier.barrier_type} />
                        <BadgeRenderer value={barrier.barrier_scope} />
                        <BadgeRenderer value={barrier.feasibility_horizon} />
                      </div>
                      <p className="text-sm text-gray-900 mt-2">{barrier.description}</p>
                      {barrier.effect_mechanism && (
                        <p className="text-xs text-gray-600 mt-1">
                          <strong>Effect:</strong> {barrier.effect_mechanism}
                        </p>
                      )}
                      {barrier.lever_type && (
                        <p className="text-xs text-green-700 mt-1">
                          <strong>Lever:</strong> {barrier.lever_type_description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </DetailSection>
            )}
          </DetailPanel>
        </>
      )}
    </div>
  )
}
