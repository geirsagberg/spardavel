import { useMemo, useState } from 'react'
import { useAppStore } from '~/store/appStore'
import { isTransactionEvent } from '~/types/events'

const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000

/**
 * Hook that determines if the export reminder should be shown.
 * Returns true if:
 * - User hasn't disabled reminders (dontRemindExport is false)
 * - There are events in the store
 * - 14 days have passed since either:
 *   - The last export, OR
 *   - The first transaction event (if never exported)
 */
export function useExportReminder(): boolean {
  const events = useAppStore((state) => state.events)
  const lastExportTimestamp = useAppStore((state) => state.lastExportTimestamp)
  const dontRemindExport = useAppStore((state) => state.dontRemindExport)
  
  // Capture timestamp once on mount - useState initializer only runs once
  const [mountTimestamp] = useState(() => Date.now())

  return useMemo(() => {
    // Don't show if user has disabled reminders
    if (dontRemindExport) {
      return false
    }

    // Find first transaction event (PURCHASE or AVOIDED_PURCHASE)
    const transactionEvents = events.filter(isTransactionEvent)
    if (transactionEvents.length === 0) {
      return false
    }

    // Sort by date ascending to get the first event
    const sortedEvents = [...transactionEvents].sort((a, b) =>
      a.date.localeCompare(b.date),
    )
    const firstTransactionDate = new Date(sortedEvents[0].date)

    // Check if we have an export timestamp
    if (lastExportTimestamp) {
      const lastExportDate = new Date(lastExportTimestamp)
      const timeSinceExport = mountTimestamp - lastExportDate.getTime()
      return timeSinceExport >= FOURTEEN_DAYS_MS
    }

    // No previous export - check time since first event
    const timeSinceFirstEvent = mountTimestamp - firstTransactionDate.getTime()
    return timeSinceFirstEvent >= FOURTEEN_DAYS_MS
  }, [events, lastExportTimestamp, dontRemindExport, mountTimestamp])
}
