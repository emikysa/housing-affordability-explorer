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

type SelectionType = 'ce' | 'cro' | 'barrier' | 'actor' | null
type SelectedItem = {
  type: SelectionType
  id: string
}

// Semantic color types for Explorer columns
type ColumnColorType = 'ce' | 'cro' | 'barrier' | 'actor'

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
        <div className="bg-gray-100 border border-gray-300 rounded-lg px-4 py-2 flex items-center justify-between">
          <span className="text-gray-800">
            Filtering by <span className="font-semibold">{selected.type?.toUpperCase()}</span>:{' '}
            <span className="font-mono">{selected.id}</span>
          </span>
          <button
            onClick={() => setSelected(null)}
            className="text-gray-600 hover:text-gray-800 font-medium text-sm"
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
          {/* Cost Elements Column - Gray (Neutral) */}
          <ExplorerColumn
            title="Cost Elements"
            count={filteredData.ces.length}
            totalCount={costElements.length}
            colorType="ce"
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
                colorType="ce"
              />
            ))}
          </ExplorerColumn>

          {/* CROs Column - Green (Opportunity) */}
          <ExplorerColumn
            title="Reduction Opportunities"
            count={filteredData.cros.length}
            totalCount={cros.length}
            colorType="cro"
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
                colorType="cro"
              />
            ))}
          </ExplorerColumn>

          {/* Barriers Column - Amber (Friction) */}
          <ExplorerColumn
            title="Barriers & Levers"
            count={filteredData.barriers.length}
            totalCount={barriers.length}
            colorType="barrier"
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
                colorType="barrier"
                barrierType={barrier.barrier_type || undefined}
              />
            ))}
          </ExplorerColumn>

          {/* Actors Column - Blue (Agency) */}
          <ExplorerColumn
            title="Actors"
            count={filteredData.actors.length}
            totalCount={actors.length}
            colorType="actor"
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
                colorType="actor"
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

// Semantic color configuration
const columnColors = {
  // Cost Elements - Gray (Neutral, unavoidable baseline costs)
  ce: {
    header: { bg: '#E5E7EB', text: '#111827', border: '#9CA3AF' },
    card: { bg: '#F3F4F6', border: '#9CA3AF', primaryText: '#1F2937', secondaryText: '#4B5563' },
    badge: { bg: '#E5E7EB', text: '#374151', border: '#9CA3AF' },
    selected: { border: '#9CA3AF' },
  },
  // CROs - Green (Constructive opportunity, efficiency)
  cro: {
    header: { bg: '#D1FAE5', text: '#064E3B', border: '#34D399' },
    card: { bg: '#ECFDF5', border: '#34D399', primaryText: '#065F46', secondaryText: '#047857' },
    badge: { bg: '#A7F3D0', text: '#064E3B', border: '#34D399' },
    selected: { border: '#34D399' },
  },
  // Barriers - Amber (Friction, constraint, caution)
  barrier: {
    header: { bg: '#FEF3C7', text: '#78350F', border: '#F59E0B' },
    card: { bg: '#FFFBEB', border: '#F59E0B', primaryText: '#92400E', secondaryText: '#B45309' },
    badge: { bg: '#FDE68A', text: '#78350F', border: '#F59E0B' },
    selected: { border: '#F59E0B' },
  },
  // Actors - Blue (Agency, authority, responsibility)
  actor: {
    header: { bg: '#DBEAFE', text: '#1E3A8A', border: '#60A5FA' },
    card: { bg: '#EFF6FF', border: '#60A5FA', primaryText: '#1E40AF', secondaryText: '#1D4ED8' },
    badge: { bg: '#BFDBFE', text: '#1E3A8A', border: '#60A5FA' },
    selected: { border: '#60A5FA' },
  },
}

// Barrier type specific badge colors
const barrierTypeBadgeColors: Record<string, { bg: string; text: string }> = {
  RULE: { bg: '#FDE68A', text: '#78350F' },
  POLITICAL: { bg: '#FCD34D', text: '#78350F' },
  MARKET: { bg: '#FEF08A', text: '#854D0E' },
}

// Column component
interface ExplorerColumnProps {
  title: string
  count: number
  totalCount: number
  colorType: ColumnColorType
  children: React.ReactNode
}

function ExplorerColumn({ title, count, totalCount, colorType, children }: ExplorerColumnProps) {
  const colors = columnColors[colorType]

  return (
    <div
      className="rounded-lg flex flex-col overflow-hidden"
      style={{
        backgroundColor: colors.card.bg,
        borderWidth: '1px',
        borderColor: colors.header.border,
      }}
    >
      <div
        className="px-3 py-2"
        style={{
          backgroundColor: colors.header.bg,
          borderBottomWidth: '1px',
          borderBottomColor: colors.header.border,
        }}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm" style={{ color: colors.header.text }}>
            {title}
          </h3>
          <span className="text-xs font-medium" style={{ color: colors.header.text }}>
            {count === totalCount ? count : `${count} / ${totalCount}`}
          </span>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-2">{children}</div>
    </div>
  )
}

// Badge component for Explorer
function ExplorerBadge({
  value,
  colorType,
  barrierType,
}: {
  value: string | null | undefined
  colorType: ColumnColorType
  barrierType?: string
}) {
  if (!value) return null

  // Use barrier-type specific colors for barrier badges
  let badgeColors = columnColors[colorType].badge
  if (colorType === 'barrier' && barrierType && barrierTypeBadgeColors[barrierType]) {
    badgeColors = { ...badgeColors, ...barrierTypeBadgeColors[barrierType] }
  }

  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
      style={{
        backgroundColor: badgeColors.bg,
        color: badgeColors.text,
        borderWidth: '1px',
        borderColor: badgeColors.border,
      }}
    >
      {value}
    </span>
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
  colorType: ColumnColorType
  barrierType?: string
}

function ExplorerCard({
  id,
  title,
  subtitle,
  value,
  isSelected,
  onClick,
  onDetailClick,
  colorType,
  barrierType,
}: ExplorerCardProps) {
  const colors = columnColors[colorType]

  return (
    <div
      className="rounded-lg p-2 cursor-pointer transition-all"
      style={{
        backgroundColor: '#FFFFFF',
        borderLeftWidth: '3px',
        borderLeftColor: colors.card.border,
        boxShadow: isSelected
          ? `0 0 0 2px ${colors.selected.border}`
          : '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
      }}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div
            className="text-xs font-mono truncate"
            style={{ color: colors.card.secondaryText }}
          >
            {id}
          </div>
          <div
            className="text-sm font-medium line-clamp-2"
            style={{ color: colors.card.primaryText }}
          >
            {title}
          </div>
          {subtitle && (
            <div className="mt-1">
              <ExplorerBadge value={subtitle} colorType={colorType} barrierType={barrierType} />
            </div>
          )}
        </div>
        <div className="flex flex-col items-end gap-1">
          {value && (
            <span className="text-xs font-medium" style={{ color: colors.card.secondaryText }}>
              {value}
            </span>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation()
              onDetailClick()
            }}
            className="text-xs font-medium hover:underline"
            style={{ color: colors.card.secondaryText }}
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
        <DetailItem
          label="Stage"
          value={<ExplorerBadge value={ce.stage_id} colorType="ce" />}
        />
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
              <div
                key={`${cro.cro_id}-${cro.relationship}`}
                className="p-2 rounded"
                style={{ backgroundColor: columnColors.cro.card.bg }}
              >
                <div className="flex items-center justify-between">
                  <span
                    className="font-mono text-xs"
                    style={{ color: columnColors.cro.card.secondaryText }}
                  >
                    {cro.cro_id}
                  </span>
                  <ExplorerBadge value={cro.relationship} colorType="cro" />
                </div>
                <p
                  className="text-sm mt-1"
                  style={{ color: columnColors.cro.card.primaryText }}
                >
                  {cro.cro_description}
                </p>
              </div>
            ))}
          </div>
        </DetailSection>
      )}

      {relatedActors.length > 0 && (
        <DetailSection title={`Related Actors (${relatedActors.length})`}>
          <div className="space-y-2">
            {relatedActors.map((ac) => (
              <div
                key={`${ac.actor_id}-${ac.role}`}
                className="p-2 rounded"
                style={{ backgroundColor: columnColors.actor.card.bg }}
              >
                <div className="flex items-center justify-between">
                  <span
                    className="font-medium text-sm"
                    style={{ color: columnColors.actor.card.primaryText }}
                  >
                    {ac.actor_id}
                  </span>
                  <ExplorerBadge value={ac.role} colorType="actor" />
                </div>
                {ac.policy_lever && (
                  <p
                    className="text-xs mt-1"
                    style={{ color: columnColors.actor.card.secondaryText }}
                  >
                    {ac.policy_lever}
                  </p>
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
        <DetailItem
          label="Stage"
          value={<ExplorerBadge value={cro.stage_id} colorType="cro" />}
        />
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
              <div
                key={`${ce.ce_id}-${ce.relationship}`}
                className="p-2 rounded"
                style={{ backgroundColor: columnColors.ce.card.bg }}
              >
                <div className="flex items-center justify-between">
                  <span
                    className="font-mono text-xs"
                    style={{ color: columnColors.ce.card.secondaryText }}
                  >
                    {ce.ce_id}
                  </span>
                  <ExplorerBadge value={ce.relationship} colorType="ce" />
                </div>
                <p
                  className="text-sm mt-1"
                  style={{ color: columnColors.ce.card.primaryText }}
                >
                  {ce.ce_description}
                </p>
              </div>
            ))}
          </div>
        </DetailSection>
      )}

      {relatedBarriers.length > 0 && (
        <DetailSection title={`Barriers (${relatedBarriers.length})`}>
          <div className="space-y-2">
            {relatedBarriers.map((b) => (
              <div
                key={b.barrier_id}
                className="p-2 rounded"
                style={{ backgroundColor: columnColors.barrier.card.bg }}
              >
                <div className="flex items-center justify-between">
                  <span
                    className="font-mono text-xs"
                    style={{ color: columnColors.barrier.card.secondaryText }}
                  >
                    {b.barrier_id}
                  </span>
                  {b.barrier_type && (
                    <ExplorerBadge
                      value={b.barrier_type}
                      colorType="barrier"
                      barrierType={b.barrier_type}
                    />
                  )}
                </div>
                <p
                  className="text-sm mt-1"
                  style={{ color: columnColors.barrier.card.primaryText }}
                >
                  {b.short_name || b.description}
                </p>
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
        <DetailItem
          label="Type"
          value={
            <ExplorerBadge
              value={barrier.barrier_type}
              colorType="barrier"
              barrierType={barrier.barrier_type || undefined}
            />
          }
        />
        <DetailItem
          label="Scope"
          value={<ExplorerBadge value={barrier.barrier_scope} colorType="barrier" />}
        />
        <DetailItem
          label="Feasibility Horizon"
          value={<ExplorerBadge value={barrier.feasibility_horizon} colorType="barrier" />}
        />
        <DetailItem
          label="Lever Type"
          value={<ExplorerBadge value={barrier.lever_type} colorType="barrier" />}
        />
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
              <div
                key={`${ce.ce_id}-${ce.role}`}
                className="p-2 rounded"
                style={{ backgroundColor: columnColors.ce.card.bg }}
              >
                <div className="flex items-center justify-between">
                  <span
                    className="font-mono text-xs"
                    style={{ color: columnColors.ce.card.secondaryText }}
                  >
                    {ce.ce_id}
                  </span>
                  <div className="flex items-center gap-2">
                    <span
                      className="text-xs"
                      style={{ color: columnColors.ce.card.secondaryText }}
                    >
                      {formatCurrency(ce.ce_estimate)}
                    </span>
                    <ExplorerBadge value={ce.role} colorType="ce" />
                  </div>
                </div>
                <p
                  className="text-sm mt-1"
                  style={{ color: columnColors.ce.card.primaryText }}
                >
                  {ce.ce_description}
                </p>
                {ce.policy_lever && (
                  <p
                    className="text-xs mt-1"
                    style={{ color: columnColors.ce.card.secondaryText }}
                  >
                    Lever: {ce.policy_lever}
                  </p>
                )}
              </div>
            ))}
          </div>
        </DetailSection>
      )}
    </>
  )
}
