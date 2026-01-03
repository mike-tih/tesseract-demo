import { useAccount, useReadContract } from 'wagmi'
import { VAULT_ADDRESS, VAULT_ABI, USDC_ADDRESS, ERC20_ABI } from '../config/contracts'
import { formatUnits } from 'viem'

export function useUserPosition() {
  const { address, isConnected } = useAccount()

  // User's share balance in the vault
  const { data: shares, isLoading: loadingShares } = useReadContract({
    address: VAULT_ADDRESS as `0x${string}`,
    abi: VAULT_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && isConnected,
      refetchInterval: 10000,
    },
  })

  // Convert shares to assets (USDC value)
  const { data: assets, isLoading: loadingAssets } = useReadContract({
    address: VAULT_ADDRESS as `0x${string}`,
    abi: VAULT_ABI,
    functionName: 'convertToAssets',
    args: shares ? [shares] : [0n],
    query: {
      enabled: !!shares,
      refetchInterval: 10000,
    },
  })

  // User's USDC balance
  const { data: usdcBalance, isLoading: loadingUsdcBalance } = useReadContract({
    address: USDC_ADDRESS as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && isConnected,
      refetchInterval: 10000,
    },
  })

  // User's USDC allowance for the vault
  const { data: allowance, isLoading: loadingAllowance } = useReadContract({
    address: USDC_ADDRESS as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: address && VAULT_ADDRESS ? [address, VAULT_ADDRESS] : undefined,
    query: {
      enabled: !!address && isConnected && !!VAULT_ADDRESS,
      refetchInterval: 10000,
    },
  })

  const formattedShares = shares ? parseFloat(formatUnits(shares as bigint, 6)) : 0
  const formattedAssets = assets ? parseFloat(formatUnits(assets as bigint, 6)) : 0
  const formattedUsdcBalance = usdcBalance ? parseFloat(formatUnits(usdcBalance as bigint, 6)) : 0
  const formattedAllowance = allowance ? parseFloat(formatUnits(allowance as bigint, 6)) : 0

  return {
    shares: formattedShares,
    assets: formattedAssets,
    usdcBalance: formattedUsdcBalance,
    allowance: formattedAllowance,
    isLoading: loadingShares || loadingAssets || loadingUsdcBalance || loadingAllowance,
    isConnected,
  }
}
