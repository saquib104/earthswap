/**
 * TokenIcon — high-quality SVG coin icons for all Arc mainnet tokens.
 * Each icon faithfully reproduces the real coin's visual identity using
 * SVG shapes and gradients — no external image fetches, no broken images.
 *
 * Usage:  <TokenIcon symbol="USDC" size={32} />
 */

interface TokenIconProps {
  symbol: string
  size?: number
  className?: string
}

// ── Individual coin SVGs ────────────────────────────────────────────────────

function USDCIcon({ s }: { s: number }) {
  return (
    <svg width={s} height={s} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="16" cy="16" r="16" fill="#2775CA"/>
      <circle cx="16" cy="16" r="13" fill="#2775CA"/>
      {/* USDC dollar mark */}
      <path d="M16 6C10.48 6 6 10.48 6 16C6 21.52 10.48 26 16 26C21.52 26 26 21.52 26 16C26 10.48 21.52 6 16 6Z" fill="#2775CA"/>
      <path d="M18.5 14.62C18.5 13.28 17.5 12.75 15.5 12.5C14.12 12.32 13.85 11.95 13.85 11.37C13.85 10.79 14.28 10.42 15.13 10.42C15.9 10.42 16.33 10.68 16.55 11.3C16.6 11.45 16.73 11.55 16.88 11.55H17.7C17.9 11.55 18.05 11.38 18.02 11.18C17.78 9.93 16.85 9.05 15.5 8.9V8C15.5 7.72 15.28 7.5 15 7.5H14.5C14.22 7.5 14 7.72 14 8V8.88C12.62 9.07 11.7 10 11.7 11.25C11.7 12.53 12.62 13.12 14.62 13.38C15.88 13.58 16.35 13.88 16.35 14.55C16.35 15.22 15.83 15.65 14.93 15.65C13.72 15.65 13.27 15.15 13.1 14.5C13.05 14.33 12.92 14.22 12.75 14.22H11.9C11.7 14.22 11.55 14.4 11.58 14.6C11.85 16 12.8 16.87 14 17.08V18C14 18.28 14.22 18.5 14.5 18.5H15C15.28 18.5 15.5 18.28 15.5 18V17.1C16.9 16.88 18.5 16.1 18.5 14.62Z" fill="white"/>
      {/* Outer ring lines */}
      <path d="M13.25 19.5C9.62 18.35 7.62 14.42 8.77 10.8C9.42 8.82 10.92 7.27 12.9 6.62C13.25 6.5 13.43 6.2 13.43 5.88V5.4C13.43 5.05 13.13 4.8 12.78 4.9C8.25 6.23 5.65 11 7 15.5C7.77 18.07 9.65 20.1 12.22 21.02C12.57 21.15 12.9 20.9 12.9 20.52V20.05C12.9 19.8 12.7 19.6 13.25 19.5Z" fill="white" opacity="0.7"/>
      <path d="M19.22 4.9C18.87 4.77 18.57 5.03 18.57 5.4V5.88C18.57 6.17 18.77 6.42 19.1 6.62C22.73 7.77 24.73 11.7 23.58 15.32C22.93 17.3 21.43 18.85 19.45 19.5C19.1 19.62 18.92 19.92 18.92 20.25V20.72C18.92 21.07 19.22 21.32 19.57 21.22C24.1 19.88 26.7 15.12 25.35 10.62C24.58 8.02 22.68 5.98 19.22 4.9Z" fill="white" opacity="0.7"/>
    </svg>
  )
}

function EURCIcon({ s }: { s: number }) {
  return (
    <svg width={s} height={s} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="16" cy="16" r="16" fill="#0057A8"/>
      {/* EU stars ring — 12 stars */}
      {Array.from({ length: 12 }).map((_, i) => {
        const angle = (i * 30 - 90) * (Math.PI / 180)
        const rx = 10.5 * Math.cos(angle) + 16
        const ry = 10.5 * Math.sin(angle) + 16
        return (
          <polygon
            key={i}
            points="0,-1.5 0.45,-0.6 1.4,-0.5 0.7,0.2 0.9,1.2 0,-0.35 -0.9,1.2 -0.7,0.2 -1.4,-0.5 -0.45,-0.6"
            transform={`translate(${rx},${ry})`}
            fill="#FFD700"
          />
        )
      })}
      {/* Euro € symbol */}
      <text x="16" y="21" textAnchor="middle" fontSize="12" fontWeight="700" fontFamily="Arial" fill="white">€</text>
    </svg>
  )
}

function USYCIcon({ s }: { s: number }) {
  return (
    <svg width={s} height={s} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="usyc-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#16a34a"/>
          <stop offset="100%" stopColor="#064e3b"/>
        </linearGradient>
      </defs>
      <circle cx="16" cy="16" r="16" fill="url(#usyc-grad)"/>
      {/* Yield/yield Y shape */}
      <text x="16" y="21" textAnchor="middle" fontSize="13" fontWeight="800" fontFamily="Arial" fill="white">Y</text>
      {/* Small % badge bottom right */}
      <circle cx="23" cy="22" r="5" fill="#10b981"/>
      <text x="23" y="25.5" textAnchor="middle" fontSize="6" fontWeight="700" fontFamily="Arial" fill="white">%</text>
    </svg>
  )
}

function CirBTCIcon({ s }: { s: number }) {
  return (
    <svg width={s} height={s} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="btc-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#F7931A"/>
          <stop offset="100%" stopColor="#E8720C"/>
        </linearGradient>
      </defs>
      <circle cx="16" cy="16" r="16" fill="url(#btc-grad)"/>
      {/* Bitcoin ₿ */}
      <path d="M20.5 14.2C20.7 13.0 19.8 12.3 18.6 11.8L19 10.1L18 9.9L17.6 11.5C17.35 11.45 17.1 11.39 16.84 11.33L17.25 9.7L16.25 9.5L15.85 11.2C15.64 11.15 15.44 11.1 15.25 11.05V11.03L13.88 10.72L13.65 11.78C13.65 11.78 14.4 11.95 14.38 11.96C14.79 12.06 14.86 12.33 14.85 12.54L14.38 14.44C14.4 14.45 14.44 14.46 14.48 14.48L14.38 14.44L13.73 17.1C13.68 17.25 13.52 17.46 13.2 17.39C13.22 17.41 12.47 17.22 12.47 17.22L12 18.35L13.3 18.65C13.53 18.7 13.75 18.76 13.97 18.82L13.53 20.52L14.53 20.72L14.93 19.03C15.19 19.1 15.44 19.16 15.68 19.22L15.28 20.9L16.28 21.1L16.72 19.41C18.48 19.74 19.8 19.6 20.35 18.02C20.8 16.76 20.32 16.03 19.38 15.56C20.04 15.4 20.55 14.98 20.5 14.2ZM18.4 17.38C18.08 18.64 15.97 17.97 15.27 17.8L15.84 15.55C16.54 15.72 18.73 16.07 18.4 17.38ZM18.72 14.19C18.43 15.34 16.68 14.77 16.09 14.63L16.61 12.6C17.2 12.74 19.02 12.99 18.72 14.19Z" fill="white"/>
    </svg>
  )
}

function WETHIcon({ s }: { s: number }) {
  return (
    <svg width={s} height={s} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="eth-grad" x1="0.5" y1="0" x2="0.5" y2="1">
          <stop offset="0%" stopColor="#9da8ec"/>
          <stop offset="100%" stopColor="#627EEA"/>
        </linearGradient>
      </defs>
      <circle cx="16" cy="16" r="16" fill="url(#eth-grad)"/>
      {/* ETH diamond shape */}
      <path d="M16 6L10 16L16 19.5L22 16L16 6Z" fill="white" opacity="0.9"/>
      <path d="M16 6L10 16L16 19.5V6Z" fill="white" opacity="0.6"/>
      <path d="M16 21L10 17L16 26L22 17L16 21Z" fill="white" opacity="0.9"/>
      <path d="M16 21L10 17L16 26V21Z" fill="white" opacity="0.6"/>
      <path d="M10 16L16 13.5L22 16L16 19.5L10 16Z" fill="white" opacity="0.4"/>
    </svg>
  )
}

function GenericTokenIcon({ symbol, color, s }: { symbol: string; color: string; s: number }) {
  return (
    <svg width={s} height={s} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={`gen-${symbol}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="1"/>
          <stop offset="100%" stopColor={color} stopOpacity="0.7"/>
        </linearGradient>
      </defs>
      <circle cx="16" cy="16" r="16" fill={`url(#gen-${symbol})`}/>
      {/* Shine */}
      <ellipse cx="12" cy="11" rx="5" ry="3" fill="white" opacity="0.18"/>
      <text
        x="16" y="21"
        textAnchor="middle"
        fontSize={symbol.length > 3 ? "8" : "10"}
        fontWeight="700"
        fontFamily="'Space Grotesk', Arial, sans-serif"
        fill="white"
      >
        {symbol.slice(0, 4)}
      </text>
    </svg>
  )
}

// ── Main export ─────────────────────────────────────────────────────────────

const ICON_MAP: Record<string, (s: number) => React.ReactElement> = {
  USDC:   (s) => <USDCIcon s={s} />,
  EURC:   (s) => <EURCIcon s={s} />,
  USYC:   (s) => <USYCIcon s={s} />,
  CIRBTC: (s) => <CirBTCIcon s={s} />,
  WETH:   (s) => <WETHIcon s={s} />,
  ETH:    (s) => <WETHIcon s={s} />,
}

export function TokenIcon({ symbol, size = 32, className }: TokenIconProps) {
  const key = symbol.toUpperCase().replace('CIR', 'CIR')
  const iconFn = ICON_MAP[symbol.toUpperCase()] ?? ICON_MAP[key]

  if (iconFn) {
    return (
      <span className={className} style={{ display: 'inline-flex', borderRadius: '50%', overflow: 'hidden', width: size, height: size, flexShrink: 0 }}>
        {iconFn(size)}
      </span>
    )
  }

  // Fallback: colored circle with initials
  return (
    <span className={className} style={{ display: 'inline-flex', borderRadius: '50%', overflow: 'hidden', width: size, height: size, flexShrink: 0 }}>
      <GenericTokenIcon symbol={symbol} color="#4a8c72" s={size} />
    </span>
  )
}
