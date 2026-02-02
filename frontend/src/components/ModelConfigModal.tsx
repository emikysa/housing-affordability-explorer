import { Fragment } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import ModelSelector from './ModelSelector'
import OccupancySelector from './OccupancySelector'
import LifestyleSelector from './LifestyleSelector'
import UtilitySelector from './UtilitySelector'
import FinanceSelector from './FinanceSelector'
import { useModel } from '../contexts/ModelContext'
import { useOccupancy } from '../contexts/OccupancyContext'
import { useLifestyle } from '../contexts/LifestyleContext'
import { useUtility } from '../contexts/UtilityContext'
import { useFinance } from '../contexts/FinanceContext'

interface ModelConfigModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function ModelConfigModal({ isOpen, onClose }: ModelConfigModalProps) {
  const { selectedModel } = useModel()
  const { selectedOccupancyModel } = useOccupancy()
  const { selectedLifestyleModel } = useLifestyle()
  const { selectedWaterModel, selectedElectricModel, selectedGasModel, selectedSewerModel } = useUtility()
  const { selectedFinanceModel } = useFinance()

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-xl bg-white shadow-xl transition-all">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                  <Dialog.Title as="h3" className="text-lg font-semibold text-gray-900">
                    Configure Models
                  </Dialog.Title>
                  <button
                    onClick={onClose}
                    className="rounded-lg p-1 hover:bg-gray-100 transition-colors"
                  >
                    <XMarkIcon className="w-5 h-5 text-gray-500" />
                  </button>
                </div>

                {/* Content */}
                <div className="px-6 py-5 space-y-6">
                  {/* Cost Model */}
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 mr-4">
                        <h4 className="font-medium text-gray-900">Cost Model</h4>
                        <p className="text-sm text-gray-500 mt-1">
                          Construction and development cost assumptions
                        </p>
                      </div>
                      <div className="w-48">
                        <ModelSelector variant="default" />
                      </div>
                    </div>
                    {selectedModel && (
                      <p className="text-xs text-gray-400 mt-2">
                        {selectedModel.description || 'Base cost estimates for housing development'}
                      </p>
                    )}
                  </div>

                  {/* Household Section */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                      Household Profile
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      {/* Occupancy */}
                      <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 mr-3">
                            <h4 className="font-medium text-gray-900">Occupancy</h4>
                            <p className="text-xs text-gray-500 mt-1">
                              Household size & composition
                            </p>
                          </div>
                          <div className="w-36">
                            <OccupancySelector variant="default" />
                          </div>
                        </div>
                        {selectedOccupancyModel && (
                          <p className="text-xs text-blue-600 mt-2">
                            {selectedOccupancyModel.adults} adults, {selectedOccupancyModel.children} children
                          </p>
                        )}
                      </div>

                      {/* Lifestyle */}
                      <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 mr-3">
                            <h4 className="font-medium text-gray-900">Lifestyle</h4>
                            <p className="text-xs text-gray-500 mt-1">
                              Consumption patterns
                            </p>
                          </div>
                          <div className="w-36">
                            <LifestyleSelector variant="default" />
                          </div>
                        </div>
                        {selectedLifestyleModel && (
                          <p className="text-xs text-green-600 mt-2">
                            {selectedLifestyleModel.description?.substring(0, 50) || 'Standard usage patterns'}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Utilities Section */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                      Utility Providers
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      {/* Water */}
                      <div className="bg-cyan-50 rounded-lg p-4 border border-cyan-200">
                        <h4 className="font-medium text-gray-900 mb-2">Water</h4>
                        <UtilitySelector utilityType="water" variant="default" />
                        {selectedWaterModel && (
                          <p className="text-xs text-cyan-600 mt-2">
                            ${selectedWaterModel.base_monthly_fee}/mo base
                          </p>
                        )}
                      </div>

                      {/* Sewer */}
                      <div className="bg-teal-50 rounded-lg p-4 border border-teal-200">
                        <h4 className="font-medium text-gray-900 mb-2">Sewer</h4>
                        <UtilitySelector utilityType="sewer" variant="default" />
                        {selectedSewerModel && (
                          <p className="text-xs text-teal-600 mt-2">
                            {selectedSewerModel.provider_code === 'SEPTIC' ? 'Septic system' : `$${selectedSewerModel.base_monthly_fee}/mo base`}
                          </p>
                        )}
                      </div>

                      {/* Electric */}
                      <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
                        <h4 className="font-medium text-gray-900 mb-2">Electric</h4>
                        <UtilitySelector utilityType="electric" variant="default" />
                        {selectedElectricModel && (
                          <p className="text-xs text-amber-600 mt-2">
                            ${selectedElectricModel.base_monthly_fee}/mo base
                          </p>
                        )}
                      </div>

                      {/* Gas */}
                      <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                        <h4 className="font-medium text-gray-900 mb-2">Gas</h4>
                        <UtilitySelector utilityType="gas" variant="default" />
                        {selectedGasModel && (
                          <p className="text-xs text-orange-600 mt-2">
                            {selectedGasModel.provider_code === 'NONE' ? 'No gas service' : `$${selectedGasModel.base_monthly_fee}/mo base`}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Finance Section */}
                  <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 mr-4">
                        <h4 className="font-medium text-gray-900">Finance</h4>
                        <p className="text-sm text-gray-500 mt-1">
                          Mortgage terms and down payment
                        </p>
                      </div>
                      <div className="w-48">
                        <FinanceSelector variant="default" />
                      </div>
                    </div>
                    {selectedFinanceModel && (
                      <p className="text-xs text-purple-600 mt-2">
                        {selectedFinanceModel.loan_term_years > 0
                          ? `${selectedFinanceModel.loan_term_years}-year @ ${(selectedFinanceModel.annual_interest_rate * 100).toFixed(3)}%, ${(selectedFinanceModel.down_payment_percent * 100).toFixed(0)}% down`
                          : 'All-cash purchase'}
                      </p>
                    )}
                  </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end">
                  <button
                    onClick={onClose}
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
                  >
                    Done
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}
