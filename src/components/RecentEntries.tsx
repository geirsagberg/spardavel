import { useAppStore } from '~/store/appStore'
import type { AppEvent } from '~/types/events'

const DEFAULT_CURRENCY = 'kr'

function formatAmount(amount: number): string {
  return `${amount.toLocaleString()} ${DEFAULT_CURRENCY}`
}

function formatDate(timestamp: string): string {
  const date = new Date(timestamp)
  return date.toLocaleDateString('nb-NO', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getEventIcon(event: AppEvent): React.ReactNode {
  if (event.type === 'PURCHASE') {
    return <span className="text-error">✕</span>
  }
  if (event.type === 'AVOIDED_PURCHASE') {
    return <span className="text-success">✓</span>
  }
  return null
}

function getEventColor(event: AppEvent): string {
  if (event.type === 'PURCHASE') {
    return 'text-error'
  }
  if (event.type === 'AVOIDED_PURCHASE') {
    return 'text-success'
  }
  return 'text-base-content'
}

export function RecentEntries() {
  const events = useAppStore((state) => state.events)
  const deleteEvent = useAppStore((state) => state.deleteEvent)

  // Get last 10 transaction events (purchases and avoided purchases)
  const transactionEvents = events
    .filter((e) => e.type === 'PURCHASE' || e.type === 'AVOIDED_PURCHASE')
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    .slice(0, 10)

  if (transactionEvents.length === 0) {
    return (
      <div className="card bg-base-200">
        <div className="card-body">
          <h2 className="card-title">Recent Entries</h2>
          <p className="text-base-content/60">No entries yet. Add one to get started!</p>
        </div>
      </div>
    )
  }

  return (
    <div className="card bg-base-200">
      <div className="card-body">
        <h2 className="card-title">Recent Entries</h2>

        <div className="divider my-0"></div>

        <div className="space-y-3">
          {transactionEvents.map((event) => {
            if (event.type !== 'PURCHASE' && event.type !== 'AVOIDED_PURCHASE') {
              return null
            }

            return (
              <div key={event.id} className="flex items-center justify-between rounded-lg bg-base-300 p-3">
                <div className="flex flex-1 items-center gap-3">
                  <div className="text-xl">{getEventIcon(event)}</div>
                  <div className="flex-1 min-w-0">
                    <div className={`font-semibold ${getEventColor(event)}`}>{event.description}</div>
                    <div className="flex gap-2 text-sm text-base-content/60">
                      <span>{event.category}</span>
                      <span>·</span>
                      <span>{formatDate(event.timestamp)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2">
                  <div className={`font-bold ${getEventColor(event)}`}>{formatAmount(event.amount)}</div>
                  <button
                    className="btn btn-xs btn-ghost text-error"
                    onClick={() => deleteEvent(event.id)}
                    title="Delete entry"
                  >
                    Delete
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
