import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi'
import { useState } from 'react'
import { parseUnits, formatUnits } from 'viem'
import { VAULT_ABI, ROLES } from '../config/contracts'
import { useAdminRole } from '../hooks/useAdminRole'
import { useStrategies } from '../hooks/useStrategies'
import { useVaultData } from '../hooks/useVaultData'
import { RoleManagement } from '../components/RoleManagement'
import { StrategyPieChart } from '../components/StrategyPieChart'

export default function AdminPage() {
  const { address, isConnected } = useAccount()
  const [newStrategyAddress, setNewStrategyAddress] = useState('')
  const [newDepositLimit, setNewDepositLimit] = useState('')
  const [selectedStrategy, setSelectedStrategy] = useState('')
  const [targetDebt, setTargetDebt] = useState('')

  // Fetch admin status and data
  const { isAdmin, isRoleManager, canAddStrategy, canManageDebt, canManageQueue, isLoading: loadingRole, vaultAddress, chainId, roles } = useAdminRole()
  const { strategies, queue, isLoading: loadingStrategies } = useStrategies()
  const { totalAssets } = useVaultData()

  // Read current deposit limit
  const { data: depositLimitData, refetch: refetchDepositLimit } = useReadContract({
    address: vaultAddress,
    abi: VAULT_ABI,
    functionName: 'deposit_limit',
    query: {
      enabled: !!vaultAddress,
      refetchInterval: 30000,
    },
  })

  // Read total idle and total debt
  const { data: totalIdleData } = useReadContract({
    address: vaultAddress,
    abi: VAULT_ABI,
    functionName: 'totalIdle',
    query: {
      enabled: !!vaultAddress,
      refetchInterval: 30000,
    },
  })

  const { data: totalDebtData } = useReadContract({
    address: vaultAddress,
    abi: VAULT_ABI,
    functionName: 'totalDebt',
    query: {
      enabled: !!vaultAddress,
      refetchInterval: 30000,
    },
  })

  const depositLimit = depositLimitData ? parseFloat(formatUnits(depositLimitData as bigint, 6)) : 0
  const totalIdle = totalIdleData ? parseFloat(formatUnits(totalIdleData as bigint, 6)) : 0
  const totalDebt = totalDebtData ? parseFloat(formatUnits(totalDebtData as bigint, 6)) : 0
  const canManageDepositLimit = isAdmin || (roles & ROLES.DEPOSIT_LIMIT_MANAGER) !== 0n

  // Calculate max allocatable based on strategy max_debt limits
  const maxAllocatable = strategies.reduce((sum, s) => sum + s.maxDebt, 0) - totalDebt

  // Contract writes
  const { writeContract: writeAddStrategy, data: addStrategyHash } = useWriteContract()
  const { writeContract: writeUpdateDebt, data: updateDebtHash } = useWriteContract()
  const { writeContract: writeSetDepositLimit, data: setDepositLimitHash } = useWriteContract()
  const { writeContract: writeProcessReport, data: processReportHash } = useWriteContract()

  // Transaction confirmations
  const { isLoading: isAddingStrategy } = useWaitForTransactionReceipt({ hash: addStrategyHash })
  const { isLoading: isUpdatingDebt } = useWaitForTransactionReceipt({ hash: updateDebtHash })
  const { isLoading: isSettingDepositLimit } = useWaitForTransactionReceipt({ hash: setDepositLimitHash })
  const { isLoading: isProcessingReport } = useWaitForTransactionReceipt({ hash: processReportHash })

  const networkName = chainId === 1 ? 'Mainnet' : chainId === 11155111 ? 'Sepolia' : 'Unknown'

  if (!isConnected) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="card text-center max-w-md">
          <h2 className="text-2xl font-bold mb-4">Connect Your Wallet</h2>
          <p className="text-slate-400">
            Please connect your wallet to access the admin panel
          </p>
        </div>
      </div>
    )
  }

  if (!vaultAddress) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="card bg-error/10 border-error/30 text-center max-w-md">
          <h2 className="text-2xl font-bold text-error mb-4">⚠️ Configuration Error</h2>
          <p className="text-slate-400 mb-4">
            Vault address is not configured for <strong>{networkName}</strong>
          </p>
          <p className="text-sm text-slate-500">
            Please add <code className="bg-slate-700 px-2 py-1 rounded">
              VITE_{networkName.toUpperCase()}_VAULT_ADDRESS
            </code> to your .env file
          </p>
        </div>
      </div>
    )
  }

  if (loadingRole) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="card text-center max-w-md">
          <h2 className="text-2xl font-bold mb-4">Loading...</h2>
          <p className="text-slate-400">
            Checking admin privileges...
          </p>
        </div>
      </div>
    )
  }

  if (!isAdmin && !canAddStrategy && !canManageDebt && !canManageQueue) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="card bg-error/10 border-error/30 text-center max-w-md">
          <h2 className="text-2xl font-bold text-error mb-4">Access Denied</h2>
          <p className="text-slate-400">
            You do not have admin privileges for this vault
          </p>
          <p className="text-sm text-slate-500 mt-4">
            Connected: {address}
          </p>
        </div>
      </div>
    )
  }

  const handleAddStrategy = async () => {
    if (!newStrategyAddress || !canAddStrategy || !vaultAddress) return

    try {
      writeAddStrategy({
        address: vaultAddress,
        abi: VAULT_ABI,
        functionName: 'add_strategy',
        args: [newStrategyAddress as `0x${string}`],
      })
      setNewStrategyAddress('')
    } catch (error) {
      console.error('Add strategy failed:', error)
    }
  }

  const handleUpdateDebt = async () => {
    if (!selectedStrategy || !targetDebt || !canManageDebt || !vaultAddress) return

    try {
      writeUpdateDebt({
        address: vaultAddress,
        abi: VAULT_ABI,
        functionName: 'update_debt',
        args: [selectedStrategy as `0x${string}`, parseUnits(targetDebt, 6)],
      })
      setTargetDebt('')
    } catch (error) {
      console.error('Update debt failed:', error)
    }
  }

  const handleEqualAllocation = async () => {
    if (strategies.length === 0 || !canManageDebt || totalAssets === 0 || !vaultAddress) return

    const equalDebt = totalAssets / strategies.length

    // In a real app, you'd want to batch these calls or use multicall
    try {
      for (const strategy of strategies) {
        await writeUpdateDebt({
          address: vaultAddress,
          abi: VAULT_ABI,
          functionName: 'update_debt',
          args: [strategy.address as `0x${string}`, parseUnits(equalDebt.toString(), 6)],
        })
      }
    } catch (error) {
      console.error('Equal allocation failed:', error)
    }
  }

  const handleSetDepositLimit = async () => {
    if (!newDepositLimit || !canManageDepositLimit || !vaultAddress) return

    try {
      writeSetDepositLimit({
        address: vaultAddress,
        abi: VAULT_ABI,
        functionName: 'set_deposit_limit',
        args: [parseUnits(newDepositLimit, 6)],
      })
      setNewDepositLimit('')
      setTimeout(() => refetchDepositLimit(), 2000)
    } catch (error) {
      console.error('Set deposit limit failed:', error)
    }
  }

  const handleProcessReport = async (strategyAddress: string) => {
    if (!vaultAddress || !isAdmin) return

    try {
      writeProcessReport({
        address: vaultAddress,
        abi: VAULT_ABI,
        functionName: 'process_report',
        args: [strategyAddress as `0x${string}`],
      })
    } catch (error) {
      console.error('Process report failed:', error)
    }
  }

  return (
    <div className="space-y-8">
      {/* Vault Funds Overview */}
      <div className="card bg-gradient-to-r from-vault-blue/10 to-purple-500/10 border-vault-blue/30">
        <h2 className="text-2xl font-bold mb-6">Vault Funds Overview</h2>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-4 bg-slate-700/50 rounded-lg">
            <p className="text-sm text-slate-400 mb-1">Total Assets</p>
            <p className="text-2xl font-bold text-vault-blue">
              ${totalAssets.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          <div className="p-4 bg-slate-700/50 rounded-lg">
            <p className="text-sm text-slate-400 mb-1">Allocated (Debt)</p>
            <p className="text-2xl font-bold text-success">
              ${totalDebt.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {totalAssets > 0 ? `${((totalDebt / totalAssets) * 100).toFixed(1)}%` : '0%'} of total
            </p>
          </div>
          <div className="p-4 bg-slate-700/50 rounded-lg">
            <p className="text-sm text-slate-400 mb-1">Unallocated (Idle)</p>
            <p className="text-2xl font-bold text-warning">
              ${totalIdle.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {totalAssets > 0 ? `${((totalIdle / totalAssets) * 100).toFixed(1)}%` : '0%'} idle
            </p>
          </div>
          <div className="p-4 bg-slate-700/50 rounded-lg">
            <p className="text-sm text-slate-400 mb-1">Can Allocate</p>
            <p className="text-2xl font-bold">
              ${Math.min(totalIdle, maxAllocatable).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Max capacity: ${maxAllocatable.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>
      </div>

      {/* Rebalance Capital */}
      {canManageDebt && (
        <div className="card">
          <h2 className="text-2xl font-bold mb-6">Rebalance Capital</h2>

          {strategies.length === 0 ? (
            <p className="text-slate-400">Add strategies first to enable allocation</p>
          ) : (
            <div className="space-y-6">
              {/* Manual Allocation */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Allocate to Specific Strategy</h3>
                <div className="flex gap-2 mb-2">
                  <select
                    className="input flex-1"
                    value={selectedStrategy}
                    onChange={(e) => setSelectedStrategy(e.target.value)}
                  >
                    <option value="">Select Strategy</option>
                    {strategies.map((strategy) => (
                      <option key={strategy.address} value={strategy.address}>
                        {strategy.name} ({strategy.symbol})
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    className="input w-48"
                    placeholder="Amount (USDC)"
                    value={targetDebt}
                    onChange={(e) => setTargetDebt(e.target.value)}
                    step="0.000001"
                    min="0"
                  />
                  <button
                    className="btn-primary"
                    onClick={handleUpdateDebt}
                    disabled={!selectedStrategy || !targetDebt || isUpdatingDebt}
                  >
                    {isUpdatingDebt ? 'Updating...' : 'Set Debt'}
                  </button>
                </div>
                {selectedStrategy && targetDebt && (() => {
                  const strategy = strategies.find(s => s.address === selectedStrategy)
                  const targetAmount = parseFloat(targetDebt)
                  if (strategy && targetAmount > strategy.maxDebt) {
                    return (
                      <p className="text-xs text-warning mb-2">
                        ⚠️ Target debt ({targetAmount.toFixed(2)} USDC) exceeds max debt ({strategy.maxDebt.toFixed(2)} USDC)
                      </p>
                    )
                  }
                  return null
                })()}
                <p className="text-xs text-slate-400">
                  💡 <strong>Target Debt</strong> - amount of USDC to allocate to the selected strategy. Must be ≤ Max Debt.
                </p>
              </div>

              {/* Equal Allocation */}
              {totalIdle > 0 && (
                <div className="pt-4 border-t border-slate-700">
                  <h3 className="text-lg font-semibold mb-3">Quick Allocation</h3>
                  <button
                    className="btn-primary w-full"
                    onClick={handleEqualAllocation}
                    disabled={isUpdatingDebt}
                  >
                    {isUpdatingDebt ? 'Allocating...' : `Allocate Equally (${(100 / strategies.length).toFixed(1)}% each)`}
                  </button>
                  <p className="text-xs text-slate-400 mt-2 text-center">
                    💡 Idle funds earn no yield. Allocate to strategies to start earning.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Strategy Management */}
      <div className="card">
        <h2 className="text-2xl font-bold mb-6">Strategy Management</h2>

        <div className="space-y-6">
          {/* Add Strategy */}
          {canAddStrategy && (
            <div>
              <h3 className="text-lg font-semibold mb-3">Add New Strategy</h3>
              <div className="flex gap-2">
                <input
                  type="text"
                  className="input flex-1"
                  placeholder="0x... Strategy Address (ERC-4626)"
                  value={newStrategyAddress}
                  onChange={(e) => setNewStrategyAddress(e.target.value)}
                />
                <button
                  className="btn-primary"
                  onClick={handleAddStrategy}
                  disabled={!newStrategyAddress || isAddingStrategy}
                >
                  {isAddingStrategy ? 'Adding...' : 'Add Strategy'}
                </button>
              </div>
            </div>
          )}

          {/* Current Strategies */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Current Strategies</h3>
            {loadingStrategies ? (
              <p className="text-slate-400">Loading strategies...</p>
            ) : strategies.length === 0 ? (
              <div className="text-slate-400">No strategies configured yet</div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-2">
                  {strategies.map((strategy) => {
                    const percentage = totalAssets > 0 ? (strategy.currentDebt / totalAssets) * 100 : 0
                    const morphoUrl = `https://app.morpho.org/ethereum/vault/${strategy.address}`
                    return (
                      <div key={strategy.address} className="p-2.5 bg-slate-700/50 rounded-lg">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm truncate">
                              {strategy.name}
                              {strategy.symbol && <span className="text-xs text-slate-500 ml-1">({strategy.symbol})</span>}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 ml-2 whitespace-nowrap text-sm">
                            <span className="text-slate-300">
                              {strategy.currentDebt.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} USDC
                            </span>
                            <span className="text-slate-500">|</span>
                            <span className="text-vault-blue font-semibold">{percentage.toFixed(1)}%</span>
                            {strategy.isActive && (
                              <span className="text-xs px-1.5 py-0.5 bg-success/20 text-success rounded ml-1">
                                Active
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 mb-1 text-xs">
                          <span className="text-slate-500">Max: {strategy.maxDebt.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} USDC</span>
                          {strategy.maxDebt === 0 && (
                            <span className="text-warning">⚠️ Set max debt</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-xs text-slate-500 font-mono truncate flex-1">
                            {strategy.address}
                          </p>
                          <a
                            href={morphoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-vault-blue hover:text-vault-blue/80 whitespace-nowrap"
                          >
                            Morpho ↗
                          </a>
                        </div>
                        {(canManageDebt || isAdmin) && (
                          <div className="space-y-2 mt-1.5 pt-1.5 border-t border-slate-600">
                            {canManageDebt && (
                              <div className="flex gap-2">
                                <input
                                  type="number"
                                  className="input flex-1 text-xs py-1"
                                  placeholder="Max Debt (USDC)"
                                  id={`maxdebt-${strategy.address}`}
                                  step="0.000001"
                                  min="0"
                                />
                                <button
                                  className="btn-secondary text-xs px-2 py-1"
                                  onClick={() => {
                                    const input = document.getElementById(`maxdebt-${strategy.address}`) as HTMLInputElement
                                    if (input && input.value && parseFloat(input.value) > 0) {
                                      writeUpdateDebt({
                                        address: vaultAddress,
                                        abi: VAULT_ABI,
                                        functionName: 'update_max_debt_for_strategy',
                                        args: [strategy.address as `0x${string}`, parseUnits(input.value, 6)],
                                      })
                                      input.value = ''
                                    }
                                  }}
                                  disabled={isUpdatingDebt}
                                >
                                  Set Max
                                </button>
                              </div>
                            )}
                            {isAdmin && (
                              <button
                                className="btn-primary text-xs px-2 py-1 w-full"
                                onClick={() => handleProcessReport(strategy.address)}
                                disabled={isProcessingReport}
                              >
                                {isProcessingReport ? 'Processing...' : '📊 Process Report & Update Share Price'}
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
                <div className="flex items-start justify-center">
                  <StrategyPieChart strategies={strategies} totalAssets={totalAssets} />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Queue Management */}
      {canManageQueue && (
        <div className="card">
          <h2 className="text-2xl font-bold mb-6">Withdraw Queue</h2>
          <p className="text-slate-400 mb-4">
            Configure the order strategies are withdrawn from
          </p>
          <div className="space-y-2">
            {queue.length === 0 ? (
              <div className="p-3 bg-slate-700/50 rounded-lg text-sm">
                No queue configured
              </div>
            ) : (
              queue.map((strategyAddr, idx) => (
                <div key={strategyAddr} className="p-3 bg-slate-700/50 rounded-lg flex items-center gap-3">
                  <span className="text-vault-blue font-bold">#{idx + 1}</span>
                  <span className="text-sm font-mono flex-1">{strategyAddr}</span>
                </div>
              ))
            )}
          </div>
          <p className="text-xs text-slate-500 mt-4">
            Note: Queue reordering UI can be implemented with drag-and-drop or input fields
          </p>
        </div>
      )}

      {/* Deposit Limit Management */}
      {canManageDepositLimit && (
        <div className="card">
          <h2 className="text-2xl font-bold mb-6">Deposit Limit</h2>
          <div className="space-y-4">
            <div className="p-4 bg-slate-700/30 rounded-lg">
              <p className="text-sm text-slate-400 mb-1">Current Deposit Limit</p>
              <p className="text-3xl font-bold">
                ${depositLimit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDC
              </p>
              {depositLimit === 0 && (
                <p className="text-sm text-error mt-2">
                  ⚠️ Deposits are currently disabled. Set a limit to allow deposits.
                </p>
              )}
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-3">Set New Deposit Limit</h3>
              <div className="flex gap-2">
                <input
                  type="number"
                  className="input flex-1"
                  placeholder="0.00 USDC"
                  value={newDepositLimit}
                  onChange={(e) => setNewDepositLimit(e.target.value)}
                  step="0.000001"
                  min="0"
                />
                <button
                  className="btn-primary"
                  onClick={handleSetDepositLimit}
                  disabled={!newDepositLimit || isSettingDepositLimit}
                >
                  {isSettingDepositLimit ? 'Setting...' : 'Set Limit'}
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Set to 0 to disable deposits. Use max uint256 (type 999999999999) for unlimited.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Role Management - Only for role_manager */}
      {isRoleManager && vaultAddress && (
        <RoleManagement vaultAddress={vaultAddress} />
      )}
    </div>
  )
}
