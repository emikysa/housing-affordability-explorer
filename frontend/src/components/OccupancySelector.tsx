import { useOccupancy } from '../contexts/OccupancyContext'

interface OccupancySelectorProps {
  /** Display style variant */
  variant?: 'default' | 'prominent'
  /** Optional label to show before the dropdown */
  label?: string
  /** Additional CSS classes */
  className?: string
}

export default function OccupancySelector({
  variant = 'default',
  label = 'Occupancy',
  className = '',
}: OccupancySelectorProps) {
  const { occupancyModels, selectedOccupancyModelId, setSelectedOccupancyModelId, loading } = useOccupancy()

  if (loading) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <span className="text-sm text-gray-500">Loading...</span>
      </div>
    )
  }

  const isProminent = variant === 'prominent'

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {label && (
        <label
          htmlFor="occupancy-select"
          className={`text-sm font-medium ${isProminent ? 'text-gray-700' : 'text-gray-600'}`}
        >
          {label}:
        </label>
      )}
      <select
        id="occupancy-select"
        value={selectedOccupancyModelId}
        onChange={(e) => setSelectedOccupancyModelId(e.target.value)}
        className={`
          rounded-md border text-sm font-medium
          focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500
          ${
            isProminent
              ? 'px-4 py-2 border-gray-300 bg-white shadow-sm text-gray-900'
              : 'px-3 py-1.5 border-gray-200 bg-gray-50 text-gray-700'
          }
        `}
      >
        {occupancyModels.map((model) => (
          <option key={model.id} value={model.id}>
            {model.name} ({model.total_occupants} {model.total_occupants === 1 ? 'person' : 'people'})
          </option>
        ))}
      </select>
    </div>
  )
}
