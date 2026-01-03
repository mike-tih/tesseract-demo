// Contract addresses per network
const MAINNET_VAULT = import.meta.env.VITE_MAINNET_VAULT_ADDRESS || '';
const SEPOLIA_VAULT = import.meta.env.VITE_SEPOLIA_VAULT_ADDRESS || '';
const MAINNET_USDC = import.meta.env.VITE_MAINNET_USDC_ADDRESS || '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const SEPOLIA_USDC = import.meta.env.VITE_SEPOLIA_USDC_ADDRESS || '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238';

// Helper to get contract address based on chain ID
export function getVaultAddress(chainId: number): `0x${string}` {
  if (chainId === 1) return MAINNET_VAULT as `0x${string}`;
  if (chainId === 11155111) return SEPOLIA_VAULT as `0x${string}`;
  return '' as `0x${string}`;
}

export function getUsdcAddress(chainId: number): `0x${string}` {
  if (chainId === 1) return MAINNET_USDC as `0x${string}`;
  if (chainId === 11155111) return SEPOLIA_USDC as `0x${string}`;
  return '' as `0x${string}`;
}

// Legacy exports (default to Sepolia for backwards compatibility)
export const VAULT_ADDRESS = SEPOLIA_VAULT as `0x${string}`;
export const USDC_ADDRESS = SEPOLIA_USDC as `0x${string}`;

// Minimal ERC20 ABI for USDC interactions
export const ERC20_ABI = [
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    name: 'approve',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    name: 'allowance',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

// Simplified Vault ABI (key functions only)
// TODO: Replace with full ABI from contracts/artifacts/Vault.json
export const VAULT_ABI = [
  // ERC-4626 View Functions
  {
    inputs: [],
    name: 'totalAssets',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'totalSupply',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'shares', type: 'uint256' }],
    name: 'convertToAssets',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'assets', type: 'uint256' }],
    name: 'convertToShares',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  // ERC-4626 Deposit/Withdraw
  {
    inputs: [
      { name: 'assets', type: 'uint256' },
      { name: 'receiver', type: 'address' },
    ],
    name: 'deposit',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'assets', type: 'uint256' },
      { name: 'receiver', type: 'address' },
      { name: 'owner', type: 'address' },
    ],
    name: 'withdraw',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'shares', type: 'uint256' },
      { name: 'receiver', type: 'address' },
      { name: 'owner', type: 'address' },
    ],
    name: 'redeem',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  // Strategy Management
  {
    inputs: [{ name: 'strategy', type: 'address' }],
    name: 'strategies',
    outputs: [
      { name: 'activation', type: 'uint256' },
      { name: 'last_report', type: 'uint256' },
      { name: 'current_debt', type: 'uint256' },
      { name: 'max_debt', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'strategy', type: 'address' }],
    name: 'add_strategy',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'strategy', type: 'address' },
      { name: 'target_debt', type: 'uint256' },
    ],
    name: 'update_debt',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  // Role Management
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'roles',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'role_manager',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'account', type: 'address' },
      { name: 'role', type: 'uint256' }
    ],
    name: 'set_role',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'account', type: 'address' },
      { name: 'role', type: 'uint256' }
    ],
    name: 'add_role',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'account', type: 'address' },
      { name: 'role', type: 'uint256' }
    ],
    name: 'remove_role',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  // Queue Management
  {
    inputs: [],
    name: 'get_default_queue',
    outputs: [{ name: '', type: 'address[]' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

// Role constants (from Roles.sol)
export const ROLES = {
  ADD_STRATEGY_MANAGER: 1n,
  REVOKE_STRATEGY_MANAGER: 2n,
  FORCE_REVOKE_MANAGER: 4n,
  ACCOUNTANT_MANAGER: 8n,
  QUEUE_MANAGER: 16n,
  REPORTING_MANAGER: 32n,
  DEBT_MANAGER: 64n,
  MAX_DEBT_MANAGER: 128n,
  DEPOSIT_LIMIT_MANAGER: 256n,
  WITHDRAW_LIMIT_MANAGER: 512n,
  MINIMUM_IDLE_MANAGER: 1024n,
  PROFIT_UNLOCK_MANAGER: 2048n,
  DEBT_PURCHASER: 4096n,
  EMERGENCY_MANAGER: 8192n,
  ALL: 16383n,
} as const;

export const ROLE_NAMES: Record<string, string> = {
  '1': 'Add Strategy Manager',
  '2': 'Revoke Strategy Manager',
  '4': 'Force Revoke Manager',
  '8': 'Accountant Manager',
  '16': 'Queue Manager',
  '32': 'Reporting Manager',
  '64': 'Debt Manager',
  '128': 'Max Debt Manager',
  '256': 'Deposit Limit Manager',
  '512': 'Withdraw Limit Manager',
  '1024': 'Minimum Idle Manager',
  '2048': 'Profit Unlock Manager',
  '4096': 'Debt Purchaser',
  '8192': 'Emergency Manager',
  '16383': 'All Roles',
};
