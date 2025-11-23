import { useAutoAnimate } from '@formkit/auto-animate/react'
import { createFileRoute } from '@tanstack/react-router'
import { useState, useMemo } from 'react'
import { EntryEditForm } from '~/components/EntryEditForm'
import { EntryListItem } from '~/components/EntryListItem'
import { CATEGORIES } from '~/lib/constants'
import { formatCurrency, formatMonth } from '~/lib/formatting'
import { useAppStore } from '~/store/appStore'
import type { Category, PurchaseEvent, AvoidedPurchaseEvent } from '~/types/events'

export const Route = createFileRoute('/history')({
  component: History,
})

function History() {
  const [animateRef] = useAutoAnimate({
    duration: 200,
    disrespectUserMotionPreference: true,
  })
  const events = useAppStore((state) => state.events)
  const deleteEvent = useAppStore((state) => state.deleteEvent)
  const updateEvent = useAppStore((state) => state.updateEvent)

  const [selectedMonth, setSelectedMonth] = useState<string>('')
  const [selectedCategory, setSelectedCategory] = useState<string>('All')
  const [selectedType, setSelectedType] = useState<string>('All')
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

  const availableMonths = useMemo(() => {
    const months = new Set<string>()
    events.forEach((e) => {
      if (e.type === 'PURCHASE' || e.type === 'AVOIDED_PURCHASE') {
        months.add(e.date.substring(0, 7))
      }
    })
    return Array.from(months).sort().reverse()
  }, [events])

  const filteredEvents = useMemo(() => {
    return events.filter((e): e is PurchaseEvent | AvoidedPurchaseEvent => {
      if (e.type !== 'PURCHASE' && e.type !== 'AVOIDED_PURCHASE') {
        return false
      }

      if (selectedType !== 'All') {
        if (selectedType === 'Purchases' && e.type !== 'PURCHASE') return false
        if (selectedType === 'Avoided' && e.type !== 'AVOIDED_PURCHASE') return false
      }

      if (selectedCategory !== 'All' && e.category !== selectedCategory) {
        return false
      }

      if (selectedMonth) {
        const eventMonth = e.date.substring(0, 7)
        if (eventMonth !== selectedMonth) return false
      }

      return true
    })
  }, [events, selectedMonth, selectedCategory, selectedType])

  const totals = useMemo(() => {
    let purchases = 0
    let avoided = 0

    filteredEvents.forEach((e) => {
      if (e.type === 'PURCHASE') {
        purchases += e.amount
      } else if (e.type === 'AVOIDED_PURCHASE') {
        avoided += e.amount
      }
    })

    return { purchases, avoided }
  }, [filteredEvents])

  const sortedEvents = useMemo(() => {
    return [...filteredEvents].sort((a, b) => {
      const dateCompare = b.date.localeCompare(a.date)
      if (dateCompare !== 0) return dateCompare
      return b.id.localeCompare(a.id)
    })
  }, [filteredEvents])

  return (
    <div className="min-h-screen bg-base-100 pb-20 sm:pb-8">
      <div className="container mx-auto max-w-4xl space-y-6 px-4 py-6">
        <div>
          <h1 className="text-3xl font-bold sm:text-4xl">History</h1>
          <p className="text-sm text-base-content/60 sm:text-base">View your transactions</p>
        </div>

        <div className="card bg-base-200">
          <div className="card-body py-4">
            <div className="flex flex-wrap gap-2">
              <div className="form-control flex-1 min-w-[100px]">
                <label className="label py-0.5">
                  <span className="label-text text-xs">Month</span>
                </label>
                <select
                  className="select select-bordered select-sm"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                >
                  <option value="">All</option>
                  {availableMonths.map((month) => (
                    <option key={month} value={month}>
                      {formatMonth(month)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-control flex-1 min-w-[100px]">
                <label className="label py-0.5">
                  <span className="label-text text-xs">Category</span>
                </label>
                <select
                  className="select select-bordered select-sm"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                >
                  <option value="All">All</option>
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-control flex-1 min-w-[90px]">
                <label className="label py-0.5">
                  <span className="label-text text-xs">Type</span>
                </label>
                <select
                  className="select select-bordered select-sm"
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                >
                  <option value="All">All</option>
                  <option value="Purchases">Spent</option>
                  <option value="Avoided">Avoided</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-4">
          <div className="stat bg-base-200 flex-1 py-3" style={{ viewTransitionName: 'avoided-card' }}>
            <div className="stat-title text-xs">Avoided</div>
            <div className="stat-value text-xl text-saved">{formatCurrency(totals.avoided)}</div>
          </div>
          <div className="stat bg-base-200 flex-1 py-3" style={{ viewTransitionName: 'spent-card' }}>
            <div className="stat-title text-xs">Spent</div>
            <div className="stat-value text-xl text-spent">{formatCurrency(totals.purchases)}</div>
          </div>
        </div>

        <div className="card bg-base-200">
          <div className="card-body">
            <h2 className="card-title">Entries ({filteredEvents.length})</h2>

            {filteredEvents.length === 0 ? (
              <p className="text-base-content/60">No entries matching your filters</p>
            ) : (
              <div ref={animateRef} className="space-y-3">
                {sortedEvents.map((event) =>
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
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
