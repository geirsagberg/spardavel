import { v7 as uuidv7 } from 'uuid'
import type { AppEvent, PurchaseEvent, AvoidedPurchaseEvent, InterestRateChangeEvent, InterestApplicationEvent, Category } from '~/types/events'

/**
 * Create a new purchase event
 */
export function createPurchaseEvent(
  amount: number,
  category: Category,
  description: string,
  date = new Date().toISOString().split('T')[0]!,
): PurchaseEvent {
  return {
    type: 'PURCHASE',
    id: uuidv7(),
    date,
    amount,
    category,
    description,
  }
}

/**
 * Create a new avoided purchase event
 */
export function createAvoidedPurchaseEvent(
  amount: number,
  category: Category,
  description: string,
  date = new Date().toISOString().split('T')[0]!,
): AvoidedPurchaseEvent {
  return {
    type: 'AVOIDED_PURCHASE',
    id: uuidv7(),
    date,
    amount,
    category,
    description,
  }
}

/**
 * Create an interest rate change event
 */
export function createInterestRateChangeEvent(
  newRate: number,
  effectiveDate: string,
  notes?: string,
  date = new Date().toISOString().split('T')[0]!,
): InterestRateChangeEvent {
  return {
    type: 'INTEREST_RATE_CHANGE',
    id: uuidv7(),
    date,
    effectiveDate,
    newRate,
    notes,
  }
}

/**
 * Create an interest application event
 */
export function createInterestApplicationEvent(
  pendingOnAvoided: number,
  pendingOnSpent: number,
  appliedDate: string,
  date = appliedDate,
): InterestApplicationEvent {
  return {
    type: 'INTEREST_APPLICATION',
    id: uuidv7(),
    date,
    appliedDate,
    pendingOnAvoided,
    pendingOnSpent,
  }
}

/**
 * Sort events by date (desc) and then by ID (desc) as tiebreaker
 */
export function sortEventsByDateDesc(events: AppEvent[]): AppEvent[] {
  return [...events].sort((a, b) => {
    const dateCompare = b.date.localeCompare(a.date)
    if (dateCompare !== 0) return dateCompare
    return b.id.localeCompare(a.id)
  })
}

/**
 * Sort events by date (asc) and then by ID (asc) as tiebreaker
 * Used for calculations that need chronological order
 */
export function sortEventsByDateAsc(events: AppEvent[]): AppEvent[] {
  return [...events].sort((a, b) => {
    const dateCompare = a.date.localeCompare(b.date)
    if (dateCompare !== 0) return dateCompare
    return a.id.localeCompare(b.id)
  })
}

/**
 * Legacy: Sort events by UUIDv7 (naturally ordered by creation timestamp)
 * @deprecated Use sortEventsByDateAsc instead
 */
export function sortEventsByUUID(events: AppEvent[]): AppEvent[] {
  return sortEventsByDateAsc(events)
}

/**
 * Validate event structure
 */
export function isValidEvent(event: unknown): event is AppEvent {
  if (!event || typeof event !== 'object') return false

  const e = event as Record<string, unknown>

  if (!e.type || !e.id || !e.date) return false
  if (typeof e.type !== 'string' || typeof e.id !== 'string' || typeof e.date !== 'string') {
    return false
  }

  switch (e.type) {
    case 'PURCHASE':
    case 'AVOIDED_PURCHASE':
      return (
        typeof e.amount === 'number' &&
        typeof e.category === 'string' &&
        typeof e.description === 'string'
      )
    case 'INTEREST_RATE_CHANGE':
      return typeof e.effectiveDate === 'string' && typeof e.newRate === 'number'
    case 'INTEREST_APPLICATION':
      return (
        typeof e.appliedDate === 'string' &&
        typeof e.pendingOnAvoided === 'number' &&
        typeof e.pendingOnSpent === 'number'
      )
    default:
      return false
  }
}

/**
 * Get the month-year key for grouping events
 */
export function getMonthKey(date: string): string {
  // Date is already in YYYY-MM-DD format, just extract YYYY-MM
  return date.substring(0, 7)
}

/**
 * Get the first and last day of a month
 */
export function getMonthBounds(monthKey: string): { start: string; end: string } {
  const [year, month] = monthKey.split('-').map(Number)
  const start = new Date(year!, month! - 1, 1).toISOString().split('T')[0]!
  const end = new Date(year!, month!, 0).toISOString().split('T')[0]!
  return { start, end }
}

/**
 * Get the current month key
 */
export function getCurrentMonthKey(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

/**
 * Check if a date is in a specific month
 */
export function isDateInMonth(date: string, monthKey: string): boolean {
  return getMonthKey(date) === monthKey
}
