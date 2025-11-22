import { useAppStore } from '~/store/appStore'
import { formatCurrency } from '~/lib/formatting'

export function Dashboard() {
  const metrics = useAppStore((state) => state.metrics)
  const currentMonth = metrics.currentMonth
  const allTime = metrics.allTime

  // Calculate pending interest for current month
  const currentPendingInterest = currentMonth.pendingInterestOnAvoided + currentMonth.pendingInterestOnSpent

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <div className="stat bg-base-200 py-3">
        <div className="stat-title text-xs">This Month Avoided</div>
        <div className="stat-value text-xl text-success">{formatCurrency(currentMonth.avoidedTotal)}</div>
      </div>
      <div className="stat bg-base-200 py-3">
        <div className="stat-title text-xs">This Month Spent</div>
        <div className="stat-value text-xl text-error">{formatCurrency(currentMonth.purchasesTotal)}</div>
      </div>
      <div className="stat bg-base-200 py-3">
        <div className="stat-title text-xs">All Time Saved</div>
        <div className="stat-value text-xl text-success">{formatCurrency(allTime.savedTotal)}</div>
      </div>
      <div className="stat bg-base-200 py-3">
        <div className="stat-title text-xs">All Time Spent</div>
        <div className="stat-value text-xl text-error">{formatCurrency(allTime.spentTotal)}</div>
      </div>
    </div>
  )
}
