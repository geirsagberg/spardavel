import { createFileRoute, redirect } from '@tanstack/react-router'
import { Onboarding } from '~/components/Onboarding'

export const Route = createFileRoute('/onboarding/$slide')({
  beforeLoad: ({ params }) => {
    const slide = parseInt(params.slide)
    if (isNaN(slide) || slide < 1 || slide > 4) {
      throw redirect({ to: '/onboarding/$slide', params: { slide: '1' } })
    }
  },
  component: OnboardingPage,
})

function OnboardingPage() {
  const { slide } = Route.useParams()
  return <Onboarding slideNumber={parseInt(slide)} />
}
