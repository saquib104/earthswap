import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, X, Check } from 'lucide-react'
import { ARC_TOKENS, type Token } from '@/constants/tokens'
import { TokenIcon } from './TokenIcon'

interface TokenSelectorProps {
  open: boolean
  selected?: Token
  exclude?: string
  onSelect: (token: Token) => void
  onClose: () => void
}

export function TokenSelector({ open, selected, exclude, onSelect, onClose }: TokenSelectorProps) {
  const [query, setQuery] = useState('')

  if (!open) return null

  const filtered = ARC_TOKENS.filter(t => {
    if (exclude && t.address.toLowerCase() === exclude.toLowerCase()) return false
    if (!query) return true
    const q = query.toLowerCase()
    return t.symbol.toLowerCase().includes(q) || t.name.toLowerCase().includes(q)
  })

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

        {/* Sheet */}
        <motion.div
          className="relative w-full max-w-sm overflow-hidden rounded-t-3xl sm:rounded-3xl"
          style={{
            background: '#0d1b2f',
            border: '1px solid rgba(255,255,255,0.12)',
            maxHeight: '80vh',
          }}
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', stiffness: 380, damping: 40 }}
          onClick={e => e.stopPropagation()}
        >
          {/* Drag handle */}
          <div className="flex justify-center pt-3 pb-1 sm:hidden">
            <div className="h-1 w-10 rounded-full" style={{ background: 'rgba(255,255,255,0.15)' }} />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-4 pb-3">
            <h2 className="display text-base font-semibold" style={{ color: 'var(--ink)' }}>
              Select token
            </h2>
            <button
              onClick={onClose}
              className="flex size-7 items-center justify-center rounded-full transition-colors"
              style={{ background: 'var(--surface)', color: 'var(--subtle)' }}
            >
              <X className="size-3.5" />
            </button>
          </div>

          {/* Search */}
          <div className="px-4 pb-3">
            <div
              className="flex items-center gap-2.5 rounded-2xl px-3 py-2.5"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            >
              <Search className="size-4 shrink-0" style={{ color: 'var(--subtle)' }} />
              <input
                autoFocus
                type="text"
                placeholder="Search by name or symbol"
                value={query}
                onChange={e => setQuery(e.target.value)}
                className="w-full bg-transparent text-sm outline-none placeholder:text-sm"
                style={{ color: 'var(--ink)' }}
              />
              {query && (
                <button onClick={() => setQuery('')}>
                  <X className="size-3.5" style={{ color: 'var(--subtle)' }} />
                </button>
              )}
            </div>
          </div>

          {/* Token list */}
          <div className="overflow-y-auto px-2 pb-5" style={{ maxHeight: '55vh' }}>
            {filtered.length === 0 ? (
              <p className="py-8 text-center text-sm" style={{ color: 'var(--subtle)' }}>
                No tokens found
              </p>
            ) : (
              filtered.map(token => {
                const isSelected = selected ? token.address.toLowerCase() === selected.address.toLowerCase() : false
                return (
                  <button
                    key={token.address}
                    onClick={() => { onSelect(token); onClose() }}
                    className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition-colors"
                    style={{
                      background: isSelected ? 'rgba(172,198,233,0.1)' : 'transparent',
                    }}
                    onMouseEnter={e => {
                      if (!isSelected) (e.currentTarget).style.background = 'var(--surface)'
                    }}
                    onMouseLeave={e => {
                      if (!isSelected) (e.currentTarget).style.background = 'transparent'
                    }}
                  >
                    {/* Token avatar */}
                    <TokenIcon symbol={token.symbol} size={36} />

                    {/* Name + description */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
                          {token.symbol}
                        </span>
                        <span className="text-xs" style={{ color: 'var(--subtle)' }}>
                          {token.decimals}d
                        </span>
                      </div>
                      <p className="truncate text-xs" style={{ color: 'var(--muted)' }}>
                        {token.name}
                      </p>
                    </div>

                    {/* Selected check */}
                    {isSelected && (
                      <Check className="size-4 shrink-0" style={{ color: 'var(--accent)' }} />
                    )}
                  </button>
                )
              })
            )}
          </div>

          {/* Footer note */}
          <div
            className="px-5 py-3 text-xs border-t"
            style={{ color: 'var(--subtle)', borderColor: 'var(--border)' }}
          >
            All tokens are on Arc mainnet. Swap routes use Uniswap v3.
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
