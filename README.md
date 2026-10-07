# EarthSwap ⚡

**Stablecoin FX, built on Arc.**

EarthSwap is an open-source, non-custodial AMM and cross-chain bridge built on Arc mainnet. It lets anyone swap stablecoins (USDC, EURC, USYC, cirBTC, WETH) and bridge USDC between Arc and all CCTP-supported chains — with transparent pricing, real-time quotes, and onchain settlement.

🌐 **Live app:** https://earthswap.netlify.app

---

## Features

| Feature | Description |
|---|---|
| **Token Swap** | Uniswap v3 powered swaps across all Arc mainnet tokens with live quotes, slippage control, and fee-tier auto-routing |
| **FX Quote Engine** | Professional breakdown: exchange rate, price impact, liquidity fee, minimum received, network fee, route, settlement time |
| **Why this rate?** | Expandable panel showing pool depth, fee tier, and effective rate for every quote |
| **Bridge** | Cross-chain USDC bridging via Circle CCTP v2 — Arc ↔ Ethereum, Base, Arbitrum, Polygon, Optimism, Avalanche, Solana |
| **Markets** | Live onchain pool rates for all 6 supported pairs from Uniswap v3 slot0 |
| **Pools** | TVL, 24h volume, fee generation, and pool utilisation per pair |
| **Activity** | Real-time Uniswap v3 Swap event feed (last 500 blocks, 30s auto-refresh) |
| **Docs** | Full in-app documentation: architecture, contracts, assets, fees, security |

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

## Supported Bridge Chains (CCTP)

Arc ↔ Ethereum · Base · Arbitrum One · Polygon · OP Mainnet · Avalanche · Solana

---

## Architecture

```
User Browser
    │
    ▼
EarthSwap UI (React + wagmi + ConnectKit)
    │
    ├── Swap → Uniswap v3 SwapRouter02 (Arc Mainnet)
    │           QuoterV2 for live quotes
    │           ERC-20 approval → exactInputSingle
    │
    ├── Bridge → Circle CCTP v2 via @circle-fin/app-kit
    │            approve → burn → fetchAttestation → mint
    │
    └── Read → Uniswap v3 Pool slot0 + liquidity
               Uniswap v3 Factory + event logs
               Arc RPC (viem publicClient)

All settlement on Arc Mainnet (Chain ID: 5042)
```

---

## Smart Contracts

### Uniswap v3 on Arc Mainnet

| Contract | Address |
|---|---|
| Factory | `0x1F98431c8aD98523631AE4a59f267346ea31F984` |
| SwapRouter02 | `0x53BF6B0684Ec7eF91e1387Da3D1a1769bC5A6F77` |
| QuoterV2 | `0x61fFE014bA17989E743c5F6cB21bF9697530B21e` |
| NonfungiblePositionManager | `0xC36442b4a4522E871399CD717aBDD847Ab11FE88` |

### EarthSwap Fee Router (pending deployment)

A custom fee-collecting router that earns 0.15% on every swap. Audited (0 High/Medium findings). Deployment pending Circle entity secret setup.

---

## Tech Stack

- **Frontend:** React 18 + TypeScript + Vite
- **Styling:** Tailwind CSS v4 + CSS custom properties
- **Blockchain:** wagmi v2 + viem + ConnectKit
- **Swap:** Uniswap v3 (SwapRouter02 + QuoterV2) on Arc mainnet
- **Bridge:** Circle App Kit v1.15 + CCTP v2
- **Chain:** Arc Mainnet (Chain ID 5042) — USDC as native gas

---

## Local Development

```bash
# Clone
git clone https://github.com/YOUR_USERNAME/earthswap.git
cd earthswap

# Install
bun install

# Run dev server
bun run dev
```

Open http://localhost:5173

---

## Environment Variables

No environment variables are required for local development. The app uses public Arc mainnet RPC endpoints. For the EarthSwapRouter fee contract deployment (optional), add:

```
CIRCLE_API_KEY=your_circle_api_key
CIRCLE_ENTITY_SECRET=your_entity_secret
```

---

## Security

- Non-custodial: the app never holds user funds
- All swaps and bridges require explicit wallet confirmation
- EarthSwapRouter.sol fee contract: 2-round audit (solidity-auditor + functional-auditor), 0 High/Medium findings
- Price impact warnings: Medium (1–3%) and High (>3%) shown before confirmation
- Slippage protection: user-controlled, min-received displayed before every swap

---

## Fee Structure

| Action | Fee |
|---|---|
| Swap (direct Uniswap) | 0% EarthSwap fee + Uniswap LP fee (0.01%–1%) |
| Swap (via EarthSwapRouter, post-deploy) | 0.15% protocol fee + Uniswap LP fee |
| Bridge | 0% EarthSwap fee (Circle CCTP network fee applies) |

---

## License

MIT — see [LICENSE](LICENSE)

---

## Built on Circle's Ecosystem

- **Arc** — settlement layer (USDC as gas, sub-second finality)
- **USDC** — primary stablecoin liquidity
- **EURC** — euro stablecoin liquidity
- **Circle CCTP v2** — native cross-chain USDC transfers
- **@circle-fin/app-kit** — bridge SDK

---

*EarthSwap is an early-stage application. Smart contracts are unaudited on mainnet until EarthSwapRouter deployment. Use at your own risk.*
