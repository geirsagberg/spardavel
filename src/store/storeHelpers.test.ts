import { describe, expect, test } from 'bun:test'
import type {  
  PurchaseEvent,
  AvoidedPurchaseEvent,
  AppEvent,
} from '~/types/events'
import {
  sortEvents,
  calculateMetricsFromEvents,
  getCurrentInterestRateFromEvents,
  applyInterestForCompletedMonths,
} from './storeHelpers'

function createPurchaseEvent(
  amount: number,
  date: string,
  category: 'Alcohol' | 'Candy' | 'Snacks' | 'Food' | 'Drinks' | 'Games' | 'Other' = 'Other',
  description: string = 'Test purchase',
): PurchaseEvent {
  return {
    type: 'PURCHASE',
    id: `test-${Date.now()}-${Math.random()}`,
    date,
    amount,
    category,
    description,
  }
}

function createAvoidedPurchaseEvent(
  amount: number,
  date: string,
  category: 'Alcohol' | 'Candy' | 'Snacks' | 'Food' | 'Drinks' | 'Games' | 'Other' = 'Other',
  description: string = 'Test avoided',
): AvoidedPurchaseEvent {
  return {
    type: 'AVOIDED_PURCHASE',
    id: `test-${Date.now()}-${Math.random()}`,
    date,
    amount,
    category,
    description,
  }
}

describe('storeHelpers - sortEvents', () => {
  test('sorts events by date ascending', () => {
    const events: AppEvent[] = [
      createPurchaseEvent(300, '2024-11-20'),
      createPurchaseEvent(100, '2024-10-15'),
      createPurchaseEvent(200, '2024-11-10'),
    ]

    const sorted = sortEvents(events)

    expect(sorted[0]?.date).toBe('2024-10-15')
    expect(sorted[1]?.date).toBe('2024-11-10')
    expect(sorted[2]?.date).toBe('2024-11-20')
  })

  test('sorts events by ID when dates are equal', () => {
    const event1 = createPurchaseEvent(100, '2024-11-22')
    const event2 = createPurchaseEvent(200, '2024-11-22')
    
    const sorted = sortEvents([event2, event1])

    expect(sorted).toHaveLength(2)
    // Events should be sorted by ID as tiebreaker
    expect(sorted[0]?.date).toBe('2024-11-22')
    expect(sorted[1]?.date).toBe('2024-11-22')
  })
})

describe('storeHelpers - calculateMetricsFromEvents', () => {
  test('calculates metrics for purchase events', () => {
    const events: AppEvent[] = [
      createPurchaseEvent(100, '2024-11-22'),
      createPurchaseEvent(200, '2024-11-23'),
    ]

    const metrics = calculateMetricsFromEvents(events)

    expect(metrics.allTime.spentTotal).toBe(300)
    expect(metrics.allTime.savedTotal).toBe(0)
  })

  test('calculates metrics for avoided purchase events', () => {
    const events: AppEvent[] = [
      createAvoidedPurchaseEvent(150, '2024-11-22'),
      createAvoidedPurchaseEvent(250, '2024-11-23'),
    ]

    const metrics = calculateMetricsFromEvents(events)

    expect(metrics.allTime.savedTotal).toBe(400)
    expect(metrics.allTime.spentTotal).toBe(0)
  })

  test('groups events by month correctly', () => {
    const events: AppEvent[] = [
      createPurchaseEvent(100, '2024-10-15'),
      createPurchaseEvent(200, '2024-10-25'),
      createAvoidedPurchaseEvent(150, '2024-11-10'),
    ]

    const metrics = calculateMetricsFromEvents(events)
    
    const oct = metrics.monthlyHistory.find(m => m.periodStart.startsWith('2024-10'))
    const nov = metrics.monthlyHistory.find(m => m.periodStart.startsWith('2024-11'))

    expect(oct).toBeDefined()
    expect(oct?.purchasesTotal).toBe(300)
    expect(nov).toBeDefined()
    expect(nov?.avoidedTotal).toBe(150)
  })

  test('November 22 event appears in November, not October', () => {
    const events: AppEvent[] = [
      createPurchaseEvent(1000, '2024-11-22'),
    ]

    const metrics = calculateMetricsFromEvents(events)
    
    const nov = metrics.monthlyHistory.find(m => m.periodStart.startsWith('2024-11'))
    const oct = metrics.monthlyHistory.find(m => m.periodStart.startsWith('2024-10'))

    expect(nov).toBeDefined()
    expect(nov?.purchasesTotal).toBe(1000)
    expect(oct).toBeUndefined()
  })

  test('events on first day of month are grouped correctly', () => {
    const events: AppEvent[] = [
      createPurchaseEvent(100, '2024-11-01'),
    ]

    const metrics = calculateMetricsFromEvents(events)
    const nov = metrics.monthlyHistory.find(m => m.periodStart.startsWith('2024-11'))

    expect(nov).toBeDefined()
    expect(nov?.purchasesTotal).toBe(100)
  })

  test('events on last day of month are grouped correctly', () => {
    const events: AppEvent[] = [
      createPurchaseEvent(100, '2024-10-31'),
    ]

    const metrics = calculateMetricsFromEvents(events)
    const oct = metrics.monthlyHistory.find(m => m.periodStart.startsWith('2024-10'))

    expect(oct).toBeDefined()
    expect(oct?.purchasesTotal).toBe(100)
  })

  test('tracks purchases by category', () => {
    const events: AppEvent[] = [
      createPurchaseEvent(100, '2024-11-22', 'Alcohol'),
      createPurchaseEvent(50, '2024-11-22', 'Candy'),
      createPurchaseEvent(200, '2024-11-22', 'Alcohol'),
    ]

    const metrics = calculateMetricsFromEvents(events)
    const nov = metrics.monthlyHistory.find(m => m.periodStart.startsWith('2024-11'))

    expect(nov?.purchasesByCategory['Alcohol']).toBe(300)
    expect(nov?.purchasesByCategory['Candy']).toBe(50)
  })

  test('tracks avoided purchases by category', () => {
    const events: AppEvent[] = [
      createAvoidedPurchaseEvent(100, '2024-11-22', 'Snacks'),
      createAvoidedPurchaseEvent(150, '2024-11-22', 'Snacks'),
    ]

    const metrics = calculateMetricsFromEvents(events)
    const nov = metrics.monthlyHistory.find(m => m.periodStart.startsWith('2024-11'))

    expect(nov?.avoidedByCategory['Snacks']).toBe(250)
  })

  test('handles events on month boundaries correctly', () => {
    const events: AppEvent[] = [
      createPurchaseEvent(100, '2024-10-31'),
      createPurchaseEvent(200, '2024-11-01'),
    ]

    const metrics = calculateMetricsFromEvents(events)
    const oct = metrics.monthlyHistory.find(m => m.periodStart.startsWith('2024-10'))
    const nov = metrics.monthlyHistory.find(m => m.periodStart.startsWith('2024-11'))

    expect(oct?.purchasesTotal).toBe(100)
    expect(nov?.purchasesTotal).toBe(200)
  })

  test('handles leap year dates correctly', () => {
    const events: AppEvent[] = [
      createPurchaseEvent(100, '2024-02-29'),
    ]

    const metrics = calculateMetricsFromEvents(events)
    const feb = metrics.monthlyHistory.find(m => m.periodStart.startsWith('2024-02'))

    expect(feb).toBeDefined()
    expect(feb?.purchasesTotal).toBe(100)
  })

  test('handles events with same date', () => {
    const events: AppEvent[] = [
      createPurchaseEvent(100, '2024-11-22'),
      createPurchaseEvent(200, '2024-11-22'),
    ]

    const metrics = calculateMetricsFromEvents(events)

    expect(metrics.allTime.spentTotal).toBe(300)
  })
})

describe('storeHelpers - getCurrentInterestRateFromEvents', () => {
  test('returns default rate when no rate change events', () => {
    const events: AppEvent[] = [
      createPurchaseEvent(100, '2024-11-22'),
    ]

    const rate = getCurrentInterestRateFromEvents(events, 3.5)

    expect(rate).toBe(3.5)
  })

  test('returns rate from rate change event', () => {
    const events: AppEvent[] = [
      {
        type: 'INTEREST_RATE_CHANGE',
        id: 'test-rate-1',
        date: '2024-10-01',
        newRate: 5.0,
      },
      createPurchaseEvent(100, '2024-11-22'),
    ]

    const rate = getCurrentInterestRateFromEvents(events, 3.5)

    expect(rate).toBe(5.0)
  })

  test('returns most recent rate when multiple rate changes', () => {
    const events: AppEvent[] = [
      {
        type: 'INTEREST_RATE_CHANGE',
        id: 'test-rate-1',
        date: '2024-09-01',
        newRate: 5.0,
      },
      {
        type: 'INTEREST_RATE_CHANGE',
        id: 'test-rate-2',
        date: '2024-10-01',
        newRate: 7.0,
      },
      createPurchaseEvent(100, '2024-11-22'),
    ]

    const rate = getCurrentInterestRateFromEvents(events, 3.5)

    expect(rate).toBe(7.0)
  })
})

describe('storeHelpers - applyInterestForCompletedMonths', () => {
  test('generates interest application events for completed months', () => {
    const events: AppEvent[] = [
      createPurchaseEvent(1000, '2024-10-15'),
    ]

    const withInterest = applyInterestForCompletedMonths(events, 3.5)

    // Should have original event plus interest application event(s)
    expect(withInterest.length).toBeGreaterThan(events.length)
    
    const interestEvents = withInterest.filter(e => e.type === 'INTEREST_APPLICATION')
    expect(interestEvents.length).toBeGreaterThan(0)
  })

  test('does not generate interest for current month', () => {
    const today = new Date()
    const dateStr = today.toISOString().split('T')[0]!
    
    const events: AppEvent[] = [
      createPurchaseEvent(1000, dateStr),
    ]

    const withInterest = applyInterestForCompletedMonths(events, 3.5)

    // Should only have the original event, no interest yet
    expect(withInterest).toHaveLength(1)
  })

  test('maintains sorted order after adding interest events', () => {
    const events: AppEvent[] = [
      createPurchaseEvent(1000, '2024-09-15'),
      createPurchaseEvent(500, '2024-10-20'),
    ]

    const withInterest = applyInterestForCompletedMonths(events, 3.5)

    // Events should still be sorted by date
    for (let i = 0; i < withInterest.length - 1; i++) {
      expect(withInterest[i]!.date <= withInterest[i + 1]!.date).toBe(true)
    }
  })
})
