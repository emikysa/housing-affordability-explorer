import { useState, useMemo } from 'react'
import type { ColDef } from 'ag-grid-community'
import DataGrid, { BadgeRenderer } from '../components/DataGrid'
import FilterBar from '../components/FilterBar'
import DetailPanel, { Backdrop, DetailItem, DetailSection } from '../components/DetailPanel'
import { useLevers, useLeverTypes, useBarriersForLever } from '../hooks/useData'
import type { Lever } from '../types/database'

export default function Levers() {
  const { data: levers, loading } = useLevers()
  const { data: leverTypes } = useLeverTypes()
  const [searchText, setSearchText] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [selectedLever, setSelectedLever] = useState<Lever | null>(null)

  // Get barriers for selected lever
  const { data: relatedBarriers } = useBarriersForLever(selectedLever?.lever_id || null)

  const columnDefs = useMemo<ColDef<Lever>[]>(
    () => [
      {
        field: 'lever_id',
        headerName: 'ID',
        width: 220,
        pinned: 'left',
      },
      {
        field: 'name',
        headerName: 'Name',
        flex: 1,
        minWidth: 200,
      },
      {
        field: 'lever_type_id',
        headerName: 'Type',
        width: 180,
        cellRenderer: (params: { value: string }) => <BadgeRenderer value={params.value} />,
      },
      {
        field: 'barrier_count',
        headerName: 'Barriers',
        width: 100,
        type: 'numericColumn',
        cellStyle: { fontWeight: 'bold' },
      },
      {
        field: 'typical_timeline',
        headerName: 'Timeline',
        width: 120,
      },
      {
        field: 'description',
        headerName: 'Description',
        flex: 1,
        minWidth: 200,
      },
    ],
    []
  )

  // Filter data
  const filteredData = useMemo(() => {
    let data = levers

    if (typeFilter) {
      data = data.filter((l) => l.lever_type_id === typeFilter)
    }

    if (searchText) {
      const search = searchText.toLowerCase()
      data = data.filter(
        (l) =>
          l.lever_id.toLowerCase().includes(search) ||
          l.name.toLowerCase().includes(search) ||
          (l.description && l.description.toLowerCase().includes(search))
      )
    }

    return data
  }, [levers, typeFilter, searchText])

  const typeOptions = useMemo(
    () =>
      leverTypes.map((lt) => ({
        value: lt.lever_id,
        label: lt.lever_id,
      })),
    [leverTypes]
  )

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Levers</h1>
          <p className="mt-1 text-gray-500">
            Policy levers and interventions that can address housing affordability barriers
          </p>
        </div>
      </div>

      {/* Filters */}
      <FilterBar
        searchValue={searchText}
        onSearchChange={setSearchText}
        placeholder="Search levers..."
        filters={[
          {
            id: 'type',
            label: 'Type',
            value: typeFilter,
            options: typeOptions,
            onChange: setTypeFilter,
          },
        ]}
      />

      {/* Data Grid */}
      <DataGrid
        rowData={filteredData}
        columnDefs={columnDefs}
        loading={loading}
        onRowClick={(row) => setSelectedLever(row)}
      />

      {/* Detail Panel */}
      {selectedLever && (
        <>
          <Backdrop onClick={() => setSelectedLever(null)} />
          <DetailPanel title={selectedLever.name} onClose={() => setSelectedLever(null)}>
            <DetailSection title="Basic Information">
              <DetailItem label="ID" value={selectedLever.lever_id} />
              <DetailItem
                label="Type"
                value={<BadgeRenderer value={selectedLever.lever_type_id || ''} />}
              />
              <DetailItem label="Description" value={selectedLever.lever_type_description} />
              <DetailItem label="Timeline" value={selectedLever.typical_timeline} />
            </DetailSection>

            {selectedLever.implementation_approach && (
              <DetailSection title="Implementation">
                <DetailItem label="Approach" value={selectedLever.implementation_approach} />
                <DetailItem label="Typical Actors" value={selectedLever.typical_actors} />
                <DetailItem label="Feasibility Notes" value={selectedLever.feasibility_notes} />
              </DetailSection>
            )}

            {relatedBarriers.length > 0 && (
              <DetailSection title={`Related Barriers (${relatedBarriers.length})`}>
                <div className="space-y-3">
                  {relatedBarriers.map((barrier) => (
                    <div
                      key={barrier.barrier_id}
                      className="p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="font-medium text-gray-900">
                            {barrier.barrier_short_name || barrier.barrier_id}
                          </span>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        {barrier.barrier_description}
                      </p>
                      {barrier.relationship_notes && (
                        <p className="text-xs text-gray-500 mt-1 italic">
                          {barrier.relationship_notes}
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
