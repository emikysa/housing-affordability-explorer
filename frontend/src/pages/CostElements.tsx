import { useState, useMemo } from 'react'
import FilterToggle from '../components/FilterToggle'
import DetailPanel, { Backdrop, DetailItem, DetailSection } from '../components/DetailPanel'
import { BadgeRenderer } from '../components/DataGrid'
import { useCostElements, useStages, useCrosForCostElement, useCEDrilldown } from '../hooks/useData'
import type { CostElement, CEDrilldown } from '../types/database'

// Generate a letter suffix from an index (0=a, 1=b, ..., 25=z, 26=aa, etc.)
function indexToLetters(index: number): string {
  let result = ''
  let n = index
  do {
    result = String.fromCharCode(97 + (n % 26)) + result
    n = Math.floor(n / 26) - 1
  } while (n >= 0)
  return result
}

// Get base CE code (e.g., "B01" from "B01-Land")
function getBaseCode(ceCode: string): string {
  const match = ceCode.match(/^([A-Z]\d+)/)
  return match ? match[1] : ceCode.substring(0, 3)
}

// Generate hierarchical codes for all drilldown items for a specific CE
// Codes build on each other: B01 > B01a > B01a01 > B01a01a > B01a01a01
function generateHierarchyCodes(
  drilldownData: CEDrilldown[],
  ceCode: string
): Map<string, { code: string; displayName: string }> {
  const codeMap = new Map<string, { code: string; displayName: string }>()

  // Filter to this CE only
  const filtered = drilldownData.filter(d => d.ce_code === ceCode)
  if (filtered.length === 0) return codeMap

  const baseCode = getBaseCode(ceCode)

  // Build Level 1 codes: B01a, B01b, etc.
  const level1Names = [...new Set(filtered.map(d => d.level1_name))].sort()
  const level1Codes = new Map<string, string>()
  level1Names.forEach((name, idx) => {
    const code = `${baseCode}${indexToLetters(idx)}`
    level1Codes.set(name, code)
    codeMap.set(`L1:${name}`, { code, displayName: `${code}-${name}` })
  })

  // Build Level 2 codes: B01a01, B01a02, etc. (inherits from L1 code)
  level1Names.forEach(level1Name => {
    const level1Code = level1Codes.get(level1Name)!
    const level2Names = [...new Set(
      filtered
        .filter(d => d.level1_name === level1Name)
        .map(d => d.level2_name)
    )].sort()

    const level2Codes = new Map<string, string>()
    level2Names.forEach((name, idx) => {
      const code = `${level1Code}${String(idx + 1).padStart(2, '0')}`
      level2Codes.set(name, code)
      codeMap.set(`L2:${level1Name}:${name}`, { code, displayName: `${code}-${name}` })
    })

    // Build Level 3 codes: B01a01a, B01a01b, etc. (inherits from L2 code)
    level2Names.forEach(level2Name => {
      const level2Code = level2Codes.get(level2Name)!
      const level3Names = [...new Set(
        filtered
          .filter(d => d.level1_name === level1Name && d.level2_name === level2Name && d.level3_name)
          .map(d => d.level3_name!)
      )].sort()

      const level3Codes = new Map<string, string>()
      level3Names.forEach((name, idx) => {
        const code = `${level2Code}${indexToLetters(idx)}`
        level3Codes.set(name, code)
        codeMap.set(`L3:${level1Name}:${level2Name}:${name}`, { code, displayName: `${code}-${name}` })
      })

      // Build Level 4 codes: B01a01a01, B01a01a02, etc. (inherits from L3 code)
      level3Names.forEach(level3Name => {
        const level3Code = level3Codes.get(level3Name)!
        const level4Names = [...new Set(
          filtered
            .filter(d => d.level1_name === level1Name && d.level2_name === level2Name && d.level3_name === level3Name && d.level4_name)
            .map(d => d.level4_name!)
        )].sort()

        level4Names.forEach((name, idx) => {
          const code = `${level3Code}${String(idx + 1).padStart(2, '0')}`
          codeMap.set(`L4:${level1Name}:${level2Name}:${level3Name}:${name}`, { code, displayName: `${code}-${name}` })
        })
      })
    })
  })

  return codeMap
}

export default function CostElements() {
  const { data: costElements, loading } = useCostElements()
  const { data: stages } = useStages()
  const { data: drilldownData } = useCEDrilldown()
  const [stageFilter, setStageFilter] = useState('')
  const [showAll, setShowAll] = useState(false)
  const [selectedElement, setSelectedElement] = useState<CostElement | null>(null)

  // Selected CE for filtering hierarchy columns
  const [selectedCE, setSelectedCE] = useState<string | null>(null)
  // Selected hierarchy levels
  const [selectedLevel1, setSelectedLevel1] = useState<string | null>(null)
  const [selectedLevel2, setSelectedLevel2] = useState<string | null>(null)
  const [selectedLevel3, setSelectedLevel3] = useState<string | null>(null)
  const [selectedLevel4, setSelectedLevel4] = useState<string | null>(null)

  // Get CROs for selected cost element (detail panel)
  const { data: relatedCros } = useCrosForCostElement(selectedElement?.ce_id || null)

  // Filter drilldown to only 'Total' cost component to avoid duplicates
  const totalDrilldown = useMemo(() => {
    return drilldownData.filter((d) => d.cost_component === 'Total')
  }, [drilldownData])

  // Generate hierarchy codes - only when a CE is selected
  const hierarchyCodes = useMemo(() => {
    if (!selectedCE) return new Map<string, { code: string; displayName: string }>()
    return generateHierarchyCodes(totalDrilldown, selectedCE)
  }, [totalDrilldown, selectedCE])

  // Helper to get display name with code for Level 1
  const getLevel1Display = (name: string) => {
    const entry = hierarchyCodes.get(`L1:${name}`)
    return entry?.displayName || name
  }

  // Helper to find Level 2 display - needs to find parent L1 from drilldown data
  const getLevel2Display = (l2Name: string) => {
    if (!selectedCE) return l2Name
    // If L1 is selected, use it directly
    if (selectedLevel1) {
      const entry = hierarchyCodes.get(`L2:${selectedLevel1}:${l2Name}`)
      return entry?.displayName || l2Name
    }
    // Otherwise find the L1 parent from the data
    const record = totalDrilldown.find(d => d.ce_code === selectedCE && d.level2_name === l2Name)
    if (record) {
      const entry = hierarchyCodes.get(`L2:${record.level1_name}:${l2Name}`)
      return entry?.displayName || l2Name
    }
    return l2Name
  }

  // Helper to find Level 3 display - needs parent L1 and L2
  const getLevel3Display = (l3Name: string) => {
    if (!selectedCE) return l3Name
    // Find the record to get parent hierarchy
    const record = totalDrilldown.find(d =>
      d.ce_code === selectedCE &&
      d.level3_name === l3Name &&
      (!selectedLevel1 || d.level1_name === selectedLevel1) &&
      (!selectedLevel2 || d.level2_name === selectedLevel2)
    )
    if (record) {
      const entry = hierarchyCodes.get(`L3:${record.level1_name}:${record.level2_name}:${l3Name}`)
      return entry?.displayName || l3Name
    }
    return l3Name
  }

  // Helper to find Level 4 display - needs parent L1, L2, and L3
  const getLevel4Display = (l4Name: string) => {
    if (!selectedCE) return l4Name
    // Find the record to get parent hierarchy
    const record = totalDrilldown.find(d =>
      d.ce_code === selectedCE &&
      d.level4_name === l4Name &&
      (!selectedLevel1 || d.level1_name === selectedLevel1) &&
      (!selectedLevel2 || d.level2_name === selectedLevel2) &&
      (!selectedLevel3 || d.level3_name === selectedLevel3)
    )
    if (record && record.level3_name) {
      const entry = hierarchyCodes.get(`L4:${record.level1_name}:${record.level2_name}:${record.level3_name}:${l4Name}`)
      return entry?.displayName || l4Name
    }
    return l4Name
  }

  // Filter cost elements based on stage and showAll
  const filteredCostElements = useMemo(() => {
    let data = costElements

    if (!showAll) {
      data = data.filter((ce) => ce.estimate != null || ce.annual_estimate != null)
    }

    if (stageFilter) {
      data = data.filter((ce) => ce.stage_id === stageFilter)
    }

    return data.sort((a, b) => a.ce_id.localeCompare(b.ce_id))
  }, [costElements, stageFilter, showAll])

  // Get Level 1 items - REQUIRES a CE to be selected
  const level1Items = useMemo(() => {
    if (!selectedCE) return []
    const filtered = totalDrilldown.filter((d) => d.ce_code === selectedCE)
    const items = new Map<string, { name: string; count: number }>()
    filtered.forEach((d) => {
      if (!items.has(d.level1_name)) {
        items.set(d.level1_name, { name: d.level1_name, count: 0 })
      }
      items.get(d.level1_name)!.count++
    })
    return [...items.values()].sort((a, b) => a.name.localeCompare(b.name))
  }, [totalDrilldown, selectedCE])

  // Get Level 2 items - REQUIRES CE, filtered by Level 1 if selected
  const level2Items = useMemo(() => {
    if (!selectedCE) return []
    let filtered = totalDrilldown.filter((d) => d.ce_code === selectedCE)
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
  }, [totalDrilldown, selectedCE, selectedLevel1])

  // Get Level 3 items - REQUIRES CE, filtered by Level 1 and 2 if selected
  const level3Items = useMemo(() => {
    if (!selectedCE) return []
    let filtered = totalDrilldown.filter((d) => d.ce_code === selectedCE)
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
  }, [totalDrilldown, selectedCE, selectedLevel1, selectedLevel2])

  // Get Level 4 items - REQUIRES CE, filtered by Level 1, 2, and 3 if selected
  const level4Items = useMemo(() => {
    if (!selectedCE) return []
    let filtered = totalDrilldown.filter((d) => d.ce_code === selectedCE)
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
  }, [totalDrilldown, selectedCE, selectedLevel1, selectedLevel2, selectedLevel3])

  // Handle CE click - select CE and clear hierarchy selections
  const handleCEClick = (ceId: string) => {
    if (selectedCE === ceId) {
      setSelectedCE(null)
    } else {
      setSelectedCE(ceId)
    }
    // Clear downstream hierarchy selections
    setSelectedLevel1(null)
    setSelectedLevel2(null)
    setSelectedLevel3(null)
    setSelectedLevel4(null)
  }

  // Handle level selection - clear downstream selections
  const handleLevel1Click = (name: string) => {
    if (selectedLevel1 === name) {
      setSelectedLevel1(null)
    } else {
      setSelectedLevel1(name)
    }
    setSelectedLevel2(null)
    setSelectedLevel3(null)
    setSelectedLevel4(null)
  }

  const handleLevel2Click = (name: string) => {
    if (selectedLevel2 === name) {
      setSelectedLevel2(null)
    } else {
      setSelectedLevel2(name)
    }
    setSelectedLevel3(null)
    setSelectedLevel4(null)
  }

  const handleLevel3Click = (name: string) => {
    if (selectedLevel3 === name) {
      setSelectedLevel3(null)
    } else {
      setSelectedLevel3(name)
    }
    setSelectedLevel4(null)
  }

  const handleLevel4Click = (name: string) => {
    if (selectedLevel4 === name) {
      setSelectedLevel4(null)
    } else {
      setSelectedLevel4(name)
    }
  }

  const hasSelection = selectedCE || selectedLevel1 || selectedLevel2 || selectedLevel3 || selectedLevel4

  const clearAllSelections = () => {
    setSelectedCE(null)
    setSelectedLevel1(null)
    setSelectedLevel2(null)
    setSelectedLevel3(null)
    setSelectedLevel4(null)
  }

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

  // Get drilldown details for selected element (detail panel)
  const selectedDrilldown = useMemo(() => {
    if (!selectedElement) return []
    return totalDrilldown.filter((d) => d.ce_code === selectedElement.ce_id)
  }, [totalDrilldown, selectedElement])

  // Get total counts for columns
  const totalLevel1Count = useMemo(() => {
    const items = new Set(totalDrilldown.map((d) => d.level1_name))
    return items.size
  }, [totalDrilldown])

  const totalLevel2Count = useMemo(() => {
    const items = new Set(totalDrilldown.map((d) => d.level2_name))
    return items.size
  }, [totalDrilldown])

  const totalLevel3Count = useMemo(() => {
    const items = new Set(totalDrilldown.filter((d) => d.level3_name).map((d) => d.level3_name))
    return items.size
  }, [totalDrilldown])

  const totalLevel4Count = useMemo(() => {
    const items = new Set(totalDrilldown.filter((d) => d.level4_name).map((d) => d.level4_name))
    return items.size
  }, [totalDrilldown])

  // Get hierarchy codes for detail panel display
  const getDetailHierarchyCodes = useMemo(() => {
    if (!selectedElement) return new Map()
    return generateHierarchyCodes(totalDrilldown, selectedElement.ce_id)
  }, [totalDrilldown, selectedElement])

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cost Elements</h1>
          <p className="mt-1 text-gray-500">
            Click a Cost Element to see its hierarchy breakdown. Click again to clear.
          </p>
        </div>
        {/* Top Filters */}
        <div className="flex items-center gap-4">
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
      </div>

      {/* Selection indicator */}
      {hasSelection && (
        <div className="bg-gray-100 border border-gray-300 rounded-lg px-4 py-2 flex items-center justify-between">
          <span className="text-gray-800 text-sm">
            <span className="font-medium">Filtering by:</span>{' '}
            {selectedCE && <span className="font-mono bg-gray-200 px-1.5 py-0.5 rounded mr-2">{selectedCE}</span>}
            {selectedLevel1 && <span className="font-mono bg-gray-200 px-1.5 py-0.5 rounded mr-2">→ {getLevel1Display(selectedLevel1)}</span>}
            {selectedLevel2 && <span className="font-mono bg-gray-200 px-1.5 py-0.5 rounded mr-2">→ {getLevel2Display(selectedLevel2)}</span>}
            {selectedLevel3 && <span className="font-mono bg-gray-200 px-1.5 py-0.5 rounded mr-2">→ {getLevel3Display(selectedLevel3)}</span>}
            {selectedLevel4 && <span className="font-mono bg-gray-200 px-1.5 py-0.5 rounded">→ {getLevel4Display(selectedLevel4)}</span>}
          </span>
          <button
            onClick={clearAllSelections}
            className="text-gray-600 hover:text-gray-800 font-medium text-sm"
          >
            Clear
          </button>
        </div>
      )}

      {/* 5-Column Explorer Layout */}
      {loading ? (
        <div className="text-center py-8 text-gray-500">Loading data...</div>
      ) : (
        <div className="grid grid-cols-5 gap-3" style={{ height: 'calc(100vh - 240px)' }}>
          {/* Cost Elements Column */}
          <ExplorerColumn
            title="Cost Elements"
            count={filteredCostElements.length}
            totalCount={costElements.length}
          >
            {filteredCostElements.map((ce) => (
              <CECard
                key={ce.ce_id}
                ce={ce}
                isSelected={selectedCE === ce.ce_id}
                onClick={() => handleCEClick(ce.ce_id)}
                onDetailClick={() => setSelectedElement(ce)}
                formatCurrency={formatCurrency}
              />
            ))}
          </ExplorerColumn>

          {/* Level 1 Column */}
          <ExplorerColumn
            title="CE Level 1"
            count={level1Items.length}
            totalCount={totalLevel1Count}
          >
            {level1Items.length === 0 ? (
              <div className="text-xs text-gray-400 p-2 italic">
                Select a Cost Element
              </div>
            ) : (
              level1Items.map((item) => (
                <HierarchyCard
                  key={item.name}
                  name={item.name}
                  displayName={getLevel1Display(item.name)}
                  count={item.count}
                  isSelected={selectedLevel1 === item.name}
                  onClick={() => handleLevel1Click(item.name)}
                />
              ))
            )}
          </ExplorerColumn>

          {/* Level 2 Column */}
          <ExplorerColumn
            title="CE Level 2"
            count={level2Items.length}
            totalCount={totalLevel2Count}
          >
            {level2Items.length === 0 ? (
              <div className="text-xs text-gray-400 p-2 italic">
                {selectedCE ? 'No Level 2 items' : 'Select a Cost Element'}
              </div>
            ) : (
              level2Items.map((item) => (
                <HierarchyCard
                  key={item.name}
                  name={item.name}
                  displayName={getLevel2Display(item.name)}
                  count={item.count}
                  isSelected={selectedLevel2 === item.name}
                  onClick={() => handleLevel2Click(item.name)}
                />
              ))
            )}
          </ExplorerColumn>

          {/* Level 3 Column */}
          <ExplorerColumn
            title="CE Level 3"
            count={level3Items.length}
            totalCount={totalLevel3Count}
          >
            {level3Items.length === 0 ? (
              <div className="text-xs text-gray-400 p-2 italic">
                {selectedCE ? 'No Level 3 items' : 'Select a Cost Element'}
              </div>
            ) : (
              level3Items.map((item) => (
                <HierarchyCard
                  key={item.name}
                  name={item.name}
                  displayName={getLevel3Display(item.name)}
                  count={item.count}
                  isSelected={selectedLevel3 === item.name}
                  onClick={() => handleLevel3Click(item.name)}
                />
              ))
            )}
          </ExplorerColumn>

          {/* Level 4 Column */}
          <ExplorerColumn
            title="CE Level 4"
            count={level4Items.length}
            totalCount={totalLevel4Count}
          >
            {level4Items.length === 0 ? (
              <div className="text-xs text-gray-400 p-2 italic">
                {selectedCE ? 'No Level 4 items' : 'Select a Cost Element'}
              </div>
            ) : (
              level4Items.map((item) => (
                <HierarchyCard
                  key={item.name}
                  name={item.name}
                  displayName={getLevel4Display(item.name)}
                  count={item.count}
                  isSelected={selectedLevel4 === item.name}
                  onClick={() => handleLevel4Click(item.name)}
                />
              ))
            )}
          </ExplorerColumn>
        </div>
      )}

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
                  {selectedDrilldown.map((item, idx) => {
                    const l1Code = getDetailHierarchyCodes.get(`L1:${item.level1_name}`)
                    const l2Code = getDetailHierarchyCodes.get(`L2:${item.level1_name}:${item.level2_name}`)
                    const l3Code = item.level3_name ? getDetailHierarchyCodes.get(`L3:${item.level1_name}:${item.level2_name}:${item.level3_name}`) : null
                    const l4Code = item.level4_name && item.level3_name ? getDetailHierarchyCodes.get(`L4:${item.level1_name}:${item.level2_name}:${item.level3_name}:${item.level4_name}`) : null

                    return (
                      <div
                        key={idx}
                        className="p-3 bg-gray-50 rounded-lg text-sm"
                      >
                        <div className="flex flex-wrap gap-x-4 gap-y-1">
                          <span className="text-gray-700">
                            <span className="font-medium text-gray-500">L1:</span>{' '}
                            <span className="font-mono text-xs">{l1Code?.code}</span> {item.level1_name}
                          </span>
                          <span className="text-gray-700">
                            <span className="font-medium text-gray-500">L2:</span>{' '}
                            <span className="font-mono text-xs">{l2Code?.code}</span> {item.level2_name}
                          </span>
                          {item.level3_name && l3Code && (
                            <span className="text-gray-700">
                              <span className="font-medium text-gray-500">L3:</span>{' '}
                              <span className="font-mono text-xs">{l3Code.code}</span> {item.level3_name}
                            </span>
                          )}
                          {item.level4_name && l4Code && (
                            <span className="text-gray-700">
                              <span className="font-medium text-gray-500">L4:</span>{' '}
                              <span className="font-mono text-xs">{l4Code.code}</span> {item.level4_name}
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })}
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

// Explorer Column Component
interface ExplorerColumnProps {
  title: string
  count: number
  totalCount: number
  children: React.ReactNode
}

function ExplorerColumn({ title, count, totalCount, children }: ExplorerColumnProps) {
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

// CE Card Component
interface CECardProps {
  ce: CostElement
  isSelected: boolean
  onClick: () => void
  onDetailClick: () => void
  formatCurrency: (v: number | null) => string
}

function CECard({ ce, isSelected, onClick, onDetailClick, formatCurrency }: CECardProps) {
  return (
    <div
      className={`rounded p-2 cursor-pointer transition-all text-sm ${
        isSelected
          ? 'bg-primary-100 border-2 border-primary-500'
          : 'bg-white border border-gray-200 hover:border-gray-300'
      }`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-1">
        <div className="flex-1 min-w-0">
          <div className={`font-mono text-xs ${isSelected ? 'text-primary-700' : 'text-gray-500'}`}>
            {ce.ce_id}
          </div>
          <div className={`text-xs leading-tight line-clamp-2 ${isSelected ? 'text-primary-900' : 'text-gray-700'}`}>
            {ce.description}
          </div>
        </div>
        <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
          <span className={`text-xs font-medium ${isSelected ? 'text-primary-600' : 'text-gray-500'}`}>
            {formatCurrency(ce.estimate)}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onDetailClick()
            }}
            className={`text-xs hover:underline ${isSelected ? 'text-primary-600' : 'text-gray-400'}`}
          >
            Details
          </button>
        </div>
      </div>
    </div>
  )
}

// Hierarchy Card Component
interface HierarchyCardProps {
  name: string
  displayName: string
  count: number
  isSelected: boolean
  onClick: () => void
}

function HierarchyCard({ displayName, count, isSelected, onClick }: HierarchyCardProps) {
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
        <span className="truncate">{displayName}</span>
        <span className={`text-xs flex-shrink-0 ${isSelected ? 'text-primary-600' : 'text-gray-400'}`}>
          ({count})
        </span>
      </div>
    </div>
  )
}
