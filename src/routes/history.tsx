import { createFileRoute } from '@tanstack/react-router'
import { useState, useMemo } from 'react'
import { useAppStore } from '~/store/appStore'
import type { Category } from '~/types/events'

export const Route = createFileRoute('/history')({
  component: History,
})

const CATEGORIES: Category[] = ['Alcohol', 'Candy', 'Snacks', 'Food', 'Drinks', 'Games', 'Other']

function formatAmount(amount: number): string {
  return `${amount.toLocaleString()} kr`
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

function History() {
  const events = useAppStore((state) => state.events)
  const deleteEvent = useAppStore((state) => state.deleteEvent)

  // Filter states
  const [selectedMonth, setSelectedMonth] = useState<string>('')
  const [selectedCategory, setSelectedCategory] = useState<string>('All')
  const [selectedType, setSelectedType] = useState<string>('All')

  // Get unique months from events
  const availableMonths = useMemo(() => {
    const months = new Set<string>()
    events.forEach((e) => {
      if (e.type === 'PURCHASE' || e.type === 'AVOIDED_PURCHASE') {
        const date = new Date(e.timestamp)
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        months.add(`${year}-${month}`)
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
        const date = new Date(e.timestamp)
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const eventMonth = `${year}-${month}`
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
                      {new Date(`${month}-01`).toLocaleDateString('nb-NO', {
                        year: 'numeric',
                        month: 'short',
                      })}
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
            <div className="stat-value text-xl text-success">{formatAmount(totals.avoided)}</div>
          </div>
          <div className="stat bg-base-200 flex-1 py-3">
            <div className="stat-title text-xs">Spent</div>
            <div className="stat-value text-xl text-error">{formatAmount(totals.purchases)}</div>
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
                  .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
                  .map((event) => (
                    <div
                      key={event.id}
                      className="flex items-center justify-between rounded-lg bg-base-300 p-3"
                    >
                      <div className="flex flex-1 items-center gap-3">
                        <div className="text-xl">
                          {event.type === 'PURCHASE' ? (
                            <span className="text-error">✕</span>
                          ) : (
                            <span className="text-success">✓</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div
                            className={`font-semibold ${
                              event.type === 'PURCHASE' ? 'text-error' : 'text-success'
                            }`}
                          >
                            {event.description}
                          </div>
                          <div className="flex gap-2 text-sm text-base-content/60">
                            <span>{event.category}</span>
                            <span>·</span>
                            <span>{formatDate(event.timestamp)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-2">
                        <div
                          className={`font-bold ${
                            event.type === 'PURCHASE' ? 'text-error' : 'text-success'
                          }`}
                        >
                          {formatAmount(event.amount)}
                        </div>
                        <button
                          className="btn btn-xs btn-ghost text-error"
                          onClick={() => deleteEvent(event.id)}
                          title="Delete entry"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
