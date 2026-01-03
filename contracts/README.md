# Tesseract Demo Vault - Smart Contracts

ERC-4626 vault aggregator that accepts USDC and distributes capital across multiple ERC-4626 strategies (e.g., MetaMorpho vaults). Built on Yearn V3 Vault (unmodified).

## Architecture

```
User (USDC) → Tesseract Demo Vault (Yearn V3) → 4x ERC-4626 Strategies → Morpho Blue Markets
```

## Project Structure

```
contracts/
├── contracts/
│   ├── interfaces/
│   │   ├── IVault.sol       # Vault Solidity interface
│   │   └── Roles.sol        # Role constants library
│   └── vault/
│       └── Vault.vy         # Main vault (Vyper 0.3.10, forked from Yearn V3)
├── scripts/
│   ├── compile-vault.sh     # Compile Vault.vy to bytecode
│   ├── deploy.ts            # Deploy vault (simple, direct)
│   └── configure.ts         # Set admin roles & limits
├── artifacts/               # Compiled Vault.json (gitignored)
├── deployments/             # Deployment addresses (gitignored)
└── .env.example             # Environment variables template
```

## Prerequisites

- Node.js >= 18
- Python 3 with `pip`
- Vyper compiler 0.3.7 (auto-installed by compile script)

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env` and configure:
   ```bash
   cp .env.example .env
   ```

3. Edit `.env`:
   - Add RPC URLs (Alchemy, Infura, etc.)
   - Add `PRIVATE_KEY` for deployment
   - Add `USDC_ADDRESS` for your network
   - Add `ADMIN_ADDRESS` (optional, defaults to deployer)

## Compilation

### Compile Vyper Vault

```bash
npm run compile:vault
```

This script:
- Checks/installs Vyper 0.3.7
- Compiles `Vault.vy` to bytecode + ABI
- Saves to `contracts/artifacts/Vault.json`

### Compile Solidity Interfaces

```bash
npm run compile
```

## Deployment

### Sepolia Testnet

```bash
npm run deploy:sepolia
```

### Ethereum Mainnet

```bash
npm run deploy:mainnet
```

Deployment flow:
1. Loads compiled Vault.vy bytecode from `artifacts/Vault.json`
2. Deploys Vault contract
3. Calls `initialize()` (Vyper equivalent of constructor)
4. Saves vault address to `deployments/{network}.json`

## Configuration

After deployment, run the configuration script to set up admin roles and limits:

```bash
npm run configure:sepolia
# or
npm run configure:mainnet
```

Configuration script does:
1. ✅ Grant admin all roles (ADD_STRATEGY_MANAGER, DEBT_MANAGER, etc.)
2. ✅ Set deposit limit

**Strategies are added via the Admin UI, not during deployment:**
- Go to frontend Admin page
- Add ERC-4626 strategy addresses one by one
- Set max debt limits for each strategy
- Configure withdraw queue order
- Allocate capital using rebalance panel

## Environment Variables

### Required

- `MAINNET_RPC_URL` / `SEPOLIA_RPC_URL` - RPC endpoint
- `PRIVATE_KEY` - Deployment wallet (without 0x)
- `USDC_ADDRESS` - USDC token address

### Optional

- `ADMIN_ADDRESS` - Vault admin (defaults to deployer)
- `MAX_DEPOSIT_LIMIT` - Max total deposits (default: 10M USDC)
- `ETHERSCAN_API_KEY` - For contract verification

## Roles

The vault uses 14 granular roles (from `Roles.sol`):

| Role | Value | Purpose |
|------|-------|---------|
| ADD_STRATEGY_MANAGER | 1 | Add strategies |
| REVOKE_STRATEGY_MANAGER | 2 | Remove strategies |
| DEBT_MANAGER | 64 | Allocate/withdraw capital |
| QUEUE_MANAGER | 16 | Manage withdraw queue |
| REPORTING_MANAGER | 32 | Call process_report() |
| ALL | 16383 | All roles combined |

Admin gets `ALL` roles by default.

## Key Functions

### User Operations

```solidity
// Deposit USDC, receive vault shares
vault.deposit(amount, receiver)

// Withdraw USDC, burn shares
vault.withdraw(assets, receiver, owner)

// Redeem shares for USDC
vault.redeem(shares, receiver, owner)
```

### Admin Operations

```solidity
// Add ERC-4626 strategy
vault.add_strategy(strategyAddress)

// Allocate capital to strategy
vault.update_debt(strategy, targetDebt)

// Set withdraw queue order
vault.set_default_queue([strategy1, strategy2, strategy3, strategy4])

// Set deposit limit
vault.set_deposit_limit(limit)
```

## Testing

```bash
npm test
```

## Verification

After deployment, verify on Etherscan:

```bash
npx hardhat verify --network sepolia <VAULT_ADDRESS>
```

## Security Considerations

- Vault contract is **unmodified Yearn V3** (audited, battle-tested)
- Strategies must be **ERC-4626 compliant** and **trusted**
- Admin has **full control** over strategies and capital allocation
- Use **multisig** for `ADMIN_ADDRESS` in production
- Test thoroughly on **testnet** before mainnet deployment

## Resources

- [Yearn V3 Documentation](https://docs.yearn.fi/developers/v3/overview)
- [Yearn V3 GitHub](https://github.com/yearn/yearn-vaults-v3)
- [ERC-4626 Standard](https://eips.ethereum.org/EIPS/eip-4626)
- [Morpho Documentation](https://docs.morpho.blue)

## License

GPL-3.0 (same as Yearn V3)
