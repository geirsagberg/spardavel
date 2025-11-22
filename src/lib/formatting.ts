/**
 * Locale configuration for the app
 * Change this constant to switch the entire app to a different locale
 */
export const APP_LOCALE = 'nb-NO'
export const APP_CURRENCY = 'NOK'

/**
 * Format a number as currency according to the app locale
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat(APP_LOCALE, {
    style: 'currency',
    currency: APP_CURRENCY,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

/**
 * Format a date/timestamp according to the app locale
 * @deprecated Use formatDateWithWeekday for entries display
 */
export function formatDate(timestamp: string): string {
  const date = new Date(timestamp)
  return date.toLocaleDateString(APP_LOCALE, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Format a date with weekday, year and date for entries (e.g., "man. 15. jan. 2025")
 */
export function formatDateWithWeekday(date: string): string {
  return new Date(date).toLocaleDateString(APP_LOCALE, {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

/**
 * Format a month string (YYYY-MM) according to the app locale
 */
export function formatMonth(monthString: string): string {
  return new Date(`${monthString}-01`).toLocaleDateString(APP_LOCALE, {
    year: 'numeric',
    month: 'short',
  })
}

/**
 * Format a date for month abbreviation (e.g., "Jan 24")
 */
export function formatMonthShort(dateString: string): string {
  return new Date(`${dateString}T00:00:00`).toLocaleDateString(APP_LOCALE, {
    month: 'short',
    year: '2-digit',
  })
}

/**
 * Format a percentage value according to the app locale
 */
export function formatPercent(value: number): string {
  return new Intl.NumberFormat(APP_LOCALE, {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value)
}

/**
 * Format a date string (ISO) as localized date (e.g., "15. jan. 2025")
 */
export function formatDateOnly(dateString: string): string {
  return new Date(dateString).toLocaleDateString(APP_LOCALE)
}

/**
 * Singleton DateTimeFormat for ISO date strings (YYYY-MM-DD) in local timezone
 * Uses sv-SE locale which formats dates as YYYY-MM-DD
 * Avoids timezone issues around midnight by using the local timezone
 */
const isoDateFormatter = new Intl.DateTimeFormat('sv-SE', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

/**
 * Get today's date as ISO string (YYYY-MM-DD) in local timezone
 * Uses Intl.DateTimeFormat to avoid timezone issues around midnight
 */
export function getTodayString(): string {
  return isoDateFormatter.format(new Date())
}
