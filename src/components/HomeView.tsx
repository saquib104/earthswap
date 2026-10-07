import React, { useRef } from 'react'
import { ArrowRight, Zap, Shield, Globe, TrendingUp, CheckCircle2, ExternalLink } from 'lucide-react'
import { useReadContract } from 'wagmi'
import { formatUnits } from 'viem'
// eslint-disable-next-line no-unused-vars
import { ARC_TOKENS, ARC_CHAIN_ID, UNISWAP_ADDRESSES, RECOMMENDED_PAIRS, type Token } from '@/constants/tokens'
// eslint-disable-next-line no-unused-vars
import { GlobeHero } from './GlobeHero'
import { TokenIcon } from './TokenIcon'

type Tab = 'home' | 'trade' | 'bridge' | 'markets' | 'pools' | 'activity' | 'analytics' | 'docs'

// Pool v3 ABI (slot0 + liquidity)
const POOL_ABI = [
  { name: 'slot0', type: 'function', stateMutability: 'view', inputs: [], outputs: [
    { name: 'sqrtPriceX96', type: 'uint160' }, { name: 'tick', type: 'int24' },
    { name: 'observationIndex', type: 'uint16' }, { name: 'observationCardinality', type: 'uint16' },
    { name: 'observationCardinalityNext', type: 'uint16' }, { name: 'feeProtocol', type: 'uint8' },
    { name: 'unlocked', type: 'bool' },
  ]},
  { name: 'liquidity', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint128' }]},
] as const

const V3_FACTORY_ABI = [
  { name: 'getPool', type: 'function', stateMutability: 'view',
    inputs: [{ name: 'tokenA', type: 'address' }, { name: 'tokenB', type: 'address' }, { name: 'fee', type: 'uint24' }],
    outputs: [{ name: 'pool', type: 'address' }]
  },
] as const

function sqrtPriceX96ToPrice(sqrtPriceX96: bigint, decimals0: number, decimals1: number): number {
  const Q96 = 2 ** 96
  return ((Number(sqrtPriceX96) / Q96) ** 2) * (10 ** decimals0) / (10 ** decimals1)
}

// Primary market card: USDC/EURC
function LiveMarketStrip({ onTrade }: { onTrade: () => void }) {
  const usdc = ARC_TOKENS[0]
  const eurc = ARC_TOKENS[1]
  const fee = 100

  const { data: poolAddress } = useReadContract({
    address: UNISWAP_ADDRESSES.factory,
    abi: V3_FACTORY_ABI,
    functionName: 'getPool',
    args: [usdc.address as `0x${string}`, eurc.address as `0x${string}`, fee],
    chainId: ARC_CHAIN_ID,
  })

  const hasPool = poolAddress && poolAddress !== '0x0000000000000000000000000000000000000000'

  const { data: slot0 } = useReadContract({
    address: poolAddress as `0x${string}`,
    abi: POOL_ABI,
    functionName: 'slot0',
    chainId: ARC_CHAIN_ID,
    query: { enabled: !!hasPool, refetchInterval: 15000 },
  })

  const { data: liquidity } = useReadContract({
    address: poolAddress as `0x${string}`,
    abi: POOL_ABI,
    functionName: 'liquidity',
    chainId: ARC_CHAIN_ID,
    query: { enabled: !!hasPool, refetchInterval: 15000 },
  })

  let price: string | null = null
  if (slot0 && slot0[0] > 0n) {
    const rawPrice = sqrtPriceX96ToPrice(slot0[0], usdc.decimals, eurc.decimals)
    price = (1 / rawPrice).toFixed(4)
  }

  const liqFormatted = liquidity
    ? '$' + (Number(formatUnits(liquidity, 6)) / 1000).toFixed(1) + 'K'
    : '—'

  return (
    <div
      className="rounded-2xl p-6"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="flex items-center">
            <TokenIcon symbol="USDC" size={32} />
            <TokenIcon symbol="EURC" size={32} className="-ml-2" />
          </div>
          <div>
            <div className="font-700 text-base" style={{ color: 'var(--ink)', fontFamily: 'var(--font-display)' }}>USDC / EURC</div>
            <div className="text-xs" style={{ color: 'var(--subtle)' }}>Dollar / Euro</div>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="size-2 rounded-full animate-pulse" style={{ background: '#22c55e' }} />
          <span className="text-xs font-medium" style={{ color: '#22c55e' }}>Live</span>
        </div>
      </div>

      {/* Rate */}
      <div className="mb-4">
        {price ? (
          <div className="text-4xl font-700 tabular-nums" style={{ color: 'var(--ink)', fontFamily: 'var(--font-display)', letterSpacing: '-0.03em' }}>
            {price}
            <span className="text-lg font-400 ml-2" style={{ color: 'var(--subtle)' }}>EURC per USDC</span>
          </div>
        ) : (
          <div className="h-10 w-40 rounded-xl animate-pulse" style={{ background: 'var(--surface-muted)' }} />
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: 'Liquidity', value: liqFormatted },
          { label: 'Fee tier', value: '0.01%' },
          { label: 'Settlement', value: '~1s' },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-xl p-3" style={{ background: 'var(--surface-muted)' }}>
            <div className="text-xs mb-1" style={{ color: 'var(--subtle)' }}>{label}</div>
            <div className="text-sm font-700 tabular-nums" style={{ color: 'var(--ink)' }}>{value}</div>
          </div>
        ))}
      </div>

      <button
        onClick={onTrade}
        className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-700 transition-all hover:scale-[1.01] active:scale-[0.99]"
        style={{ background: 'var(--accent)', color: '#0d1b2f' }}
      >
        Trade USDC / EURC
        <ArrowRight className="size-4" />
      </button>
    </div>
  )
}

function WhyCard({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div
      className="rounded-2xl p-5 space-y-3"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
    >
      <div
        className="flex size-10 items-center justify-center rounded-xl"
        style={{ background: 'rgba(172,198,233,0.12)' }}
      >
        {icon}
      </div>
      <div className="font-700 text-base" style={{ color: 'var(--ink)', fontFamily: 'var(--font-display)' }}>
        {title}
      </div>
      <p className="text-sm leading-relaxed" style={{ color: 'var(--subtle)' }}>{body}</p>
    </div>
  )
}

function ArcBenefitRow({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl p-4" style={{ background: 'var(--surface-muted)' }}>
      <CheckCircle2 className="size-4 mt-0.5 shrink-0" style={{ color: 'var(--accent)' }} />
      <div>
        <div className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>{title}</div>
        <div className="text-xs mt-0.5" style={{ color: 'var(--subtle)' }}>{detail}</div>
      </div>
    </div>
  )
}

/** Full-width responsive globe canvas — measures its container and passes dims */
function GlobeCanvas() {
  const wrapRef = useRef<HTMLDivElement>(null)
  const [dims, setDims] = React.useState({ w: 900, h: 520 })

  React.useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      const w = entry.contentRect.width
      setDims({ w: Math.round(w), h: Math.round(Math.min(w * 0.62, 560)) })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return (
    <div
      ref={wrapRef}
      className="pointer-events-none absolute inset-0 w-full overflow-hidden"
      style={{ zIndex: 0 }}
    >
      <div style={{ opacity: 0.60, marginLeft: '50%', transform: 'translateX(-50%)', width: dims.w, height: dims.h }}>
        <GlobeHero width={dims.w} height={dims.h} />
      </div>
    </div>
  )
}

interface HomeViewProps {
  onNavigate: (tab: Tab) => void
}

export function HomeView({ onNavigate }: HomeViewProps) {
  return (
    <div>
      {/* ── HERO — true full-bleed banner ── */}
      <section
        className="relative w-full overflow-hidden text-center"
        style={{ minHeight: '540px' }}
      >
        {/* Full-width gradient banner behind everything */}
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(160deg, rgba(16,80,48,0.55) 0%, rgba(4,40,20,0.70) 40%, rgba(4,12,8,0.80) 100%)',
            zIndex: 0,
          }}
        />
        {/* Bottom fade — kills any atmosphere glow bleed into the page below */}
        <div
          className="absolute bottom-0 left-0 right-0"
          style={{
            height: '80px',
            background: 'linear-gradient(to bottom, rgba(4,15,10,0) 0%, rgba(4,15,10,1) 100%)',
            zIndex: 3,
            pointerEvents: 'none',
          }}
        />

        {/* Revolving Earth — fills the banner width */}
        <GlobeCanvas />

        {/* Hero text — centred, above globe */}
        <div
          className="relative flex flex-col items-center justify-center px-4"
          style={{ zIndex: 2, paddingTop: '72px', paddingBottom: '80px' }}
        >
          {/* Live badge */}
          <div
            className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 mb-6"
            style={{
              background: 'rgba(4,26,14,0.82)',
              border: '1px solid rgba(52,211,153,0.50)',
              backdropFilter: 'blur(12px)',
            }}
          >
            <div className="size-2 rounded-full animate-pulse" style={{ background: '#22c55e' }} />
            <span className="text-xs font-semibold tracking-wide" style={{ color: '#4ade80' }}>Live on Arc Mainnet</span>
          </div>

          {/* Headline */}
          <h1
            className="text-5xl sm:text-6xl font-800 tracking-tight mb-5 text-balance"
            style={{
              color: '#ffffff',
              letterSpacing: '-0.03em',
              fontFamily: 'var(--font-display)',
              textShadow: '0 0 60px rgba(52,211,153,0.35), 0 4px 32px rgba(0,0,0,0.90)',
              lineHeight: 1.08,
            }}
          >
            Stablecoin FX,<br />
            <span style={{
              background: 'linear-gradient(90deg,#2dd4bf 0%,#4ade80 50%,#2dd4bf 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>built on Arc.</span>
          </h1>

          {/* Subtitle — bright, solid, easily readable */}
          <p
            className="text-lg sm:text-xl font-500 mx-auto mb-8 text-pretty"
            style={{
              color: '#d1fae5',
              maxWidth: '52ch',
              lineHeight: 1.55,
              textShadow: '0 2px 16px rgba(0,0,0,0.95)',
              background: 'rgba(3,18,10,0.55)',
              backdropFilter: 'blur(10px)',
              borderRadius: '16px',
              padding: '12px 24px',
              border: '1px solid rgba(52,211,153,0.18)',
            }}
          >
            Swap and provide liquidity across stablecoins with&nbsp;
            <span style={{ color: '#6ee7b7', fontWeight: 600 }}>transparent pricing</span>
            &nbsp;and&nbsp;
            <span style={{ color: '#6ee7b7', fontWeight: 600 }}>onchain settlement.</span>
          </p>

          {/* CTAs */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => onNavigate('trade')}
              className="flex items-center gap-2 rounded-xl px-7 py-3.5 text-base font-700 transition-all hover:scale-[1.03] active:scale-[0.98]"
              style={{
                background: 'linear-gradient(135deg,#10b981 0%,#2dd4bf 100%)',
                color: '#040f0a',
                boxShadow: '0 0 32px rgba(16,185,129,0.55), 0 4px 20px rgba(0,0,0,0.40)',
              }}
            >
              Start Trading
              <ArrowRight className="size-4" />
            </button>
            <button
              onClick={() => onNavigate('markets')}
              className="flex items-center gap-2 rounded-xl px-7 py-3.5 text-base font-700 transition-all hover:scale-[1.03] active:scale-[0.98]"
              style={{
                background: 'rgba(4,26,14,0.70)',
                border: '1px solid rgba(52,211,153,0.35)',
                color: '#d1fae5',
                backdropFilter: 'blur(12px)',
              }}
            >
              View Markets
            </button>
          </div>
        </div>
      </section>

      {/* ── Rest of Home — contained width ── */}
      <div className="mx-auto max-w-4xl px-4 py-12 pb-24 lg:pb-12 space-y-12">

      {/* Live market */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="size-4" style={{ color: 'var(--accent)' }} />
          <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--subtle)' }}>Featured Market</span>
        </div>
        <LiveMarketStrip onTrade={() => onNavigate('trade')} />
      </section>

      {/* How it works */}
      <section>
        <h2 className="display text-xl font-700 tracking-tight mb-4" style={{ color: 'var(--ink)' }}>
          How it works
        </h2>
        <div className="flex items-center gap-0 overflow-x-auto pb-2">
          {['Connect wallet', 'Get a quote', 'Sign the swap', 'Settle on Arc'].map((step, i, arr) => (
            <div key={step} className="flex items-center">
              <div className="flex flex-col items-center gap-2 px-4 shrink-0">
                <div
                  className="flex size-8 items-center justify-center rounded-full text-xs font-700"
                  style={{ background: 'var(--accent)', color: '#0d1b2f' }}
                >
                  {i + 1}
                </div>
                <span className="text-xs font-semibold text-center" style={{ color: 'var(--ink)' }}>{step}</span>
              </div>
              {i < arr.length - 1 && (
                <ArrowRight className="size-4 shrink-0" style={{ color: 'var(--border)' }} />
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Why EarthSwap */}
      <section>
        <h2 className="display text-xl font-700 tracking-tight mb-4" style={{ color: 'var(--ink)' }}>
          Why EarthSwap?
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <WhyCard
            icon={<Shield className="size-5" style={{ color: 'var(--accent)' }} />}
            title="Transparent Execution"
            body="See your rate, fees, price impact, and settlement time before signing. No hidden costs."
          />
          <WhyCard
            icon={<Zap className="size-5" style={{ color: 'var(--accent)' }} />}
            title="Stablecoin Native"
            body="Built around USDC and EURC liquidity. Designed for predictable, stable-value swaps."
          />
          <WhyCard
            icon={<Globe className="size-5" style={{ color: 'var(--accent)' }} />}
            title="Arc Settlement"
            body="Swaps settle on Arc using its stablecoin-native infrastructure. ~1 second finality."
          />
        </div>
      </section>

      {/* Why Arc */}
      <section>
        <h2 className="display text-xl font-700 tracking-tight mb-4" style={{ color: 'var(--ink)' }}>
          Why Arc?
        </h2>
        <div
          className="rounded-2xl p-5 space-y-3"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <ArcBenefitRow
            title="USDC-native gas"
            detail="EarthSwap users pay transaction fees in USDC — the same asset they trade. No separate gas token management."
          />
          <ArcBenefitRow
            title="Fast settlement"
            detail="Swaps settle in ~1 second. Short enough that quote prices are still valid when the transaction confirms."
          />
          <ArcBenefitRow
            title="Stablecoin infrastructure"
            detail="EarthSwap builds directly on Circle's USDC and EURC, which are natively issued on Arc."
          />
          <ArcBenefitRow
            title="Onchain FX"
            detail="Arc is explicitly designed for stablecoin FX and financial applications — the right deployment target for an FX-first DEX."
          />
        </div>
      </section>

      {/* Supported tokens */}
      <section>
        <h2 className="display text-xl font-700 tracking-tight mb-4" style={{ color: 'var(--ink)' }}>
          Supported Assets
        </h2>
        <div className="flex flex-wrap gap-2">
          {ARC_TOKENS.map(token => (
            <div
              key={token.address}
              className="flex items-center gap-2 rounded-xl px-3 py-2"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            >
              <TokenIcon symbol={token.symbol} size={24} />
              <span className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>{token.symbol}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Ecosystem strip */}
      <section>
        <div className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: 'var(--subtle)' }}>
          Powered by the Circle ecosystem
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { name: 'Arc', detail: 'Settlement layer' },
            { name: 'USDC', detail: 'Stablecoin liquidity' },
            { name: 'EURC', detail: 'Euro liquidity' },
            { name: 'Uniswap v3', detail: 'AMM infrastructure' },
          ].map(({ name, detail }) => (
            <div
              key={name}
              className="rounded-xl p-4 text-center"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            >
              <div className="font-700 text-sm mb-1" style={{ color: 'var(--ink)' }}>{name}</div>
              <div className="text-xs" style={{ color: 'var(--subtle)' }}>{detail}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer
        className="rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        <div className="flex items-center gap-2">
          <Zap className="size-4" style={{ color: 'var(--accent)' }} />
          <span className="font-700 text-sm" style={{ color: 'var(--ink)' }}>EarthSwap</span>
          <span className="text-xs" style={{ color: 'var(--subtle)' }}>on Arc Mainnet</span>
        </div>
        <div className="flex flex-wrap gap-3">
          {[
            { label: 'Docs', tab: 'docs' as Tab },
            { label: 'Markets', tab: 'markets' as Tab },
            { label: 'Pools', tab: 'pools' as Tab },
          ].map(({ label, tab }) => (
            <button
              key={label}
              onClick={() => onNavigate(tab)}
              className="text-xs transition-opacity hover:opacity-80"
              style={{ color: 'var(--subtle)' }}
            >
              {label}
            </button>
          ))}
          <a
            href="https://explorer.arc.io"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs transition-opacity hover:opacity-80"
            style={{ color: 'var(--subtle)' }}
          >
            Arc Explorer
            <ExternalLink className="size-3" />
          </a>
        </div>
      </footer>
      </div>{/* end max-w container */}
    </div>
  )
}
