import { useAppStore } from '~/store/appStore'

const DEFAULT_CURRENCY = 'kr'

function formatAmount(amount: number): string {
  return `${amount.toLocaleString()} ${DEFAULT_CURRENCY}`
}

export function Dashboard() {
  const metrics = useAppStore((state) => state.metrics)
  const currentMonth = metrics.currentMonth
  const allTime = metrics.allTime

  // Calculate pending interest for current month
  const currentPendingInterest = currentMonth.pendingInterestOnAvoided + currentMonth.pendingInterestOnSpent

  return (
    <div className="space-y-3">
      {/* Compact Stats Summary */}
      <div className="card bg-base-200">
        <div className="card-body p-4">
          <div className="grid grid-cols-2 gap-4">
            {/* This Month */}
            <div>
              <h3 className="text-xs font-semibold text-base-content/60 mb-1">This Month</h3>
              <div className="flex items-baseline gap-2">
                <span className="text-success font-bold">{formatAmount(currentMonth.avoidedTotal)}</span>
                <span className="text-xs text-base-content/60">saved</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-error font-bold">{formatAmount(currentMonth.purchasesTotal)}</span>
                <span className="text-xs text-base-content/60">spent</span>
              </div>
            </div>

            {/* All Time */}
            <div>
              <h3 className="text-xs font-semibold text-base-content/60 mb-1">All Time</h3>
              <div className="flex items-baseline gap-2">
                <span className="text-success font-bold">{formatAmount(allTime.savedTotal)}</span>
                <span className="text-xs text-base-content/60">saved</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-error font-bold">{formatAmount(allTime.spentTotal)}</span>
                <span className="text-xs text-base-content/60">spent</span>
              </div>
            </div>
          </div>

          {/* Compact Interest & Stats Row */}
          {currentPendingInterest > 0 && (
            <div className="mt-3 pt-3 border-t border-base-300 text-xs text-base-content/70">
              Pending interest: <span className="font-semibold">{formatAmount(currentMonth.pendingInterestOnAvoided)}</span>
              {currentMonth.pendingInterestOnSpent > 0 && (
                <> · Cost: <span className="font-semibold">{formatAmount(currentMonth.pendingInterestOnSpent)}</span></>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
