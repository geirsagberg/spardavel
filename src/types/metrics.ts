import type { Category } from './events'
import { FALLBACK_INTEREST_RATE } from '~/lib/constants'

/**
 * Metrics calculated from events for a specific period
 */
export interface PeriodMetrics {
  periodStart: string // ISO 8601 date
  periodEnd: string // ISO 8601 date

  // Purchases
  purchasesCount: number
  purchasesTotal: number // currency-agnostic
  purchasesByCategory: Record<Category, number>

  // Avoided purchases
  avoidedCount: number
  avoidedTotal: number // currency-agnostic
  avoidedByCategory: Record<Category, number>

  // Interest
  pendingInterestOnAvoided: number // currency-agnostic
  pendingInterestOnSpent: number // currency-agnostic
  appliedInterestOnAvoided: number // currency-agnostic
  appliedInterestOnSpent: number // currency-agnostic
}

/**
 * All-time metrics
 */
export interface AllTimeMetrics {
  savedTotal: number // avoided + applied interest on avoided
  spentTotal: number // total purchases
  missedInterest: number // interest on spent
  pendingSavedInterest: number // pending interest on avoided
  pendingCostInterest: number // pending interest on spent
}

/**
 * Dashboard metrics - the main UI data
 */
export interface DashboardMetrics {
  currentMonth: PeriodMetrics
  allTime: AllTimeMetrics
  monthlyHistory: PeriodMetrics[]
  interestRateHistory: Array<{
    effectiveDate: string // ISO 8601 date
    rate: number
  }>
  currentInterestRate: number
}

/**
 * Default empty period metrics
 */
export function createEmptyPeriodMetrics(periodStart: string, periodEnd: string): PeriodMetrics {
  const emptyCategory: Record<Category, number> = {
    Alcohol: 0,
    Candy: 0,
    Snacks: 0,
    Food: 0,
    Drinks: 0,
    Games: 0,
    Other: 0,
  }

  return {
    periodStart,
    periodEnd,
    purchasesCount: 0,
    purchasesTotal: 0,
    purchasesByCategory: { ...emptyCategory },
    avoidedCount: 0,
    avoidedTotal: 0,
    avoidedByCategory: { ...emptyCategory },
    pendingInterestOnAvoided: 0,
    pendingInterestOnSpent: 0,
    appliedInterestOnAvoided: 0,
    appliedInterestOnSpent: 0,
  }
}

/**
 * Default empty all-time metrics
 */
export function createEmptyAllTimeMetrics(): AllTimeMetrics {
  return {
    savedTotal: 0,
    spentTotal: 0,
    missedInterest: 0,
    pendingSavedInterest: 0,
    pendingCostInterest: 0,
  }
}

/**
 * Default empty dashboard metrics
 */
export function createEmptyDashboardMetrics(): DashboardMetrics {
  const now = new Date()
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]!
  const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]!

  return {
    currentMonth: createEmptyPeriodMetrics(currentMonthStart, currentMonthEnd),
    allTime: createEmptyAllTimeMetrics(),
    monthlyHistory: [],
    interestRateHistory: [
      {
        effectiveDate: new Date().toISOString().split('T')[0]!,
        rate: FALLBACK_INTEREST_RATE,
      },
    ],
    currentInterestRate: FALLBACK_INTEREST_RATE,
  }
}
