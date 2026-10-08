import { useState } from 'react'
import { useAccount } from 'wagmi'
import { motion } from 'framer-motion'
import {
  CreditCard, Smartphone, Building2, Zap, Shield, CheckCircle2,
  ExternalLink, ArrowRight, Info, Globe
} from 'lucide-react'
import { TokenIcon } from './TokenIcon'

// Onramp methods
const METHODS = [
  {
    id: 'card',
    icon: CreditCard,
    label: 'Debit / Credit Card',
    detail: 'Visa, Mastercard. Instant.',
    color: '#2775CA',
    bg: 'rgba(39,117,202,0.10)',
    border: 'rgba(39,117,202,0.25)',
  },
  {
    id: 'apple',
    icon: Smartphone,
    label: 'Apple Pay / Google Pay',
    detail: 'One-tap payment. Instant.',
    color: '#34d399',
    bg: 'rgba(52,211,153,0.10)',
    border: 'rgba(52,211,153,0.25)',
  },
  {
    id: 'bank',
    icon: Building2,
    label: 'Bank Transfer (ACH)',
    detail: 'US banks. 1–2 business days.',
    color: '#a78bfa',
    bg: 'rgba(167,139,250,0.10)',
    border: 'rgba(167,139,250,0.25)',
  },
]

const AMOUNTS = [50, 100, 250, 500]

export function OnrampView() {
  const { address, isConnected } = useAccount()
  const [amount, setAmount] = useState('100')
  const [method, setMethod] = useState('card')
  const [customAddress, setCustomAddress] = useState('')
  const [launched, setLaunched] = useState(false)

  const recipient = customAddress.trim() || address || ''
  const numAmount = Number(amount)
  const isValidAmount = numAmount >= 10 && numAmount <= 10000
  const isValidAddress = /^0x[0-9a-fA-F]{40}$/.test(recipient)

  const handleLaunch = () => {
    if (!isValidAmount || !isValidAddress) return
    // Build Circle onramp URL with pre-fill
    const params = new URLSearchParams({
      destinationAddress: recipient,
      destinationChain: 'ARC',
      amount: amount,
      currency: 'USD',
    })
    window.open(`https://onramp.circle.com?${params.toString()}`, '_blank', 'width=480,height=700')
    setLaunched(true)
  }

  return (
    <div className="mx-auto w-full max-w-lg">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <CreditCard className="size-5" style={{ color: 'var(--accent)' }} />
          <h2 className="display text-2xl font-semibold" style={{ color: 'var(--ink)' }}>
            Buy USDC
          </h2>
        </div>
        <p className="text-sm" style={{ color: 'var(--muted)' }}>
          Buy USDC directly to your Arc wallet with card, Apple Pay, Google Pay, or bank transfer — powered by Circle.
        </p>
      </div>

      {/* Powered by Circle badge */}
      <div className="mb-5 flex items-center gap-3 rounded-2xl px-4 py-3"
        style={{ background: 'rgba(39,117,202,0.08)', border: '1px solid rgba(39,117,202,0.2)' }}>
        <div className="flex size-8 items-center justify-center rounded-full" style={{ background: 'rgba(39,117,202,0.15)' }}>
          <Globe className="size-4" style={{ color: '#2775CA' }} />
        </div>
        <div>
          <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>Powered by Circle</p>
          <p className="text-xs" style={{ color: 'var(--subtle)' }}>
            KYC, compliance, and payment processing handled by Circle — your funds go directly onchain.
          </p>
        </div>
      </div>

      <div className="rounded-2xl p-5 space-y-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>

        {/* Amount */}
        <div>
          <label className="text-xs font-medium mb-2 block" style={{ color: 'var(--subtle)' }}>
            Amount (USD)
          </label>
          <div className="grid grid-cols-4 gap-1.5 mb-2">
            {AMOUNTS.map(a => (
              <button
                key={a}
                onClick={() => setAmount(String(a))}
                className="rounded-xl py-2 text-xs font-semibold transition-all"
                style={
                  amount === String(a)
                    ? { background: 'rgba(45,212,191,0.18)', color: 'var(--accent)', border: '1px solid rgba(45,212,191,0.35)' }
                    : { background: 'var(--surface-strong)', color: 'var(--subtle)', border: '1px solid var(--border)' }
                }
              >
                ${a}
              </button>
            ))}
          </div>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-semibold" style={{ color: 'var(--subtle)' }}>$</span>
            <input
              type="number"
              min="10"
              max="10000"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className="w-full rounded-2xl pl-8 pr-4 py-3.5 text-xl font-semibold bg-transparent outline-none"
              style={{
                color: 'var(--ink)',
                background: 'var(--surface-strong)',
                border: `1px solid ${isValidAmount ? 'var(--border)' : 'rgba(239,68,68,0.4)'}`,
              }}
            />
          </div>
          {!isValidAmount && amount !== '' && (
            <p className="mt-1 text-xs" style={{ color: '#ef4444' }}>Enter an amount between $10 and $10,000</p>
          )}
          {isValidAmount && (
            <div className="mt-2 flex items-center justify-between px-1">
              <span className="text-xs" style={{ color: 'var(--subtle)' }}>You receive approx.</span>
              <div className="flex items-center gap-1.5">
                <TokenIcon symbol="USDC" size={16} />
                <span className="mono text-sm font-semibold" style={{ color: 'var(--accent)' }}>
                  ~{(numAmount * 0.98).toFixed(2)} USDC
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Payment method */}
        <div>
          <label className="text-xs font-medium mb-2 block" style={{ color: 'var(--subtle)' }}>Payment Method</label>
          <div className="space-y-2">
            {METHODS.map(m => (
              <button
                key={m.id}
                onClick={() => setMethod(m.id)}
                className="w-full flex items-center gap-3 rounded-xl px-4 py-3 transition-all text-left"
                style={
                  method === m.id
                    ? { background: m.bg, border: `1px solid ${m.border}` }
                    : { background: 'var(--surface-strong)', border: '1px solid var(--border)' }
                }
              >
                <m.icon className="size-4 shrink-0" style={{ color: method === m.id ? m.color : 'var(--subtle)' }} />
                <div className="flex-1">
                  <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>{m.label}</p>
                  <p className="text-xs" style={{ color: 'var(--subtle)' }}>{m.detail}</p>
                </div>
                {method === m.id && <CheckCircle2 className="size-4 shrink-0" style={{ color: m.color }} />}
              </button>
            ))}
          </div>
        </div>

        {/* Destination */}
        <div>
          <label className="text-xs font-medium mb-2 block" style={{ color: 'var(--subtle)' }}>
            Destination Wallet (Arc mainnet)
          </label>
          {isConnected && address ? (
            <div className="space-y-2">
              <div
                className="flex items-center gap-2 rounded-xl px-4 py-3"
                style={{ background: 'rgba(45,212,191,0.08)', border: '1px solid rgba(45,212,191,0.2)' }}
              >
                <CheckCircle2 className="size-4 shrink-0" style={{ color: 'var(--accent)' }} />
                <span className="mono text-xs font-medium truncate" style={{ color: 'var(--ink)' }}>
                  {address.slice(0, 10)}…{address.slice(-8)}
                </span>
                <span className="ml-auto text-xs rounded-lg px-2 py-0.5" style={{ background: 'rgba(45,212,191,0.12)', color: 'var(--accent)' }}>
                  Connected
                </span>
              </div>
              <p className="text-xs px-1" style={{ color: 'var(--subtle)' }}>
                Or enter a different address:
              </p>
              <input
                type="text"
                placeholder="0x… (optional override)"
                value={customAddress}
                onChange={e => setCustomAddress(e.target.value)}
                className="w-full rounded-xl px-4 py-2.5 text-xs font-mono bg-transparent outline-none"
                style={{ background: 'var(--surface-strong)', color: 'var(--ink)', border: '1px solid var(--border)' }}
              />
            </div>
          ) : (
            <div className="space-y-2">
              <input
                type="text"
                placeholder="0x… your Arc wallet address"
                value={customAddress}
                onChange={e => setCustomAddress(e.target.value)}
                className="w-full rounded-xl px-4 py-3 text-sm font-mono bg-transparent outline-none"
                style={{
                  background: 'var(--surface-strong)',
                  color: 'var(--ink)',
                  border: `1px solid ${customAddress && !isValidAddress ? 'rgba(239,68,68,0.4)' : 'var(--border)'}`,
                }}
              />
              {customAddress && !isValidAddress && (
                <p className="text-xs" style={{ color: '#ef4444' }}>Enter a valid 0x… address</p>
              )}
            </div>
          )}
        </div>

        {/* CTA */}
        <motion.button
          onClick={handleLaunch}
          disabled={!isValidAmount || !isValidAddress}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          className="w-full rounded-2xl py-4 text-sm font-bold transition-all btn-accent disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <CreditCard className="size-4" />
          Buy ${isValidAmount ? numAmount : '—'} USDC via Circle
          <ArrowRight className="size-4" />
        </motion.button>

        {launched && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 rounded-xl px-4 py-3"
            style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}
          >
            <CheckCircle2 className="size-4 shrink-0" style={{ color: '#22c55e' }} />
            <p className="text-xs" style={{ color: 'var(--ink)' }}>
              Circle onramp opened in a new window. Complete your purchase there — USDC will arrive in your wallet on Arc mainnet within seconds (card) or 1–2 days (bank).
            </p>
          </motion.div>
        )}
      </div>

      {/* Feature cards */}
      <div className="mt-5 grid grid-cols-3 gap-3">
        {[
          { icon: Shield, label: 'KYC by Circle', detail: 'Identity verified by Circle\'s compliance team' },
          { icon: Zap, label: 'Instant delivery', detail: 'Card purchases arrive onchain in seconds' },
          { icon: CheckCircle2, label: 'No custody', detail: 'USDC goes directly to your wallet' },
        ].map(({ icon: Icon, label, detail }) => (
          <div key={label} className="rounded-2xl p-3 text-center" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <Icon className="mx-auto mb-2 size-5" style={{ color: 'var(--accent)' }} />
            <p className="text-xs font-semibold mb-1" style={{ color: 'var(--ink)' }}>{label}</p>
            <p className="text-xs" style={{ color: 'var(--subtle)' }}>{detail}</p>
          </div>
        ))}
      </div>

      {/* Info note */}
      <div className="mt-4 flex items-start gap-2.5 rounded-2xl px-4 py-3 text-xs"
        style={{ background: 'rgba(172,198,233,0.08)', border: '1px solid rgba(172,198,233,0.15)' }}>
        <Info className="mt-0.5 size-3.5 shrink-0" style={{ color: 'var(--accent)' }} />
        <p style={{ color: 'var(--muted)' }}>
          The onramp widget is hosted by Circle. EarthSwap never handles payment details. Fees vary by payment method — typically 1–3% for cards, free for bank transfers. The ~2% estimate above is indicative only.
        </p>
      </div>
    </div>
  )
}
