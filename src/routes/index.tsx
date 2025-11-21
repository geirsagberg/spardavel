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
        {/* Header - visible on mobile only since desktop has global header */}
        <div className="sm:hidden">
          <h1 className="text-3xl font-bold">Spardavel</h1>
          <p className="text-sm text-base-content/60">Track your savings</p>
        </div>

        <Dashboard />
        <QuickEntry />
        <RecentEntries />
      </div>
    </div>
  )
}
