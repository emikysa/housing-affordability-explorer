import { ChangeEvent } from 'react'

interface FilterOption {
  value: string
  label: string
}

interface FilterBarProps {
  searchValue: string
  onSearchChange: (value: string) => void
  filters?: Array<{
    id: string
    label: string
    value: string
    options: FilterOption[]
    onChange: (value: string) => void
  }>
  placeholder?: string
}

export default function FilterBar({
  searchValue,
  onSearchChange,
  filters = [],
  placeholder = 'Search...',
}: FilterBarProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
      <div className="flex flex-wrap gap-4 items-center">
        {/* Search Input */}
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              value={searchValue}
              onChange={(e: ChangeEvent<HTMLInputElement>) => onSearchChange(e.target.value)}
              placeholder={placeholder}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
            />
          </div>
        </div>

        {/* Filter Dropdowns */}
        {filters.map((filter) => (
          <div key={filter.id} className="min-w-[150px]">
            <label className="block text-xs font-medium text-gray-500 mb-1">{filter.label}</label>
            <select
              value={filter.value}
              onChange={(e: ChangeEvent<HTMLSelectElement>) => filter.onChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm bg-white"
            >
              <option value="">All</option>
              {filter.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        ))}

        {/* Clear Filters Button */}
        {(searchValue || filters.some((f) => f.value)) && (
          <button
            onClick={() => {
              onSearchChange('')
              filters.forEach((f) => f.onChange(''))
            }}
            className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Clear filters
          </button>
        )}
      </div>
    </div>
  )
}
