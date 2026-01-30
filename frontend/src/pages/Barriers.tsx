import { useState, useMemo } from 'react'
import type { ColDef } from 'ag-grid-community'
import DataGrid, { BadgeRenderer } from '../components/DataGrid'
import FilterBar from '../components/FilterBar'
import DetailPanel, { Backdrop, DetailItem, DetailSection } from '../components/DetailPanel'
import {
  useBarriers,
  useBarrierTypes,
  useBarrierScopes,
  useFeasibilityHorizons,
  useLeverTypes,
} from '../hooks/useData'
import type { Barrier } from '../types/database'

export default function Barriers() {
  const { data: barriers, loading } = useBarriers()
  const { data: barrierTypes } = useBarrierTypes()
  const { data: barrierScopes } = useBarrierScopes()
  const { data: horizons } = useFeasibilityHorizons()
  const { data: leverTypes } = useLeverTypes()

  const [searchText, setSearchText] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [scopeFilter, setScopeFilter] = useState('')
  const [horizonFilter, setHorizonFilter] = useState('')
  const [selectedBarrier, setSelectedBarrier] = useState<Barrier | null>(null)

  const columnDefs = useMemo<ColDef<Barrier>[]>(
    () => [
      {
        field: 'short_name',
        headerName: 'Short Name',
        width: 160,
        pinned: 'left',
      },
      {
        field: 'cro_id',
        headerName: 'CRO',
        width: 150,
      },
      {
        field: 'description',
        headerName: 'Description',
        flex: 2,
        minWidth: 250,
      },
      {
        field: 'barrier_type',
        headerName: 'Type',
        width: 110,
        cellRenderer: (params: { value: string }) => <BadgeRenderer value={params.value} />,
      },
      {
        field: 'barrier_scope',
        headerName: 'Scope',
        width: 130,
        cellRenderer: (params: { value: string }) => <BadgeRenderer value={params.value} />,
      },
      {
        field: 'feasibility_horizon',
        headerName: 'Horizon',
        width: 110,
        cellRenderer: (params: { value: string }) => <BadgeRenderer value={params.value} />,
      },
      {
        field: 'lever_type',
        headerName: 'Lever Type',
        width: 150,
      },
    ],
    []
  )

  // Filter data
  const filteredData = useMemo(() => {
    let data = barriers

    if (typeFilter) {
      data = data.filter((b) => b.barrier_type === typeFilter)
    }

    if (scopeFilter) {
      data = data.filter((b) => b.barrier_scope === scopeFilter)
    }

    if (horizonFilter) {
      data = data.filter((b) => b.feasibility_horizon === horizonFilter)
    }

    return data
  }, [barriers, typeFilter, scopeFilter, horizonFilter])

  const typeOptions = useMemo(
    () => barrierTypes.map((t) => ({ value: t.type_id, label: t.type_id })),
    [barrierTypes]
  )

  const scopeOptions = useMemo(
    () => barrierScopes.map((s) => ({ value: s.scope_id, label: s.scope_id })),
    [barrierScopes]
  )

  const horizonOptions = useMemo(
    () => horizons.map((h) => ({ value: h.horizon_id, label: h.horizon_id })),
    [horizons]
  )

  // Summary stats
  const stats = useMemo(() => {
    const byHorizon = {
      Near: filteredData.filter((b) => b.feasibility_horizon === 'Near').length,
      Medium: filteredData.filter((b) => b.feasibility_horizon === 'Medium').length,
      Long: filteredData.filter((b) => b.feasibility_horizon === 'Long').length,
    }
    return byHorizon
  }, [filteredData])

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Barriers & Levers</h1>
          <p className="mt-1 text-gray-500">
            What blocks cost reductions and how to overcome them
          </p>
        </div>
        <div className="flex gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-green-600">{stats.Near}</p>
            <p className="text-xs text-gray-500">Near-term</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-yellow-600">{stats.Medium}</p>
            <p className="text-xs text-gray-500">Medium-term</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-red-600">{stats.Long}</p>
            <p className="text-xs text-gray-500">Long-term</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <FilterBar
        searchValue={searchText}
        onSearchChange={setSearchText}
        placeholder="Search barriers..."
        filters={[
          {
            id: 'type',
            label: 'Type',
            value: typeFilter,
            options: typeOptions,
            onChange: setTypeFilter,
          },
          {
            id: 'scope',
            label: 'Scope',
            value: scopeFilter,
            options: scopeOptions,
            onChange: setScopeFilter,
          },
          {
            id: 'horizon',
            label: 'Horizon',
            value: horizonFilter,
            options: horizonOptions,
            onChange: setHorizonFilter,
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
          onRowClick={setSelectedBarrier}
          height="calc(100vh - 350px)"
        />
      </div>

      {/* Detail Panel */}
      {selectedBarrier && (
        <>
          <Backdrop onClick={() => setSelectedBarrier(null)} />
          <DetailPanel
            title={selectedBarrier.short_name || selectedBarrier.barrier_id}
            onClose={() => setSelectedBarrier(null)}
          >
            <DetailSection title="Classification">
              <DetailItem
                label="Barrier Type"
                value={
                  <div>
                    <BadgeRenderer value={selectedBarrier.barrier_type} />
                    {selectedBarrier.barrier_type_description && (
                      <p className="text-sm text-gray-600 mt-1">
                        {selectedBarrier.barrier_type_description}
                      </p>
                    )}
                  </div>
                }
              />
              <DetailItem
                label="Scope"
                value={
                  <div>
                    <BadgeRenderer value={selectedBarrier.barrier_scope} />
                    {selectedBarrier.barrier_scope_description && (
                      <p className="text-sm text-gray-600 mt-1">
                        {selectedBarrier.barrier_scope_description}
                      </p>
                    )}
                  </div>
                }
              />
              <DetailItem
                label="Feasibility Horizon"
                value={
                  <div>
                    <BadgeRenderer value={selectedBarrier.feasibility_horizon} />
                    {selectedBarrier.feasibility_horizon_description && (
                      <p className="text-sm text-gray-600 mt-1">
                        {selectedBarrier.feasibility_horizon_description}
                      </p>
                    )}
                  </div>
                }
              />
              <DetailItem label="Pattern ID" value={selectedBarrier.pattern_id} />
            </DetailSection>

            <DetailSection title="Details">
              <DetailItem label="Full Description" value={selectedBarrier.description} />
              <DetailItem label="Effect Mechanism" value={selectedBarrier.effect_mechanism} />
              <DetailItem label="Authority" value={selectedBarrier.authority} />
            </DetailSection>

            <DetailSection title="Solution">
              <DetailItem
                label="Lever Type"
                value={
                  <div>
                    <span className="font-medium text-green-700">
                      {selectedBarrier.lever_type}
                    </span>
                    {selectedBarrier.lever_type_description && (
                      <p className="text-sm text-gray-600 mt-1">
                        {selectedBarrier.lever_type_description}
                      </p>
                    )}
                  </div>
                }
              />
            </DetailSection>

            <DetailSection title="Related CRO">
              <DetailItem label="CRO ID" value={selectedBarrier.cro_id} />
              <DetailItem label="CRO Description" value={selectedBarrier.cro_description} />
            </DetailSection>
          </DetailPanel>
        </>
      )}
    </div>
  )
}
