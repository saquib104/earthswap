/**
 * Token registry for Arc mainnet (chain 5042).
 * All addresses verified from official Arc documentation (docs.arc.io/arc/references/contract-addresses).
 * Verified 2026-10-06.
 *
 * USDC  — native gas token ERC-20, 6 decimals
 * EURC  — euro stablecoin, 6 decimals
 * USYC  — yield-bearing money market fund, 6 decimals (permissioned, but swappable via Uniswap)
 * cirBTC — Circle wrapped BTC, 8 decimals
 * WETH  — bridged ETH from Ethereum, 18 decimals
 *
 * ARC TRAP: NO WETH9 wrapper on Uniswap. WETH above IS an ERC-20 token (not a wrap step).
 * Never send msg.value through Uniswap on Arc — take the ERC-20 approval route for all tokens.
 */

export interface Token {
  address: string
  symbol: string
  name: string
  decimals: number
  /** Color for UI avatar */
  color: string
  /** Short description */
  description?: string
}

// Arc mainnet chain ID
export const ARC_CHAIN_ID = 5042

// Uniswap v3 & v4 contract addresses on Arc mainnet
// Source: @uniswap/sdk-core ARC_ADDRESSES + references/arc.md (verified 2026-09-14)
export const UNISWAP_ADDRESSES = {
  // v3
  factory:           '0xf0db7b58379503491d857dB50AC9ece64c653918',
  swapRouter02:      '0x53BF6B0684Ec7eF91e1387Da3D1a1769bC5A6F77',
  quoterV2:          '0x7DfD4F31be6814D2906BDE155c3e1B146EAc1468',
  nftPositionManager:'0x39654A85A4C05127f5Fd6ED22CAeC077A0fB1377',
  tickLens:          '0x9EB8600665b55d10C1eB2316Ca5127A9cA6E2E76',
  // v4
  poolManager:       '0x8366a39CC670B4001A1121B8F6A443A643e40951',
  positionManager:   '0x6049c9a0e26405C0985f9E3685C87d0aE917f82B',
  stateView:         '0xF3334192D15450CdD385c8B70e03f9A6bD9E673b',
  quoterV4:          '0x8Dc178eFB8111BB0973Dd9d722ebeFF267c98F94',
  // Permit2 (canonical CREATE2)
  permit2:           '0x000000000022D473030F116dDEE9F6B43aC78BA3',
} as const

/**
 * All major tokens with live liquidity on Arc mainnet.
 * Source: https://docs.arc.io/arc/references/contract-addresses.md
 */
export const ARC_TOKENS: Token[] = [
  {
    address:     '0x3600000000000000000000000000000000000000',
    symbol:      'USDC',
    name:        'USD Coin',
    decimals:    6,
    color:       '#2775CA',
    description: 'Circle USD stablecoin — native gas token on Arc',
  },
  {
    address:     '0xbEf5f6d51CB62b58e6A8f77868681825C6fe21c1',
    symbol:      'EURC',
    name:        'Euro Coin',
    decimals:    6,
    color:       '#0057A8',
    description: 'Circle EUR stablecoin',
  },
  {
    address:     '0x8a5D989Bbb96929F689B0200f435f53dA42bF490',
    symbol:      'USYC',
    name:        'US Yield Coin',
    decimals:    6,
    color:       '#16A34A',
    description: 'Yield-bearing tokenized money market fund (institutional)',
  },
  {
    address:     '0x171A4217b86A807A64eB94757Db6849fb4bDbAA0',
    symbol:      'cirBTC',
    name:        'Circle Wrapped BTC',
    decimals:    8,
    color:       '#F7931A',
    description: 'Circle wrapped Bitcoin bridged from Ethereum',
  },
  {
    address:     '0x128cC466B61f542da60c70e3aA11c10e19B84EDB',
    symbol:      'WETH',
    name:        'Wrapped Ether',
    decimals:    18,
    color:       '#627EEA',
    description: 'Bridged ETH from Ethereum (ERC-20, NOT a WETH9 wrap step)',
  },
]

export const USDC_TOKEN  = ARC_TOKENS[0]
export const EURC_TOKEN  = ARC_TOKENS[1]
export const USYC_TOKEN  = ARC_TOKENS[2]
export const CIRBTC_TOKEN = ARC_TOKENS[3]
export const WETH_TOKEN  = ARC_TOKENS[4]

/** Look up a token by address (case-insensitive) */
export function getToken(address: string): Token | undefined {
  const lower = address.toLowerCase()
  return ARC_TOKENS.find(t => t.address.toLowerCase() === lower)
}

// V3 fee tiers (in hundredths of a bip = 1/1,000,000)
export const FEE_TIERS = [100, 500, 3000, 10000] as const
export type FeeTier = (typeof FEE_TIERS)[number]

export function feeToLabel(fee: number): string {
  return `${(fee / 10000).toFixed(2)}%`
}

/**
 * Recommended swap pairs and their best fee tier.
 * Based on expected liquidity on Arc mainnet.
 */
export const RECOMMENDED_PAIRS: Array<{ tokenA: Token; tokenB: Token; fee: FeeTier }> = [
  { tokenA: USDC_TOKEN,   tokenB: EURC_TOKEN,   fee: 100  },  // stablecoin pair → 0.01%
  { tokenA: USDC_TOKEN,   tokenB: USYC_TOKEN,   fee: 100  },  // stablecoin pair → 0.01%
  { tokenA: USDC_TOKEN,   tokenB: CIRBTC_TOKEN, fee: 3000 },  // volatile pair   → 0.30%
  { tokenA: USDC_TOKEN,   tokenB: WETH_TOKEN,   fee: 3000 },  // volatile pair   → 0.30%
  { tokenA: EURC_TOKEN,   tokenB: USYC_TOKEN,   fee: 100  },  // stablecoin pair → 0.01%
  { tokenA: WETH_TOKEN,   tokenB: CIRBTC_TOKEN, fee: 3000 },  // volatile pair   → 0.30%
]

/** Fee tiers to try in order when auto-routing */
export const AUTO_ROUTE_FEE_TIERS: FeeTier[] = [100, 500, 3000, 10000]
