import React, { useEffect, useRef, useState } from 'react'

type Position = { x: number; y: number }

type FloatingWindowProps = {
  id: string
  title: string
  children: React.ReactNode
  initialPosition?: Position
  width?: number | string
  onClose?: () => void
  footer?: React.ReactNode
  actions?: React.ReactNode
  className?: string
}

export const FloatingWindow: React.FC<FloatingWindowProps> = ({
  id,
  title,
  children,
  initialPosition = { x: 120, y: 120 },
  width,
  onClose,
  footer,
  actions,
  className
}) => {
  const [position, setPosition] = useState<Position>(initialPosition)
  const windowRef = useRef<HTMLDivElement>(null)
  const dragData = useRef<{ offsetX: number; offsetY: number } | null>(null)

  useEffect(() => {
    setPosition(initialPosition)
  }, [initialPosition.x, initialPosition.y])

  useEffect(() => {
    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
    }
  }, [])

  const handlePointerDown = (event: React.PointerEvent) => {
    const rect = windowRef.current?.getBoundingClientRect()
    if (!rect) return

    dragData.current = {
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
  }

  const handlePointerMove = (event: PointerEvent) => {
    if (!dragData.current) return

    event.preventDefault()

    const nextX = event.clientX - dragData.current.offsetX
    const nextY = event.clientY - dragData.current.offsetY

    const maxX = window.innerWidth - (windowRef.current?.offsetWidth ?? 0)
    const maxY = window.innerHeight - (windowRef.current?.offsetHeight ?? 0)

    setPosition({
      x: Math.max(16, Math.min(nextX, Math.max(16, maxX))),
      y: Math.max(16, Math.min(nextY, Math.max(16, maxY)))
    })
  }

  const handlePointerUp = () => {
    dragData.current = null
    window.removeEventListener('pointermove', handlePointerMove)
    window.removeEventListener('pointerup', handlePointerUp)
  }

  return (
    <div
      ref={windowRef}
      className={`floating-window ${className ?? ''}`.trim()}
      data-window-id={id}
      style={{
        width,
        transform: `translate3d(${position.x}px, ${position.y}px, 0)`
      }}
    >
      <div className="floating-window__header" onPointerDown={handlePointerDown}>
        <h3 className="floating-window__title">{title}</h3>
        <div
          className="floating-window__actions"
          onPointerDown={(event) => event.stopPropagation()}
        >
          {actions}
          {onClose && (
            <button
              className="floating-window__close"
              onClick={onClose}
              onPointerDown={(event) => event.stopPropagation()}
              aria-label={`Close ${title}`}
            >
              ×
            </button>
          )}
        </div>
      </div>
      <div className="floating-window__body">{children}</div>
      {footer && <div className="floating-window__footer">{footer}</div>}
    </div>
  )
}

export default FloatingWindow
