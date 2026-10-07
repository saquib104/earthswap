/**
 * EarthSwap Logo — SVG mark combining a globe arc with a fluid swap arrow.
 * The globe represents "Earth", the flowing arrows represent "Swap".
 * Uses CSS variables so it adapts to both light and dark contexts.
 */
export function EarthSwapLogo({ size = 36 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="EarthSwap"
    >
      {/* Outer glow ring */}
      <defs>
        <radialGradient id="es-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#4af0c4" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#1a6b8a" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="es-globe" cx="40%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#2dd4bf" />
          <stop offset="55%" stopColor="#0e7490" />
          <stop offset="100%" stopColor="#083344" />
        </radialGradient>
        <linearGradient id="es-arrow" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#4af0c4" />
          <stop offset="100%" stopColor="#0ea5e9" />
        </linearGradient>
        <filter id="es-blur">
          <feGaussianBlur in="SourceGraphic" stdDeviation="1.5" result="blur" />
        </filter>
      </defs>

      {/* Ambient glow */}
      <circle cx="18" cy="18" r="18" fill="url(#es-glow)" />

      {/* Globe body */}
      <circle cx="18" cy="18" r="13" fill="url(#es-globe)" />

      {/* Globe latitude lines */}
      <ellipse cx="18" cy="18" rx="13" ry="5.5" stroke="rgba(255,255,255,0.18)" strokeWidth="0.8" fill="none" />
      <ellipse cx="18" cy="18" rx="13" ry="9" stroke="rgba(255,255,255,0.10)" strokeWidth="0.6" fill="none" />

      {/* Globe meridian */}
      <path
        d="M18 5 C22 10 22 26 18 31"
        stroke="rgba(255,255,255,0.18)"
        strokeWidth="0.8"
        fill="none"
      />
      <path
        d="M18 5 C14 10 14 26 18 31"
        stroke="rgba(255,255,255,0.12)"
        strokeWidth="0.6"
        fill="none"
      />

      {/* Horizontal equator */}
      <line x1="5" y1="18" x2="31" y2="18" stroke="rgba(255,255,255,0.14)" strokeWidth="0.7" />

      {/* Swap arrows — fluid curved arrows across the globe */}
      {/* Top-right arrow (clockwise) */}
      <path
        d="M24 12 C28 14 28 22 24 24"
        stroke="url(#es-arrow)"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M23 21 L24.5 24.5 L21 24"
        stroke="url(#es-arrow)"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />

      {/* Bottom-left arrow (counter-clockwise) */}
      <path
        d="M12 24 C8 22 8 14 12 12"
        stroke="url(#es-arrow)"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
        opacity="0.8"
      />
      <path
        d="M13 15 L11.5 11.5 L15 12"
        stroke="url(#es-arrow)"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        opacity="0.8"
      />

      {/* Highlight shimmer */}
      <ellipse
        cx="14"
        cy="13"
        rx="4"
        ry="2.5"
        fill="rgba(255,255,255,0.12)"
        transform="rotate(-25 14 13)"
      />
    </svg>
  )
}

/** Wordmark — "Earth" in display font, "Swap" in accent teal */
export function EarthSwapWordmark({ className = '' }: { className?: string }) {
  return (
    <span className={`display font-700 tracking-tight select-none ${className}`} style={{ letterSpacing: '-0.02em' }}>
      <span style={{ color: 'var(--ink)' }}>Earth</span>
      <span style={{ color: 'var(--logo-teal, #2dd4bf)' }}>Swap</span>
    </span>
  )
}
