import { useAccount, useReadContract } from 'wagmi'
import { erc20Abi } from 'viem'
import { getUsdc } from '@/onchain-facts'
import { Amount, usdcDecimalsFor } from '@/onchain-money'
import { ARC_CHAIN_ID } from '@/constants/tokens'

export function useUsdcBalance() {
  const { address } = useAccount()
  const usdc = getUsdc(ARC_CHAIN_ID)

  const { data: rawBalance, isLoading, refetch } = useReadContract({
    address: usdc?.address as `0x${string}`,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    chainId: ARC_CHAIN_ID,
    query: { enabled: !!address && !!usdc },
  })

  const formatted =
    rawBalance !== undefined
      ? Amount.fromRaw(rawBalance, usdcDecimalsFor(ARC_CHAIN_ID)).toFixed(2)
      : undefined

  return { rawBalance, formatted, isLoading, refetch }
}
