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

  // Explorer-style level selections
  const [selectedLevel1, setSelectedLevel1] = useState<string | null>(null)
  const [selectedLevel2, setSelectedLevel2] = useState<string | null>(null)
  const [selectedLevel3, setSelectedLevel3] = useState<string | null>(null)
  const [selectedLevel4, setSelectedLevel4] = useState<string | null>(null)

  // Get CROs for selected cost element
  const { data: relatedCros } = useCrosForCostElement(selectedElement?.ce_id || null)

  // Filter drilldown to only 'Total' cost component to avoid duplicates
  const totalDrilldown = useMemo(() => {
    return drilldownData.filter((d) => d.cost_component === 'Total')
  }, [drilldownData])

  // Get unique Level 1 items
  const level1Items = useMemo(() => {
    const items = new Map<string, { name: string; count: number }>()
    totalDrilldown.forEach((d) => {
      if (!items.has(d.level1_name)) {
        items.set(d.level1_name, { name: d.level1_name, count: 0 })
      }
      items.get(d.level1_name)!.count++
    })
    return [...items.values()].sort((a, b) => a.name.localeCompare(b.name))
  }, [totalDrilldown])

  // Get Level 2 items - filtered by Level 1 selection
  const level2Items = useMemo(() => {
    let filtered = totalDrilldown
    if (selectedLevel1) {
      filtered = filtered.filter((d) => d.level1_name === selectedLevel1)
    }
    const items = new Map<string, { name: string; count: number }>()
    filtered.forEach((d) => {
      if (!items.has(d.level2_name)) {
        items.set(d.level2_name, { name: d.level2_name, count: 0 })
      }
      items.get(d.level2_name)!.count++
    })
    return [...items.values()].sort((a, b) => a.name.localeCompare(b.name))
  }, [totalDrilldown, selectedLevel1])

  // Get Level 3 items - filtered by Level 1 and Level 2 selections
  const level3Items = useMemo(() => {
    let filtered = totalDrilldown
    if (selectedLevel1) {
      filtered = filtered.filter((d) => d.level1_name === selectedLevel1)
    }
    if (selectedLevel2) {
      filtered = filtered.filter((d) => d.level2_name === selectedLevel2)
    }
    const items = new Map<string, { name: string; count: number }>()
    filtered.forEach((d) => {
      if (d.level3_name) {
        if (!items.has(d.level3_name)) {
          items.set(d.level3_name, { name: d.level3_name, count: 0 })
        }
        items.get(d.level3_name)!.count++
      }
    })
    return [...items.values()].sort((a, b) => a.name.localeCompare(b.name))
  }, [totalDrilldown, selectedLevel1, selectedLevel2])

  // Get Level 4 items - filtered by Level 1, 2, and 3 selections
  const level4Items = useMemo(() => {
    let filtered = totalDrilldown
    if (selectedLevel1) {
      filtered = filtered.filter((d) => d.level1_name === selectedLevel1)
    }
    if (selectedLevel2) {
      filtered = filtered.filter((d) => d.level2_name === selectedLevel2)
    }
    if (selectedLevel3) {
      filtered = filtered.filter((d) => d.level3_name === selectedLevel3)
    }
    const items = new Map<string, { name: string; count: number }>()
    filtered.forEach((d) => {
      if (d.level4_name) {
        if (!items.has(d.level4_name)) {
          items.set(d.level4_name, { name: d.level4_name, count: 0 })
        }
        items.get(d.level4_name)!.count++
      }
    })
    return [...items.values()].sort((a, b) => a.name.localeCompare(b.name))
  }, [totalDrilldown, selectedLevel1, selectedLevel2, selectedLevel3])

  // Get CE codes that match current hierarchy selection
  const filteredCECodes = useMemo(() => {
    let filtered = totalDrilldown

    if (selectedLevel1) {
      filtered = filtered.filter((d) => d.level1_name === selectedLevel1)
    }
    if (selectedLevel2) {
      filtered = filtered.filter((d) => d.level2_name === selectedLevel2)
    }
    if (selectedLevel3) {
      filtered = filtered.filter((d) => d.level3_name === selectedLevel3)
    }
    if (selectedLevel4) {
      filtered = filtered.filter((d) => d.level4_name === selectedLevel4)
    }

    return new Set(filtered.map((d) => d.ce_code))
  }, [totalDrilldown, selectedLevel1, selectedLevel2, selectedLevel3, selectedLevel4])

  // Handle level selection - clear downstream selections
  const handleLevel1Click = (name: string) => {
    if (selectedLevel1 === name) {
      setSelectedLevel1(null)
      setSelectedLevel2(null)
      setSelectedLevel3(null)
      setSelectedLevel4(null)
    } else {
      setSelectedLevel1(name)
      setSelectedLevel2(null)
      setSelectedLevel3(null)
      setSelectedLevel4(null)
    }
  }

  const handleLevel2Click = (name: string) => {
    if (selectedLevel2 === name) {
      setSelectedLevel2(null)
      setSelectedLevel3(null)
      setSelectedLevel4(null)
    } else {
      setSelectedLevel2(name)
      setSelectedLevel3(null)
      setSelectedLevel4(null)
    }
  }

  const handleLevel3Click = (name: string) => {
    if (selectedLevel3 === name) {
      setSelectedLevel3(null)
      setSelectedLevel4(null)
    } else {
      setSelectedLevel3(name)
      setSelectedLevel4(null)
    }
  }

  const handleLevel4Click = (name: string) => {
    if (selectedLevel4 === name) {
      setSelectedLevel4(null)
    } else {
      setSelectedLevel4(name)
    }
  }

  const hasHierarchySelection = selectedLevel1 || selectedLevel2 || selectedLevel3 || selectedLevel4

  const clearHierarchySelection = () => {
    setSelectedLevel1(null)
    setSelectedLevel2(null)
    setSelectedLevel3(null)
    setSelectedLevel4(null)
  }

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

    // Filter by hierarchy selection if any level is selected
    if (hasHierarchySelection) {
      data = data.filter((ce) => filteredCECodes.has(ce.ce_id))
    }

    return data
  }, [costElements, stageFilter, showAll, hasHierarchySelection, filteredCECodes])

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
    return totalDrilldown.filter((d) => d.ce_code === selectedElement.ce_id)
  }, [totalDrilldown, selectedElement])

  const clearAllFilters = () => {
    setSearchText('')
    setStageFilter('')
    clearHierarchySelection()
  }

  const hasAnyFilter = searchText || stageFilter || hasHierarchySelection

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Cost Elements</h1>
        <p className="mt-1 text-gray-500">
          Click items in the hierarchy columns to filter. Click again to clear.
        </p>
      </div>

      {/* Top Filters Row: Search, Stage, Toggle */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex flex-wrap items-center gap-4">
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

      {/* Selection indicator */}
      {hasHierarchySelection && (
        <div className="bg-gray-100 border border-gray-300 rounded-lg px-4 py-2 flex items-center justify-between">
          <span className="text-gray-800 text-sm">
            <span className="font-medium">Filtering by:</span>{' '}
            {selectedLevel1 && <span className="font-mono bg-gray-200 px-1.5 py-0.5 rounded mr-2">{selectedLevel1}</span>}
            {selectedLevel2 && <span className="font-mono bg-gray-200 px-1.5 py-0.5 rounded mr-2">→ {selectedLevel2}</span>}
            {selectedLevel3 && <span className="font-mono bg-gray-200 px-1.5 py-0.5 rounded mr-2">→ {selectedLevel3}</span>}
            {selectedLevel4 && <span className="font-mono bg-gray-200 px-1.5 py-0.5 rounded">→ {selectedLevel4}</span>}
          </span>
          <button
            onClick={clearHierarchySelection}
            className="text-gray-600 hover:text-gray-800 font-medium text-sm"
          >
            Clear
          </button>
        </div>
      )}

      {/* 4-Column Hierarchy Explorer */}
      <div className="grid grid-cols-4 gap-3" style={{ height: '280px' }}>
        {/* Level 1 Column */}
        <HierarchyColumn
          title="CE Level 1"
          count={level1Items.length}
          totalCount={level1Items.length}
        >
          {level1Items.map((item) => (
            <HierarchyCard
              key={item.name}
              name={item.name}
              count={item.count}
              isSelected={selectedLevel1 === item.name}
              onClick={() => handleLevel1Click(item.name)}
            />
          ))}
        </HierarchyColumn>

        {/* Level 2 Column */}
        <HierarchyColumn
          title="CE Level 2"
          count={level2Items.length}
          totalCount={level2Items.length}
        >
          {level2Items.map((item) => (
            <HierarchyCard
              key={item.name}
              name={item.name}
              count={item.count}
              isSelected={selectedLevel2 === item.name}
              onClick={() => handleLevel2Click(item.name)}
            />
          ))}
        </HierarchyColumn>

        {/* Level 3 Column */}
        <HierarchyColumn
          title="CE Level 3"
          count={level3Items.length}
          totalCount={level3Items.length}
        >
          {level3Items.length === 0 ? (
            <div className="text-xs text-gray-400 p-2 italic">
              {selectedLevel1 || selectedLevel2 ? 'No Level 3 items' : 'Select Level 1 or 2'}
            </div>
          ) : (
            level3Items.map((item) => (
              <HierarchyCard
                key={item.name}
                name={item.name}
                count={item.count}
                isSelected={selectedLevel3 === item.name}
                onClick={() => handleLevel3Click(item.name)}
              />
            ))
          )}
        </HierarchyColumn>

        {/* Level 4 Column */}
        <HierarchyColumn
          title="CE Level 4"
          count={level4Items.length}
          totalCount={level4Items.length}
        >
          {level4Items.length === 0 ? (
            <div className="text-xs text-gray-400 p-2 italic">
              {selectedLevel1 || selectedLevel2 || selectedLevel3 ? 'No Level 4 items' : 'Select Level 1, 2, or 3'}
            </div>
          ) : (
            level4Items.map((item) => (
              <HierarchyCard
                key={item.name}
                name={item.name}
                count={item.count}
                isSelected={selectedLevel4 === item.name}
                onClick={() => handleLevel4Click(item.name)}
              />
            ))
          )}
        </HierarchyColumn>
      </div>

      {/* Data Grid */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <DataGrid
          rowData={filteredData}
          columnDefs={columnDefs}
          loading={loading}
          quickFilterText={searchText}
          onRowClick={setSelectedElement}
          height="calc(100vh - 620px)"
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

// Hierarchy Column Component
interface HierarchyColumnProps {
  title: string
  count: number
  totalCount: number
  children: React.ReactNode
}

function HierarchyColumn({ title, count, totalCount, children }: HierarchyColumnProps) {
  return (
    <div className="rounded-lg flex flex-col overflow-hidden bg-gray-50 border border-gray-200">
      <div className="px-3 py-2 bg-gray-100 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm text-gray-700">{title}</h3>
          <span className="text-xs font-medium text-gray-500">
            {count === totalCount ? count : `${count} / ${totalCount}`}
          </span>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1">{children}</div>
    </div>
  )
}

// Hierarchy Card Component
interface HierarchyCardProps {
  name: string
  count: number
  isSelected: boolean
  onClick: () => void
}

function HierarchyCard({ name, count, isSelected, onClick }: HierarchyCardProps) {
  return (
    <div
      className={`rounded p-2 cursor-pointer transition-all text-sm ${
        isSelected
          ? 'bg-primary-100 border-2 border-primary-500 text-primary-900'
          : 'bg-white border border-gray-200 hover:border-gray-300 text-gray-700'
      }`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="truncate">{name}</span>
        <span className={`text-xs flex-shrink-0 ${isSelected ? 'text-primary-600' : 'text-gray-400'}`}>
          ({count})
        </span>
      </div>
    </div>
  )
}
