import { useState, useCallback } from 'react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract, useSwitchChain } from 'wagmi'
import { erc20Abi, parseUnits, formatUnits } from 'viem'
import { motion, AnimatePresence } from 'framer-motion'
import { Droplets, Plus, Minus, ExternalLink, AlertTriangle, Loader2, CheckCircle2, Info, ArrowRight } from 'lucide-react'
import { toast } from 'sonner'
import { TokenIcon } from './TokenIcon'
import { ARC_TOKENS, ARC_CHAIN_ID, UNISWAP_ADDRESSES, feeToLabel, type Token, type FeeTier } from '@/constants/tokens'
import { buildTxExplorerUrl, buildAddressExplorerUrl, requireChain } from '@/onchain-facts'

// NonfungiblePositionManager ABI (subset)
const NPM_ABI = [
  {
    inputs: [{ components: [
      { name: 'token0',          type: 'address' },
      { name: 'token1',          type: 'address' },
      { name: 'fee',             type: 'uint24'  },
      { name: 'tickLower',       type: 'int24'   },
      { name: 'tickUpper',       type: 'int24'   },
      { name: 'amount0Desired',  type: 'uint256' },
      { name: 'amount1Desired',  type: 'uint256' },
      { name: 'amount0Min',      type: 'uint256' },
      { name: 'amount1Min',      type: 'uint256' },
      { name: 'recipient',       type: 'address' },
      { name: 'deadline',        type: 'uint256' },
    ], name: 'params', type: 'tuple' }],
    name: 'mint',
    outputs: [
      { name: 'tokenId',   type: 'uint256' },
      { name: 'liquidity', type: 'uint128' },
      { name: 'amount0',   type: 'uint256' },
      { name: 'amount1',   type: 'uint256' },
    ],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [{ components: [
      { name: 'tokenId',             type: 'uint256' },
      { name: 'liquidity',           type: 'uint128' },
      { name: 'amount0Min',          type: 'uint256' },
      { name: 'amount1Min',          type: 'uint256' },
      { name: 'deadline',            type: 'uint256' },
    ], name: 'params', type: 'tuple' }],
    name: 'decreaseLiquidity',
    outputs: [
      { name: 'amount0', type: 'uint256' },
      { name: 'amount1', type: 'uint256' },
    ],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [{ components: [
      { name: 'tokenId',    type: 'uint256' },
      { name: 'recipient',  type: 'address' },
      { name: 'amount0Max', type: 'uint128' },
      { name: 'amount1Max', type: 'uint128' },
    ], name: 'params', type: 'tuple' }],
    name: 'collect',
    outputs: [
      { name: 'amount0', type: 'uint256' },
      { name: 'amount1', type: 'uint256' },
    ],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    name: 'positions',
    outputs: [
      { name: 'nonce',                    type: 'uint96'  },
      { name: 'operator',                 type: 'address' },
      { name: 'token0',                   type: 'address' },
      { name: 'token1',                   type: 'address' },
      { name: 'fee',                      type: 'uint24'  },
      { name: 'tickLower',                type: 'int24'   },
      { name: 'tickUpper',                type: 'int24'   },
      { name: 'liquidity',                type: 'uint128' },
      { name: 'feeGrowthInside0LastX128', type: 'uint256' },
      { name: 'feeGrowthInside1LastX128', type: 'uint256' },
      { name: 'tokensOwed0',              type: 'uint128' },
      { name: 'tokensOwed1',              type: 'uint128' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'owner', type: 'address' }, { name: 'index', type: 'uint256' }],
    name: 'tokenOfOwnerByIndex',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'owner', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const

// Pool ABI subset for tick spacing
const POOL_ABI = [
  {
    inputs: [], name: 'slot0',
    outputs: [
      { name: 'sqrtPriceX96', type: 'uint160' },
      { name: 'tick', type: 'int24' },
      { name: 'observationIndex', type: 'uint16' },
      { name: 'observationCardinality', type: 'uint16' },
      { name: 'observationCardinalityNext', type: 'uint16' },
      { name: 'feeProtocol', type: 'uint8' },
      { name: 'unlocked', type: 'bool' },
    ],
    stateMutability: 'view', type: 'function',
  },
  {
    inputs: [], name: 'tickSpacing',
    outputs: [{ name: '', type: 'int24' }],
    stateMutability: 'view', type: 'function',
  },
] as const

const FACTORY_ABI = [
  {
    inputs: [{ name: 'tokenA', type: 'address' }, { name: 'tokenB', type: 'address' }, { name: 'fee', type: 'uint24' }],
    name: 'getPool',
    outputs: [{ name: 'pool', type: 'address' }],
    stateMutability: 'view', type: 'function',
  },
] as const

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as const
const FEE_TIERS: FeeTier[] = [100, 500, 3000, 10000]

// Canonical tick ranges per fee tier (full range)
function getTickRange(fee: FeeTier): { tickLower: number; tickUpper: number } {
  const spacing = fee === 100 ? 1 : fee === 500 ? 10 : fee === 3000 ? 60 : 200
  // Use a wide but valid range: ±887272 rounded down to tick-spacing multiple
  const maxTick = Math.floor(887272 / spacing) * spacing
  return { tickLower: -maxTick, tickUpper: maxTick }
}

// Normalise token order so token0 < token1 (address lexicographic)
function sortTokens(a: Token, b: Token): [Token, Token] {
  return a.address.toLowerCase() < b.address.toLowerCase() ? [a, b] : [b, a]
}

interface PositionCardProps {
  tokenId: bigint
  address: `0x${string}`
  onRemove: (tokenId: bigint) => void
}

function PositionCard({ tokenId, address, onRemove }: PositionCardProps) {
  const { data: pos } = useReadContract({
    address: UNISWAP_ADDRESSES.nftPositionManager,
    abi: NPM_ABI,
    functionName: 'positions',
    args: [tokenId],
    chainId: ARC_CHAIN_ID,
  })

  if (!pos || pos[7] === 0n) return null

  const token0 = ARC_TOKENS.find(t => t.address.toLowerCase() === pos[2].toLowerCase())
  const token1 = ARC_TOKENS.find(t => t.address.toLowerCase() === pos[3].toLowerCase())
  const fee = pos[4] as FeeTier

  return (
    <div className="rounded-2xl p-4" style={{ background: 'var(--surface)', border: '1px solid rgba(141,216,159,0.18)' }}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="flex -space-x-1.5">
            {token0 && <TokenIcon symbol={token0.symbol} size={26} />}
            {token1 && <TokenIcon symbol={token1.symbol} size={26} className="-ml-2" />}
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
              {token0?.symbol ?? pos[2].slice(0, 6)}/{token1?.symbol ?? pos[3].slice(0, 6)}
            </p>
            <p className="text-xs" style={{ color: 'var(--subtle)' }}>{feeToLabel(fee)} · ID #{tokenId.toString()}</p>
          </div>
        </div>
        <span className="rounded-lg px-2 py-0.5 text-xs font-semibold" style={{ background: 'rgba(141,216,159,0.12)', color: 'var(--success)' }}>
          Active
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <p className="text-xs mb-0.5" style={{ color: 'var(--subtle)' }}>Liquidity</p>
          <p className="mono text-sm font-medium" style={{ color: 'var(--ink-2)' }}>{pos[7].toString().slice(0, 12)}…</p>
        </div>
        <div>
          <p className="text-xs mb-0.5" style={{ color: 'var(--subtle)' }}>Unclaimed fees</p>
          <p className="mono text-sm font-medium" style={{ color: 'var(--accent)' }}>
            {formatUnits(pos[10], token0?.decimals ?? 6)} / {formatUnits(pos[11], token1?.decimals ?? 6)}
          </p>
        </div>
      </div>

      <div className="flex gap-2">
        <a
          href={buildAddressExplorerUrl(ARC_CHAIN_ID, UNISWAP_ADDRESSES.nftPositionManager)}
          target="_blank" rel="noreferrer"
          className="flex-1 flex items-center justify-center gap-1 rounded-xl py-2 text-xs font-medium transition-opacity hover:opacity-80"
          style={{ background: 'var(--surface-strong)', color: 'var(--ink-2)', border: '1px solid var(--border)' }}
        >
          Explorer <ExternalLink className="size-3" />
        </a>
        <button
          onClick={() => onRemove(tokenId)}
          className="flex-1 flex items-center justify-center gap-1 rounded-xl py-2 text-xs font-medium transition-opacity hover:opacity-80"
          style={{ background: 'rgba(239,68,68,0.10)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}
        >
          <Minus className="size-3" /> Remove
        </button>
      </div>
    </div>
  )
}

// ---------- Add Liquidity Panel ----------
interface AddLiquidityPanelProps {
  onSuccess: () => void
}

function AddLiquidityPanel({ onSuccess }: AddLiquidityPanelProps) {
  const { address, isConnected, chainId } = useAccount()
  const { switchChain } = useSwitchChain()

  const [tokenA, setTokenA] = useState<Token>(ARC_TOKENS[0])
  const [tokenB, setTokenB] = useState<Token>(ARC_TOKENS[1])
  const [fee, setFee] = useState<FeeTier>(500)
  const [amount0, setAmount0] = useState('')
  const [amount1, setAmount1] = useState('')
  const [step, setStep] = useState<'idle' | 'approve0' | 'approve1' | 'mint'>('idle')

  const isWrongChain = isConnected && chainId !== ARC_CHAIN_ID
  const [token0, token1] = sortTokens(tokenA, tokenB)

  const parsedAmt0 = amount0 && !isNaN(+amount0) && +amount0 > 0 ? parseUnits(amount0, token0.decimals) : 0n
  const parsedAmt1 = amount1 && !isNaN(+amount1) && +amount1 > 0 ? parseUnits(amount1, token1.decimals) : 0n

  // Pool check
  const { data: poolAddress } = useReadContract({
    address: UNISWAP_ADDRESSES.factory,
    abi: FACTORY_ABI,
    functionName: 'getPool',
    args: [token0.address as `0x${string}`, token1.address as `0x${string}`, fee],
    chainId: ARC_CHAIN_ID,
  })
  const poolExists = poolAddress && poolAddress !== ZERO_ADDRESS

  // Allowances
  const { data: allowance0, refetch: refetchA0 } = useReadContract({
    address: token0.address as `0x${string}`,
    abi: erc20Abi,
    functionName: 'allowance',
    args: address ? [address, UNISWAP_ADDRESSES.nftPositionManager as `0x${string}`] : undefined,
    chainId: ARC_CHAIN_ID,
    query: { enabled: !!address && parsedAmt0 > 0n },
  })
  const { data: allowance1, refetch: refetchA1 } = useReadContract({
    address: token1.address as `0x${string}`,
    abi: erc20Abi,
    functionName: 'allowance',
    args: address ? [address, UNISWAP_ADDRESSES.nftPositionManager as `0x${string}`] : undefined,
    chainId: ARC_CHAIN_ID,
    query: { enabled: !!address && parsedAmt1 > 0n },
  })
  const needs0 = parsedAmt0 > 0n && allowance0 !== undefined && allowance0 < parsedAmt0
  const needs1 = parsedAmt1 > 0n && allowance1 !== undefined && allowance1 < parsedAmt1

  const { writeContract, data: txHash, isPending } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash })

  // Handle success transitions
  if (isSuccess && txHash) {
    if (step === 'approve0') { void refetchA0(); setStep('approve1') }
    if (step === 'approve1') { void refetchA1(); setStep('mint') }
    if (step === 'mint') { setStep('idle'); setAmount0(''); setAmount1(''); onSuccess() }
  }

  const handleAdd = () => {
    if (!address || !isConnected) return
    if (isWrongChain) { switchChain({ chainId: ARC_CHAIN_ID }); return }

    // Step 1: approve token0
    if (needs0 && step !== 'approve0') {
      setStep('approve0')
      writeContract({
        address: token0.address as `0x${string}`,
        abi: erc20Abi,
        functionName: 'approve',
        args: [UNISWAP_ADDRESSES.nftPositionManager as `0x${string}`, parsedAmt0 * 2n],
        chainId: ARC_CHAIN_ID,
      })
      return
    }
    // Step 2: approve token1
    if (needs1 && step !== 'approve1') {
      setStep('approve1')
      writeContract({
        address: token1.address as `0x${string}`,
        abi: erc20Abi,
        functionName: 'approve',
        args: [UNISWAP_ADDRESSES.nftPositionManager as `0x${string}`, parsedAmt1 * 2n],
        chainId: ARC_CHAIN_ID,
      })
      return
    }
    // Step 3: mint position
    const { tickLower, tickUpper } = getTickRange(fee)
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 600)
    const slippage = 50n // 0.5%
    setStep('mint')
    writeContract({
      address: UNISWAP_ADDRESSES.nftPositionManager,
      abi: NPM_ABI,
      functionName: 'mint',
      args: [{
        token0: token0.address as `0x${string}`,
        token1: token1.address as `0x${string}`,
        fee,
        tickLower,
        tickUpper,
        amount0Desired: parsedAmt0,
        amount1Desired: parsedAmt1,
        amount0Min: parsedAmt0 * (10000n - slippage) / 10000n,
        amount1Min: parsedAmt1 * (10000n - slippage) / 10000n,
        recipient: address,
        deadline,
      }],
      chainId: ARC_CHAIN_ID,
      gas: 500000n,
      maxFeePerGas: 25000000000n,
      value: 0n,
    })
    toast.info('Confirm in wallet to add liquidity…')
  }

  const isLoading = isPending || isConfirming
  const canAdd = isConnected && !isWrongChain && parsedAmt0 > 0n && parsedAmt1 > 0n && !isLoading

  const ctaLabel = !isConnected ? 'Connect Wallet'
    : isWrongChain ? 'Switch to Arc Mainnet'
    : isPending ? 'Confirm in wallet…'
    : isConfirming ? step === 'approve0' ? 'Approving token 0…' : step === 'approve1' ? 'Approving token 1…' : 'Adding liquidity…'
    : needs0 ? `Approve ${token0.symbol}`
    : needs1 ? `Approve ${token1.symbol}`
    : 'Add Liquidity'

  return (
    <div className="space-y-4">
      {/* Token pair selector */}
      <div className="grid grid-cols-2 gap-3">
        {([tokenA, tokenB] as Token[]).map((tok, idx) => (
          <div key={idx}>
            <label className="text-xs mb-1 block" style={{ color: 'var(--subtle)' }}>
              Token {idx === 0 ? 'A' : 'B'}
            </label>
            <select
              value={tok.symbol}
              onChange={e => {
                const t = ARC_TOKENS.find(x => x.symbol === e.target.value)!
                if (idx === 0) { setTokenA(t) } else { setTokenB(t) }
              }}
              className="w-full rounded-xl px-3 py-2.5 text-sm font-semibold appearance-none cursor-pointer"
              style={{ background: 'var(--surface-strong)', color: 'var(--ink)', border: '1px solid var(--border)' }}
            >
              {ARC_TOKENS.filter(t => t.symbol !== (idx === 0 ? tokenB.symbol : tokenA.symbol)).map(t => (
                <option key={t.symbol} value={t.symbol}>{t.symbol}</option>
              ))}
            </select>
          </div>
        ))}
      </div>

      {/* Fee tier */}
      <div>
        <label className="text-xs mb-1.5 block" style={{ color: 'var(--subtle)' }}>Fee Tier</label>
        <div className="grid grid-cols-4 gap-1.5">
          {FEE_TIERS.map(f => (
            <button
              key={f}
              onClick={() => setFee(f)}
              className="rounded-xl py-2 text-xs font-semibold transition-all"
              style={
                fee === f
                  ? { background: 'rgba(45,212,191,0.18)', color: 'var(--accent)', border: '1px solid rgba(45,212,191,0.35)' }
                  : { background: 'var(--surface-strong)', color: 'var(--subtle)', border: '1px solid var(--border)' }
              }
            >
              {feeToLabel(f)}
            </button>
          ))}
        </div>
        {!poolExists && (
          <p className="mt-1.5 text-xs" style={{ color: '#eab308' }}>
            ⚠ No pool found for this pair and fee tier.
          </p>
        )}
      </div>

      {/* Amounts */}
      <div className="space-y-2">
        {([{ tok: token0, val: amount0, set: setAmount0 }, { tok: token1, val: amount1, set: setAmount1 }] as { tok: Token; val: string; set: (v: string) => void }[]).map(({ tok, val, set }, i) => (
          <div key={i} className="rounded-2xl p-4" style={{ background: 'var(--surface-strong)', border: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <TokenIcon symbol={tok.symbol} size={22} />
                <span className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>{tok.symbol}</span>
              </div>
              <span className="text-xs" style={{ color: 'var(--subtle)' }}>{tok.name}</span>
            </div>
            <input
              type="number"
              min="0"
              placeholder="0.00"
              value={val}
              onChange={e => set(e.target.value)}
              className="w-full bg-transparent text-xl font-medium outline-none tabular-nums"
              style={{ color: 'var(--ink)' }}
            />
          </div>
        ))}
      </div>

      {/* Step indicator */}
      {step !== 'idle' && (
        <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--muted)' }}>
          {['approve0', 'approve1', 'mint'].map((s, i) => (
            <span key={s} className="flex items-center gap-1">
              {i > 0 && <ArrowRight className="size-3" />}
              <span style={{ color: step === s ? 'var(--accent)' : step > s ? 'var(--success)' : 'var(--subtle)' }}>
                {s === 'approve0' ? `Approve ${token0.symbol}` : s === 'approve1' ? `Approve ${token1.symbol}` : 'Mint Position'}
              </span>
            </span>
          ))}
        </div>
      )}

      {/* CTA */}
      <button
        onClick={handleAdd}
        disabled={!canAdd}
        className="w-full rounded-2xl py-3.5 text-sm font-bold transition-all btn-accent disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {isLoading ? <Loader2 className="inline size-4 animate-spin mr-2" /> : <Plus className="inline size-4 mr-2" />}
        {ctaLabel}
      </button>

      {isSuccess && txHash && step === 'idle' && (
        <div className="flex items-center justify-between rounded-xl px-4 py-3" style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-4" style={{ color: '#22c55e' }} />
            <span className="text-sm font-medium" style={{ color: '#22c55e' }}>Liquidity added!</span>
          </div>
          <a href={buildTxExplorerUrl(ARC_CHAIN_ID, txHash)} target="_blank" rel="noreferrer"
            className="text-xs flex items-center gap-1" style={{ color: 'var(--accent)' }}>
            View <ExternalLink className="size-3" />
          </a>
        </div>
      )}
    </div>
  )
}

// ---------- Main LiquidityView ----------
export function LiquidityView() {
  const { address, isConnected } = useAccount()
  const [tab, setTab] = useState<'add' | 'positions'>('add')

  const { data: balance, refetch: refetchBalance } = useReadContract({
    address: UNISWAP_ADDRESSES.nftPositionManager,
    abi: NPM_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    chainId: ARC_CHAIN_ID,
    query: { enabled: !!address },
  })

  const handleSuccess = useCallback(() => {
    toast.success('Liquidity position created!')
    void refetchBalance()
    setTab('positions')
  }, [refetchBalance])

  const posIds: bigint[] = Array.from({ length: balance ? Number(balance) : 0 }, (_, i) => BigInt(i))

  return (
    <div className="mx-auto w-full max-w-lg">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <Droplets className="size-5" style={{ color: 'var(--accent)' }} />
          <h2 className="display text-2xl font-semibold" style={{ color: 'var(--ink)' }}>
            Liquidity
          </h2>
        </div>
        <p className="text-sm" style={{ color: 'var(--muted)' }}>
          Provide liquidity to Uniswap v4 pools on Arc mainnet and earn swap fees.
        </p>
      </div>

      {/* Info banner */}
      <div className="mb-5 flex items-start gap-2.5 rounded-2xl px-4 py-3 text-xs"
        style={{ background: 'rgba(172,198,233,0.08)', border: '1px solid rgba(172,198,233,0.15)' }}>
        <Info className="mt-0.5 size-3.5 shrink-0" style={{ color: 'var(--accent)' }} />
        <p style={{ color: 'var(--muted)' }}>
          Positions are created as full-range Uniswap v4 NFTs. You earn fees proportional to your pool share on every swap through EarthSwap and Uniswap. Full-range positions are always active but may earn less than concentrated positions.
        </p>
      </div>

      {/* Tab switcher */}
      <div className="mb-5 flex rounded-xl p-1 gap-1" style={{ background: 'var(--surface-strong)', border: '1px solid var(--border)' }}>
        {(['add', 'positions'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="flex-1 rounded-lg py-2 text-sm font-semibold transition-all"
            style={
              tab === t
                ? { background: 'rgba(45,212,191,0.14)', color: 'var(--accent)' }
                : { color: 'var(--subtle)' }
            }
          >
            {t === 'add' ? '+ Add Liquidity' : `My Positions${balance && balance > 0n ? ` (${balance})` : ''}`}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {tab === 'add' && (
          <motion.div key="add" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="rounded-2xl p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <AddLiquidityPanel onSuccess={handleSuccess} />
          </motion.div>
        )}

        {tab === 'positions' && (
          <motion.div key="pos" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
            {!isConnected ? (
              <div className="rounded-2xl p-8 text-center" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <Droplets className="mx-auto mb-3 size-8 opacity-30" style={{ color: 'var(--accent)' }} />
                <p className="text-sm" style={{ color: 'var(--subtle)' }}>Connect your wallet to see your positions.</p>
              </div>
            ) : !balance || balance === 0n ? (
              <div className="rounded-2xl p-8 text-center" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <Droplets className="mx-auto mb-3 size-8 opacity-30" style={{ color: 'var(--accent)' }} />
                <p className="text-sm mb-3" style={{ color: 'var(--subtle)' }}>You have no open positions yet.</p>
                <button
                  onClick={() => setTab('add')}
                  className="rounded-xl px-4 py-2 text-sm font-semibold btn-accent"
                >
                  Add your first position
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {posIds.map((id, i) => (
                  <PositionTokenIdResolver key={i} index={i} owner={address!} onRemove={() => {}} />
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mainnet warning */}
      <div className="mt-4 flex items-center gap-2 rounded-xl px-4 py-2.5"
        style={{ background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.25)' }}>
        <AlertTriangle className="size-3.5 shrink-0" style={{ color: '#eab308' }} />
        <span className="text-xs" style={{ color: '#ca8a04' }}>
          Arc Mainnet — adding liquidity uses real USDC and is irreversible.
        </span>
      </div>
    </div>
  )
}

// Resolve tokenId by index for positions tab
function PositionTokenIdResolver({ index, owner, onRemove }: { index: number; owner: `0x${string}`; onRemove: (id: bigint) => void }) {
  const { data: tokenId } = useReadContract({
    address: UNISWAP_ADDRESSES.nftPositionManager,
    abi: NPM_ABI,
    functionName: 'tokenOfOwnerByIndex',
    args: [owner, BigInt(index)],
    chainId: ARC_CHAIN_ID,
  })
  if (!tokenId) return null
  return <PositionCard tokenId={tokenId} address={owner} onRemove={onRemove} />
}
