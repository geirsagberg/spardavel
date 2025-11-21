import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { useAppStore } from '~/store/appStore'
import { createInterestRateChangeEvent } from '~/lib/eventUtils'

export const Route = createFileRoute('/settings')({
  component: Settings,
})

function formatAmount(amount: number): string {
  return `${amount.toLocaleString()} kr`
}

function Settings() {
  const events = useAppStore((state) => state.events)
  const clearAllEvents = useAppStore((state) => state.clearAllEvents)
  const addEvent = useAppStore((state) => state.addEvent)
  const currentInterestRate = useAppStore((state) => state.metrics.currentInterestRate)

  const [interestRate, setInterestRate] = useState(() => currentInterestRate.toString())
  const [successMessage, setSuccessMessage] = useState('')

  useEffect(() => {
    setInterestRate(currentInterestRate.toString())
  }, [currentInterestRate])

  const handleClearAll = () => {
    if (window.confirm('Are you sure you want to delete ALL data? This cannot be undone.')) {
      clearAllEvents()
      setSuccessMessage('All data cleared')
      setTimeout(() => setSuccessMessage(''), 3000)
    }
  }

  const handleExport = () => {
    const data = {
      version: '1',
      exportDate: new Date().toISOString(),
      events: events,
    }

    const jsonString = JSON.stringify(data, null, 2)
    const blob = new Blob([jsonString], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `spardavel_export_${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    setSuccessMessage('Data exported successfully')
    setTimeout(() => setSuccessMessage(''), 3000)
  }

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string
        const data = JSON.parse(content)

        if (!data.events || !Array.isArray(data.events)) {
          alert('Invalid file format')
          return
        }

        // Import events
        const newEventIds = new Set()
        const existingIds = new Set(events.map((e) => e.id))

        for (const event of data.events) {
          if (!existingIds.has(event.id)) {
            addEvent(event)
            newEventIds.add(event.id)
          }
        }

        setSuccessMessage(
          `Imported ${newEventIds.size} new events. (${data.events.length - newEventIds.size} duplicates skipped)`
        )
        setTimeout(() => setSuccessMessage(''), 3000)

        // Reset input
        event.target.value = ''
      } catch (error) {
        alert('Error importing file: ' + (error instanceof Error ? error.message : 'Unknown error'))
      }
    }

    reader.readAsText(file)
  }

  const handleUpdateInterestRate = () => {
    const rate = parseFloat(interestRate)
    if (isNaN(rate) || rate < 0) {
      alert('Please enter a valid interest rate')
      return
    }

    // Add interest rate change event
    const today = new Date().toISOString().split('T')[0]
    const event = createInterestRateChangeEvent(rate, today)
    addEvent(event)

    setSuccessMessage(`Interest rate updated to ${rate}%`)
    setTimeout(() => setSuccessMessage(''), 3000)
  }

  return (
    <div className="min-h-screen bg-base-100 pb-20 sm:pb-8">
      <div className="container mx-auto max-w-2xl space-y-6 px-4 py-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold sm:text-4xl">Settings</h1>
          <p className="text-sm text-base-content/60 sm:text-base">Configure your app</p>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="alert alert-success">
            <svg className="h-6 w-6 shrink-0 stroke-current" fill="none" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              ></path>
            </svg>
            <span>{successMessage}</span>
          </div>
        )}

        {/* Interest Rate Configuration */}
        <div className="card bg-base-200">
          <div className="card-body">
            <h2 className="card-title">Interest Rate Configuration</h2>
            <p className="text-base-content/60 text-sm">
              Set the annual interest rate applied to your saved and spent amounts
            </p>

            <div className="form-control gap-4 pt-4">
              <div>
                <label className="label">
                  <span className="label-text">Annual Interest Rate (%)</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="3.5"
                    className="input input-bordered flex-1"
                    value={interestRate}
                    onChange={(e) => setInterestRate(e.target.value)}
                    step="0.1"
                    min="0"
                  />
                  <button className="btn btn-primary" onClick={handleUpdateInterestRate}>
                    Update
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Data Export/Import */}
        <div className="card bg-base-200">
          <div className="card-body">
            <h2 className="card-title">Data Management</h2>
            <p className="text-base-content/60 text-sm">Export or import your data as JSON</p>

            <div className="flex flex-col gap-3 pt-4">
              <button className="btn btn-primary" onClick={handleExport}>
                Export Data
              </button>
              <label className="btn btn-secondary">
                Import Data
                <input type="file" accept=".json" className="hidden" onChange={handleImport} />
              </label>
            </div>
          </div>
        </div>

        {/* Clear Data */}
        <div className="card bg-base-200">
          <div className="card-body">
            <h2 className="card-title text-error">Danger Zone</h2>
            <p className="text-base-content/60 text-sm">Permanently delete all your data</p>

            <div className="pt-4">
              <button className="btn btn-error" onClick={handleClearAll}>
                Clear All Data
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
