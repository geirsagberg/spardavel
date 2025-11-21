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

  test('recalculates interest for all months when retroactive event is added', () => {
    // Scenario: Events exist for September, October. Then user adds event for August.
    // All months from August onwards should have their interest recalculated.
    const events: AppEvent[] = [
      createPurchaseEvent(500, '2025-09-10T00:00:00Z'),
      createPurchaseEvent(300, '2025-10-15T00:00:00Z'),
    ]

    // Generate initial interest applications
    const result1 = generateInterestApplicationEvents(events, '2025-11', 3.5)
    expect(result1).toHaveLength(2) // September and October

    const sept1 = result1.find(e => e.appliedDate === '2025-09-30')
    const oct1 = result1.find(e => e.appliedDate === '2025-10-31')
    expect(sept1).toBeDefined()
    expect(oct1).toBeDefined()

    // Now simulate adding a retroactive event for August
    // We need to remove existing interest applications and regenerate all
    const eventsWithRetroactive = [
      createAvoidedPurchaseEvent(1000, '2025-08-01T00:00:00Z'), // New retroactive event
      createPurchaseEvent(500, '2025-09-10T00:00:00Z'),
      createPurchaseEvent(300, '2025-10-15T00:00:00Z'),
    ]

    const result2 = generateInterestApplicationEvents(eventsWithRetroactive, '2025-11', 3.5)
    expect(result2).toHaveLength(3) // August, September, and October

    const aug2 = result2.find(e => e.appliedDate === '2025-08-31')
    const sept2 = result2.find(e => e.appliedDate === '2025-09-30')
    const oct2 = result2.find(e => e.appliedDate === '2025-10-31')

    expect(aug2).toBeDefined()
    expect(aug2!.pendingOnAvoided).toBeGreaterThan(0) // Interest on the August avoided purchase

    // September and October should now include the August balance rolling forward
    expect(sept2!.pendingOnAvoided).toBeGreaterThan(0) // Interest on August avoided (1000) for September
    expect(oct2!.pendingOnAvoided).toBeGreaterThan(0) // Interest on August avoided (1000) for October
  })

  test('interest compounds when retroactive avoided purchase is added', () => {
    // Add purchase in October only
    const initialEvents: AppEvent[] = [
      createPurchaseEvent(1000, '2025-10-01T00:00:00Z'),
    ]

    const result1 = generateInterestApplicationEvents(initialEvents, '2025-11', 3.5)
    expect(result1).toHaveLength(1)
    const oct1 = result1[0]

    // Now add an avoided purchase in September (before October)
    // This should affect October's interest calculation
    const eventsWithSeptember = [
      createAvoidedPurchaseEvent(1000, '2025-09-01T00:00:00Z'),
      createPurchaseEvent(1000, '2025-10-01T00:00:00Z'),
    ]

    const result2 = generateInterestApplicationEvents(eventsWithSeptember, '2025-11', 3.5)
    expect(result2).toHaveLength(2) // September and October

    const sept2 = result2.find(e => e.appliedDate === '2025-09-30')
    const oct2 = result2.find(e => e.appliedDate === '2025-10-31')

    // September should have interest on the avoided purchase
    expect(sept2!.pendingOnAvoided).toBeGreaterThan(0)

    // October should have interest on:
    // - The September avoided balance (1000) carrying forward
    // - The October purchase (1000)
    expect(oct2!.pendingOnAvoided).toBeGreaterThan(0)
    expect(oct2!.pendingOnSpent).toBe(oct1.pendingOnSpent) // Same spent interest as before
  })
})

describe('default interest rate changes', () => {
  test('calculateInterestForMonth uses provided default rate when no rate change events', () => {
    const events: AppEvent[] = [
      createPurchaseEvent(1000, '2025-10-01T00:00:00Z'),
    ]

    // Calculate with 3.5% default rate
    const result1 = calculateInterestForMonth(events, '2025-10', 3.5)

    // Calculate with 10% default rate
    const result2 = calculateInterestForMonth(events, '2025-10', 10)

    // Higher rate should produce more interest
    expect(result2.pendingOnSpent).toBeGreaterThan(result1.pendingOnSpent)
    // Approximately 10/3.5 = 2.857x more interest
    const ratio = result2.pendingOnSpent / result1.pendingOnSpent
    expect(ratio).toBeGreaterThan(2.8)
    expect(ratio).toBeLessThan(2.9)
  })

  test('generateInterestApplicationEvents uses provided default rate when no rate change events', () => {
    const events: AppEvent[] = [
      createPurchaseEvent(1000, '2025-10-01T00:00:00Z'),
    ]

    // Generate with 3.5% default rate
    const result1 = generateInterestApplicationEvents(events, '2025-11', 3.5)
    expect(result1).toHaveLength(1)

    // Generate with 10% default rate
    const result2 = generateInterestApplicationEvents(events, '2025-11', 10)
    expect(result2).toHaveLength(1)

    // Higher rate should produce more interest
    expect(result2[0].pendingOnSpent).toBeGreaterThan(result1[0].pendingOnSpent)
  })

  test('changing default rate recalculates interest for all months without rate change events', () => {
    const events: AppEvent[] = [
      createAvoidedPurchaseEvent(1000, '2025-08-01T00:00:00Z'),
      createPurchaseEvent(500, '2025-09-10T00:00:00Z'),
      createPurchaseEvent(300, '2025-10-15T00:00:00Z'),
    ]

    // Generate with original 3.5% rate
    const result1 = generateInterestApplicationEvents(events, '2025-11', 3.5)
    expect(result1).toHaveLength(3)

    // Generate with new 7% rate (double)
    const result2 = generateInterestApplicationEvents(events, '2025-11', 7)
    expect(result2).toHaveLength(3)

    // All months should have approximately doubled interest
    for (let i = 0; i < 3; i++) {
      const total1 = result1[i].pendingOnAvoided + result1[i].pendingOnSpent
      const total2 = result2[i].pendingOnAvoided + result2[i].pendingOnSpent

      if (total1 > 0) {
        const ratio = total2 / total1
        expect(ratio).toBeGreaterThan(1.9)
        expect(ratio).toBeLessThan(2.1)
      }
    }
  })

  test('rate change events override default rate for dates after the change', () => {
    const events: AppEvent[] = [
      createPurchaseEvent(1000, '2025-09-01T00:00:00Z'),
      createInterestRateChangeEvent(10, '2025-10-01', '2025-10-01T00:00:00Z'),
      createPurchaseEvent(1000, '2025-10-01T00:00:00Z'),
    ]

    // Calculate with different default rates
    const result1 = generateInterestApplicationEvents(events, '2025-11', 3.5)
    const result2 = generateInterestApplicationEvents(events, '2025-11', 5)

    // September should use default rate (different results)
    const sept1 = result1.find(e => e.appliedDate === '2025-09-30')
    const sept2 = result2.find(e => e.appliedDate === '2025-09-30')
    expect(sept2!.pendingOnSpent).toBeGreaterThan(sept1!.pendingOnSpent)

    // October should use 10% rate from event (same results regardless of default)
    const oct1 = result1.find(e => e.appliedDate === '2025-10-31')
    const oct2 = result2.find(e => e.appliedDate === '2025-10-31')
    expect(oct1!.pendingOnSpent).toBe(oct2!.pendingOnSpent)
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
