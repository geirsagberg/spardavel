import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { FALLBACK_INTEREST_RATE } from '~/lib/constants'
import {
  getCurrentMonthKey,
  getMonthBounds,
  getMonthKey,
  isDateInMonth,
  sortEventsByDateAsc,
} from '~/lib/eventUtils'
import {
  calculatePendingInterestForCurrentMonth,
  generateInterestApplicationEvents,
} from '~/lib/interestCalculation'
import type { AppEvent } from '~/types/events'
import { AppEventsArraySchema } from '~/types/events'
import type {
  AllTimeMetrics,
  DashboardMetrics,
  PeriodMetrics,
} from '~/types/metrics'
import {
  createEmptyDashboardMetrics,
  createEmptyPeriodMetrics,
} from '~/types/metrics'

interface AppStore {
  // Event stream
  events: AppEvent[]
  addEvent: (event: AppEvent) => void
  updateEvent: (
    id: string,
    updates: Partial<Omit<AppEvent, 'id' | 'type'>>,
  ) => void
  deleteEvent: (id: string) => void
  clearAllEvents: () => void

  // Default interest rate (used when no rate change events exist)
  defaultInterestRate: number
  setDefaultInterestRate: (rate: number) => void

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
 * Apply interest for completed months and return updated events
 * This checks for months that need interest application and adds the events
 */
function applyInterestForCompletedMonths(
  events: AppEvent[],
  currentInterestRate: number = 3.5,
): AppEvent[] {
  const currentMonthKey = getCurrentMonthKey()
  const interestEvents = generateInterestApplicationEvents(
    events,
    currentMonthKey,
    currentInterestRate,
  )

  if (interestEvents.length > 0) {
    return [...events, ...interestEvents]
  }
  return events
}

/**
 * Get the current interest rate from events (or default if none)
 */
function getCurrentInterestRateFromEvents(
  events: AppEvent[],
  defaultRate: number = FALLBACK_INTEREST_RATE,
): number {
  const rateChangeEvents = events
    .filter((e) => e.type === 'INTEREST_RATE_CHANGE')
    .sort((a, b) => {
      if (
        a.type === 'INTEREST_RATE_CHANGE' &&
        b.type === 'INTEREST_RATE_CHANGE'
      ) {
        return a.date.localeCompare(b.date)
      }
      return 0
    })

  if (rateChangeEvents.length > 0) {
    const lastRate = rateChangeEvents[rateChangeEvents.length - 1]
    if (lastRate && lastRate.type === 'INTEREST_RATE_CHANGE') {
      return lastRate.newRate
    }
  }
  return defaultRate
}

/**
 * Calculate metrics from all events
 */
function calculateMetricsFromEvents(
  events: AppEvent[],
  defaultInterestRate: number = FALLBACK_INTEREST_RATE,
): DashboardMetrics {
  const sortedEvents = sortEventsByDateAsc(events)
  const currentMonthKey = getCurrentMonthKey()
  const { start: currentMonthStart, end: currentMonthEnd } =
    getMonthBounds(currentMonthKey)

  // Initialize metrics
  let metrics: DashboardMetrics = createEmptyDashboardMetrics()
  const monthlyMap = new Map<string, PeriodMetrics>()

  // Extract current interest rate from events
  const rateChangeEvents = sortedEvents.filter(
    (e) => e.type === 'INTEREST_RATE_CHANGE',
  )
  if (rateChangeEvents.length > 0) {
    const currentRate = rateChangeEvents[rateChangeEvents.length - 1]
    if (currentRate && currentRate.type === 'INTEREST_RATE_CHANGE') {
      metrics.currentInterestRate = currentRate.newRate
      metrics.interestRateHistory = rateChangeEvents
        .filter((e): e is import('~/types/events').InterestRateChangeEvent => e.type === 'INTEREST_RATE_CHANGE')
        .map((e) => ({ effectiveDate: e.date, rate: e.newRate }))
    }
  }

  // Process all events
  for (const event of sortedEvents) {
    const monthKey = getMonthKey(event.date)
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
    metrics.currentMonth = createEmptyPeriodMetrics(
      currentMonthStart,
      currentMonthEnd,
    )
  }

  // Calculate pending interest for current month
  // Pass the default rate so getEffectiveRateForDate can use it for dates before rate changes
  const { pendingOnAvoided, pendingOnSpent } =
    calculatePendingInterestForCurrentMonth(
      sortedEvents,
      defaultInterestRate,
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
      defaultInterestRate: FALLBACK_INTEREST_RATE,

      setDefaultInterestRate: (rate) => {
        set((state) => {
          // Recalculate all interest with new default rate
          const filteredEvents = state.events.filter(
            (e) => e.type !== 'INTEREST_APPLICATION',
          )
          // Use the new default rate directly for recalculation
          const newEvents = applyInterestForCompletedMonths(filteredEvents, rate)
          const newMetrics = calculateMetricsFromEvents(newEvents, rate)
          return {
            defaultInterestRate: rate,
            events: newEvents,
            metrics: newMetrics,
          }
        })
      },

      addEvent: (event) => {
        set((state) => {
          // Remove existing interest application events - they will be regenerated
          // This ensures retroactive purchases trigger recalculation of all affected months
          const filteredEvents = state.events.filter(
            (e) => e.type !== 'INTEREST_APPLICATION',
          )
          const withNewEvent = [...filteredEvents, event]
          const currentRate = getCurrentInterestRateFromEvents(
            withNewEvent,
            state.defaultInterestRate,
          )
          const newEvents = applyInterestForCompletedMonths(withNewEvent, currentRate)
          const newMetrics = calculateMetricsFromEvents(newEvents, state.defaultInterestRate)
          return { events: newEvents, metrics: newMetrics }
        })
      },

      updateEvent: (id, updates) => {
        set((state) => {
          // First, remove any auto-generated interest application events
          // They will be regenerated based on the updated data
          const updatedEvents = state.events
            .filter((event) => event.type !== 'INTEREST_APPLICATION')
            .map((event) => {
              if (event.id === id) {
                return { ...event, ...updates }
              }
              return event
            })
          const currentRate = getCurrentInterestRateFromEvents(
            updatedEvents,
            state.defaultInterestRate,
          )
          const newEvents = applyInterestForCompletedMonths(updatedEvents, currentRate)
          const newMetrics = calculateMetricsFromEvents(newEvents, state.defaultInterestRate)
          return { events: newEvents, metrics: newMetrics }
        })
      },

      deleteEvent: (id) => {
        set((state) => {
          // First, remove the event and any auto-generated interest application events
          // They will be regenerated based on the updated data
          const filteredEvents = state.events.filter(
            (event) => event.id !== id && event.type !== 'INTEREST_APPLICATION',
          )
          const currentRate = getCurrentInterestRateFromEvents(
            filteredEvents,
            state.defaultInterestRate,
          )
          const newEvents = applyInterestForCompletedMonths(filteredEvents, currentRate)
          const newMetrics = calculateMetricsFromEvents(newEvents, state.defaultInterestRate)
          return { events: newEvents, metrics: newMetrics }
        })
      },

      clearAllEvents: () => {
        set(() => ({
          events: [],
          metrics: createEmptyDashboardMetrics(),
          defaultInterestRate: FALLBACK_INTEREST_RATE,
        }))
      },

      recalculateMetrics: () => {
        set((state) => ({
          metrics: calculateMetricsFromEvents(state.events, state.defaultInterestRate),
        }))
      },

      getEventById: (id) => {
        return get().events.find((event) => event.id === id)
      },

      getEventsByMonth: (monthKey) => {
        return get().events.filter((event) =>
          isDateInMonth(event.date, monthKey),
        )
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
      partialize: (state) => ({
        events: state.events,
        defaultInterestRate: state.defaultInterestRate,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Validate events using Zod schema
          const validationResult = AppEventsArraySchema.safeParse(state.events)
          
          if (!validationResult.success) {
            console.error('Event validation failed:', validationResult.error)
            // Reset everything - clear localStorage and start fresh
            state.events = []
            state.defaultInterestRate = FALLBACK_INTEREST_RATE
            state.metrics = createEmptyDashboardMetrics()
            return
          }

          // Apply interest for any completed months and recalculate metrics
          const defaultRate =
            state.defaultInterestRate ?? FALLBACK_INTEREST_RATE
          const currentRate = getCurrentInterestRateFromEvents(
            state.events,
            defaultRate,
          )
          state.events = applyInterestForCompletedMonths(
            state.events,
            currentRate,
          )
          state.metrics = calculateMetricsFromEvents(state.events, defaultRate)
        }
      },
    },
  ),
)
