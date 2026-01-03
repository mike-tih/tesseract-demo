import { useReadContract, useChainId } from 'wagmi'
import { getVaultAddress, VAULT_ABI } from '../config/contracts'
import { formatUnits } from 'viem'

export interface StrategyInfo {
  address: string
  currentDebt: number
  maxDebt: number
  isActive: boolean
}

export function useStrategies() {
  const chainId = useChainId()
  const vaultAddress = getVaultAddress(chainId)

  // Get the default queue (list of strategy addresses)
  const { data: queueData, isLoading: loadingQueue } = useReadContract({
    address: vaultAddress,
    abi: VAULT_ABI,
    functionName: 'get_default_queue',
    query: {
      enabled: !!vaultAddress,
      refetchInterval: 30000,
    },
  })

  const queue = (queueData as `0x${string}`[]) || []

  // For each strategy, fetch its details
  // Note: In production, you might want to batch these calls
  const strategies: StrategyInfo[] = queue.map((strategyAddress) => {
    // Get strategy params (returns struct with current_debt, max_debt, etc)
    const { data: strategyData } = useReadContract({
      address: vaultAddress,
      abi: VAULT_ABI,
      functionName: 'strategies',
      args: [strategyAddress],
      query: {
        enabled: !!vaultAddress,
        refetchInterval: 30000,
      },
    })

    if (!strategyData) {
      return {
        address: strategyAddress,
        currentDebt: 0,
        maxDebt: 0,
        isActive: false,
      }
    }

    // strategyData is a struct: (activation, last_report, current_debt, max_debt)
    const [, , currentDebt, maxDebt] = strategyData as [bigint, bigint, bigint, bigint]

    return {
      address: strategyAddress,
      currentDebt: parseFloat(formatUnits(currentDebt, 6)),
      maxDebt: parseFloat(formatUnits(maxDebt, 6)),
      isActive: currentDebt > 0n || maxDebt > 0n,
    }
  })

  return {
    strategies,
    queue,
    isLoading: loadingQueue,
  }
}
