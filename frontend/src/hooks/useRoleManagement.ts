import { useReadContract, useChainId } from 'wagmi'
import { getVaultAddress, VAULT_ABI, ROLES, ROLE_NAMES } from '../config/contracts'

export function useRoleManagement(address?: `0x${string}`) {
  const chainId = useChainId()
  const vaultAddress = getVaultAddress(chainId)

  // Get roles for specific address
  const { data: userRoles, isLoading, refetch } = useReadContract({
    address: vaultAddress,
    abi: VAULT_ABI,
    functionName: 'roles',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && !!vaultAddress,
    },
  })

  const roles = (userRoles as bigint) || 0n

  // Parse roles bitmap to array of role names
  const activeRoles: { value: bigint; name: string }[] = []

  Object.entries(ROLES).forEach(([key, value]) => {
    if (key !== 'ALL' && (roles & value) !== 0n) {
      activeRoles.push({
        value,
        name: ROLE_NAMES[value.toString()] || key,
      })
    }
  })

  // Check if has all roles
  const hasAllRoles = roles === ROLES.ALL

  return {
    roles,
    activeRoles,
    hasAllRoles,
    isLoading,
    refetch,
    vaultAddress,
  }
}
