interface Strategy {
  name: string
  symbol: string
  currentDebt: number
}

interface StrategyPieChartProps {
  strategies: Strategy[]
  totalAssets: number
}

const COLORS = [
  '#3b82f6', // blue
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#f59e0b', // amber
  '#10b981', // green
  '#06b6d4', // cyan
  '#f43f5e', // rose
  '#6366f1', // indigo
]

const IDLE_COLOR = '#64748b' // slate-500 for unallocated funds

export function StrategyPieChart({ strategies, totalAssets }: StrategyPieChartProps) {
  if (totalAssets === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-slate-500 text-sm">No data to display</p>
      </div>
    )
  }

  // Calculate total allocated funds
  const totalAllocated = strategies.reduce((sum, s) => sum + s.currentDebt, 0)
  const totalIdle = totalAssets - totalAllocated

  // Calculate percentages and create pie slices for strategies
  const slices = strategies
    .filter(s => s.currentDebt > 0)
    .map((strategy, index) => ({
      ...strategy,
      percentage: (strategy.currentDebt / totalAssets) * 100,
      color: COLORS[index % COLORS.length],
    }))

  // Add unallocated funds as a slice if there are any
  if (totalIdle > 0) {
    slices.push({
      name: 'Unallocated',
      symbol: '',
      currentDebt: totalIdle,
      percentage: (totalIdle / totalAssets) * 100,
      color: IDLE_COLOR,
    })
  }

  if (slices.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-slate-500 text-sm">No funds in vault</p>
      </div>
    )
  }

  // Calculate pie chart paths
  const size = 200
  const center = size / 2
  const radius = size / 2 - 10

  const paths = slices.reduce<Array<typeof slices[0] & { path: string }>>((acc, slice, index) => {
    // Calculate start angle based on previous slices
    const startAngle = index === 0 ? -90 : acc.reduce((sum, prev) => sum + (prev.percentage / 100) * 360, -90)
    const angleSize = (slice.percentage / 100) * 360
    const endAngle = startAngle + angleSize

    // Convert angles to radians
    const startRad = (startAngle * Math.PI) / 180
    const endRad = (endAngle * Math.PI) / 180

    // Calculate arc points
    const x1 = center + radius * Math.cos(startRad)
    const y1 = center + radius * Math.sin(startRad)
    const x2 = center + radius * Math.cos(endRad)
    const y2 = center + radius * Math.sin(endRad)

    // Large arc flag
    const largeArc = angleSize > 180 ? 1 : 0

    // Create SVG path
    const path = [
      `M ${center} ${center}`,
      `L ${x1} ${y1}`,
      `A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`,
      'Z',
    ].join(' ')

    return [...acc, { ...slice, path }]
  }, [])

  return (
    <div className="space-y-4">
      <svg width={size} height={size} className="mx-auto">
        {paths.map((slice, index) => (
          <path
            key={index}
            d={slice.path}
            fill={slice.color}
            stroke="#1e293b"
            strokeWidth="2"
            className="transition-opacity hover:opacity-80"
          />
        ))}
      </svg>

      <div className="space-y-2">
        {slices.map((slice, index) => (
          <div key={index} className="flex items-center gap-2 text-sm">
            <div
              className="w-3 h-3 rounded-sm flex-shrink-0"
              style={{ backgroundColor: slice.color }}
            />
            <span className="text-slate-300 truncate flex-1">{slice.name}</span>
            <span className="text-vault-blue font-semibold whitespace-nowrap">
              {slice.percentage.toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
