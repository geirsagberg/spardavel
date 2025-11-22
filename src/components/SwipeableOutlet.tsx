import { Outlet, useRouterState } from '@tanstack/react-router'
import { useSwipeNavigation } from '~/lib/useSwipeNavigation'

export function SwipeableOutlet() {
  const router = useRouterState()
  const currentPath = router.location.pathname
  const {
    containerRef,
    offset,
    isDragging,
    shouldShowPrevIndicator,
    shouldShowNextIndicator,
  } = useSwipeNavigation(currentPath)

  return (
    <div className="relative overflow-hidden">
      <div
        ref={containerRef}
        className="transition-transform duration-100"
        style={{
          transform: isDragging ? `translateX(${offset * 0.3}px)` : 'translateX(0)',
          touchAction: 'pan-y',
        }}
      >
        <Outlet />
      </div>

      {shouldShowPrevIndicator && (
        <div className="fixed left-4 top-1/2 -translate-y-1/2 pointer-events-none z-50 sm:hidden">
          <div className="bg-base-300/90 rounded-full p-3 shadow-lg backdrop-blur-sm">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 text-primary"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </div>
        </div>
      )}

      {shouldShowNextIndicator && (
        <div className="fixed right-4 top-1/2 -translate-y-1/2 pointer-events-none z-50 sm:hidden">
          <div className="bg-base-300/90 rounded-full p-3 shadow-lg backdrop-blur-sm">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 text-primary"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M9 5l7 7-7 7"
              />
            </svg>
          </div>
        </div>
      )}
    </div>
  )
}
