import { useState, useMemo } from 'react'
import type { ColDef } from 'ag-grid-community'
import DataGrid, { currencyFormatter, BadgeRenderer } from '../components/DataGrid'
import FilterToggle from '../components/FilterToggle'
import DetailPanel, { Backdrop, DetailItem, DetailSection } from '../components/DetailPanel'
import { useCostElements, useStages, useCrosForCostElement, useCEDrilldown } from '../hooks/useData'
import type { CostElement } from '../types/database'

export default function CostElements() {
  const { data: costElements, loading } = useCostElements()
  const { data: stages } = useStages()
  const { data: drilldownData } = useCEDrilldown()
  const [searchText, setSearchText] = useState('')
  const [stageFilter, setStageFilter] = useState('')
  const [showAll, setShowAll] = useState(false)
  const [selectedElement, setSelectedElement] = useState<CostElement | null>(null)

  // Cascading level filters
  const [level1Filter, setLevel1Filter] = useState('')
  const [level2Filter, setLevel2Filter] = useState('')
  const [level3Filter, setLevel3Filter] = useState('')
  const [level4Filter, setLevel4Filter] = useState('')

  // Get CROs for selected cost element
  const { data: relatedCros } = useCrosForCostElement(selectedElement?.ce_id || null)

  // Get unique CE codes from drilldown data that match current filters
  const filteredCECodes = useMemo(() => {
    let filtered = drilldownData

    if (level1Filter) {
      filtered = filtered.filter((d) => d.level1_name === level1Filter)
    }
    if (level2Filter) {
      filtered = filtered.filter((d) => d.level2_name === level2Filter)
    }
    if (level3Filter) {
      filtered = filtered.filter((d) => d.level3_name === level3Filter)
    }
    if (level4Filter) {
      filtered = filtered.filter((d) => d.level4_name === level4Filter)
    }

    return new Set(filtered.map((d) => d.ce_code))
  }, [drilldownData, level1Filter, level2Filter, level3Filter, level4Filter])

  // Level 1 options - all unique level1_names
  const level1Options = useMemo(() => {
    const uniqueValues = [...new Set(drilldownData.map((d) => d.level1_name))].sort()
    return uniqueValues.map((v) => ({ value: v, label: v }))
  }, [drilldownData])

  // Level 2 options - filtered by level1 selection
  const level2Options = useMemo(() => {
    let filtered = drilldownData
    if (level1Filter) {
      filtered = filtered.filter((d) => d.level1_name === level1Filter)
    }
    const uniqueValues = [...new Set(filtered.map((d) => d.level2_name))].sort()
    return uniqueValues.map((v) => ({ value: v, label: v }))
  }, [drilldownData, level1Filter])

  // Level 3 options - filtered by level1 and level2 selection
  const level3Options = useMemo(() => {
    let filtered = drilldownData
    if (level1Filter) {
      filtered = filtered.filter((d) => d.level1_name === level1Filter)
    }
    if (level2Filter) {
      filtered = filtered.filter((d) => d.level2_name === level2Filter)
    }
    const uniqueValues = [...new Set(filtered.map((d) => d.level3_name).filter(Boolean))].sort()
    return uniqueValues.map((v) => ({ value: v!, label: v! }))
  }, [drilldownData, level1Filter, level2Filter])

  // Level 4 options - filtered by level1, level2, and level3 selection
  const level4Options = useMemo(() => {
    let filtered = drilldownData
    if (level1Filter) {
      filtered = filtered.filter((d) => d.level1_name === level1Filter)
    }
    if (level2Filter) {
      filtered = filtered.filter((d) => d.level2_name === level2Filter)
    }
    if (level3Filter) {
      filtered = filtered.filter((d) => d.level3_name === level3Filter)
    }
    const uniqueValues = [...new Set(filtered.map((d) => d.level4_name).filter(Boolean))].sort()
    return uniqueValues.map((v) => ({ value: v!, label: v! }))
  }, [drilldownData, level1Filter, level2Filter, level3Filter])

  // Handle level filter changes - clear downstream filters when parent changes
  const handleLevel1Change = (value: string) => {
    setLevel1Filter(value)
    setLevel2Filter('')
    setLevel3Filter('')
    setLevel4Filter('')
  }

  const handleLevel2Change = (value: string) => {
    setLevel2Filter(value)
    setLevel3Filter('')
    setLevel4Filter('')
  }

  const handleLevel3Change = (value: string) => {
    setLevel3Filter(value)
    setLevel4Filter('')
  }

  const handleLevel4Change = (value: string) => {
    setLevel4Filter(value)
  }

  // Check if any drilldown filters are active
  const hasDrilldownFilters = level1Filter || level2Filter || level3Filter || level4Filter

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

    // Filter by drilldown hierarchy if any level filter is active
    if (hasDrilldownFilters) {
      data = data.filter((ce) => filteredCECodes.has(ce.ce_id))
    }

    return data
  }, [costElements, stageFilter, showAll, hasDrilldownFilters, filteredCECodes])

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

  // Get drilldown details for selected element
  const selectedDrilldown = useMemo(() => {
    if (!selectedElement) return []
    return drilldownData
      .filter((d) => d.ce_code === selectedElement.ce_id)
      .filter((d) => d.cost_component === 'Total') // Only show Total rows to avoid duplicates
  }, [drilldownData, selectedElement])

  const clearAllFilters = () => {
    setSearchText('')
    setStageFilter('')
    setLevel1Filter('')
    setLevel2Filter('')
    setLevel3Filter('')
    setLevel4Filter('')
  }

  const hasAnyFilter = searchText || stageFilter || hasDrilldownFilters

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
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        {/* First row: Search, Stage, and Toggle */}
        <div className="flex flex-wrap items-center gap-4 mb-4">
          {/* Search Input */}
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <svg
                className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                type="text"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Search cost elements..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
              />
            </div>
          </div>

          {/* Stage Filter */}
          <div className="min-w-[130px]">
            <label className="block text-xs font-medium text-gray-500 mb-1">Stage</label>
            <select
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm bg-white"
            >
              <option value="">All</option>
              {stageOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <FilterToggle showAll={showAll} onChange={setShowAll} />
        </div>

        {/* Second row: Level filters (cascading) */}
        <div className="flex flex-wrap items-end gap-4">
          {/* Level 1 */}
          <div className="min-w-[180px] flex-1">
            <label className="block text-xs font-medium text-gray-500 mb-1">CE Level 1</label>
            <select
              value={level1Filter}
              onChange={(e) => handleLevel1Change(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm bg-white"
            >
              <option value="">All</option>
              {level1Options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Level 2 */}
          <div className="min-w-[180px] flex-1">
            <label className="block text-xs font-medium text-gray-500 mb-1">CE Level 2</label>
            <select
              value={level2Filter}
              onChange={(e) => handleLevel2Change(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm bg-white"
              disabled={level2Options.length === 0}
            >
              <option value="">All</option>
              {level2Options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Level 3 */}
          <div className="min-w-[180px] flex-1">
            <label className="block text-xs font-medium text-gray-500 mb-1">CE Level 3</label>
            <select
              value={level3Filter}
              onChange={(e) => handleLevel3Change(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm bg-white"
              disabled={level3Options.length === 0}
            >
              <option value="">All</option>
              {level3Options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Level 4 */}
          <div className="min-w-[180px] flex-1">
            <label className="block text-xs font-medium text-gray-500 mb-1">CE Level 4</label>
            <select
              value={level4Filter}
              onChange={(e) => handleLevel4Change(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm bg-white"
              disabled={level4Options.length === 0}
            >
              <option value="">All</option>
              {level4Options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Clear Filters Button */}
          {hasAnyFilter && (
            <button
              onClick={clearAllFilters}
              className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors whitespace-nowrap"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Data Grid */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <DataGrid
          rowData={filteredData}
          columnDefs={columnDefs}
          loading={loading}
          quickFilterText={searchText}
          onRowClick={setSelectedElement}
          height="calc(100vh - 400px)"
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

            {selectedDrilldown.length > 0 && (
              <DetailSection title="Cost Breakdown Hierarchy">
                <div className="space-y-2">
                  {selectedDrilldown.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-gray-50 rounded-lg text-sm"
                    >
                      <div className="flex flex-wrap gap-x-4 gap-y-1">
                        <span className="text-gray-700">
                          <span className="font-medium text-gray-500">L1:</span> {item.level1_name}
                        </span>
                        <span className="text-gray-700">
                          <span className="font-medium text-gray-500">L2:</span> {item.level2_name}
                        </span>
                        {item.level3_name && (
                          <span className="text-gray-700">
                            <span className="font-medium text-gray-500">L3:</span> {item.level3_name}
                          </span>
                        )}
                        {item.level4_name && (
                          <span className="text-gray-700">
                            <span className="font-medium text-gray-500">L4:</span> {item.level4_name}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </DetailSection>
            )}

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
