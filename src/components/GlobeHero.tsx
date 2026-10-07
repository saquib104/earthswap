/**
 * GlobeHero — full-viewport revolving Earth.
 * - Globe spans edge-to-edge (no square crop)
 * - Large stylised arc-arch "A" emblem on the surface, rotating with the globe
 * - Bright multi-layer glowing circumference ring with traveling shimmer dot
 */
import { useEffect, useRef } from 'react'

const LAND_BLOBS: [number, number, number, number][] = [
  [-100, 45, 55, 40], [-80, 25, 30, 20],
  [-60, -15, 32, 50],
  [15, 50, 28, 20],
  [22, 5, 40, 55],
  [70, 40, 60, 45], [115, 25, 45, 40],
  [135, -25, 35, 28],
  [-42, 72, 22, 18],
  [0, -80, 120, 15],
]

const CITY_DOTS: [number, number][] = [
  [-74, 40.7], [-0.1, 51.5], [2.3, 48.9], [28, 41],
  [37, 55.7], [72, 19], [77, 28.6], [103, 1.3],
  [121, 31], [139, 35.7], [-43, -23], [-58, -34],
  [18, 59], [12.5, 55.7], [151, -33.9],
]

function degToRad(d: number) { return (d * Math.PI) / 180 }

function project(
  lon: number, lat: number, rotAngle: number,
  cx: number, cy: number, R: number,
): { x: number; y: number; z: number } | null {
  const phi = degToRad(lat)
  const lambda = degToRad(lon) + rotAngle
  const x3 = Math.cos(phi) * Math.cos(lambda)
  const y3 = Math.sin(phi)
  const z3 = Math.cos(phi) * Math.sin(lambda)
  if (z3 < 0) return null
  return { x: cx + R * x3, y: cy - R * y3, z: z3 }
}

/**
 * Draws a large stylised arc-arch emblem (an upward arch with two legs) —
 * the visual language of the Arc chain, rendered on the globe surface.
 */
function drawArcEmblem(
  ctx: CanvasRenderingContext2D,
  lx: number, ly: number,
  size: number,   // radius of the emblem
  alpha: number,
  shimmer: number,
) {
  if (alpha < 0.02) return
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.translate(lx, ly)

  const s = size

  // ── Outer glow halo ──────────────────────────────────────────────────────
  const haloG = ctx.createRadialGradient(0, 0, s * 0.3, 0, 0, s * 1.5)
  haloG.addColorStop(0, `rgba(45,212,191,${(0.35 + shimmer * 0.25).toFixed(3)})`)
  haloG.addColorStop(0.5, `rgba(56,189,248,${(0.12 + shimmer * 0.10).toFixed(3)})`)
  haloG.addColorStop(1, 'rgba(56,189,248,0)')
  ctx.beginPath()
  ctx.arc(0, 0, s * 1.5, 0, Math.PI * 2)
  ctx.fillStyle = haloG
  ctx.fill()

  // ── Dark disc base ────────────────────────────────────────────────────────
  ctx.beginPath()
  ctx.arc(0, 0, s * 0.88, 0, Math.PI * 2)
  ctx.fillStyle = `rgba(4,14,28,${(0.68).toFixed(3)})`
  ctx.fill()

  // ── Disc border ring ──────────────────────────────────────────────────────
  ctx.beginPath()
  ctx.arc(0, 0, s * 0.88, 0, Math.PI * 2)
  ctx.strokeStyle = `rgba(45,212,191,${(0.70 + shimmer * 0.30).toFixed(3)})`
  ctx.lineWidth = s * 0.055
  ctx.stroke()

  // ── Arc arch shape (stylised "A" arch — two legs + curved top) ────────────
  // Proportions: arch top sits at y=-0.55s, legs bottom at y=+0.52s
  // Crossbar at y=+0.05s, leg width = 0.10s, arch outer radius = 0.52s
  const legW   = s * 0.13
  const legBot = s * 0.52
  const archOR = s * 0.52   // outer arch radius
  const archIR = s * 0.33   // inner arch radius
  const barY   = s * 0.08   // crossbar vertical position
  const barH   = s * 0.11   // crossbar height

  // Build the arch path (counter-clockwise outer, clockwise inner hole)
  ctx.beginPath()

  // Left leg — outer left edge → up to arch start
  ctx.moveTo(-archOR, barY + barH)          // bottom-left of crossbar intersection
  ctx.lineTo(-archOR, legBot)               // left leg bottom-left
  ctx.lineTo(-archOR + legW, legBot)        // left leg bottom-right
  ctx.lineTo(-archOR + legW, barY + barH)   // back up to crossbar

  // Crossbar gap (the horizontal bar of the "A") — skip it, draw separately below
  ctx.lineTo(archOR - legW, barY + barH)    // right of crossbar
  ctx.lineTo(archOR - legW, legBot)         // right leg bottom-left
  ctx.lineTo(archOR, legBot)               // right leg bottom-right
  ctx.lineTo(archOR, barY + barH)

  // Right outer arch upward
  ctx.arc(0, barY + barH, archOR, 0, Math.PI, true)   // outer arch top (right→left)

  ctx.closePath()

  // Cut out inner arch
  ctx.moveTo(-archIR, barY + barH)
  ctx.arc(0, barY + barH, archIR, Math.PI, 0, false)   // inner arch (left→right)
  ctx.lineTo(archIR, barY + barH)
  ctx.closePath()

  // Gradient fill: white-hot top → teal mid → sky bottom
  const archGrad = ctx.createLinearGradient(0, -archOR, 0, legBot)
  archGrad.addColorStop(0, `rgba(255,255,255,${(0.98).toFixed(3)})`)
  archGrad.addColorStop(0.25, `rgba(180,255,240,${(0.95).toFixed(3)})`)
  archGrad.addColorStop(0.6, `rgba(45,212,191,${(0.88).toFixed(3)})`)
  archGrad.addColorStop(1, `rgba(20,150,170,${(0.75).toFixed(3)})`)
  ctx.fillStyle = archGrad
  ctx.fill('evenodd')

  // Shimmer highlight overlay
  if (shimmer > 0.25) {
    ctx.globalAlpha = alpha * shimmer * 0.55
    ctx.fillStyle = 'rgba(220,255,255,0.9)'
    ctx.fill('evenodd')
  }
  ctx.globalAlpha = alpha

  // ── Crossbar (the horizontal bar of the A, filled separately) ────────────
  ctx.beginPath()
  ctx.rect(-archOR + legW + s * 0.04, barY - barH * 0.4, (archOR - legW - s * 0.04) * 2, barH)
  ctx.fillStyle = archGrad
  ctx.fill()

  // ── "ARC" text label below the arch ──────────────────────────────────────
  ctx.globalAlpha = alpha * (0.80 + shimmer * 0.20)
  ctx.font = `600 ${(s * 0.24).toFixed(1)}px 'Space Grotesk', sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  const txtGrad = ctx.createLinearGradient(-s * 0.3, 0, s * 0.3, 0)
  txtGrad.addColorStop(0, 'rgba(45,212,191,0.9)')
  txtGrad.addColorStop(0.5, 'rgba(255,255,255,0.95)')
  txtGrad.addColorStop(1, 'rgba(56,189,248,0.9)')
  ctx.fillStyle = txtGrad
  ctx.fillText('ARC', 0, legBot * 0.62)

  ctx.restore()
}

export function GlobeHero({ width, height }: { width: number; height: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number>(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const W = canvas.width
    const H = canvas.height
    const cx = W / 2
    const cy = H / 2
    const R = Math.min(W, H) * 0.44   // larger radius so globe fills the space

    const LOGO_LON = 0
    const LOGO_LAT = 8

    const draw = (ts: number) => {
      const angle = (ts / 20000) * Math.PI * 2

      ctx.clearRect(0, 0, W, H)

      // ── 1. Atmosphere glow layers ────────────────────────────────────────
      for (let i = 3; i >= 0; i--) {
        const outer = R * (1.60 - i * 0.08)
        const inner = R * (0.92 + i * 0.04)
        const atmG = ctx.createRadialGradient(cx, cy, inner, cx, cy, outer)
        atmG.addColorStop(0, `rgba(45,212,191,${(0.24 - i * 0.04).toFixed(3)})`)
        atmG.addColorStop(0.5, `rgba(56,189,248,${(0.12 - i * 0.02).toFixed(3)})`)
        atmG.addColorStop(1, 'rgba(56,189,248,0)')
        ctx.beginPath()
        ctx.arc(cx, cy, outer, 0, Math.PI * 2)
        ctx.fillStyle = atmG
        ctx.fill()
      }

      // ── 2. Ocean base ────────────────────────────────────────────────────
      const oceanG = ctx.createRadialGradient(cx - R * 0.25, cy - R * 0.3, R * 0.05, cx, cy, R)
      oceanG.addColorStop(0, '#103f62')
      oceanG.addColorStop(0.35, '#062e4a')
      oceanG.addColorStop(0.75, '#041c32')
      oceanG.addColorStop(1, '#020e1d')
      ctx.beginPath()
      ctx.arc(cx, cy, R, 0, Math.PI * 2)
      ctx.fillStyle = oceanG
      ctx.fill()

      // ── 3. Graticule ─────────────────────────────────────────────────────
      ctx.save()
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.clip()
      for (let lon = -180; lon < 180; lon += 30) {
        ctx.beginPath()
        ctx.strokeStyle = lon % 90 === 0 ? 'rgba(45,212,191,0.15)' : 'rgba(45,212,191,0.06)'
        ctx.lineWidth = 0.5
        let first = true
        for (let lat = -90; lat <= 90; lat += 3) {
          const p = project(lon, lat, angle, cx, cy, R)
          if (!p) { first = true; continue }
          if (first) { ctx.moveTo(p.x, p.y); first = false } else ctx.lineTo(p.x, p.y)
        }
        ctx.stroke()
      }
      for (let lat = -60; lat <= 60; lat += 30) {
        ctx.beginPath()
        ctx.strokeStyle = lat === 0 ? 'rgba(45,212,191,0.18)' : 'rgba(45,212,191,0.07)'
        ctx.lineWidth = 0.5
        let first = true
        for (let lon2 = -180; lon2 <= 180; lon2 += 3) {
          const p = project(lon2, lat, angle, cx, cy, R)
          if (!p) { first = true; continue }
          if (first) { ctx.moveTo(p.x, p.y); first = false } else ctx.lineTo(p.x, p.y)
        }
        ctx.stroke()
      }
      ctx.restore()

      // ── 4. Land blobs ────────────────────────────────────────────────────
      ctx.save()
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.clip()
      for (const [bLon, bLat, bW, bH] of LAND_BLOBS) {
        const pts: { x: number; y: number }[] = []
        for (let i = 0; i < 28; i++) {
          const t = (i / 28) * Math.PI * 2
          const p = project(bLon + (bW / 2) * Math.cos(t), bLat + (bH / 2) * Math.sin(t), angle, cx, cy, R)
          if (p) pts.push(p)
        }
        if (pts.length < 3) continue
        const cp = project(bLon, bLat, angle, cx, cy, R)
        if (!cp) continue
        const a = 0.15 + cp.z * 0.40
        ctx.beginPath()
        ctx.moveTo(pts[0].x, pts[0].y)
        for (let i = 1; i < pts.length; i++) {
          const prev = pts[i - 1]; const curr = pts[i]
          ctx.quadraticCurveTo(prev.x, prev.y, (prev.x + curr.x) / 2, (prev.y + curr.y) / 2)
        }
        ctx.closePath()
        ctx.fillStyle = `rgba(34,197,94,${a.toFixed(3)})`
        ctx.fill()
        ctx.strokeStyle = `rgba(45,212,191,${(a * 0.55).toFixed(3)})`
        ctx.lineWidth = 0.8
        ctx.stroke()
      }
      ctx.restore()

      // ── 5. Arc emblem on globe surface ────────────────────────────────────
      const logoP = project(LOGO_LON, LOGO_LAT, angle, cx, cy, R)
      if (logoP) {
        const shimmer = (0.5 + 0.5 * Math.sin(ts / 1400)) * Math.pow(logoP.z, 0.8)
        const logoAlpha = Math.pow(logoP.z, 1.1) * 0.92
        // Size: large — R*0.46 at full face, shrinks with z for perspective
        drawArcEmblem(ctx, logoP.x, logoP.y, R * 0.68 * Math.pow(logoP.z, 0.7), logoAlpha, shimmer)
      }

      // ── 6. City-light dots ────────────────────────────────────────────────
      ctx.save()
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.clip()
      for (const [cLon, cLat] of CITY_DOTS) {
        const p = project(cLon, cLat, angle, cx, cy, R)
        if (!p) continue
        const pulse = 0.5 + 0.5 * Math.sin(ts / 900 + cLon * 0.1)
        const dotAlpha = Math.max(0, (0.6 - p.z) * 1.5) * pulse
        if (dotAlpha < 0.05) continue
        const dotR = 2.5 + pulse * 1.5
        const dg = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, dotR * 3)
        dg.addColorStop(0, `rgba(255,235,100,${dotAlpha.toFixed(3)})`)
        dg.addColorStop(0.4, `rgba(255,180,50,${(dotAlpha * 0.5).toFixed(3)})`)
        dg.addColorStop(1, 'rgba(255,180,50,0)')
        ctx.beginPath(); ctx.arc(p.x, p.y, dotR * 3, 0, Math.PI * 2)
        ctx.fillStyle = dg; ctx.fill()
        ctx.beginPath(); ctx.arc(p.x, p.y, dotR * 0.5, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255,245,150,${dotAlpha.toFixed(3)})`; ctx.fill()
      }
      ctx.restore()

      // ── 7. Night shadow crescent ──────────────────────────────────────────
      ctx.save()
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.clip()
      const shadowG = ctx.createRadialGradient(cx + R * 0.52, cy, 0, cx + R * 0.52, cy, R * 1.5)
      shadowG.addColorStop(0, 'rgba(2,8,20,0)')
      shadowG.addColorStop(0.3, 'rgba(2,8,20,0)')
      shadowG.addColorStop(0.62, 'rgba(2,8,20,0.60)')
      shadowG.addColorStop(1, 'rgba(2,8,20,0.88)')
      ctx.fillStyle = shadowG
      ctx.fillRect(cx - R, cy - R, R * 2, R * 2)
      ctx.restore()

      // ── 8. Specular highlight ─────────────────────────────────────────────
      ctx.save()
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.clip()
      const specG = ctx.createRadialGradient(cx - R * 0.32, cy - R * 0.32, 0, cx - R * 0.32, cy - R * 0.32, R * 0.75)
      specG.addColorStop(0, 'rgba(180,250,255,0.22)')
      specG.addColorStop(0.45, 'rgba(120,230,255,0.08)')
      specG.addColorStop(1, 'rgba(120,230,255,0)')
      ctx.fillStyle = specG
      ctx.fillRect(cx - R, cy - R, R * 2, R * 2)
      ctx.restore()

      // ── 9. Circumference glow ring ────────────────────────────────────────
      const shimAngle = (ts / 2800) % (Math.PI * 2)

      // Wide soft outer halos
      const haloWidths = [22, 14, 8, 4]
      const haloAlphas = [0.10, 0.22, 0.40, 0.62]
      for (let i = 0; i < 4; i++) {
        ctx.beginPath()
        ctx.arc(cx, cy, R + 2 + i * 0.5, 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(45,212,191,${haloAlphas[i].toFixed(3)})`
        ctx.lineWidth = haloWidths[i]
        ctx.stroke()
      }

      // Conic shimmer rim
      ctx.beginPath()
      ctx.arc(cx, cy, R + 1.5, 0, Math.PI * 2)
      const rimG = ctx.createConicGradient(shimAngle, cx, cy)
      rimG.addColorStop(0.00, 'rgba(255,255,255,1.0)')
      rimG.addColorStop(0.06, 'rgba(45,212,191,0.95)')
      rimG.addColorStop(0.30, 'rgba(45,212,191,0.70)')
      rimG.addColorStop(0.55, 'rgba(56,189,248,0.55)')
      rimG.addColorStop(0.80, 'rgba(45,212,191,0.72)')
      rimG.addColorStop(0.94, 'rgba(45,212,191,0.90)')
      rimG.addColorStop(1.00, 'rgba(255,255,255,1.0)')
      ctx.strokeStyle = rimG
      ctx.lineWidth = 3.5
      ctx.stroke()

      // Traveling hot-white shimmer dot
      const sdX = cx + Math.cos(shimAngle) * (R + 2)
      const sdY = cy + Math.sin(shimAngle) * (R + 2)
      const sdG = ctx.createRadialGradient(sdX, sdY, 0, sdX, sdY, R * 0.20)
      sdG.addColorStop(0, 'rgba(255,255,255,1.0)')
      sdG.addColorStop(0.25, 'rgba(180,255,240,0.70)')
      sdG.addColorStop(1, 'rgba(45,212,191,0)')
      ctx.beginPath()
      ctx.arc(sdX, sdY, R * 0.20, 0, Math.PI * 2)
      ctx.fillStyle = sdG
      ctx.fill()

      // ── 10. Orbit ring + satellite ────────────────────────────────────────
      ctx.save()
      ctx.beginPath()
      ctx.ellipse(cx, cy + R * 0.06, R * 1.24, R * 0.24, 0, Math.PI * 0.10, Math.PI * 0.90)
      ctx.strokeStyle = 'rgba(45,212,191,0.18)'
      ctx.lineWidth = 1
      ctx.stroke()
      const satA = (ts / 3600) % (Math.PI * 2)
      const satX = cx + Math.cos(satA) * R * 1.24
      const satY = cy + R * 0.06 + Math.sin(satA) * R * 0.24
      ctx.beginPath(); ctx.arc(satX, satY, 4, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(45,212,191,0.95)'; ctx.fill()
      ctx.beginPath()
      for (let i = 1; i <= 16; i++) {
        const ta = satA - i * 0.055
        const tx = cx + Math.cos(ta) * R * 1.24
        const ty = cy + R * 0.06 + Math.sin(ta) * R * 0.24
        if (i === 1) ctx.moveTo(tx, ty); else ctx.lineTo(tx, ty)
      }
      ctx.strokeStyle = 'rgba(45,212,191,0.30)'; ctx.lineWidth = 1.8; ctx.stroke()
      ctx.restore()

      rafRef.current = requestAnimationFrame(draw)
    }

    rafRef.current = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(rafRef.current)
  }, [])

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="pointer-events-none select-none block"
    />
  )
}
