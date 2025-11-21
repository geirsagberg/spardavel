import { RootRoute } from '@tanstack/react-router'
import { Outlet } from '@tanstack/react-router'
import './root.css'

export const Route = new RootRoute({
  component: () => (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Spardavel</title>
      </head>
      <body>
        <Outlet />
      </body>
    </html>
  ),
})
