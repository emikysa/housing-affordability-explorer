import { useState, useMemo } from 'react'
import {
  useCostElements,
  useCostReductionOpportunities,
  useBarriers,
  useActors,
  useCroImpacts,
  useActorControls,
  useLevers,
  useBarrierLevers,
} from '../hooks/useData'
import type {
  CostElement,
  CostReductionOpportunity,
  Barrier,
  Actor,
  CroImpact,
  ActorControl,
  Lever,
  BarrierLever,
} from '../types/database'
import DetailPanel, { Backdrop, DetailItem, DetailSection } from '../components/DetailPanel'
import VersionStamp from '../components/VersionStamp'

type SelectionType = 'ce' | 'cro' | 'barrier' | 'lever' | 'actor' | null
type SelectedItem = {
  type: SelectionType
  id: string
}

type SortMode = 'alpha' | 'value'

// Semantic color types for Explorer columns
type ColumnColorType = 'ce' | 'cro' | 'barrier' | 'lever' | 'actor'

export default function Explorer() {
  const { data: costElements, loading: ceLoading } = useCostElements()
  const { data: cros, loading: croLoading } = useCostReductionOpportunities()
  const { data: barriers, loading: barrierLoading } = useBarriers()
  const { data: levers, loading: leverLoading } = useLevers()
  const { data: actors, loading: actorLoading } = useActors()
  const { data: croImpacts } = useCroImpacts()
  const { data: actorControls } = useActorControls()
  const { data: barrierLevers } = useBarrierLevers()

  const [selected, setSelected] = useState<SelectedItem | null>(null)
  const [sortMode, setSortMode] = useState<SortMode>('alpha')
  const [detailItem, setDetailItem] = useState<{
    type: SelectionType
    data: CostElement | CostReductionOpportunity | Barrier | Lever | Actor
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

  // Barrier-Lever relationship maps
  const barrierToLevers = useMemo(() => {
    const map = new Map<string, Set<string>>()
    barrierLevers.forEach((bl) => {
      if (!map.has(bl.barrier_id)) map.set(bl.barrier_id, new Set())
      map.get(bl.barrier_id)!.add(bl.lever_id)
    })
    return map
  }, [barrierLevers])

  const leverToBarriers = useMemo(() => {
    const map = new Map<string, Set<string>>()
    barrierLevers.forEach((bl) => {
      if (!map.has(bl.lever_id)) map.set(bl.lever_id, new Set())
      map.get(bl.lever_id)!.add(bl.barrier_id)
    })
    return map
  }, [barrierLevers])

  // Compute filtered data based on selection
  const filteredData = useMemo(() => {
    if (!selected) {
      return {
        ces: costElements,
        cros: cros,
        barriers: barriers,
        levers: levers,
        actors: actors,
      }
    }

    let filteredCes = new Set<string>()
    let filteredCros = new Set<string>()
    let filteredBarriers = new Set<string>()
    let filteredLevers = new Set<string>()
    let filteredActors = new Set<string>()

    // Helper to add levers for a set of barriers
    const addLeversForBarriers = (barrierIds: Set<string>) => {
      barrierIds.forEach((bid) => {
        const leverIds = barrierToLevers.get(bid) || new Set()
        leverIds.forEach((lid) => filteredLevers.add(lid))
      })
    }

    switch (selected.type) {
      case 'ce': {
        // CE selected: show related CROs, their barriers, levers for those barriers, and related actors
        filteredCes.add(selected.id)
        const relatedCros = ceToCros.get(selected.id) || new Set()
        relatedCros.forEach((croId) => {
          filteredCros.add(croId)
          const croBarriers = croToBarriers.get(croId) || new Set()
          croBarriers.forEach((b) => filteredBarriers.add(b))
        })
        addLeversForBarriers(filteredBarriers)
        const relatedActors = ceToActors.get(selected.id) || new Set()
        relatedActors.forEach((a) => filteredActors.add(a))
        break
      }
      case 'cro': {
        // CRO selected: show related CEs, barriers for this CRO, levers, actors for those CEs
        filteredCros.add(selected.id)
        const relatedCes = croToCes.get(selected.id) || new Set()
        relatedCes.forEach((ceId) => {
          filteredCes.add(ceId)
          const ceActors = ceToActors.get(ceId) || new Set()
          ceActors.forEach((a) => filteredActors.add(a))
        })
        const croBarriers = croToBarriers.get(selected.id) || new Set()
        croBarriers.forEach((b) => filteredBarriers.add(b))
        addLeversForBarriers(filteredBarriers)
        break
      }
      case 'barrier': {
        // Barrier selected: show its CRO, CRO's CEs, levers for this barrier, actors for those CEs
        filteredBarriers.add(selected.id)
        const barrierLevers = barrierToLevers.get(selected.id) || new Set()
        barrierLevers.forEach((lid) => filteredLevers.add(lid))
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
      case 'lever': {
        // Lever selected: show barriers it addresses, their CROs, CRO's CEs, and actors
        filteredLevers.add(selected.id)
        const relatedBarriers = leverToBarriers.get(selected.id) || new Set()
        relatedBarriers.forEach((barrierId) => {
          filteredBarriers.add(barrierId)
          const croId = barrierToCro.get(barrierId)
          if (croId) {
            filteredCros.add(croId)
            const relatedCes = croToCes.get(croId) || new Set()
            relatedCes.forEach((ceId) => {
              filteredCes.add(ceId)
              const ceActors = ceToActors.get(ceId) || new Set()
              ceActors.forEach((a) => filteredActors.add(a))
            })
          }
        })
        break
      }
      case 'actor': {
        // Actor selected: show CEs they control, CROs for those CEs, barriers, levers for those CROs
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
        addLeversForBarriers(filteredBarriers)
        break
      }
    }

    return {
      ces: costElements.filter((ce) => filteredCes.has(ce.ce_id)),
      cros: cros.filter((cro) => filteredCros.has(cro.cro_id)),
      barriers: barriers.filter((b) => filteredBarriers.has(b.barrier_id)),
      levers: levers.filter((l) => filteredLevers.has(l.lever_id)),
      actors: actors.filter((a) => filteredActors.has(a.actor_id)),
    }
  }, [
    selected,
    costElements,
    cros,
    barriers,
    levers,
    actors,
    ceToCros,
    croToCes,
    croToBarriers,
    barrierToCro,
    barrierToLevers,
    leverToBarriers,
    ceToActors,
    actorToCes,
  ])

  // Sort filtered data based on sort mode
  const sortedData = useMemo(() => {
    const sortAlpha = <T extends { [key: string]: unknown }>(arr: T[], key: string) =>
      [...arr].sort((a, b) => String(a[key]).localeCompare(String(b[key])))

    const sortByValue = <T extends { [key: string]: unknown }>(
      arr: T[],
      valueKey: string
    ) =>
      [...arr].sort((a, b) => {
        const aVal = (a[valueKey] as number) || 0
        const bVal = (b[valueKey] as number) || 0
        return bVal - aVal // Descending
      })

    if (sortMode === 'alpha') {
      return {
        ces: sortAlpha(filteredData.ces, 'ce_id'),
        cros: sortAlpha(filteredData.cros, 'cro_id'),
        barriers: sortAlpha(filteredData.barriers, 'barrier_id'),
        levers: sortAlpha(filteredData.levers, 'lever_id'),
        actors: sortAlpha(filteredData.actors, 'actor_id'),
      }
    } else {
      // Sort by value descending (for items without values, put at end)
      return {
        ces: sortByValue(filteredData.ces, 'estimate'),
        cros: sortByValue(filteredData.cros, 'estimate'),
        barriers: sortAlpha(filteredData.barriers, 'barrier_id'), // Barriers don't have values
        levers: sortByValue(filteredData.levers, 'barrier_count'), // Levers sorted by barrier count
        actors: sortAlpha(filteredData.actors, 'actor_id'), // Actors don't have values
      }
    }
  }, [filteredData, sortMode])

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
    data: CostElement | CostReductionOpportunity | Barrier | Lever | Actor
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

  const loading = ceLoading || croLoading || barrierLoading || leverLoading || actorLoading

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

  const getRelatedBarriersForLever = (leverId: string) =>
    barrierLevers.filter((bl) => bl.lever_id === leverId)

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Explorer<VersionStamp /></h1>
          <p className="mt-1 text-gray-500">
            Click any item to filter related elements across all columns. Click again to clear.
          </p>
        </div>
        {/* Sort Toggle */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Sort:</span>
          <div className="inline-flex rounded-md shadow-sm" role="group">
            <button
              type="button"
              onClick={() => setSortMode('alpha')}
              className={`px-3 py-1.5 text-xs font-medium rounded-l-md border ${
                sortMode === 'alpha'
                  ? 'bg-primary-50 border-primary-300 text-primary-700'
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              A-Z
            </button>
            <button
              type="button"
              onClick={() => setSortMode('value')}
              className={`px-3 py-1.5 text-xs font-medium rounded-r-md border-t border-r border-b -ml-px ${
                sortMode === 'value'
                  ? 'bg-primary-50 border-primary-300 text-primary-700'
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              By Value
            </button>
          </div>
        </div>
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
        <div className="grid grid-cols-5 gap-3" style={{ height: 'calc(100vh - 280px)' }}>
          {/* Cost Elements Column - Gray (Neutral) */}
          <ExplorerColumn
            title="Costs"
            count={sortedData.ces.length}
            totalCount={costElements.length}
            colorType="ce"
          >
            {sortedData.ces.map((ce) => (
              <CeCard
                key={ce.ce_id}
                ce={ce}
                isSelected={isSelected('ce', ce.ce_id)}
                onClick={() => handleItemClick('ce', ce.ce_id)}
                onDetailClick={() => handleDetailClick('ce', ce)}
                formatCurrency={formatCurrency}
              />
            ))}
          </ExplorerColumn>

          {/* CROs Column - Green (Opportunity) */}
          <ExplorerColumn
            title="Opportunities"
            count={sortedData.cros.length}
            totalCount={cros.length}
            colorType="cro"
          >
            {sortedData.cros.map((cro) => (
              <CroCard
                key={cro.cro_id}
                cro={cro}
                isSelected={isSelected('cro', cro.cro_id)}
                onClick={() => handleItemClick('cro', cro.cro_id)}
                onDetailClick={() => handleDetailClick('cro', cro)}
                formatCurrency={formatCurrency}
              />
            ))}
          </ExplorerColumn>

          {/* Barriers Column - Amber (Friction) */}
          <ExplorerColumn
            title="Barriers"
            count={sortedData.barriers.length}
            totalCount={barriers.length}
            colorType="barrier"
          >
            {sortedData.barriers.map((barrier) => (
              <BarrierCard
                key={barrier.barrier_id}
                barrier={barrier}
                isSelected={isSelected('barrier', barrier.barrier_id)}
                onClick={() => handleItemClick('barrier', barrier.barrier_id)}
                onDetailClick={() => handleDetailClick('barrier', barrier)}
              />
            ))}
          </ExplorerColumn>

          {/* Levers Column - Purple (Solutions) */}
          <ExplorerColumn
            title="Levers"
            count={sortedData.levers.length}
            totalCount={levers.length}
            colorType="lever"
          >
            {sortedData.levers.map((lever) => (
              <LeverCard
                key={lever.lever_id}
                lever={lever}
                isSelected={isSelected('lever', lever.lever_id)}
                onClick={() => handleItemClick('lever', lever.lever_id)}
                onDetailClick={() => handleDetailClick('lever', lever)}
              />
            ))}
          </ExplorerColumn>

          {/* Actors Column - Blue (Agency) */}
          <ExplorerColumn
            title="Actors"
            count={sortedData.actors.length}
            totalCount={actors.length}
            colorType="actor"
          >
            {sortedData.actors.map((actor) => (
              <ActorCard
                key={actor.actor_id}
                actor={actor}
                isSelected={isSelected('actor', actor.actor_id)}
                onClick={() => handleItemClick('actor', actor.actor_id)}
                onDetailClick={() => handleDetailClick('actor', actor)}
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
            {detailItem.type === 'lever' && (
              <LeverDetail
                lever={detailItem.data as Lever}
                relatedBarriers={getRelatedBarriersForLever((detailItem.data as Lever).lever_id)}
              />
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
  // Levers - Purple (Solutions, interventions)
  lever: {
    header: { bg: '#EDE9FE', text: '#5B21B6', border: '#A78BFA' },
    card: { bg: '#F5F3FF', border: '#A78BFA', primaryText: '#6D28D9', secondaryText: '#7C3AED' },
    badge: { bg: '#DDD6FE', text: '#5B21B6', border: '#A78BFA' },
    selected: { border: '#A78BFA' },
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
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">{children}</div>
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
      className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium"
      style={{
        backgroundColor: badgeColors.bg,
        color: badgeColors.text,
      }}
    >
      {value}
    </span>
  )
}

// Compact CE Card - no stage badge, just ID + description + value
function CeCard({
  ce,
  isSelected,
  onClick,
  onDetailClick,
  formatCurrency,
}: {
  ce: CostElement
  isSelected: boolean
  onClick: () => void
  onDetailClick: () => void
  formatCurrency: (v: number | null | undefined) => string
}) {
  const colors = columnColors.ce

  return (
    <div
      className="rounded p-1.5 cursor-pointer transition-all"
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
      <div className="flex items-start justify-between gap-1">
        <div className="flex-1 min-w-0">
          <div className="text-xs font-mono" style={{ color: colors.card.secondaryText }}>
            {ce.ce_id}
          </div>
          <div
            className="text-xs leading-tight line-clamp-2"
            style={{ color: colors.card.primaryText }}
          >
            {ce.description}
          </div>
        </div>
        <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
          <span className="text-xs font-medium" style={{ color: colors.card.secondaryText }}>
            {formatCurrency(ce.estimate)}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onDetailClick()
            }}
            className="text-xs hover:underline"
            style={{ color: colors.card.secondaryText }}
          >
            Details
          </button>
        </div>
      </div>
    </div>
  )
}

// Compact CRO Card - no stage badge
function CroCard({
  cro,
  isSelected,
  onClick,
  onDetailClick,
  formatCurrency,
}: {
  cro: CostReductionOpportunity
  isSelected: boolean
  onClick: () => void
  onDetailClick: () => void
  formatCurrency: (v: number | null | undefined) => string
}) {
  const colors = columnColors.cro

  return (
    <div
      className="rounded p-1.5 cursor-pointer transition-all"
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
      <div className="flex items-start justify-between gap-1">
        <div className="flex-1 min-w-0">
          <div className="text-xs font-mono" style={{ color: colors.card.secondaryText }}>
            {cro.cro_id}
          </div>
          <div
            className="text-xs leading-tight line-clamp-2"
            style={{ color: colors.card.primaryText }}
          >
            {cro.description}
          </div>
        </div>
        <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
          {cro.estimate && (
            <span className="text-xs font-medium" style={{ color: colors.card.secondaryText }}>
              {formatCurrency(cro.estimate)}
            </span>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation()
              onDetailClick()
            }}
            className="text-xs hover:underline"
            style={{ color: colors.card.secondaryText }}
          >
            Details
          </button>
        </div>
      </div>
    </div>
  )
}

// Compact Barrier Card - ID on first line, short description on second
function BarrierCard({
  barrier,
  isSelected,
  onClick,
  onDetailClick,
}: {
  barrier: Barrier
  isSelected: boolean
  onClick: () => void
  onDetailClick: () => void
}) {
  const colors = columnColors.barrier

  return (
    <div
      className="rounded p-1.5 cursor-pointer transition-all"
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
      <div className="flex items-start justify-between gap-1">
        <div className="flex-1 min-w-0">
          <div className="text-xs font-mono" style={{ color: colors.card.secondaryText }}>
            {barrier.barrier_id}
          </div>
          <div
            className="text-xs leading-tight line-clamp-2"
            style={{ color: colors.card.primaryText }}
          >
            {barrier.description}
          </div>
        </div>
        <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
          {barrier.barrier_type && (
            <span
              className="text-xs px-1 py-0.5 rounded"
              style={{ backgroundColor: colors.badge.bg, color: colors.badge.text }}
            >
              {barrier.barrier_type}
            </span>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation()
              onDetailClick()
            }}
            className="text-xs hover:underline"
            style={{ color: colors.card.secondaryText }}
          >
            Details
          </button>
        </div>
      </div>
    </div>
  )
}

// Compact Lever Card
function LeverCard({
  lever,
  isSelected,
  onClick,
  onDetailClick,
}: {
  lever: Lever
  isSelected: boolean
  onClick: () => void
  onDetailClick: () => void
}) {
  const colors = columnColors.lever

  return (
    <div
      className="rounded p-1.5 cursor-pointer transition-all"
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
      <div className="flex items-start justify-between gap-1">
        <div className="flex-1 min-w-0">
          <div className="text-xs font-mono" style={{ color: colors.card.secondaryText }}>
            {lever.lever_type_id}
          </div>
          <div
            className="text-xs leading-tight line-clamp-2"
            style={{ color: colors.card.primaryText }}
          >
            {lever.name}
          </div>
          {lever.barrier_count > 0 && (
            <div className="text-xs mt-0.5" style={{ color: colors.card.secondaryText }}>
              {lever.barrier_count} barrier{lever.barrier_count !== 1 ? 's' : ''}
            </div>
          )}
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onDetailClick()
          }}
          className="text-xs hover:underline flex-shrink-0"
          style={{ color: colors.card.secondaryText }}
        >
          Details
        </button>
      </div>
    </div>
  )
}

// Compact Actor Card - just ID + description (no duplicate)
function ActorCard({
  actor,
  isSelected,
  onClick,
  onDetailClick,
}: {
  actor: Actor
  isSelected: boolean
  onClick: () => void
  onDetailClick: () => void
}) {
  const colors = columnColors.actor

  return (
    <div
      className="rounded p-1.5 cursor-pointer transition-all"
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
      <div className="flex items-start justify-between gap-1">
        <div className="flex-1 min-w-0">
          <div className="text-xs font-mono font-medium" style={{ color: colors.card.primaryText }}>
            {actor.actor_id}
          </div>
          {actor.description && (
            <div
              className="text-xs leading-tight line-clamp-2"
              style={{ color: colors.card.secondaryText }}
            >
              {actor.description}
            </div>
          )}
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onDetailClick()
          }}
          className="text-xs hover:underline flex-shrink-0"
          style={{ color: colors.card.secondaryText }}
        >
          Details
        </button>
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

function LeverDetail({
  lever,
  relatedBarriers,
}: {
  lever: Lever
  relatedBarriers: BarrierLever[]
}) {
  return (
    <>
      <DetailSection title="Basic Information">
        <DetailItem label="ID" value={lever.lever_id} />
        <DetailItem label="Name" value={lever.name} />
        <DetailItem
          label="Type"
          value={<ExplorerBadge value={lever.lever_type_id} colorType="lever" />}
        />
        <DetailItem label="Description" value={lever.lever_type_description} />
      </DetailSection>

      {(lever.implementation_approach || lever.typical_actors || lever.typical_timeline) && (
        <DetailSection title="Implementation">
          {lever.implementation_approach && (
            <DetailItem label="Approach" value={lever.implementation_approach} />
          )}
          {lever.typical_actors && (
            <DetailItem label="Typical Actors" value={lever.typical_actors} />
          )}
          {lever.typical_timeline && (
            <DetailItem label="Timeline" value={lever.typical_timeline} />
          )}
          {lever.feasibility_notes && (
            <DetailItem label="Feasibility Notes" value={lever.feasibility_notes} />
          )}
        </DetailSection>
      )}

      {relatedBarriers.length > 0 && (
        <DetailSection title={`Related Barriers (${relatedBarriers.length})`}>
          <div className="space-y-2">
            {relatedBarriers.map((bl) => (
              <div
                key={bl.barrier_id}
                className="p-2 rounded"
                style={{ backgroundColor: columnColors.barrier.card.bg }}
              >
                <div className="flex items-center justify-between">
                  <span
                    className="font-mono text-xs"
                    style={{ color: columnColors.barrier.card.secondaryText }}
                  >
                    {bl.barrier_short_name || bl.barrier_id}
                  </span>
                </div>
                <p
                  className="text-sm mt-1"
                  style={{ color: columnColors.barrier.card.primaryText }}
                >
                  {bl.barrier_description}
                </p>
                {bl.relationship_notes && (
                  <p className="text-xs mt-1 italic" style={{ color: columnColors.barrier.card.secondaryText }}>
                    {bl.relationship_notes}
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
