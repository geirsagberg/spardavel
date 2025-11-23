import { formatCurrency, formatDateWithWeekday } from '~/lib/formatting'
import type { PurchaseEvent, AvoidedPurchaseEvent } from '~/types/events'

type EntryListItemProps = {
  event: PurchaseEvent | AvoidedPurchaseEvent
  onEdit: () => void
  onDelete: () => void
}

export function EntryListItem({ event, onEdit, onDelete }: EntryListItemProps) {
  const isPurchase = event.type === 'PURCHASE'
  const colorClass = isPurchase ? 'text-spent' : 'text-saved'
  const icon = isPurchase ? '💸' : '✓'

  return (
    <div className="flex items-center justify-between rounded-lg bg-base-300 p-3">
      <div className="flex flex-1 items-center gap-3">
        <div className="text-xl">
          <span className={colorClass}>{icon}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className={`font-semibold ${colorClass}`}>{event.description}</div>
          <div className="flex gap-2 text-sm text-base-content/60">
            <span>{event.category}</span>
            <span>·</span>
            <span>{formatDateWithWeekday(event.date)}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col items-end gap-2">
        <div className={`font-bold ${colorClass}`}>{formatCurrency(event.amount)}</div>
        <div className="flex gap-1">
          <button
            className="btn btn-xs btn-ghost"
            onClick={onEdit}
            title="Edit entry"
          >
            Edit
          </button>
          <button
            className="btn btn-xs btn-ghost text-error"
            onClick={onDelete}
            title="Delete entry"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}
