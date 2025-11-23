import { useDrag } from '@use-gesture/react'
import { useNavigate } from '@tanstack/react-router'
import { useState, useCallback } from 'react'

const SWIPE_THRESHOLD = 80
const VELOCITY_THRESHOLD = 0.5

const routes = ['/', '/history', '/analytics', '/settings'] as const

export function useSwipeNavigation(currentPath: string) {
  const navigate = useNavigate()
  const [dragState, setDragState] = useState({ offset: 0, isDragging: false })

  const currentIndex = routes.indexOf(currentPath as (typeof routes)[number])
  const hasNext = currentIndex >= 0 && currentIndex < routes.length - 1
  const hasPrev = currentIndex > 0

  const bind = useDrag(
    ({ movement: [mx], velocity: [vx], direction: [dx], active, cancel }) => {
      // Prevent drag if no valid direction
      if (active) {
        const isSwipingRight = mx > 0
        const isSwipingLeft = mx < 0

        if ((isSwipingRight && !hasPrev) || (isSwipingLeft && !hasNext)) {
          // Add resistance when swiping in invalid direction
          setDragState({ offset: mx * 0.2, isDragging: true })
          return
        }

        setDragState({ offset: mx, isDragging: true })
      } else {
        // Gesture ended
        const absOffset = Math.abs(mx)
        const absVelocity = Math.abs(vx)
        const shouldNavigate = absOffset > SWIPE_THRESHOLD || absVelocity > VELOCITY_THRESHOLD

        if (shouldNavigate && currentIndex >= 0) {
          if (mx > 0 && hasPrev) {
            const prevRoute = routes[currentIndex - 1]
            if (prevRoute) {
              navigate({ to: prevRoute })
            }
          } else if (mx < 0 && hasNext) {
            const nextRoute = routes[currentIndex + 1]
            if (nextRoute) {
              navigate({ to: nextRoute })
            }
          }
        }

        setDragState({ offset: 0, isDragging: false })
      }
    },
    {
      axis: 'x',
      filterTaps: true,
      pointer: { touch: true },
      threshold: 10,
    }
  )

  const shouldShowPrevIndicator = dragState.isDragging && dragState.offset > 30 && hasPrev
  const shouldShowNextIndicator = dragState.isDragging && dragState.offset < -30 && hasNext

  // Calculate indicator opacity based on drag progress
  const indicatorOpacity = Math.min(Math.abs(dragState.offset) / SWIPE_THRESHOLD, 1)

  return {
    bind,
    offset: dragState.offset,
    isDragging: dragState.isDragging,
    shouldShowPrevIndicator,
    shouldShowNextIndicator,
    indicatorOpacity,
  }
}
