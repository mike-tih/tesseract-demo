import { useReadContract } from 'wagmi'
import { VAULT_ADDRESS, VAULT_ABI } from '../config/contracts'
import { formatUnits } from 'viem'

export function useVaultData() {
  const { data: totalAssets, isLoading: loadingAssets } = useReadContract({
    address: VAULT_ADDRESS as `0x${string}`,
    abi: VAULT_ABI,
    functionName: 'totalAssets',
    query: {
      refetchInterval: 10000, // Refresh every 10 seconds
    },
  })

  const { data: totalSupply, isLoading: loadingSupply } = useReadContract({
    address: VAULT_ADDRESS as `0x${string}`,
    abi: VAULT_ABI,
    functionName: 'totalSupply',
    query: {
      refetchInterval: 10000,
    },
  })

  const { data: depositLimit, isLoading: loadingLimit } = useReadContract({
    address: VAULT_ADDRESS as `0x${string}`,
    abi: VAULT_ABI,
    functionName: 'deposit_limit',
    query: {
      refetchInterval: 30000,
    },
  })

  // Format values (USDC has 6 decimals)
  const formattedTotalAssets = totalAssets
    ? parseFloat(formatUnits(totalAssets as bigint, 6))
    : 0

  const formattedTotalSupply = totalSupply
    ? parseFloat(formatUnits(totalSupply as bigint, 6))
    : 0

  const formattedDepositLimit = depositLimit
    ? parseFloat(formatUnits(depositLimit as bigint, 6))
    : 0

  return {
    totalAssets: formattedTotalAssets,
    totalSupply: formattedTotalSupply,
    depositLimit: formattedDepositLimit,
    isLoading: loadingAssets || loadingSupply || loadingLimit,
  }
}
