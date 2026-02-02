import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'
import StatCard from '../components/StatCard'
import ModelSelector from '../components/ModelSelector'
import VersionStamp from '../components/VersionStamp'
import { useMasterCounts, useSummaryStats, useCostElements, useBarriers } from '../hooks/useData'

const COLORS = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#6366f1']

// Extended color palette for stacked bars
const STACKED_COLORS = [
  '#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#6366f1',
  '#14b8a6', '#f97316', '#ec4899', '#84cc16', '#06b6d4', '#a855f7',
  '#22c55e', '#eab308', '#0ea5e9', '#d946ef', '#64748b', '#fb7185',
  '#4ade80', '#facc15', '#38bdf8', '#c084fc', '#94a3b8', '#f472b6',
]

export default function Dashboard() {
  // Master counts (framework totals - not scenario-dependent)
  const masterCounts = useMasterCounts()

  // Scenario-specific data
  const { data: stats, loading: statsLoading } = useSummaryStats()
  const { data: costElements, loading: ceLoading } = useCostElements()
  const { data: barriers, loading: barriersLoading } = useBarriers()

  // Aggregate cost elements by stage
  const costsByStage = useMemo(() => {
    const grouped = costElements.reduce(
      (acc, ce) => {
        const stage = ce.stage_id || 'Other'
        if (!acc[stage]) acc[stage] = 0
        acc[stage] += ce.estimate || 0
        return acc
      },
      {} as Record<string, number>
    )

    return Object.entries(grouped)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
  }, [costElements])

  // Aggregate barriers by type
  const barriersByType = useMemo(() => {
    const grouped = barriers.reduce(
      (acc, b) => {
        const type = b.barrier_type || 'Other'
        if (!acc[type]) acc[type] = 0
        acc[type]++
        return acc
      },
      {} as Record<string, number>
    )

    return Object.entries(grouped).map(([name, value]) => ({ name, value }))
  }, [barriers])

  // Aggregate barriers by scope
  const barriersByScope = useMemo(() => {
    const grouped = barriers.reduce(
      (acc, b) => {
        const scope = b.barrier_scope || 'Other'
        if (!acc[scope]) acc[scope] = 0
        acc[scope]++
        return acc
      },
      {} as Record<string, number>
    )

    return Object.entries(grouped).map(([name, value]) => ({ name, value }))
  }, [barriers])

  // Aggregate barriers by feasibility horizon
  const barriersByHorizon = useMemo(() => {
    const grouped = barriers.reduce(
      (acc, b) => {
        const horizon = b.feasibility_horizon || 'Unknown'
        if (!acc[horizon]) acc[horizon] = 0
        acc[horizon]++
        return acc
      },
      {} as Record<string, number>
    )

    return Object.entries(grouped).map(([name, value]) => ({ name, value }))
  }, [barriers])

  // Build cost elements (one-time) - sorted by value descending
  const buildCostElements = useMemo(() => {
    return costElements
      .filter((ce) => ce.stage_id === 'Build' && (ce.estimate || 0) > 0)
      .map((ce) => ({
        name: ce.ce_id,
        value: ce.estimate || 0,
        description: ce.description,
      }))
      .sort((a, b) => b.value - a.value)
  }, [costElements])

  // Stacked bar data for Build costs (vertical)
  const buildStackedData = useMemo(() => {
    const data: Record<string, number | string> = { category: 'Build' }
    buildCostElements.forEach((ce) => {
      data[ce.name] = ce.value
    })
    return [data]
  }, [buildCostElements])

  // Operate + Finance cost elements (monthly)
  const operateFinanceCostElements = useMemo(() => {
    return costElements
      .filter(
        (ce) =>
          (ce.stage_id === 'Operate' || ce.stage_id === 'Finance') &&
          (ce.annual_estimate || ce.estimate || 0) > 0
      )
      .map((ce) => {
        // Convert annual to monthly, or use estimate if it's a monthly figure
        const monthlyValue = ce.annual_estimate
          ? ce.annual_estimate / 12
          : (ce.estimate || 0) / 12
        return {
          name: ce.ce_id,
          value: monthlyValue,
          description: ce.description,
          stage: ce.stage_id,
        }
      })
      .sort((a, b) => b.value - a.value)
  }, [costElements])

  // Stacked bar data for Operate + Finance costs (vertical)
  const operateFinanceStackedData = useMemo(() => {
    const data: Record<string, number | string> = { category: 'Monthly' }
    operateFinanceCostElements.forEach((ce) => {
      data[ce.name] = ce.value
    })
    return [data]
  }, [operateFinanceCostElements])

  // Monthly payment breakdown for the table
  const monthlyPaymentData = useMemo(() => {
    // Find principal payment (usually "Mortgage principal payment" or similar)
    const principalElement = costElements.find(
      (ce) =>
        ce.ce_id.toLowerCase().includes('principal') ||
        ce.description?.toLowerCase().includes('principal')
    )
    const principalMonthly = principalElement
      ? (principalElement.annual_estimate || principalElement.estimate || 0) / 12
      : 0

    // Calculate total monthly from Operate + Finance
    const totalMonthly = operateFinanceCostElements.reduce((sum, ce) => sum + ce.value, 0)

    // Non-principal = total - principal
    const nonPrincipalMonthly = totalMonthly - principalMonthly

    return {
      principal: principalMonthly,
      nonPrincipal: nonPrincipalMonthly,
      total: totalMonthly,
    }
  }, [costElements, operateFinanceCostElements])

  // State for notes (editable in future, static for now)
  const [paymentNotes] = useState({
    principal: 'Builds equity in the home',
    nonPrincipal: 'Interest, taxes, insurance, maintenance, utilities',
    total: 'Total monthly housing cost',
  })

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)

  const scenarioDataLoading = statsLoading || ceLoading || barriersLoading

  // Calculate totals for the vertical bars
  const buildTotal = buildCostElements.reduce((sum, ce) => sum + ce.value, 0)
  const monthlyTotal = operateFinanceCostElements.reduce((sum, ce) => sum + ce.value, 0)

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard<VersionStamp /></h1>
        <p className="mt-1 text-gray-500">
          Overview of housing costs, reduction opportunities, and barriers
        </p>
      </div>

      {/* ============================================ */}
      {/* SECTION 1: FRAMEWORK OVERVIEW (Master Counts) */}
      {/* ============================================ */}
      <div>
        <h2 className="text-lg font-semibold text-gray-700 mb-4">Framework Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Link to="/cost-elements">
            <StatCard
              title="Cost Elements"
              value={masterCounts.loading ? '...' : masterCounts.costElements}
              subtitle="Build, Operate, Finance"
              color="blue"
            />
          </Link>
          <Link to="/opportunities">
            <StatCard
              title="Reduction Opportunities"
              value={masterCounts.loading ? '...' : masterCounts.cros}
              subtitle="Ways to reduce costs"
              color="green"
            />
          </Link>
          <Link to="/barriers">
            <StatCard
              title="Barriers"
              value={masterCounts.loading ? '...' : masterCounts.barriers}
              subtitle="Blocking cost reductions"
              color="yellow"
            />
          </Link>
          <Link to="/actors">
            <StatCard
              title="Actors"
              value={masterCounts.loading ? '...' : masterCounts.actors}
              subtitle="Who controls costs"
              color="purple"
            />
          </Link>
        </div>
      </div>

      {/* ============================================ */}
      {/* SECTION 2: MODEL ANALYSIS */}
      {/* ============================================ */}
      <div className="pt-4 border-t border-gray-200">
        {/* Model Selector */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-700">Model Analysis</h2>
          <ModelSelector variant="prominent" label="Viewing" />
        </div>

        {scenarioDataLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="text-gray-500">Loading scenario data...</div>
          </div>
        ) : (
          <>
            {/* Cost Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Total One-Time Costs</h3>
                <p className="text-3xl font-bold text-blue-600">
                  {formatCurrency(stats?.total_onetime_costs || 0)}
                </p>
                <p className="text-sm text-gray-500 mt-1">Per home (Build + Finance)</p>
              </div>
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Total Annual Costs</h3>
                <p className="text-3xl font-bold text-green-600">
                  {formatCurrency(stats?.total_annual_costs || 0)}
                </p>
                <p className="text-sm text-gray-500 mt-1">Per home per year (Operate)</p>
              </div>
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Potential Savings</h3>
                <p className="text-3xl font-bold text-emerald-600">
                  {formatCurrency(stats?.total_potential_savings || 0)}
                </p>
                <p className="text-sm text-gray-500 mt-1">If all CROs implemented</p>
              </div>
            </div>

            {/* Cost Breakdown Section: Two Vertical Bar Charts + Monthly Payment Summary */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Build Cost Element Breakdown (Vertical Stacked Bar) */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Build Costs
                </h3>
                <p className="text-sm text-gray-500 mb-4">One-time • {formatCurrency(buildTotal)}</p>
                <div className="flex justify-center">
                  <ResponsiveContainer width={120} height={280}>
                    <BarChart data={buildStackedData} barSize={80}>
                      <YAxis
                        type="number"
                        tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                        width={50}
                        axisLine={false}
                        tickLine={false}
                      />
                      <XAxis dataKey="category" type="category" hide />
                      <Tooltip
                        formatter={(value: number, name: string) => [formatCurrency(value), name]}
                        labelStyle={{ fontWeight: 'bold' }}
                      />
                      {buildCostElements.map((ce, index) => (
                        <Bar
                          key={ce.name}
                          dataKey={ce.name}
                          stackId="build"
                          fill={STACKED_COLORS[index % STACKED_COLORS.length]}
                        />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 space-y-1">
                  {buildCostElements.slice(0, 6).map((ce, index) => (
                    <div key={ce.name} className="flex items-center text-xs">
                      <div
                        className="w-3 h-3 rounded mr-2 flex-shrink-0"
                        style={{ backgroundColor: STACKED_COLORS[index % STACKED_COLORS.length] }}
                      />
                      <span className="text-gray-600 truncate flex-1">{ce.name}</span>
                      <span className="ml-1 text-gray-400 flex-shrink-0">{formatCurrency(ce.value)}</span>
                    </div>
                  ))}
                  {buildCostElements.length > 6 && (
                    <div className="text-xs text-gray-400 pl-5">
                      +{buildCostElements.length - 6} more
                    </div>
                  )}
                </div>
              </div>

              {/* Operate + Finance Cost Element Breakdown (Vertical Stacked Bar) */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Monthly Costs
                </h3>
                <p className="text-sm text-gray-500 mb-4">Operate + Finance • {formatCurrency(monthlyTotal)}/mo</p>
                <div className="flex justify-center">
                  <ResponsiveContainer width={120} height={280}>
                    <BarChart data={operateFinanceStackedData} barSize={80}>
                      <YAxis
                        type="number"
                        tickFormatter={(v) => `$${v.toFixed(0)}`}
                        width={50}
                        axisLine={false}
                        tickLine={false}
                      />
                      <XAxis dataKey="category" type="category" hide />
                      <Tooltip
                        formatter={(value: number, name: string) => [formatCurrency(value), name]}
                        labelStyle={{ fontWeight: 'bold' }}
                      />
                      {operateFinanceCostElements.map((ce, index) => (
                        <Bar
                          key={ce.name}
                          dataKey={ce.name}
                          stackId="monthly"
                          fill={STACKED_COLORS[index % STACKED_COLORS.length]}
                        />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 space-y-1">
                  {operateFinanceCostElements.slice(0, 6).map((ce, index) => (
                    <div key={ce.name} className="flex items-center text-xs">
                      <div
                        className="w-3 h-3 rounded mr-2 flex-shrink-0"
                        style={{ backgroundColor: STACKED_COLORS[index % STACKED_COLORS.length] }}
                      />
                      <span className="text-gray-600 truncate flex-1">{ce.name}</span>
                      <span className="ml-1 text-gray-400 flex-shrink-0">{formatCurrency(ce.value)}</span>
                    </div>
                  ))}
                  {operateFinanceCostElements.length > 6 && (
                    <div className="text-xs text-gray-400 pl-5">
                      +{operateFinanceCostElements.length - 6} more
                    </div>
                  )}
                </div>
              </div>

              {/* Monthly Payment Summary Table */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Payment Summary</h3>
                <div className="space-y-4">
                  <div className="border-b border-gray-100 pb-4">
                    <div className="text-sm text-gray-600">Principal Payment</div>
                    <div className="text-xl font-semibold text-blue-600 mt-1">
                      {formatCurrency(monthlyPaymentData.principal)}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">{paymentNotes.principal}</div>
                  </div>
                  <div className="border-b border-gray-100 pb-4">
                    <div className="text-sm text-gray-600">Excluding Principal</div>
                    <div className="text-xl font-semibold text-orange-600 mt-1">
                      {formatCurrency(monthlyPaymentData.nonPrincipal)}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">{paymentNotes.nonPrincipal}</div>
                  </div>
                  <div className="bg-gray-50 -mx-6 -mb-6 px-6 py-4 rounded-b-lg">
                    <div className="text-sm font-medium text-gray-700">Total Monthly</div>
                    <div className="text-2xl font-bold text-green-600 mt-1">
                      {formatCurrency(monthlyPaymentData.total)}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">{paymentNotes.total}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Charts Row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
              {/* Costs by Stage */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Costs by Stage</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={costsByStage} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                    <YAxis dataKey="name" type="category" width={80} />
                    <Tooltip
                      formatter={(value: number) => formatCurrency(value)}
                      labelStyle={{ fontWeight: 'bold' }}
                    />
                    <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Barriers by Type */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Barriers by Type</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={barriersByType}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {barriersByType.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Charts Row 2 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
              {/* Barriers by Scope */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Barriers by Scope</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={barriersByScope}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} interval={0} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Barriers by Feasibility Horizon */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Barriers by Feasibility Horizon</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={barriersByHorizon}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      fill="#8884d8"
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      <Cell fill="#10b981" /> {/* Near - Green */}
                      <Cell fill="#f59e0b" /> {/* Medium - Yellow */}
                      <Cell fill="#ef4444" /> {/* Long - Red */}
                      <Cell fill="#6b7280" /> {/* Unknown - Gray */}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Quick Links */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Explore the Framework</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            to="/cost-elements"
            className="p-4 border border-gray-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-colors"
          >
            <h4 className="font-medium text-gray-900">Cost Elements</h4>
            <p className="text-sm text-gray-500 mt-1">
              Explore all cost components across Build, Operate, and Finance stages
            </p>
          </Link>
          <Link
            to="/opportunities"
            className="p-4 border border-gray-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-colors"
          >
            <h4 className="font-medium text-gray-900">Reduction Opportunities</h4>
            <p className="text-sm text-gray-500 mt-1">
              Discover ways to reduce housing costs and their potential savings
            </p>
          </Link>
          <Link
            to="/barriers"
            className="p-4 border border-gray-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-colors"
          >
            <h4 className="font-medium text-gray-900">Barriers</h4>
            <p className="text-sm text-gray-500 mt-1">
              Understand what blocks cost reductions and how to overcome them
            </p>
          </Link>
        </div>
      </div>
    </div>
  )
}
