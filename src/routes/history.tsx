import { createFileRoute } from '@tanstack/react-router'
import { useState, useMemo } from 'react'
import { useAppStore } from '~/store/appStore'
import type { Category } from '~/types/events'
import { formatCurrency, formatDateWithWeekday, formatMonth } from '~/lib/formatting'

export const Route = createFileRoute('/history')({
  component: History,
})

const CATEGORIES: Category[] = ['Alcohol', 'Candy', 'Snacks', 'Food', 'Drinks', 'Games', 'Other']

function History() {
  const events = useAppStore((state) => state.events)
  const deleteEvent = useAppStore((state) => state.deleteEvent)
  const updateEvent = useAppStore((state) => state.updateEvent)

  // Filter states
  const [selectedMonth, setSelectedMonth] = useState<string>('')
  const [selectedCategory, setSelectedCategory] = useState<string>('All')
  const [selectedType, setSelectedType] = useState<string>('All')

  // Edit states
  const [editingEventId, setEditingEventId] = useState<string | null>(null)
  const [editAmount, setEditAmount] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editCategory, setEditCategory] = useState<Category>('Other')
  const [editDate, setEditDate] = useState('')
  const [editIsPurchase, setEditIsPurchase] = useState(true)

  const handleStartEdit = (event: import('~/types/events').PurchaseEvent | import('~/types/events').AvoidedPurchaseEvent) => {
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

  // Get unique months from events
  const availableMonths = useMemo(() => {
    const months = new Set<string>()
    events.forEach((e) => {
      if (e.type === 'PURCHASE' || e.type === 'AVOIDED_PURCHASE') {
        // Date is already in YYYY-MM-DD format, extract YYYY-MM
        months.add(e.date.substring(0, 7))
      }
    })
    return Array.from(months).sort().reverse()
  }, [events])

  // Filter events
  const filteredEvents = useMemo(() => {
    return events.filter((e): e is import('~/types/events').PurchaseEvent | import('~/types/events').AvoidedPurchaseEvent => {
      if (e.type !== 'PURCHASE' && e.type !== 'AVOIDED_PURCHASE') {
        return false
      }

      // Filter by type
      if (selectedType !== 'All') {
        if (selectedType === 'Purchases' && e.type !== 'PURCHASE') return false
        if (selectedType === 'Avoided' && e.type !== 'AVOIDED_PURCHASE') return false
      }

      // Filter by category
      if (selectedCategory !== 'All' && e.category !== selectedCategory) {
        return false
      }

      // Filter by month
      if (selectedMonth) {
        // Date is already in YYYY-MM-DD format, extract YYYY-MM
        const eventMonth = e.date.substring(0, 7)
        if (eventMonth !== selectedMonth) return false
      }

      return true
    })
  }, [events, selectedMonth, selectedCategory, selectedType])

  // Calculate totals
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

  return (
    <div className="min-h-screen bg-base-100 pb-20 sm:pb-8">
      <div className="container mx-auto max-w-4xl space-y-6 px-4 py-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold sm:text-4xl">History</h1>
          <p className="text-sm text-base-content/60 sm:text-base">View your transactions</p>
        </div>

        {/* Filters */}
        <div className="card bg-base-200">
          <div className="card-body py-4">
            <div className="flex flex-wrap gap-2">
              {/* Month Filter */}
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

              {/* Category Filter */}
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

              {/* Type Filter */}
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

        {/* Totals */}
        <div className="flex gap-4">
          <div className="stat bg-base-200 flex-1 py-3">
            <div className="stat-title text-xs">Avoided</div>
            <div className="stat-value text-xl text-saved">{formatCurrency(totals.avoided)}</div>
          </div>
          <div className="stat bg-base-200 flex-1 py-3">
            <div className="stat-title text-xs">Spent</div>
            <div className="stat-value text-xl text-spent">{formatCurrency(totals.purchases)}</div>
          </div>
        </div>

        {/* Entries List */}
        <div className="card bg-base-200">
          <div className="card-body">
            <h2 className="card-title">
              Entries ({filteredEvents.length})
            </h2>

            {filteredEvents.length === 0 ? (
              <p className="text-base-content/60">No entries matching your filters</p>
            ) : (
              <div className="space-y-3">
                {filteredEvents
                  .sort((a, b) => {
                    const dateCompare = b.date.localeCompare(a.date)
                    if (dateCompare !== 0) return dateCompare
                    return b.id.localeCompare(a.id)
                  })
                  .map((event) =>
                    editingEventId === event.id ? (
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
                    ) : (
                      <div
                        key={event.id}
                        className="flex items-center justify-between rounded-lg bg-base-300 p-3"
                      >
                        <div className="flex flex-1 items-center gap-3">
                          <div className="text-xl">
                            {event.type === 'PURCHASE' ? (
                              <span className="text-spent">💸</span>
                            ) : (
                              <span className="text-saved">✓</span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div
                              className={`font-semibold ${
                                event.type === 'PURCHASE' ? 'text-spent' : 'text-saved'
                              }`}
                            >
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
                          <div
                            className={`font-bold ${
                              event.type === 'PURCHASE' ? 'text-spent' : 'text-saved'
                            }`}
                          >
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
                  )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
