import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AppEvent } from '~/types/events'
import type { DashboardMetrics, PeriodMetrics, AllTimeMetrics } from '~/types/metrics'
import {
  createEmptyDashboardMetrics,
  createEmptyPeriodMetrics,
  createEmptyAllTimeMetrics,
} from '~/types/metrics'
import { sortEventsByUUID, getMonthKey, getMonthBounds, getCurrentMonthKey, isDateInMonth } from '~/lib/eventUtils'
import { calculatePendingInterestForCurrentMonth } from '~/lib/interestCalculation'

interface AppStore {
  // Event stream
  events: AppEvent[]
  addEvent: (event: AppEvent) => void
  updateEvent: (id: string, updates: Partial<Omit<AppEvent, 'id' | 'type'>>) => void
  deleteEvent: (id: string) => void
  clearAllEvents: () => void

  // Metrics (derived)
  metrics: DashboardMetrics
  recalculateMetrics: () => void

  // Calculated selectors
  getEventById: (id: string) => AppEvent | undefined
  getEventsByMonth: (monthKey: string) => AppEvent[]
  getCurrentMonthMetrics: () => PeriodMetrics
  getAllTimeMetrics: () => AllTimeMetrics
}

const STORAGE_KEY = 'spardavel_events'

/**
 * Calculate metrics from all events
 */
function calculateMetricsFromEvents(events: AppEvent[]): DashboardMetrics {
  const sortedEvents = sortEventsByUUID(events)
  const currentMonthKey = getCurrentMonthKey()
  const { start: currentMonthStart, end: currentMonthEnd } = getMonthBounds(currentMonthKey)

  // Initialize metrics
  let metrics: DashboardMetrics = createEmptyDashboardMetrics()
  const monthlyMap = new Map<string, PeriodMetrics>()

  // Extract current interest rate from events
  const rateChangeEvents = sortedEvents.filter((e) => e.type === 'INTEREST_RATE_CHANGE')
  if (rateChangeEvents.length > 0) {
    const currentRate = rateChangeEvents[rateChangeEvents.length - 1]
    if (currentRate.type === 'INTEREST_RATE_CHANGE') {
      metrics.currentInterestRate = currentRate.newRate
      metrics.interestRateHistory = rateChangeEvents.map((e) => {
        if (e.type === 'INTEREST_RATE_CHANGE') {
          return { effectiveDate: e.effectiveDate, rate: e.newRate }
        }
        return { effectiveDate: '', rate: 0 }
      })
    }
  }

  // Process all events
  for (const event of sortedEvents) {
    const monthKey = getMonthKey(event.timestamp)
    const { start, end } = getMonthBounds(monthKey)

    if (!monthlyMap.has(monthKey)) {
      monthlyMap.set(monthKey, createEmptyPeriodMetrics(start, end))
    }

    const monthMetrics = monthlyMap.get(monthKey)!

    switch (event.type) {
      case 'PURCHASE':
        monthMetrics.purchasesCount++
        monthMetrics.purchasesTotal += event.amount
        monthMetrics.purchasesByCategory[event.category] += event.amount
        metrics.allTime.spentTotal += event.amount
        break

      case 'AVOIDED_PURCHASE':
        monthMetrics.avoidedCount++
        monthMetrics.avoidedTotal += event.amount
        monthMetrics.avoidedByCategory[event.category] += event.amount
        metrics.allTime.savedTotal += event.amount
        break

      case 'INTEREST_APPLICATION':
        monthMetrics.appliedInterestOnAvoided += event.pendingOnAvoided
        monthMetrics.appliedInterestOnSpent += event.pendingOnSpent
        metrics.allTime.savedTotal += event.pendingOnAvoided
        metrics.allTime.opportunityCost += event.pendingOnSpent
        break
    }
  }

  // Set current month metrics
  if (monthlyMap.has(currentMonthKey)) {
    metrics.currentMonth = monthlyMap.get(currentMonthKey)!
  } else {
    metrics.currentMonth = createEmptyPeriodMetrics(currentMonthStart, currentMonthEnd)
  }

  // Calculate pending interest for current month
  const { pendingOnAvoided, pendingOnSpent } = calculatePendingInterestForCurrentMonth(
    sortedEvents,
    metrics.currentInterestRate,
  )
  metrics.currentMonth.pendingInterestOnAvoided = pendingOnAvoided
  metrics.currentMonth.pendingInterestOnSpent = pendingOnSpent

  // Update all-time pending interest
  metrics.allTime.pendingSavedInterest = pendingOnAvoided
  metrics.allTime.pendingCostInterest = pendingOnSpent

  // Build monthly history (sorted by month)
  const sortedMonths = Array.from(monthlyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, m]) => m)
  metrics.monthlyHistory = sortedMonths

  return metrics
}

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      events: [],
      metrics: createEmptyDashboardMetrics(),

      addEvent: (event) => {
        set((state) => {
          const newEvents = [...state.events, event]
          const newMetrics = calculateMetricsFromEvents(newEvents)
          return { events: newEvents, metrics: newMetrics }
        })
      },

      updateEvent: (id, updates) => {
        set((state) => {
          const newEvents = state.events.map((event) => {
            if (event.id === id) {
              return { ...event, ...updates }
            }
            return event
          })
          const newMetrics = calculateMetricsFromEvents(newEvents)
          return { events: newEvents, metrics: newMetrics }
        })
      },

      deleteEvent: (id) => {
        set((state) => {
          const newEvents = state.events.filter((event) => event.id !== id)
          const newMetrics = calculateMetricsFromEvents(newEvents)
          return { events: newEvents, metrics: newMetrics }
        })
      },

      clearAllEvents: () => {
        set(() => ({
          events: [],
          metrics: createEmptyDashboardMetrics(),
        }))
      },

      recalculateMetrics: () => {
        set((state) => ({
          metrics: calculateMetricsFromEvents(state.events),
        }))
      },

      getEventById: (id) => {
        return get().events.find((event) => event.id === id)
      },

      getEventsByMonth: (monthKey) => {
        return get().events.filter((event) => isDateInMonth(event.timestamp, monthKey))
      },

      getCurrentMonthMetrics: () => {
        return get().metrics.currentMonth
      },

      getAllTimeMetrics: () => {
        return get().metrics.allTime
      },
    }),
    {
      name: STORAGE_KEY,
      partialize: (state) => ({ events: state.events }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Recalculate metrics after rehydrating from storage
          state.metrics = calculateMetricsFromEvents(state.events)
        }
      },
    },
  ),
)
