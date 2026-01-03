import { useReadContract, useChainId } from 'wagmi'
import { getVaultAddress, VAULT_ABI } from '../config/contracts'
import { formatUnits } from 'viem'

export function useVaultData() {
  const chainId = useChainId()
  const vaultAddress = getVaultAddress(chainId)

  const { data: totalAssets, isLoading: loadingAssets } = useReadContract({
    address: vaultAddress,
    abi: VAULT_ABI,
    functionName: 'totalAssets',
    query: {
      enabled: !!vaultAddress,
      refetchInterval: 10000, // Refresh every 10 seconds
    },
  })

  const { data: totalSupply, isLoading: loadingSupply } = useReadContract({
    address: vaultAddress,
    abi: VAULT_ABI,
    functionName: 'totalSupply',
    query: {
      enabled: !!vaultAddress,
      refetchInterval: 10000,
    },
  })

  // Format values (USDC has 6 decimals)
  const formattedTotalAssets = totalAssets
    ? parseFloat(formatUnits(totalAssets as bigint, 6))
    : 0

  const formattedTotalSupply = totalSupply
    ? parseFloat(formatUnits(totalSupply as bigint, 6))
    : 0

  return {
    totalAssets: formattedTotalAssets,
    totalSupply: formattedTotalSupply,
    isLoading: loadingAssets || loadingSupply,
  }
}
