import { useState } from 'react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { VAULT_ABI, ROLES, ROLE_NAMES } from '../config/contracts'
import { useRoleManagement } from '../hooks/useRoleManagement'

interface RoleManagementProps {
  vaultAddress: `0x${string}`
}

export function RoleManagement({ vaultAddress }: RoleManagementProps) {
  const { address: currentUser } = useAccount()
  const [targetAddress, setTargetAddress] = useState('')
  const [selectedRoles, setSelectedRoles] = useState<bigint[]>([])
  const [viewAddress, setViewAddress] = useState<`0x${string}` | undefined>(undefined)

  const { activeRoles, roles: viewAddressRoles, isLoading, refetch } = useRoleManagement(viewAddress)
  const { activeRoles: myRoles } = useRoleManagement(currentUser)

  const { writeContract: writeSetRole, data: setRoleHash } = useWriteContract()
  const { isLoading: isSettingRole } = useWaitForTransactionReceipt({ hash: setRoleHash })

  const handleViewRoles = () => {
    if (targetAddress && targetAddress.startsWith('0x')) {
      setViewAddress(targetAddress as `0x${string}`)
    }
  }

  const handleToggleRole = (role: bigint) => {
    setSelectedRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    )
  }

  const handleSetRoles = async () => {
    if (!targetAddress || selectedRoles.length === 0) return

    const totalRoles = selectedRoles.reduce((acc, role) => acc | role, 0n)

    try {
      writeSetRole({
        address: vaultAddress,
        abi: VAULT_ABI,
        functionName: 'set_role',
        args: [targetAddress as `0x${string}`, totalRoles],
      })
      setSelectedRoles([])
      setTimeout(() => refetch(), 2000)
    } catch (error) {
      console.error('Set role failed:', error)
    }
  }

  const handleGrantAllRoles = async () => {
    if (!targetAddress) return

    try {
      writeSetRole({
        address: vaultAddress,
        abi: VAULT_ABI,
        functionName: 'set_role',
        args: [targetAddress as `0x${string}`, ROLES.ALL],
      })
      setTimeout(() => refetch(), 2000)
    } catch (error) {
      console.error('Grant all roles failed:', error)
    }
  }

  const handleRevokeAllRoles = async () => {
    if (!targetAddress) return

    try {
      writeSetRole({
        address: vaultAddress,
        abi: VAULT_ABI,
        functionName: 'set_role',
        args: [targetAddress as `0x${string}`, 0n],
      })
      setTimeout(() => refetch(), 2000)
    } catch (error) {
      console.error('Revoke all roles failed:', error)
    }
  }

  const availableRoles = Object.entries(ROLES)
    .filter(([key]) => key !== 'ALL')
    .map(([key, value]) => ({
      key,
      value,
      name: ROLE_NAMES[value.toString()] || key,
    }))

  return (
    <div className="card">
      <h2 className="text-2xl font-bold mb-6">Role Management</h2>

      {/* Current User Roles */}
      <div className="mb-6 p-4 bg-slate-700/30 rounded-lg">
        <h3 className="text-lg font-semibold mb-2">Your Roles</h3>
        <p className="text-sm text-slate-400 mb-2">Address: {currentUser}</p>
        {myRoles.length === 0 ? (
          <p className="text-slate-400 text-sm">No roles assigned</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {myRoles.map((role) => (
              <span
                key={role.value.toString()}
                className="px-3 py-1 bg-vault-blue/20 text-vault-blue rounded-full text-sm"
              >
                {role.name}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* View Address Roles */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3">View Address Roles</h3>
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            className="input flex-1"
            placeholder="0x... Address to view"
            value={targetAddress}
            onChange={(e) => setTargetAddress(e.target.value)}
          />
          <button className="btn-secondary" onClick={handleViewRoles}>
            View Roles
          </button>
        </div>

        {viewAddress && (
          <div className="p-4 bg-slate-700/30 rounded-lg">
            <p className="text-sm text-slate-400 mb-2">Viewing: {viewAddress}</p>
            {isLoading ? (
              <p className="text-slate-400">Loading...</p>
            ) : activeRoles.length === 0 ? (
              <p className="text-slate-400 text-sm">No roles assigned</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {activeRoles.map((role) => (
                  <span
                    key={role.value.toString()}
                    className="px-3 py-1 bg-success/20 text-success rounded-full text-sm"
                  >
                    {role.name}
                  </span>
                ))}
              </div>
            )}
            <p className="text-xs text-slate-500 mt-2">
              Roles bitmap: {viewAddressRoles.toString()}
            </p>
          </div>
        )}
      </div>

      {/* Manage Roles */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Manage Roles</h3>

        {/* Quick Actions */}
        <div className="flex gap-2 mb-4">
          <button
            className="btn-primary flex-1"
            onClick={handleGrantAllRoles}
            disabled={!targetAddress || isSettingRole}
          >
            {isSettingRole ? 'Processing...' : 'Grant All Roles'}
          </button>
          <button
            className="btn-secondary flex-1"
            onClick={handleRevokeAllRoles}
            disabled={!targetAddress || isSettingRole}
          >
            Revoke All Roles
          </button>
        </div>

        {/* Select Individual Roles */}
        <div className="mb-4">
          <p className="text-sm text-slate-400 mb-2">Select roles to grant:</p>
          <div className="grid grid-cols-2 gap-2">
            {availableRoles.map((role) => (
              <label
                key={role.value.toString()}
                className="flex items-center gap-2 p-2 bg-slate-700/30 rounded cursor-pointer hover:bg-slate-700/50"
              >
                <input
                  type="checkbox"
                  checked={selectedRoles.includes(role.value)}
                  onChange={() => handleToggleRole(role.value)}
                  className="w-4 h-4"
                />
                <span className="text-sm">{role.name}</span>
              </label>
            ))}
          </div>
        </div>

        <button
          className="btn-primary w-full"
          onClick={handleSetRoles}
          disabled={!targetAddress || selectedRoles.length === 0 || isSettingRole}
        >
          {isSettingRole ? 'Setting Roles...' : `Set Selected Roles (${selectedRoles.length})`}
        </button>

        <p className="text-xs text-slate-500 mt-3">
          Note: set_role replaces all existing roles. Use add_role to add without removing existing
          roles.
        </p>
      </div>
    </div>
  )
}
