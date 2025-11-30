import { useAppStore } from '~/store/appStore'

/**
 * Export app data to a JSON file and update the last export timestamp.
 * Returns true if the export was successful.
 */
export function exportAppData(): boolean {
  const state = useAppStore.getState()
  const { events, defaultInterestRate, setLastExportTimestamp } = state

  try {
    const exportDate = new Date().toISOString()
    const data = {
      version: '1',
      exportDate: exportDate,
      events: events,
      settings: {
        defaultInterestRate: defaultInterestRate,
      },
    }

    const jsonString = JSON.stringify(data, null, 2)
    const blob = new Blob([jsonString], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    // Include full timestamp in filename (YYYYMMDD_HHmmss format)
    const timestamp = exportDate.replace(/[-:]/g, '').replace('T', '_').slice(0, 15)
    link.download = `spardavel_export_${timestamp}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    // Save the export timestamp to localStorage
    setLastExportTimestamp(exportDate)

    return true
  } catch (error) {
    console.error('Export failed:', error)
    return false
  }
}
