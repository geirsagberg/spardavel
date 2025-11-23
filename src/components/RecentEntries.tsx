import { useAutoAnimate } from '@formkit/auto-animate/react'
import { useState } from 'react'
import { useAppStore } from '~/store/appStore'
import type { Category, PurchaseEvent, AvoidedPurchaseEvent } from '~/types/events'
import { EntryEditForm } from './EntryEditForm'
import { EntryListItem } from './EntryListItem'

export function RecentEntries() {
  const [animateRef] = useAutoAnimate({
    duration: 200,
    disrespectUserMotionPreference: true,
  })
  const events = useAppStore((state) => state.events)
  const deleteEvent = useAppStore((state) => state.deleteEvent)
  const updateEvent = useAppStore((state) => state.updateEvent)
  const [editingEventId, setEditingEventId] = useState<string | null>(null)

  const handleSaveEdit = (
    id: string,
    updates: {
      type: 'PURCHASE' | 'AVOIDED_PURCHASE'
      amount: number
      description: string
      category: Category
      date: string
    }
  ) => {
    updateEvent(id, updates)
    setEditingEventId(null)
  }

  const transactionEvents = events
    .filter((e): e is PurchaseEvent | AvoidedPurchaseEvent =>
      e.type === 'PURCHASE' || e.type === 'AVOIDED_PURCHASE'
    )
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
        <div ref={animateRef} className="space-y-3">
          {transactionEvents.map((event) =>
            editingEventId === event.id ? (
              <EntryEditForm
                key={event.id}
                event={event}
                onSave={handleSaveEdit}
                onCancel={() => setEditingEventId(null)}
              />
            ) : (
              <EntryListItem
                key={event.id}
                event={event}
                onEdit={() => setEditingEventId(event.id)}
                onDelete={() => deleteEvent(event.id)}
              />
            )
          )}
        </div>
      </div>
    </div>
  )
}
