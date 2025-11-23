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
        return a.date.localeCompare(b.date)
      }
      return 0
    })

  // Find the most recent rate change on or before this date
  let effectiveRate = defaultRate
  for (const event of rateChangeEvents) {
    if (event.type === 'INTEREST_RATE_CHANGE' && event.date <= date) {
      effectiveRate = event.newRate
    } else {
      break
    }
  }

  return effectiveRate
}

/**
 * Calculate pending interest for the current month up to today.
 * Uses the same optimized period-based calculation as calculateInterestForMonth.
 * Returns { pendingOnAvoided, pendingOnSpent }
 */
export function calculatePendingInterestForCurrentMonth(
  events: AppEvent[],
  defaultRate: number = FALLBACK_INTEREST_RATE,
): { pendingOnAvoided: number; pendingOnSpent: number } {
  const today = new Date().toISOString().split('T')[0]!
  const currentMonthKey = getMonthKey(today)
  const { start: monthStart } = getMonthBounds(currentMonthKey)

  // Use the shared implementation with today as the end date
  return calculateInterestForDateRange(events, monthStart, today, defaultRate)
}

/**
 * Shared implementation for calculating interest over a date range.
 * Used by both calculatePendingInterestForCurrentMonth and calculateInterestForMonth.
 */
function calculateInterestForDateRange(
  events: AppEvent[],
  rangeStart: string,
  rangeEnd: string,
  defaultRate: number,
): { pendingOnAvoided: number; pendingOnSpent: number } {
  // Filter balance-affecting events on or before range end
  const balanceEvents = events
    .filter((e) =>
      e.date <= rangeEnd &&
      (e.type === 'PURCHASE' || e.type === 'AVOIDED_PURCHASE' || e.type === 'INTEREST_APPLICATION')
    )
    .sort((a, b) => a.date.localeCompare(b.date))

  // Initialize balances from events before the range
  let avoidedBalance = 0
  let purchaseBalance = 0
  for (const event of balanceEvents) {
    if (event.date >= rangeStart) break
    if (event.type === 'AVOIDED_PURCHASE') {
      avoidedBalance += event.amount
    } else if (event.type === 'PURCHASE') {
      purchaseBalance += event.amount
    } else if (event.type === 'INTEREST_APPLICATION') {
      avoidedBalance += event.pendingOnAvoided
      purchaseBalance += event.pendingOnSpent
    }
  }

  // Get events within the range
  const rangeEvents = balanceEvents.filter(
    (e) => e.date >= rangeStart && e.date <= rangeEnd
  )
  const eventDates = [...new Set(rangeEvents.map((e) => e.date))].sort()

  // Get rate periods for the range
  const ratePeriods = getRatePeriodsForRange(rangeStart, rangeEnd, events, defaultRate)

  // Build balance change points
  const balanceChanges = new Map<string, { avoided: number; purchase: number }>()
  for (const event of rangeEvents) {
    if (!balanceChanges.has(event.date)) {
      balanceChanges.set(event.date, { avoided: 0, purchase: 0 })
    }
    const change = balanceChanges.get(event.date)!
    if (event.type === 'AVOIDED_PURCHASE') {
      change.avoided += event.amount
    } else if (event.type === 'PURCHASE') {
      change.purchase += event.amount
    } else if (event.type === 'INTEREST_APPLICATION') {
      change.avoided += event.pendingOnAvoided
      change.purchase += event.pendingOnSpent
    }
  }

  let pendingOnAvoided = 0
  let pendingOnSpent = 0

  // Process each rate period
  for (const ratePeriod of ratePeriods) {
    const dailyRate = ratePeriod.rate / 100 / 365

    // Find balance change dates within this rate period
    const changesInPeriod = eventDates.filter(
      (d) => d >= ratePeriod.start && d <= ratePeriod.end
    )

    if (changesInPeriod.length === 0) {
      // No balance changes in this rate period - calculate in bulk
      const days = countDaysInclusive(ratePeriod.start, ratePeriod.end)
      pendingOnAvoided += avoidedBalance * dailyRate * days
      pendingOnSpent += purchaseBalance * dailyRate * days
    } else {
      // Split rate period into sub-periods based on balance changes
      let subStart = ratePeriod.start

      for (const changeDate of changesInPeriod) {
        // Calculate interest for days before the change date (if any)
        if (subStart < changeDate) {
          const daysBefore = countDaysInclusive(subStart, getPreviousDay(changeDate))
          pendingOnAvoided += avoidedBalance * dailyRate * daysBefore
          pendingOnSpent += purchaseBalance * dailyRate * daysBefore
        }

        // Apply balance change (events on this date affect this day's interest)
        const change = balanceChanges.get(changeDate)!
        avoidedBalance += change.avoided
        purchaseBalance += change.purchase

        // Calculate interest for the change date with new balance
        pendingOnAvoided += avoidedBalance * dailyRate
        pendingOnSpent += purchaseBalance * dailyRate

        // Next sub-period starts the day after
        subStart = getNextDay(changeDate)
      }

      // Calculate remaining days after last balance change
      if (subStart <= ratePeriod.end) {
        const days = countDaysInclusive(subStart, ratePeriod.end)
        pendingOnAvoided += avoidedBalance * dailyRate * days
        pendingOnSpent += purchaseBalance * dailyRate * days
      }
    }
  }

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
      const monthKey = getMonthKey(event.date)
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
    // Move to next month by manipulating the month string directly to avoid timezone issues
    const [year, month] = currentMonth.split('-').map(Number)
    const nextMonth = month! === 12 ? 1 : month! + 1
    const nextYear = month! === 12 ? year! + 1 : year!
    currentMonth = `${nextYear}-${String(nextMonth).padStart(2, '0')}`
  }

  return allMonths.sort()
}

/**
 * Get rate periods for a date range, sorted by start date.
 * Each period has a start date, end date, and the effective rate.
 * Handles multiple rate changes efficiently.
 */
function getRatePeriodsForRange(
  rangeStart: string,
  rangeEnd: string,
  allEvents: AppEvent[],
  defaultRate: number,
): Array<{ start: string; end: string; rate: number }> {
  // Get all rate changes sorted by date
  const rateChanges = allEvents
    .filter((e): e is import('~/types/events').InterestRateChangeEvent =>
      e.type === 'INTEREST_RATE_CHANGE'
    )
    .sort((a, b) => a.date.localeCompare(b.date))

  // Find the rate at range start (most recent rate change before or on range start)
  let initialRate = defaultRate
  for (const rc of rateChanges) {
    if (rc.date <= rangeStart) {
      initialRate = rc.newRate
    } else {
      break
    }
  }

  // Find rate changes within the range
  const changesInRange = rateChanges.filter(
    (rc) => rc.date > rangeStart && rc.date <= rangeEnd
  )

  if (changesInRange.length === 0) {
    // No rate changes in range - single period with initial rate
    return [{ start: rangeStart, end: rangeEnd, rate: initialRate }]
  }

  // Build periods from rate changes
  const periods: Array<{ start: string; end: string; rate: number }> = []
  let currentStart = rangeStart
  let currentRate = initialRate

  for (const rc of changesInRange) {
    // End previous period on the day before rate change
    const prevDay = getPreviousDay(rc.date)
    if (prevDay >= currentStart) {
      periods.push({ start: currentStart, end: prevDay, rate: currentRate })
    }
    currentStart = rc.date
    currentRate = rc.newRate
  }

  // Add final period
  periods.push({ start: currentStart, end: rangeEnd, rate: currentRate })

  return periods
}

/**
 * Get the previous day as YYYY-MM-DD string
 */
function getPreviousDay(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number)
  const date = new Date(year!, month! - 1, day!)
  date.setDate(date.getDate() - 1)
  return date.toISOString().split('T')[0]!
}

/**
 * Get the next day as YYYY-MM-DD string
 */
function getNextDay(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number)
  const date = new Date(year!, month! - 1, day!)
  date.setDate(date.getDate() + 1)
  return date.toISOString().split('T')[0]!
}

/**
 * Count days between two dates (inclusive of both start and end)
 */
function countDaysInclusive(start: string, end: string): number {
  const [sy, sm, sd] = start.split('-').map(Number)
  const [ey, em, ed] = end.split('-').map(Number)
  const startDate = new Date(sy!, sm! - 1, sd!)
  const endDate = new Date(ey!, em! - 1, ed!)
  return Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
}

/**
 * Calculate interest for a specific completed month.
 * Efficiently handles mid-month rate changes by computing interest periods.
 */
export function calculateInterestForMonth(
  events: AppEvent[],
  monthKey: string,
  defaultRate: number = FALLBACK_INTEREST_RATE,
): { pendingOnAvoided: number; pendingOnSpent: number } {
  const { start: monthStart, end: monthEnd } = getMonthBounds(monthKey)
  return calculateInterestForDateRange(events, monthStart, monthEnd, defaultRate)
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
  
  // Create a combined array that includes both existing events and newly generated interest events
  // This ensures compound interest works correctly when generating interest for multiple months
  let eventsWithNewInterest = [...events]

  for (const monthKey of monthsNeedingApplication) {
    const { end: monthEnd } = getMonthBounds(monthKey)
    const { pendingOnAvoided, pendingOnSpent } = calculateInterestForMonth(
      eventsWithNewInterest,
      monthKey,
      defaultRate,
    )

    // Only create event if there's interest to apply
    if (pendingOnAvoided > 0 || pendingOnSpent > 0) {
      const applicationEvent = createInterestApplicationEvent(
        pendingOnAvoided,
        pendingOnSpent,
        monthEnd,
      )
      newEvents.push(applicationEvent)
      // Add to working array so subsequent months can compound on this interest
      eventsWithNewInterest.push(applicationEvent)
    }
  }

  return newEvents
}
