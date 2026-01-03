import { useAccount, useWriteContract, useWaitForTransactionReceipt, useChainId } from 'wagmi'
import { useState } from 'react'
import { parseUnits } from 'viem'
import { useConnectModal } from '@rainbow-me/rainbowkit'
import { getVaultAddress, getUsdcAddress, VAULT_ABI, ERC20_ABI } from '../config/contracts'
import { useVaultData } from '../hooks/useVaultData'
import { useUserPosition } from '../hooks/useUserPosition'
import { useStrategies } from '../hooks/useStrategies'
import { StrategyPieChart } from '../components/StrategyPieChart'

export default function UserPage() {
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const vaultAddress = getVaultAddress(chainId)
  const usdcAddress = getUsdcAddress(chainId)
  const [depositAmount, setDepositAmount] = useState('')
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const { openConnectModal } = useConnectModal()

  // Fetch data using hooks
  const { totalAssets, isLoading: loadingVault } = useVaultData()
  const { shares, assets, usdcBalance, allowance, isLoading: loadingPosition } = useUserPosition()
  const { strategies, isLoading: loadingStrategies } = useStrategies()

  // Contract writes
  const { writeContract: writeApprove, data: approveHash } = useWriteContract()
  const { writeContract: writeDeposit, data: depositHash } = useWriteContract()
  const { writeContract: writeWithdraw, data: withdrawHash } = useWriteContract()

  // Transaction confirmations
  const { isLoading: isApproving } = useWaitForTransactionReceipt({ hash: approveHash })
  const { isLoading: isDepositing } = useWaitForTransactionReceipt({ hash: depositHash })
  const { isLoading: isWithdrawing } = useWaitForTransactionReceipt({ hash: withdrawHash })

  const networkName = chainId === 1 ? 'Mainnet' : chainId === 11155111 ? 'Sepolia' : 'Unknown'

  if (!vaultAddress || !usdcAddress) {
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

  const handleApprove = async () => {
    if (!depositAmount || parseFloat(depositAmount) <= 0 || !vaultAddress || !usdcAddress) return

    try {
      writeApprove({
        address: usdcAddress,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [vaultAddress, parseUnits(depositAmount, 6)],
      })
    } catch (error) {
      console.error('Approval failed:', error)
    }
  }

  const handleDeposit = async () => {
    if (!depositAmount || parseFloat(depositAmount) <= 0 || !address || !vaultAddress) return

    try {
      writeDeposit({
        address: vaultAddress,
        abi: VAULT_ABI,
        functionName: 'deposit',
        args: [parseUnits(depositAmount, 6), address],
      })
    } catch (error) {
      console.error('Deposit failed:', error)
    }
  }

  const handleWithdraw = async () => {
    if (!withdrawAmount || parseFloat(withdrawAmount) <= 0 || !address || !vaultAddress) return

    try {
      writeWithdraw({
        address: vaultAddress,
        abi: VAULT_ABI,
        functionName: 'withdraw',
        args: [parseUnits(withdrawAmount, 6), address, address],
      })
    } catch (error) {
      console.error('Withdraw failed:', error)
    }
  }

  const needsApproval = parseFloat(depositAmount) > 0 && parseFloat(depositAmount) > allowance
  const canDeposit = parseFloat(depositAmount) > 0 && parseFloat(depositAmount) <= allowance
  const canWithdraw = parseFloat(withdrawAmount) > 0 && parseFloat(withdrawAmount) <= assets

  return (
    <div className="space-y-8">
      {/* Vault Stats */}
      <div className="card">
        <h2 className="text-2xl font-bold mb-6">Vault Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <p className="text-sm text-slate-400 mb-1">Total Value Locked</p>
            <p className="text-3xl font-bold">
              {loadingVault ? '...' : `$${totalAssets.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            </p>
          </div>
          <div>
            <p className="text-sm text-slate-400 mb-1">Your Balance</p>
            <p className="text-3xl font-bold">
              {loadingPosition ? '...' : `$${assets.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            </p>
          </div>
          <div>
            <p className="text-sm text-slate-400 mb-1">Your Shares</p>
            <p className="text-3xl font-bold">
              {loadingPosition ? '...' : shares.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
        </div>
      </div>

      {/* Deposit/Withdraw */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Deposit */}
        <div className="card">
          <h3 className="text-xl font-bold mb-4">Deposit USDC</h3>
          <div className="space-y-4">
            <div>
              <label className="label">Amount</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  className="input flex-1"
                  placeholder="0.00"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  step="0.000001"
                  min="0"
                />
                <button
                  className="btn-secondary px-4"
                  onClick={() => setDepositAmount(usdcBalance.toString())}
                  disabled={!isConnected}
                >
                  Max
                </button>
              </div>
              <p className="text-sm text-slate-400 mt-1">
                Available: {usdcBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDC
              </p>
            </div>
            {!isConnected ? (
              <button
                className="btn-primary w-full"
                onClick={openConnectModal}
              >
                Connect Wallet
              </button>
            ) : needsApproval ? (
              <button
                className="btn-secondary w-full"
                onClick={handleApprove}
                disabled={isApproving}
              >
                {isApproving ? 'Approving...' : 'Approve USDC'}
              </button>
            ) : (
              <button
                className="btn-primary w-full"
                onClick={handleDeposit}
                disabled={!canDeposit || isDepositing}
              >
                {isDepositing ? 'Depositing...' : 'Deposit'}
              </button>
            )}
          </div>
        </div>

        {/* Withdraw */}
        <div className="card">
          <h3 className="text-xl font-bold mb-4">Withdraw USDC</h3>
          <div className="space-y-4">
            <div>
              <label className="label">Amount</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  className="input flex-1"
                  placeholder="0.00"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  step="0.000001"
                  min="0"
                />
                <button
                  className="btn-secondary px-4"
                  onClick={() => setWithdrawAmount(assets.toString())}
                  disabled={!isConnected}
                >
                  Max
                </button>
              </div>
              <p className="text-sm text-slate-400 mt-1">
                Available: {assets.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDC
              </p>
            </div>
            {!isConnected ? (
              <button
                className="btn-primary w-full"
                onClick={openConnectModal}
              >
                Connect Wallet
              </button>
            ) : (
              <button
                className="btn-primary w-full"
                onClick={handleWithdraw}
                disabled={!canWithdraw || isWithdrawing}
              >
                {isWithdrawing ? 'Withdrawing...' : 'Withdraw'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Strategies */}
      <div className="card">
        <h3 className="text-xl font-bold mb-4">Strategy Breakdown</h3>
        <div className="space-y-4">
          {loadingStrategies ? (
            <p className="text-slate-400">Loading strategies...</p>
          ) : strategies.length === 0 ? (
            <p className="text-slate-400">No strategies configured yet</p>
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
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
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
                    </div>
                  )
                })}
              </div>
              <div className="flex items-start justify-center">
                <StrategyPieChart strategies={strategies} totalAssets={totalAssets} />
              </div>
            </div>
          )}
          <div className="pt-4 border-t border-slate-700">
            <p className="text-sm text-slate-500">
              Vault: {vaultAddress || 'Not configured'}
            </p>
            <p className="text-sm text-slate-500">
              USDC: {usdcAddress}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
