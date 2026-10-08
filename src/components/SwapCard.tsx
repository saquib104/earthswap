import { useState, useEffect, useCallback, useRef } from 'react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract, useSwitchChain } from 'wagmi'
import { erc20Abi, parseUnits, formatUnits, createPublicClient, http } from 'viem'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowDownUp, Settings, Loader2, ExternalLink, AlertTriangle,
  ChevronDown, Info, CheckCircle2, Zap, Clock
} from 'lucide-react'
import { toast } from 'sonner'
import { TokenSelector } from './TokenSelector'
import { TokenIcon } from './TokenIcon'
import {
  ARC_TOKENS, ARC_CHAIN_ID, UNISWAP_ADDRESSES,
  AUTO_ROUTE_FEE_TIERS, feeToLabel, type Token, type FeeTier,
} from '@/constants/tokens'

// EarthSwapRouter — deployed on Arc mainnet, earns 0.15% protocol fee
const EARTHSWAP_ROUTER = '0x23ACd156ea1A85C40631b6314fEFa9C9D369f427' as const

const EARTHSWAP_ROUTER_ABI = [
  {
    inputs: [{ components: [
      { name: 'tokenIn',           type: 'address' },
      { name: 'tokenOut',          type: 'address' },
      { name: 'fee',               type: 'uint24'  },
      { name: 'recipient',         type: 'address' },
      { name: 'deadline',          type: 'uint256' },
      { name: 'amountIn',          type: 'uint256' },
      { name: 'amountOutMinimum',  type: 'uint256' },
      { name: 'sqrtPriceLimitX96', type: 'uint160' },
    ], name: 'params', type: 'tuple' }],
    name: 'swapExactInputSingle',
    outputs: [{ name: 'amountOut', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const

import { useTokenBalance } from '@/hooks/useTokenBalance'
import { buildTxExplorerUrl, requireChain } from '@/onchain-facts'

const QUOTER_V2_ABI = [
  {
    inputs: [{ components: [
      { name: 'tokenIn', type: 'address' },
      { name: 'tokenOut', type: 'address' },
      { name: 'amountIn', type: 'uint256' },
      { name: 'fee', type: 'uint24' },
      { name: 'sqrtPriceLimitX96', type: 'uint160' },
    ], name: 'params', type: 'tuple' }],
    name: 'quoteExactInputSingle',
    outputs: [
      { name: 'amountOut', type: 'uint256' },
      { name: 'sqrtPriceX96After', type: 'uint160' },
      { name: 'initializedTicksCrossed', type: 'uint32' },
      { name: 'gasEstimate', type: 'uint256' },
    ],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const


const DEFAULT_SLIPPAGE = 50
const QUOTE_EXPIRY_SECONDS = 15
// Estimated gas cost per swap on Arc in USDC (approx 0.01 USDC)
const ESTIMATED_GAS_USDC = 0.01

interface QuoteResult {
  amountOut: bigint
  fee: FeeTier
  gasEstimate: bigint
  sqrtPriceX96After: bigint
}

function TokenButton({ token, onClick }: { token: Token; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 rounded-2xl px-3 py-2 transition-all hover:opacity-80 active:scale-[0.98]"
      style={{ background: 'var(--surface-muted)', border: '1px solid var(--border)' }}
    >
      <TokenIcon symbol={token.symbol} size={24} />
      <span className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
        {token.symbol}
      </span>
      <ChevronDown className="size-3.5" style={{ color: 'var(--subtle)' }} />
    </button>
  )
}

function DetailRow({
  label, value, highlight,
}: { label: string; value: string; highlight?: 'green' | 'yellow' | 'red' }) {
  const color = highlight === 'green' ? '#22c55e' : highlight === 'yellow' ? '#eab308' : highlight === 'red' ? '#ef4444' : 'var(--muted)'
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs" style={{ color: 'var(--subtle)' }}>{label}</span>
      <span className="mono text-xs tabular-nums font-medium" style={{ color }}>{value}</span>
    </div>
  )
}

function PriceImpactBadge({ impact }: { impact: number }) {
  const isHigh = impact > 2
  const isMed = impact > 0.5
  const color = isHigh ? '#ef4444' : isMed ? '#eab308' : '#22c55e'
  const icon = isHigh || isMed ? <AlertTriangle className="size-3" /> : <CheckCircle2 className="size-3" />
  return (
    <div className="flex items-center gap-1 rounded-lg px-2 py-1" style={{ background: `${color}18` }}>
      <span style={{ color }}>{icon}</span>
      <span className="text-xs font-semibold" style={{ color }}>
        {isHigh ? 'High impact' : isMed ? 'Medium impact' : 'Low impact'} ({impact.toFixed(2)}%)
      </span>
    </div>
  )
}

function QuoteTimer({ onExpire }: { onExpire: () => void }) {
  const [secs, setSecs] = useState(QUOTE_EXPIRY_SECONDS)
  useEffect(() => {
    const interval = setInterval(() => {
      setSecs(s => {
        if (s <= 1) { clearInterval(interval); onExpire(); return QUOTE_EXPIRY_SECONDS }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const pct = (secs / QUOTE_EXPIRY_SECONDS) * 100
  const color = secs > 8 ? '#22c55e' : secs > 4 ? '#eab308' : '#ef4444'
  return (
    <div className="flex items-center gap-2">
      <Clock className="size-3" style={{ color }} />
      <div className="h-1 w-20 rounded-full overflow-hidden" style={{ background: 'var(--surface-muted)' }}>
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <span className="mono text-xs tabular-nums" style={{ color }}>
        {secs}s
      </span>
    </div>
  )
}

export function SwapCard() {
  const { address, isConnected, chainId } = useAccount()
  const { switchChain } = useSwitchChain()

  const [tokenIn, setTokenIn] = useState<Token>(ARC_TOKENS[0])
  const [tokenOut, setTokenOut] = useState<Token>(ARC_TOKENS[1])
  const [amountIn, setAmountIn] = useState('')
  const [slippage, setSlippage] = useState(DEFAULT_SLIPPAGE)
  const [showSettings, setShowSettings] = useState(false)
  const [showTokenIn, setShowTokenIn] = useState(false)
  const [showTokenOut, setShowTokenOut] = useState(false)
  const [showWhyRate, setShowWhyRate] = useState(false)

  const [quote, setQuote] = useState<QuoteResult | null>(null)
  const [isQuoting, setIsQuoting] = useState(false)
  const [quoteError, setQuoteError] = useState<string | null>(null)
  const [quoteKey, setQuoteKey] = useState(0)

  const lastConfirmedSwapHash = useRef<`0x${string}` | null>(null)
  const lastConfirmedApproveHash = useRef<`0x${string}` | null>(null)

  const isWrongChain = isConnected && chainId !== ARC_CHAIN_ID
  const balanceIn = useTokenBalance(tokenIn)
  const balanceOut = useTokenBalance(tokenOut)

  const parsedAmountIn =
    amountIn && !isNaN(Number(amountIn)) && Number(amountIn) > 0
      ? parseUnits(amountIn, tokenIn.decimals)
      : 0n

  // Derived quote values
  const amountOutFormatted = quote
    ? Number(formatUnits(quote.amountOut, tokenOut.decimals)).toFixed(tokenOut.decimals === 8 ? 8 : 6)
    : ''
  const exchangeRate = quote && parsedAmountIn > 0n
    ? (Number(formatUnits(quote.amountOut, tokenOut.decimals)) / Number(amountIn)).toFixed(6)
    : null
  const liquidityFee = quote && parsedAmountIn > 0n
    ? (Number(amountIn) * (quote.fee / 1_000_000)).toFixed(6)
    : null
  const minReceived = quote && parsedAmountIn > 0n
    ? Number(formatUnits(quote.amountOut * BigInt(10000 - slippage) / 10000n, tokenOut.decimals)).toFixed(6)
    : null
  const priceImpact: number | null = quote && parsedAmountIn > 0n
    ? Math.abs((Number(amountIn) * (quote.fee / 1_000_000)) / Number(amountIn) * 100 * 0.4)
    : null

  // Allowance
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: tokenIn.address as `0x${string}`,
    abi: erc20Abi,
    functionName: 'allowance',
    args: address ? [address, EARTHSWAP_ROUTER] : undefined,
    chainId: ARC_CHAIN_ID,
    query: { enabled: !!address && parsedAmountIn > 0n },
  })
  const needsApproval = parsedAmountIn > 0n && allowance !== undefined && allowance < parsedAmountIn

  // Approve
  const { writeContract: approve, data: approveHash, isPending: isApprovePending } = useWriteContract()
  const { isLoading: isApproveConfirming, isSuccess: isApproveSuccess } = useWaitForTransactionReceipt({ hash: approveHash })

  // Swap
  const { writeContract: swap, data: swapHash, isPending: isSwapPending, isError: isSwapError, error: swapError } = useWriteContract()
  const { isLoading: isSwapConfirming, isSuccess: isSwapSuccess } = useWaitForTransactionReceipt({ hash: swapHash })

  // Approve success
  useEffect(() => {
    if (isApproveSuccess && approveHash && lastConfirmedApproveHash.current !== approveHash) {
      lastConfirmedApproveHash.current = approveHash
      void refetchAllowance()
      toast.success('Approval confirmed. Ready to swap.')
    }
  }, [isApproveSuccess, approveHash, refetchAllowance])

  // Swap success: reset form at render time
  if (isSwapSuccess && swapHash && lastConfirmedSwapHash.current !== swapHash) {
    lastConfirmedSwapHash.current = swapHash
    setAmountIn('')
    setQuote(null)
  }
  useEffect(() => {
    if (isSwapSuccess && swapHash) {
      toast.success('Swap confirmed!')
      void balanceIn.refetch()
      void balanceOut.refetch()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSwapSuccess, swapHash])

  // Swap error
  useEffect(() => {
    if (isSwapError && swapError) {
      const msg = swapError.message?.toLowerCase() ?? ''
      if (msg.includes('user rejected') || msg.includes('denied')) {
        toast.info('Transaction cancelled.')
      } else {
        toast.error('Swap failed. Try again.')
      }
    }
  }, [isSwapError, swapError])

  // Quote fetcher
  const fetchQuote = useCallback(async () => {
    if (!parsedAmountIn || parsedAmountIn === 0n) {
      setQuote(null); setQuoteError(null); return
    }
    setIsQuoting(true); setQuoteError(null)
    try {
      const arcChain = requireChain(ARC_CHAIN_ID)
      const client = createPublicClient({ chain: { ...arcChain, id: ARC_CHAIN_ID, name: 'Arc', nativeCurrency: { name: arcChain.nativeCurrency.symbol, symbol: arcChain.nativeCurrency.symbol, decimals: arcChain.nativeCurrency.decimals }, rpcUrls: { default: { http: [arcChain.rpcUrls[0]] } } }, transport: http(arcChain.rpcUrls[0]) })
      let best: QuoteResult | null = null
      for (const fee of AUTO_ROUTE_FEE_TIERS) {
        try {
          const result = await client.simulateContract({
            address: UNISWAP_ADDRESSES.quoterV2,
            abi: QUOTER_V2_ABI,
            functionName: 'quoteExactInputSingle',
            args: [{ tokenIn: tokenIn.address as `0x${string}`, tokenOut: tokenOut.address as `0x${string}`, amountIn: parsedAmountIn, fee, sqrtPriceLimitX96: 0n }],
          })
          const [amountOut, sqrtPriceX96After, , gasEstimate] = result.result
          if (!best || amountOut > best.amountOut) {
            best = { amountOut, fee, gasEstimate, sqrtPriceX96After }
          }
        } catch { /* no pool at this tier */ }
      }
      if (best) {
        setQuote(best)
        setQuoteKey(k => k + 1)
      } else {
        setQuoteError('No liquidity found for this pair.')
        setQuote(null)
      }
    } catch {
      setQuoteError('Could not fetch quote.')
    } finally {
      setIsQuoting(false)
    }
  }, [parsedAmountIn, tokenIn, tokenOut])

  // Debounce quote
  useEffect(() => {
    if (!parsedAmountIn || parsedAmountIn === 0n) { setQuote(null); return }
    const timer = setTimeout(() => { void fetchQuote() }, 600)
    return () => clearTimeout(timer)
  }, [parsedAmountIn, tokenIn, tokenOut, fetchQuote])

  const handleSwap = () => {
    if (!address || !quote) return
    const amountOutMin = quote.amountOut * BigInt(10000 - slippage) / 10000n
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 300) // 5 min
    swap({
      address: EARTHSWAP_ROUTER,
      abi: EARTHSWAP_ROUTER_ABI,
      functionName: 'swapExactInputSingle',
      args: [{
        tokenIn: tokenIn.address as `0x${string}`,
        tokenOut: tokenOut.address as `0x${string}`,
        fee: quote.fee,
        recipient: address,
        deadline,
        amountIn: parsedAmountIn,
        amountOutMinimum: amountOutMin,
        sqrtPriceLimitX96: 0n,
      }],
      chainId: ARC_CHAIN_ID,
      gas: 350000n,
      maxFeePerGas: 25000000000n,
    })
  }

  const handleFlip = () => {
    setTokenIn(tokenOut)
    setTokenOut(tokenIn)
    setAmountIn('')
    setQuote(null)
  }

  const handleMax = () => {
    if (balanceIn.formatted) setAmountIn(balanceIn.formatted)
  }

  // CTA state
  const isLoading = isApprovePending || isApproveConfirming || isSwapPending || isSwapConfirming
  const ctaLabel = !isConnected ? 'Connect Wallet'
    : isWrongChain ? 'Switch to Arc Mainnet'
    : isApprovePending ? 'Confirm approval...'
    : isApproveConfirming ? 'Approving...'
    : isSwapPending ? 'Confirm in wallet...'
    : isSwapConfirming ? 'Confirming swap...'
    : needsApproval ? `Approve ${tokenIn.symbol}`
    : 'Swap'

  const canSwap = isConnected && !isWrongChain && !!quote && !isLoading && parsedAmountIn > 0n

  const handleCta = () => {
    if (!isConnected) return
    if (isWrongChain) { switchChain({ chainId: ARC_CHAIN_ID }); return }
    if (needsApproval) {
      approve({ address: tokenIn.address as `0x${string}`, abi: erc20Abi, functionName: 'approve', args: [EARTHSWAP_ROUTER, parsedAmountIn], chainId: ARC_CHAIN_ID })
      return
    }
    handleSwap()
  }

  const arcChainMeta = requireChain(ARC_CHAIN_ID)
  const explorerUrl = swapHash ? buildTxExplorerUrl(ARC_CHAIN_ID, swapHash) : null

  return (
    <>
      <TokenSelector
        open={showTokenIn}
        onClose={() => setShowTokenIn(false)}
        onSelect={t => { setTokenIn(t); setAmountIn(''); setQuote(null) }}
        exclude={tokenOut.address}
      />
      <TokenSelector
        open={showTokenOut}
        onClose={() => setShowTokenOut(false)}
        onSelect={t => { setTokenOut(t); setAmountIn(''); setQuote(null) }}
        exclude={tokenIn.address}
      />

      <div className="mx-auto max-w-md space-y-3">
        {/* Mainnet warning */}
        <div
          className="flex items-center gap-2 rounded-xl px-4 py-2.5"
          style={{ background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.25)' }}
        >
          <AlertTriangle className="size-3.5 shrink-0" style={{ color: '#eab308' }} />
          <span className="text-xs" style={{ color: '#ca8a04' }}>
            Arc Mainnet — transactions use real USDC and are irreversible.
          </span>
        </div>

        {/* Swap card */}
        <div
          className="rounded-2xl p-1"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          {/* Card header */}
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <span className="display text-base font-700" style={{ color: 'var(--ink)' }}>Trade</span>
            <button
              onClick={() => setShowSettings(s => !s)}
              className="flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 transition-colors hover:opacity-80"
              style={{ background: showSettings ? 'var(--surface-strong)' : 'transparent' }}
            >
              <Settings className="size-4" style={{ color: 'var(--subtle)' }} />
              <span className="text-xs font-medium" style={{ color: 'var(--subtle)' }}>
                {(slippage / 100).toFixed(1)}% slippage
              </span>
            </button>
          </div>

          {/* Slippage settings */}
          <AnimatePresence>
            {showSettings && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="mx-3 mb-2 rounded-xl p-3 space-y-2" style={{ background: 'var(--surface-muted)' }}>
                  <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--subtle)' }}>Slippage Tolerance</span>
                  <div className="flex gap-2">
                    {[50, 100, 200].map(bps => (
                      <button
                        key={bps}
                        onClick={() => setSlippage(bps)}
                        className="rounded-lg px-3 py-1.5 text-xs font-semibold transition-all"
                        style={slippage === bps
                          ? { background: 'var(--accent)', color: '#0d1b2f' }
                          : { background: 'var(--surface)', color: 'var(--muted)', border: '1px solid var(--border)' }
                        }
                      >
                        {(bps / 100).toFixed(1)}%
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* You pay */}
          <div className="mx-3 rounded-xl p-4" style={{ background: 'var(--surface-muted)' }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--subtle)' }}>You pay</span>
              {balanceIn.formatted && (
                <button onClick={handleMax} className="text-xs transition-opacity hover:opacity-80" style={{ color: 'var(--accent)' }}>
                  Balance: {Number(balanceIn.formatted).toFixed(4)} {tokenIn.symbol}
                </button>
              )}
            </div>
            <div className="flex items-center gap-3">
              <input
                type="number"
                inputMode="decimal"
                placeholder="0.00"
                value={amountIn}
                onChange={e => setAmountIn(e.target.value)}
                className="min-w-0 flex-1 bg-transparent text-3xl font-700 outline-none tabular-nums"
                style={{ color: 'var(--ink)', fontFamily: 'var(--font-display)' }}
              />
              <TokenButton token={tokenIn} onClick={() => setShowTokenIn(true)} />
            </div>
          </div>

          {/* Flip */}
          <div className="flex justify-center py-1.5">
            <button
              onClick={handleFlip}
              className="flex size-9 items-center justify-center rounded-xl transition-all hover:rotate-180 hover:scale-110 active:scale-95"
              style={{ background: 'var(--surface-strong)', border: '1px solid var(--border)' }}
            >
              <ArrowDownUp className="size-4" style={{ color: 'var(--accent)' }} />
            </button>
          </div>

          {/* You receive */}
          <div className="mx-3 rounded-xl p-4" style={{ background: 'var(--surface-muted)' }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--subtle)' }}>You receive</span>
              {balanceOut.formatted && (
                <span className="text-xs" style={{ color: 'var(--subtle)' }}>
                  Balance: {Number(balanceOut.formatted).toFixed(4)} {tokenOut.symbol}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                {isQuoting ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="size-5 animate-spin" style={{ color: 'var(--subtle)' }} />
                    <span className="text-sm" style={{ color: 'var(--subtle)' }}>Getting best rate…</span>
                  </div>
                ) : (
                  <span
                    className="text-3xl font-700 tabular-nums"
                    style={{
                      color: amountOutFormatted ? 'var(--ink)' : 'var(--subtle)',
                      fontFamily: 'var(--font-display)',
                    }}
                  >
                    {amountOutFormatted || '0.00'}
                  </span>
                )}
              </div>
              <TokenButton token={tokenOut} onClick={() => setShowTokenOut(true)} />
            </div>
          </div>

          {/* Quote details */}
          <AnimatePresence>
            {quote && !isQuoting && parsedAmountIn > 0n && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mx-3 mt-2 rounded-xl p-3 space-y-2"
                style={{ background: 'var(--surface-muted)', border: '1px solid var(--border)' }}
              >
                {/* Quote header with timer */}
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold" style={{ color: 'var(--ink)' }}>Quote Details</span>
                  <QuoteTimer key={quoteKey} onExpire={() => { void fetchQuote() }} />
                </div>

                <div className="space-y-1.5">
                  <DetailRow
                    label="Exchange rate"
                    value={exchangeRate ? `1 ${tokenIn.symbol} = ${exchangeRate} ${tokenOut.symbol}` : '—'}
                  />
                  <DetailRow
                    label="Liquidity fee"
                    value={liquidityFee ? `${liquidityFee} ${tokenIn.symbol} (${feeToLabel(quote.fee)})` : '—'}
                  />
                  <DetailRow
                    label="Minimum received"
                    value={minReceived ? `${minReceived} ${tokenOut.symbol}` : '—'}
                    highlight="green"
                  />
                  <DetailRow
                    label="Network fee"
                    value={`~${ESTIMATED_GAS_USDC} USDC`}
                  />
                  <DetailRow
                    label="Route"
                    value={`EarthSwap ${tokenIn.symbol}/${tokenOut.symbol}`}
                  />
                  <DetailRow
                    label="Settlement"
                    value="Arc Mainnet (~1s)"
                  />
                </div>

                {/* Price impact badge */}
                {priceImpact !== null && (
                  <div className="pt-0.5">
                    <PriceImpactBadge impact={priceImpact} />
                  </div>
                )}

                {/* Why this rate? toggle */}
                <button
                  onClick={() => setShowWhyRate(s => !s)}
                  className="flex w-full items-center gap-1.5 pt-1 transition-opacity hover:opacity-80"
                >
                  <Info className="size-3" style={{ color: 'var(--accent)' }} />
                  <span className="text-xs font-medium" style={{ color: 'var(--accent)' }}>
                    {showWhyRate ? 'Hide rate details' : 'Why this rate?'}
                  </span>
                  <ChevronDown
                    className="size-3 ml-auto transition-transform"
                    style={{ color: 'var(--accent)', transform: showWhyRate ? 'rotate(180deg)' : 'none' }}
                  />
                </button>

                <AnimatePresence>
                  {showWhyRate && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div
                        className="rounded-xl p-3 space-y-1.5 mt-1"
                        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
                      >
                        <div className="text-xs font-semibold mb-2" style={{ color: 'var(--ink)' }}>
                          {tokenIn.symbol}/{tokenOut.symbol} — Price Calculation
                        </div>
                        <DetailRow
                          label="Pool fee tier"
                          value={feeToLabel(quote.fee)}
                        />
                        <DetailRow
                          label="Estimated price impact"
                          value={priceImpact !== null ? `${priceImpact.toFixed(4)}%` : '—'}
                        />
                        <DetailRow
                          label="Liquidity fee"
                          value={`${feeToLabel(quote.fee)} of input`}
                        />
                        <DetailRow
                          label="Your effective rate"
                          value={exchangeRate ? `${exchangeRate} ${tokenOut.symbol} per ${tokenIn.symbol}` : '—'}
                        />
                        <div
                          className="mt-2 rounded-lg p-2 text-xs"
                          style={{ background: 'var(--surface-muted)', color: 'var(--subtle)' }}
                        >
                          Based on current {tokenIn.symbol}/{tokenOut.symbol} pool liquidity and execution conditions on Arc mainnet. Rate may change before confirmation.
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Quote error */}
          {quoteError && parsedAmountIn > 0n && (
            <div className="mx-3 mt-2 flex items-center gap-2 rounded-xl px-3 py-2.5" style={{ background: 'rgba(239,68,68,0.1)' }}>
              <AlertTriangle className="size-4 shrink-0" style={{ color: '#ef4444' }} />
              <span className="text-xs" style={{ color: '#ef4444' }}>{quoteError}</span>
            </div>
          )}

          {/* Wrong chain banner */}
          {isWrongChain && (
            <div className="mx-3 mt-2 flex items-center gap-2 rounded-xl px-3 py-2.5" style={{ background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.2)' }}>
              <AlertTriangle className="size-4 shrink-0" style={{ color: '#eab308' }} />
              <span className="text-xs" style={{ color: '#ca8a04' }}>Switch to Arc Mainnet to swap.</span>
            </div>
          )}

          {/* CTA button */}
          <div className="p-3 pt-2">
            <button
              onClick={handleCta}
              disabled={!canSwap && isConnected && !isWrongChain}
              className="flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-700 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              style={{
                background: canSwap || !isConnected || isWrongChain ? 'var(--accent)' : 'var(--surface-strong)',
                color: canSwap || !isConnected || isWrongChain ? '#0d1b2f' : 'var(--subtle)',
              }}
            >
              {isLoading && <Loader2 className="size-4 animate-spin" />}
              {ctaLabel}
            </button>
          </div>
        </div>

        {/* Gas transparency info */}
        {quote && parsedAmountIn > 0n && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-xl p-4 space-y-2"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <Zap className="size-3.5" style={{ color: 'var(--accent)' }} />
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--subtle)' }}>Transaction Preview</span>
            </div>
            <DetailRow label="Swap" value={`${amountIn} ${tokenIn.symbol} → ${amountOutFormatted} ${tokenOut.symbol}`} />
            <DetailRow label="Network" value={arcChainMeta.name} />
            <DetailRow label="Gas" value={`~${ESTIMATED_GAS_USDC} USDC`} />
            <DetailRow label="Estimated settlement" value="~1 second" highlight="green" />
          </motion.div>
        )}

        {/* Onchain proof (success receipt) */}
        <AnimatePresence>
          {isSwapSuccess && swapHash && explorerUrl && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="rounded-2xl p-5 text-center space-y-3"
              style={{ background: 'var(--surface)', border: '1px solid rgba(34,197,94,0.3)' }}
            >
              <div className="flex justify-center">
                <div className="flex size-12 items-center justify-center rounded-full" style={{ background: 'rgba(34,197,94,0.15)' }}>
                  <CheckCircle2 className="size-6" style={{ color: '#22c55e' }} />
                </div>
              </div>
              <div>
                <div className="font-700 text-base" style={{ color: 'var(--ink)' }}>Swap Complete</div>
                <div className="text-sm mt-1" style={{ color: 'var(--subtle)' }}>
                  Your swap settled on Arc Mainnet.
                </div>
              </div>
              <div className="rounded-xl p-3 space-y-1.5" style={{ background: 'var(--surface-muted)' }}>
                <div className="text-xs font-medium" style={{ color: 'var(--subtle)' }}>Transaction</div>
                <div className="mono text-xs tabular-nums" style={{ color: 'var(--ink)' }}>
                  {swapHash.slice(0, 10)}...{swapHash.slice(-8)}
                </div>
              </div>
              <a
                href={explorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 text-sm font-semibold transition-opacity hover:opacity-80"
                style={{ color: 'var(--accent)' }}
              >
                <ExternalLink className="size-4" />
                View on Arc Explorer
              </a>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  )
}
