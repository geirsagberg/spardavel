import { Router, RootRoute, createRouter as createTanstackRouter } from '@tanstack/react-router'
import { Route as rootRoute } from './root'
import { Route as indexRoute } from './routes/index'

const routeTree = rootRoute.addChildren([
  indexRoute,
])

export function createRouter() {
  return createTanstackRouter({
    routeTree,
  })
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof createRouter>
  }
}
