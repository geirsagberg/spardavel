import { useEffect } from 'react'
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { QuickEntry } from '~/components/QuickEntry'
import { RecentEntries } from '~/components/RecentEntries'
import { StackedChart } from '~/components/StackedChart'

export const Route = createFileRoute('/')({
  beforeLoad: ({ location }) => {
    if (typeof window !== 'undefined') {
      const onboardingComplete = localStorage.getItem('spardavel_onboarding_complete')
      if (!onboardingComplete) {
        throw redirect({ to: '/onboarding/$slide', params: { slide: '1' } })
      }
    }
  },
  component: Home,
})

function Home() {
  const navigate = useNavigate()

  useEffect(() => {
    const onboardingComplete = localStorage.getItem('spardavel_onboarding_complete')
    if (!onboardingComplete) {
      navigate({ to: '/onboarding/$slide', params: { slide: '1' } })
    }
  }, [navigate])

  return (
    <div className="min-h-screen bg-base-100 pb-20 sm:pb-8">
      <div className="container mx-auto max-w-2xl space-y-6 px-2 sm:px-4 py-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold sm:text-4xl">Spardavel</h1>
          <p className="text-sm text-base-content/60 sm:text-base">Track your savings</p>
        </div>

        <div className="relative">
          <StackedChart />
          {/* Invisible transition anchors for card animations */}
          <div className="absolute inset-0 pointer-events-none" style={{ viewTransitionName: 'avoided-card' }} aria-hidden="true" />
          <div className="absolute inset-0 pointer-events-none" style={{ viewTransitionName: 'spent-card' }} aria-hidden="true" />
        </div>
        <QuickEntry />
        <RecentEntries />
      </div>
    </div>
  )
}
