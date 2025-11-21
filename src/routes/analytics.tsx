import { createFileRoute } from '@tanstack/react-router'
import { useAppStore } from '~/store/appStore'
import type { Category } from '~/types/events'

export const Route = createFileRoute('/analytics')({
  component: Analytics,
})

const CATEGORIES: Category[] = ['Alcohol', 'Candy', 'Snacks', 'Food', 'Drinks', 'Games', 'Other']
const COLORS = ['#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e', '#06b6d4', '#0ea5e9']

function formatAmount(amount: number): string {
  return `${amount.toLocaleString()} kr`
}

function Analytics() {
  const events = useAppStore((state) => state.events)
  const metrics = useAppStore((state) => state.metrics)

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

  // Monthly trends
  const monthlyTrends = (metrics.monthlyHistory || []).map((month) => ({
    month: new Date(`${month.periodStart}T00:00:00`).toLocaleDateString('nb-NO', {
      month: 'short',
      year: '2-digit',
    }),
    avoided: month.avoidedTotal,
    spent: month.purchasesTotal,
    interest: month.pendingInterestOnAvoided + month.appliedInterestOnAvoided,
  }))

  // Category pie data (current month)
  const currentMonthCategoryData = CATEGORIES.filter((cat) => {
    const avoided = metrics.currentMonth.avoidedByCategory[cat]
    const spent = metrics.currentMonth.purchasesByCategory[cat]
    return avoided > 0 || spent > 0
  }).map((cat, idx) => ({
    name: cat,
    value: metrics.currentMonth.avoidedByCategory[cat] + metrics.currentMonth.purchasesByCategory[cat],
    color: COLORS[idx % COLORS.length],
  }))

  return (
    <div className="min-h-screen bg-base-100 pb-20 sm:pb-8">
      <div className="container mx-auto max-w-6xl space-y-8 px-4 py-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold sm:text-4xl">Analytics</h1>
          <p className="text-sm text-base-content/60 sm:text-base">Your spending patterns</p>
        </div>

        {/* Key Stats */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="stat bg-base-200">
            <div className="stat-title text-xs">Total Avoided</div>
            <div className="stat-value text-2xl text-success">{formatAmount(metrics.allTime.savedTotal)}</div>
            <div className="stat-desc">all time</div>
          </div>
          <div className="stat bg-base-200">
            <div className="stat-title text-xs">Total Spent</div>
            <div className="stat-value text-2xl text-error">{formatAmount(metrics.allTime.spentTotal)}</div>
            <div className="stat-desc">all time</div>
          </div>
          <div className="stat bg-base-200">
            <div className="stat-title text-xs">Interest Earned</div>
            <div className="stat-value text-2xl text-info">
              {formatAmount(metrics.allTime.opportunityCost)}
            </div>
            <div className="stat-desc">pending + applied</div>
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
                          <span>{formatAmount(total)}</span>
                        </div>
                        <div className="h-6 w-full overflow-hidden rounded-lg bg-base-300 flex">
                          <div
                            className="bg-success"
                            style={{ width: `${avoidedPercent}%` }}
                            title={`Avoided: ${formatAmount(row.avoided)}`}
                          />
                          <div
                            className="bg-error"
                            style={{ width: `${100 - avoidedPercent}%` }}
                            title={`Spent: ${formatAmount(row.spent)}`}
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
                          <td className="text-right text-success">{formatAmount(row.avoided)}</td>
                          <td className="text-right text-error">{formatAmount(row.spent)}</td>
                          <td className="text-right font-semibold">{formatAmount(row.avoided + row.spent)}</td>
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
                <table className="table table-sm">
                  <thead>
                    <tr>
                      <th>Month</th>
                      <th className="text-right">Avoided</th>
                      <th className="text-right">Spent</th>
                      <th className="text-right">Interest</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthlyTrends.map((row) => (
                      <tr key={row.month}>
                        <td className="font-semibold">{row.month}</td>
                        <td className="text-right text-success">{formatAmount(row.avoided)}</td>
                        <td className="text-right text-error">{formatAmount(row.spent)}</td>
                        <td className="text-right text-info">{formatAmount(row.interest)}</td>
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
                        className="h-4 w-4 rounded"
                        style={{ backgroundColor: item.color }}
                      ></div>
                      <span className="font-medium">{item.name}</span>
                    </div>
                    <span className="font-semibold">{formatAmount(item.value)}</span>
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
