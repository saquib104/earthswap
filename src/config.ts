/**
 * wagmi configuration
 * Built with Arc Studio — https://studio.arc.io
 */

import { http, createConfig } from 'wagmi'
import { mainnet, arc } from 'viem/chains'
import { injected } from 'wagmi/connectors'
import { registerChain } from './tracing'

// Arc mainnet — real USDC, irreversible transactions
registerChain(arc.id, arc.rpcUrls.default.http[0])

export const config = createConfig({
  chains: [arc, mainnet], // mainnet needed for ENS resolution
  connectors: [injected()],
  transports: {
    [arc.id]: http('https://rpc.mainnet.arc.io'),
    [mainnet.id]: http(), // ENS resolution uses mainnet
  },
})
