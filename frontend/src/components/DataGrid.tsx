import { useMemo, useCallback, useRef } from 'react'
import { AgGridReact } from 'ag-grid-react'
import type { ColDef, GridReadyEvent, GridApi } from 'ag-grid-community'
import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-alpine.css'

interface DataGridProps<T> {
  rowData: T[]
  columnDefs: ColDef<T>[]
  loading?: boolean
  onRowClick?: (data: T) => void
  height?: string
  quickFilterText?: string
}

export default function DataGrid<T>({
  rowData,
  columnDefs,
  loading = false,
  onRowClick,
  height = '600px',
  quickFilterText,
}: DataGridProps<T>) {
  const gridRef = useRef<AgGridReact<T>>(null)

  const defaultColDef = useMemo<ColDef>(
    () => ({
      sortable: true,
      filter: true,
      resizable: true,
      floatingFilter: true,
      flex: 1,
      minWidth: 100,
    }),
    []
  )

  const onGridReady = useCallback((params: GridReadyEvent) => {
    params.api.sizeColumnsToFit()
  }, [])

  const onRowClicked = useCallback(
    (event: { data: T }) => {
      if (onRowClick && event.data) {
        onRowClick(event.data)
      }
    },
    [onRowClick]
  )

  return (
    <div className="ag-theme-alpine" style={{ height, width: '100%' }}>
      <AgGridReact<T>
        ref={gridRef}
        rowData={rowData}
        columnDefs={columnDefs}
        defaultColDef={defaultColDef}
        onGridReady={onGridReady}
        onRowClicked={onRowClicked}
        quickFilterText={quickFilterText}
        animateRows={true}
        pagination={true}
        paginationPageSize={25}
        paginationPageSizeSelector={[10, 25, 50, 100]}
        rowSelection="single"
        suppressCellFocus={true}
        loading={loading}
        overlayLoadingTemplate='<span class="ag-overlay-loading-center">Loading data...</span>'
        overlayNoRowsTemplate='<span class="ag-overlay-no-rows-center">No data available</span>'
      />
    </div>
  )
}

// Currency formatter
export function currencyFormatter(params: { value: number | null }): string {
  if (params.value == null) return '-'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(params.value)
}

// Badge renderer for categorical data
export function BadgeRenderer({ value, colorMap }: { value: string | null; colorMap?: Record<string, string> }) {
  if (!value) return <span className="text-gray-400">-</span>

  const defaultColors: Record<string, string> = {
    Build: 'bg-blue-100 text-blue-800',
    Operate: 'bg-green-100 text-green-800',
    Finance: 'bg-purple-100 text-purple-800',
    Total: 'bg-gray-100 text-gray-800',
    RULE: 'bg-red-100 text-red-800',
    PRACTICE: 'bg-yellow-100 text-yellow-800',
    CAPACITY: 'bg-orange-100 text-orange-800',
    POLITICAL: 'bg-pink-100 text-pink-800',
    RISK: 'bg-red-100 text-red-800',
    MARKET: 'bg-indigo-100 text-indigo-800',
    LOCAL: 'bg-blue-100 text-blue-800',
    STATE: 'bg-purple-100 text-purple-800',
    FEDERAL: 'bg-red-100 text-red-800',
    PRIVATE: 'bg-gray-100 text-gray-800',
    UTILITY: 'bg-cyan-100 text-cyan-800',
    REGIONAL: 'bg-teal-100 text-teal-800',
    'MARKET-WIDE': 'bg-amber-100 text-amber-800',
    Near: 'bg-green-100 text-green-800',
    Medium: 'bg-yellow-100 text-yellow-800',
    Long: 'bg-red-100 text-red-800',
    Primary: 'bg-blue-100 text-blue-800',
    Secondary: 'bg-gray-100 text-gray-800',
    'Also affected': 'bg-yellow-100 text-yellow-800',
    'Upfront premium': 'bg-orange-100 text-orange-800',
  }

  const colors = colorMap || defaultColors
  const colorClass = colors[value] || 'bg-gray-100 text-gray-800'

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colorClass}`}>
      {value}
    </span>
  )
}

// Boolean renderer
export function BooleanRenderer({ value }: { value: boolean | null }) {
  if (value === null || value === undefined) return <span className="text-gray-400">-</span>
  return value ? (
    <span className="text-green-600">Yes</span>
  ) : (
    <span className="text-gray-400">No</span>
  )
}
