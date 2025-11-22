import type { ReactNode } from 'react'
import { useEffect } from 'react'
import {
  createRootRoute,
  Outlet,
  Scripts,
  HeadContent,
} from '@tanstack/react-router'
import { DesktopHeader } from '~/components/DesktopHeader'
import { Navigation } from '~/components/Navigation'
import { NotFound } from '~/components/NotFound'
import { useAppStore } from '~/store/appStore'
import css from '~/styles/root.css?url'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'Spardavel',
      },
    ],
    links: [
      { rel: 'stylesheet', href: css },
      { rel: 'icon', href: '/icons/favicon.ico' },
      { rel: 'icon', type: 'image/svg+xml', href: '/icons/favicon.svg' },
      { rel: 'apple-touch-icon', href: '/icons/apple-touch-icon.png' },
    ],
  }),
  component: RootComponent,
  notFoundComponent: NotFound,
})

function RootComponent() {
  const theme = useAppStore((state) => state.theme)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  return (
    <RootDocument>
      <DesktopHeader />
      <Outlet />
      <Navigation />
    </RootDocument>
  )
}

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html suppressHydrationWarning>
      <head>
        <HeadContent />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var stored = localStorage.getItem('spardavel_events');
                  if (stored) {
                    var data = JSON.parse(stored);
                    if (data.state && data.state.theme) {
                      document.documentElement.setAttribute('data-theme', data.state.theme);
                    }
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  )
}
