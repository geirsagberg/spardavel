import { useAutoAnimate } from '@formkit/auto-animate/react'
import { useState, useEffect, useRef } from 'react'
import { useAppStore } from '~/store/appStore'
import type { Category, PurchaseEvent, AvoidedPurchaseEvent } from '~/types/events'
import { EntryEditForm } from './EntryEditForm'
import { EntryListItem } from './EntryListItem'

const SCROLL_DELAY_MS = 100 // Delay to allow animation to start before scrolling

export function RecentEntries() {
  const [animateRef] = useAutoAnimate({
    duration: 200,
    disrespectUserMotionPreference: true,
  })
  const events = useAppStore((state) => state.events)
  const deleteEvent = useAppStore((state) => state.deleteEvent)
  const updateEvent = useAppStore((state) => state.updateEvent)
  const [editingEventId, setEditingEventId] = useState<string | null>(null)
  const editFormRefs = useRef(new Map<string, HTMLDivElement>())

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

  // Scroll edit form into view when editing starts
  useEffect(() => {
    if (editingEventId) {
      const editFormElement = editFormRefs.current.get(editingEventId)
      if (editFormElement) {
        // Use setTimeout to allow the animation to start before scrolling
        const timeoutId = setTimeout(() => {
          editFormElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }, SCROLL_DELAY_MS)
        return () => clearTimeout(timeoutId)
      }
    }
  }, [editingEventId])

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
        <div ref={animateRef} className="space-y-3">
          {transactionEvents.map((event) =>
            editingEventId === event.id ? (
              <div
                key={event.id}
                ref={(el) => {
                  if (el) {
                    editFormRefs.current.set(event.id, el)
                  } else {
                    editFormRefs.current.delete(event.id)
                  }
                }}
              >
                <EntryEditForm
                  event={event}
                  onSave={handleSaveEdit}
                  onCancel={() => setEditingEventId(null)}
                />
              </div>
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
