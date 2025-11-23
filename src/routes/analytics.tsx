import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { CATEGORIES } from '~/lib/constants'
import { formatCurrency, formatMonthShort } from '~/lib/formatting'
import { useAppStore } from '~/store/appStore'
import type { Category } from '~/types/events'

export const Route = createFileRoute('/analytics')({
  component: Analytics,
})
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

function MonthlyTrends({ data }: { data: Array<{ month: string; avoided: number; spent: number; interest: number; missedInterest: number }> }) {
  const [isExpanded, setIsExpanded] = useState(false)

  if (data.length === 0) {
    return (
      <div className="card bg-base-200">
        <div className="card-body">
          <h2 className="card-title">Monthly Trends</h2>
          <p className="text-base-content/60">No data yet</p>
        </div>
      </div>
    )
  }

  const displayData = isExpanded ? data : data.slice(0, 6)
  const hasMore = data.length > 6

  return (
    <div className="card bg-base-200">
      <div className="card-body">
        <h2 className="card-title">Monthly Trends</h2>
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
              {displayData.map((row) => (
                <tr key={row.month}>
                  <td className="font-semibold">{row.month}</td>
                  <td className="text-right text-saved">{formatCurrency(row.avoided)}</td>
                  <td className="text-right text-spent">{formatCurrency(row.spent)}</td>
                  <td className="text-right text-earned">{formatCurrency(row.interest)}</td>
                  <td className="text-right text-missed">{formatCurrency(row.missedInterest)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {hasMore && (
          <button
            className="btn btn-ghost btn-sm self-center"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? 'Show less' : `Show all ${data.length} months`}
          </button>
        )}
      </div>
    </div>
  )
}

function Analytics() {
  const events = useAppStore((state) => state.events)
  const metrics = useAppStore((state) => state.metrics)

  // Calculate total applied interest
  const totalAppliedInterestEarned = metrics.monthlyHistory.reduce(
    (sum, month) => sum + month.appliedInterestOnAvoided,
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

  // Monthly trends - include pending interest for current month
  const currentMonthKey = metrics.currentMonth.periodStart
  const monthlyTrends = (metrics.monthlyHistory || [])
    .map((month) => {
      // For current month, include pending interest in addition to applied interest
      const isCurrentMonth = month.periodStart === currentMonthKey
      return {
        month: formatMonthShort(month.periodStart),
        avoided: month.avoidedTotal,
        spent: month.purchasesTotal,
        interest: month.appliedInterestOnAvoided + (isCurrentMonth ? month.pendingInterestOnAvoided : 0),
        missedInterest: month.appliedInterestOnSpent + (isCurrentMonth ? month.pendingInterestOnSpent : 0),
      }
    })
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
      <div className="container mx-auto max-w-6xl space-y-8 px-2 sm:px-4 py-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold sm:text-4xl">Analytics</h1>
          <p className="text-sm text-base-content/60 sm:text-base">Your spending patterns</p>
        </div>

        {/* Avoided & Spent Sections */}
        <div className="flex flex-wrap gap-4">
          {/* Avoided Section */}
          <div className="card bg-base-200 min-w-72 flex-1" style={{ viewTransitionName: 'avoided-card' }}>
            <div className="card-body py-4">
              <h2 className="card-title text-saved text-lg">💪 Avoided</h2>
              <div className="flex gap-4 items-start">
                <div className="stat flex-1 p-0">
                  <div className="stat-title text-xs">Total Avoided</div>
                  <div className="stat-value text-xl text-saved">
                    {formatCurrency(metrics.allTime.savedTotal - totalAppliedInterestEarned)}
                  </div>
                </div>
                <div className="stat flex-1 p-0">
                  <div className="stat-title text-xs">Interest Earned</div>
                  <div className="stat-value text-xl text-earned">
                    +{formatCurrency(totalAppliedInterestEarned + metrics.allTime.pendingSavedInterest)}
                  </div>
                  {metrics.allTime.pendingSavedInterest > 0 && (
                    <div className="stat-desc text-xs text-earned">
                      +{formatCurrency(metrics.allTime.pendingSavedInterest, 2)} this month
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Spent Section */}
          <div className="card bg-base-200 min-w-72 flex-1" style={{ viewTransitionName: 'spent-card' }}>
            <div className="card-body py-4">
              <h2 className="card-title text-spent text-lg">💸 Spent</h2>
              <div className="flex gap-4 items-start">
                <div className="stat flex-1 p-0">
                  <div className="stat-title text-xs">Total Spent</div>
                  <div className="stat-value text-xl text-spent">
                    {formatCurrency(metrics.allTime.spentTotal)}
                  </div>
                </div>
                <div className="stat flex-1 p-0">
                  <div className="stat-title text-xs">Missed Interest</div>
                  <div className="stat-value text-xl text-missed">
                    -{formatCurrency(metrics.allTime.missedInterest + metrics.allTime.pendingCostInterest)}
                  </div>
                  {metrics.allTime.pendingCostInterest > 0 && (
                    <div className="stat-desc text-xs text-missed">
                      -{formatCurrency(metrics.allTime.pendingCostInterest, 2)} this month
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
                            className="bg-saved"
                            style={{ width: `${avoidedPercent}%` }}
                            title={`Avoided: ${formatCurrency(row.avoided)}`}
                          />
                          <div
                            className="bg-spent"
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
                          <td className="text-right text-saved">{formatCurrency(row.avoided)}</td>
                          <td className="text-right text-spent">{formatCurrency(row.spent)}</td>
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
        <MonthlyTrends data={monthlyTrends} />

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
