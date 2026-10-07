import { useEffect, useRef } from 'react'

/**
 * FluidBackground — full-page canvas that renders a smooth cursor-reactive
 * fluid / water-like effect using WebGL-style canvas 2D blobs.
 *
 * Algorithm:
 * - 6 large radial gradients (orbs) float around slowly with sine/cosine motion
 * - Mouse position gently warps the nearest orb toward the cursor
 * - Orbs are composited with "screen" blending for a luminous glow
 * - A static deep-navy base ensures text remains readable
 */
export function FluidBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const mouse = useRef({ x: -1000, y: -1000 })
  const rafRef = useRef<number>(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Palette: living forest — emerald, jade, lime, teal, hunter green
    const ORBS = [
      { x: 0.15, y: 0.20, r: 0.48, color: [16, 120,  68],  speed: 0.00025, phase: 0.0 },  // forest emerald
      { x: 0.78, y: 0.15, r: 0.42, color: [6,  100,  48],  speed: 0.00018, phase: 1.2 },  // hunter green
      { x: 0.82, y: 0.68, r: 0.44, color: [45, 212, 191],  speed: 0.00022, phase: 2.4 },  // bright teal
      { x: 0.22, y: 0.78, r: 0.40, color: [4,   78,  44],  speed: 0.00020, phase: 3.6 },  // deep jade
      { x: 0.50, y: 0.42, r: 0.32, color: [74, 222, 128],  speed: 0.00030, phase: 4.8 },  // fresh lime-green
      { x: 0.62, y: 0.88, r: 0.36, color: [16, 185, 129],  speed: 0.00015, phase: 0.8 },  // emerald-mint
    ]

    // Working positions (pixels)
    const pos = ORBS.map(_o => ({ x: 0, y: 0 }))

    let W = 0, H = 0

    function resize() {
      W = window.innerWidth
      H = window.innerHeight
      canvas!.width  = W
      canvas!.height = H
    }
    resize()
    window.addEventListener('resize', resize)

    function onMouseMove(e: MouseEvent) {
      mouse.current = { x: e.clientX, y: e.clientY }
    }
    function onTouchMove(e: TouchEvent) {
      if (e.touches[0]) {
        mouse.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
      }
    }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('touchmove', onTouchMove, { passive: true })

    function draw(t: number) {
      if (!ctx || !canvas) return
      ctx.clearRect(0, 0, W, H)

      // Deep forest-night base
      ctx.fillStyle = '#040f0a'
      ctx.fillRect(0, 0, W, H)

      // Draw orbs with screen blending
      ctx.globalCompositeOperation = 'screen'

      ORBS.forEach((orb, i) => {
        // Floating motion
        const bx = (orb.x + 0.12 * Math.sin(t * orb.speed + orb.phase)) * W
        const by = (orb.y + 0.10 * Math.cos(t * orb.speed * 1.3 + orb.phase)) * H

        // Mouse attraction — gently pull orb 4-5 toward cursor
        let mx = bx, my = by
        if (i >= 3) {
          const dx = mouse.current.x - bx
          const dy = mouse.current.y - by
          const dist = Math.sqrt(dx * dx + dy * dy)
          const maxDist = 0.6 * Math.max(W, H)
          if (dist < maxDist) {
            const pull = (1 - dist / maxDist) * 0.18
            mx = bx + dx * pull
            my = by + dy * pull
          }
        }

        pos[i].x = mx
        pos[i].y = my

        const r = orb.r * Math.max(W, H)
        const [cr, cg, cb] = orb.color

        const grad = ctx.createRadialGradient(mx, my, 0, mx, my, r)
        grad.addColorStop(0,   `rgba(${cr},${cg},${cb},0.55)`)
        grad.addColorStop(0.4, `rgba(${cr},${cg},${cb},0.25)`)
        grad.addColorStop(0.7, `rgba(${cr},${cg},${cb},0.08)`)
        grad.addColorStop(1,   `rgba(${cr},${cg},${cb},0)`)

        ctx.beginPath()
        ctx.arc(mx, my, r, 0, Math.PI * 2)
        ctx.fillStyle = grad
        ctx.fill()
      })

      // Subtle horizontal scan line shimmer at cursor y
      if (mouse.current.y > 0) {
        ctx.globalCompositeOperation = 'screen'
        const scanGrad = ctx.createLinearGradient(0, mouse.current.y - 60, 0, mouse.current.y + 60)
        scanGrad.addColorStop(0,   'rgba(74,222,128,0)')
        scanGrad.addColorStop(0.5, 'rgba(74,222,128,0.05)')
        scanGrad.addColorStop(1,   'rgba(74,222,128,0)')
        ctx.fillStyle = scanGrad
        ctx.fillRect(0, mouse.current.y - 60, W, 120)
      }

      // Cursor ripple — small bright spot at mouse position
      if (mouse.current.x > 0) {
        ctx.globalCompositeOperation = 'screen'
        const ripple = ctx.createRadialGradient(
          mouse.current.x, mouse.current.y, 0,
          mouse.current.x, mouse.current.y, 130,
        )
        ripple.addColorStop(0,   'rgba(74,222,128,0.22)')
        ripple.addColorStop(0.4, 'rgba(45,212,191,0.10)')
        ripple.addColorStop(1,   'rgba(16,185,129,0)')
        ctx.beginPath()
        ctx.arc(mouse.current.x, mouse.current.y, 120, 0, Math.PI * 2)
        ctx.fillStyle = ripple
        ctx.fill()
      }

      // Fine noise vignette (multiply dark edges)
      ctx.globalCompositeOperation = 'multiply'
      const vignette = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) * 0.75)
      vignette.addColorStop(0, 'rgba(255,255,255,1)')
      vignette.addColorStop(1, 'rgba(2,12,6,0.88)')
      ctx.fillStyle = vignette
      ctx.fillRect(0, 0, W, H)

      ctx.globalCompositeOperation = 'source-over'

      rafRef.current = requestAnimationFrame(draw)
    }

    rafRef.current = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('resize', resize)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('touchmove', onTouchMove)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 -z-10 pointer-events-none"
      style={{ display: 'block' }}
      aria-hidden="true"
    />
  )
}
