import { BookOpen, ExternalLink, CheckCircle2 } from 'lucide-react'
import { UNISWAP_ADDRESSES, ARC_TOKENS, RECOMMENDED_PAIRS } from '@/constants/tokens'
import { TokenIcon } from './TokenIcon'

const ARC_EXPLORER = 'https://explorer.arc.io'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <h3 className="display text-lg font-700 tracking-tight" style={{ color: 'var(--ink)' }}>
        {title}
      </h3>
      {children}
    </section>
  )
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      {children}
    </div>
  )
}

function CodeBlock({ code }: { code: string }) {
  return (
    <pre
      className="overflow-x-auto rounded-xl p-4 text-xs leading-relaxed"
      style={{ background: '#0a1628', color: '#acc6e9', fontFamily: 'JetBrains Mono, Menlo, monospace' }}
    >
      {code}
    </pre>
  )
}

export function DocsView() {
  return (
    <div className="space-y-10 max-w-2xl">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <BookOpen className="size-5" style={{ color: 'var(--accent)' }} />
          <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--accent)' }}>Documentation</span>
        </div>
        <h2 className="display text-3xl font-700 tracking-tight mb-2" style={{ color: 'var(--ink)' }}>
          EarthSwap Docs
        </h2>
        <p style={{ color: 'var(--subtle)' }}>
          EarthSwap is an Arc-native stablecoin FX and AMM application. This document covers the architecture, smart contracts, fee structure, and security model.
        </p>
      </div>

      {/* Overview */}
      <Section title="Overview">
        <Card>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--subtle)' }}>
            EarthSwap provides stablecoin-to-stablecoin FX execution and liquidity on Arc Mainnet. Users can swap between USDC, EURC, USYC, cirBTC, and WETH with transparent pricing, visible fees, and onchain settlement. All swaps are routed through Uniswap v3 liquidity pools deployed on Arc.
          </p>
          <div className="mt-4 space-y-2">
            {[
              'Non-custodial — users sign all transactions from their own wallet',
              'Transparent pricing — exchange rate, fees, and price impact shown before signing',
              'Onchain settlement — all activity is verifiable on Arc Explorer',
              'USDC-native — Arc uses USDC as its gas token, eliminating separate gas management',
            ].map(item => (
              <div key={item} className="flex items-start gap-2">
                <CheckCircle2 className="size-4 mt-0.5 shrink-0" style={{ color: '#22c55e' }} />
                <span className="text-sm" style={{ color: 'var(--muted)' }}>{item}</span>
              </div>
            ))}
          </div>
        </Card>
      </Section>

      {/* Architecture diagram */}
      <Section title="Architecture">
        <Card>
          <CodeBlock code={`
        USER (browser wallet)
               │
               ▼
        ┌─────────────────┐
        │   EarthSwap UI  │  ← React + wagmi
        │  (earthswap.    │
        │  netlify.app)   │
        └────────┬────────┘
                 │  ERC-20 approve + swap tx
                 ▼
        ┌─────────────────┐
        │  Uniswap v3     │  ← SwapRouter02
        │  SwapRouter02   │     0x53BF6B...
        └────────┬────────┘
                 │
          ┌──────┴──────┐
          ▼             ▼
       USDC pool    EURC pool    (+ USYC, cirBTC, WETH)
          │             │
          └──────┬──────┘
                 ▼
          Arc Mainnet
          (chain 5042)
          USDC-native gas
          ~1s finality
`} />
          <p className="text-xs mt-3" style={{ color: 'var(--subtle)' }}>
            Arc is not simply where EarthSwap is deployed — it is the settlement layer for the application's stablecoin liquidity and FX activity. USDC is both the trading asset and the gas token, eliminating the need to manage a separate native gas asset.
          </p>
        </Card>
      </Section>

      {/* Supported Assets */}
      <Section title="Supported Assets">
        <div className="space-y-2">
          {ARC_TOKENS.map(token => (
            <Card key={token.address}>
              <div className="flex items-center gap-3">
                <TokenIcon symbol={token.symbol} size={36} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-700 text-sm" style={{ color: 'var(--ink)' }}>{token.symbol}</span>
                    <span className="text-xs" style={{ color: 'var(--subtle)' }}>{token.name}</span>
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: 'var(--subtle)' }}>
                    {token.description}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-xs mono" style={{ color: 'var(--subtle)' }}>
                    {token.address.slice(0, 8)}…{token.address.slice(-6)}
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: 'var(--subtle)' }}>
                    {token.decimals} decimals
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </Section>

      {/* Swap Mechanism */}
      <Section title="Swap Mechanism">
        <Card>
          <div className="space-y-3 text-sm" style={{ color: 'var(--subtle)' }}>
            <p>EarthSwap routes every swap through Uniswap v3's <code className="mono text-xs px-1 py-0.5 rounded" style={{ background: 'var(--surface-muted)' }}>exactInputSingle</code> on Arc mainnet. The process:</p>
            <ol className="list-decimal ml-5 space-y-1.5">
              <li>User inputs an amount. EarthSwap queries QuoterV2 across all 4 fee tiers (0.01%, 0.05%, 0.30%, 1.00%) and selects the best output.</li>
              <li>The quote shows exchange rate, fee, price impact, and minimum received (after slippage).</li>
              <li>If this is the user's first swap of that token, they approve the SwapRouter02 contract for the input amount.</li>
              <li>The swap transaction is submitted. The router moves tokens from the user's wallet, executes against the pool, and delivers output tokens directly to the user's address.</li>
              <li>Settlement occurs in ~1 second on Arc. An onchain receipt with explorer link is shown.</li>
            </ol>
          </div>
        </Card>
      </Section>

      {/* Liquidity Pools */}
      <Section title="Liquidity Pools">
        <Card>
          <p className="text-sm mb-4" style={{ color: 'var(--subtle)' }}>
            EarthSwap uses Uniswap v3 concentrated liquidity pools. Liquidity providers earn fees on every swap through their range.
          </p>
          <div className="space-y-2">
            {RECOMMENDED_PAIRS.map(({ tokenA, tokenB, fee }) => (
              <div key={`${tokenA.symbol}-${tokenB.symbol}-${fee}`} className="flex items-center justify-between rounded-lg px-3 py-2" style={{ background: 'var(--surface-muted)' }}>
                <span className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
                  {tokenA.symbol} / {tokenB.symbol}
                </span>
                <span className="mono text-xs" style={{ color: 'var(--subtle)' }}>
                  {(fee / 10000).toFixed(2)}% fee
                </span>
              </div>
            ))}
          </div>
        </Card>
      </Section>

      {/* Fees */}
      <Section title="Fees">
        <Card>
          <div className="space-y-3">
            <div className="flex justify-between items-center rounded-lg px-3 py-2.5" style={{ background: 'var(--surface-muted)' }}>
              <span className="text-sm" style={{ color: 'var(--muted)' }}>LP fee (stablecoin pairs)</span>
              <span className="mono text-sm font-semibold" style={{ color: 'var(--ink)' }}>0.01% – 0.05%</span>
            </div>
            <div className="flex justify-between items-center rounded-lg px-3 py-2.5" style={{ background: 'var(--surface-muted)' }}>
              <span className="text-sm" style={{ color: 'var(--muted)' }}>LP fee (volatile pairs)</span>
              <span className="mono text-sm font-semibold" style={{ color: 'var(--ink)' }}>0.30% – 1.00%</span>
            </div>
            <div className="flex justify-between items-center rounded-lg px-3 py-2.5" style={{ background: 'var(--surface-muted)' }}>
              <span className="text-sm" style={{ color: 'var(--muted)' }}>Network gas (Arc)</span>
              <span className="mono text-sm font-semibold" style={{ color: 'var(--ink)' }}>~0.01 USDC</span>
            </div>
            <div className="flex justify-between items-center rounded-lg px-3 py-2.5" style={{ background: 'var(--surface-muted)' }}>
              <span className="text-sm" style={{ color: 'var(--muted)' }}>EarthSwap protocol fee</span>
              <span className="mono text-sm font-semibold" style={{ color: '#22c55e' }}>0% (current)</span>
            </div>
          </div>
          <p className="text-xs mt-3" style={{ color: 'var(--subtle)' }}>
            LP fees go to liquidity providers. EarthSwap currently charges no additional protocol fee. A fee router contract has been written and audited and may be deployed in a future update.
          </p>
        </Card>
      </Section>

      {/* Smart Contracts */}
      <Section title="Smart Contracts">
        <Card>
          <div className="space-y-2">
            <div className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--subtle)' }}>Uniswap v3 on Arc Mainnet</div>
            {Object.entries(UNISWAP_ADDRESSES).map(([name, addr]) => (
              <div key={name} className="flex items-center justify-between rounded-lg px-3 py-2.5" style={{ background: 'var(--surface-muted)' }}>
                <span className="text-xs font-medium capitalize" style={{ color: 'var(--muted)' }}>{name}</span>
                <a
                  href={`${ARC_EXPLORER}/address/${addr}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 transition-opacity hover:opacity-80"
                >
                  <span className="mono text-xs" style={{ color: 'var(--accent)' }}>
                    {addr.slice(0, 8)}…{addr.slice(-6)}
                  </span>
                  <ExternalLink className="size-3" style={{ color: 'var(--accent)' }} />
                </a>
              </div>
            ))}
          </div>
        </Card>
      </Section>

      {/* Security */}
      <Section title="Security">
        <Card>
          <div className="space-y-3">
            {[
              { label: 'Contract addresses', status: 'Verified on Arc Explorer', ok: true },
              { label: 'Network', status: 'Arc Mainnet (chain 5042)', ok: true },
              { label: 'Custody model', status: 'Non-custodial — user-controlled wallets', ok: true },
              { label: 'Protocol admin controls', status: 'No EarthSwap admin keys on Uniswap pools', ok: true },
              { label: 'Fee router audit', status: 'Written and audited (not yet deployed)', ok: true },
              { label: 'Independent audit', status: 'Not yet completed — use at your own risk', ok: false },
            ].map(({ label, status, ok }) => (
              <div key={label} className="flex items-start gap-3">
                <div className="size-4 mt-0.5 flex items-center justify-center shrink-0">
                  {ok ? (
                    <CheckCircle2 className="size-4" style={{ color: '#22c55e' }} />
                  ) : (
                    <div className="size-2 rounded-full ml-1" style={{ background: '#eab308' }} />
                  )}
                </div>
                <div>
                  <div className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>{label}</div>
                  <div className="text-xs" style={{ color: 'var(--subtle)' }}>{status}</div>
                </div>
              </div>
            ))}
          </div>
          <div
            className="mt-4 rounded-xl p-3 text-xs"
            style={{ background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.2)', color: '#ca8a04' }}
          >
            EarthSwap is an early-stage application. Smart contracts have not yet been independently audited. Users interact with contracts at their own risk. Transactions on Arc mainnet are irreversible.
          </div>
        </Card>
      </Section>

      {/* Arc Integration */}
      <Section title="Arc Integration">
        <Card>
          <div className="space-y-3 text-sm" style={{ color: 'var(--subtle)' }}>
            <p>EarthSwap uses Arc specifically because of properties that matter for a stablecoin FX application:</p>
            <div className="space-y-2 mt-2">
              {[
                { title: 'USDC-native gas', detail: 'Users pay transaction fees in USDC — the same token they are swapping. No ETH or other gas tokens required.' },
                { title: 'Sub-second finality', detail: 'Swaps settle in ~1 second. This is important for FX applications where rate validity windows are short.' },
                { title: 'Predictable fees', detail: 'Arc uses stable gas pricing, making the total cost of a swap predictable before signing.' },
                { title: 'Uniswap v3 deployed', detail: 'All four Uniswap v3 contracts (factory, SwapRouter02, QuoterV2, NFT Position Manager) are live on Arc mainnet.' },
              ].map(({ title, detail }) => (
                <div key={title} className="rounded-xl p-3" style={{ background: 'var(--surface-muted)' }}>
                  <div className="font-semibold text-sm mb-1" style={{ color: 'var(--ink)' }}>{title}</div>
                  <div className="text-xs">{detail}</div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </Section>

      {/* Links */}
      <Section title="Resources">
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Arc Explorer', url: 'https://explorer.arc.io', desc: 'View transactions' },
            { label: 'Arc Docs', url: 'https://docs.arc.io', desc: 'Chain documentation' },
            { label: 'Circle Developers', url: 'https://developers.circle.com', desc: 'USDC & EURC APIs' },
            { label: 'Uniswap Docs', url: 'https://docs.uniswap.org', desc: 'AMM documentation' },
          ].map(({ label, url, desc }) => (
            <a
              key={label}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between rounded-xl p-4 transition-all hover:scale-[1.02]"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            >
              <div>
                <div className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>{label}</div>
                <div className="text-xs mt-0.5" style={{ color: 'var(--subtle)' }}>{desc}</div>
              </div>
              <ExternalLink className="size-4 shrink-0" style={{ color: 'var(--subtle)' }} />
            </a>
          ))}
        </div>
      </Section>
    </div>
  )
}
