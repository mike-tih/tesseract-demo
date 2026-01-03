import { useReadContract, useReadContracts, useChainId } from 'wagmi'
import { getVaultAddress, VAULT_ABI, ERC4626_ABI } from '../config/contracts'
import { formatUnits } from 'viem'

export interface StrategyInfo {
  address: string
  name: string
  symbol: string
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

  // Batch read all strategy details using useReadContracts
  const { data: strategiesData, isLoading: loadingStrategies } = useReadContracts({
    contracts: queue.map((strategyAddress) => ({
      address: vaultAddress,
      abi: VAULT_ABI,
      functionName: 'strategies',
      args: [strategyAddress],
    })),
    query: {
      enabled: !!vaultAddress && queue.length > 0,
      refetchInterval: 30000,
    },
  })

  // Batch read strategy metadata (name and symbol)
  const { data: metadataData, isLoading: loadingMetadata } = useReadContracts({
    contracts: queue.flatMap((strategyAddress) => [
      {
        address: strategyAddress,
        abi: ERC4626_ABI,
        functionName: 'name',
      },
      {
        address: strategyAddress,
        abi: ERC4626_ABI,
        functionName: 'symbol',
      },
    ]),
    query: {
      enabled: !!vaultAddress && queue.length > 0,
      refetchInterval: 30000,
    },
  })

  // Map the results to StrategyInfo format
  const strategies: StrategyInfo[] = queue.map((strategyAddress, index) => {
    const result = strategiesData?.[index]
    const nameResult = metadataData?.[index * 2]
    const symbolResult = metadataData?.[index * 2 + 1]

    const name = nameResult?.status === 'success' ? (nameResult.result as string) : strategyAddress
    const symbol = symbolResult?.status === 'success' ? (symbolResult.result as string) : ''

    if (!result || result.status !== 'success' || !result.result) {
      return {
        address: strategyAddress,
        name,
        symbol,
        currentDebt: 0,
        maxDebt: 0,
        isActive: false,
      }
    }

    // strategyData is a struct: (activation, last_report, current_debt, max_debt)
    const [, , currentDebt, maxDebt] = result.result as unknown as [bigint, bigint, bigint, bigint]

    return {
      address: strategyAddress,
      name,
      symbol,
      currentDebt: parseFloat(formatUnits(currentDebt, 6)),
      maxDebt: parseFloat(formatUnits(maxDebt, 6)),
      isActive: currentDebt > 0n || maxDebt > 0n,
    }
  })

  return {
    strategies,
    queue,
    isLoading: loadingQueue || loadingStrategies || loadingMetadata,
  }
}
