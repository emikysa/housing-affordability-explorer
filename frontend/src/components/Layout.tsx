import { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import ModelSummaryBar from './ModelSummaryBar'
import VersionStamp from './VersionStamp'

interface LayoutProps {
  children: ReactNode
}

const navItems = [
  { path: '/overview', label: 'Overview' },
  { path: '/', label: 'Dashboard' },
  { path: '/explorer', label: 'Explorer' },
  { path: '/models', label: 'Models' },
  { path: '/cost-elements', label: 'Costs' },
  { path: '/opportunities', label: 'Opportunities' },
  { path: '/barriers', label: 'Barriers' },
  { path: '/levers', label: 'Levers' },
  { path: '/actors', label: 'Actors' },
  { path: '/relationships', label: 'Relationships' },
]

// Pages where we don't show the header model summary
// (Dashboard has its own full selectors, Models page doesn't need one, Overview is educational)
const pagesWithoutHeaderSelector = ['/', '/models', '/overview']

export default function Layout({ children }: LayoutProps) {
  const location = useLocation()

  const showHeaderSelector = !pagesWithoutHeaderSelector.includes(location.pathname)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <svg className="w-8 h-8 text-primary-600" viewBox="0 0 100 100" fill="currentColor">
                <rect width="100" height="100" rx="10" />
                <path d="M50 20L20 45V80H40V60H60V80H80V45L50 20Z" fill="white" />
              </svg>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold text-gray-900">Housing Affordability Framework</h1>
                  <span className="px-2.5 py-0.5 text-xs font-medium bg-amber-100 text-amber-800 rounded-full border border-amber-300">
                    <strong>Early Preview</strong> — under active development. Content is incomplete, features may not work, and data may change.
                  </span>
                </div>
                <p className="text-xs text-gray-500">
                  Understanding costs, opportunities, and barriers
                  <VersionStamp className="ml-1" />
                </p>
              </div>
            </div>

            {/* Model Summary Bar - compact display with Configure button */}
            {showHeaderSelector && <ModelSummaryBar />}
          </div>
        </div>

        {/* Navigation */}
        <nav className="bg-gray-50 border-t border-gray-200">
          <div className="w-full px-4 sm:px-6 lg:px-8">
            <div className="flex space-x-1 overflow-x-auto py-2">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${
                    location.pathname === item.path
                      ? 'bg-primary-100 text-primary-700'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </nav>
      </header>

      {/* Main Content */}
      <main className="w-full px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-auto">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-4">
          <p className="text-center text-sm text-gray-500">
            Housing Affordability Framework
          </p>
        </div>
      </footer>
    </div>
  )
}
