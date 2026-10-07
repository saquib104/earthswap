import { useState, useCallback } from 'react'
import { useAccount, useSwitchChain } from 'wagmi'
import { AppKit, BridgeChain } from '@circle-fin/app-kit'
import { createViemAdapterFromProvider } from '@circle-fin/adapter-viem-v2'
import type { EIP1193Provider } from 'viem'
import { ArrowDownUp, ExternalLink, CheckCircle2, AlertTriangle, Loader2, Info } from 'lucide-react'
import { TokenIcon } from './TokenIcon'

// AppKit singleton — bridge needs no kit key
const appKit = new AppKit()

interface ChainOption {
  id: BridgeChain   // Circle SDK BridgeChain enum value
  chainId: number   // numeric EVM chain ID (for wallet switching)
  label: string
  explorer: string
  color: string
}

const BRIDGE_CHAINS: ChainOption[] = [
  { id: BridgeChain.Arc,       chainId: 5042,  label: 'Arc Mainnet',  explorer: 'https://explorer.arc.io',           color: '#2dd4bf' },
  { id: BridgeChain.Ethereum,  chainId: 1,     label: 'Ethereum',     explorer: 'https://etherscan.io',              color: '#627eea' },
  { id: BridgeChain.Base,      chainId: 8453,  label: 'Base',         explorer: 'https://basescan.org',              color: '#0052ff' },
  { id: BridgeChain.Arbitrum,  chainId: 42161, label: 'Arbitrum One', explorer: 'https://arbiscan.io',               color: '#12aaff' },
  { id: BridgeChain.Polygon,   chainId: 137,   label: 'Polygon',      explorer: 'https://polygonscan.com',           color: '#8247e5' },
  { id: BridgeChain.Optimism,  chainId: 10,    label: 'OP Mainnet',   explorer: 'https://optimistic.etherscan.io',   color: '#ff0420' },
  { id: BridgeChain.Avalanche, chainId: 43114, label: 'Avalanche',    explorer: 'https://snowtrace.io',              color: '#e84142' },
]

type StepState = 'pending' | 'running' | 'success' | 'failed'

interface StepStatus {
  name: string
  label: string
  state: StepState
  txHash?: string
  explorerUrl?: string
}

const STEP_LABELS: Record<string, string> = {
  approve:          'Approve USDC',
  burn:             'Burn on source',
  fetchAttestation: 'Circle attestation',
  mint:             'Mint on destination',
}

function ChainSelector({
  value, onChange, exclude, label,
}: {
  value: ChainOption
  onChange: (c: ChainOption) => void
  exclude: string
  label: string
}) {
  const [open, setOpen] = useState(false)
  const available = BRIDGE_CHAINS.filter(c => c.id !== (exclude as BridgeChain))

  return (
    <div className="relative">
      <div className="mb-1.5 text-xs font-medium" style={{ color: 'var(--subtle)' }}>{label}</div>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex w-full items-center justify-between gap-3 rounded-xl px-4 py-3 transition-all"
        style={{
          background: 'rgba(10,30,20,0.7)',
          border: '1px solid rgba(52,211,153,0.18)',
        }}
      >
        <div className="flex items-center gap-2.5">
          <span className="size-3 rounded-full flex-shrink-0" style={{ background: value.color }} />
          <span className="font-semibold" style={{ color: 'var(--ink)' }}>{value.label}</span>
        </div>
        <svg className={`size-4 transition-transform ${open ? 'rotate-180' : ''}`} style={{ color: 'var(--subtle)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
      </button>

      {open && (
        <div
          className="absolute left-0 right-0 top-full z-50 mt-1.5 rounded-xl overflow-hidden"
          style={{
            background: 'rgba(4,22,14,0.98)',
            border: '1px solid rgba(52,211,153,0.25)',
            backdropFilter: 'blur(24px)',
            boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
          }}
        >
          {available.map(c => (
            <button
              key={c.id}
              onClick={() => { onChange(c); setOpen(false) }}
              className="flex w-full items-center gap-3 px-4 py-3 transition-colors hover:bg-white/5"
            >
              <span className="size-3 rounded-full flex-shrink-0" style={{ background: c.color }} />
              <span className="text-sm font-medium" style={{ color: 'var(--ink)' }}>{c.label}</span>
              {c.id === BridgeChain.Arc && (
                <span className="ml-auto rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider" style={{ background: 'rgba(45,212,191,0.15)', color: 'var(--accent)' }}>Home</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function StepRow({ step }: { step: StepStatus }) {
  const icon =
    step.state === 'success' ? <CheckCircle2 className="size-4 text-emerald-400" /> :
    step.state === 'running'  ? <Loader2 className="size-4 animate-spin" style={{ color: 'var(--accent)' }} /> :
    step.state === 'failed'   ? <AlertTriangle className="size-4 text-red-400" /> :
    <div className="size-4 rounded-full border-2" style={{ borderColor: 'rgba(255,255,255,0.15)' }} />

  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-2.5">
        {icon}
        <span className={`text-sm ${step.state === 'pending' ? 'opacity-40' : ''}`} style={{ color: 'var(--ink)' }}>
          {step.label}
        </span>
      </div>
      {step.txHash && step.explorerUrl && (
        <a
          href={step.explorerUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs transition-opacity hover:opacity-80"
          style={{ color: 'var(--accent)' }}
        >
          {step.txHash.slice(0, 6)}…{step.txHash.slice(-4)}
          <ExternalLink className="size-3" />
        </a>
      )}
    </div>
  )
}

export function BridgeView() {
  const { isConnected, connector } = useAccount()
  const { switchChainAsync } = useSwitchChain()

  const arcChain = BRIDGE_CHAINS[0]
  const ethChain = BRIDGE_CHAINS[1]

  const [fromChain, setFromChain] = useState<ChainOption>(ethChain)
  const [toChain,   setToChain]   = useState<ChainOption>(arcChain)
  const [amount, setAmount] = useState('')
  const [recipient, setRecipient] = useState('')
  const [steps, setSteps] = useState<StepStatus[]>([])
  const [bridging, setBridging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const initialSteps: StepStatus[] = [
    { name: 'approve',          label: STEP_LABELS.approve,          state: 'pending' },
    { name: 'burn',             label: STEP_LABELS.burn,             state: 'pending' },
    { name: 'fetchAttestation', label: STEP_LABELS.fetchAttestation, state: 'pending' },
    { name: 'mint',             label: STEP_LABELS.mint,             state: 'pending' },
  ]

  const updateStep = (name: string, patch: Partial<StepStatus>) =>
    setSteps(prev => prev.map(s => s.name === name ? { ...s, ...patch } : s))

  const handleFlip = () => {
    setFromChain(toChain)
    setToChain(fromChain)
    setSteps([])
    setError(null)
    setDone(false)
  }

  const validate = () => {
    const n = parseFloat(amount)
    if (!amount || isNaN(n) || n <= 0) return 'Enter a valid amount'
    if (n < 0.01)                       return 'Minimum bridge amount is 0.01 USDC'
    if (fromChain.id === toChain.id)    return 'Source and destination must differ'
    if (fromChain.id === BridgeChain.Solana || toChain.id === BridgeChain.Solana)
      return 'Solana bridging requires Phantom wallet — coming soon'
    if (recipient && !/^0x[0-9a-fA-F]{40}$/.test(recipient))
      return 'Invalid recipient address'
    return null
  }

  const handleBridge = useCallback(async () => {
    const validationError = validate()
    if (validationError) { setError(validationError); return }
    if (!connector) { setError('Connect your wallet first'); return }

    setError(null)
    setDone(false)
    setBridging(true)
    setSteps(initialSteps)

    try {
      // Switch wallet to source chain
      if (fromChain.chainId > 0) {
        await switchChainAsync({ chainId: fromChain.chainId })
      }

      const provider = (await connector.getProvider()) as EIP1193Provider
      const adapter  = await createViemAdapterFromProvider({ provider })

      // Mark approve as running
      updateStep('approve', { state: 'running' })

      const result = await appKit.bridge({
        from: { adapter, chain: fromChain.id },
        to:   recipient
                ? { adapter, chain: toChain.id, address: recipient }
                : { adapter, chain: toChain.id },
        amount: parseFloat(amount).toFixed(6),
      })

      // Map result steps back to our UI steps
      const resultSteps = result?.steps ?? []
      setSteps(initialSteps.map(s => {
        const rs = resultSteps.find(r => r.name === s.name)
        if (!rs) return s
        const state: StepState = rs.state === 'success' ? 'success' : 'failed'
        return { ...s, state, txHash: (rs as { txHash?: string }).txHash, explorerUrl: (rs as { explorerUrl?: string }).explorerUrl }
      }))

      if (result?.state === 'success') {
        setDone(true)
      } else {
        setError(`Bridge ended with state: ${String(result?.state)}. Check steps for details.`)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Bridge failed. Please try again.')
      setSteps(prev => prev.map(s => s.state === 'running' ? { ...s, state: 'failed' } : s))
    } finally {
      setBridging(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromChain, toChain, amount, recipient, connector])

  const canBridge = isConnected && !bridging && !!amount && parseFloat(amount) > 0

  return (
    <div className="mx-auto max-w-lg space-y-4 pt-2">
      {/* Header */}
      <div className="mb-2">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--ink)', fontFamily: 'var(--font-display)' }}>
          Bridge USDC
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--subtle)' }}>
          Move USDC between Arc and all supported CCTP chains via Circle's cross-chain protocol.
        </p>
      </div>

      {/* Info banner */}
      <div
        className="flex items-start gap-3 rounded-xl px-4 py-3"
        style={{ background: 'rgba(45,212,191,0.08)', border: '1px solid rgba(45,212,191,0.2)' }}
      >
        <Info className="mt-0.5 size-4 flex-shrink-0" style={{ color: 'var(--accent)' }} />
        <p className="text-xs leading-relaxed" style={{ color: 'var(--subtle)' }}>
          Powered by Circle's CCTP — USDC is burned on the source chain and natively minted on the destination. Fast mode completes in ~8–20 seconds. Your connected wallet signs all transactions.
        </p>
      </div>

      {/* Main card */}
      <div
        className="rounded-2xl p-5 space-y-4"
        style={{
          background: 'rgba(8,28,18,0.85)',
          border: '1px solid rgba(52,211,153,0.18)',
          backdropFilter: 'blur(24px)',
        }}
      >
        {/* From chain */}
        <ChainSelector
          value={fromChain}
          onChange={c => { setFromChain(c); setSteps([]); setError(null); setDone(false) }}
          exclude={toChain.id}
          label="From"
        />

        {/* Flip button */}
        <div className="flex justify-center">
          <button
            onClick={handleFlip}
            className="flex items-center justify-center rounded-xl p-2.5 transition-all hover:scale-110 active:scale-95"
            style={{
              background: 'rgba(45,212,191,0.12)',
              border: '1px solid rgba(45,212,191,0.25)',
              color: 'var(--accent)',
            }}
          >
            <ArrowDownUp className="size-4" />
          </button>
        </div>

        {/* To chain */}
        <ChainSelector
          value={toChain}
          onChange={c => { setToChain(c); setSteps([]); setError(null); setDone(false) }}
          exclude={fromChain.id}
          label="To"
        />

        {/* Divider */}
        <div style={{ borderTop: '1px solid rgba(52,211,153,0.1)' }} />

        {/* Token + amount */}
        <div>
          <div className="mb-1.5 text-xs font-medium" style={{ color: 'var(--subtle)' }}>You send</div>
          <div
            className="flex items-center gap-3 rounded-xl px-4 py-3"
            style={{ background: 'rgba(10,30,20,0.7)', border: '1px solid rgba(52,211,153,0.18)' }}
          >
            <TokenIcon symbol="USDC" size={28} />
            <span className="font-semibold" style={{ color: 'var(--ink)' }}>USDC</span>
            <input
              type="number"
              placeholder="0.00"
              value={amount}
              onChange={e => { setAmount(e.target.value); setSteps([]); setError(null); setDone(false) }}
              className="ml-auto w-32 bg-transparent text-right text-lg font-semibold outline-none placeholder:opacity-30"
              style={{ color: 'var(--ink)' }}
              min="0"
              step="any"
            />
          </div>
          <p className="mt-1.5 text-right text-xs" style={{ color: 'var(--subtle)' }}>
            Minimum: 0.01 USDC · No bridge fee from EarthSwap
          </p>
        </div>

        {/* Optional recipient */}
        <div>
          <div className="mb-1.5 text-xs font-medium" style={{ color: 'var(--subtle)' }}>
            Recipient address <span className="opacity-50">(leave empty to use your wallet)</span>
          </div>
          <input
            type="text"
            placeholder="0x..."
            value={recipient}
            onChange={e => setRecipient(e.target.value)}
            className="w-full rounded-xl bg-transparent px-4 py-3 text-sm outline-none placeholder:opacity-30"
            style={{
              color: 'var(--ink)',
              background: 'rgba(10,30,20,0.7)',
              border: '1px solid rgba(52,211,153,0.18)',
            }}
          />
        </div>

        {/* Route summary */}
        {amount && parseFloat(amount) > 0 && (
          <div
            className="rounded-xl px-4 py-3 space-y-1.5"
            style={{ background: 'rgba(4,15,10,0.6)', border: '1px solid rgba(52,211,153,0.1)' }}
          >
            <div className="flex justify-between text-xs">
              <span style={{ color: 'var(--subtle)' }}>Route</span>
              <span style={{ color: 'var(--ink)' }}>
                {fromChain.label} → {toChain.label}
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span style={{ color: 'var(--subtle)' }}>Protocol</span>
              <span style={{ color: 'var(--ink)' }}>Circle CCTP v2</span>
            </div>
            <div className="flex justify-between text-xs">
              <span style={{ color: 'var(--subtle)' }}>Transfer speed</span>
              <span className="font-semibold" style={{ color: '#4ade80' }}>Fast (~8–20s)</span>
            </div>
            <div className="flex justify-between text-xs">
              <span style={{ color: 'var(--subtle)' }}>You receive</span>
              <span className="font-semibold" style={{ color: 'var(--ink)' }}>
                {parseFloat(amount).toFixed(2)} USDC
              </span>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div
            className="flex items-start gap-2 rounded-xl px-4 py-3"
            style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)' }}
          >
            <AlertTriangle className="mt-0.5 size-4 flex-shrink-0 text-red-400" />
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {/* Bridge button */}
        {!isConnected ? (
          <div className="text-center text-sm" style={{ color: 'var(--subtle)' }}>
            Connect your wallet to bridge
          </div>
        ) : (
          <button
            onClick={() => { void handleBridge() }}
            disabled={!canBridge}
            className="w-full rounded-xl py-4 text-base font-bold transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
            style={{
              background: canBridge
                ? 'linear-gradient(135deg, #10b981 0%, #2dd4bf 50%, #38bdf8 100%)'
                : 'rgba(52,211,153,0.15)',
              color: canBridge ? '#fff' : 'var(--accent)',
              boxShadow: canBridge ? '0 0 28px rgba(45,212,191,0.35)' : 'none',
            }}
          >
            {bridging ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="size-5 animate-spin" /> Bridging…
              </span>
            ) : (
              `Bridge ${amount ? parseFloat(amount).toFixed(2) : ''} USDC`
            )}
          </button>
        )}
      </div>

      {/* Step progress */}
      {steps.length > 0 && (
        <div
          className="rounded-2xl px-5 py-4"
          style={{
            background: 'rgba(8,28,18,0.85)',
            border: '1px solid rgba(52,211,153,0.18)',
            backdropFilter: 'blur(24px)',
          }}
        >
          <p className="mb-3 text-sm font-semibold" style={{ color: 'var(--ink)' }}>Transaction steps</p>
          <div style={{ borderTop: '1px solid rgba(52,211,153,0.08)' }}>
            {steps.map(s => <StepRow key={s.name} step={s} />)}
          </div>
        </div>
      )}

      {/* Success receipt */}
      {done && (
        <div
          className="rounded-2xl px-5 py-5 text-center"
          style={{
            background: 'rgba(16,185,129,0.1)',
            border: '1px solid rgba(52,211,153,0.3)',
            backdropFilter: 'blur(24px)',
          }}
        >
          <CheckCircle2 className="mx-auto mb-3 size-10 text-emerald-400" />
          <p className="text-lg font-bold" style={{ color: 'var(--ink)' }}>Bridge complete</p>
          <p className="mt-1 text-sm" style={{ color: 'var(--subtle)' }}>
            {amount} USDC arrived on {toChain.label}
          </p>
          <button
            onClick={() => { setAmount(''); setSteps([]); setDone(false); setError(null) }}
            className="mt-4 rounded-xl px-6 py-2 text-sm font-semibold transition-all hover:opacity-90"
            style={{ background: 'rgba(45,212,191,0.15)', color: 'var(--accent)', border: '1px solid rgba(45,212,191,0.25)' }}
          >
            New bridge
          </button>
        </div>
      )}

      {/* Supported chains */}
      <div
        className="rounded-2xl p-5"
        style={{
          background: 'rgba(8,28,18,0.85)',
          border: '1px solid rgba(52,211,153,0.18)',
          backdropFilter: 'blur(24px)',
        }}
      >
        <p className="mb-3 text-sm font-semibold" style={{ color: 'var(--ink)' }}>Supported chains</p>
        <div className="flex flex-wrap gap-2">
          {BRIDGE_CHAINS.map(c => (
            <div
              key={c.id}
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5"
              style={{ background: 'rgba(4,15,10,0.7)', border: '1px solid rgba(52,211,153,0.12)' }}
            >
              <span className="size-2 rounded-full" style={{ background: c.color }} />
              <span className="text-xs font-medium" style={{ color: 'var(--ink)' }}>{c.label}</span>
              {c.id === BridgeChain.Arc && (
                <span className="text-[10px] font-bold uppercase" style={{ color: 'var(--accent)' }}>⚡</span>
              )}
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs" style={{ color: 'var(--subtle)' }}>
          All chains use Circle's native CCTP. USDC is burned on source and natively minted on destination — no wrapped tokens.
        </p>
      </div>
    </div>
  )
}
