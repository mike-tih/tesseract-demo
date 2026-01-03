import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { useState } from 'react'
import { parseUnits } from 'viem'
import { VAULT_ADDRESS, VAULT_ABI } from '../config/contracts'
import { useAdminRole } from '../hooks/useAdminRole'
import { useStrategies } from '../hooks/useStrategies'
import { useVaultData } from '../hooks/useVaultData'

export default function AdminPage() {
  const { address, isConnected } = useAccount()
  const [newStrategyAddress, setNewStrategyAddress] = useState('')
  const [selectedStrategy, setSelectedStrategy] = useState('')
  const [targetDebt, setTargetDebt] = useState('')

  // Fetch admin status and data
  const { isAdmin, canAddStrategy, canManageDebt, canManageQueue, isLoading: loadingRole } = useAdminRole()
  const { strategies, queue, isLoading: loadingStrategies } = useStrategies()
  const { totalAssets } = useVaultData()

  // Contract writes
  const { writeContract: writeAddStrategy, data: addStrategyHash } = useWriteContract()
  const { writeContract: writeUpdateDebt, data: updateDebtHash } = useWriteContract()
  const { writeContract: writeSetQueue, data: setQueueHash } = useWriteContract()

  // Transaction confirmations
  const { isLoading: isAddingStrategy } = useWaitForTransactionReceipt({ hash: addStrategyHash })
  const { isLoading: isUpdatingDebt } = useWaitForTransactionReceipt({ hash: updateDebtHash })
  const { isLoading: isSettingQueue } = useWaitForTransactionReceipt({ hash: setQueueHash })

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
    if (!newStrategyAddress || !canAddStrategy) return

    try {
      writeAddStrategy({
        address: VAULT_ADDRESS as `0x${string}`,
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
    if (!selectedStrategy || !targetDebt || !canManageDebt) return

    try {
      writeUpdateDebt({
        address: VAULT_ADDRESS as `0x${string}`,
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
    if (strategies.length === 0 || !canManageDebt || totalAssets === 0) return

    const equalDebt = totalAssets / strategies.length

    // In a real app, you'd want to batch these calls or use multicall
    try {
      for (const strategy of strategies) {
        await writeUpdateDebt({
          address: VAULT_ADDRESS as `0x${string}`,
          abi: VAULT_ABI,
          functionName: 'update_debt',
          args: [strategy.address as `0x${string}`, parseUnits(equalDebt.toString(), 6)],
        })
      }
    } catch (error) {
      console.error('Equal allocation failed:', error)
    }
  }

  return (
    <div className="space-y-8">
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
              <div className="space-y-2">
                {strategies.map((strategy, idx) => {
                  const percentage = totalAssets > 0 ? (strategy.currentDebt / totalAssets) * 100 : 0
                  return (
                    <div key={strategy.address} className="p-4 bg-slate-700/50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-semibold">Strategy {idx + 1}</p>
                        <div className="flex items-center gap-4">
                          <p className="text-vault-blue">{percentage.toFixed(1)}%</p>
                          {strategy.isActive && (
                            <span className="text-xs px-2 py-1 bg-success/20 text-success rounded">
                              Active
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 mb-2">
                        <div>
                          <p className="text-xs text-slate-500">Current Debt</p>
                          <p className="text-sm font-semibold">
                            ${strategy.currentDebt.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Max Debt</p>
                          <p className="text-sm font-semibold">
                            ${strategy.maxDebt.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                      </div>
                      <p className="text-xs text-slate-500 font-mono break-all">
                        {strategy.address}
                      </p>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Rebalance */}
      {canManageDebt && (
        <div className="card">
          <h2 className="text-2xl font-bold mb-6">Rebalance Capital</h2>
          <div className="space-y-4">
            <div className="flex gap-2">
              <select
                className="input flex-1"
                value={selectedStrategy}
                onChange={(e) => setSelectedStrategy(e.target.value)}
              >
                <option value="">Select Strategy</option>
                {strategies.map((strategy, idx) => (
                  <option key={strategy.address} value={strategy.address}>
                    Strategy {idx + 1} - {strategy.address.slice(0, 10)}...
                  </option>
                ))}
              </select>
              <input
                type="number"
                className="input w-40"
                placeholder="Target Debt"
                value={targetDebt}
                onChange={(e) => setTargetDebt(e.target.value)}
              />
              <button
                className="btn-primary"
                onClick={handleUpdateDebt}
                disabled={!selectedStrategy || !targetDebt || isUpdatingDebt}
              >
                {isUpdatingDebt ? 'Updating...' : 'Update Debt'}
              </button>
            </div>

            <div className="flex gap-2">
              <button
                className="btn-secondary flex-1"
                onClick={handleEqualAllocation}
                disabled={strategies.length === 0 || totalAssets === 0}
              >
                Equal Allocation ({strategies.length > 0 ? `${(100 / strategies.length).toFixed(1)}% each` : 'N/A'})
              </button>
            </div>
          </div>
        </div>
      )}

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
    </div>
  )
}
