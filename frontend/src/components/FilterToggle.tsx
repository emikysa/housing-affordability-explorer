interface FilterToggleProps {
  /** Whether to show all items or only populated ones */
  showAll: boolean
  /** Callback when toggle changes */
  onChange: (showAll: boolean) => void
  /** Additional CSS classes */
  className?: string
}

export default function FilterToggle({ showAll, onChange, className = '' }: FilterToggleProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className="text-sm text-gray-600">Show:</span>
      <div className="inline-flex rounded-md shadow-sm" role="group">
        <button
          type="button"
          onClick={() => onChange(false)}
          className={`
            px-3 py-1.5 text-sm font-medium rounded-l-md border
            focus:z-10 focus:outline-none focus:ring-2 focus:ring-primary-500
            ${
              !showAll
                ? 'bg-primary-50 border-primary-300 text-primary-700'
                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
            }
          `}
        >
          Populated only
        </button>
        <button
          type="button"
          onClick={() => onChange(true)}
          className={`
            px-3 py-1.5 text-sm font-medium rounded-r-md border-t border-r border-b -ml-px
            focus:z-10 focus:outline-none focus:ring-2 focus:ring-primary-500
            ${
              showAll
                ? 'bg-primary-50 border-primary-300 text-primary-700'
                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
            }
          `}
        >
          Show all
        </button>
      </div>
    </div>
  )
}
