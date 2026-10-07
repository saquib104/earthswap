import { useAccount, useReadContract } from 'wagmi'
import { erc20Abi } from 'viem'
import { ARC_CHAIN_ID } from '@/constants/tokens'
import type { Token } from '@/constants/tokens'

export function useTokenBalance(token: Token | null) {
  const { address } = useAccount()

  const { data: rawBalance, isLoading, refetch } = useReadContract({
    address: token?.address as `0x${string}`,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    chainId: ARC_CHAIN_ID,
    query: { enabled: !!address && !!token },
  })

  const formatted =
    rawBalance !== undefined && token
      ? (Number(rawBalance) / 10 ** token.decimals).toFixed(token.decimals === 6 ? 2 : 4)
      : undefined

  return { rawBalance, formatted, isLoading, refetch }
}
