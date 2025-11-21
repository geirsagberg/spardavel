import { RootRoute } from '@tanstack/react-router'
import { Outlet } from '@tanstack/react-router'
import { Navigation } from '~/components/Navigation'
import '../root.css'

export const Route = new RootRoute({
  component: () => (
    <>
      <Outlet />
      <Navigation />
    </>
  ),
})
