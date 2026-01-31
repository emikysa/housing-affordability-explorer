import { useState, useMemo } from 'react'
import {
  useCostElements,
  useCostReductionOpportunities,
  useBarriers,
  useActors,
  useCroImpacts,
  useActorControls,
} from '../hooks/useData'
import type {
  CostElement,
  CostReductionOpportunity,
  Barrier,
  Actor,
  CroImpact,
  ActorControl,
} from '../types/database'
import DetailPanel, { Backdrop, DetailItem, DetailSection } from '../components/DetailPanel'
import { BadgeRenderer } from '../components/DataGrid'

type SelectionType = 'ce' | 'cro' | 'barrier' | 'actor' | null
type SelectedItem = {
  type: SelectionType
  id: string
}

export default function Explorer() {
  const { data: costElements, loading: ceLoading } = useCostElements()
  const { data: cros, loading: croLoading } = useCostReductionOpportunities()
  const { data: barriers, loading: barrierLoading } = useBarriers()
  const { data: actors, loading: actorLoading } = useActors()
  const { data: croImpacts } = useCroImpacts()
  const { data: actorControls } = useActorControls()

  const [selected, setSelected] = useState<SelectedItem | null>(null)
  const [detailItem, setDetailItem] = useState<{
    type: SelectionType
    data: CostElement | CostReductionOpportunity | Barrier | Actor
  } | null>(null)

  // Build lookup maps for efficient filtering
  const ceToCros = useMemo(() => {
    const map = new Map<string, Set<string>>()
    croImpacts.forEach((impact) => {
      if (!map.has(impact.ce_id)) map.set(impact.ce_id, new Set())
      map.get(impact.ce_id)!.add(impact.cro_id)
    })
    return map
  }, [croImpacts])

  const croToCes = useMemo(() => {
    const map = new Map<string, Set<string>>()
    croImpacts.forEach((impact) => {
      if (!map.has(impact.cro_id)) map.set(impact.cro_id, new Set())
      map.get(impact.cro_id)!.add(impact.ce_id)
    })
    return map
  }, [croImpacts])

  const croToBarriers = useMemo(() => {
    const map = new Map<string, Set<string>>()
    barriers.forEach((b) => {
      if (b.cro_id) {
        if (!map.has(b.cro_id)) map.set(b.cro_id, new Set())
        map.get(b.cro_id)!.add(b.barrier_id)
      }
    })
    return map
  }, [barriers])

  const barrierToCro = useMemo(() => {
    const map = new Map<string, string>()
    barriers.forEach((b) => {
      if (b.cro_id) map.set(b.barrier_id, b.cro_id)
    })
    return map
  }, [barriers])

  const ceToActors = useMemo(() => {
    const map = new Map<string, Set<string>>()
    actorControls.forEach((ac) => {
      if (!map.has(ac.ce_id)) map.set(ac.ce_id, new Set())
      map.get(ac.ce_id)!.add(ac.actor_id)
    })
    return map
  }, [actorControls])

  const actorToCes = useMemo(() => {
    const map = new Map<string, Set<string>>()
    actorControls.forEach((ac) => {
      if (!map.has(ac.actor_id)) map.set(ac.actor_id, new Set())
      map.get(ac.actor_id)!.add(ac.ce_id)
    })
    return map
  }, [actorControls])

  // Compute filtered data based on selection
  const filteredData = useMemo(() => {
    if (!selected) {
      return {
        ces: costElements,
        cros: cros,
        barriers: barriers,
        actors: actors,
      }
    }

    let filteredCes = new Set<string>()
    let filteredCros = new Set<string>()
    let filteredBarriers = new Set<string>()
    let filteredActors = new Set<string>()

    switch (selected.type) {
      case 'ce': {
        // CE selected: show related CROs, their barriers, and related actors
        filteredCes.add(selected.id)
        const relatedCros = ceToCros.get(selected.id) || new Set()
        relatedCros.forEach((croId) => {
          filteredCros.add(croId)
          const croBarriers = croToBarriers.get(croId) || new Set()
          croBarriers.forEach((b) => filteredBarriers.add(b))
        })
        const relatedActors = ceToActors.get(selected.id) || new Set()
        relatedActors.forEach((a) => filteredActors.add(a))
        break
      }
      case 'cro': {
        // CRO selected: show related CEs, barriers for this CRO, actors for those CEs
        filteredCros.add(selected.id)
        const relatedCes = croToCes.get(selected.id) || new Set()
        relatedCes.forEach((ceId) => {
          filteredCes.add(ceId)
          const ceActors = ceToActors.get(ceId) || new Set()
          ceActors.forEach((a) => filteredActors.add(a))
        })
        const croBarriers = croToBarriers.get(selected.id) || new Set()
        croBarriers.forEach((b) => filteredBarriers.add(b))
        break
      }
      case 'barrier': {
        // Barrier selected: show its CRO, CRO's CEs, and actors for those CEs
        filteredBarriers.add(selected.id)
        const croId = barrierToCro.get(selected.id)
        if (croId) {
          filteredCros.add(croId)
          const relatedCes = croToCes.get(croId) || new Set()
          relatedCes.forEach((ceId) => {
            filteredCes.add(ceId)
            const ceActors = ceToActors.get(ceId) || new Set()
            ceActors.forEach((a) => filteredActors.add(a))
          })
          // Also show other barriers for this CRO
          const otherBarriers = croToBarriers.get(croId) || new Set()
          otherBarriers.forEach((b) => filteredBarriers.add(b))
        }
        break
      }
      case 'actor': {
        // Actor selected: show CEs they control, CROs for those CEs, barriers for those CROs
        filteredActors.add(selected.id)
        const relatedCes = actorToCes.get(selected.id) || new Set()
        relatedCes.forEach((ceId) => {
          filteredCes.add(ceId)
          const ceCros = ceToCros.get(ceId) || new Set()
          ceCros.forEach((croId) => {
            filteredCros.add(croId)
            const croBarriers = croToBarriers.get(croId) || new Set()
            croBarriers.forEach((b) => filteredBarriers.add(b))
          })
        })
        break
      }
    }

    return {
      ces: costElements.filter((ce) => filteredCes.has(ce.ce_id)),
      cros: cros.filter((cro) => filteredCros.has(cro.cro_id)),
      barriers: barriers.filter((b) => filteredBarriers.has(b.barrier_id)),
      actors: actors.filter((a) => filteredActors.has(a.actor_id)),
    }
  }, [
    selected,
    costElements,
    cros,
    barriers,
    actors,
    ceToCros,
    croToCes,
    croToBarriers,
    barrierToCro,
    ceToActors,
    actorToCes,
  ])

  const handleItemClick = (type: SelectionType, id: string) => {
    if (selected?.type === type && selected?.id === id) {
      // Clicking same item clears selection
      setSelected(null)
    } else {
      setSelected({ type, id })
    }
  }

  const handleDetailClick = (
    type: SelectionType,
    data: CostElement | CostReductionOpportunity | Barrier | Actor
  ) => {
    setDetailItem({ type, data })
  }

  const formatCurrency = (value: number | null | undefined) => {
    if (value == null) return '-'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(value)
  }

  const loading = ceLoading || croLoading || barrierLoading || actorLoading

  const isSelected = (type: SelectionType, id: string) =>
    selected?.type === type && selected?.id === id

  // Get related data for detail panels
  const getRelatedCrosForCe = (ceId: string) =>
    croImpacts.filter((i) => i.ce_id === ceId)

  const getRelatedActorsForCe = (ceId: string) =>
    actorControls.filter((ac) => ac.ce_id === ceId)

  const getRelatedCesForCro = (croId: string) =>
    croImpacts.filter((i) => i.cro_id === croId)

  const getRelatedBarriersForCro = (croId: string) =>
    barriers.filter((b) => b.cro_id === croId)

  const getRelatedCesForActor = (actorId: string) =>
    actorControls.filter((ac) => ac.actor_id === actorId)

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Explorer</h1>
        <p className="mt-1 text-gray-500">
          Click any item to filter related elements across all columns. Click again to clear.
        </p>
      </div>

      {/* Selection indicator */}
      {selected && (
        <div className="bg-primary-50 border border-primary-200 rounded-lg px-4 py-2 flex items-center justify-between">
          <span className="text-primary-800">
            Filtering by <span className="font-semibold">{selected.type?.toUpperCase()}</span>:{' '}
            <span className="font-mono">{selected.id}</span>
          </span>
          <button
            onClick={() => setSelected(null)}
            className="text-primary-600 hover:text-primary-800 font-medium text-sm"
          >
            Clear filter
          </button>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="text-center py-8 text-gray-500">Loading data...</div>
      )}

      {/* Multi-column layout */}
      {!loading && (
        <div className="grid grid-cols-4 gap-4" style={{ height: 'calc(100vh - 280px)' }}>
          {/* Cost Elements Column */}
          <ExplorerColumn
            title="Cost Elements"
            count={filteredData.ces.length}
            totalCount={costElements.length}
            color="blue"
          >
            {filteredData.ces.map((ce) => (
              <ExplorerCard
                key={ce.ce_id}
                id={ce.ce_id}
                title={ce.description}
                subtitle={ce.stage_id || undefined}
                value={formatCurrency(ce.estimate)}
                isSelected={isSelected('ce', ce.ce_id)}
                onClick={() => handleItemClick('ce', ce.ce_id)}
                onDetailClick={() => handleDetailClick('ce', ce)}
                color="blue"
              />
            ))}
          </ExplorerColumn>

          {/* CROs Column */}
          <ExplorerColumn
            title="Reduction Opportunities"
            count={filteredData.cros.length}
            totalCount={cros.length}
            color="green"
          >
            {filteredData.cros.map((cro) => (
              <ExplorerCard
                key={cro.cro_id}
                id={cro.cro_id}
                title={cro.description}
                subtitle={cro.stage_id || undefined}
                value={cro.estimate ? formatCurrency(cro.estimate) : undefined}
                isSelected={isSelected('cro', cro.cro_id)}
                onClick={() => handleItemClick('cro', cro.cro_id)}
                onDetailClick={() => handleDetailClick('cro', cro)}
                color="green"
              />
            ))}
          </ExplorerColumn>

          {/* Barriers Column */}
          <ExplorerColumn
            title="Barriers & Levers"
            count={filteredData.barriers.length}
            totalCount={barriers.length}
            color="amber"
          >
            {filteredData.barriers.map((barrier) => (
              <ExplorerCard
                key={barrier.barrier_id}
                id={barrier.barrier_id}
                title={barrier.short_name || barrier.description}
                subtitle={barrier.barrier_type || undefined}
                isSelected={isSelected('barrier', barrier.barrier_id)}
                onClick={() => handleItemClick('barrier', barrier.barrier_id)}
                onDetailClick={() => handleDetailClick('barrier', barrier)}
                color="amber"
              />
            ))}
          </ExplorerColumn>

          {/* Actors Column */}
          <ExplorerColumn
            title="Actors"
            count={filteredData.actors.length}
            totalCount={actors.length}
            color="purple"
          >
            {filteredData.actors.map((actor) => (
              <ExplorerCard
                key={actor.actor_id}
                id={actor.actor_id}
                title={actor.actor_id}
                subtitle={actor.description || undefined}
                isSelected={isSelected('actor', actor.actor_id)}
                onClick={() => handleItemClick('actor', actor.actor_id)}
                onDetailClick={() => handleDetailClick('actor', actor)}
                color="purple"
              />
            ))}
          </ExplorerColumn>
        </div>
      )}

      {/* Detail Panel */}
      {detailItem && (
        <>
          <Backdrop onClick={() => setDetailItem(null)} />
          <DetailPanel
            title={
              detailItem.type === 'ce'
                ? (detailItem.data as CostElement).ce_id
                : detailItem.type === 'cro'
                ? (detailItem.data as CostReductionOpportunity).cro_id
                : detailItem.type === 'barrier'
                ? (detailItem.data as Barrier).barrier_id
                : (detailItem.data as Actor).actor_id
            }
            onClose={() => setDetailItem(null)}
          >
            {detailItem.type === 'ce' && (
              <CostElementDetail
                ce={detailItem.data as CostElement}
                relatedCros={getRelatedCrosForCe((detailItem.data as CostElement).ce_id)}
                relatedActors={getRelatedActorsForCe((detailItem.data as CostElement).ce_id)}
                formatCurrency={formatCurrency}
              />
            )}
            {detailItem.type === 'cro' && (
              <CroDetail
                cro={detailItem.data as CostReductionOpportunity}
                relatedCes={getRelatedCesForCro(
                  (detailItem.data as CostReductionOpportunity).cro_id
                )}
                relatedBarriers={getRelatedBarriersForCro(
                  (detailItem.data as CostReductionOpportunity).cro_id
                )}
                formatCurrency={formatCurrency}
              />
            )}
            {detailItem.type === 'barrier' && (
              <BarrierDetail barrier={detailItem.data as Barrier} />
            )}
            {detailItem.type === 'actor' && (
              <ActorDetail
                actor={detailItem.data as Actor}
                relatedCes={getRelatedCesForActor((detailItem.data as Actor).actor_id)}
                formatCurrency={formatCurrency}
              />
            )}
          </DetailPanel>
        </>
      )}
    </div>
  )
}

// Column component
interface ExplorerColumnProps {
  title: string
  count: number
  totalCount: number
  color: 'blue' | 'green' | 'amber' | 'purple'
  children: React.ReactNode
}

function ExplorerColumn({ title, count, totalCount, color, children }: ExplorerColumnProps) {
  const colorClasses = {
    blue: 'border-blue-200 bg-blue-50',
    green: 'border-green-200 bg-green-50',
    amber: 'border-amber-200 bg-amber-50',
    purple: 'border-purple-200 bg-purple-50',
  }

  const headerColors = {
    blue: 'text-blue-900 bg-blue-100',
    green: 'text-green-900 bg-green-100',
    amber: 'text-amber-900 bg-amber-100',
    purple: 'text-purple-900 bg-purple-100',
  }

  return (
    <div className={`rounded-lg border ${colorClasses[color]} flex flex-col overflow-hidden`}>
      <div className={`px-3 py-2 ${headerColors[color]} border-b border-opacity-50`}>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm">{title}</h3>
          <span className="text-xs font-medium">
            {count === totalCount ? count : `${count} / ${totalCount}`}
          </span>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-2">{children}</div>
    </div>
  )
}

// Card component
interface ExplorerCardProps {
  id: string
  title: string
  subtitle?: string
  value?: string
  isSelected: boolean
  onClick: () => void
  onDetailClick: () => void
  color: 'blue' | 'green' | 'amber' | 'purple'
}

function ExplorerCard({
  id,
  title,
  subtitle,
  value,
  isSelected,
  onClick,
  onDetailClick,
  color,
}: ExplorerCardProps) {
  const selectedClasses = {
    blue: 'ring-2 ring-blue-500 bg-blue-100',
    green: 'ring-2 ring-green-500 bg-green-100',
    amber: 'ring-2 ring-amber-500 bg-amber-100',
    purple: 'ring-2 ring-purple-500 bg-purple-100',
  }

  const hoverClasses = {
    blue: 'hover:bg-blue-100',
    green: 'hover:bg-green-100',
    amber: 'hover:bg-amber-100',
    purple: 'hover:bg-purple-100',
  }

  return (
    <div
      className={`bg-white rounded-lg p-2 cursor-pointer transition-all ${
        isSelected ? selectedClasses[color] : `${hoverClasses[color]} shadow-sm`
      }`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="text-xs font-mono text-gray-500 truncate">{id}</div>
          <div className="text-sm font-medium text-gray-900 line-clamp-2">{title}</div>
          {subtitle && (
            <div className="mt-1">
              <BadgeRenderer value={subtitle} />
            </div>
          )}
        </div>
        <div className="flex flex-col items-end gap-1">
          {value && <span className="text-xs font-medium text-gray-600">{value}</span>}
          <button
            onClick={(e) => {
              e.stopPropagation()
              onDetailClick()
            }}
            className="text-xs text-primary-600 hover:text-primary-800 font-medium"
          >
            Details
          </button>
        </div>
      </div>
    </div>
  )
}

// Detail panel content components
function CostElementDetail({
  ce,
  relatedCros,
  relatedActors,
  formatCurrency,
}: {
  ce: CostElement
  relatedCros: CroImpact[]
  relatedActors: ActorControl[]
  formatCurrency: (v: number | null | undefined) => string
}) {
  return (
    <>
      <DetailSection title="Basic Information">
        <DetailItem label="Description" value={ce.description} />
        <DetailItem label="Stage" value={<BadgeRenderer value={ce.stage_id} />} />
        <DetailItem label="Estimate" value={formatCurrency(ce.estimate)} />
        <DetailItem label="Annual Estimate" value={formatCurrency(ce.annual_estimate)} />
        <DetailItem label="Unit" value={ce.unit} />
        <DetailItem label="Cadence" value={ce.cadence} />
      </DetailSection>

      {ce.notes && (
        <DetailSection title="Notes">
          <p className="text-sm text-gray-700">{ce.notes}</p>
        </DetailSection>
      )}

      {relatedCros.length > 0 && (
        <DetailSection title={`Related CROs (${relatedCros.length})`}>
          <div className="space-y-2">
            {relatedCros.map((cro) => (
              <div key={`${cro.cro_id}-${cro.relationship}`} className="p-2 bg-green-50 rounded">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-gray-600">{cro.cro_id}</span>
                  <BadgeRenderer value={cro.relationship} />
                </div>
                <p className="text-sm text-gray-800 mt-1">{cro.cro_description}</p>
              </div>
            ))}
          </div>
        </DetailSection>
      )}

      {relatedActors.length > 0 && (
        <DetailSection title={`Related Actors (${relatedActors.length})`}>
          <div className="space-y-2">
            {relatedActors.map((ac) => (
              <div key={`${ac.actor_id}-${ac.role}`} className="p-2 bg-purple-50 rounded">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{ac.actor_id}</span>
                  <BadgeRenderer value={ac.role} />
                </div>
                {ac.policy_lever && (
                  <p className="text-xs text-gray-600 mt-1">{ac.policy_lever}</p>
                )}
              </div>
            ))}
          </div>
        </DetailSection>
      )}
    </>
  )
}

function CroDetail({
  cro,
  relatedCes,
  relatedBarriers,
  formatCurrency,
}: {
  cro: CostReductionOpportunity
  relatedCes: CroImpact[]
  relatedBarriers: Barrier[]
  formatCurrency: (v: number | null | undefined) => string
}) {
  return (
    <>
      <DetailSection title="Basic Information">
        <DetailItem label="Description" value={cro.description} />
        <DetailItem label="Stage" value={<BadgeRenderer value={cro.stage_id} />} />
        <DetailItem label="Estimate" value={formatCurrency(cro.estimate)} />
        <DetailItem label="Unit" value={cro.unit} />
        <DetailItem
          label="Requires Upfront Investment"
          value={cro.requires_upfront_investment ? 'Yes' : 'No'}
        />
      </DetailSection>

      {cro.value_drivers && (
        <DetailSection title="Value Drivers">
          <p className="text-sm text-gray-700">{cro.value_drivers}</p>
        </DetailSection>
      )}

      {cro.notes && (
        <DetailSection title="Notes">
          <p className="text-sm text-gray-700">{cro.notes}</p>
        </DetailSection>
      )}

      {relatedCes.length > 0 && (
        <DetailSection title={`Affected Cost Elements (${relatedCes.length})`}>
          <div className="space-y-2">
            {relatedCes.map((ce) => (
              <div key={`${ce.ce_id}-${ce.relationship}`} className="p-2 bg-blue-50 rounded">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-gray-600">{ce.ce_id}</span>
                  <BadgeRenderer value={ce.relationship} />
                </div>
                <p className="text-sm text-gray-800 mt-1">{ce.ce_description}</p>
              </div>
            ))}
          </div>
        </DetailSection>
      )}

      {relatedBarriers.length > 0 && (
        <DetailSection title={`Barriers (${relatedBarriers.length})`}>
          <div className="space-y-2">
            {relatedBarriers.map((b) => (
              <div key={b.barrier_id} className="p-2 bg-amber-50 rounded">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-gray-600">{b.barrier_id}</span>
                  {b.barrier_type && <BadgeRenderer value={b.barrier_type} />}
                </div>
                <p className="text-sm text-gray-800 mt-1">{b.short_name || b.description}</p>
              </div>
            ))}
          </div>
        </DetailSection>
      )}
    </>
  )
}

function BarrierDetail({ barrier }: { barrier: Barrier }) {
  return (
    <>
      <DetailSection title="Basic Information">
        <DetailItem label="Description" value={barrier.description} />
        {barrier.short_name && <DetailItem label="Short Name" value={barrier.short_name} />}
        <DetailItem label="Related CRO" value={barrier.cro_id} />
      </DetailSection>

      <DetailSection title="Classification">
        <DetailItem label="Type" value={<BadgeRenderer value={barrier.barrier_type} />} />
        <DetailItem label="Scope" value={<BadgeRenderer value={barrier.barrier_scope} />} />
        <DetailItem
          label="Feasibility Horizon"
          value={<BadgeRenderer value={barrier.feasibility_horizon} />}
        />
        <DetailItem label="Lever Type" value={<BadgeRenderer value={barrier.lever_type} />} />
      </DetailSection>

      {(barrier.effect_mechanism || barrier.authority || barrier.actor_scope) && (
        <DetailSection title="Details">
          {barrier.effect_mechanism && (
            <DetailItem label="Effect Mechanism" value={barrier.effect_mechanism} />
          )}
          {barrier.authority && <DetailItem label="Authority" value={barrier.authority} />}
          {barrier.actor_scope && <DetailItem label="Actor Scope" value={barrier.actor_scope} />}
        </DetailSection>
      )}
    </>
  )
}

function ActorDetail({
  actor,
  relatedCes,
  formatCurrency,
}: {
  actor: Actor
  relatedCes: ActorControl[]
  formatCurrency: (v: number | null | undefined) => string
}) {
  const primaryCount = relatedCes.filter((c) => c.role === 'Primary').length
  const secondaryCount = relatedCes.filter((c) => c.role === 'Secondary').length
  const totalCost = relatedCes.reduce((sum, c) => sum + (c.ce_estimate || 0), 0)

  return (
    <>
      <DetailSection title="Overview">
        <DetailItem label="Actor ID" value={actor.actor_id} />
        <DetailItem label="Description" value={actor.description} />
      </DetailSection>

      <DetailSection title="Cost Control Summary">
        <DetailItem label="Primary Control" value={`${primaryCount} cost elements`} />
        <DetailItem label="Secondary Control" value={`${secondaryCount} cost elements`} />
        <DetailItem label="Total Cost Influenced" value={formatCurrency(totalCost)} />
      </DetailSection>

      {relatedCes.length > 0 && (
        <DetailSection title={`Controlled Cost Elements (${relatedCes.length})`}>
          <div className="space-y-2">
            {relatedCes.map((ce) => (
              <div key={`${ce.ce_id}-${ce.role}`} className="p-2 bg-blue-50 rounded">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-gray-600">{ce.ce_id}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-600">
                      {formatCurrency(ce.ce_estimate)}
                    </span>
                    <BadgeRenderer value={ce.role} />
                  </div>
                </div>
                <p className="text-sm text-gray-800 mt-1">{ce.ce_description}</p>
                {ce.policy_lever && (
                  <p className="text-xs text-gray-500 mt-1">Lever: {ce.policy_lever}</p>
                )}
              </div>
            ))}
          </div>
        </DetailSection>
      )}
    </>
  )
}
