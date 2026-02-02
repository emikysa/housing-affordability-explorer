import { Link } from 'react-router-dom'
import StatCard from '../components/StatCard'
import { useMasterCounts } from '../hooks/useData'

export default function Overview() {
  const masterCounts = useMasterCounts()

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Overview</h1>
        <p className="mt-1 text-gray-500">
          Understanding the Housing Affordability Framework
        </p>
      </div>

      {/* Introduction */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">What is this tool?</h2>
        <div className="prose prose-gray max-w-none">
          <p className="text-gray-600 leading-relaxed">
            The Housing Affordability Explorer helps you understand the full picture of housing costs—from
            land acquisition through construction, financing, and ongoing operations. It maps out the
            opportunities to reduce these costs, the barriers that prevent those reductions, and the
            actors who have the power to make changes.
          </p>
          <p className="text-gray-600 leading-relaxed mt-4">
            Use this tool to explore how different choices affect total housing costs, identify where
            cost savings are possible, and understand what stands in the way of more affordable housing.
          </p>
        </div>
      </div>

      {/* Framework Overview - The Chain */}
      <div className="bg-gradient-to-br from-gray-50 to-slate-50 rounded-lg border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6">The Framework</h2>

        {/* Visual Chain */}
        <div className="flex flex-col md:flex-row items-center justify-center gap-4 mb-8">
          <Link to="/cost-elements" className="flex-1 max-w-[180px] bg-blue-100 border-2 border-blue-300 rounded-lg p-4 text-center hover:bg-blue-200 transition-colors">
            <div className="text-3xl mb-2">💰</div>
            <div className="font-semibold text-blue-800">Cost Elements</div>
            <div className="text-xs text-blue-600 mt-1">What makes up housing cost</div>
          </Link>

          <div className="text-2xl text-gray-400 rotate-90 md:rotate-0">→</div>

          <Link to="/opportunities" className="flex-1 max-w-[180px] bg-green-100 border-2 border-green-300 rounded-lg p-4 text-center hover:bg-green-200 transition-colors">
            <div className="text-3xl mb-2">💡</div>
            <div className="font-semibold text-green-800">Opportunities</div>
            <div className="text-xs text-green-600 mt-1">Ways to reduce costs</div>
          </Link>

          <div className="text-2xl text-gray-400 rotate-90 md:rotate-0">→</div>

          <Link to="/barriers" className="flex-1 max-w-[180px] bg-amber-100 border-2 border-amber-300 rounded-lg p-4 text-center hover:bg-amber-200 transition-colors">
            <div className="text-3xl mb-2">🚧</div>
            <div className="font-semibold text-amber-800">Barriers</div>
            <div className="text-xs text-amber-600 mt-1">What blocks reductions</div>
          </Link>

          <div className="text-2xl text-gray-400 rotate-90 md:rotate-0">→</div>

          <Link to="/levers" className="flex-1 max-w-[180px] bg-purple-100 border-2 border-purple-300 rounded-lg p-4 text-center hover:bg-purple-200 transition-colors">
            <div className="text-3xl mb-2">🔧</div>
            <div className="font-semibold text-purple-800">Levers</div>
            <div className="text-xs text-purple-600 mt-1">Policy interventions</div>
          </Link>

          <div className="text-2xl text-gray-400 rotate-90 md:rotate-0">→</div>

          <Link to="/actors" className="flex-1 max-w-[180px] bg-indigo-100 border-2 border-indigo-300 rounded-lg p-4 text-center hover:bg-indigo-200 transition-colors">
            <div className="text-3xl mb-2">👥</div>
            <div className="font-semibold text-indigo-800">Actors</div>
            <div className="text-xs text-indigo-600 mt-1">Who can make changes</div>
          </Link>
        </div>

        <p className="text-sm text-gray-600 text-center max-w-2xl mx-auto">
          Every housing cost has potential reduction opportunities, but barriers often prevent those
          savings from being realized. Understanding which actors control which levers is key to
          overcoming those barriers.
        </p>
      </div>

      {/* Framework Counts */}
      <div>
        <h2 className="text-lg font-semibold text-gray-700 mb-4">Framework Contents</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
              title="Opportunities"
              value={masterCounts.loading ? '...' : masterCounts.cros}
              subtitle="Ways to reduce costs"
              color="green"
            />
          </Link>
          <Link to="/barriers">
            <StatCard
              title="Barriers"
              value={masterCounts.loading ? '...' : masterCounts.barriers}
              subtitle="Blocking reductions"
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

      {/* Tab Descriptions */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6">How to Use This Tool</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <Link to="/" className="block p-4 border border-gray-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-colors">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <span className="text-primary-600">Dashboard</span>
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Calculate your total monthly housing cost by selecting models for household size,
                lifestyle, utilities, and financing. See how different choices affect the bottom line.
              </p>
            </Link>

            <Link to="/explorer" className="block p-4 border border-gray-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-colors">
              <h3 className="font-semibold text-gray-900">Explorer</h3>
              <p className="text-sm text-gray-600 mt-1">
                Interactive 5-column view showing how costs, opportunities, barriers, levers, and
                actors connect. Click any item to see related elements across all columns.
              </p>
            </Link>

            <Link to="/models" className="block p-4 border border-gray-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-colors">
              <h3 className="font-semibold text-gray-900">Models</h3>
              <p className="text-sm text-gray-600 mt-1">
                View and manage all model types: cost models, occupancy presets, lifestyle profiles,
                utility providers, and finance options.
              </p>
            </Link>

            <Link to="/cost-elements" className="block p-4 border border-gray-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-colors">
              <h3 className="font-semibold text-gray-900">Costs</h3>
              <p className="text-sm text-gray-600 mt-1">
                Drill down into the hierarchical breakdown of housing costs across Build (one-time),
                Operate (ongoing), and Finance (mortgage/closing) stages.
              </p>
            </Link>
          </div>

          <div className="space-y-4">
            <Link to="/opportunities" className="block p-4 border border-gray-200 rounded-lg hover:border-green-300 hover:bg-green-50 transition-colors">
              <h3 className="font-semibold text-gray-900">Opportunities</h3>
              <p className="text-sm text-gray-600 mt-1">
                Browse cost reduction opportunities with their potential savings, affected cost
                elements, and related barriers.
              </p>
            </Link>

            <Link to="/barriers" className="block p-4 border border-gray-200 rounded-lg hover:border-amber-300 hover:bg-amber-50 transition-colors">
              <h3 className="font-semibold text-gray-900">Barriers</h3>
              <p className="text-sm text-gray-600 mt-1">
                Understand what prevents cost reductions: regulatory hurdles, market conditions,
                technical limitations, and more.
              </p>
            </Link>

            <Link to="/levers" className="block p-4 border border-gray-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-colors">
              <h3 className="font-semibold text-gray-900">Levers</h3>
              <p className="text-sm text-gray-600 mt-1">
                Explore policy interventions and actions that can address barriers and enable
                cost reductions.
              </p>
            </Link>

            <Link to="/actors" className="block p-4 border border-gray-200 rounded-lg hover:border-indigo-300 hover:bg-indigo-50 transition-colors">
              <h3 className="font-semibold text-gray-900">Actors</h3>
              <p className="text-sm text-gray-600 mt-1">
                See who controls different aspects of housing costs: government agencies,
                developers, lenders, utilities, and more.
              </p>
            </Link>
          </div>
        </div>
      </div>

      {/* Beta Notice */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <span className="text-2xl">⚠️</span>
          <div>
            <h3 className="font-semibold text-amber-800">Work in Progress</h3>
            <p className="text-sm text-amber-700 mt-1">
              This tool is under active development. Data shown is illustrative and may not reflect
              actual costs in your area. We're continuously adding real data and refining the models.
              Feedback is welcome!
            </p>
          </div>
        </div>
      </div>

      {/* Get Started CTA */}
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
