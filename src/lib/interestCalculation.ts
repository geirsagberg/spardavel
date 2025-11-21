import type { AppEvent } from '~/types/events'
import { getMonthKey, getMonthBounds } from './eventUtils'

/**
 * Get the effective interest rate for a given date
 * Accounts for INTEREST_RATE_CHANGE events
 */
export function getEffectiveRateForDate(
  date: string,
  allEvents: AppEvent[],
  defaultRate: number = 3.5,
): number {
  const rateChangeEvents = allEvents
    .filter((e) => e.type === 'INTEREST_RATE_CHANGE')
    .sort((a, b) => {
      if (a.type === 'INTEREST_RATE_CHANGE' && b.type === 'INTEREST_RATE_CHANGE') {
        return a.effectiveDate.localeCompare(b.effectiveDate)
      }
      return 0
    })

  // Find the most recent rate change on or before this date
  let effectiveRate = defaultRate
  for (const event of rateChangeEvents) {
    if (event.type === 'INTEREST_RATE_CHANGE' && event.effectiveDate <= date) {
      effectiveRate = event.newRate
    } else {
      break
    }
  }

  return effectiveRate
}

/**
 * Calculate pending interest for the current month up to today
 * Returns { pendingOnAvoided, pendingOnSpent }
 */
export function calculatePendingInterestForCurrentMonth(
  events: AppEvent[],
  currentInterestRate: number = 3.5,
): { pendingOnAvoided: number; pendingOnSpent: number } {
  const today = new Date().toISOString().split('T')[0]
  const currentMonthKey = getMonthKey(new Date().toISOString())
  const { start: monthStart } = getMonthBounds(currentMonthKey)

  // Filter events that occurred in this month or earlier
  const relevantEvents = events.filter((e) => {
    const eventDate = e.timestamp.split('T')[0]
    return eventDate <= today && (e.type === 'PURCHASE' || e.type === 'AVOIDED_PURCHASE')
  })

  let pendingOnAvoided = 0
  let pendingOnSpent = 0

  // Iterate through each day from month start to today
  const currentDate = new Date(monthStart)
  const endDate = new Date(today)

  while (currentDate <= endDate) {
    const dateStr = currentDate.toISOString().split('T')[0]

    // Get effective rate for this date
    const rate = getEffectiveRateForDate(dateStr, events, currentInterestRate)
    const dailyRate = rate / 365

    // Calculate running balance as of this date
    let avoidedBalance = 0
    let purchaseBalance = 0

    for (const event of relevantEvents) {
      const eventDate = event.timestamp.split('T')[0]
      if (eventDate > dateStr) {
        break // Only include events up to current date
      }

      if (event.type === 'AVOIDED_PURCHASE') {
        avoidedBalance += event.amount
      } else if (event.type === 'PURCHASE') {
        purchaseBalance += event.amount
      }
    }

    // Add daily interest
    pendingOnAvoided += avoidedBalance * dailyRate
    pendingOnSpent += purchaseBalance * dailyRate

    // Move to next day
    currentDate.setDate(currentDate.getDate() + 1)
  }

  // Round to 2 decimal places to avoid floating point issues
  return {
    pendingOnAvoided: Math.round(pendingOnAvoided * 100) / 100,
    pendingOnSpent: Math.round(pendingOnSpent * 100) / 100,
  }
}

/**
 * Check if a month needs interest application
 * Returns true if we're past the last day of the month
 */
export function shouldApplyMonthlyInterest(monthKey: string): boolean {
  const today = new Date()
  const currentMonthKey = getMonthKey(new Date().toISOString())

  // Only apply interest if we're in a different month than the one we're checking
  return monthKey < currentMonthKey
}

/**
 * Get all months that need interest application (past months without it)
 */
export function getMonthsNeedingInterestApplication(
  events: AppEvent[],
  currentMonthKey: string,
): string[] {
  const monthsWithEvents = new Set<string>()
  const monthsWithApplication = new Set<string>()

  for (const event of events) {
    if (event.type === 'PURCHASE' || event.type === 'AVOIDED_PURCHASE') {
      const monthKey = getMonthKey(event.timestamp)
      if (monthKey < currentMonthKey) {
        monthsWithEvents.add(monthKey)
      }
    } else if (event.type === 'INTEREST_APPLICATION') {
      const monthKey = getMonthKey(event.appliedDate)
      monthsWithApplication.add(monthKey)
    }
  }

  // Return months with events that don't have interest application
  return Array.from(monthsWithEvents)
    .filter((m) => !monthsWithApplication.has(m))
    .sort()
}
