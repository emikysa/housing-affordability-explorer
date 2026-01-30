import { useState, useMemo } from 'react'
import type { ColDef } from 'ag-grid-community'
import DataGrid, { currencyFormatter, BadgeRenderer } from '../components/DataGrid'
import FilterBar from '../components/FilterBar'
import DetailPanel, { Backdrop, DetailItem, DetailSection } from '../components/DetailPanel'
import { useActors, useActorControls } from '../hooks/useData'
import type { Actor, ActorControl } from '../types/database'

export default function Actors() {
  const { data: actors, loading: actorsLoading } = useActors()
  const { data: actorControls, loading: controlsLoading } = useActorControls()
  const [searchText, setSearchText] = useState('')
  const [selectedActor, setSelectedActor] = useState<Actor | null>(null)

  // Get controls for selected actor
  const selectedActorControls = useMemo(() => {
    if (!selectedActor) return []
    return actorControls.filter((c) => c.actor_id === selectedActor.actor_id)
  }, [actorControls, selectedActor])

  // Aggregate actor stats
  const actorStats = useMemo(() => {
    const stats = new Map<
      string,
      {
        actor_id: string
        description: string | null
        primaryCount: number
        secondaryCount: number
        totalCostControlled: number
        costElements: string[]
      }
    >()

    actors.forEach((a) => {
      stats.set(a.actor_id, {
        actor_id: a.actor_id,
        description: a.description,
        primaryCount: 0,
        secondaryCount: 0,
        totalCostControlled: 0,
        costElements: [],
      })
    })

    actorControls.forEach((c) => {
      const stat = stats.get(c.actor_id)
      if (stat) {
        if (c.role === 'Primary') {
          stat.primaryCount++
          stat.totalCostControlled += c.ce_estimate || 0
        } else {
          stat.secondaryCount++
        }
        if (c.ce_id && !stat.costElements.includes(c.ce_id)) {
          stat.costElements.push(c.ce_id)
        }
      }
    })

    return Array.from(stats.values())
  }, [actors, actorControls])

  const columnDefs = useMemo<
    ColDef<{
      actor_id: string
      description: string | null
      primaryCount: number
      secondaryCount: number
      totalCostControlled: number
      costElements: string[]
    }>[]
  >(
    () => [
      {
        field: 'actor_id',
        headerName: 'Actor',
        width: 180,
        pinned: 'left',
      },
      {
        field: 'description',
        headerName: 'Description',
        flex: 2,
        minWidth: 250,
      },
      {
        field: 'primaryCount',
        headerName: 'Primary Control',
        width: 140,
        type: 'numericColumn',
        cellRenderer: (params: { value: number }) => (
          <span className={params.value > 0 ? 'font-semibold text-blue-600' : 'text-gray-400'}>
            {params.value} elements
          </span>
        ),
      },
      {
        field: 'secondaryCount',
        headerName: 'Secondary',
        width: 120,
        type: 'numericColumn',
      },
      {
        field: 'totalCostControlled',
        headerName: 'Cost Controlled',
        width: 150,
        valueFormatter: currencyFormatter,
        type: 'numericColumn',
      },
    ],
    []
  )

  const handleRowClick = (data: {
    actor_id: string
    description: string | null
    primaryCount: number
    secondaryCount: number
    totalCostControlled: number
    costElements: string[]
  }) => {
    const actor = actors.find((a) => a.actor_id === data.actor_id)
    if (actor) {
      setSelectedActor(actor)
    }
  }

  const formatCurrency = (value: number | null) => {
    if (value == null) return '-'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(value)
  }

  const loading = actorsLoading || controlsLoading

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Actors</h1>
        <p className="mt-1 text-gray-500">
          Who controls housing costs and their policy levers
        </p>
      </div>

      {/* Filters */}
      <FilterBar
        searchValue={searchText}
        onSearchChange={setSearchText}
        placeholder="Search actors..."
      />

      {/* Data Grid */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <DataGrid
          rowData={actorStats}
          columnDefs={columnDefs}
          loading={loading}
          quickFilterText={searchText}
          onRowClick={handleRowClick}
          height="calc(100vh - 300px)"
        />
      </div>

      {/* Detail Panel */}
      {selectedActor && (
        <>
          <Backdrop onClick={() => setSelectedActor(null)} />
          <DetailPanel title={selectedActor.actor_id} onClose={() => setSelectedActor(null)}>
            <DetailSection title="Overview">
              <DetailItem label="Description" value={selectedActor.description} />
              <DetailItem
                label="Cost Elements Controlled"
                value={`${selectedActorControls.length} elements`}
              />
            </DetailSection>

            {selectedActorControls.length > 0 && (
              <DetailSection title="Cost Element Control">
                <div className="space-y-3">
                  {selectedActorControls
                    .sort((a, b) => {
                      // Primary first, then secondary
                      if (a.role === 'Primary' && b.role !== 'Primary') return -1
                      if (a.role !== 'Primary' && b.role === 'Primary') return 1
                      return 0
                    })
                    .map((control, idx) => (
                      <div
                        key={`${control.ce_id}-${control.role}-${idx}`}
                        className={`p-3 rounded-lg border ${
                          control.role === 'Primary'
                            ? 'bg-blue-50 border-blue-200'
                            : 'bg-gray-50 border-gray-200'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="font-medium text-gray-900">{control.ce_id}</span>
                            <span className="ml-2">
                              <BadgeRenderer value={control.role} />
                            </span>
                          </div>
                          {control.ce_estimate && (
                            <span className="text-gray-600 font-medium">
                              {formatCurrency(control.ce_estimate)}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{control.ce_description}</p>
                        {control.policy_lever && (
                          <div className="mt-2 p-2 bg-white rounded border border-gray-200">
                            <p className="text-xs font-medium text-green-700">Policy Lever:</p>
                            <p className="text-sm text-gray-700">{control.policy_lever}</p>
                          </div>
                        )}
                        {control.notes && (
                          <p className="text-xs text-gray-500 mt-2">{control.notes}</p>
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
