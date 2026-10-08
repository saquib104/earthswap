# EarthSwap

> Arc-native stablecoin AMM, FX terminal and bridge — built on Circle's infrastructure

This is the **project memory** - what Arc Studio remembers about building this app.

---

## Deployed Contracts (Arc Mainnet — Chain ID 5042)

| Contract | Address | Notes |
|---|---|---|
| EarthSwapRouter | `0x23ACd156ea1A85C40631b6314fEFa9C9D369f427` | Fee router: 15 bps (0.15%) per swap, treasury: 0xC8cc2d2738C1aFd41bd49899CDFC91374B43873E |

## What This App Does

EarthSwap is an Arc-native stablecoin DEX: token swaps via Uniswap v3 with a 0.15% protocol fee captured by EarthSwapRouter, USDC bridging via Circle CCTP, live pool/market data, and activity feed.

## Tech Stack

- Frontend: React 18, Vite, TypeScript, Tailwind CSS
- Web3: wagmi v2, viem v2, ConnectKit
- Contracts: Solidity 0.8.28 + Foundry. Sources in `contracts/`, unit tests in `contracts/test/*.t.sol`. Build with `bun run contracts:build` (`forge build`), test with `bun run contracts:test` (`forge test`).
- Wallet: injected (MetaMask, etc.)
- Chain: Arc Testnet (Chain ID: 5042002, imported from `viem/chains`)
- Token: USDC (6 decimals) (Address: 0x3600000000000000000000000000000000000000, Chain: Arc Testnet)
- Toasts: Sonner

## Key Files

- `src/App.tsx` - Main application logic
- `src/components/` - UI components
- `src/config.ts` - wagmi config (chains, connectors, transports)

## To Run

```bash
bun install
bun run dev
```
