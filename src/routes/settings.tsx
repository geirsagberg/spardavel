import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { createInterestRateChangeEvent } from '~/lib/eventUtils'
import { formatDateOnly, formatPercent } from '~/lib/formatting'
import { useAppStore } from '~/store/appStore'
import type { AppEvent, InterestRateChangeEvent } from '~/types/events'

export const Route = createFileRoute('/settings')({
  component: Settings,
})

function getTodayString(): string {
  return new Date().toISOString().split('T')[0]!
}

function Settings() {
  const events = useAppStore((state) => state.events)
  const clearAllEvents = useAppStore((state) => state.clearAllEvents)
  const addEvent = useAppStore((state) => state.addEvent)
  const updateEvent = useAppStore((state) => state.updateEvent)
  const deleteEvent = useAppStore((state) => state.deleteEvent)
  const currentInterestRate = useAppStore(
    (state) => state.metrics.currentInterestRate,
  )
  const defaultInterestRate = useAppStore((state) => state.defaultInterestRate)
  const setDefaultInterestRate = useAppStore(
    (state) => state.setDefaultInterestRate,
  )
  const theme = useAppStore((state) => state.theme)
  const setTheme = useAppStore((state) => state.setTheme)

  const [interestRate, setInterestRate] = useState(() =>
    currentInterestRate.toString(),
  )
  const [effectiveDate, setEffectiveDate] = useState(getTodayString)
  const [successMessage, setSuccessMessage] = useState('')
  const [editingEventId, setEditingEventId] = useState<string | null>(null)
  const [editRate, setEditRate] = useState('')
  const [editDate, setEditDate] = useState('')
  const [editingDefault, setEditingDefault] = useState(false)
  const [editDefaultRate, setEditDefaultRate] = useState('')

  const interestRateEvents = events
    .filter(
      (e): e is InterestRateChangeEvent => e.type === 'INTEREST_RATE_CHANGE',
    )
    .sort((a, b) => b.date.localeCompare(a.date))

  // Find earliest rate change event date for display
  const earliestRateChange = interestRateEvents[interestRateEvents.length - 1]
  const earliestRateChangeDate = earliestRateChange?.date ?? null

  useEffect(() => {
    setInterestRate(currentInterestRate.toString())
  }, [currentInterestRate])

  const handleClearAll = () => {
    if (
      window.confirm(
        'Are you sure you want to delete ALL data? This cannot be undone.',
      )
    ) {
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
      settings: {
        defaultInterestRate: defaultInterestRate,
      },
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

        // Import settings if available
        if (data.settings?.defaultInterestRate !== undefined) {
          setDefaultInterestRate(data.settings.defaultInterestRate)
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

        const settingsMessage =
          data.settings?.defaultInterestRate !== undefined
            ? ' Settings restored.'
            : ''

        setSuccessMessage(
          `Imported ${newEventIds.size} new events. (${data.events.length - newEventIds.size} duplicates skipped)${settingsMessage}`,
        )
        setTimeout(() => setSuccessMessage(''), 3000)

        // Reset input
        event.target.value = ''
      } catch (error) {
        alert(
          'Error importing file: ' +
            (error instanceof Error ? error.message : 'Unknown error'),
        )
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

    const event = createInterestRateChangeEvent(rate, effectiveDate)
    addEvent(event)

    setSuccessMessage(
      `Interest rate set to ${formatPercent(rate)}% effective ${formatDateOnly(effectiveDate)}`,
    )
    setTimeout(() => setSuccessMessage(''), 3000)
    setEffectiveDate(getTodayString())
  }

  const handleStartEdit = (event: InterestRateChangeEvent) => {
    setEditingEventId(event.id)
    setEditRate(event.newRate.toString())
    setEditDate(event.date)
  }

  const handleCancelEdit = () => {
    setEditingEventId(null)
    setEditRate('')
    setEditDate('')
  }

  const handleSaveEdit = (id: string) => {
    const rate = parseFloat(editRate)
    if (isNaN(rate) || rate < 0) {
      alert('Please enter a valid interest rate')
      return
    }

    updateEvent(id, { date: editDate, newRate: rate } as Partial<
      Omit<AppEvent, 'id' | 'type'>
    >)
    setEditingEventId(null)
    setSuccessMessage('Interest rate event updated')
    setTimeout(() => setSuccessMessage(''), 3000)
  }

  const handleDeleteRateEvent = (id: string) => {
    if (
      window.confirm(
        'Are you sure you want to delete this interest rate change?',
      )
    ) {
      deleteEvent(id)
      setSuccessMessage('Interest rate event deleted')
      setTimeout(() => setSuccessMessage(''), 3000)
    }
  }

  const handleStartEditDefault = () => {
    setEditingDefault(true)
    setEditDefaultRate(defaultInterestRate.toString())
  }

  const handleCancelEditDefault = () => {
    setEditingDefault(false)
    setEditDefaultRate('')
  }

  const handleSaveDefaultRate = () => {
    const rate = parseFloat(editDefaultRate)
    if (isNaN(rate) || rate < 0) {
      alert('Please enter a valid interest rate')
      return
    }
    setDefaultInterestRate(rate)
    setEditingDefault(false)
    setSuccessMessage(`Default interest rate updated to ${rate}%`)
    setTimeout(() => setSuccessMessage(''), 3000)
  }

  return (
    <div className="min-h-screen bg-base-100 pb-20 sm:pb-8">
      <div className="container mx-auto max-w-2xl space-y-6 px-4 py-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold sm:text-4xl">Settings</h1>
          <p className="text-sm text-base-content/60 sm:text-base">
            Configure your app
          </p>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="alert alert-success">
            <svg
              className="h-6 w-6 shrink-0 stroke-current"
              fill="none"
              viewBox="0 0 24 24"
            >
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

        {/* Theme Selection */}
        <div className="card bg-base-200">
          <div className="card-body">
            <h2 className="card-title">Theme</h2>
            <p className="text-base-content/60 text-sm">
              Choose your preferred color theme
            </p>
            <div className="form-control pt-2">
              <select
                className="select select-bordered w-full max-w-xs"
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
              >
                <option value="light">Light</option>
                <option value="dark">Dark</option>
                <option value="retro">Retro</option>
                <option value="forest">Forest</option>
                <option value="bumblebee">Bumblebee</option>
                <option value="synthwave">Synthwave</option>
                <option value="dracula">Dracula</option>
                <option value="coffee">Coffee</option>
              </select>
            </div>
          </div>
        </div>

        {/* Interest Rate Configuration */}
        <div className="card bg-base-200">
          <div className="card-body">
            <h2 className="card-title">Interest Rate Configuration</h2>
            <p className="text-base-content/60 text-sm">
              Set the annual interest rate applied to your saved and spent
              amounts
            </p>

            <div className="form-control gap-4 pt-4">
              <div className="flex flex-wrap gap-2 items-end">
                <div className="form-control flex-1 min-w-[100px]">
                  <label className="label py-0.5">
                    <span className="label-text text-xs">Rate (%)</span>
                  </label>
                  <input
                    type="number"
                    placeholder="3.5"
                    className="input input-bordered input-sm"
                    value={interestRate}
                    onChange={(e) => setInterestRate(e.target.value)}
                    step="0.1"
                    min="0"
                  />
                </div>
                <div className="form-control flex-1 min-w-[130px]">
                  <label className="label py-0.5">
                    <span className="label-text text-xs">Effective Date</span>
                  </label>
                  <input
                    type="date"
                    className="input input-bordered input-sm"
                    value={effectiveDate}
                    onChange={(e) => setEffectiveDate(e.target.value)}
                  />
                </div>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={handleUpdateInterestRate}
                >
                  Add Rate
                </button>
              </div>
            </div>

            {/* Interest Rate History */}
            <div className="pt-4">
              <h3 className="text-sm font-semibold mb-2">Rate History</h3>
              <div className="space-y-2">
                {interestRateEvents.map((event) => (
                  <div key={event.id} className="bg-base-300 rounded-lg p-3">
                    {editingEventId === event.id ? (
                      <div className="flex flex-wrap gap-2 items-end">
                        <div className="form-control flex-1 min-w-20">
                          <label className="label py-0.5">
                            <span className="label-text text-xs">Rate (%)</span>
                          </label>
                          <input
                            type="number"
                            className="input input-bordered input-sm"
                            value={editRate}
                            onChange={(e) => setEditRate(e.target.value)}
                            step="0.1"
                            min="0"
                          />
                        </div>
                        <div className="form-control flex-1 min-w-[120px]">
                          <label className="label py-0.5">
                            <span className="label-text text-xs">
                              Effective Date
                            </span>
                          </label>
                          <input
                            type="date"
                            className="input input-bordered input-sm"
                            value={editDate}
                            onChange={(e) => setEditDate(e.target.value)}
                          />
                        </div>
                        <div className="flex gap-1">
                          <button
                            className="btn btn-success btn-sm"
                            onClick={() => handleSaveEdit(event.id)}
                          >
                            Save
                          </button>
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={handleCancelEdit}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="font-medium">
                            {formatPercent(event.newRate)}%
                          </span>
                          <span className="text-base-content/60 text-sm ml-2">
                            effective {formatDateOnly(event.date)}
                          </span>
                        </div>
                        <div className="flex gap-1">
                          <button
                            className="btn btn-ghost btn-xs"
                            onClick={() => handleStartEdit(event)}
                          >
                            Edit
                          </button>
                          <button
                            className="btn btn-ghost btn-xs text-error"
                            onClick={() => handleDeleteRateEvent(event.id)}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {/* Default Rate (always shown at the bottom) */}
                <div className="bg-base-300 rounded-lg p-3 border-l-4 border-info">
                  {editingDefault ? (
                    <div className="flex flex-wrap gap-2 items-end">
                      <div className="form-control flex-1 min-w-20">
                        <label className="label py-0.5">
                          <span className="label-text text-xs">Rate (%)</span>
                        </label>
                        <input
                          type="number"
                          className="input input-bordered input-sm"
                          value={editDefaultRate}
                          onChange={(e) => setEditDefaultRate(e.target.value)}
                          step="0.1"
                          min="0"
                        />
                      </div>
                      <div className="flex gap-1">
                        <button
                          className="btn btn-success btn-sm"
                          onClick={handleSaveDefaultRate}
                        >
                          Save
                        </button>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={handleCancelEditDefault}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="font-medium">
                          {formatPercent(defaultInterestRate)}%
                        </span>
                        <span className="text-base-content/60 text-sm ml-2">
                          default
                          {earliestRateChangeDate
                            ? ` (before ${formatDateOnly(earliestRateChangeDate)})`
                            : ''}
                        </span>
                      </div>
                      <button
                        className="btn btn-ghost btn-xs"
                        onClick={handleStartEditDefault}
                      >
                        Edit
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Data Export/Import */}
        <div className="card bg-base-200">
          <div className="card-body">
            <h2 className="card-title">Data Management</h2>
            <p className="text-base-content/60 text-sm">
              Export or import your data as JSON
            </p>

            <div className="flex gap-3 pt-4">
              <button className="btn btn-primary flex-1" onClick={handleExport}>
                Export Data
              </button>
              <label className="btn btn-secondary flex-1">
                Import Data
                <input
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={handleImport}
                />
              </label>
            </div>
          </div>
        </div>

        {/* Clear Data */}
        <div className="card bg-base-200">
          <div className="card-body">
            <h2 className="card-title text-error">Danger Zone</h2>
            <p className="text-base-content/60 text-sm">
              Permanently delete all your data
            </p>

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
