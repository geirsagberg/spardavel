import type { ReactNode } from 'react'
import { useEffect } from 'react'
import {
  createRootRoute,
  Scripts,
  HeadContent,
  useRouterState,
  useRouter,
} from '@tanstack/react-router'
import { DesktopHeader } from '~/components/DesktopHeader'
import { Navigation } from '~/components/Navigation'
import { NotFound } from '~/components/NotFound'
import { SwipeableOutlet } from '~/components/SwipeableOutlet'
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
      {
        name: 'description',
        content: 'Track your savings and avoid impulse purchases',
      },
      {
        name: 'theme-color',
        content: '#ffffff',
      },
      {
        name: 'apple-mobile-web-app-capable',
        content: 'yes',
      },
      {
        name: 'apple-mobile-web-app-status-bar-style',
        content: 'default',
      },
    ],
    links: [
      { rel: 'stylesheet', href: css },
      { rel: 'icon', href: '/icons/favicon.ico' },
      { rel: 'icon', type: 'image/svg+xml', href: '/icons/favicon.svg' },
      { rel: 'apple-touch-icon', href: '/icons/apple-touch-icon.png' },
      { rel: 'manifest', href: '/manifest.json' },
    ],
  }),
  component: RootComponent,
  notFoundComponent: NotFound,
})

function RootComponent() {
  const theme = useAppStore((state) => state.theme)
  const routerState = useRouterState()
  const router = useRouter()
  const isOnboarding = routerState.location.pathname.startsWith('/onboarding')

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  // Preload all routes asynchronously on mount
  useEffect(() => {
    const preloadRoutes = async () => {
      try {
        await Promise.all([
          router.preloadRoute({ to: '/' }),
          router.preloadRoute({ to: '/history' }),
          router.preloadRoute({ to: '/analytics' }),
          router.preloadRoute({ to: '/settings' }),
        ])
      } catch (err) {
        // Silently fail if preloading fails
        console.error('Failed to preload routes:', err)
      }
    }

    preloadRoutes()
  }, [router])

  return (
    <RootDocument>
      {!isOnboarding && <DesktopHeader />}
      <SwipeableOutlet />
      {!isOnboarding && <Navigation />}
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
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(
                    function(registration) {
                      console.log('ServiceWorker registration successful');
                    },
                    function(err) {
                      console.log('ServiceWorker registration failed: ', err);
                    }
                  );
                });
              }
            `,
          }}
        />
      </body>
    </html>
  )
}
