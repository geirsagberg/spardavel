/**
 * Event types and interfaces for the Spardavel event sourcing system
 * All amounts are currency-agnostic (e.g., 30 for 30 kr)
 */

import { z } from 'zod'

export type EventType =
  | 'PURCHASE'
  | 'AVOIDED_PURCHASE'
  | 'INTEREST_RATE_CHANGE'
  | 'INTEREST_APPLICATION'

export type Category =
  | 'Alcohol'
  | 'Candy'
  | 'Snacks'
  | 'Food'
  | 'Drinks'
  | 'Games'
  | 'Other'

// Zod schemas for validation
const CategorySchema = z.enum([
  'Alcohol',
  'Candy',
  'Snacks',
  'Food',
  'Drinks',
  'Games',
  'Other',
])

// Date string in YYYY-MM-DD format
const DateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'Invalid date format (expected YYYY-MM-DD)',
  })

const PurchaseEventSchema = z
  .object({
    type: z.literal('PURCHASE'),
    id: z.string().uuid(),
    date: DateSchema,
    amount: z.number().positive(),
    category: CategorySchema,
    description: z.string().min(1),
  })
  .strip()

const AvoidedPurchaseEventSchema = z
  .object({
    type: z.literal('AVOIDED_PURCHASE'),
    id: z.string().uuid(),
    date: DateSchema,
    amount: z.number().positive(),
    category: CategorySchema,
    description: z.string().min(1),
  })
  .strip()

const InterestRateChangeEventSchema = z
  .object({
    type: z.literal('INTEREST_RATE_CHANGE'),
    id: z.string().uuid(),
    date: DateSchema,
    newRate: z.number().min(0).max(100),
  })
  .strip()

const InterestApplicationEventSchema = z
  .object({
    type: z.literal('INTEREST_APPLICATION'),
    id: z.string().uuid(),
    date: DateSchema,
    pendingOnAvoided: z.number(),
    pendingOnSpent: z.number(),
  })
  .strip()

export const AppEventSchema = z.discriminatedUnion('type', [
  PurchaseEventSchema,
  AvoidedPurchaseEventSchema,
  InterestRateChangeEventSchema,
  InterestApplicationEventSchema,
])

export const AppEventsArraySchema = z.array(AppEventSchema)

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
}

/**
 * Avoided purchase event - impulse buy considered but skipped
 */
export interface AvoidedPurchaseEvent extends BaseEvent {
  type: 'AVOIDED_PURCHASE'
  amount: number // currency-agnostic
  category: Category
  description: string
}

/**
 * Interest rate change event
 */
export interface InterestRateChangeEvent {
  type: 'INTEREST_RATE_CHANGE'
  id: string // UUIDv7
  date: string // ISO 8601 date (YYYY-MM-DD) - when the rate change takes effect
  newRate: number // e.g., 3.5 for 3.5% annually
}

/**
 * Interest application event - generated automatically monthly
 */
export interface InterestApplicationEvent {
  type: 'INTEREST_APPLICATION'
  id: string // UUIDv7
  date: string // ISO 8601 date (YYYY-MM-DD) - end of month when interest is applied
  pendingOnAvoided: number // calculated interest
  pendingOnSpent: number // calculated interest
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

export function isAvoidedPurchaseEvent(
  event: AppEvent,
): event is AvoidedPurchaseEvent {
  return event.type === 'AVOIDED_PURCHASE'
}

export function isTransactionEvent(
  event: AppEvent,
): event is PurchaseEvent | AvoidedPurchaseEvent {
  return event.type === 'PURCHASE' || event.type === 'AVOIDED_PURCHASE'
}

export function isInterestRateChangeEvent(
  event: AppEvent,
): event is InterestRateChangeEvent {
  return event.type === 'INTEREST_RATE_CHANGE'
}

export function isInterestApplicationEvent(
  event: AppEvent,
): event is InterestApplicationEvent {
  return event.type === 'INTEREST_APPLICATION'
}
