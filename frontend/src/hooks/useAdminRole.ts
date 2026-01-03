import { useAccount, useReadContract, useChainId } from 'wagmi'
import { getVaultAddress, VAULT_ABI, ROLES } from '../config/contracts'

export function useAdminRole() {
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const vaultAddress = getVaultAddress(chainId)

  // Check if user is the role manager
  const { data: roleManager, isLoading: isLoadingRoleManager } = useReadContract({
    address: vaultAddress,
    abi: VAULT_ABI,
    functionName: 'role_manager',
    query: {
      enabled: !!address && isConnected && !!vaultAddress,
      refetchInterval: 30000,
    },
  })

  // Check user's roles in the vault
  const { data: userRoles, isLoading: isLoadingRoles } = useReadContract({
    address: vaultAddress,
    abi: VAULT_ABI,
    functionName: 'roles',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && isConnected && !!vaultAddress,
      refetchInterval: 30000,
    },
  })

  const isLoading = isLoadingRoleManager || isLoadingRoles
  const roles = (userRoles as bigint) || 0n
  const isRoleManager = address && roleManager && address.toLowerCase() === (roleManager as string).toLowerCase()

  // Check if user has specific roles
  const hasRole = (role: bigint) => {
    return (roles & role) !== 0n
  }

  // Role manager has all permissions, OR user has ALL roles
  const isAdmin = isRoleManager || roles === ROLES.ALL
  const canAddStrategy = isRoleManager || hasRole(ROLES.ADD_STRATEGY_MANAGER) || roles === ROLES.ALL
  const canRevokeStrategy = isRoleManager || hasRole(ROLES.REVOKE_STRATEGY_MANAGER) || roles === ROLES.ALL
  const canManageDebt = isRoleManager || hasRole(ROLES.DEBT_MANAGER) || roles === ROLES.ALL
  const canManageQueue = isRoleManager || hasRole(ROLES.QUEUE_MANAGER) || roles === ROLES.ALL
  const canReport = isRoleManager || hasRole(ROLES.REPORTING_MANAGER) || roles === ROLES.ALL

  return {
    roles,
    isRoleManager,
    isAdmin,
    canAddStrategy,
    canRevokeStrategy,
    canManageDebt,
    canManageQueue,
    canReport,
    isLoading,
    isConnected,
    vaultAddress,
    chainId,
  }
}
