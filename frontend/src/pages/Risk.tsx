import { Link } from 'react-router-dom'
import { useRisk } from '../contexts/RiskContext'

/** Risk shield icon */
function RiskIcon({ className = 'w-10 h-10' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 3L4 9v8c0 7.5 5.1 14.5 12 16 6.9-1.5 12-8.5 12-16V9L16 3z" />
      <path d="M16 10v6" strokeWidth={2.5} />
      <circle cx="16" cy="20" r="1" fill="currentColor" />
    </svg>
  )
}

const riskParameters = [
  {
    id: 'R1',
    name: 'Schedule Uncertainty',
    subtitle: 'Duration Variance',
    color: 'red',
    bgClass: 'bg-red-50 border-red-200',
    textClass: 'text-red-800',
    accentClass: 'text-red-600',
    description: 'Approval unpredictability, rework risk, supply chain volatility, inspection/enforcement inconsistency.',
    teaching: 'Two projects with the same average timeline but different uncertainty can have very different total costs.',
    affectedCosts: [
      { id: 'F00a02', label: 'Construction interest', note: 'interest accrues for each additional month' },
      { id: 'F00b', label: 'Carry costs', note: 'land carry, taxes, insurance all scale with duration' },
      { id: 'B06e02', label: 'Developer overhead', note: 'longer projects consume more overhead' },
      { id: 'B08a', label: 'Sales holding time', note: 'unsold units carry cost' },
    ],
    field: 'schedule_variance_pct',
    unit: '% duration increase',
  },
  {
    id: 'R2',
    name: 'Cost-of-Capital Risk Premium',
    subtitle: 'Interest Rate Premium',
    color: 'orange',
    bgClass: 'bg-orange-50 border-orange-200',
    textClass: 'text-orange-800',
    accentClass: 'text-orange-600',
    description: 'Market risk, political/regulatory risk, entitlement risk, liquidity risk.',
    teaching: 'Lower risk doesn\'t just reduce fees; it reduces the price of money.',
    affectedCosts: [
      { id: 'F00a02', label: 'Construction loan rates', note: 'riskier projects pay higher rates' },
      { id: 'B06e04', label: 'Equity return targets', note: 'capital demands higher returns for higher risk' },
      { id: 'B07h', label: 'Required contingency', note: 'lenders and investors require larger buffers' },
    ],
    field: 'rate_premium_bps',
    unit: 'basis points',
  },
  {
    id: 'R3',
    name: 'Scope & Cost Uncertainty',
    subtitle: 'Contingency Requirements',
    color: 'amber',
    bgClass: 'bg-amber-50 border-amber-200',
    textClass: 'text-amber-800',
    accentClass: 'text-amber-600',
    description: 'Incomplete design, ambiguous requirements, late-stage changes, interpretation variability.',
    teaching: 'Contingency is not waste \u2014 it is priced uncertainty.',
    affectedCosts: [
      { id: 'B07h01', label: 'Design contingency', note: 'priced uncertainty in design completeness' },
      { id: 'B07h02', label: 'Construction contingency', note: 'priced uncertainty in field conditions' },
      { id: 'B07h04', label: 'Allowances', note: 'placeholder budgets for unresolved selections' },
    ],
    field: 'design_contingency_pct',
    unit: '% of hard costs',
  },
  {
    id: 'R4',
    name: 'Market Absorption / Exit Risk',
    subtitle: 'Sales & Marketing Risk',
    color: 'purple',
    bgClass: 'bg-purple-50 border-purple-200',
    textClass: 'text-purple-800',
    accentClass: 'text-purple-600',
    description: 'Uncertainty about if, when, and at what price a unit will sell.',
    teaching: 'A unit can be inexpensive to build and still expensive to buy if exit risk is high.',
    affectedCosts: [
      { id: 'B08a', label: 'Marketing spend', note: 'harder-to-sell units require more marketing' },
      { id: 'B08d', label: 'Seller concessions', note: 'market softness drives concessions' },
      { id: 'F00b', label: 'Carry costs during sales', note: 'unsold inventory carries interest and taxes' },
      { id: 'B06e04', label: 'Required return', note: 'exit risk is a major component of required return' },
    ],
    field: 'marketing_multiplier',
    unit: 'multiplier',
  },
]

export default function Risk() {
  const { riskModels, selectedRiskModel } = useRisk()

  return (
    <div className="max-w-5xl space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Risk Framework</h1>
        <p className="mt-1 text-gray-500">
          Understanding how uncertainty affects housing costs
        </p>
      </div>

      {/* Core Principle */}
      <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-lg border border-red-200 p-6">
        <div className="flex items-start gap-4">
          <div className="text-red-600 flex-shrink-0">
            <RiskIcon className="w-12 h-12" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-3">Core Principle</h2>
            <p className="text-gray-700 leading-relaxed text-lg">
              <strong>Risk is not a cost itself.</strong> Risk is priced through time, capital, buffers,
              and transaction friction. These four risk parameters are conceptual multipliers that flow
              through existing cost elements, not new line items.
            </p>
          </div>
        </div>
      </div>

      {/* The Four Risk Parameters */}
      <div>
        <h2 className="text-lg font-semibold text-gray-700 mb-4">The Four Risk Parameters</h2>
        <div className="space-y-6">
          {riskParameters.map((param) => (
            <div key={param.id} className={`rounded-lg border p-6 ${param.bgClass}`}>
              <div className="flex items-start gap-4">
                <div className={`text-3xl font-black ${param.accentClass} flex-shrink-0 w-12`}>
                  {param.id}
                </div>
                <div className="flex-1">
                  <h3 className={`text-lg font-bold ${param.textClass}`}>{param.name}</h3>
                  <p className="text-sm text-gray-500 mb-2">{param.subtitle}</p>
                  <p className="text-gray-700 mb-3">{param.description}</p>

                  {/* Teaching sentence */}
                  <div className="bg-white/60 rounded-lg p-3 mb-4 border border-white/80">
                    <p className={`text-sm font-medium ${param.accentClass} italic`}>
                      "{param.teaching}"
                    </p>
                  </div>

                  {/* Affected cost elements */}
                  <div>
                    <p className="text-sm font-semibold text-gray-600 mb-2">Affected cost elements:</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {param.affectedCosts.map((cost) => (
                        <div key={cost.id} className="flex items-start gap-2 text-sm">
                          <span className="font-mono text-xs bg-white/70 px-1.5 py-0.5 rounded text-gray-600 flex-shrink-0">
                            {cost.id}
                          </span>
                          <span className="text-gray-700">
                            {cost.label} <span className="text-gray-500">— {cost.note}</span>
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Risk Compounding */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Risk Compounding</h2>
        <p className="text-gray-600 leading-relaxed mb-4">
          R1 and R2 interact <strong>multiplicatively</strong>. A project with high schedule uncertainty
          (R1) in a high-rate environment (R2) gets hit twice: longer duration times higher rate. This
          compounding is why process improvements (faster approvals, predictable inspections) can have
          outsized cost impacts relative to their direct fee savings.
        </p>
        <div className="bg-gray-50 rounded-lg p-4 font-mono text-sm text-center">
          <span className="text-red-600">R1 (longer timeline)</span>
          {' '}<span className="text-gray-400">x</span>{' '}
          <span className="text-orange-600">R2 (higher rate)</span>
          {' '}<span className="text-gray-400">=</span>{' '}
          <span className="text-purple-600 font-bold">compounded carry cost</span>
        </div>
      </div>

      {/* Municipal Leverage */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Municipal Leverage — The Key Insight</h2>
        <p className="text-gray-600 leading-relaxed mb-4">
          Many public-sector actions reduce housing cost <strong>not by lowering nominal fees</strong>,
          but by <strong>reducing uncertainty</strong> — shortening timelines, lowering variance, and
          reducing the risk premiums embedded in financing, contingency, and required returns.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="bg-white/70 rounded-lg p-3 text-sm">
            <span className="font-semibold text-gray-800">Permits in 2 weeks vs 12</span>
            <span className="text-gray-500 ml-1">— reduces R1</span>
          </div>
          <div className="bg-white/70 rounded-lg p-3 text-sm">
            <span className="font-semibold text-gray-800">Published, predictable impact fees</span>
            <span className="text-gray-500 ml-1">— reduces R3</span>
          </div>
          <div className="bg-white/70 rounded-lg p-3 text-sm">
            <span className="font-semibold text-gray-800">Consistent code interpretation</span>
            <span className="text-gray-500 ml-1">— reduces R2</span>
          </div>
          <div className="bg-white/70 rounded-lg p-3 text-sm">
            <span className="font-semibold text-gray-800">Strong market demand</span>
            <span className="text-gray-500 ml-1">— reduces R4</span>
          </div>
        </div>
        <p className="text-sm text-blue-700 mt-4 font-medium">
          A jurisdiction with these characteristics will attract capital at lower rates, require smaller
          contingencies, and ultimately deliver cheaper housing — even if its fees are not the lowest.
        </p>
      </div>

      {/* Current Risk Model Presets */}
      {riskModels.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-700 mb-4">Risk Model Presets</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {riskModels.map((model) => {
              const isActive = selectedRiskModel?.id === model.id
              return (
                <div
                  key={model.id}
                  className={`bg-white rounded-lg border-2 p-4 ${
                    isActive ? 'border-red-500 ring-2 ring-red-200' : 'border-gray-200'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-medium text-gray-900">{model.name}</h3>
                    {isActive && (
                      <span className="px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 rounded">
                        Active
                      </span>
                    )}
                  </div>
                  <div className="space-y-1 text-xs text-gray-600">
                    <div className="flex justify-between">
                      <span>R1 Schedule:</span>
                      <span className="font-medium">+{model.schedule_variance_pct}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>R2 Rate premium:</span>
                      <span className="font-medium">+{model.rate_premium_bps} bps</span>
                    </div>
                    <div className="flex justify-between">
                      <span>R3 Contingency:</span>
                      <span className="font-medium">{model.design_contingency_pct}% / {model.construction_contingency_pct}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>R4 Marketing:</span>
                      <span className="font-medium">{model.marketing_multiplier}x + {model.sales_period_months}mo</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          <p className="text-sm text-gray-500 mt-3">
            Select a risk model on the{' '}
            <Link to="/" className="text-primary-600 hover:text-primary-800 underline">Dashboard</Link>
            {' '}or{' '}
            <Link to="/models" className="text-primary-600 hover:text-primary-800 underline">Models</Link>
            {' '}page to see how risk affects total housing cost.
          </p>
        </div>
      )}

      {/* Navigate */}
      <div className="text-center py-4">
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors"
        >
          Go to Dashboard
          <span>→</span>
        </Link>
      </div>
    </div>
  )
}
