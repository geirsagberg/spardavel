import { useAppStore } from '~/store/appStore'
import { formatCurrency } from '~/lib/formatting'

export function Dashboard() {
  const metrics = useAppStore((state) => state.metrics)
  const currentMonth = metrics.currentMonth
  const allTime = metrics.allTime

  // Calculate pending interest for current month
  const currentPendingInterest = currentMonth.pendingInterestOnAvoided + currentMonth.pendingInterestOnSpent

  return (
    <div className="space-y-3">
      {/* This Month */}
      <div>
        <h3 className="text-sm font-semibold text-base-content/60 mb-2">This Month</h3>
        <div className="flex gap-3">
          <div className="stat bg-base-200 flex-1 py-3">
            <div className="stat-title text-xs">Avoided</div>
            <div className="stat-value text-2xl text-success">{formatCurrency(currentMonth.avoidedTotal)}</div>
          </div>
          <div className="stat bg-base-200 flex-1 py-3">
            <div className="stat-title text-xs">Spent</div>
            <div className="stat-value text-2xl text-error">{formatCurrency(currentMonth.purchasesTotal)}</div>
          </div>
        </div>
      </div>

      {/* All Time */}
      <div>
        <h3 className="text-sm font-semibold text-base-content/60 mb-2">All Time</h3>
        <div className="flex gap-3">
          <div className="stat bg-base-200 flex-1 py-3">
            <div className="stat-title text-xs">Saved</div>
            <div className="stat-value text-2xl text-success">{formatCurrency(allTime.savedTotal)}</div>
          </div>
          <div className="stat bg-base-200 flex-1 py-3">
            <div className="stat-title text-xs">Spent</div>
            <div className="stat-value text-2xl text-error">{formatCurrency(allTime.spentTotal)}</div>
          </div>
        </div>
      </div>

      {/* Pending Interest */}
      {currentPendingInterest > 0 && (
        <div className="card bg-base-200">
          <div className="card-body p-3">
            <div className="text-xs text-base-content/70">
              Pending interest: <span className="font-semibold">{formatCurrency(currentMonth.pendingInterestOnAvoided)}</span>
              {currentMonth.pendingInterestOnSpent > 0 && (
                <> · Cost: <span className="font-semibold">{formatCurrency(currentMonth.pendingInterestOnSpent)}</span></>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
