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
        <div>
          <h1 className="text-4xl font-bold">Spardavel</h1>
          <p className="text-base-content/60">Track your savings and reduce impulse purchases</p>
        </div>

        <Dashboard />
        <QuickEntry />
        <RecentEntries />
      </div>
    </div>
  )
}
