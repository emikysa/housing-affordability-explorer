import { useMemo } from 'react'
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
import OccupancySelector from '../components/OccupancySelector'
import LifestyleSelector from '../components/LifestyleSelector'
import UtilitySelector from '../components/UtilitySelector'
import FinanceSelector from '../components/FinanceSelector'
import VersionStamp from '../components/VersionStamp'
import { useMasterCounts, useSummaryStats, useCostElements, useBarriers, useConsumptionFactors } from '../hooks/useData'
import { useOccupancy } from '../contexts/OccupancyContext'
import { useLifestyle } from '../contexts/LifestyleContext'
import { useUtility } from '../contexts/UtilityContext'
import { useFinance } from '../contexts/FinanceContext'
import type { UtilityRateTier } from '../types/database'

const COLORS = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#6366f1']

// Extended color palette for stacked bars
const STACKED_COLORS = [
  '#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#6366f1',
  '#14b8a6', '#f97316', '#ec4899', '#84cc16', '#06b6d4', '#a855f7',
  '#22c55e', '#eab308', '#0ea5e9', '#d946ef', '#64748b', '#fb7185',
  '#4ade80', '#facc15', '#38bdf8', '#c084fc', '#94a3b8', '#f472b6',
]

// Calculate tiered utility cost
function calculateTieredCost(consumption: number, baseFee: number, rateTiers: UtilityRateTier[]): number {
  let totalCost = baseFee
  let remaining = consumption
  let prevMax = 0

  for (const tier of rateTiers) {
    if (remaining <= 0) break

    const tierMax = tier.max_units
    let tierUsage: number

    if (tierMax === null) {
      // Unlimited tier
      tierUsage = remaining
    } else {
      tierUsage = Math.min(remaining, tierMax - prevMax)
    }

    totalCost += tierUsage * tier.rate
    remaining -= tierUsage
    prevMax = tierMax ?? prevMax
  }

  return totalCost
}

// Calculate mortgage payment using standard formula
function calculateMortgagePayment(
  purchasePrice: number,
  downPaymentPercent: number,
  annualRate: number,
  termYears: number,
  pmiRate: number,
  pmiThreshold: number
): { principal: number; pmi: number; total: number } {
  if (termYears === 0 || annualRate === 0) {
    return { principal: 0, pmi: 0, total: 0 }
  }

  const loanAmount = purchasePrice * (1 - downPaymentPercent)
  const monthlyRate = annualRate / 12
  const numPayments = termYears * 12

  // Standard mortgage formula: M = P * [r(1+r)^n] / [(1+r)^n - 1]
  const monthlyPI = loanAmount *
    (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) /
    (Math.pow(1 + monthlyRate, numPayments) - 1)

  // PMI if below threshold
  const monthlyPMI = downPaymentPercent < pmiThreshold && pmiRate > 0
    ? (loanAmount * pmiRate) / 12
    : 0

  return {
    principal: monthlyPI,
    pmi: monthlyPMI,
    total: monthlyPI + monthlyPMI,
  }
}

export default function Dashboard() {
  // Master counts (framework totals - not scenario-dependent)
  const masterCounts = useMasterCounts()

  // Scenario-specific data
  const { data: stats, loading: statsLoading } = useSummaryStats()
  const { data: costElements, loading: ceLoading } = useCostElements()
  const { data: barriers, loading: barriersLoading } = useBarriers()
  const { data: consumptionFactors } = useConsumptionFactors()

  // Multi-dimensional model contexts
  const { selectedOccupancyModel } = useOccupancy()
  const { selectedLifestyleModel } = useLifestyle()
  const { selectedWaterModel, selectedSewerModel, selectedElectricModel, selectedGasModel } = useUtility()
  const { selectedFinanceModel } = useFinance()

  // Home price from cost model (for mortgage calculation)
  const homePrice = useMemo(() => {
    return stats?.total_onetime_costs || 450000 // Default to $450k if no data
  }, [stats])

  // Calculate monthly consumption based on occupancy and lifestyle
  const monthlyConsumption = useMemo(() => {
    if (!selectedOccupancyModel || !selectedLifestyleModel || consumptionFactors.length === 0) {
      return { water: 0, electric: 0, gas: 0 }
    }

    const occupants = selectedOccupancyModel.total_occupants
    const adults = selectedOccupancyModel.adults
    const lifestyle = selectedLifestyleModel

    // Find consumption factors
    const getConsumption = (code: string) => consumptionFactors.find(f => f.activity_code === code)

    // Calculate monthly totals
    let waterGallons = 0
    let electricKwh = 0
    let gasTherms = 0

    // Showers: per person × lifestyle frequency × 4.33 weeks/month
    const shower = getConsumption('shower')
    if (shower) {
      const monthlyShowers = occupants * lifestyle.showers_per_week * 4.33
      waterGallons += monthlyShowers * shower.water_gallons
      electricKwh += monthlyShowers * shower.electric_kwh
      gasTherms += monthlyShowers * shower.gas_therms
    }

    // Baths: per person × lifestyle frequency × 4.33 weeks/month
    const bath = getConsumption('bath')
    if (bath) {
      const monthlyBaths = occupants * lifestyle.baths_per_week * 4.33
      waterGallons += monthlyBaths * bath.water_gallons
      electricKwh += monthlyBaths * bath.electric_kwh
      gasTherms += monthlyBaths * bath.gas_therms
    }

    // Laundry: household × lifestyle frequency × 4.33 weeks/month
    const laundry = getConsumption('laundry_load')
    if (laundry) {
      const monthlyLoads = lifestyle.laundry_loads_per_week * 4.33
      waterGallons += monthlyLoads * laundry.water_gallons
      electricKwh += monthlyLoads * laundry.electric_kwh
    }

    // Dishwasher: household × lifestyle frequency × 4.33 weeks/month
    const dishwasher = getConsumption('dishwasher_load')
    if (dishwasher) {
      const monthlyLoads = lifestyle.dishwasher_loads_per_week * 4.33
      waterGallons += monthlyLoads * dishwasher.water_gallons
      electricKwh += monthlyLoads * dishwasher.electric_kwh
    }

    // Hand dishes: household × lifestyle frequency × 30 days/month
    const handDishes = getConsumption('hand_dishes')
    if (handDishes) {
      const monthlyTimes = lifestyle.hand_wash_dishes_per_day * 30
      waterGallons += monthlyTimes * handDishes.water_gallons
    }

    // Toilet flushes: per person × lifestyle frequency × 30 days/month
    const toilet = getConsumption('toilet_flush')
    if (toilet) {
      const monthlyFlushes = occupants * lifestyle.toilet_flushes_per_day * 30
      waterGallons += monthlyFlushes * toilet.water_gallons
    }

    // Cooking: household × lifestyle frequency × 30 days/month
    const cooking = getConsumption('cooking_meal')
    if (cooking) {
      const monthlyMeals = lifestyle.meals_cooked_per_day * 30
      waterGallons += monthlyMeals * cooking.water_gallons
      electricKwh += monthlyMeals * cooking.electric_kwh
      gasTherms += monthlyMeals * cooking.gas_therms
    }

    // TV: household × lifestyle frequency × 30 days/month
    const tv = getConsumption('tv_hour')
    if (tv) {
      const monthlyHours = lifestyle.tv_hours_per_day * 30
      electricKwh += monthlyHours * tv.electric_kwh
    }

    // Computer: per person × lifestyle frequency × 30 days/month
    const computer = getConsumption('computer_hour')
    if (computer) {
      const monthlyHours = adults * lifestyle.computer_hours_per_day * 30
      electricKwh += monthlyHours * computer.electric_kwh
    }

    // Lighting: household × lifestyle frequency × 30 days/month
    const lighting = getConsumption('lighting_hour')
    if (lighting) {
      const monthlyHours = lifestyle.lighting_hours_per_day * 30
      electricKwh += monthlyHours * lighting.electric_kwh
    }

    // Base loads (monthly)
    const fridge = getConsumption('refrigerator')
    if (fridge) {
      electricKwh += fridge.electric_kwh
    }

    const waterHeater = getConsumption('water_heater_standby')
    if (waterHeater) {
      electricKwh += waterHeater.electric_kwh
      gasTherms += waterHeater.gas_therms
    }

    const heating = getConsumption('hvac_heating')
    if (heating) {
      electricKwh += heating.electric_kwh * lifestyle.heating_multiplier
      gasTherms += heating.gas_therms * lifestyle.heating_multiplier
    }

    const cooling = getConsumption('hvac_cooling')
    if (cooling) {
      electricKwh += cooling.electric_kwh * lifestyle.cooling_multiplier
    }

    return {
      water: Math.round(waterGallons),
      electric: Math.round(electricKwh),
      gas: Math.round(gasTherms * 10) / 10,
    }
  }, [selectedOccupancyModel, selectedLifestyleModel, consumptionFactors])

  // Calculate monthly utility costs
  const utilityCosts = useMemo(() => {
    const waterCost = selectedWaterModel
      ? calculateTieredCost(monthlyConsumption.water, selectedWaterModel.base_monthly_fee, selectedWaterModel.rate_tiers || [])
      : 0

    // Sewer is typically based on water consumption (often a percentage or same tiers)
    const sewerCost = selectedSewerModel
      ? calculateTieredCost(monthlyConsumption.water, selectedSewerModel.base_monthly_fee, selectedSewerModel.rate_tiers || [])
      : 0

    const electricCost = selectedElectricModel
      ? calculateTieredCost(monthlyConsumption.electric, selectedElectricModel.base_monthly_fee, selectedElectricModel.rate_tiers || [])
      : 0

    const gasCost = selectedGasModel
      ? calculateTieredCost(monthlyConsumption.gas, selectedGasModel.base_monthly_fee, selectedGasModel.rate_tiers || [])
      : 0

    return {
      water: Math.round(waterCost * 100) / 100,
      sewer: Math.round(sewerCost * 100) / 100,
      electric: Math.round(electricCost * 100) / 100,
      gas: Math.round(gasCost * 100) / 100,
      total: Math.round((waterCost + sewerCost + electricCost + gasCost) * 100) / 100,
    }
  }, [monthlyConsumption, selectedWaterModel, selectedSewerModel, selectedElectricModel, selectedGasModel])

  // Calculate mortgage payment
  const mortgagePayment = useMemo(() => {
    if (!selectedFinanceModel) {
      return { principal: 0, pmi: 0, total: 0 }
    }

    return calculateMortgagePayment(
      homePrice,
      selectedFinanceModel.down_payment_percent,
      selectedFinanceModel.annual_interest_rate,
      selectedFinanceModel.loan_term_years,
      selectedFinanceModel.pmi_rate,
      selectedFinanceModel.pmi_threshold
    )
  }, [homePrice, selectedFinanceModel])

  // Total monthly housing cost
  const totalMonthlyHousingCost = useMemo(() => {
    return mortgagePayment.total + utilityCosts.total
  }, [mortgagePayment, utilityCosts])

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

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)

  const formatCurrencyDetailed = (value: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)

  const scenarioDataLoading = statsLoading || ceLoading || barriersLoading

  // Calculate totals for the vertical bars
  const buildTotal = buildCostElements.reduce((sum, ce) => sum + ce.value, 0)
  const monthlyTotal = operateFinanceCostElements.reduce((sum, ce) => sum + ce.value, 0)

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard<VersionStamp /></h1>
        <p className="mt-1 text-gray-500">
          Overview of housing costs, reduction opportunities, and barriers
        </p>
      </div>

      {/* ============================================ */}
      {/* SECTION 1: COMBINED HOUSING COST CALCULATOR */}
      {/* ============================================ */}
      <div className="bg-gradient-to-br from-primary-50 to-blue-50 rounded-xl border border-primary-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Monthly Housing Cost Calculator</h2>
            <p className="text-sm text-gray-600 mt-1">
              Combines all selected models to estimate your total monthly housing cost
            </p>
          </div>
          <Link to="/models" className="text-sm text-primary-600 hover:text-primary-800 font-medium">
            Manage Models →
          </Link>
        </div>

        {/* Model Selectors Table */}
        <div className="bg-white rounded-lg border border-gray-200 mb-6 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-32">Model</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Selection</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-64">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {/* Cost Model */}
              <tr className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <span className="text-sm font-medium text-gray-700">Cost Model</span>
                </td>
                <td className="px-4 py-3">
                  <ModelSelector variant="default" />
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">
                  {stats ? `$${(stats.total_onetime_costs / 1000).toFixed(0)}k build cost` : 'Loading...'}
                </td>
              </tr>

              {/* Household */}
              <tr className="hover:bg-blue-50/50 bg-blue-50/30">
                <td className="px-4 py-3">
                  <span className="text-sm font-medium text-blue-700">Household</span>
                </td>
                <td className="px-4 py-3">
                  <OccupancySelector variant="default" />
                </td>
                <td className="px-4 py-3 text-sm text-blue-600">
                  {selectedOccupancyModel
                    ? `${selectedOccupancyModel.adults} adult${selectedOccupancyModel.adults !== 1 ? 's' : ''}, ${selectedOccupancyModel.children} child${selectedOccupancyModel.children !== 1 ? 'ren' : ''}`
                    : '-'}
                </td>
              </tr>

              {/* Lifestyle */}
              <tr className="hover:bg-green-50/50 bg-green-50/30">
                <td className="px-4 py-3">
                  <span className="text-sm font-medium text-green-700">Lifestyle</span>
                </td>
                <td className="px-4 py-3">
                  <LifestyleSelector variant="default" />
                </td>
                <td className="px-4 py-3 text-sm text-green-600">
                  {selectedLifestyleModel?.description?.substring(0, 40) || '-'}
                </td>
              </tr>

              {/* Water Utility */}
              <tr className="hover:bg-cyan-50/50 bg-cyan-50/30">
                <td className="px-4 py-3">
                  <span className="text-sm font-medium text-cyan-700">Water</span>
                </td>
                <td className="px-4 py-3">
                  <UtilitySelector utilityType="water" variant="default" />
                </td>
                <td className="px-4 py-3 text-sm text-cyan-600">
                  {selectedWaterModel
                    ? `$${selectedWaterModel.base_monthly_fee.toFixed(2)}/mo + usage`
                    : '-'}
                </td>
              </tr>

              {/* Sewer Utility */}
              <tr className="hover:bg-teal-50/50 bg-teal-50/30">
                <td className="px-4 py-3">
                  <span className="text-sm font-medium text-teal-700">Sewer</span>
                </td>
                <td className="px-4 py-3">
                  <UtilitySelector utilityType="sewer" variant="default" />
                </td>
                <td className="px-4 py-3 text-sm text-teal-600">
                  {selectedSewerModel
                    ? selectedSewerModel.provider_code === 'SEPTIC'
                      ? 'Septic system'
                      : `$${selectedSewerModel.base_monthly_fee.toFixed(2)}/mo + usage`
                    : '-'}
                </td>
              </tr>

              {/* Electric Utility */}
              <tr className="hover:bg-amber-50/50 bg-amber-50/30">
                <td className="px-4 py-3">
                  <span className="text-sm font-medium text-amber-700">Electric</span>
                </td>
                <td className="px-4 py-3">
                  <UtilitySelector utilityType="electric" variant="default" />
                </td>
                <td className="px-4 py-3 text-sm text-amber-600">
                  {selectedElectricModel
                    ? `$${selectedElectricModel.base_monthly_fee.toFixed(2)}/mo + usage`
                    : '-'}
                </td>
              </tr>

              {/* Gas Utility */}
              <tr className="hover:bg-orange-50/50 bg-orange-50/30">
                <td className="px-4 py-3">
                  <span className="text-sm font-medium text-orange-700">Gas</span>
                </td>
                <td className="px-4 py-3">
                  <UtilitySelector utilityType="gas" variant="default" />
                </td>
                <td className="px-4 py-3 text-sm text-orange-600">
                  {selectedGasModel
                    ? selectedGasModel.provider_code === 'NONE'
                      ? 'No gas service'
                      : `$${selectedGasModel.base_monthly_fee.toFixed(2)}/mo + usage`
                    : '-'}
                </td>
              </tr>

              {/* Finance */}
              <tr className="hover:bg-purple-50/50 bg-purple-50/30">
                <td className="px-4 py-3">
                  <span className="text-sm font-medium text-purple-700">Finance</span>
                </td>
                <td className="px-4 py-3">
                  <FinanceSelector variant="default" />
                </td>
                <td className="px-4 py-3 text-sm text-purple-600">
                  {selectedFinanceModel
                    ? selectedFinanceModel.loan_term_years === 0
                      ? 'All-cash purchase'
                      : `${selectedFinanceModel.loan_term_years}yr @ ${(selectedFinanceModel.annual_interest_rate * 100).toFixed(2)}%, ${(selectedFinanceModel.down_payment_percent * 100).toFixed(0)}% down`
                    : '-'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Results Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Utility Costs Card */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Monthly Utilities
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="flex items-center text-sm text-gray-600">
                  <span className="w-6 text-center">💧</span> Water
                </span>
                <span className="font-medium">{formatCurrencyDetailed(utilityCosts.water)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="flex items-center text-sm text-gray-600">
                  <span className="w-6 text-center">🚰</span> Sewer
                </span>
                <span className="font-medium">{formatCurrencyDetailed(utilityCosts.sewer)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="flex items-center text-sm text-gray-600">
                  <span className="w-6 text-center">⚡</span> Electric
                </span>
                <span className="font-medium">{formatCurrencyDetailed(utilityCosts.electric)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="flex items-center text-sm text-gray-600">
                  <span className="w-6 text-center">🔥</span> Gas
                </span>
                <span className="font-medium">{formatCurrencyDetailed(utilityCosts.gas)}</span>
              </div>
              <div className="border-t pt-2 flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700">Total Utilities</span>
                <span className="text-lg font-bold text-cyan-600">{formatCurrencyDetailed(utilityCosts.total)}</span>
              </div>
            </div>
            <div className="mt-3 text-xs text-gray-500">
              Based on {monthlyConsumption.water.toLocaleString()} gal, {monthlyConsumption.electric.toLocaleString()} kWh, {monthlyConsumption.gas} therms
            </div>
          </div>

          {/* Mortgage Payment Card */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Monthly Mortgage
            </h3>
            {selectedFinanceModel?.loan_term_years === 0 ? (
              <div className="text-center py-4">
                <p className="text-gray-600">All-cash purchase</p>
                <p className="text-sm text-gray-500 mt-1">No monthly mortgage payment</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Principal & Interest</span>
                  <span className="font-medium">{formatCurrencyDetailed(mortgagePayment.principal)}</span>
                </div>
                {mortgagePayment.pmi > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">PMI</span>
                    <span className="font-medium text-amber-600">{formatCurrencyDetailed(mortgagePayment.pmi)}</span>
                  </div>
                )}
                <div className="border-t pt-2 flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">Total Mortgage</span>
                  <span className="text-lg font-bold text-purple-600">{formatCurrencyDetailed(mortgagePayment.total)}</span>
                </div>
              </div>
            )}
            <div className="mt-3 text-xs text-gray-500">
              Home price: {formatCurrency(homePrice)} • {selectedFinanceModel?.short_code || 'No finance model'}
            </div>
          </div>

          {/* Total Monthly Cost Card */}
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg shadow-sm border border-green-200 p-5">
            <h3 className="text-sm font-semibold text-green-700 uppercase tracking-wide mb-3">
              Total Monthly Housing Cost
            </h3>
            <div className="text-center py-4">
              <p className="text-4xl font-bold text-green-600">
                {formatCurrency(totalMonthlyHousingCost)}
              </p>
              <p className="text-sm text-green-700 mt-2">per month</p>
            </div>
            <div className="border-t border-green-200 pt-3 space-y-1 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Mortgage + PMI</span>
                <span>{formatCurrency(mortgagePayment.total)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Utilities</span>
                <span>{formatCurrency(utilityCosts.total)}</span>
              </div>
            </div>
            <div className="mt-3 text-xs text-gray-500">
              * Does not include property taxes, insurance, HOA, or maintenance
            </div>
          </div>
        </div>
      </div>

      {/* ============================================ */}
      {/* SECTION 2: FRAMEWORK OVERVIEW (Master Counts) */}
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
      {/* SECTION 3: MODEL ANALYSIS */}
      {/* ============================================ */}
      <div className="pt-4 border-t border-gray-200">
        {/* Model Selector */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-700">Cost Model Analysis</h2>
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
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Calculation Summary</h3>
                <div className="space-y-3 text-sm">
                  <div>
                    <p className="text-gray-500 mb-1">Household</p>
                    <p className="font-medium">{selectedOccupancyModel?.name || '-'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 mb-1">Lifestyle</p>
                    <p className="font-medium">{selectedLifestyleModel?.name || '-'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 mb-1">Finance</p>
                    <p className="font-medium">{selectedFinanceModel?.name || '-'}</p>
                  </div>
                  <div className="border-t pt-3">
                    <p className="text-gray-500 mb-1">Est. Monthly Consumption</p>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="bg-cyan-50 p-2 rounded text-center">
                        <p className="font-bold text-cyan-700">{monthlyConsumption.water.toLocaleString()}</p>
                        <p className="text-cyan-600">gallons</p>
                      </div>
                      <div className="bg-amber-50 p-2 rounded text-center">
                        <p className="font-bold text-amber-700">{monthlyConsumption.electric.toLocaleString()}</p>
                        <p className="text-amber-600">kWh</p>
                      </div>
                      <div className="bg-orange-50 p-2 rounded text-center">
                        <p className="font-bold text-orange-700">{monthlyConsumption.gas}</p>
                        <p className="text-orange-600">therms</p>
                      </div>
                    </div>
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
