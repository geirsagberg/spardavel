import { createFileRoute } from '@tanstack/react-router'
import { Dashboard } from '~/components/Dashboard'
import { QuickEntry } from '~/components/QuickEntry'
import { RecentEntries } from '~/components/RecentEntries'

export const Route = createFileRoute('/')({
  component: Home,
})

function Home() {
  return (
    <div className="min-h-screen bg-base-100">
      <div className="container mx-auto max-w-2xl space-y-8 px-4 py-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold">Spardavel</h1>
            <p className="text-base-content/60">Track your savings and reduce impulse purchases</p>
          </div>
          <div className="flex gap-2">
            <a href="/history" className="btn btn-sm btn-outline">
              History
            </a>
            <a href="/analytics" className="btn btn-sm btn-outline">
              Analytics
            </a>
            <a href="/settings" className="btn btn-sm btn-outline">
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
