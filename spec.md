# Tesseract Demo Vault — Technical Specification

## Overview

ERC-4626 vault aggregator that accepts USDC and distributes capital across multiple Morpho USDC vaults. Built on Yearn V3 Vault contract (unmodified).

**Key insight**: Yearn V3 Vault already implements all needed logic — deposit/withdraw queues, strategy management, accounting. We use it as-is, only deploying and configuring.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              USER FLOW                                  │
└─────────────────────────────────────────────────────────────────────────┘

    User (USDC)
        │
        ▼
┌───────────────────┐
│   Yield Index     │  ← Yearn V3 Vault (unmodified)
│   Vault (ERC-4626)│  ← Accepts USDC, issues shares
└───────────────────┘
        │
        │ Admin calls: addStrategy(), updateDebt()
        ▼
┌───────────────────────────────────────────────────────────────────────┐
│                    STRATEGIES (ERC-4626 Morpho Vaults)                 │
├─────────────────┬─────────────────┬─────────────────┬─────────────────┤
│  Morpho Vault 1 │  Morpho Vault 2 │  Morpho Vault 3 │  Morpho Vault 4 │
│  (USDC market)  │  (USDC market)  │  (USDC market)  │  (USDC market)  │
└─────────────────┴─────────────────┴─────────────────┴─────────────────┘
        │                   │                 │                 │
        ▼                   ▼                 ▼                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                       MORPHO BLUE LENDING MARKETS                       │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Why No Router

Original task mentions "Execution Router" for moving capital. However:

1. Yearn V3 vault handles this internally via `updateDebt()` function
2. Admin calls `updateDebt(strategy, newDebt)` to move capital
3. Vault automatically withdraws from or deposits to strategies
4. No separate router contract needed — vault IS the router

**Benefit**: Fewer contracts = smaller attack surface, simpler audit.

---

## Repository Structure

```
yield-index-vault/
├── README.md
├── SPECIFICATION.md
│
├── contracts/                     # Hardhat project
│   ├── contracts/
│   │   └── vendor/
│   │       └── yearn-v3/          # Yearn V3 Vault source (unmodified)
│   │
│   ├── scripts/                   # Deployment scripts
│   │   ├── deploy.ts              # Deploy vault
│   │   └── configure.ts           # Add strategies, set params
│   │
│   ├── tests/                     # Unit tests for contracts (ideally from the repo's source)
│   ├── hardhat.config.ts
│   └── package.json
│
└── frontend/                      # React + TypeScript
    ├── src/
    │   ├── pages/                 # User and Admin pages
    │   ├── components/
    │   ├── hooks/
    │   ├── lib/
    │   └── scripts/               # Frontend deployment/build scripts
    │
    ├── package.json
    └── tsconfig.json
```

---

## Contracts

### What We Deploy

| Contract | Source | Purpose |
|----------|--------|---------|
| `Vault` | Yearn V3 (unmodified) | Main ERC-4626 vault |

We deploy a single Vault instance directly, no factory needed. The Vault contract is copied from Yearn V3 repository into `contracts/vendor/yearn-v3/` without modifications.

### Deployment Flow

1. Deploy Yearn V3 Vault with USDC as underlying asset
2. Set admin as role_manager
3. Add Morpho vaults as strategies
4. Set max debt limits for each strategy
5. Configure deposit and withdraw queues

---

## Capital Flows

### Deposit Flow

1. User approves USDC to Vault
2. User calls `vault.deposit(amount, receiver)`
3. Vault transfers USDC from user and mints shares
4. USDC sits idle in vault until admin allocates
5. Admin calls `vault.updateDebt(strategy, newDebt)` to deploy capital
6. Vault deposits USDC into Morpho vault

### Withdrawal Flow

1. User calls `vault.withdraw(assets, receiver, owner)` or `vault.redeem(shares, receiver, owner)`
2. Vault checks withdraw queue (ordered list of strategies)
3. For each strategy in queue: withdraw available liquidity until amount satisfied
4. If total available < requested: transaction reverts
5. Vault burns shares and transfers USDC to user

### Rebalance Flow (Admin)

1. Admin views current allocations in frontend
2. Admin decides new target allocations
3. Admin calls `updateDebt()` for each strategy needing change
4. Vault handles all transfers internally

---

## Role System

Yearn V3 uses granular roles:

| Role | Assigned To | Permissions |
|------|-------------|-------------|
| ROLE_MANAGER | Admin | Assign/revoke all roles |
| ADD_STRATEGY_MANAGER | Admin | Add new strategies |
| REVOKE_STRATEGY_MANAGER | Admin | Remove strategies |
| DEBT_MANAGER | Admin | Call updateDebt() |
| REPORTING_MANAGER | Admin/Keeper | Call process_report() |
| QUEUE_MANAGER | Admin | Set deposit/withdraw queues |

---

## Frontend

### Tech Stack

- React + TypeScript
- wagmi v2 + viem + RainbowKit for wallet connection
- Tailwind CSS for styling
- TanStack Query for contract reads

### Sections

**User Section** (`/`): Connect wallet, view vault stats and user position, deposit USDC, withdraw USDC, view strategy breakdown with allocations.

**Admin Section** (`/admin`): Strategy management (list, add, remove), rebalance panel for adjusting allocations, queue management for deposit/withdraw order, reporting controls.

Admin section checks if connected wallet has appropriate roles before displaying controls.

---

## Morpho Strategy Integration

### Configuration

- I will later select 4 MetaMorpho vaults for USDC on mainnet/Sepolia
- Each MetaMorpho vault = one strategy in our vault
- Target allocation: ~25% each (configurable)
I will use admin panel for this

### Tracking

- `vault.strategies(morphoVault)` returns current debt
- MetaMorpho vault's `totalAssets()` shows TVL
- APY available from Morpho API or calculated on-chain

### Withdrawal Handling

- MetaMorpho has internal withdraw queue
- If market utilization high, withdraw may partially fail
- Our vault tries next strategy in queue automatically

---

## Deployment Checklist
(you can use this as basement but you have to produce a final one given the tech you build)

- [ ] Copy Yearn V3 Vault contract to vendor folder
- [ ] Deploy Vault with USDC as asset
- [ ] Set admin roles
- [ ] Add 4 Morpho USDC vaults as strategies
- [ ] Set max debt limits
- [ ] Configure withdraw queue order
- [ ] Verify contract on Etherscan
- [ ] Document deployed addresses
