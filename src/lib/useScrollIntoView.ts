import { useEffect, useRef } from 'react'

const SCROLL_DELAY_MS = 100 // Delay to allow animation to start before scrolling

/**
 * Hook to scroll an element into view when a condition becomes true.
 * Only scrolls once per visibility state to avoid scrolling on every state change.
 * 
 * @param isVisible - Condition that determines if the element should be scrolled into view
 * @returns A ref to attach to the element that should be scrolled
 */
export function useScrollIntoView(isVisible: boolean) {
  const elementRef = useRef<HTMLDivElement>(null)
  const hasScrolledRef = useRef(false)

  useEffect(() => {
    if (isVisible && elementRef.current && !hasScrolledRef.current) {
      hasScrolledRef.current = true
      // Use setTimeout to allow the animation to start before scrolling
      const timeoutId = setTimeout(() => {
        elementRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, SCROLL_DELAY_MS)
      return () => clearTimeout(timeoutId)
    } else if (!isVisible) {
      // Reset the flag when element becomes hidden
      hasScrolledRef.current = false
    }
  }, [isVisible])

  return elementRef
}

/**
 * Helper function to scroll an element into view with a delay.
 * Useful when working with refs stored in Maps or other data structures.
 * 
 * @param element - The element to scroll into view
 */
export function scrollElementIntoView(element: HTMLElement | null) {
  if (element) {
    // Use setTimeout to allow the animation to start before scrolling
    const timeoutId = setTimeout(() => {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, SCROLL_DELAY_MS)
    return () => clearTimeout(timeoutId)
  }
}
