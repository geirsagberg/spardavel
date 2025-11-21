import { createFileRoute } from '@tanstack/react-router'
import { Dashboard } from '~/components/Dashboard'
import { QuickEntry } from '~/components/QuickEntry'
import { RecentEntries } from '~/components/RecentEntries'

export const Route = createFileRoute('/')({
  component: Home,
})

function Home() {
  return (
    <div className="min-h-screen bg-base-100 pb-20 sm:pb-8">
      <div className="container mx-auto max-w-2xl space-y-6 px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold sm:text-4xl">Spardavel</h1>
            <p className="text-sm text-base-content/60 sm:text-base">Track your savings</p>
          </div>
          {/* Desktop Navigation */}
          <div className="hidden gap-2 sm:flex">
            <a href="/history" className="btn btn-sm btn-ghost">
              History
            </a>
            <a href="/analytics" className="btn btn-sm btn-ghost">
              Analytics
            </a>
            <a href="/settings" className="btn btn-sm btn-ghost">
              Settings
            </a>
          </div>
        </div>

        <Dashboard />
        <QuickEntry />
        <RecentEntries />
      </div>
    </div>
  )
}
