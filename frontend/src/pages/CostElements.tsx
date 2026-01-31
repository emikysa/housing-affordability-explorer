import { useState, useMemo } from 'react'
import type { ColDef } from 'ag-grid-community'
import DataGrid, { currencyFormatter, BadgeRenderer } from '../components/DataGrid'
import FilterBar from '../components/FilterBar'
import FilterToggle from '../components/FilterToggle'
import DetailPanel, { Backdrop, DetailItem, DetailSection } from '../components/DetailPanel'
import { useCostElements, useStages, useCrosForCostElement } from '../hooks/useData'
import type { CostElement } from '../types/database'

export default function CostElements() {
  const { data: costElements, loading } = useCostElements()
  const { data: stages } = useStages()
  const [searchText, setSearchText] = useState('')
  const [stageFilter, setStageFilter] = useState('')
  const [showAll, setShowAll] = useState(false) // Default: show populated only
  const [selectedElement, setSelectedElement] = useState<CostElement | null>(null)

  // Get CROs for selected cost element
  const { data: relatedCros } = useCrosForCostElement(selectedElement?.ce_id || null)

  const columnDefs = useMemo<ColDef<CostElement>[]>(
    () => [
      {
        field: 'ce_id',
        headerName: 'ID',
        width: 120,
        pinned: 'left',
      },
      {
        field: 'stage_id',
        headerName: 'Stage',
        width: 110,
        cellRenderer: (params: { value: string }) => <BadgeRenderer value={params.value} />,
      },
      {
        field: 'description',
        headerName: 'Description',
        flex: 2,
        minWidth: 200,
      },
      {
        field: 'estimate',
        headerName: 'Estimate',
        width: 130,
        valueFormatter: currencyFormatter,
        type: 'numericColumn',
      },
      {
        field: 'annual_estimate',
        headerName: 'Annual',
        width: 130,
        valueFormatter: currencyFormatter,
        type: 'numericColumn',
      },
      {
        field: 'unit',
        headerName: 'Unit',
        width: 100,
      },
      {
        field: 'cadence',
        headerName: 'Cadence',
        width: 120,
      },
    ],
    []
  )

  // Filter data
  const filteredData = useMemo(() => {
    let data = costElements

    // Filter to show only populated items (with estimate or annual_estimate)
    if (!showAll) {
      data = data.filter((ce) => ce.estimate != null || ce.annual_estimate != null)
    }

    if (stageFilter) {
      data = data.filter((ce) => ce.stage_id === stageFilter)
    }

    return data
  }, [costElements, stageFilter, showAll])

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

  const formatCurrency = (value: number | null) => {
    if (value == null) return '-'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(value)
  }

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Cost Elements</h1>
        <p className="mt-1 text-gray-500">
          All cost components in the housing affordability framework
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <FilterBar
          searchValue={searchText}
          onSearchChange={setSearchText}
          placeholder="Search cost elements..."
          filters={[
            {
              id: 'stage',
              label: 'Stage',
              value: stageFilter,
              options: stageOptions,
              onChange: setStageFilter,
            },
          ]}
        />
        <FilterToggle showAll={showAll} onChange={setShowAll} />
      </div>

      {/* Data Grid */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <DataGrid
          rowData={filteredData}
          columnDefs={columnDefs}
          loading={loading}
          quickFilterText={searchText}
          onRowClick={setSelectedElement}
          height="calc(100vh - 320px)"
        />
      </div>

      {/* Detail Panel */}
      {selectedElement && (
        <>
          <Backdrop onClick={() => setSelectedElement(null)} />
          <DetailPanel
            title={selectedElement.ce_id}
            onClose={() => setSelectedElement(null)}
          >
            <DetailSection title="Basic Information">
              <DetailItem label="Description" value={selectedElement.description} />
              <DetailItem
                label="Stage"
                value={<BadgeRenderer value={selectedElement.stage_id} />}
              />
              <DetailItem label="Estimate" value={formatCurrency(selectedElement.estimate)} />
              <DetailItem label="Annual Estimate" value={formatCurrency(selectedElement.annual_estimate)} />
              <DetailItem label="Unit" value={selectedElement.unit} />
              <DetailItem label="Cadence" value={selectedElement.cadence} />
            </DetailSection>

            <DetailSection title="Details">
              <DetailItem label="Notes" value={selectedElement.notes} />
              <DetailItem label="Assumptions" value={selectedElement.assumptions} />
            </DetailSection>

            {relatedCros.length > 0 && (
              <DetailSection title="Related Cost Reduction Opportunities">
                <div className="space-y-3">
                  {relatedCros.map((cro) => (
                    <div
                      key={`${cro.cro_id}-${cro.relationship}`}
                      className="p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="font-medium text-gray-900">{cro.cro_id}</span>
                          <span className="ml-2">
                            <BadgeRenderer value={cro.relationship} />
                          </span>
                        </div>
                        {cro.cro_estimate && (
                          <span className="text-green-600 font-medium">
                            {formatCurrency(cro.cro_estimate)}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{cro.cro_description}</p>
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
