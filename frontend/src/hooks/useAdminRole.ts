import { useAccount, useReadContract } from 'wagmi'
import { VAULT_ADDRESS, VAULT_ABI, ROLES } from '../config/contracts'

export function useAdminRole() {
  const { address, isConnected } = useAccount()

  // Check user's roles in the vault
  const { data: userRoles, isLoading } = useReadContract({
    address: VAULT_ADDRESS as `0x${string}`,
    abi: VAULT_ABI,
    functionName: 'roles',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && isConnected,
      refetchInterval: 30000,
    },
  })

  const roles = (userRoles as bigint) || 0n

  // Check if user has specific roles
  const hasRole = (role: bigint) => {
    return (roles & role) !== 0n
  }

  const isAdmin = roles === ROLES.ALL
  const canAddStrategy = hasRole(ROLES.ADD_STRATEGY_MANAGER) || isAdmin
  const canRevokeStrategy = hasRole(ROLES.REVOKE_STRATEGY_MANAGER) || isAdmin
  const canManageDebt = hasRole(ROLES.DEBT_MANAGER) || isAdmin
  const canManageQueue = hasRole(ROLES.QUEUE_MANAGER) || isAdmin
  const canReport = hasRole(ROLES.REPORTING_MANAGER) || isAdmin

  return {
    roles,
    isAdmin,
    canAddStrategy,
    canRevokeStrategy,
    canManageDebt,
    canManageQueue,
    canReport,
    isLoading,
    isConnected,
  }
}
