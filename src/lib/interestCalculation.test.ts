import { describe, expect, test } from 'bun:test'
import type {
  AppEvent,
  AvoidedPurchaseEvent,
  InterestApplicationEvent,
  InterestRateChangeEvent,
  PurchaseEvent,
} from '~/types/events'
import {
  calculateInterestForMonth,
  generateInterestApplicationEvents,
  getEffectiveRateForDate,
  getMonthsNeedingInterestApplication,
} from './interestCalculation'

function createPurchaseEvent(
  amount: number,
  date: string,
  id: string = `test-${Date.now()}-${Math.random()}`,
): PurchaseEvent {
  return {
    type: 'PURCHASE',
    id,
    date,
    amount,
    category: 'Other',
    description: 'Test purchase',
  }
}

function createAvoidedPurchaseEvent(
  amount: number,
  date: string,
  id: string = `test-${Date.now()}-${Math.random()}`,
): AvoidedPurchaseEvent {
  return {
    type: 'AVOIDED_PURCHASE',
    id,
    date,
    amount,
    category: 'Other',
    description: 'Test avoided purchase',
  }
}

function createInterestApplicationEvent(
  pendingOnAvoided: number,
  pendingOnSpent: number,
  date: string,
  id: string = `test-${Date.now()}-${Math.random()}`,
): InterestApplicationEvent {
  return {
    type: 'INTEREST_APPLICATION',
    id,
    date,
    pendingOnAvoided,
    pendingOnSpent,
  }
}

function createInterestRateChangeEvent(
  newRate: number,
  date: string,
  id: string = `test-${Date.now()}-${Math.random()}`,
): InterestRateChangeEvent {
  return {
    type: 'INTEREST_RATE_CHANGE',
    id,
    date,
    newRate,
  }
}

describe('getMonthsNeedingInterestApplication', () => {
  test('returns empty array when no events', () => {
    const result = getMonthsNeedingInterestApplication([], '2025-11')
    expect(result).toEqual([])
  })

  test('returns empty array when only current month has events', () => {
    const events: AppEvent[] = [createPurchaseEvent(100, '2025-11-15')]
    const result = getMonthsNeedingInterestApplication(events, '2025-11')
    expect(result).toEqual([])
  })

  test('returns previous month when it has events but no interest application', () => {
    const events: AppEvent[] = [createPurchaseEvent(100, '2025-10-15')]
    const result = getMonthsNeedingInterestApplication(events, '2025-11')
    expect(result).toEqual(['2025-10'])
  })

  test('returns empty array when previous month already has interest application', () => {
    const events: AppEvent[] = [
      createPurchaseEvent(100, '2025-10-15'),
      createInterestApplicationEvent(0.5, 0.5, '2025-10-31', '2025-10-31'),
    ]
    const result = getMonthsNeedingInterestApplication(events, '2025-11')
    expect(result).toEqual([])
  })

  test('returns multiple months in order when they need application', () => {
    const events: AppEvent[] = [
      createPurchaseEvent(100, '2025-08-15'),
      createAvoidedPurchaseEvent(50, '2025-09-10'),
      createPurchaseEvent(200, '2025-10-20'),
    ]
    const result = getMonthsNeedingInterestApplication(events, '2025-11')
    expect(result).toEqual(['2025-08', '2025-09', '2025-10'])
  })

  test('excludes months that already have interest application', () => {
    const events: AppEvent[] = [
      createPurchaseEvent(100, '2025-08-15'),
      createInterestApplicationEvent(0.5, 0.5, '2025-08-31'),
      createAvoidedPurchaseEvent(50, '2025-09-10'),
      createPurchaseEvent(200, '2025-10-20'),
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
    const events: AppEvent[] = [createPurchaseEvent(1000, '2025-10-01')]
    const result = calculateInterestForMonth(events, '2025-10', 3.5)

    // 1000 kr for 31 days at 3.5% annual = 1000 * (3.5/100/365) * 31 = ~2.97
    expect(result.pendingOnSpent).toBeGreaterThan(2.9)
    expect(result.pendingOnSpent).toBeLessThan(3.1)
    expect(result.pendingOnAvoided).toBe(0)
  })

  test('calculates interest for avoided purchase', () => {
    const events: AppEvent[] = [createAvoidedPurchaseEvent(1000, '2025-10-01')]
    const result = calculateInterestForMonth(events, '2025-10', 3.5)

    expect(result.pendingOnAvoided).toBeGreaterThan(2.9)
    expect(result.pendingOnAvoided).toBeLessThan(3.1)
    expect(result.pendingOnSpent).toBe(0)
  })

  test('calculates interest proportionally for mid-month purchase', () => {
    const events: AppEvent[] = [createPurchaseEvent(1000, '2025-10-16')]
    const result = calculateInterestForMonth(events, '2025-10', 3.5)

    // 1000 kr for 16 days (Oct 16-31) at 3.5% annual = ~1.53
    expect(result.pendingOnSpent).toBeGreaterThan(1.4)
    expect(result.pendingOnSpent).toBeLessThan(1.7)
  })

  test('accumulates interest from previous month events', () => {
    const events: AppEvent[] = [createPurchaseEvent(1000, '2025-09-01')]
    const result = calculateInterestForMonth(events, '2025-10', 3.5)

    // 1000 kr for full 31 days of October
    expect(result.pendingOnSpent).toBeGreaterThan(2.9)
    expect(result.pendingOnSpent).toBeLessThan(3.1)
  })

  test('uses effective rate from rate change events', () => {
    const events: AppEvent[] = [
      createInterestRateChangeEvent(10, '2025-10-01', '2025-10-01'),
      createPurchaseEvent(1000, '2025-10-01'),
    ]
    const result = calculateInterestForMonth(events, '2025-10', 3.5)

    // 1000 kr for 31 days at 10% annual = ~8.49
    expect(result.pendingOnSpent).toBeGreaterThan(8)
    expect(result.pendingOnSpent).toBeLessThan(9)
  })
})

describe('generateInterestApplicationEvents', () => {
  test('generates no events when no months need application', () => {
    const events: AppEvent[] = [createPurchaseEvent(100, '2025-11-15')]
    const result = generateInterestApplicationEvents(events, '2025-11', 3.5)
    expect(result).toEqual([])
  })

  test('generates event for completed month with purchases', () => {
    const events: AppEvent[] = [createPurchaseEvent(1000, '2025-10-01')]
    const result = generateInterestApplicationEvents(events, '2025-11', 3.5)

    expect(result).toHaveLength(1)
    expect(result[0]!.type).toBe('INTEREST_APPLICATION')
    expect(result[0]!.date).toBe('2025-10-31')
    expect(result[0]!.pendingOnSpent).toBeGreaterThan(0)
  })

  test('generates event for completed month with avoided purchases', () => {
    const events: AppEvent[] = [createAvoidedPurchaseEvent(1000, '2025-10-01')]
    const result = generateInterestApplicationEvents(events, '2025-11', 3.5)

    expect(result).toHaveLength(1)
    expect(result[0]!.pendingOnAvoided).toBeGreaterThan(0)
    expect(result[0]!.pendingOnSpent).toBe(0)
  })

  test('generates multiple events for multiple months', () => {
    const events: AppEvent[] = [
      createPurchaseEvent(1000, '2025-08-15'),
      createAvoidedPurchaseEvent(500, '2025-09-10'),
      createPurchaseEvent(200, '2025-10-20'),
    ]
    const result = generateInterestApplicationEvents(events, '2025-11', 3.5)

    expect(result).toHaveLength(3)
    expect(result[0]!.date).toBe('2025-08-31')
    expect(result[1]!.date).toBe('2025-09-30')
    expect(result[2]!.date).toBe('2025-10-31')
  })

  test('does not generate events for months that already have application', () => {
    const events: AppEvent[] = [
      createPurchaseEvent(1000, '2025-10-01'),
      createInterestApplicationEvent(2.97, 0, '2025-10-31'),
    ]
    const result = generateInterestApplicationEvents(events, '2025-11', 3.5)

    expect(result).toHaveLength(0)
  })

  test('regenerates events when adding events for previous months', () => {
    // Simulate scenario: user adds event for October in November
    const events: AppEvent[] = [createPurchaseEvent(1000, '2025-10-15')]

    // First time generating events
    const result1 = generateInterestApplicationEvents(events, '2025-11', 3.5)
    expect(result1).toHaveLength(1)

    // Add the interest application event
    const eventsWithApplication = [...events, result1[0]!]

    // Adding another event for the same month (simulating edit scenario)
    // In real code, we'd remove existing INTEREST_APPLICATION first
    const eventsAfterEdit = eventsWithApplication.filter(
      (e): e is AppEvent => e.type !== 'INTEREST_APPLICATION',
    )
    eventsAfterEdit.push(createPurchaseEvent(500, '2025-10-20'))

    // Should generate new event
    const result2 = generateInterestApplicationEvents(
      eventsAfterEdit,
      '2025-11',
      3.5,
    )
    expect(result2).toHaveLength(1)
    expect(result2[0]!.pendingOnSpent).toBeGreaterThan(
      result1[0]!.pendingOnSpent,
    )
  })

  test('recalculates interest for all months when retroactive event is added', () => {
    // Scenario: Events exist for September, October. Then user adds event for August.
    // All months from August onwards should have their interest recalculated.
    const events: AppEvent[] = [
      createPurchaseEvent(500, '2025-09-10'),
      createPurchaseEvent(300, '2025-10-15'),
    ]

    // Generate initial interest applications
    const result1 = generateInterestApplicationEvents(events, '2025-11', 3.5)
    expect(result1).toHaveLength(2) // September and October

    const sept1 = result1.find((e) => e.date === '2025-09-30')
    const oct1 = result1.find((e) => e.date === '2025-10-31')
    expect(sept1).toBeDefined()
    expect(oct1).toBeDefined()

    // Now simulate adding a retroactive event for August
    // We need to remove existing interest applications and regenerate all
    const eventsWithRetroactive = [
      createAvoidedPurchaseEvent(1000, '2025-08-01'), // New retroactive event
      createPurchaseEvent(500, '2025-09-10'),
      createPurchaseEvent(300, '2025-10-15'),
    ]

    const result2 = generateInterestApplicationEvents(
      eventsWithRetroactive,
      '2025-11',
      3.5,
    )
    expect(result2).toHaveLength(3) // August, September, and October

    const aug2 = result2.find((e) => e.date === '2025-08-31')
    const sept2 = result2.find((e) => e.date === '2025-09-30')
    const oct2 = result2.find((e) => e.date === '2025-10-31')

    expect(aug2).toBeDefined()
    expect(aug2!.pendingOnAvoided).toBeGreaterThan(0) // Interest on the August avoided purchase

    // September and October should now include the August balance rolling forward
    expect(sept2!.pendingOnAvoided).toBeGreaterThan(0) // Interest on August avoided (1000) for September
    expect(oct2!.pendingOnAvoided).toBeGreaterThan(0) // Interest on August avoided (1000) for October
  })

  test('interest compounds when retroactive avoided purchase is added', () => {
    // Add purchase in October only
    const initialEvents: AppEvent[] = [createPurchaseEvent(1000, '2025-10-01')]

    const result1 = generateInterestApplicationEvents(
      initialEvents,
      '2025-11',
      3.5,
    )
    expect(result1).toHaveLength(1)
    const oct1 = result1[0]

    // Now add an avoided purchase in September (before October)
    // This should affect October's interest calculation
    const eventsWithSeptember = [
      createAvoidedPurchaseEvent(1000, '2025-09-01'),
      createPurchaseEvent(1000, '2025-10-01'),
    ]

    const result2 = generateInterestApplicationEvents(
      eventsWithSeptember,
      '2025-11',
      3.5,
    )
    expect(result2).toHaveLength(2) // September and October

    const sept2 = result2.find((e) => e.date === '2025-09-30')
    const oct2 = result2.find((e) => e.date === '2025-10-31')

    // September should have interest on the avoided purchase
    expect(sept2!.pendingOnAvoided).toBeGreaterThan(0)

    // October should have interest on:
    // - The September avoided balance (1000) carrying forward
    // - The October purchase (1000)
    expect(oct2!.pendingOnAvoided).toBeGreaterThan(0)
    expect(oct2!.pendingOnSpent).toBe(oct1!.pendingOnSpent) // Same spent interest as before
  })

  test('adding historical event (like Piano in August) generates interest for ALL months up to current month', () => {
    // Scenario: Today is November 21, 2025
    // User adds a 10,000 kr avoided purchase on August 1, 2025
    // Expected: Interest should be calculated for August, September, October
    // Bug: Only one month of interest is being added

    const events: AppEvent[] = [
      createAvoidedPurchaseEvent(10000, '2025-08-01', 'piano-event'),
    ]

    // Generate interest applications as if we're in November
    const result = generateInterestApplicationEvents(events, '2025-11', 3.5)

    // Should generate interest for August, September, and October (3 months)
    expect(result).toHaveLength(3)

    const august = result.find((e) => e.date === '2025-08-31')
    const september = result.find((e) => e.date === '2025-09-30')
    const october = result.find((e) => e.date === '2025-10-31')

    expect(august).toBeDefined()
    expect(september).toBeDefined()
    expect(october).toBeDefined()

    // August: 10,000 kr for 31 days at 3.5% = 10000 * (3.5/100/365) * 31 ≈ 29.73
    expect(august!.pendingOnAvoided).toBeGreaterThan(29)
    expect(august!.pendingOnAvoided).toBeLessThan(30)

    // September: 10,000 kr for 30 days at 3.5% = 10000 * (3.5/100/365) * 30 ≈ 28.77
    expect(september!.pendingOnAvoided).toBeGreaterThan(28)
    expect(september!.pendingOnAvoided).toBeLessThan(29)

    // October: 10,000 kr for 31 days at 3.5% = 10000 * (3.5/100/365) * 31 ≈ 29.73
    expect(october!.pendingOnAvoided).toBeGreaterThan(29)
    expect(october!.pendingOnAvoided).toBeLessThan(30)

    // Total interest for 3 months should be approximately 29.73 + 28.77 + 29.73 = 88.23 kr
    const totalInterest =
      august!.pendingOnAvoided +
      september!.pendingOnAvoided +
      october!.pendingOnAvoided
    expect(totalInterest).toBeGreaterThan(87)
    expect(totalInterest).toBeLessThan(89)
  })

  test('adding historical purchase only affects purchase interest, not avoided purchase interest', () => {
    // Start with an avoided purchase in August
    const initialEvents: AppEvent[] = [
      createAvoidedPurchaseEvent(5000, '2025-08-01', 'avoid-1'),
    ]

    // Generate interest for August, September, October
    const result1 = generateInterestApplicationEvents(
      initialEvents,
      '2025-11',
      3.5,
    )
    expect(result1).toHaveLength(3)

    const aug1 = result1.find((e) => e.date === '2025-08-31')
    const sep1 = result1.find((e) => e.date === '2025-09-30')
    const oct1 = result1.find((e) => e.date === '2025-10-31')

    // All should have avoided interest, no purchase interest
    expect(aug1!.pendingOnAvoided).toBeGreaterThan(0)
    expect(aug1!.pendingOnSpent).toBe(0)
    expect(sep1!.pendingOnAvoided).toBeGreaterThan(0)
    expect(sep1!.pendingOnSpent).toBe(0)

    // Now add a purchase in September (different month from avoided purchase)
    const eventsWithPurchase = [
      ...initialEvents,
      createPurchaseEvent(3000, '2025-09-15', 'purchase-1'),
    ]

    const result2 = generateInterestApplicationEvents(
      eventsWithPurchase,
      '2025-11',
      3.5,
    )
    expect(result2).toHaveLength(3)

    const aug2 = result2.find((e) => e.date === '2025-08-31')
    const sep2 = result2.find((e) => e.date === '2025-09-30')
    const oct2 = result2.find((e) => e.date === '2025-10-31')

    // August: avoided interest should be same (no purchase yet)
    expect(aug2!.pendingOnAvoided).toBe(aug1!.pendingOnAvoided)
    expect(aug2!.pendingOnSpent).toBe(0)

    // September: avoided interest same, but now has purchase interest
    expect(sep2!.pendingOnAvoided).toBe(sep1!.pendingOnAvoided)
    expect(sep2!.pendingOnSpent).toBeGreaterThan(0)

    // October: avoided interest same, purchase interest on full month
    expect(oct2!.pendingOnAvoided).toBe(oct1!.pendingOnAvoided)
    expect(oct2!.pendingOnSpent).toBeGreaterThan(sep2!.pendingOnSpent)
  })

  test('adding historical avoided purchase only affects avoided interest, not purchase interest', () => {
    // Start with a purchase in August
    const initialEvents: AppEvent[] = [
      createPurchaseEvent(5000, '2025-08-01', 'purchase-1'),
    ]

    const result1 = generateInterestApplicationEvents(
      initialEvents,
      '2025-11',
      3.5,
    )
    expect(result1).toHaveLength(3)

    const aug1 = result1.find((e) => e.date === '2025-08-31')
    const sep1 = result1.find((e) => e.date === '2025-09-30')

    // All should have purchase interest, no avoided interest
    expect(aug1!.pendingOnSpent).toBeGreaterThan(0)
    expect(aug1!.pendingOnAvoided).toBe(0)

    // Now add an avoided purchase in September
    const eventsWithAvoided = [
      ...initialEvents,
      createAvoidedPurchaseEvent(3000, '2025-09-15', 'avoid-1'),
    ]

    const result2 = generateInterestApplicationEvents(
      eventsWithAvoided,
      '2025-11',
      3.5,
    )
    expect(result2).toHaveLength(3)

    const aug2 = result2.find((e) => e.date === '2025-08-31')
    const sep2 = result2.find((e) => e.date === '2025-09-30')

    // August: purchase interest should be same (no avoided yet)
    expect(aug2!.pendingOnSpent).toBe(aug1!.pendingOnSpent)
    expect(aug2!.pendingOnAvoided).toBe(0)

    // September: purchase interest same, but now has avoided interest
    expect(sep2!.pendingOnSpent).toBe(sep1!.pendingOnSpent)
    expect(sep2!.pendingOnAvoided).toBeGreaterThan(0)
  })

  test('interest compounds monthly - applied interest becomes part of principal', () => {
    // Add 1000 kr avoided purchase at start of August
    const events: AppEvent[] = [
      createAvoidedPurchaseEvent(1000, '2025-08-01', 'avoid-1'),
    ]

    // Generate interest events for August and September
    const augustInterest = generateInterestApplicationEvents(
      events,
      '2025-09',
      3.5,
    )
    expect(augustInterest).toHaveLength(1)
    expect(augustInterest[0]!.date).toBe('2025-08-31')

    // August interest on 1000 kr for 31 days ≈ 2.97 kr
    const augustAmount = augustInterest[0]!.pendingOnAvoided
    expect(augustAmount).toBeGreaterThan(2.9)
    expect(augustAmount).toBeLessThan(3.1)

    // Now include the interest application and calculate September
    const eventsWithAugustInterest = [...events, ...augustInterest]
    const septemberInterest = generateInterestApplicationEvents(
      eventsWithAugustInterest,
      '2025-10',
      3.5,
    )

    // Should only generate September interest (August already has it)
    expect(septemberInterest).toHaveLength(1)
    expect(septemberInterest[0]!.date).toBe('2025-09-30')

    const septemberAmount = septemberInterest[0]!.pendingOnAvoided

    // September should calculate interest on (1000 + augustAmount) for 30 days
    // If compounding: (1000 + 2.97) * (3.5/100/365) * 30 ≈ 2.88 kr
    // If not compounding: 1000 * (3.5/100/365) * 30 ≈ 2.88 kr (same as August calculation)

    // For true compound interest, September should be slightly higher than:
    // 1000 * (3.5/100/365) * 30 = 2.877
    const simpleInterest = 1000 * (3.5 / 100 / 365) * 30

    // With compounding on (1000 + 2.97):
    const compoundInterest = (1000 + augustAmount) * (3.5 / 100 / 365) * 30

    // September interest should include the effect of August's applied interest
    expect(septemberAmount).toBeCloseTo(compoundInterest, 2)
    expect(septemberAmount).toBeGreaterThan(simpleInterest)
  })
})

describe('default interest rate changes', () => {
  test('calculateInterestForMonth uses provided default rate when no rate change events', () => {
    const events: AppEvent[] = [createPurchaseEvent(1000, '2025-10-01')]

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
    const events: AppEvent[] = [createPurchaseEvent(1000, '2025-10-01')]

    // Generate with 3.5% default rate
    const result1 = generateInterestApplicationEvents(events, '2025-11', 3.5)
    expect(result1).toHaveLength(1)

    // Generate with 10% default rate
    const result2 = generateInterestApplicationEvents(events, '2025-11', 10)
    expect(result2).toHaveLength(1)

    // Higher rate should produce more interest
    expect(result2[0]!.pendingOnSpent).toBeGreaterThan(
      result1[0]!.pendingOnSpent,
    )
  })

  test('changing default rate recalculates interest for all months without rate change events', () => {
    const events: AppEvent[] = [
      createAvoidedPurchaseEvent(1000, '2025-08-01'),
      createPurchaseEvent(500, '2025-09-10'),
      createPurchaseEvent(300, '2025-10-15'),
    ]

    // Generate with original 3.5% rate
    const result1 = generateInterestApplicationEvents(events, '2025-11', 3.5)
    expect(result1).toHaveLength(3)

    // Generate with new 7% rate (double)
    const result2 = generateInterestApplicationEvents(events, '2025-11', 7)
    expect(result2).toHaveLength(3)

    // All months should have approximately doubled interest
    for (let i = 0; i < 3; i++) {
      const total1 = result1[i]!.pendingOnAvoided + result1[i]!.pendingOnSpent
      const total2 = result2[i]!.pendingOnAvoided + result2[i]!.pendingOnSpent

      if (total1 > 0) {
        const ratio = total2 / total1
        expect(ratio).toBeGreaterThan(1.9)
        expect(ratio).toBeLessThan(2.1)
      }
    }
  })

  test('rate change events override default rate for dates after the change', () => {
    const events: AppEvent[] = [
      createPurchaseEvent(1000, '2025-09-01'),
      createInterestRateChangeEvent(10, '2025-10-01'),
      createPurchaseEvent(1000, '2025-10-01'),
    ]

    // Calculate with different default rates
    const result1 = generateInterestApplicationEvents(events, '2025-11', 3.5)
    const result2 = generateInterestApplicationEvents(events, '2025-11', 5)

    // September should use default rate (different results)
    const sept1 = result1.find((e) => e.date === '2025-09-30')
    const sept2 = result2.find((e) => e.date === '2025-09-30')
    expect(sept2!.pendingOnSpent).toBeGreaterThan(sept1!.pendingOnSpent)

    // October should use 10% rate from event, but results differ slightly due to
    // different September balances carrying forward (compound interest effect)
    const oct1 = result1.find((e) => e.date === '2025-10-31')
    const oct2 = result2.find((e) => e.date === '2025-10-31')
    // They should be close but not exactly the same due to compounding
    expect(oct1!.pendingOnSpent).toBeCloseTo(oct2!.pendingOnSpent, 0)
  })
})

describe('getEffectiveRateForDate', () => {
  test('returns default rate when no rate change events', () => {
    const result = getEffectiveRateForDate('2025-10-15', [], 3.5)
    expect(result).toBe(3.5)
  })

  test('returns rate from most recent change before date', () => {
    const events: AppEvent[] = [
      createInterestRateChangeEvent(5, '2025-09-01', '2025-09-01'),
      createInterestRateChangeEvent(7, '2025-10-01', '2025-10-01'),
    ]
    const result = getEffectiveRateForDate('2025-10-15', events, 3.5)
    expect(result).toBe(7)
  })

  test('returns earlier rate for dates before latest change', () => {
    const events: AppEvent[] = [
      createInterestRateChangeEvent(5, '2025-09-01', '2025-09-01'),
      createInterestRateChangeEvent(7, '2025-10-15', '2025-10-15'),
    ]
    const result = getEffectiveRateForDate('2025-10-10', events, 3.5)
    expect(result).toBe(5)
  })

  test('returns default rate for dates before any rate change', () => {
    const events: AppEvent[] = [
      createInterestRateChangeEvent(5, '2025-10-01', '2025-10-01'),
    ]
    const result = getEffectiveRateForDate('2025-09-15', events, 3.5)
    expect(result).toBe(3.5)
  })
})

describe('complex interest rate scenarios', () => {
  test('multiple rate changes within single month - daily interest calculation', () => {
    // Scenario: 1000 kr avoided purchase on Oct 1
    // Rate changes: 3.5% (default) -> 5% on Oct 10 -> 7% on Oct 20
    const events: AppEvent[] = [
      createAvoidedPurchaseEvent(1000, '2025-10-01'),
      createInterestRateChangeEvent(5, '2025-10-10'),
      createInterestRateChangeEvent(7, '2025-10-20'),
    ]

    const result = calculateInterestForMonth(events, '2025-10', 3.5)

    // Expected calculation:
    // Oct 1-9 (9 days): 1000 * (3.5/100/365) * 9 = 0.863
    // Oct 10-19 (10 days): 1000 * (5/100/365) * 10 = 1.370
    // Oct 20-31 (12 days): 1000 * (7/100/365) * 12 = 2.301
    // Total: ~4.53 kr
    expect(result.pendingOnAvoided).toBeGreaterThan(4.4)
    expect(result.pendingOnAvoided).toBeLessThan(4.7)
  })

  test('rate changes across multiple months affect each month correctly', () => {
    // Scenario: 1000 kr avoided purchase on Aug 1, with rate changes
    // Aug: default 3.5%
    // Sep 15: change to 5%
    // Oct 10: change to 7%
    const events: AppEvent[] = [
      createAvoidedPurchaseEvent(1000, '2025-08-01'),
      createInterestRateChangeEvent(5, '2025-09-15', '2025-09-15'),
      createInterestRateChangeEvent(7, '2025-10-10', '2025-10-10'),
    ]

    const result = generateInterestApplicationEvents(events, '2025-11', 3.5)
    expect(result).toHaveLength(3)

    const aug = result.find((e) => e.date === '2025-08-31')!
    const sep = result.find((e) => e.date === '2025-09-30')!
    const oct = result.find((e) => e.date === '2025-10-31')!

    // August: 31 days at 3.5%: 1000 * (3.5/100/365) * 31 ≈ 2.97
    expect(aug.pendingOnAvoided).toBeGreaterThan(2.9)
    expect(aug.pendingOnAvoided).toBeLessThan(3.1)

    // September:
    // Sep 1-14 (14 days) at 3.5%: 1000 * (3.5/100/365) * 14 ≈ 1.342
    // Sep 15-30 (16 days) at 5%: 1000 * (5/100/365) * 16 ≈ 2.192
    // Total: ~3.53
    expect(sep.pendingOnAvoided).toBeGreaterThan(3.4)
    expect(sep.pendingOnAvoided).toBeLessThan(3.7)

    // October:
    // Oct 1-9 (9 days) at 5%: 1000 * (5/100/365) * 9 ≈ 1.233
    // Oct 10-31 (22 days) at 7%: 1000 * (7/100/365) * 22 ≈ 4.219
    // Total: ~5.45
    expect(oct.pendingOnAvoided).toBeGreaterThan(5.3)
    expect(oct.pendingOnAvoided).toBeLessThan(5.6)
  })

  test('changing default rate then adding rate change event - only future months affected by rate change', () => {
    // Scenario: 1000 kr in August with default 3.5%
    // Change default to 5% -> regenerates all months with 5%
    // Add rate change event for Oct 1 at 7% -> Aug and Sep still use 5%, Oct uses 7%
    const events: AppEvent[] = [createAvoidedPurchaseEvent(1000, '2025-08-01')]

    // Initial generation with 3.5% default
    const result1 = generateInterestApplicationEvents(events, '2025-11', 3.5)
    const aug1 = result1.find((e) => e.date === '2025-08-31')!
    const sep1 = result1.find((e) => e.date === '2025-09-30')!
    const oct1 = result1.find((e) => e.date === '2025-10-31')!

    // All should use 3.5%
    expect(aug1.pendingOnAvoided).toBeGreaterThan(2.9)
    expect(aug1.pendingOnAvoided).toBeLessThan(3.1)

    // Change default rate to 5%
    const result2 = generateInterestApplicationEvents(events, '2025-11', 5)
    const aug2 = result2.find((e) => e.date === '2025-08-31')!
    const sep2 = result2.find((e) => e.date === '2025-09-30')!
    const oct2 = result2.find((e) => e.date === '2025-10-31')!

    // All should use 5% (higher than before)
    expect(aug2.pendingOnAvoided).toBeGreaterThan(aug1.pendingOnAvoided)
    expect(sep2.pendingOnAvoided).toBeGreaterThan(sep1.pendingOnAvoided)
    expect(oct2.pendingOnAvoided).toBeGreaterThan(oct1.pendingOnAvoided)

    // Now add a rate change event for October 1 at 7%
    const eventsWithRateChange = [
      ...events,
      createInterestRateChangeEvent(7, '2025-10-01', '2025-10-01'),
    ]

    const result3 = generateInterestApplicationEvents(
      eventsWithRateChange,
      '2025-11',
      5,
    )
    const aug3 = result3.find((e) => e.date === '2025-08-31')!
    const sep3 = result3.find((e) => e.date === '2025-09-30')!
    const oct3 = result3.find((e) => e.date === '2025-10-31')!

    // August and September should still use 5% default (same as result2)
    expect(aug3.pendingOnAvoided).toBeCloseTo(aug2.pendingOnAvoided, 2)
    expect(sep3.pendingOnAvoided).toBeCloseTo(sep2.pendingOnAvoided, 2)

    // October should use 7% (higher than result2)
    expect(oct3.pendingOnAvoided).toBeGreaterThan(oct2.pendingOnAvoided)
  })

  test('adding rate change event in middle of month affects only that portion of month', () => {
    // Scenario: 1000 kr on Oct 1, rate change on Oct 15 from 3.5% to 10%
    const events: AppEvent[] = [
      createAvoidedPurchaseEvent(1000, '2025-10-01'),
      createInterestRateChangeEvent(10, '2025-10-15'),
    ]

    const result = calculateInterestForMonth(events, '2025-10', 3.5)

    // Oct 1-14 (14 days) at 3.5%: 1000 * (3.5/100/365) * 14 ≈ 1.342
    // Oct 15-31 (17 days) at 10%: 1000 * (10/100/365) * 17 ≈ 4.658
    // Total: ~6.0
    expect(result.pendingOnAvoided).toBeGreaterThan(5.8)
    expect(result.pendingOnAvoided).toBeLessThan(6.2)
  })

  test('modifying existing rate change event recalculates affected months correctly', () => {
    // Scenario: 1000 kr in Aug, rate change on Sep 1 to 5%
    // Then change the rate change to 7% -> Sep and Oct recalculated, Aug unchanged
    const events: AppEvent[] = [
      createAvoidedPurchaseEvent(1000, '2025-08-01'),
      createInterestRateChangeEvent(5, '2025-09-01', '2025-09-01'),
    ]

    const result1 = generateInterestApplicationEvents(events, '2025-11', 3.5)
    const aug1 = result1.find((e) => e.date === '2025-08-31')!
    const sep1 = result1.find((e) => e.date === '2025-09-30')!
    const oct1 = result1.find((e) => e.date === '2025-10-31')!

    // August uses default 3.5%, Sep and Oct use 5%
    expect(aug1.pendingOnAvoided).toBeGreaterThan(2.9)
    expect(aug1.pendingOnAvoided).toBeLessThan(3.1)

    // Now change the rate to 7%
    const eventsModified: AppEvent[] = [
      createAvoidedPurchaseEvent(1000, '2025-08-01'),
      createInterestRateChangeEvent(7, '2025-09-01', '2025-09-01'),
    ]

    const result2 = generateInterestApplicationEvents(
      eventsModified,
      '2025-11',
      3.5,
    )
    const aug2 = result2.find((e) => e.date === '2025-08-31')!
    const sep2 = result2.find((e) => e.date === '2025-09-30')!
    const oct2 = result2.find((e) => e.date === '2025-10-31')!

    // August should be unchanged (still 3.5%)
    expect(aug2.pendingOnAvoided).toBeCloseTo(aug1.pendingOnAvoided, 2)

    // September and October should be higher (now using 7% instead of 5%)
    expect(sep2.pendingOnAvoided).toBeGreaterThan(sep1.pendingOnAvoided)
    expect(oct2.pendingOnAvoided).toBeGreaterThan(oct1.pendingOnAvoided)
  })

  test('deleting rate change event reverts to default rate for affected period', () => {
    // Scenario: 1000 kr in Aug, rate change on Sep 1 to 10%
    // Then delete the rate change -> all months use default 3.5%
    const events: AppEvent[] = [
      createAvoidedPurchaseEvent(1000, '2025-08-01'),
      createInterestRateChangeEvent(10, '2025-09-01'),
    ]

    const result1 = generateInterestApplicationEvents(events, '2025-11', 3.5)
    const sep1 = result1.find((e) => e.date === '2025-09-30')!
    const oct1 = result1.find((e) => e.date === '2025-10-31')!

    // Sep and Oct should use 10% (high values)
    expect(sep1.pendingOnAvoided).toBeGreaterThan(8) // ~8.2
    expect(oct1.pendingOnAvoided).toBeGreaterThan(8) // ~8.5

    // Now remove the rate change event
    const eventsWithoutRateChange: AppEvent[] = [
      createAvoidedPurchaseEvent(1000, '2025-08-01'),
    ]

    const result2 = generateInterestApplicationEvents(
      eventsWithoutRateChange,
      '2025-11',
      3.5,
    )
    const sep2 = result2.find((e) => e.date === '2025-09-30')!
    const oct2 = result2.find((e) => e.date === '2025-10-31')!

    // Sep and Oct should now use 3.5% (much lower)
    expect(sep2.pendingOnAvoided).toBeLessThan(3) // ~2.88
    expect(oct2.pendingOnAvoided).toBeLessThan(3.1) // ~2.97
  })

  test('compound interest with rate changes - applied interest uses rate at application time', () => {
    // Scenario: 1000 kr on Aug 1 at 3.5%, rate changes to 10% on Sep 1
    // August interest applied at 3.5%
    // September interest calculated on (1000 + August interest) at 10%
    const events: AppEvent[] = [
      createAvoidedPurchaseEvent(1000, '2025-08-01'),
      createInterestRateChangeEvent(10, '2025-09-01'),
    ]

    // First generate August interest
    const august = generateInterestApplicationEvents(events, '2025-09', 3.5)
    expect(august).toHaveLength(1)
    const augustInterest = august[0]!.pendingOnAvoided
    expect(augustInterest).toBeGreaterThan(2.9)
    expect(augustInterest).toBeLessThan(3.1)

    // Now generate September with August's applied interest included
    const eventsWithAugust = [...events, ...august]
    const september = generateInterestApplicationEvents(
      eventsWithAugust,
      '2025-10',
      3.5,
    )
    expect(september).toHaveLength(1)

    // September should calculate interest at 10% on (1000 + augustInterest)
    // (1000 + 2.97) * (10/100/365) * 30 ≈ 8.22
    const expectedSeptInterest = (1000 + augustInterest) * (10 / 100 / 365) * 30
    expect(september[0]!.pendingOnAvoided).toBeCloseTo(expectedSeptInterest, 1)
  })
})
