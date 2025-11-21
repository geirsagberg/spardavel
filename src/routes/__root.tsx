import { RootRoute } from '@tanstack/react-router'
import { Outlet } from '@tanstack/react-router'
import { DesktopHeader } from '~/components/DesktopHeader'
import { Navigation } from '~/components/Navigation'
import '../root.css'

export const Route = new RootRoute({
  component: () => (
    <>
      <DesktopHeader />
      <Outlet />
      <Navigation />
    </>
  ),
})
