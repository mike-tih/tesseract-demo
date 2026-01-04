# Tesseract Demo Vault: Architecture and Strategies

## Table of Contents
- [General Architecture](#general-architecture)
- [Reward Distribution and Capital Management](#reward-distribution-and-capital-management)
- [Contract Origin and Modifications](#contract-origin-and-modifications)
- [Deployment Strategy](#deployment-strategy)
- [Strategy Implementation](#strategy-implementation)

---

## General Architecture

The Tesseract Demo Vault is an ERC-4626 compliant vault aggregator that accepts USDC deposits and distributes capital across multiple yield-generating strategies. The system follows a hierarchical architecture:

```
┌─────────────────────────────────────────────────────────────┐
│                         User Layer                          │
│                    (Deposits/Withdrawals)                   │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   Tesseract Vault (TDV)                     │
│                    ERC-4626 Vault Core                      │
│   ┌─────────────────────────────────────────────────────┐   │
│   │  • Share minting/burning                            │   │
│   │  • Profit distribution via share price appreciation│   │
│   │  • Role-based access control (14 roles)            │   │
│   │  • Deposit/withdraw limits                          │   │
│   │  • Strategy debt management                         │   │
│   └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
            ┌───────────────┼───────────────┐
            ▼               ▼               ▼
    ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
    │  Strategy 1 │ │  Strategy 2 │ │  Strategy N │
    │   (Morpho)  │ │   (Morpho)  │ │  (Future)   │
    └─────────────┘ └─────────────┘ └─────────────┘
            │               │               │
            ▼               ▼               ▼
    ┌─────────────────────────────────────────┐
    │      DeFi Lending Protocols             │
    │   (Morpho, Euler, Aave, Compound, etc)  │
    └─────────────────────────────────────────┘
```

**Core Components:**

1. **Vault Contract (Vault.vy)** - Modified Yearn V3 vault that manages user deposits, shares, and strategy allocation
2. **Strategies** - ERC-4626 compliant contracts that deploy capital to underlying protocols
3. **Role Manager** - Controls permissions for strategy management, debt updates, and configuration
4. **Admin/FinOps** - Human operator responsible for setting limits and approving parameter changes

---

## Reward Distribution and Capital Management

### Share-Based Reward System

The vault uses an ERC-4626 share mechanism for reward distribution:

1. **Deposits:**
   - User deposits `X` USDC
   - Receives shares calculated as: `shares = assets / pricePerShare`
   - Initial price per share = 1.0 USDC
   - Shares are minted and transferred to user

2. **Yield Accrual:**
   - Strategies generate yield from underlying protocols
   - **Admin must call `process_report(strategy)`** to update vault accounting
   - Vault queries strategy's current value and calculates profit/loss
   - Vault increases `totalAssets` without minting new shares
   - This causes `pricePerShare` to increase proportionally
   - All share holders automatically earn yield via price appreciation
   - ⚠️ **Important:** Without calling `process_report()`, yield stays in strategy but doesn't affect share price

3. **Withdrawals:**
   - User redeems shares for USDC
   - Assets returned = `shares × pricePerShare`
   - Shares are burned, reducing total supply

### Protection Against Quick Entry/Exit

The vault implements several mechanisms to prevent gaming and protect long-term depositors:

1. **Profit Unlocking Period (`profitMaxUnlockTime`):**
   - Default: 7 days (604,800 seconds)
   - When strategies report profits, gains are not immediately reflected in share price
   - Profits "unlock" linearly over the configured period
   - This prevents users from depositing right before a profit report and immediately withdrawing
   - Mechanism: `profitUnlockingRate` determines how much profit is released per second

2. **Max Loss on Withdrawal:**
   - Withdrawals accept a `max_loss` parameter (default 0)
   - If a strategy has unrealized losses, users must accept some loss to withdraw
   - This prevents users from front-running known losses by exiting early
   - Loss assessment: `assess_share_of_unrealised_losses(strategy, assets_needed)`

3. **Withdrawal Queue:**
   - Vault maintains a `default_queue` of strategies for ordered withdrawals
   - Ensures fair distribution of liquidity across all users
   - First strategy in queue is depleted first during high withdrawal volumes
   - Prevents cherry-picking of best-performing strategies

### Capital Movement and Storage

**During Deposits:**
```
User USDC → Vault (totalIdle increases)
          → Shares minted to user
```
- Capital initially sits idle in vault (`totalIdle`)
- Admin/bot later allocates to strategies via `update_debt(strategy, target_debt)`

**During Strategy Allocation:**
```
Vault (totalIdle) → Strategy.deposit() → totalDebt increases
                                       → totalIdle decreases
```
- Vault calls `IStrategy.deposit(assets, vault_address)`
- Strategy deposits into underlying protocol (e.g., Morpho)
- Vault tracks debt: `strategies[strategy].current_debt`

**During Withdrawals:**
```
Strategy → Vault (totalIdle) → User USDC
         → totalDebt decreases
                              → Shares burned
```
1. Vault checks `totalIdle` first
2. If insufficient, calls `IStrategy.redeem()` to pull from strategies
3. Follows withdrawal queue order
4. Burns user shares

**During Rebalancing:**
```
Strategy A → Vault (temporary idle) → Strategy B
          ↓
    totalDebt[A] ↓    totalDebt[B] ↑
```
- Admin/bot calls `update_debt(strategyA, lower_amount)` - withdraws
- Then calls `update_debt(strategyB, higher_amount)` - deposits
- Capital flows through vault's idle balance as intermediary

**During Profit/Loss Reporting:**
```
Admin calls process_report(strategy) → Vault queries strategy.totalAssets()
                                     → Calculates gain/loss vs current_debt
                                     → Updates vault accounting
                                     → Increases/decreases pricePerShare
                                     → All shareholders automatically benefit/share loss
```
- **Critical step:** Without calling `process_report()`, profits remain in strategy but don't affect share price
- Admin must periodically call `process_report(strategy)` for each strategy
- Profits unlock linearly over 7 days (`profitMaxUnlockTime`)
- Increases `pricePerShare` → users get more USDC when withdrawing
- This is how yield is distributed to all vault token holders

---

## Contract Origin and Modifications

### Fork Source: Yearn V3

The vault contract is a fork of [Yearn Vaults V3](https://github.com/yearn/yearn-vaults-v3) (Vault.vy), which is a battle-tested, production-grade vault system managing billions of dollars in TVL.

**Why Yearn V3?**
- Proven security track record
- Flexible multi-strategy architecture
- Robust accounting and profit distribution
- Role-based permission system
- ERC-4626 compliance

### Key Modifications

The original Yearn V3 architecture relies on a VaultFactory contract for deployment and protocol fee management. For this project, the factory dependency was removed:

**Changes Made:**
1. **Factory Constant Removed:**
   - Original: `FACTORY: public(immutable(address))`
   - Modified: `FACTORY: public(immutable(uint256))` - set to 0
   - Rationale: This project doesn't need multi-vault deployment infrastructure

2. **Protocol Fee Configuration:**
   - Original: Queries `IFactory.protocol_fee_config()` for fee parameters
   - Modified: Hardcoded or removed protocol fees
   - Rationale: Single-vault deployment doesn't require factory-managed fees

3. **Initialization:**
   - Original: Called via factory with standardized parameters
   - Modified: Direct initialization with custom parameters
   - Allows standalone deployment without factory contract

**Impact:**
- Simpler deployment process
- Reduced gas costs (no factory interactions)
- Maintained all core vault functionality

---

## Deployment Strategy

### Mainnet-First Approach

The vault was deployed directly to **Ethereum Mainnet** rather than testnet for the following reasons:

1. **Morpho Protocol Availability:**
   - Testnets (Sepolia, Goerli) lack mature Morpho deployments
   - Morpho's MetaMorpho vaults with real liquidity pools only exist on mainnet
   - Testing against empty or non-existent pools would be non-representative

2. **Real Market Conditions:**
   - Mainnet provides actual yield rates and market dynamics
   - Accurate testing of profit reporting and share price mechanics
   - Real slippage, gas costs, and MEV considerations

3. **Integration Testing:**
   - Validates actual ERC-4626 compatibility with production Morpho vaults
   - Tests against real USDC contract behavior
   - Confirms multi-call transactions work in production environment

---

## Strategy Implementation

### Strategy A: Morpho MetaMorpho Vaults (✅ Implemented)

**Status:** Live and operational

**Architecture:**
```
Tesseract Vault → MetaMorpho Vault (ERC-4626) → Morpho Blue Markets
```

**Implementation:**
- Direct integration via ERC-4626 standard
- No wrapper contracts needed
- Morpho vaults accept USDC natively
- Vault calls `IStrategy.deposit()` and `IStrategy.redeem()`

**Current Morpho Strategies:**
- Multiple MetaMorpho USDC vaults can be added
- Each strategy tracked independently in `strategies` mapping
- Configurable `max_debt` per strategy for risk management

**Advantages:**
- Clean ERC-4626 interface
- No conversion overhead
- Battle-tested Morpho infrastructure
- Transparent on-chain accounting

### Strategy B: Euler PYUSD Vault (🔧 Requires Additional Work)

**Status:** Requires proxy/wrapper contract

**Challenge:**
The Euler vault accepts **PYUSD** as deposit asset, but the Tesseract vault uses **USDC**. This creates an asset mismatch that requires an intermediary conversion layer.

**Proposed Architecture:**
```
Tesseract Vault → PYUSD Strategy Wrapper → USDC/PYUSD DEX → Euler PYUSD Vault
                     (ERC-4626)                (Swap)          (ERC-4626)
```

**Wrapper Contract Requirements:**

1. **ERC-4626 Compliance:**
   - Implements `IStrategy` interface expected by vault
   - Reports `asset() = USDC`
   - Handles conversion in `deposit()` and `redeem()` functions

2. **Swap Integration:**
   - **Ideally:** Use PYUSD primary market for 1:1 conversion
   - **Fallback:** Integrate with DEX aggregator (1inch, Paraswap) for best rates
   - **Slippage Protection:** Enforce maximum acceptable slippage on conversions

3. **Deposit Flow:**
   ```solidity
   function deposit(uint256 usdcAmount, address receiver) external returns (uint256) {
       // 1. Receive USDC from vault
       IERC20(USDC).transferFrom(msg.sender, address(this), usdcAmount);

       // 2. Swap USDC → PYUSD (1:1 via primary market or DEX)
       uint256 pyusdAmount = swapUSDCtoPYUSD(usdcAmount);

       // 3. Deposit PYUSD to Euler vault
       uint256 shares = IEulerVault(EULER_VAULT).deposit(pyusdAmount, address(this));

       // 4. Return shares to vault
       return shares;
   }
   ```

4. **Withdrawal Flow:**
   ```solidity
   function redeem(uint256 shares, address receiver, address owner) external returns (uint256) {
       // 1. Redeem shares from Euler vault
       uint256 pyusdAmount = IEulerVault(EULER_VAULT).redeem(shares, address(this), address(this));

       // 2. Swap PYUSD → USDC
       uint256 usdcAmount = swapPYUSDtoUSDC(pyusdAmount);

       // 3. Return USDC to vault
       IERC20(USDC).transfer(receiver, usdcAmount);
       return usdcAmount;
   }
   ```

**Primary Market Approach (Preferred):**
- PYUSD issued by Paxos has primary market mechanisms
- Institutions can mint/burn PYUSD 1:1 with USD
- If available, provides zero-slippage conversions
- Requires relationship with Paxos or approved partner

---

## Next Steps

See [next-steps.md](./next-steps.md) for detailed descriptions of potential enhancements:

1. **Allocator Bot** - Automated capital allocation and rebalancing
2. **Reward Harvester** - Claim and convert protocol reward tokens to boost APY
3. **Subgraph** - Historical data indexing for charts and metrics

---


## Summary

This architecture document outlines a production-ready vault system with clear paths for expansion:

**Current State:**
- Battle-tested Yearn V3 core
- Live mainnet deployment with real USDC
- Morpho strategies operational

**Potential Next Steps:**
1. Deploy PYUSD wrapper for Euler strategy integration
2. Implement allocator bot for automated capital management
3. Implement reward harvester bot with proxy contract
4. Deploy subgraph for historical data and APY tracking

See [next-steps.md](./next-steps.md) for detailed descriptions.

**Design Principles:**
- Don't modify the clean vault core
- Use modular, upgradeable periphery contracts
- Maintain security through separation of concerns
- Automate where possible, human oversight where critical

This approach balances innovation with security, enabling competitive yields while protecting user capital.
