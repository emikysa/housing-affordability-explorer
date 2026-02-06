import { useRisk } from '../contexts/RiskContext'

interface RiskSelectorProps {
  variant?: 'default' | 'prominent'
  label?: string
}

export default function RiskSelector({ variant = 'default', label }: RiskSelectorProps) {
  const { riskModels, selectedRiskModelId, setSelectedRiskModelId, loading } = useRisk()

  if (loading) {
    return <span className="text-sm text-gray-400">Loading...</span>
  }

  if (variant === 'prominent') {
    return (
      <div className="flex items-center gap-2">
        {label !== undefined && (
          <span className="text-sm text-gray-600">{label}</span>
        )}
        <select
          value={selectedRiskModelId}
          onChange={(e) => setSelectedRiskModelId(e.target.value)}
          className="text-sm font-medium border border-red-300 rounded-lg px-3 py-1.5 bg-red-50 text-red-800 focus:ring-2 focus:ring-red-300 focus:border-red-400"
        >
          {riskModels.map((model) => (
            <option key={model.id} value={model.id}>
              {model.name}
            </option>
          ))}
        </select>
      </div>
    )
  }

  return (
    <select
      value={selectedRiskModelId}
      onChange={(e) => setSelectedRiskModelId(e.target.value)}
      className="text-sm border border-gray-300 rounded-md px-2 py-1 bg-white focus:ring-2 focus:ring-red-300 focus:border-red-400"
    >
      {riskModels.map((model) => (
        <option key={model.id} value={model.id}>
          {label !== undefined ? `${label}${model.name}` : model.name}
        </option>
      ))}
    </select>
  )
}
