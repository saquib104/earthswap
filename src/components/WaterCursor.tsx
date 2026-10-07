/**
 * WaterCursor — full-page water ripple effect.
 * Renders a hidden canvas overlay that tracks mouse movement and clicks.
 * Mouse move: spawns tiny droplet ripples along the trail.
 * Mouse click: spawns a larger splash burst.
 * Uses a damped sine-wave ring simulation — each ripple expands and fades.
 */
import { useEffect, useRef } from 'react'

interface Ripple {
  x: number
  y: number
  r: number       // current radius
  maxR: number    // max radius before fade out
  alpha: number
  speed: number
  color: string
  lineWidth: number
}

const TRAIL_COLORS = [
  'rgba(45,212,191,',   // teal
  'rgba(56,189,248,',   // sky
  'rgba(99,102,241,',   // indigo
]

export function WaterCursor() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const ripplesRef = useRef<Ripple[]>([])
  const mouseRef = useRef({ x: -999, y: -999 })
  const lastTrailRef = useRef({ x: -999, y: -999 })
  const rafRef = useRef<number>(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Size canvas to viewport
    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    // Spawn ripple helper
    const spawnRipple = (x: number, y: number, maxR: number, speed: number, lineWidth: number, isClick = false) => {
      const colorBase = isClick
        ? 'rgba(45,212,191,'
        : TRAIL_COLORS[Math.floor(Math.random() * TRAIL_COLORS.length)]
      ripplesRef.current.push({
        x, y, r: 0, maxR, alpha: isClick ? 0.65 : 0.35,
        speed, color: colorBase, lineWidth,
      })
    }

    // Mouse move — trail droplets
    const onMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY }
      const dx = e.clientX - lastTrailRef.current.x
      const dy = e.clientY - lastTrailRef.current.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist > 18) {
        spawnRipple(e.clientX, e.clientY, 28 + Math.random() * 14, 0.9 + Math.random() * 0.4, 1.2)
        lastTrailRef.current = { x: e.clientX, y: e.clientY }
      }
    }

    // Click — big splash (6 concentric rings)
    const onClick = (e: MouseEvent) => {
      for (let i = 0; i < 6; i++) {
        setTimeout(() => {
          spawnRipple(
            e.clientX + (Math.random() - 0.5) * 12,
            e.clientY + (Math.random() - 0.5) * 12,
            55 + i * 22,
            1.2 + i * 0.25,
            2 - i * 0.2,
            true,
          )
        }, i * 40)
      }
    }

    // Touch support
    const onTouchMove = (e: TouchEvent) => {
      const t = e.touches[0]
      const fake = { clientX: t.clientX, clientY: t.clientY } as MouseEvent
      onMouseMove(fake)
    }
    const onTouchStart = (e: TouchEvent) => {
      const t = e.touches[0]
      const fake = { clientX: t.clientX, clientY: t.clientY } as MouseEvent
      onClick(fake)
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('click', onClick)
    window.addEventListener('touchmove', onTouchMove, { passive: true })
    window.addEventListener('touchstart', onTouchStart, { passive: true })

    // Animation loop
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      const ripples = ripplesRef.current
      for (let i = ripples.length - 1; i >= 0; i--) {
        const rp = ripples[i]
        rp.r += rp.speed
        const progress = rp.r / rp.maxR
        rp.alpha = (1 - progress) * (rp.lineWidth > 1.5 ? 0.65 : 0.35)

        if (rp.alpha <= 0.01 || rp.r >= rp.maxR) {
          ripples.splice(i, 1)
          continue
        }

        ctx.beginPath()
        ctx.arc(rp.x, rp.y, rp.r, 0, Math.PI * 2)
        ctx.strokeStyle = rp.color + rp.alpha.toFixed(3) + ')'
        ctx.lineWidth = rp.lineWidth * (1 - progress * 0.6)
        ctx.stroke()
      }

      // Cap ripple count to keep perf high
      if (ripples.length > 160) ripples.splice(0, ripples.length - 160)

      rafRef.current = requestAnimationFrame(animate)
    }
    rafRef.current = requestAnimationFrame(animate)

    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('resize', resize)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('click', onClick)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('touchstart', onTouchStart)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-[5]"
      style={{ mixBlendMode: 'screen' }}
    />
  )
}
