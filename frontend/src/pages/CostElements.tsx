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

  // Multi-select state for each column (using Set for efficient lookups)
  const [selectedCEs, setSelectedCEs] = useState<Set<string>>(new Set())
  const [selectedLevel1s, setSelectedLevel1s] = useState<Set<string>>(new Set())
  const [selectedLevel2s, setSelectedLevel2s] = useState<Set<string>>(new Set())
  const [selectedLevel3s, setSelectedLevel3s] = useState<Set<string>>(new Set())
  const [selectedLevel4s, setSelectedLevel4s] = useState<Set<string>>(new Set())

  // Get CROs for selected cost element (detail panel)
  const { data: relatedCros } = useCrosForCostElement(selectedElement?.ce_id || null)

  // Filter drilldown to only 'Total' cost component to avoid duplicates
  const totalDrilldown = useMemo(() => {
    return drilldownData.filter((d) => d.cost_component === 'Total')
  }, [drilldownData])

  // Generate hierarchy codes for all selected CEs
  const hierarchyCodes = useMemo(() => {
    if (selectedCEs.size === 0) return new Map<string, { code: string; displayName: string }>()
    const combined = new Map<string, { code: string; displayName: string }>()
    selectedCEs.forEach(ceCode => {
      const codes = generateHierarchyCodes(totalDrilldown, ceCode)
      codes.forEach((value, key) => combined.set(`${ceCode}:${key}`, value))
    })
    return combined
  }, [totalDrilldown, selectedCEs])

  // Helper to get display name with code for Level 1
  // With multi-select, find the first matching CE that has this L1 item
  const getLevel1Display = (name: string) => {
    for (const ceCode of selectedCEs) {
      const entry = hierarchyCodes.get(`${ceCode}:L1:${name}`)
      if (entry) return entry.displayName
    }
    return name
  }

  // Helper to find Level 2 display
  const getLevel2Display = (l2Name: string) => {
    if (selectedCEs.size === 0) return l2Name
    // Find the record to get parent hierarchy
    const record = totalDrilldown.find(d =>
      selectedCEs.has(d.ce_code) &&
      d.level2_name === l2Name &&
      (selectedLevel1s.size === 0 || selectedLevel1s.has(d.level1_name))
    )
    if (record) {
      const entry = hierarchyCodes.get(`${record.ce_code}:L2:${record.level1_name}:${l2Name}`)
      return entry?.displayName || l2Name
    }
    return l2Name
  }

  // Helper to find Level 3 display
  const getLevel3Display = (l3Name: string) => {
    if (selectedCEs.size === 0) return l3Name
    const record = totalDrilldown.find(d =>
      selectedCEs.has(d.ce_code) &&
      d.level3_name === l3Name &&
      (selectedLevel1s.size === 0 || selectedLevel1s.has(d.level1_name)) &&
      (selectedLevel2s.size === 0 || selectedLevel2s.has(d.level2_name))
    )
    if (record) {
      const entry = hierarchyCodes.get(`${record.ce_code}:L3:${record.level1_name}:${record.level2_name}:${l3Name}`)
      return entry?.displayName || l3Name
    }
    return l3Name
  }

  // Helper to find Level 4 display
  const getLevel4Display = (l4Name: string) => {
    if (selectedCEs.size === 0) return l4Name
    const record = totalDrilldown.find(d =>
      selectedCEs.has(d.ce_code) &&
      d.level4_name === l4Name &&
      (selectedLevel1s.size === 0 || selectedLevel1s.has(d.level1_name)) &&
      (selectedLevel2s.size === 0 || selectedLevel2s.has(d.level2_name)) &&
      (selectedLevel3s.size === 0 || (d.level3_name && selectedLevel3s.has(d.level3_name)))
    )
    if (record && record.level3_name) {
      const entry = hierarchyCodes.get(`${record.ce_code}:L4:${record.level1_name}:${record.level2_name}:${record.level3_name}:${l4Name}`)
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

  // Get Level 1 items - REQUIRES at least one CE to be selected
  const level1Items = useMemo(() => {
    if (selectedCEs.size === 0) return []
    const filtered = totalDrilldown.filter((d) => selectedCEs.has(d.ce_code))
    const items = new Map<string, { name: string; count: number }>()
    filtered.forEach((d) => {
      if (!items.has(d.level1_name)) {
        items.set(d.level1_name, { name: d.level1_name, count: 0 })
      }
      items.get(d.level1_name)!.count++
    })
    return [...items.values()].sort((a, b) => a.name.localeCompare(b.name))
  }, [totalDrilldown, selectedCEs])

  // Get Level 2 items - REQUIRES CE, filtered by Level 1 selections
  const level2Items = useMemo(() => {
    if (selectedCEs.size === 0) return []
    let filtered = totalDrilldown.filter((d) => selectedCEs.has(d.ce_code))
    if (selectedLevel1s.size > 0) {
      filtered = filtered.filter((d) => selectedLevel1s.has(d.level1_name))
    }
    const items = new Map<string, { name: string; count: number }>()
    filtered.forEach((d) => {
      if (!items.has(d.level2_name)) {
        items.set(d.level2_name, { name: d.level2_name, count: 0 })
      }
      items.get(d.level2_name)!.count++
    })
    return [...items.values()].sort((a, b) => a.name.localeCompare(b.name))
  }, [totalDrilldown, selectedCEs, selectedLevel1s])

  // Get Level 3 items - REQUIRES CE, filtered by Level 1 and 2 selections
  const level3Items = useMemo(() => {
    if (selectedCEs.size === 0) return []
    let filtered = totalDrilldown.filter((d) => selectedCEs.has(d.ce_code))
    if (selectedLevel1s.size > 0) {
      filtered = filtered.filter((d) => selectedLevel1s.has(d.level1_name))
    }
    if (selectedLevel2s.size > 0) {
      filtered = filtered.filter((d) => selectedLevel2s.has(d.level2_name))
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
  }, [totalDrilldown, selectedCEs, selectedLevel1s, selectedLevel2s])

  // Get Level 4 items - REQUIRES CE, filtered by Level 1, 2, and 3 selections
  const level4Items = useMemo(() => {
    if (selectedCEs.size === 0) return []
    let filtered = totalDrilldown.filter((d) => selectedCEs.has(d.ce_code))
    if (selectedLevel1s.size > 0) {
      filtered = filtered.filter((d) => selectedLevel1s.has(d.level1_name))
    }
    if (selectedLevel2s.size > 0) {
      filtered = filtered.filter((d) => selectedLevel2s.has(d.level2_name))
    }
    if (selectedLevel3s.size > 0) {
      filtered = filtered.filter((d) => d.level3_name && selectedLevel3s.has(d.level3_name))
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
  }, [totalDrilldown, selectedCEs, selectedLevel1s, selectedLevel2s, selectedLevel3s])

  // Toggle selection helper for multi-select
  const toggleSetItem = <T,>(set: Set<T>, item: T, setter: (s: Set<T>) => void) => {
    const newSet = new Set(set)
    if (newSet.has(item)) {
      newSet.delete(item)
    } else {
      newSet.add(item)
    }
    setter(newSet)
  }

  // Handle CE click - toggle selection, clear downstream if removing last CE
  const handleCEClick = (ceId: string) => {
    const newSet = new Set(selectedCEs)
    if (newSet.has(ceId)) {
      newSet.delete(ceId)
    } else {
      newSet.add(ceId)
    }
    setSelectedCEs(newSet)
    // If no CEs selected, clear all downstream
    if (newSet.size === 0) {
      setSelectedLevel1s(new Set())
      setSelectedLevel2s(new Set())
      setSelectedLevel3s(new Set())
      setSelectedLevel4s(new Set())
    }
  }

  // Handle level selection - toggle item
  const handleLevel1Click = (name: string) => {
    toggleSetItem(selectedLevel1s, name, setSelectedLevel1s)
  }

  const handleLevel2Click = (name: string) => {
    toggleSetItem(selectedLevel2s, name, setSelectedLevel2s)
  }

  const handleLevel3Click = (name: string) => {
    toggleSetItem(selectedLevel3s, name, setSelectedLevel3s)
  }

  const handleLevel4Click = (name: string) => {
    toggleSetItem(selectedLevel4s, name, setSelectedLevel4s)
  }

  const hasSelection = selectedCEs.size > 0 || selectedLevel1s.size > 0 || selectedLevel2s.size > 0 || selectedLevel3s.size > 0 || selectedLevel4s.size > 0

  const clearAllSelections = () => {
    setSelectedCEs(new Set())
    setSelectedLevel1s(new Set())
    setSelectedLevel2s(new Set())
    setSelectedLevel3s(new Set())
    setSelectedLevel4s(new Set())
  }

  // Select all / Deselect all handlers
  const selectAllCEs = () => {
    setSelectedCEs(new Set(filteredCostElements.map(ce => ce.ce_id)))
  }
  const deselectAllCEs = () => {
    setSelectedCEs(new Set())
    setSelectedLevel1s(new Set())
    setSelectedLevel2s(new Set())
    setSelectedLevel3s(new Set())
    setSelectedLevel4s(new Set())
  }

  const selectAllLevel1 = () => {
    setSelectedLevel1s(new Set(level1Items.map(item => item.name)))
  }
  const deselectAllLevel1 = () => {
    setSelectedLevel1s(new Set())
  }

  const selectAllLevel2 = () => {
    setSelectedLevel2s(new Set(level2Items.map(item => item.name)))
  }
  const deselectAllLevel2 = () => {
    setSelectedLevel2s(new Set())
  }

  const selectAllLevel3 = () => {
    setSelectedLevel3s(new Set(level3Items.map(item => item.name)))
  }
  const deselectAllLevel3 = () => {
    setSelectedLevel3s(new Set())
  }

  const selectAllLevel4 = () => {
    setSelectedLevel4s(new Set(level4Items.map(item => item.name)))
  }
  const deselectAllLevel4 = () => {
    setSelectedLevel4s(new Set())
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
            Click items to select/deselect. Use "Select all" / "Deselect all" in column headers.
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
          <span className="text-gray-800 text-sm flex flex-wrap items-center gap-1">
            <span className="font-medium">Selected:</span>
            {selectedCEs.size > 0 && (
              <span className="font-mono bg-gray-200 px-1.5 py-0.5 rounded text-xs">
                {selectedCEs.size} L1
              </span>
            )}
            {selectedLevel1s.size > 0 && (
              <span className="font-mono bg-gray-200 px-1.5 py-0.5 rounded text-xs">
                → {selectedLevel1s.size} L2
              </span>
            )}
            {selectedLevel2s.size > 0 && (
              <span className="font-mono bg-gray-200 px-1.5 py-0.5 rounded text-xs">
                → {selectedLevel2s.size} L3
              </span>
            )}
            {selectedLevel3s.size > 0 && (
              <span className="font-mono bg-gray-200 px-1.5 py-0.5 rounded text-xs">
                → {selectedLevel3s.size} L4
              </span>
            )}
            {selectedLevel4s.size > 0 && (
              <span className="font-mono bg-gray-200 px-1.5 py-0.5 rounded text-xs">
                → {selectedLevel4s.size} L5
              </span>
            )}
          </span>
          <button
            onClick={clearAllSelections}
            className="text-gray-600 hover:text-gray-800 font-medium text-sm"
          >
            Clear all
          </button>
        </div>
      )}

      {/* 5-Column Explorer Layout */}
      {loading ? (
        <div className="text-center py-8 text-gray-500">Loading data...</div>
      ) : (
        <div className="grid grid-cols-5 gap-3" style={{ height: 'calc(100vh - 240px)' }}>
          {/* Level 1 Column (top-level Cost Elements) */}
          <ExplorerColumn
            title="CE Level 1"
            count={filteredCostElements.length}
            totalCount={costElements.length}
            hasItems={filteredCostElements.length > 0}
            hasSelection={selectedCEs.size > 0}
            onSelectAll={selectAllCEs}
            onDeselectAll={deselectAllCEs}
          >
            {filteredCostElements.map((ce) => (
              <CECard
                key={ce.ce_id}
                ce={ce}
                isSelected={selectedCEs.has(ce.ce_id)}
                onClick={() => handleCEClick(ce.ce_id)}
                onDetailClick={() => setSelectedElement(ce)}
                formatCurrency={formatCurrency}
              />
            ))}
          </ExplorerColumn>

          {/* Level 2 Column */}
          <ExplorerColumn
            title="CE Level 2"
            count={level1Items.length}
            totalCount={totalLevel1Count}
            hasItems={level1Items.length > 0}
            hasSelection={selectedLevel1s.size > 0}
            onSelectAll={selectAllLevel1}
            onDeselectAll={deselectAllLevel1}
          >
            {level1Items.length === 0 ? (
              <div className="text-xs text-gray-400 p-2 italic">
                Select a Level 1 item
              </div>
            ) : (
              level1Items.map((item) => (
                <HierarchyCard
                  key={item.name}
                  name={item.name}
                  displayName={getLevel1Display(item.name)}
                  count={item.count}
                  isSelected={selectedLevel1s.has(item.name)}
                  onClick={() => handleLevel1Click(item.name)}
                />
              ))
            )}
          </ExplorerColumn>

          {/* Level 3 Column */}
          <ExplorerColumn
            title="CE Level 3"
            count={level2Items.length}
            totalCount={totalLevel2Count}
            hasItems={level2Items.length > 0}
            hasSelection={selectedLevel2s.size > 0}
            onSelectAll={selectAllLevel2}
            onDeselectAll={deselectAllLevel2}
          >
            {level2Items.length === 0 ? (
              <div className="text-xs text-gray-400 p-2 italic">
                {selectedCEs.size > 0 ? 'No Level 3 items' : 'Select a Level 1 item'}
              </div>
            ) : (
              level2Items.map((item) => (
                <HierarchyCard
                  key={item.name}
                  name={item.name}
                  displayName={getLevel2Display(item.name)}
                  count={item.count}
                  isSelected={selectedLevel2s.has(item.name)}
                  onClick={() => handleLevel2Click(item.name)}
                />
              ))
            )}
          </ExplorerColumn>

          {/* Level 4 Column */}
          <ExplorerColumn
            title="CE Level 4"
            count={level3Items.length}
            totalCount={totalLevel3Count}
            hasItems={level3Items.length > 0}
            hasSelection={selectedLevel3s.size > 0}
            onSelectAll={selectAllLevel3}
            onDeselectAll={deselectAllLevel3}
          >
            {level3Items.length === 0 ? (
              <div className="text-xs text-gray-400 p-2 italic">
                {selectedCEs.size > 0 ? 'No Level 4 items' : 'Select a Level 1 item'}
              </div>
            ) : (
              level3Items.map((item) => (
                <HierarchyCard
                  key={item.name}
                  name={item.name}
                  displayName={getLevel3Display(item.name)}
                  count={item.count}
                  isSelected={selectedLevel3s.has(item.name)}
                  onClick={() => handleLevel3Click(item.name)}
                />
              ))
            )}
          </ExplorerColumn>

          {/* Level 5 Column */}
          <ExplorerColumn
            title="CE Level 5"
            count={level4Items.length}
            totalCount={totalLevel4Count}
            hasItems={level4Items.length > 0}
            hasSelection={selectedLevel4s.size > 0}
            onSelectAll={selectAllLevel4}
            onDeselectAll={deselectAllLevel4}
          >
            {level4Items.length === 0 ? (
              <div className="text-xs text-gray-400 p-2 italic">
                {selectedCEs.size > 0 ? 'No Level 5 items' : 'Select a Level 1 item'}
              </div>
            ) : (
              level4Items.map((item) => (
                <HierarchyCard
                  key={item.name}
                  name={item.name}
                  displayName={getLevel4Display(item.name)}
                  count={item.count}
                  isSelected={selectedLevel4s.has(item.name)}
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
                            <span className="font-medium text-gray-500">L2:</span>{' '}
                            <span className="font-mono text-xs">{l1Code?.code}</span> {item.level1_name}
                          </span>
                          <span className="text-gray-700">
                            <span className="font-medium text-gray-500">L3:</span>{' '}
                            <span className="font-mono text-xs">{l2Code?.code}</span> {item.level2_name}
                          </span>
                          {item.level3_name && l3Code && (
                            <span className="text-gray-700">
                              <span className="font-medium text-gray-500">L4:</span>{' '}
                              <span className="font-mono text-xs">{l3Code.code}</span> {item.level3_name}
                            </span>
                          )}
                          {item.level4_name && l4Code && (
                            <span className="text-gray-700">
                              <span className="font-medium text-gray-500">L5:</span>{' '}
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
  hasItems?: boolean
  hasSelection?: boolean
  onSelectAll?: () => void
  onDeselectAll?: () => void
}

function ExplorerColumn({
  title,
  count,
  totalCount,
  children,
  hasItems = false,
  hasSelection = false,
  onSelectAll,
  onDeselectAll,
}: ExplorerColumnProps) {
  return (
    <div className="rounded-lg flex flex-col overflow-hidden bg-gray-50 border border-gray-200">
      <div className="px-3 py-2 bg-gray-100 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm text-gray-700">{title}</h3>
          <span className="text-xs font-medium text-gray-500">
            {count === totalCount ? count : `${count} / ${totalCount}`}
          </span>
        </div>
        {/* Select All / Deselect All buttons */}
        {hasItems && (onSelectAll || onDeselectAll) && (
          <div className="flex gap-2 mt-1">
            {onSelectAll && !hasSelection && (
              <button
                onClick={onSelectAll}
                className="text-xs text-primary-600 hover:text-primary-800 hover:underline"
              >
                Select all
              </button>
            )}
            {onDeselectAll && hasSelection && (
              <button
                onClick={onDeselectAll}
                className="text-xs text-gray-500 hover:text-gray-700 hover:underline"
              >
                Deselect all
              </button>
            )}
          </div>
        )}
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
