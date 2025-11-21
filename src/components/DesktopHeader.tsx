import { Link, useRouterState } from '@tanstack/react-router'

export function DesktopHeader() {
  const router = useRouterState()
  const currentPath = router.location.pathname

  const isActive = (path: string) => currentPath === path

  const navLinkClass = (path: string) =>
    `px-4 py-2 rounded-lg transition-colors ${
      isActive(path)
        ? 'bg-primary/10 text-primary font-medium'
        : 'text-base-content/70 hover:text-base-content hover:bg-base-200'
    }`

  return (
    <header className="hidden sm:block sticky top-0 z-50 bg-base-100 border-b border-base-300">
      <div className="container mx-auto max-w-6xl px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="text-xl font-bold text-base-content">
            Spardavel
          </Link>

          <nav className="flex items-center gap-1">
            <Link to="/" className={navLinkClass('/')}>
              Home
            </Link>
            <Link to="/history" className={navLinkClass('/history')}>
              History
            </Link>
            <Link to="/analytics" className={navLinkClass('/analytics')}>
              Analytics
            </Link>
            <Link to="/settings" className={navLinkClass('/settings')}>
              Settings
            </Link>
          </nav>
        </div>
      </div>
    </header>
  )
}
