import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { FALLBACK_INTEREST_RATE } from '~/lib/constants'
import { isDateInMonth } from '~/lib/eventUtils'
import type { AppEvent } from '~/types/events'
import { AppEventsArraySchema } from '~/types/events'
import type {
  AllTimeMetrics,
  DashboardMetrics,
  PeriodMetrics,
} from '~/types/metrics'
import { createEmptyDashboardMetrics } from '~/types/metrics'
import {
  sortEvents,
  applyInterestForCompletedMonths,
  getCurrentInterestRateFromEvents,
  calculateMetricsFromEvents,
} from './storeHelpers'

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

  // Theme
  theme: string
  setTheme: (theme: string) => void

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

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      events: [],
      metrics: createEmptyDashboardMetrics(),
      defaultInterestRate: FALLBACK_INTEREST_RATE,
      theme: 'dark',

      setTheme: (theme) => {
        set({ theme })
      },

      setDefaultInterestRate: (rate) => {
        set((state) => {
          // Recalculate all interest with new default rate
          const filteredEvents = sortEvents(
            state.events.filter(
              (e) => e.type !== 'INTEREST_APPLICATION',
            )
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
          const withNewEvent = sortEvents([...filteredEvents, event])
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
          const updatedEvents = sortEvents(
            state.events
              .filter((event) => event.type !== 'INTEREST_APPLICATION')
              .map((event) => {
                if (event.id === id) {
                  return { ...event, ...updates }
                }
                return event
              })
          )
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
          const filteredEvents = sortEvents(
            state.events.filter(
              (event) => event.id !== id && event.type !== 'INTEREST_APPLICATION',
            )
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
        theme: state.theme,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Validate events using Zod schema
          const validationResult = AppEventsArraySchema.safeParse(state.events)
          
          if (!validationResult.success) {
            console.error('Event validation failed:', validationResult.error)
            const shouldReset = window.confirm(
              'The stored data format is outdated or invalid. Would you like to reset all data?\n\n' +
              'OK = Clear all data and start fresh\n' +
              'Cancel = Keep invalid data (may cause errors)'
            )
            
            if (shouldReset) {
              // Clear localStorage completely to ensure fresh start
              localStorage.removeItem(STORAGE_KEY)
              state.events = []
              state.defaultInterestRate = FALLBACK_INTEREST_RATE
              state.metrics = createEmptyDashboardMetrics()
              return
            }
          }

          // Apply interest for any completed months and recalculate metrics
          const defaultRate =
            state.defaultInterestRate ?? FALLBACK_INTEREST_RATE
          const currentRate = getCurrentInterestRateFromEvents(
            state.events,
            defaultRate,
          )
          // Ensure events are sorted after rehydration
          state.events = sortEvents(
            applyInterestForCompletedMonths(
              state.events,
              currentRate,
            )
          )
          state.metrics = calculateMetricsFromEvents(state.events, defaultRate)
        }
      },
    },
  ),
)
