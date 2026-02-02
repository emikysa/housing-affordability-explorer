import { useState, useMemo } from 'react'
import type { ColDef } from 'ag-grid-community'
import DataGrid, { currencyFormatter, BadgeRenderer } from '../components/DataGrid'
import FilterBar from '../components/FilterBar'
import { useCroImpacts, useActorControls } from '../hooks/useData'
import type { CroImpact, ActorControl } from '../types/database'

type ViewMode = 'cro-ce' | 'ce-actor'

export default function Relationships() {
  const { data: croImpacts, loading: croLoading } = useCroImpacts()
  const { data: actorControls, loading: actorLoading } = useActorControls()
  const [viewMode, setViewMode] = useState<ViewMode>('cro-ce')
  const [searchText, setSearchText] = useState('')
  const [relationshipFilter, setRelationshipFilter] = useState('')
  const [roleFilter, setRoleFilter] = useState('')

  // CRO-CE columns
  const croCeColumns = useMemo<ColDef<CroImpact>[]>(
    () => [
      {
        field: 'cro_id',
        headerName: 'CRO ID',
        width: 150,
        pinned: 'left',
      },
      {
        field: 'cro_description',
        headerName: 'CRO Description',
        flex: 1,
        minWidth: 200,
      },
      {
        field: 'cro_estimate',
        headerName: 'CRO Savings',
        width: 130,
        valueFormatter: currencyFormatter,
        type: 'numericColumn',
        cellStyle: { color: '#059669' },
      },
      {
        field: 'relationship',
        headerName: 'Relationship',
        width: 130,
        cellRenderer: (params: { value: string }) => <BadgeRenderer value={params.value} />,
      },
      {
        field: 'ce_id',
        headerName: 'CE ID',
        width: 120,
      },
      {
        field: 'ce_description',
        headerName: 'Cost Element',
        flex: 1,
        minWidth: 200,
      },
      {
        field: 'ce_estimate',
        headerName: 'CE Cost',
        width: 120,
        valueFormatter: currencyFormatter,
        type: 'numericColumn',
      },
    ],
    []
  )

  // CE-Actor columns
  const ceActorColumns = useMemo<ColDef<ActorControl>[]>(
    () => [
      {
        field: 'ce_id',
        headerName: 'Cost Element',
        width: 130,
        pinned: 'left',
      },
      {
        field: 'ce_description',
        headerName: 'Description',
        flex: 1,
        minWidth: 200,
      },
      {
        field: 'ce_estimate',
        headerName: 'Cost',
        width: 120,
        valueFormatter: currencyFormatter,
        type: 'numericColumn',
      },
      {
        field: 'actor_id',
        headerName: 'Actor',
        width: 160,
      },
      {
        field: 'role',
        headerName: 'Role',
        width: 110,
        cellRenderer: (params: { value: string }) => <BadgeRenderer value={params.value} />,
      },
      {
        field: 'policy_lever',
        headerName: 'Policy Lever',
        flex: 1,
        minWidth: 200,
      },
    ],
    []
  )

  // Filter CRO-CE data
  const filteredCroData = useMemo(() => {
    let data = croImpacts
    if (relationshipFilter) {
      data = data.filter((d) => d.relationship === relationshipFilter)
    }
    return data
  }, [croImpacts, relationshipFilter])

  // Filter CE-Actor data
  const filteredActorData = useMemo(() => {
    let data = actorControls
    if (roleFilter) {
      data = data.filter((d) => d.role === roleFilter)
    }
    return data
  }, [actorControls, roleFilter])

  const relationshipOptions = [
    { value: 'Primary', label: 'Primary' },
    { value: 'Also affected', label: 'Also affected' },
    { value: 'Upfront premium', label: 'Upfront premium' },
  ]

  const roleOptions = [
    { value: 'Primary', label: 'Primary' },
    { value: 'Secondary', label: 'Secondary' },
  ]

  const loading = croLoading || actorLoading

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Relationships</h1>
        <p className="mt-1 text-gray-500">
          Explore connections between cost elements, reduction opportunities, and actors
        </p>
      </div>

      {/* View Mode Toggle */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex gap-4">
          <button
            onClick={() => setViewMode('cro-ce')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              viewMode === 'cro-ce'
                ? 'bg-primary-100 text-primary-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            CRO → Cost Elements
          </button>
          <button
            onClick={() => setViewMode('ce-actor')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              viewMode === 'ce-actor'
                ? 'bg-primary-100 text-primary-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Cost Elements → Actors
          </button>
        </div>
      </div>

      {/* Conditional Filters and Grid */}
      {viewMode === 'cro-ce' ? (
        <>
          <FilterBar
            searchValue={searchText}
            onSearchChange={setSearchText}
            placeholder="Search CRO-CE relationships..."
            filters={[
              {
                id: 'relationship',
                label: 'Relationship',
                value: relationshipFilter,
                options: relationshipOptions,
                onChange: setRelationshipFilter,
              },
            ]}
          />

          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <DataGrid
              rowData={filteredCroData}
              columnDefs={croCeColumns}
              loading={loading}
              quickFilterText={searchText}
              height="calc(100vh - 380px)"
            />
          </div>
        </>
      ) : (
        <>
          <FilterBar
            searchValue={searchText}
            onSearchChange={setSearchText}
            placeholder="Search CE-Actor relationships..."
            filters={[
              {
                id: 'role',
                label: 'Role',
                value: roleFilter,
                options: roleOptions,
                onChange: setRoleFilter,
              },
            ]}
          />

          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <DataGrid
              rowData={filteredActorData}
              columnDefs={ceActorColumns}
              loading={loading}
              quickFilterText={searchText}
              height="calc(100vh - 380px)"
            />
          </div>
        </>
      )}

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900">CRO → Cost Elements</h3>
          <p className="text-sm text-blue-700 mt-1">
            Shows which Cost Reduction Opportunities affect which Cost Elements. The "Primary"
            relationship indicates the main target, while "Also affected" shows secondary impacts.
          </p>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <h3 className="font-semibold text-purple-900">Cost Elements → Actors</h3>
          <p className="text-sm text-purple-700 mt-1">
            Shows who controls each Cost Element. Primary actors have direct control over the cost,
            while Secondary actors have indirect influence.
          </p>
        </div>
      </div>
    </div>
  )
}
