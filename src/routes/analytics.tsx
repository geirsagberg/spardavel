import { createFileRoute } from '@tanstack/react-router'
import { useAppStore } from '~/store/appStore'
import type { Category } from '~/types/events'
import { formatCurrency, formatMonthShort } from '~/lib/formatting'

export const Route = createFileRoute('/analytics')({
  component: Analytics,
})

const CATEGORIES: Category[] = ['Alcohol', 'Candy', 'Snacks', 'Food', 'Drinks', 'Games', 'Other']
// DaisyUI color classes that will adapt to theme changes
const COLOR_CLASSES = [
  'bg-error',
  'bg-warning', 
  'bg-info',
  'bg-success',
  'bg-primary',
  'bg-secondary',
  'bg-accent'
]

function Analytics() {
  const events = useAppStore((state) => state.events)
  const metrics = useAppStore((state) => state.metrics)

  // Calculate total applied interest
  const totalAppliedInterestEarned = metrics.monthlyHistory.reduce(
    (sum, month) => sum + month.appliedInterestOnAvoided,
    0
  )
  const totalAppliedInterestCost = metrics.monthlyHistory.reduce(
    (sum, month) => sum + month.appliedInterestOnSpent,
    0
  )

  // Category breakdown (all time)
  const categoryBreakdown: Array<{ category: Category; avoided: number; spent: number }> = []
  for (const category of CATEGORIES) {
    let avoided = 0
    let spent = 0

    events.forEach((e) => {
      if (e.type === 'AVOIDED_PURCHASE' && e.category === category) {
        avoided += e.amount
      } else if (e.type === 'PURCHASE' && e.category === category) {
        spent += e.amount
      }
    })

    if (avoided > 0 || spent > 0) {
      categoryBreakdown.push({ category, avoided, spent })
    }
  }

  // Monthly trends (only show applied interest, not pending, since these are historical months)
  const monthlyTrends = (metrics.monthlyHistory || [])
    .map((month) => ({
      month: formatMonthShort(month.periodStart),
      avoided: month.avoidedTotal,
      spent: month.purchasesTotal,
      interest: month.appliedInterestOnAvoided,
      missedInterest: month.appliedInterestOnSpent,
    }))
    .reverse()

  // Category pie data (current month)
  const currentMonthCategoryData = CATEGORIES.filter((cat) => {
    const avoided = metrics.currentMonth.avoidedByCategory[cat]
    const spent = metrics.currentMonth.purchasesByCategory[cat]
    return avoided > 0 || spent > 0
  }).map((cat, idx) => ({
    name: cat,
    value: metrics.currentMonth.avoidedByCategory[cat] + metrics.currentMonth.purchasesByCategory[cat],
    colorClass: COLOR_CLASSES[idx % COLOR_CLASSES.length],
  }))

  return (
    <div className="min-h-screen bg-base-100 pb-20 sm:pb-8">
      <div className="container mx-auto max-w-6xl space-y-8 px-4 py-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold sm:text-4xl">Analytics</h1>
          <p className="text-sm text-base-content/60 sm:text-base">Your spending patterns</p>
        </div>

        {/* Avoided & Spent Sections */}
        <div className="flex flex-wrap gap-4">
          {/* Avoided Section */}
          <div className="card bg-base-200 min-w-72 flex-1">
            <div className="card-body py-4">
              <h2 className="card-title text-success text-lg">✓ Avoided</h2>
              <div className="flex gap-4 items-start">
                <div className="stat flex-1 p-0">
                  <div className="stat-title text-xs">Total Avoided</div>
                  <div className="stat-value text-xl text-success">
                    {formatCurrency(metrics.allTime.savedTotal - totalAppliedInterestEarned)}
                  </div>
                </div>
                <div className="stat flex-1 p-0">
                  <div className="stat-title text-xs">Interest Earned</div>
                  <div className="stat-value text-xl text-info">
                    +{formatCurrency(totalAppliedInterestEarned + metrics.allTime.pendingSavedInterest)}
                  </div>
                  {metrics.allTime.pendingSavedInterest > 0 && (
                    <div className="stat-desc text-xs text-info animate-pulse">
                      +{formatCurrency(metrics.allTime.pendingSavedInterest)} this month
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Spent Section */}
          <div className="card bg-base-200 min-w-72 flex-1">
            <div className="card-body py-4">
              <h2 className="card-title text-error text-lg">✕ Spent</h2>
              <div className="flex gap-4 items-start">
                <div className="stat flex-1 p-0">
                  <div className="stat-title text-xs">Total Spent</div>
                  <div className="stat-value text-xl text-error">
                    {formatCurrency(metrics.allTime.spentTotal)}
                  </div>
                </div>
                <div className="stat flex-1 p-0">
                  <div className="stat-title text-xs">Missed Interest</div>
                  <div className="stat-value text-xl text-warning">
                    -{formatCurrency(metrics.allTime.missedInterest + metrics.allTime.pendingCostInterest)}
                  </div>
                  {metrics.allTime.pendingCostInterest > 0 && (
                    <div className="stat-desc text-xs text-warning animate-pulse">
                      -{formatCurrency(metrics.allTime.pendingCostInterest)} this month
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="card bg-base-200">
          <div className="card-body">
            <h2 className="card-title">Spending by Category (All Time)</h2>
            {categoryBreakdown.length === 0 ? (
              <p className="text-base-content/60">No data yet</p>
            ) : (
              <div className="space-y-4">
                {/* Category visualization bars */}
                <div className="space-y-3">
                  {categoryBreakdown.map((row) => {
                    const total = row.avoided + row.spent
                    const avoidedPercent = total > 0 ? (row.avoided / total) * 100 : 0
                    return (
                      <div key={row.category}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-semibold">{row.category}</span>
                          <span>{formatCurrency(total)}</span>
                        </div>
                        <div className="h-6 w-full overflow-hidden rounded-lg bg-base-300 flex">
                          <div
                            className="bg-success"
                            style={{ width: `${avoidedPercent}%` }}
                            title={`Avoided: ${formatCurrency(row.avoided)}`}
                          />
                          <div
                            className="bg-error"
                            style={{ width: `${100 - avoidedPercent}%` }}
                            title={`Spent: ${formatCurrency(row.spent)}`}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Category Stats Table */}
                <div className="overflow-x-auto">
                  <table className="table table-sm">
                    <thead>
                      <tr>
                        <th>Category</th>
                        <th className="text-right">Avoided</th>
                        <th className="text-right">Spent</th>
                        <th className="text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {categoryBreakdown.map((row) => (
                        <tr key={row.category}>
                          <td>{row.category}</td>
                          <td className="text-right text-success">{formatCurrency(row.avoided)}</td>
                          <td className="text-right text-error">{formatCurrency(row.spent)}</td>
                          <td className="text-right font-semibold">{formatCurrency(row.avoided + row.spent)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Monthly Trends */}
        <div className="card bg-base-200">
          <div className="card-body">
            <h2 className="card-title">Monthly Trends</h2>
            {monthlyTrends.length === 0 ? (
              <p className="text-base-content/60">No data yet</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="table table-sm table-fixed">
                  <thead>
                    <tr>
                      <th className="w-1/5">Month</th>
                      <th className="w-1/5 text-right">Avoided</th>
                      <th className="w-1/5 text-right">Spent</th>
                      <th className="w-1/5 text-right">Interest</th>
                      <th className="w-1/5 text-right">Missed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthlyTrends.map((row) => (
                      <tr key={row.month}>
                        <td className="font-semibold">{row.month}</td>
                        <td className="text-right text-success">{formatCurrency(row.avoided)}</td>
                        <td className="text-right text-error">{formatCurrency(row.spent)}</td>
                        <td className="text-right text-info">{formatCurrency(row.interest)}</td>
                        <td className="text-right text-warning">{formatCurrency(row.missedInterest)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Current Month Breakdown */}
        <div className="card bg-base-200">
          <div className="card-body">
            <h2 className="card-title">Current Month Breakdown by Category</h2>
            {currentMonthCategoryData.length === 0 ? (
              <p className="text-base-content/60">No data for current month</p>
            ) : (
              <div className="space-y-4">
                {currentMonthCategoryData.map((item) => (
                  <div key={item.name} className="flex items-center justify-between rounded-lg bg-base-300 p-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`h-4 w-4 rounded ${item.colorClass}`}
                      ></div>
                      <span className="font-medium">{item.name}</span>
                    </div>
                    <span className="font-semibold">{formatCurrency(item.value)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
