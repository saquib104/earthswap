import { useReadContract } from 'wagmi'
import { formatUnits } from 'viem'
import { TrendingUp, Droplets, Activity, ExternalLink } from 'lucide-react'
import { RECOMMENDED_PAIRS, UNISWAP_ADDRESSES, ARC_CHAIN_ID } from '@/constants/tokens'
import type { Token } from '@/constants/tokens'
import { TokenIcon } from './TokenIcon'


// Uniswap v4 Pool ABI (slot0 + liquidity)
const POOL_ABI = [
  { name: 'slot0', type: 'function', stateMutability: 'view', inputs: [], outputs: [
    { name: 'sqrtPriceX96', type: 'uint160' },
    { name: 'tick', type: 'int24' },
    { name: 'observationIndex', type: 'uint16' },
    { name: 'observationCardinality', type: 'uint16' },
    { name: 'observationCardinalityNext', type: 'uint16' },
    { name: 'feeProtocol', type: 'uint8' },
    { name: 'unlocked', type: 'bool' },
  ]},
  { name: 'liquidity', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint128' }]},
  { name: 'token0', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'address' }]},
  { name: 'token1', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'address' }]},
] as const

const V3_FACTORY_ABI = [
  { name: 'getPool', type: 'function', stateMutability: 'view',
    inputs: [{ name: 'tokenA', type: 'address' }, { name: 'tokenB', type: 'address' }, { name: 'fee', type: 'uint24' }],
    outputs: [{ name: 'pool', type: 'address' }]
  },
] as const

const ZERO_ADDR = '0x0000000000000000000000000000000000000000'

function sqrtPriceX96ToPrice(sqrtPriceX96: bigint, decimals0: number, decimals1: number): number {
  const Q96 = 2 ** 96
  const price = (Number(sqrtPriceX96) / Q96) ** 2
  return price * (10 ** decimals0) / (10 ** decimals1)
}

function formatPrice(price: number, symbolOut: string): string {
  if (symbolOut === 'cirBTC') return price.toFixed(8)
  if (price < 0.001) return price.toExponential(4)
  if (price < 1) return price.toFixed(6)
  return price.toFixed(4)
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <div className="flex items-center gap-1">
      <div className="size-1.5 rounded-full" style={{ background: active ? '#22c55e' : '#6b7280' }} />
      <span className="text-xs" style={{ color: active ? '#22c55e' : 'var(--subtle)' }}>
        {active ? 'Active' : 'No pool'}
      </span>
    </div>
  )
}

function MarketCard({ tokenA, tokenB, fee }: { tokenA: Token; tokenB: Token; fee: number }) {
  const { data: poolAddress } = useReadContract({
    address: UNISWAP_ADDRESSES.factory,
    abi: V3_FACTORY_ABI,
    functionName: 'getPool',
    args: [tokenA.address as `0x${string}`, tokenB.address as `0x${string}`, fee],
    chainId: ARC_CHAIN_ID,
  })

  const hasPool = poolAddress && poolAddress !== ZERO_ADDR

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

  const { data: token0Address } = useReadContract({
    address: poolAddress as `0x${string}`,
    abi: POOL_ABI,
    functionName: 'token0',
    chainId: ARC_CHAIN_ID,
    query: { enabled: !!hasPool },
  })

  // Determine which token is token0 to orient the price correctly
  const isTokenAFirst = token0Address?.toLowerCase() === tokenA.address.toLowerCase()
  const baseToken = isTokenAFirst ? tokenA : tokenB
  const quoteToken = isTokenAFirst ? tokenB : tokenA

  let price: number | null = null
  if (slot0 && slot0[0] > 0n) {
    const rawPrice = sqrtPriceX96ToPrice(slot0[0], baseToken.decimals, quoteToken.decimals)
    // orient so we show tokenA per tokenB
    price = isTokenAFirst ? 1 / rawPrice : rawPrice
  }

  const liquidityFormatted = liquidity
    ? (Number(formatUnits(liquidity, 6)) / 1000).toFixed(1) + 'K'
    : null

  const feeLabel = `${(fee / 10000).toFixed(2)}%`
  const poolExplorerUrl = poolAddress && hasPool
    ? `https://explorer.arc.io/address/${poolAddress}`
    : null

  return (
    <div
      className="rounded-2xl p-5 transition-all hover:scale-[1.005]"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
    >
      {/* Pair header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          {/* Token pair avatars */}
          <div className="relative flex items-center">
            <TokenIcon symbol={tokenA.symbol} size={36} />
            <TokenIcon symbol={tokenB.symbol} size={36} className="-ml-3" />
          </div>
          <div>
            <div className="font-700 text-base" style={{ color: 'var(--ink)', fontFamily: 'var(--font-display)' }}>
              {tokenA.symbol} / {tokenB.symbol}
            </div>
            <div className="text-xs mt-0.5" style={{ color: 'var(--subtle)' }}>
              Fee tier: {feeLabel}
            </div>
          </div>
        </div>
        <StatusBadge active={!!hasPool} />
      </div>

      {hasPool ? (
        <>
          {/* Price */}
          <div className="mb-4">
            <div className="text-xs font-medium mb-1" style={{ color: 'var(--subtle)' }}>Current Rate</div>
            {price !== null ? (
              <div className="text-2xl font-700 tabular-nums" style={{ color: 'var(--ink)', fontFamily: 'var(--font-display)' }}>
                {formatPrice(price, tokenB.symbol)}
                <span className="text-sm font-400 ml-2" style={{ color: 'var(--subtle)' }}>
                  {tokenA.symbol} per {tokenB.symbol}
                </span>
              </div>
            ) : (
              <div className="h-8 w-32 rounded-lg animate-pulse" style={{ background: 'var(--surface-muted)' }} />
            )}
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="rounded-xl p-3" style={{ background: 'var(--surface-muted)' }}>
              <div className="flex items-center gap-1 mb-1">
                <Droplets className="size-3" style={{ color: 'var(--accent)' }} />
                <span className="text-xs" style={{ color: 'var(--subtle)' }}>Liquidity</span>
              </div>
              <div className="text-sm font-700 tabular-nums" style={{ color: 'var(--ink)' }}>
                {liquidityFormatted ?? '—'}
              </div>
            </div>
            <div className="rounded-xl p-3" style={{ background: 'var(--surface-muted)' }}>
              <div className="flex items-center gap-1 mb-1">
                <TrendingUp className="size-3" style={{ color: 'var(--accent)' }} />
                <span className="text-xs" style={{ color: 'var(--subtle)' }}>Fee</span>
              </div>
              <div className="text-sm font-700 tabular-nums" style={{ color: 'var(--ink)' }}>
                {feeLabel}
              </div>
            </div>
            <div className="rounded-xl p-3" style={{ background: 'var(--surface-muted)' }}>
              <div className="flex items-center gap-1 mb-1">
                <Activity className="size-3" style={{ color: 'var(--accent)' }} />
                <span className="text-xs" style={{ color: 'var(--subtle)' }}>Settlement</span>
              </div>
              <div className="text-sm font-700" style={{ color: '#22c55e' }}>Arc</div>
            </div>
          </div>

          {/* Pool address */}
          {poolAddress && poolExplorerUrl && (
            <a
              href={poolExplorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 transition-opacity hover:opacity-80"
            >
              <span className="mono text-xs" style={{ color: 'var(--subtle)' }}>
                {poolAddress.slice(0, 10)}...{poolAddress.slice(-8)}
              </span>
              <ExternalLink className="size-3" style={{ color: 'var(--subtle)' }} />
            </a>
          )}
        </>
      ) : (
        <div className="text-center py-4">
          <div className="text-sm" style={{ color: 'var(--subtle)' }}>No pool deployed yet for this pair.</div>
        </div>
      )}
    </div>
  )
}

export function MarketsView() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="display text-2xl font-700 tracking-tight mb-1" style={{ color: 'var(--ink)' }}>
          Stablecoin FX Markets
        </h2>
        <p className="text-sm" style={{ color: 'var(--subtle)' }}>
          Live onchain rates from Uniswap v4 liquidity pools on Arc Mainnet. Prices update every 15s.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {RECOMMENDED_PAIRS.map(({ tokenA, tokenB, fee }) => (
          <MarketCard
            key={`${tokenA.address}-${tokenB.address}-${fee}`}
            tokenA={tokenA}
            tokenB={tokenB}
            fee={fee}
          />
        ))}
      </div>

      <div
        className="rounded-2xl p-4 flex items-start gap-3"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        <Activity className="size-4 mt-0.5 shrink-0" style={{ color: 'var(--accent)' }} />
        <div className="text-xs" style={{ color: 'var(--subtle)' }}>
          Rates are read directly from Arc mainnet pool contracts. No price feeds or oracles — all data is onchain. 24h change and volume metrics require an indexer and will be available in a future update.
        </div>
      </div>
    </div>
  )
}
