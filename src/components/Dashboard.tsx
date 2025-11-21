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
    <div className="space-y-6">
      {/* Quick Stats Section */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Saved Stats */}
        <div className="card bg-base-200">
          <div className="card-body">
            <h3 className="card-title text-sm text-base-content/70">This Month</h3>
            <div className="space-y-2">
              <div>
                <p className="text-xs text-base-content/60">Saved</p>
                <p className="text-2xl font-bold text-success">{formatAmount(currentMonth.avoidedTotal)}</p>
              </div>
              <div>
                <p className="text-xs text-base-content/60">Spent</p>
                <p className="text-2xl font-bold text-error">{formatAmount(currentMonth.purchasesTotal)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* All Time Stats */}
        <div className="card bg-base-200">
          <div className="card-body">
            <h3 className="card-title text-sm text-base-content/70">All Time</h3>
            <div className="space-y-2">
              <div>
                <p className="text-xs text-base-content/60">Total Saved</p>
                <p className="text-2xl font-bold text-success">{formatAmount(allTime.savedTotal)}</p>
              </div>
              <div>
                <p className="text-xs text-base-content/60">Total Spent</p>
                <p className="text-2xl font-bold text-error">{formatAmount(allTime.spentTotal)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Interest Section */}
      {currentPendingInterest > 0 && (
        <div className="alert alert-info">
          <svg className="h-6 w-6 shrink-0 stroke-current" fill="none" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            ></path>
          </svg>
          <div>
            <h3 className="font-bold">Pending Interest</h3>
            <div className="text-sm">
              <div>
                Saved interest: <span className="font-semibold text-success">{formatAmount(currentMonth.pendingInterestOnAvoided)}</span>
              </div>
              {currentMonth.pendingInterestOnSpent > 0 && (
                <div>
                  Opportunity cost: <span className="font-semibold text-error">{formatAmount(currentMonth.pendingInterestOnSpent)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="stat bg-base-200">
          <div className="stat-title text-xs">Purchases</div>
          <div className="stat-value text-2xl">{currentMonth.purchasesCount}</div>
          <div className="stat-desc">this month</div>
        </div>

        <div className="stat bg-base-200">
          <div className="stat-title text-xs">Avoided</div>
          <div className="stat-value text-2xl text-success">{currentMonth.avoidedCount}</div>
          <div className="stat-desc">this month</div>
        </div>

        <div className="stat bg-base-200">
          <div className="stat-title text-xs">Interest Rate</div>
          <div className="stat-value text-2xl">{metrics.currentInterestRate}%</div>
          <div className="stat-desc">annually</div>
        </div>

        <div className="stat bg-base-200">
          <div className="stat-title text-xs">Potential</div>
          <div className="stat-value text-2xl text-info">
            {formatAmount(allTime.savedTotal + allTime.spentTotal)}
          </div>
          <div className="stat-desc">if avoided all</div>
        </div>
      </div>
    </div>
  )
}
