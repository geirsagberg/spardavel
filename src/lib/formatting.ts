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
