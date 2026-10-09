# EarthSwap ⚡

**Stablecoin FX, built on Arc.**

EarthSwap is an open-source, non-custodial AMM and cross-chain bridge built on Arc mainnet. It lets anyone swap stablecoins, bridge USDC via Circle CCTP, add liquidity to Uniswap v3 pools, and buy USDC via Circle's fiat onramp — all from a single interface with transparent pricing and onchain settlement.

🌐 **Live app:** https://earthswap.netlify.app
📦 **GitHub:** https://github.com/saquib104/earthswap

---

## Features

| Feature | Status | Description |
|---|---|---|
| **Token Swap** | ✅ Live | Uniswap v3 swaps (quote + execution both via SwapRouter02) with live quotes, slippage control, and fee-tier auto-routing |
| **FX Quote Engine** | ✅ Live | Professional breakdown: exchange rate, price impact, liquidity fee, minimum received, network fee, route, settlement time |
| **Why this rate?** | ✅ Live | Expandable panel showing pool depth, fee tier, and effective rate for every quote |
| **Bridge** | ✅ Live | Cross-chain USDC bridging via Circle CCTP v2 — Arc ↔ Ethereum, Base, Arbitrum One, Polygon, OP Mainnet, Avalanche |
| **Add Liquidity** | ✅ Live | Add Uniswap v3 liquidity positions directly from EarthSwap with dual-token approval flow |
| **Buy USDC** | ✅ Live | Circle-hosted fiat onramp — card, Apple Pay/Google Pay, ACH bank transfer. Estimate is indicative; actual amount set at Circle checkout. |
| **Markets** | ✅ Live | Live onchain pool rates for all supported pairs |
| **Pools** | ✅ Live | Pool state per fee tier for all supported pairs |
| **Activity** | ✅ Live | Real-time Uniswap v3 Swap event feed (last 500 blocks, 30s auto-refresh) |
| **Docs** | ✅ Live | Full in-app documentation: architecture, contracts, assets, fees, security |
| **Protocol Fee Router** | 🔶 Deployed, pending v4 upgrade | EarthSwapRouter.sol deployed on Arc mainnet. Currently routing swaps via SwapRouter02 directly while a v3-compatible fee path is finalised. |

---

## Supported Tokens (Arc Mainnet)

| Token | Address | Decimals |
|---|---|---|
| USDC | `0x3600000000000000000000000000000000000000` | 6 |
| EURC | `0x808080808080808080808080808080808080800a` | 6 |
| USYC | `0x4c9EDD5852cd905f086C759E8383e09bff1E68B3` | 6 |
| cirBTC | `0x0000000000000000000000000000000000000002` | 8 |
| WETH | `0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599` | 18 |

---

## Supported Bridge Chains (CCTP v2)

Arc ↔ **Ethereum · Base · Arbitrum One · Polygon · OP Mainnet · Avalanche**

All chains use Circle's native CCTP. USDC is burned on source and natively minted on destination — no wrapped tokens, no liquidity pools.

---

## Architecture

```
User (MetaMask / EVM wallet)
        │
        ▼
EarthSwap UI (React + Viem + Wagmi)
        │
   ┌────┴────┐
   ▼         ▼
Swap        Bridge
   │         │
   ▼         ▼
Uniswap v3  Circle CCTP v2
SwapRouter02  (AppKit)
   │         │
   └────┬────┘
        ▼
   Arc Mainnet
   (Chain ID: 5042)
   USDC = native gas
```

**Swap routing:**
- Quote: Uniswap v3 QuoterV1 (`quoteExactInputSingle`) — tries all 4 fee tiers, returns best output
- Execution: Uniswap v3 SwapRouter02 (`exactInputSingle`) — same fee tier as quoted
- Quote and execution use the same router interface, ensuring the displayed rate matches the executed rate

**Bridge routing:**
- Circle AppKit + CCTP v2 — approve → burn → Circle attestation → mint
- Step progress reflects the overall SDK outcome; per-step transaction hashes are managed internally by the Circle SDK

---

## Smart Contracts (Arc Mainnet)

| Contract | Address | Notes |
|---|---|---|
| EarthSwapRouter | `0x23ACd156ea1A85C40631b6314fEFa9C9D369f427` | Protocol fee router — 0.15% fee, pull-model treasury. Currently pending integration into active swap path. |
| Uniswap v3 SwapRouter02 | `0x53BF6B0684Ec7eF91e1387Da3D1a1769bC5A6F77` | Active swap execution router |
| Uniswap v3 QuoterV1 | `0x7DfD4F31be6814D2906BDE155c3e1B146EAc1468` | Live price quotes |
| Uniswap v3 Factory | `0xE18bFE92e1bD09b0f50946C90Fd6b69ed9F6E5d2` | Pool factory |
| USDC (Arc native) | `0x3600000000000000000000000000000000000000` | Native gas + ERC-20 |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS |
| Onchain reads | Viem, Wagmi |
| Wallet connection | ConnectKit |
| Swap protocol | Uniswap v3 (SwapRouter02 + QuoterV1) |
| Bridge protocol | Circle CCTP v2 via @circle-fin/app-kit |
| Fiat onramp | Circle hosted onramp (onramp.circle.com) |
| Animations | Framer Motion |
| Deployment | Netlify |

---

## Development Setup

```bash
git clone https://github.com/saquib104/earthswap.git
cd earthswap
bun install
bun run dev
```

Open http://localhost:5173 in your browser.

**Smart contracts** (Foundry):
```bash
cd contracts
forge build
```

---

## Security

- EarthSwapRouter audited internally (zero High/Medium findings from two independent passes + Slither static analysis)
- No private keys or secrets in frontend — all transactions signed by user's own wallet
- Mainnet warning shown on every swap — users must acknowledge real USDC is at risk
- No admin keys that can affect user funds in the swap flow

---

## License

MIT — see [LICENSE](./LICENSE)
