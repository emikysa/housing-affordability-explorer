import { useModel } from '../contexts/ModelContext'

interface ModelSelectorProps {
  /** Display style variant */
  variant?: 'default' | 'prominent'
  /** Optional label to show before the dropdown */
  label?: string
  /** Additional CSS classes */
  className?: string
}

export default function ModelSelector({
  variant = 'default',
  label = 'Model',
  className = '',
}: ModelSelectorProps) {
  const { models, selectedModelId, setSelectedModelId, loading } = useModel()

  if (loading) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <span className="text-sm text-gray-500">Loading models...</span>
      </div>
    )
  }

  const isProminent = variant === 'prominent'

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {label && (
        <label
          htmlFor="model-select"
          className={`text-sm font-medium ${isProminent ? 'text-gray-700' : 'text-gray-600'}`}
        >
          {label}:
        </label>
      )}
      <select
        id="model-select"
        value={selectedModelId}
        onChange={(e) => setSelectedModelId(e.target.value)}
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
        {models.map((model) => (
          <option key={model.scenario_id} value={model.scenario_id}>
            {model.name}
          </option>
        ))}
      </select>
    </div>
  )
}
