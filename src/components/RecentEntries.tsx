import { useState } from 'react'
import { CATEGORIES } from '~/lib/constants'
import { formatCurrency, formatDateWithWeekday } from '~/lib/formatting'
import { useAppStore } from '~/store/appStore'
import type { AppEvent, Category, PurchaseEvent, AvoidedPurchaseEvent } from '~/types/events'

function getEventIcon(event: AppEvent): React.ReactNode {
  if (event.type === 'PURCHASE') {
    return <span className="text-spent">💸</span>
  }
  if (event.type === 'AVOIDED_PURCHASE') {
    return <span className="text-saved">✓</span>
  }
  return null
}

function getEventColor(event: AppEvent): string {
  if (event.type === 'PURCHASE') {
    return 'text-spent'
  }
  if (event.type === 'AVOIDED_PURCHASE') {
    return 'text-saved'
  }
  return 'text-base-content'
}

export function RecentEntries() {
  const events = useAppStore((state) => state.events)
  const deleteEvent = useAppStore((state) => state.deleteEvent)
  const updateEvent = useAppStore((state) => state.updateEvent)

  // Edit states
  const [editingEventId, setEditingEventId] = useState<string | null>(null)
  const [editAmount, setEditAmount] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editCategory, setEditCategory] = useState<Category>('Other')
  const [editDate, setEditDate] = useState('')
  const [editIsPurchase, setEditIsPurchase] = useState(true)

  const handleStartEdit = (event: PurchaseEvent | AvoidedPurchaseEvent) => {
    setEditingEventId(event.id)
    setEditAmount(event.amount.toString())
    setEditDescription(event.description)
    setEditCategory(event.category)
    setEditDate(event.date)
    setEditIsPurchase(event.type === 'PURCHASE')
  }

  const handleCancelEdit = () => {
    setEditingEventId(null)
  }

  const handleSaveEdit = (id: string) => {
    const amount = parseFloat(editAmount)
    if (isNaN(amount) || amount <= 0) return
    if (!editDescription.trim()) return

    updateEvent(id, {
      type: editIsPurchase ? 'PURCHASE' : 'AVOIDED_PURCHASE',
      amount,
      description: editDescription.trim(),
      category: editCategory,
      date: editDate,
    })
    setEditingEventId(null)
  }

  // Get last 10 transaction events (purchases and avoided purchases) - most recent first
  const transactionEvents = events
    .filter((e) => e.type === 'PURCHASE' || e.type === 'AVOIDED_PURCHASE')
    .sort((a, b) => {
      const dateCompare = b.date.localeCompare(a.date)
      if (dateCompare !== 0) return dateCompare
      return b.id.localeCompare(a.id)
    })
    .slice(0, 10)

  if (transactionEvents.length === 0) {
    return (
      <div className="card bg-base-200">
        <div className="card-body">
          <h2 className="card-title">Recent Entries</h2>
          <p className="text-base-content/60">
            No entries yet. Add one to get started!
          </p>
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
            if (
              event.type !== 'PURCHASE' &&
              event.type !== 'AVOIDED_PURCHASE'
            ) {
              return null
            }

            if (editingEventId === event.id) {
              return (
                <div key={event.id} className="rounded-lg bg-base-300 p-3 space-y-3">
                  <div className="flex gap-2">
                    <button
                      className={`btn btn-sm flex-1 ${editIsPurchase ? 'bg-spent text-spent-content' : 'btn-outline'}`}
                      onClick={() => setEditIsPurchase(true)}
                    >
                      Spent
                    </button>
                    <button
                      className={`btn btn-sm flex-1 ${!editIsPurchase ? 'bg-saved text-saved-content' : 'btn-outline'}`}
                      onClick={() => setEditIsPurchase(false)}
                    >
                      Avoided
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      className="input input-bordered input-sm w-24"
                      value={editAmount}
                      onChange={(e) => setEditAmount(e.target.value)}
                      placeholder="Amount"
                      min="0"
                      step="1"
                    />
                    <input
                      type="text"
                      className="input input-bordered input-sm flex-1"
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      placeholder="Description"
                    />
                  </div>
                  <div className="flex gap-2">
                    <select
                      className="select select-bordered select-sm flex-1"
                      value={editCategory}
                      onChange={(e) => setEditCategory(e.target.value as Category)}
                    >
                      {CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                    <input
                      type="date"
                      className="input input-bordered input-sm"
                      value={editDate}
                      onChange={(e) => setEditDate(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button className="btn btn-sm btn-ghost" onClick={handleCancelEdit}>
                      Cancel
                    </button>
                    <button
                      className="btn btn-sm btn-primary"
                      onClick={() => handleSaveEdit(event.id)}
                    >
                      Save
                    </button>
                  </div>
                </div>
              )
            }

            return (
              <div
                key={event.id}
                className="flex items-center justify-between rounded-lg bg-base-300 p-3"
              >
                <div className="flex flex-1 items-center gap-3">
                  <div className="text-xl">{getEventIcon(event)}</div>
                  <div className="flex-1 min-w-0">
                    <div className={`font-semibold ${getEventColor(event)}`}>
                      {event.description}
                    </div>
                    <div className="flex gap-2 text-sm text-base-content/60">
                      <span>{event.category}</span>
                      <span>·</span>
                      <span>{formatDateWithWeekday(event.date)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2">
                  <div className={`font-bold ${getEventColor(event)}`}>
                    {formatCurrency(event.amount)}
                  </div>
                  <div className="flex gap-1">
                    <button
                      className="btn btn-xs btn-ghost"
                      onClick={() => handleStartEdit(event)}
                      title="Edit entry"
                    >
                      Edit
                    </button>
                    <button
                      className="btn btn-xs btn-ghost text-error"
                      onClick={() => deleteEvent(event.id)}
                      title="Delete entry"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
