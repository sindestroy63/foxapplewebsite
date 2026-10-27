import { useMemo, useRef } from 'react'
import type { TouchEvent } from 'react'

type SwipeActions = {
  left?: () => void
  right?: () => void
  down?: () => void
}

const SIDE_DISTANCE = 48
const DOWN_DISTANCE = 90
const DOMINANCE = 1.4

function isPinchZoomed(): boolean {
  return typeof window !== 'undefined' && Boolean(window.visualViewport && window.visualViewport.scale > 1.01)
}

export function useSwipe(actions: SwipeActions) {
  const origin = useRef<{ x: number; y: number } | null>(null)
  const latest = useRef(actions)
  latest.current = actions

  return useMemo(
    () => ({
      onTouchStart: (event: TouchEvent) => {
        origin.current = event.touches.length === 1 ? { x: event.touches[0].clientX, y: event.touches[0].clientY } : null
      },
      onTouchMove: (event: TouchEvent) => {
        if (event.touches.length > 1) origin.current = null
      },
      onTouchEnd: (event: TouchEvent) => {
        const start = origin.current
        origin.current = null
        if (!start || event.changedTouches.length !== 1 || isPinchZoomed()) return
        const dx = event.changedTouches[0].clientX - start.x
        const dy = event.changedTouches[0].clientY - start.y
        const { left, right, down } = latest.current
        if (Math.abs(dx) > SIDE_DISTANCE && Math.abs(dx) > Math.abs(dy) * DOMINANCE) {
          if (dx < 0) left?.()
          else right?.()
        } else if (down && dy > DOWN_DISTANCE && dy > Math.abs(dx) * DOMINANCE) {
          down()
        }
      },
      onTouchCancel: () => {
        origin.current = null
      },
    }),
    [],
  )
}
