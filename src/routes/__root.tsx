import { createRootRoute, Outlet } from '@tanstack/react-router'
import { DesktopHeader } from '~/components/DesktopHeader'
import { Navigation } from '~/components/Navigation'
import '../root.css'

export const Route = createRootRoute({
  component: () => (
    <>
      <DesktopHeader />
      <Outlet />
      <Navigation />
    </>
  ),
})
