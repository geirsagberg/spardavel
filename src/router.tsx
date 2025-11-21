import { createRouter as createTanstackRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'

let router: ReturnType<typeof createTanstackRouter> | null = null

export function getRouter() {
  if (!router) {
    router = createTanstackRouter({
      routeTree,
    })
  }
  return router
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
