import { FALLBACK_INTEREST_RATE } from '~/lib/constants'
import {
  getCurrentMonthKey,
  getMonthBounds,
  getMonthKey,
  sortEventsByDateAsc,
} from '~/lib/eventUtils'
import {
  calculatePendingInterestForCurrentMonth,
  generateInterestApplicationEvents,
} from '~/lib/interestCalculation'
import type { AppEvent } from '~/types/events'
import type {
  DashboardMetrics,
  PeriodMetrics,
} from '~/types/metrics'
import {
  createEmptyDashboardMetrics,
  createEmptyPeriodMetrics,
} from '~/types/metrics'

/**
 * Sort events by date then by id to maintain consistent order
 * This ensures events are always stored in sorted order
 */
export function sortEvents(events: AppEvent[]): AppEvent[] {
  return sortEventsByDateAsc(events)
}

/**
 * Apply interest for completed months and return updated events
 * This checks for months that need interest application and adds the events
 */
export function applyInterestForCompletedMonths(
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
    return sortEvents([...events, ...interestEvents])
  }
  return events
}

/**
 * Get the current interest rate from events (or default if none)
 */
export function getCurrentInterestRateFromEvents(
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
 * Events are expected to already be sorted by date then id
 */
export function calculateMetricsFromEvents(
  events: AppEvent[],
  defaultInterestRate: number = FALLBACK_INTEREST_RATE,
): DashboardMetrics {
  const currentMonthKey = getCurrentMonthKey()
  const { start: currentMonthStart, end: currentMonthEnd } =
    getMonthBounds(currentMonthKey)

  // Initialize metrics
  const metrics: DashboardMetrics = createEmptyDashboardMetrics()
  const monthlyMap = new Map<string, PeriodMetrics>()

  // Extract current interest rate from events
  const rateChangeEvents = events.filter(
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
  for (const event of events) {
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
        metrics.allTime.missedInterest += event.pendingOnSpent
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
      events,
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
