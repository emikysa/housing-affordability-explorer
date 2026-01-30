import { ReactNode } from 'react'

interface DetailPanelProps {
  title: string
  onClose: () => void
  children: ReactNode
}

export default function DetailPanel({ title, onClose, children }: DetailPanelProps) {
  return (
    <div className="fixed inset-y-0 right-0 w-full max-w-lg bg-white shadow-xl z-50 overflow-hidden flex flex-col">
      {/* Header */}
      <div className="bg-gray-50 border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Close"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">{children}</div>
    </div>
  )
}

// Backdrop overlay
export function Backdrop({ onClick }: { onClick: () => void }) {
  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-25 z-40"
      onClick={onClick}
    />
  )
}

// Detail item component
interface DetailItemProps {
  label: string
  value: ReactNode
  className?: string
}

export function DetailItem({ label, value, className = '' }: DetailItemProps) {
  return (
    <div className={`py-3 border-b border-gray-100 last:border-0 ${className}`}>
      <dt className="text-sm font-medium text-gray-500">{label}</dt>
      <dd className="mt-1 text-sm text-gray-900">{value || <span className="text-gray-400">-</span>}</dd>
    </div>
  )
}

// Section header for grouping detail items
export function DetailSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mt-6 first:mt-0">
      <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3">{title}</h3>
      <dl className="divide-y divide-gray-100">{children}</dl>
    </div>
  )
}
