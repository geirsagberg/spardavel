/**
 * Event types and interfaces for the Spardavel event sourcing system
 * All amounts are currency-agnostic (e.g., 30 for 30 kr)
 */

export type EventType = 'PURCHASE' | 'AVOIDED_PURCHASE' | 'INTEREST_RATE_CHANGE' | 'INTEREST_APPLICATION'

export type Category = 'Alcohol' | 'Candy' | 'Snacks' | 'Food' | 'Drinks' | 'Games' | 'Other'

/**
 * Base event structure
 */
export interface BaseEvent {
  type: EventType
  id: string // UUIDv7
  date: string // ISO 8601 date (YYYY-MM-DD)
}

/**
 * Purchase event - money actually spent
 */
export interface PurchaseEvent extends BaseEvent {
  type: 'PURCHASE'
  amount: number // currency-agnostic
  category: Category
  description: string
  metadata?: Record<string, unknown>
}

/**
 * Avoided purchase event - impulse buy considered but skipped
 */
export interface AvoidedPurchaseEvent extends BaseEvent {
  type: 'AVOIDED_PURCHASE'
  amount: number // currency-agnostic
  category: Category
  description: string
  metadata?: Record<string, unknown>
}

/**
 * Interest rate change event
 */
export interface InterestRateChangeEvent extends BaseEvent {
  type: 'INTEREST_RATE_CHANGE'
  effectiveDate: string // ISO 8601 date
  newRate: number // e.g., 3.5 for 3.5% annually
  notes?: string
}

/**
 * Interest application event - generated automatically monthly
 */
export interface InterestApplicationEvent extends BaseEvent {
  type: 'INTEREST_APPLICATION'
  appliedDate: string // ISO 8601 date
  pendingOnAvoided: number // calculated interest
  pendingOnSpent: number // calculated interest
  metadata?: Record<string, unknown>
}

/**
 * Union type for all events
 */
export type AppEvent =
  | PurchaseEvent
  | AvoidedPurchaseEvent
  | InterestRateChangeEvent
  | InterestApplicationEvent

/**
 * Type guards
 */
export function isPurchaseEvent(event: AppEvent): event is PurchaseEvent {
  return event.type === 'PURCHASE'
}

export function isAvoidedPurchaseEvent(event: AppEvent): event is AvoidedPurchaseEvent {
  return event.type === 'AVOIDED_PURCHASE'
}

export function isTransactionEvent(event: AppEvent): event is PurchaseEvent | AvoidedPurchaseEvent {
  return event.type === 'PURCHASE' || event.type === 'AVOIDED_PURCHASE'
}

export function isInterestRateChangeEvent(event: AppEvent): event is InterestRateChangeEvent {
  return event.type === 'INTEREST_RATE_CHANGE'
}

export function isInterestApplicationEvent(event: AppEvent): event is InterestApplicationEvent {
  return event.type === 'INTEREST_APPLICATION'
}
