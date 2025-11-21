import type { AppEvent, InterestApplicationEvent } from '~/types/events'
import { getMonthKey, getMonthBounds, createInterestApplicationEvent } from './eventUtils'
import { FALLBACK_INTEREST_RATE } from './constants'

/**
 * Get the effective interest rate for a given date
 * Accounts for INTEREST_RATE_CHANGE events
 */
export function getEffectiveRateForDate(
  date: string,
  allEvents: AppEvent[],
  defaultRate: number = FALLBACK_INTEREST_RATE,
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
  currentInterestRate: number = FALLBACK_INTEREST_RATE,
): { pendingOnAvoided: number; pendingOnSpent: number } {
  const today = new Date().toISOString().split('T')[0]!
  const currentMonthKey = getMonthKey(today)
  const { start: monthStart } = getMonthBounds(currentMonthKey)

  // Filter events that occurred in this month or earlier
  // Include INTEREST_APPLICATION for compounding
  const relevantEvents = events.filter((e) => {
    return e.date <= today && 
      (e.type === 'PURCHASE' || e.type === 'AVOIDED_PURCHASE' || e.type === 'INTEREST_APPLICATION')
  })

  let pendingOnAvoided = 0
  let pendingOnSpent = 0

  // Iterate through each day from month start to today
  const currentDate = new Date(monthStart)
  const endDate = new Date(today)

  while (currentDate <= endDate) {
    const dateStr = currentDate.toISOString().split('T')[0]!

    // Get effective rate for this date
    const rate = getEffectiveRateForDate(dateStr, events, currentInterestRate)
    const dailyRate = rate / 100 / 365

    // Calculate running balance as of this date (including applied interest for compounding)
    let avoidedBalance = 0
    let purchaseBalance = 0

    for (const event of relevantEvents) {
      if (event.date > dateStr) {
        break // Only include events up to current date
      }

      if (event.type === 'AVOIDED_PURCHASE') {
        avoidedBalance += event.amount
      } else if (event.type === 'PURCHASE') {
        purchaseBalance += event.amount
      } else if (event.type === 'INTEREST_APPLICATION') {
        // Add applied interest to balances for compounding
        avoidedBalance += event.pendingOnAvoided
        purchaseBalance += event.pendingOnSpent
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
 * A month needs application if:
 * 1. It has purchase/avoided_purchase events OR has a carried-forward balance from earlier months
 * 2. It's before the current month
 * 3. It doesn't already have an INTEREST_APPLICATION event
 */
export function getMonthsNeedingInterestApplication(
  events: AppEvent[],
  currentMonthKey: string,
): string[] {
  const monthsWithApplication = new Set<string>()
  
  // Find months that already have interest application
  for (const event of events) {
    if (event.type === 'INTEREST_APPLICATION') {
      const monthKey = getMonthKey(event.appliedDate)
      monthsWithApplication.add(monthKey)
    }
  }

  // Find the earliest transaction month
  let earliestMonthKey: string | null = null
  for (const event of events) {
    if (event.type === 'PURCHASE' || event.type === 'AVOIDED_PURCHASE') {
      const monthKey = getMonthKey(event.date)
      if (monthKey < currentMonthKey) {
        if (!earliestMonthKey || monthKey < earliestMonthKey) {
          earliestMonthKey = monthKey
        }
      }
    }
  }

  // If no transactions before current month, nothing to do
  if (!earliestMonthKey) {
    return []
  }

  // Generate all months from earliest transaction to current month (exclusive)
  const allMonths: string[] = []
  let currentMonth = earliestMonthKey
  while (currentMonth < currentMonthKey) {
    if (!monthsWithApplication.has(currentMonth)) {
      allMonths.push(currentMonth)
    }
    // Move to next month
    const [year, month] = currentMonth.split('-').map(Number)
    const nextDate = new Date(year!, month!, 1) // month is 0-indexed, so this gives us next month
    currentMonth = getMonthKey(nextDate.toISOString())
  }

  return allMonths.sort()
}

/**
 * Calculate interest for a specific completed month
 * Similar to calculatePendingInterestForCurrentMonth but for any month
 */
export function calculateInterestForMonth(
  events: AppEvent[],
  monthKey: string,
  defaultRate: number = FALLBACK_INTEREST_RATE,
): { pendingOnAvoided: number; pendingOnSpent: number } {
  const { start: monthStart, end: monthEnd } = getMonthBounds(monthKey)

  // Filter events that occurred on or before the month end
  // Include PURCHASE, AVOIDED_PURCHASE, and INTEREST_APPLICATION for compounding
  const relevantEvents = events
    .filter((e) => {
      return e.date <= monthEnd && 
        (e.type === 'PURCHASE' || e.type === 'AVOIDED_PURCHASE' || e.type === 'INTEREST_APPLICATION')
    })
    .sort((a, b) => a.date.localeCompare(b.date))

  let pendingOnAvoided = 0
  let pendingOnSpent = 0

  // Iterate through each day of the month
  const currentDate = new Date(monthStart)
  const endDate = new Date(monthEnd)

  while (currentDate <= endDate) {
    const dateStr = currentDate.toISOString().split('T')[0]!

    // Get effective rate for this date
    const rate = getEffectiveRateForDate(dateStr, events, defaultRate)
    const dailyRate = rate / 100 / 365

    // Calculate running balance as of this date (including applied interest for compounding)
    let avoidedBalance = 0
    let purchaseBalance = 0

    for (const event of relevantEvents) {
      if (event.date > dateStr) {
        break
      }

      if (event.type === 'AVOIDED_PURCHASE') {
        avoidedBalance += event.amount
      } else if (event.type === 'PURCHASE') {
        purchaseBalance += event.amount
      } else if (event.type === 'INTEREST_APPLICATION') {
        // Add applied interest to balances for compounding
        avoidedBalance += event.pendingOnAvoided
        purchaseBalance += event.pendingOnSpent
      }
    }

    // Add daily interest
    pendingOnAvoided += avoidedBalance * dailyRate
    pendingOnSpent += purchaseBalance * dailyRate

    // Move to next day
    currentDate.setDate(currentDate.getDate() + 1)
  }

  return {
    pendingOnAvoided: Math.round(pendingOnAvoided * 100) / 100,
    pendingOnSpent: Math.round(pendingOnSpent * 100) / 100,
  }
}

/**
 * Generate INTEREST_APPLICATION events for all completed months that need them
 * Returns the new events that should be added to the store
 */
export function generateInterestApplicationEvents(
  events: AppEvent[],
  currentMonthKey: string,
  defaultRate: number = FALLBACK_INTEREST_RATE,
): InterestApplicationEvent[] {
  const monthsNeedingApplication = getMonthsNeedingInterestApplication(events, currentMonthKey)
  const newEvents: InterestApplicationEvent[] = []

  for (const monthKey of monthsNeedingApplication) {
    const { end: monthEnd } = getMonthBounds(monthKey)
    const { pendingOnAvoided, pendingOnSpent } = calculateInterestForMonth(
      events,
      monthKey,
      defaultRate,
    )

    // Only create event if there's interest to apply
    if (pendingOnAvoided > 0 || pendingOnSpent > 0) {
      const applicationEvent = createInterestApplicationEvent(
        pendingOnAvoided,
        pendingOnSpent,
        monthEnd,
        monthEnd, // Use the month end date
      )
      newEvents.push(applicationEvent)
    }
  }

  return newEvents
}
