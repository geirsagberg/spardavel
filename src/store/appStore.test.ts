import { describe, expect, test, beforeEach } from 'bun:test'
import { createStore, type StoreApi } from 'zustand/vanilla'
import { createAppStore, type AppStore } from './appStore'
import type { AppEvent } from '../types/events'

describe('AppStore', () => {
  let store: StoreApi<AppStore>

  beforeEach(() => {
    store = createStore<AppStore>(createAppStore)
  })

  describe('addEvent', () => {
    test('should add a purchase event', () => {
      const event: AppEvent = {
        id: '1',
        type: 'PURCHASE',
        date: '2025-11-15',
        amount: 100,
        category: 'Food',
        description: 'Test purchase',
      }

      store.getState().addEvent(event)

      const state = store.getState()
      expect(state.events).toHaveLength(1)
      expect(state.events[0]).toEqual(event)
    })

    test('should add an avoided purchase event', () => {
      const event: AppEvent = {
        id: '1',
        type: 'AVOIDED_PURCHASE',
        date: '2025-11-15',
        amount: 50,
        category: 'Candy',
        description: 'Test avoided',
      }

      store.getState().addEvent(event)

      const state = store.getState()
      expect(state.events).toHaveLength(1)
      expect(state.events[0]).toEqual(event)
    })

    test('should sort events by date after adding', () => {
      store.getState().addEvent({
        id: '1',
        type: 'PURCHASE',
        date: '2025-11-15',
        amount: 100,
        category: 'Food',
        description: 'Later',
      })

      store.getState().addEvent({
        id: '2',
        type: 'PURCHASE',
        date: '2025-11-10',
        amount: 50,
        category: 'Food',
        description: 'Earlier',
      })

      const state = store.getState()
      expect(state.events[0]?.id).toBe('2')
      expect(state.events[1]?.id).toBe('1')
    })

    test('should recalculate metrics after adding event', () => {
      const initialMetrics = store.getState().metrics

      store.getState().addEvent({
        id: '1',
        type: 'PURCHASE',
        date: '2025-11-15',
        amount: 100,
        category: 'Food',
        description: 'Test',
      })

      const newMetrics = store.getState().metrics
      expect(newMetrics).not.toEqual(initialMetrics)
      expect(newMetrics.currentMonth.purchasesTotal).toBe(100)
    })
  })

  describe('updateEvent', () => {
    test('should update event date', () => {
      store.getState().addEvent({
        id: '1',
        type: 'PURCHASE',
        date: '2025-11-15',
        amount: 100,
        category: 'Food',
        description: 'Original',
      })

      store.getState().updateEvent('1', {
        date: '2025-11-20',
      })

      const state = store.getState()
      const event = state.events[0]
      expect(event?.id).toBe('1')
      expect(event?.date).toBe('2025-11-20')
    })

    test('should recalculate metrics after updating event date', () => {
      store.getState().addEvent({
        id: '1',
        type: 'PURCHASE',
        date: '2025-11-15',
        amount: 100,
        category: 'Food',
        description: 'Test',
      })

      expect(store.getState().metrics.currentMonth.purchasesTotal).toBe(100)

      store.getState().updateEvent('1', { date: '2025-10-15' })

      expect(store.getState().metrics.currentMonth.purchasesTotal).toBe(0)
    })

    test('should maintain sort order after date update', () => {
      store.getState().addEvent({
        id: '1',
        type: 'PURCHASE',
        date: '2025-11-10',
        amount: 100,
        category: 'Food',
        description: 'First',
      })

      store.getState().addEvent({
        id: '2',
        type: 'PURCHASE',
        date: '2025-11-15',
        amount: 50,
        category: 'Food',
        description: 'Second',
      })

      store.getState().updateEvent('2', { date: '2025-11-05' })

      const state = store.getState()
      expect(state.events[0]?.id).toBe('2')
      expect(state.events[1]?.id).toBe('1')
    })
  })

  describe('deleteEvent', () => {
    test('should delete an event by id', () => {
      store.getState().addEvent({
        id: '1',
        type: 'PURCHASE',
        date: '2025-11-15',
        amount: 100,
        category: 'Food',
        description: 'Test',
      })

      store.getState().deleteEvent('1')

      const state = store.getState()
      expect(state.events).toHaveLength(0)
    })

    test('should recalculate metrics after deleting event', () => {
      store.getState().addEvent({
        id: '1',
        type: 'PURCHASE',
        date: '2025-11-15',
        amount: 100,
        category: 'Food',
        description: 'Test',
      })

      expect(store.getState().metrics.currentMonth.purchasesTotal).toBe(100)

      store.getState().deleteEvent('1')

      expect(store.getState().metrics.currentMonth.purchasesTotal).toBe(0)
    })
  })

  describe('setDefaultInterestRate', () => {
    test('should update the default interest rate', () => {
      store.getState().setDefaultInterestRate(0.05)

      expect(store.getState().defaultInterestRate).toBe(0.05)
    })

    test('should recalculate interest with new rate', () => {
      store.getState().addEvent({
        id: '1',
        type: 'PURCHASE',
        date: '2025-10-15',
        amount: 1000,
        category: 'Food',
        description: 'Test',
      })

      const metricsBefore = store.getState().metrics

      store.getState().setDefaultInterestRate(0.05)

      const metricsAfter = store.getState().metrics
      expect(metricsAfter).not.toEqual(metricsBefore)
    })
  })

  describe('clearAllEvents', () => {
    test('should clear all events and reset state', () => {
      store.getState().addEvent({
        id: '1',
        type: 'PURCHASE',
        date: '2025-11-15',
        amount: 100,
        category: 'Food',
        description: 'Test',
      })

      store.getState().setDefaultInterestRate(0.05)

      store.getState().clearAllEvents()

      const state = store.getState()
      expect(state.events).toHaveLength(0)
      expect(state.defaultInterestRate).toBe(3.5)
      expect(state.metrics.currentMonth.purchasesTotal).toBe(0)
    })
  })

  describe('getEventById', () => {
    test('should return event by id', () => {
      const event: AppEvent = {
        id: '1',
        type: 'PURCHASE',
        date: '2025-11-15',
        amount: 100,
        category: 'Food',
        description: 'Test',
      }

      store.getState().addEvent(event)

      const foundEvent = store.getState().getEventById('1')
      expect(foundEvent).toEqual(event)
    })

    test('should return undefined for non-existent id', () => {
      const foundEvent = store.getState().getEventById('nonexistent')
      expect(foundEvent).toBeUndefined()
    })
  })

  describe('getEventsByMonth', () => {
    test('should return events for a specific month', () => {
      store.getState().addEvent({
        id: '1',
        type: 'PURCHASE',
        date: '2025-11-15',
        amount: 100,
        category: 'Food',
        description: 'November',
      })

      store.getState().addEvent({
        id: '2',
        type: 'PURCHASE',
        date: '2025-10-15',
        amount: 50,
        category: 'Food',
        description: 'October',
      })

      const novemberEvents = store.getState().getEventsByMonth('2025-11')
      expect(novemberEvents).toHaveLength(1)
      expect(novemberEvents[0]?.id).toBe('1')
    })
  })

  describe('setTheme', () => {
    test('should update theme', () => {
      store.getState().setTheme('light')
      expect(store.getState().theme).toBe('light')
    })
  })

  describe('interest application', () => {
    test('should automatically apply interest for completed months', () => {
      store.getState().addEvent({
        id: '1',
        type: 'PURCHASE',
        date: '2025-10-15',
        amount: 1000,
        category: 'Food',
        description: 'October purchase',
      })

      const state = store.getState()
      const interestEvents = state.events.filter(
        (e) => e.type === 'INTEREST_APPLICATION'
      )
      expect(interestEvents.length).toBeGreaterThan(0)
    })

    test('should regenerate interest after adding retroactive event', () => {
      store.getState().addEvent({
        id: '1',
        type: 'PURCHASE',
        date: '2025-10-15',
        amount: 1000,
        category: 'Food',
        description: 'October purchase',
      })

      store.getState().addEvent({
        id: '2',
        type: 'PURCHASE',
        date: '2025-10-05',
        amount: 500,
        category: 'Food',
        description: 'Earlier October purchase',
      })

      const eventsAfter = store.getState().events
      expect(eventsAfter).toContainEqual(
        expect.objectContaining({ id: '2' })
      )
    })

    test('should remove and regenerate interest events when updating a purchase', () => {
      store.getState().addEvent({
        id: '1',
        type: 'PURCHASE',
        date: '2025-10-15',
        amount: 1000,
        category: 'Food',
        description: 'October purchase',
      })

      store.getState().updateEvent('1', { date: '2025-10-20' })

      const eventsAfterUpdate = store.getState().events
      const hasInterest = eventsAfterUpdate.some(
        (e) => e.type === 'INTEREST_APPLICATION'
      )
      expect(hasInterest).toBe(true)
    })
  })

  describe('interest rate changes', () => {
    test('should handle interest rate change events', () => {
      store.getState().addEvent({
        id: '1',
        type: 'INTEREST_RATE_CHANGE',
        date: '2025-11-01',
        newRate: 5.0,
      })

      const state = store.getState()
      expect(state.events).toHaveLength(1)
      expect(state.events[0]?.type).toBe('INTEREST_RATE_CHANGE')
    })

    test('should only apply retroactive interest rate change to months after the change date', () => {
      // Arrange: Set default interest rate to 10%
      store.getState().setDefaultInterestRate(10)

      // Add a purchase 1 year back
      store.getState().addEvent({
        id: '1',
        type: 'PURCHASE',
        date: '2024-11-15',
        amount: 1000,
        category: 'Food',
        description: 'Purchase 1 year ago',
      })

      // Record the interest applied with 10% rate
      const stateAfterPurchase = store.getState()
      const interestEventsAt10Percent = stateAfterPurchase.events.filter(
        (e) => e.type === 'INTEREST_APPLICATION'
      )

      // Get interest for the first month (November 2024) at 10%
      const novemberInterestAt10 = interestEventsAt10Percent.find(
        (e) => e.type === 'INTEREST_APPLICATION' && e.date.startsWith('2024-11')
      )
      expect(novemberInterestAt10).toBeDefined()
      const novemberInterestValueAt10 = novemberInterestAt10?.type === 'INTEREST_APPLICATION'
        ? novemberInterestAt10.pendingOnSpent
        : 0

      // Act: Add an interest rate change to 5% effective 6 months ago (May 2025)
      store.getState().addEvent({
        id: '2',
        type: 'INTEREST_RATE_CHANGE',
        date: '2025-05-01',
        newRate: 5,
      })

      // Assert: Months before May 2025 should still use 10%, months after should use 5%
      const stateAfterRateChange = store.getState()
      const interestEventsAfterChange = stateAfterRateChange.events.filter(
        (e) => e.type === 'INTEREST_APPLICATION'
      )

      // November 2024 interest should be unchanged (still at 10%)
      const novemberInterestAfterChange = interestEventsAfterChange.find(
        (e) => e.type === 'INTEREST_APPLICATION' && e.date.startsWith('2024-11')
      )
      expect(novemberInterestAfterChange).toBeDefined()
      const novemberInterestValueAfterChange = novemberInterestAfterChange?.type === 'INTEREST_APPLICATION'
        ? novemberInterestAfterChange.pendingOnSpent
        : 0

      // The November 2024 interest should remain the same since it's before the rate change
      expect(novemberInterestValueAfterChange).toBe(novemberInterestValueAt10)
    })

    test('should handle mid-month rate change correctly', () => {
      // Arrange: Set default interest rate to 10%
      store.getState().setDefaultInterestRate(10)

      // Add a purchase at the start of October 2024
      store.getState().addEvent({
        id: '1',
        type: 'PURCHASE',
        date: '2024-10-01',
        amount: 1000,
        category: 'Food',
        description: 'October purchase',
      })

      // Record the October interest at 10% (31 days)
      const stateAt10Percent = store.getState()
      const octoberAt10 = stateAt10Percent.events.find(
        (e) => e.type === 'INTEREST_APPLICATION' && e.date === '2024-10-31'
      )
      expect(octoberAt10).toBeDefined()
      const octoberInterestAt10 = octoberAt10?.type === 'INTEREST_APPLICATION'
        ? octoberAt10.pendingOnSpent
        : 0

      // October 2024 at 10%: 1000 * (10/100/365) * 31 ≈ 8.49
      expect(octoberInterestAt10).toBeGreaterThan(8)
      expect(octoberInterestAt10).toBeLessThan(9)

      // Act: Add a mid-month rate change to 5% on October 16
      store.getState().addEvent({
        id: '2',
        type: 'INTEREST_RATE_CHANGE',
        date: '2024-10-16',
        newRate: 5,
      })

      // Assert: October interest should be split - 15 days at 10%, 16 days at 5%
      const stateAfterMidMonthChange = store.getState()
      const octoberAfterChange = stateAfterMidMonthChange.events.find(
        (e) => e.type === 'INTEREST_APPLICATION' && e.date === '2024-10-31'
      )
      expect(octoberAfterChange).toBeDefined()
      const octoberInterestAfterChange = octoberAfterChange?.type === 'INTEREST_APPLICATION'
        ? octoberAfterChange.pendingOnSpent
        : 0

      // Expected: 1000 * (10/100/365) * 15 + 1000 * (5/100/365) * 16 ≈ 4.11 + 2.19 ≈ 6.30
      // This should be less than the full month at 10% (8.49)
      // but more than the full month at 5% (4.25)
      expect(octoberInterestAfterChange).toBeLessThan(octoberInterestAt10)
      expect(octoberInterestAfterChange).toBeGreaterThan(4.2) // More than full month at 5%
      expect(octoberInterestAfterChange).toBeLessThan(7) // But less than full month at 10%
    })

    test('should handle multiple mid-month rate changes correctly', () => {
      // Arrange: Set default interest rate to 10%
      store.getState().setDefaultInterestRate(10)

      // Add a purchase at the start of October 2024
      store.getState().addEvent({
        id: '1',
        type: 'PURCHASE',
        date: '2024-10-01',
        amount: 1000,
        category: 'Food',
        description: 'October purchase',
      })

      // Add first rate change on October 11 to 5%
      store.getState().addEvent({
        id: '2',
        type: 'INTEREST_RATE_CHANGE',
        date: '2024-10-11',
        newRate: 5,
      })

      // Add second rate change on October 21 to 15%
      store.getState().addEvent({
        id: '3',
        type: 'INTEREST_RATE_CHANGE',
        date: '2024-10-21',
        newRate: 15,
      })

      // Assert: October interest should have three periods
      // Days 1-10 (10 days) at 10%, Days 11-20 (10 days) at 5%, Days 21-31 (11 days) at 15%
      const state = store.getState()
      const octoberInterest = state.events.find(
        (e) => e.type === 'INTEREST_APPLICATION' && e.date === '2024-10-31'
      )
      expect(octoberInterest).toBeDefined()
      const interest = octoberInterest?.type === 'INTEREST_APPLICATION'
        ? octoberInterest.pendingOnSpent
        : 0

      // Expected:
      // 1000 * (10/100/365) * 10 = 2.74
      // 1000 * (5/100/365) * 10 = 1.37
      // 1000 * (15/100/365) * 11 = 4.52
      // Total ≈ 8.63
      expect(interest).toBeGreaterThan(8)
      expect(interest).toBeLessThan(9.5)
    })
  })
})
