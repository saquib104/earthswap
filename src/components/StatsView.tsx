import { useReadContract } from 'wagmi'
import { erc20Abi } from 'viem'
import { ExternalLink, Shield } from 'lucide-react'
import { ARC_TOKENS, ARC_CHAIN_ID, UNISWAP_ADDRESSES } from '@/constants/tokens'
import { buildAddressExplorerUrl } from '@/onchain-facts'
import { TokenIcon } from './TokenIcon'

function TokenStatRow({ token }: { token: typeof ARC_TOKENS[0] }) {
  const { data: supply } = useReadContract({
    address: token.address as `0x${string}`,
    abi: erc20Abi,
    functionName: 'totalSupply',
    chainId: ARC_CHAIN_ID,
  })

  const formattedSupply = supply !== undefined
    ? (Number(supply) / 10 ** token.decimals).toLocaleString('en-US', { maximumFractionDigits: 2 })
    : '—'

  return (
    <div className="flex items-center justify-between py-3" style={{ borderBottom: '1px solid var(--border)' }}>
      <div className="flex items-center gap-3">
        <TokenIcon symbol={token.symbol} size={32} />
        <div>
          <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>{token.symbol}</p>
          <p className="text-xs" style={{ color: 'var(--subtle)' }}>{token.name} · {token.decimals} decimals</p>
        </div>
      </div>
      <div className="text-right">
        <p className="mono text-sm tabular-nums" style={{ color: 'var(--ink-2)' }}>
          {formattedSupply}
        </p>
        <a
          href={buildAddressExplorerUrl(ARC_CHAIN_ID, token.address)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-xs"
          style={{ color: 'var(--subtle)' }}
        >
          {token.address.slice(0, 6)}…{token.address.slice(-4)} <ExternalLink className="size-2.5" />
        </a>
      </div>
    </div>
  )
}

export function StatsView() {
  return (
    <div className="mx-auto w-full max-w-2xl space-y-5">
      <div>
        <h2 className="display text-2xl font-semibold mb-1" style={{ color: 'var(--ink)' }}>Stats</h2>
        <p className="text-sm" style={{ color: 'var(--muted)' }}>
          Live on-chain token data on Arc mainnet.
        </p>
      </div>

      {/* Token registry */}
      <div className="rounded-2xl p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <h3 className="display text-base font-semibold mb-4" style={{ color: 'var(--ink)' }}>
          Supported tokens
        </h3>
        <div>
          {ARC_TOKENS.map(token => (
            <TokenStatRow key={token.address} token={token} />
          ))}
        </div>
      </div>

      {/* Protocol contracts */}
      <div className="rounded-2xl p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <h3 className="display text-base font-semibold mb-4" style={{ color: 'var(--ink)' }}>
          Uniswap v4 on Arc
        </h3>
        <div className="space-y-2.5">
          {([
            ['Factory',      UNISWAP_ADDRESSES.factory],
            ['Universal Router', UNISWAP_ADDRESSES.swapRouter02],
            ['Quoter (v3)',  UNISWAP_ADDRESSES.quoterV1],
            ['QuoterV2 (v4)', UNISWAP_ADDRESSES.quoterV4],
            ['Universal Router', UNISWAP_ADDRESSES.universalRouter],
            ['Position NFT', UNISWAP_ADDRESSES.nftPositionManager],
            ['Permit2',      UNISWAP_ADDRESSES.permit2],
          ] as [string, string][]).map(([label, addr]) => (
            <div key={addr} className="flex items-center justify-between">
              <span className="text-xs" style={{ color: 'var(--subtle)' }}>{label}</span>
              <a
                href={buildAddressExplorerUrl(ARC_CHAIN_ID, addr)}
                target="_blank"
                rel="noreferrer"
                className="mono inline-flex items-center gap-1 text-xs"
                style={{ color: 'var(--muted)' }}
              >
                {addr.slice(0, 8)}…{addr.slice(-6)} <ExternalLink className="size-2.5" />
              </a>
            </div>
          ))}
        </div>
      </div>

      {/* About EarthSwap */}
      <div className="rounded-2xl p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2 mb-4">
          <Shield className="size-4" style={{ color: 'var(--accent)' }} />
          <h3 className="display text-base font-semibold" style={{ color: 'var(--ink)' }}>
            About EarthSwap
          </h3>
        </div>
        <div className="space-y-3 text-sm" style={{ color: 'var(--muted)' }}>
          <p>
            EarthSwap is a non-custodial AMM interface on Arc mainnet, powered by Uniswap v4 and v4
            smart contracts. Your assets never leave your wallet until you confirm a transaction.
          </p>
          <p>
            Swaps auto-route across fee tiers (0.01%, 0.05%, 0.30%, 1.00%) to find the best price.
            USDC is the native gas token on Arc — all fees are paid in USDC.
          </p>
          <div className="rounded-xl px-3 py-2.5 text-xs" style={{ background: 'rgba(232,109,122,0.08)', color: 'var(--danger)' }}>
            Arc mainnet transactions are irreversible and involve real USDC. Always verify amounts before confirming.
          </div>
        </div>
      </div>
    </div>
  )
}
