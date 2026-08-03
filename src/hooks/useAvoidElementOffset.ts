import { useEffect, useState } from 'react'

/** Default bottom offset matching the widget's normal `bottom-6` corner position. */
const DEFAULT_OFFSET_PX = 24
/** How close (from the bottom of the viewport) the avoided element has to be to trigger a reposition. */
const SAFE_ZONE_PX = 120
const GAP_PX = 16

/**
 * Keeps the widget from covering a host-page element (e.g. a marquee) that
 * sits in the same bottom-right corner on initial load. While the element
 * still intrudes into that corner, the widget floats just above it; once the
 * user scrolls it clear (or the selector doesn't match anything on the
 * page), the widget reports the standard corner offset.
 */
export function useAvoidElementOffset(selector?: string) {
  const [offset, setOffset] = useState(DEFAULT_OFFSET_PX)

  useEffect(() => {
    if (!selector) return

    function update() {
      const el = document.querySelector(selector as string)
      if (!el) {
        setOffset(DEFAULT_OFFSET_PX)
        return
      }
      const rect = el.getBoundingClientRect()
      const intrudesCorner = rect.bottom > 0 && rect.bottom > window.innerHeight - SAFE_ZONE_PX
      setOffset(intrudesCorner ? Math.max(DEFAULT_OFFSET_PX, window.innerHeight - rect.top + GAP_PX) : DEFAULT_OFFSET_PX)
    }

    update()
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [selector])

  return offset
}
