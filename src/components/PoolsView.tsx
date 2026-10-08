import { useReadContract } from 'wagmi'
import { Loader2, Droplets, ExternalLink } from 'lucide-react'
import { ARC_CHAIN_ID, UNISWAP_ADDRESSES, RECOMMENDED_PAIRS, feeToLabel, type Token, type FeeTier } from '@/constants/tokens'
import { buildAddressExplorerUrl } from '@/onchain-facts'
import { TokenIcon } from './TokenIcon'

// V3 Factory ABI — getPool
const FACTORY_ABI = [
  {
    inputs: [
      { name: 'tokenA', type: 'address' },
      { name: 'tokenB', type: 'address' },
      { name: 'fee', type: 'uint24' },
    ],
    name: 'getPool',
    outputs: [{ name: 'pool', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const

// V3 Pool ABI — slot0 + liquidity
const POOL_ABI = [
  {
    inputs: [],
    name: 'slot0',
    outputs: [
      { name: 'sqrtPriceX96', type: 'uint160' },
      { name: 'tick', type: 'int24' },
      { name: 'observationIndex', type: 'uint16' },
      { name: 'observationCardinality', type: 'uint16' },
      { name: 'observationCardinalityNext', type: 'uint16' },
      { name: 'feeProtocol', type: 'uint8' },
      { name: 'unlocked', type: 'bool' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'liquidity',
    outputs: [{ name: '', type: 'uint128' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

function sqrtPriceToPrice(sqrtPriceX96: bigint, decimalsA: number, decimalsB: number): string {
  // price = (sqrtPriceX96 / 2^96)^2 * 10^(decimalsA - decimalsB)
  try {
    const Q96 = 2n ** 96n
    const price = Number((sqrtPriceX96 * sqrtPriceX96 * BigInt(10 ** decimalsA)) / (Q96 * Q96)) / 10 ** decimalsB
    if (price <= 0 || !isFinite(price)) return '—'
    if (price < 0.0001) return price.toExponential(4)
    if (price < 1) return price.toFixed(6)
    if (price < 1000) return price.toFixed(4)
    return price.toFixed(2)
  } catch {
    return '—'
  }
}

interface PoolCardProps {
  tokenA: Token
  tokenB: Token
  fee: FeeTier
}

function PoolCard({ tokenA, tokenB, fee }: PoolCardProps) {
  const { data: poolAddress, isLoading: poolLoading } = useReadContract({
    address: UNISWAP_ADDRESSES.factory,
    abi: FACTORY_ABI,
    functionName: 'getPool',
    args: [tokenA.address as `0x${string}`, tokenB.address as `0x${string}`, fee],
    chainId: ARC_CHAIN_ID,
  })

  const poolExists = poolAddress && poolAddress !== ZERO_ADDRESS

  const { data: slot0Data, isLoading: slot0Loading } = useReadContract({
    address: poolAddress as `0x${string}`,
    abi: POOL_ABI,
    functionName: 'slot0',
    chainId: ARC_CHAIN_ID,
    query: { enabled: !!poolExists },
  })

  const { data: liquidity, isLoading: liquidityLoading } = useReadContract({
    address: poolAddress as `0x${string}`,
    abi: POOL_ABI,
    functionName: 'liquidity',
    chainId: ARC_CHAIN_ID,
    query: { enabled: !!poolExists },
  })

  const isLoading = poolLoading || slot0Loading || liquidityLoading

  const price = slot0Data && poolExists
    ? sqrtPriceToPrice(slot0Data[0], tokenA.decimals, tokenB.decimals)
    : null

  const hasLiquidity = liquidity !== undefined && liquidity > 0n

  return (
    <div
      className="rounded-2xl p-4 transition-all"
      style={{
        background: 'var(--surface)',
        border: `1px solid ${poolExists && hasLiquidity ? 'rgba(141,216,159,0.2)' : 'var(--border)'}`,
        opacity: !poolExists && !poolLoading ? 0.5 : 1,
      }}
    >
      {/* Pool header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {/* Token avatars */}
          <div className="flex -space-x-1.5">
            {[tokenA, tokenB].map((t, i) => (
              <TokenIcon key={t.symbol} symbol={t.symbol} size={28} className={i > 0 ? '-ml-2' : ''} />
            ))}
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
              {tokenA.symbol}/{tokenB.symbol}
            </p>
            <p className="text-xs" style={{ color: 'var(--subtle)' }}>
              {feeToLabel(fee)} fee
            </p>
          </div>
        </div>

        {/* Status badge */}
        {isLoading ? (
          <Loader2 className="size-4 animate-spin" style={{ color: 'var(--subtle)' }} />
        ) : poolExists && hasLiquidity ? (
          <span className="rounded-lg px-2 py-0.5 text-xs font-semibold" style={{ background: 'rgba(141,216,159,0.12)', color: 'var(--success)' }}>
            Active
          </span>
        ) : poolExists ? (
          <span className="rounded-lg px-2 py-0.5 text-xs font-semibold" style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--subtle)' }}>
            Empty
          </span>
        ) : (
          <span className="rounded-lg px-2 py-0.5 text-xs font-semibold" style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--subtle)' }}>
            No pool
          </span>
        )}
      </div>

      {/* Stats */}
      {poolExists && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs mb-0.5" style={{ color: 'var(--subtle)' }}>Price</p>
            <p className="mono text-sm font-medium tabular-nums" style={{ color: 'var(--ink-2)' }}>
              {price ?? '—'} {tokenB.symbol}
            </p>
            <p className="text-xs" style={{ color: 'var(--subtle)' }}>per {tokenA.symbol}</p>
          </div>
          <div>
            <p className="text-xs mb-0.5" style={{ color: 'var(--subtle)' }}>Liquidity</p>
            <p className="mono text-sm font-medium tabular-nums" style={{ color: hasLiquidity ? 'var(--ink-2)' : 'var(--subtle)' }}>
              {liquidity !== undefined ? (hasLiquidity ? liquidity.toString().slice(0, 10) + '…' : '0') : '—'}
            </p>
          </div>
        </div>
      )}

      {/* Explorer link */}
      {poolExists && (
        <a
          href={buildAddressExplorerUrl(ARC_CHAIN_ID, poolAddress)}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-flex items-center gap-1 text-xs"
          style={{ color: 'var(--subtle)' }}
        >
          View pool <ExternalLink className="size-3" />
        </a>
      )}
    </div>
  )
}

export function PoolsView() {
  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="mb-6">
        <h2 className="display text-2xl font-semibold mb-1" style={{ color: 'var(--ink)' }}>
          Liquidity Pools
        </h2>
        <p className="text-sm" style={{ color: 'var(--muted)' }}>
          Live Uniswap v4 pools on Arc mainnet. Prices and liquidity are read directly from chain.
        </p>
      </div>

      {/* Info banner */}
      <div
        className="mb-5 flex items-start gap-2.5 rounded-2xl px-4 py-3 text-xs"
        style={{ background: 'rgba(172,198,233,0.08)', border: '1px solid rgba(172,198,233,0.15)' }}
      >
        <Droplets className="mt-0.5 size-3.5 shrink-0" style={{ color: 'var(--accent)' }} />
        <p style={{ color: 'var(--muted)' }}>
          Pool prices reflect the current on-chain state via Uniswap v4 slot0 reads.
          Active pools show live liquidity. Pools with no liquidity can still be swapped through if another route exists.
        </p>
      </div>

      {/* Pool grid */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {RECOMMENDED_PAIRS.map(({ tokenA, tokenB, fee }) => (
          <PoolCard
            key={`${tokenA.symbol}-${tokenB.symbol}-${fee}`}
            tokenA={tokenA}
            tokenB={tokenB}
            fee={fee}
          />
        ))}
      </div>

      <p className="mt-5 text-center text-xs" style={{ color: 'var(--subtle)' }}>
        Data sourced from Uniswap v4 Factory · Arc mainnet · chain ID 5042
      </p>
    </div>
  )
}
