import { useNavigate } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'

interface SwipeState {
  startX: number
  currentX: number
  isDragging: boolean
}

const SWIPE_THRESHOLD = 75
const SWIPE_VELOCITY_THRESHOLD = 0.5

const routes = ['/', '/history', '/analytics', '/settings'] as const

export function useSwipeNavigation(currentPath: string) {
  const navigate = useNavigate()
  const [swipeState, setSwipeState] = useState<SwipeState>({
    startX: 0,
    currentX: 0,
    isDragging: false,
  })
  const containerRef = useRef<HTMLDivElement>(null)
  const startTimeRef = useRef<number>(0)

  const currentIndex = routes.indexOf(currentPath as (typeof routes)[number])
  const hasNext = currentIndex >= 0 && currentIndex < routes.length - 1
  const hasPrev = currentIndex > 0

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0]
      if (!touch) return
      
      startTimeRef.current = Date.now()
      setSwipeState({
        startX: touch.clientX,
        currentX: touch.clientX,
        isDragging: true,
      })
    }

    const handleTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0]
      if (!touch || !swipeState.isDragging) return
      
      const currentX = touch.clientX
      const diff = currentX - swipeState.startX

      if ((diff > 0 && !hasPrev) || (diff < 0 && !hasNext)) {
        return
      }

      setSwipeState((prev) => ({
        ...prev,
        currentX,
      }))
    }

    const handleTouchEnd = (e: TouchEvent) => {
      const touch = e.changedTouches[0]
      if (!touch || !swipeState.isDragging) return

      const endX = touch.clientX
      const diff = endX - swipeState.startX
      const duration = Date.now() - startTimeRef.current
      const velocity = Math.abs(diff) / duration

      const shouldSwipe =
        Math.abs(diff) > SWIPE_THRESHOLD || velocity > SWIPE_VELOCITY_THRESHOLD

      if (shouldSwipe && currentIndex >= 0) {
        if (diff > 0 && hasPrev) {
          const prevRoute = routes[currentIndex - 1]
          if (prevRoute) {
            navigate({ to: prevRoute })
          }
        } else if (diff < 0 && hasNext) {
          const nextRoute = routes[currentIndex + 1]
          if (nextRoute) {
            navigate({ to: nextRoute })
          }
        }
      }

      setSwipeState({
        startX: 0,
        currentX: 0,
        isDragging: false,
      })
    }

    container.addEventListener('touchstart', handleTouchStart, { passive: true })
    container.addEventListener('touchmove', handleTouchMove, { passive: true })
    container.addEventListener('touchend', handleTouchEnd, { passive: true })

    return () => {
      container.removeEventListener('touchstart', handleTouchStart)
      container.removeEventListener('touchmove', handleTouchMove)
      container.removeEventListener('touchend', handleTouchEnd)
    }
  }, [swipeState.isDragging, currentIndex, hasNext, hasPrev, navigate])

  const offset = swipeState.isDragging
    ? swipeState.currentX - swipeState.startX
    : 0

  const shouldShowPrevIndicator = swipeState.isDragging && offset > 20 && hasPrev
  const shouldShowNextIndicator = swipeState.isDragging && offset < -20 && hasNext

  return {
    containerRef,
    offset,
    isDragging: swipeState.isDragging,
    shouldShowPrevIndicator,
    shouldShowNextIndicator,
  }
}
