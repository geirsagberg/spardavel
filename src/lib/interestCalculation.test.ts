import { describe, expect, test } from 'bun:test'
import {
  getMonthsNeedingInterestApplication,
  calculateInterestForMonth,
  generateInterestApplicationEvents,
  getEffectiveRateForDate,
} from './interestCalculation'
import type { AppEvent, PurchaseEvent, AvoidedPurchaseEvent, InterestApplicationEvent, InterestRateChangeEvent } from '~/types/events'

function createPurchaseEvent(
  amount: number,
  timestamp: string,
  id: string = `test-${Date.now()}-${Math.random()}`,
): PurchaseEvent {
  return {
    type: 'PURCHASE',
    id,
    timestamp,
    amount,
    category: 'Other',
    description: 'Test purchase',
  }
}

function createAvoidedPurchaseEvent(
  amount: number,
  timestamp: string,
  id: string = `test-${Date.now()}-${Math.random()}`,
): AvoidedPurchaseEvent {
  return {
    type: 'AVOIDED_PURCHASE',
    id,
    timestamp,
    amount,
    category: 'Other',
    description: 'Test avoided purchase',
  }
}

function createInterestApplicationEvent(
  pendingOnAvoided: number,
  pendingOnSpent: number,
  appliedDate: string,
  timestamp: string,
  id: string = `test-${Date.now()}-${Math.random()}`,
): InterestApplicationEvent {
  return {
    type: 'INTEREST_APPLICATION',
    id,
    timestamp,
    appliedDate,
    pendingOnAvoided,
    pendingOnSpent,
  }
}

function createInterestRateChangeEvent(
  newRate: number,
  effectiveDate: string,
  timestamp: string,
  id: string = `test-${Date.now()}-${Math.random()}`,
): InterestRateChangeEvent {
  return {
    type: 'INTEREST_RATE_CHANGE',
    id,
    timestamp,
    effectiveDate,
    newRate,
  }
}

describe('getMonthsNeedingInterestApplication', () => {
  test('returns empty array when no events', () => {
    const result = getMonthsNeedingInterestApplication([], '2025-11')
    expect(result).toEqual([])
  })

  test('returns empty array when only current month has events', () => {
    const events: AppEvent[] = [
      createPurchaseEvent(100, '2025-11-15T10:00:00Z'),
    ]
    const result = getMonthsNeedingInterestApplication(events, '2025-11')
    expect(result).toEqual([])
  })

  test('returns previous month when it has events but no interest application', () => {
    const events: AppEvent[] = [
      createPurchaseEvent(100, '2025-10-15T10:00:00Z'),
    ]
    const result = getMonthsNeedingInterestApplication(events, '2025-11')
    expect(result).toEqual(['2025-10'])
  })

  test('returns empty array when previous month already has interest application', () => {
    const events: AppEvent[] = [
      createPurchaseEvent(100, '2025-10-15T10:00:00Z'),
      createInterestApplicationEvent(0.5, 0.5, '2025-10-31', '2025-10-31T23:59:59Z'),
    ]
    const result = getMonthsNeedingInterestApplication(events, '2025-11')
    expect(result).toEqual([])
  })

  test('returns multiple months in order when they need application', () => {
    const events: AppEvent[] = [
      createPurchaseEvent(100, '2025-08-15T10:00:00Z'),
      createAvoidedPurchaseEvent(50, '2025-09-10T10:00:00Z'),
      createPurchaseEvent(200, '2025-10-20T10:00:00Z'),
    ]
    const result = getMonthsNeedingInterestApplication(events, '2025-11')
    expect(result).toEqual(['2025-08', '2025-09', '2025-10'])
  })

  test('excludes months that already have interest application', () => {
    const events: AppEvent[] = [
      createPurchaseEvent(100, '2025-08-15T10:00:00Z'),
      createInterestApplicationEvent(0.5, 0.5, '2025-08-31', '2025-08-31T23:59:59Z'),
      createAvoidedPurchaseEvent(50, '2025-09-10T10:00:00Z'),
      createPurchaseEvent(200, '2025-10-20T10:00:00Z'),
    ]
    const result = getMonthsNeedingInterestApplication(events, '2025-11')
    expect(result).toEqual(['2025-09', '2025-10'])
  })
})

describe('calculateInterestForMonth', () => {
  test('calculates zero interest when no events in month', () => {
    const result = calculateInterestForMonth([], '2025-10', 3.5)
    expect(result.pendingOnAvoided).toBe(0)
    expect(result.pendingOnSpent).toBe(0)
  })

  test('calculates interest for a single purchase at start of month', () => {
    const events: AppEvent[] = [
      createPurchaseEvent(1000, '2025-10-01T00:00:00Z'),
    ]
    const result = calculateInterestForMonth(events, '2025-10', 3.5)

    // 1000 kr for 31 days at 3.5% annual = 1000 * (3.5/100/365) * 31 = ~2.97
    expect(result.pendingOnSpent).toBeGreaterThan(2.9)
    expect(result.pendingOnSpent).toBeLessThan(3.1)
    expect(result.pendingOnAvoided).toBe(0)
  })

  test('calculates interest for avoided purchase', () => {
    const events: AppEvent[] = [
      createAvoidedPurchaseEvent(1000, '2025-10-01T00:00:00Z'),
    ]
    const result = calculateInterestForMonth(events, '2025-10', 3.5)

    expect(result.pendingOnAvoided).toBeGreaterThan(2.9)
    expect(result.pendingOnAvoided).toBeLessThan(3.1)
    expect(result.pendingOnSpent).toBe(0)
  })

  test('calculates interest proportionally for mid-month purchase', () => {
    const events: AppEvent[] = [
      createPurchaseEvent(1000, '2025-10-16T00:00:00Z'),
    ]
    const result = calculateInterestForMonth(events, '2025-10', 3.5)

    // 1000 kr for 16 days (Oct 16-31) at 3.5% annual = ~1.53
    expect(result.pendingOnSpent).toBeGreaterThan(1.4)
    expect(result.pendingOnSpent).toBeLessThan(1.7)
  })

  test('accumulates interest from previous month events', () => {
    const events: AppEvent[] = [
      createPurchaseEvent(1000, '2025-09-01T00:00:00Z'),
    ]
    const result = calculateInterestForMonth(events, '2025-10', 3.5)

    // 1000 kr for full 31 days of October
    expect(result.pendingOnSpent).toBeGreaterThan(2.9)
    expect(result.pendingOnSpent).toBeLessThan(3.1)
  })

  test('uses effective rate from rate change events', () => {
    const events: AppEvent[] = [
      createInterestRateChangeEvent(10, '2025-10-01', '2025-10-01T00:00:00Z'),
      createPurchaseEvent(1000, '2025-10-01T00:00:00Z'),
    ]
    const result = calculateInterestForMonth(events, '2025-10', 3.5)

    // 1000 kr for 31 days at 10% annual = ~8.49
    expect(result.pendingOnSpent).toBeGreaterThan(8)
    expect(result.pendingOnSpent).toBeLessThan(9)
  })
})

describe('generateInterestApplicationEvents', () => {
  test('generates no events when no months need application', () => {
    const events: AppEvent[] = [
      createPurchaseEvent(100, '2025-11-15T10:00:00Z'),
    ]
    const result = generateInterestApplicationEvents(events, '2025-11', 3.5)
    expect(result).toEqual([])
  })

  test('generates event for completed month with purchases', () => {
    const events: AppEvent[] = [
      createPurchaseEvent(1000, '2025-10-01T00:00:00Z'),
    ]
    const result = generateInterestApplicationEvents(events, '2025-11', 3.5)

    expect(result).toHaveLength(1)
    expect(result[0].type).toBe('INTEREST_APPLICATION')
    expect(result[0].appliedDate).toBe('2025-10-31')
    expect(result[0].pendingOnSpent).toBeGreaterThan(0)
  })

  test('generates event for completed month with avoided purchases', () => {
    const events: AppEvent[] = [
      createAvoidedPurchaseEvent(1000, '2025-10-01T00:00:00Z'),
    ]
    const result = generateInterestApplicationEvents(events, '2025-11', 3.5)

    expect(result).toHaveLength(1)
    expect(result[0].pendingOnAvoided).toBeGreaterThan(0)
    expect(result[0].pendingOnSpent).toBe(0)
  })

  test('generates multiple events for multiple months', () => {
    const events: AppEvent[] = [
      createPurchaseEvent(1000, '2025-08-15T00:00:00Z'),
      createAvoidedPurchaseEvent(500, '2025-09-10T00:00:00Z'),
      createPurchaseEvent(200, '2025-10-20T00:00:00Z'),
    ]
    const result = generateInterestApplicationEvents(events, '2025-11', 3.5)

    expect(result).toHaveLength(3)
    expect(result[0].appliedDate).toBe('2025-08-31')
    expect(result[1].appliedDate).toBe('2025-09-30')
    expect(result[2].appliedDate).toBe('2025-10-31')
  })

  test('does not generate events for months that already have application', () => {
    const events: AppEvent[] = [
      createPurchaseEvent(1000, '2025-10-01T00:00:00Z'),
      createInterestApplicationEvent(2.97, 0, '2025-10-31', '2025-10-31T23:59:59Z'),
    ]
    const result = generateInterestApplicationEvents(events, '2025-11', 3.5)

    expect(result).toHaveLength(0)
  })

  test('regenerates events when adding events for previous months', () => {
    // Simulate scenario: user adds event for October in November
    const events: AppEvent[] = [
      createPurchaseEvent(1000, '2025-10-15T00:00:00Z'),
    ]

    // First time generating events
    const result1 = generateInterestApplicationEvents(events, '2025-11', 3.5)
    expect(result1).toHaveLength(1)

    // Add the interest application event
    const eventsWithApplication = [...events, result1[0]]

    // Adding another event for the same month (simulating edit scenario)
    // In real code, we'd remove existing INTEREST_APPLICATION first
    const eventsAfterEdit = eventsWithApplication.filter(e => e.type !== 'INTEREST_APPLICATION')
    eventsAfterEdit.push(createPurchaseEvent(500, '2025-10-20T00:00:00Z'))

    // Should generate new event
    const result2 = generateInterestApplicationEvents(eventsAfterEdit, '2025-11', 3.5)
    expect(result2).toHaveLength(1)
    expect(result2[0].pendingOnSpent).toBeGreaterThan(result1[0].pendingOnSpent)
  })
})

describe('getEffectiveRateForDate', () => {
  test('returns default rate when no rate change events', () => {
    const result = getEffectiveRateForDate('2025-10-15', [], 3.5)
    expect(result).toBe(3.5)
  })

  test('returns rate from most recent change before date', () => {
    const events: AppEvent[] = [
      createInterestRateChangeEvent(5, '2025-09-01', '2025-09-01T00:00:00Z'),
      createInterestRateChangeEvent(7, '2025-10-01', '2025-10-01T00:00:00Z'),
    ]
    const result = getEffectiveRateForDate('2025-10-15', events, 3.5)
    expect(result).toBe(7)
  })

  test('returns earlier rate for dates before latest change', () => {
    const events: AppEvent[] = [
      createInterestRateChangeEvent(5, '2025-09-01', '2025-09-01T00:00:00Z'),
      createInterestRateChangeEvent(7, '2025-10-15', '2025-10-15T00:00:00Z'),
    ]
    const result = getEffectiveRateForDate('2025-10-10', events, 3.5)
    expect(result).toBe(5)
  })

  test('returns default rate for dates before any rate change', () => {
    const events: AppEvent[] = [
      createInterestRateChangeEvent(5, '2025-10-01', '2025-10-01T00:00:00Z'),
    ]
    const result = getEffectiveRateForDate('2025-09-15', events, 3.5)
    expect(result).toBe(3.5)
  })
})
