# Next Steps

This document outlines potential next steps for enhancing the Tesseract demo vault.

## Table of Contents
- [Allocator Bot](#allocator-bot)
- [Reward Token Harvester](#reward-token-harvester)
- [Subgraph for Historical Data](#subgraph-for-historical-data)

---

## Allocator Bot

### Purpose

Automate capital allocation across strategies to optimize yield while maintaining liquidity for withdrawals.

### Core Responsibilities

**1. Allocation Management**
- Monitors `totalIdle` in vault
- Triggers rebalancing when idle capital exceeds configured threshold
- Distributes capital to strategies based on target allocation percentages
- Calls `vault.update_debt(strategy, target_debt)` to adjust positions

**2. Target Allocation Storage**
- Maintains off-chain database or configuration file with target weights
- Example configuration:
  ```json
  {
    "strategies": [
      {
        "address": "0x...",
        "name": "Morpho USDC Vault A",
        "targetAllocation": 0.40,  // 40%
        "maxDebt": 5000000,        // 5M USDC
        "minDebt": 100000          // 100K USDC
      },
      {
        "address": "0x...",
        "name": "Morpho USDC Vault B",
        "targetAllocation": 0.35,
        "maxDebt": 4000000,
        "minDebt": 100000
      },
      {
        "address": "0x...",
        "name": "PYUSD Strategy",
        "targetAllocation": 0.25,
        "maxDebt": 3000000,
        "minDebt": 50000
      }
    ],
    "rebalanceThreshold": 1000000,  // 1M USDC idle triggers rebalance
    "minIdleBuffer": 500000         // Keep 500K USDC for withdrawals
  }
  ```

**3. Withdrawal Queue Management**
- Maintains ordered queue of strategies for withdrawals
- Strategy at position 0 in queue is depleted first during user withdrawals
- Bot can rotate queue based on:
  - Strategy performance (deprioritize underperformers)
  - Liquidity availability (prioritize liquid strategies)
  - Risk assessment (prioritize lower-risk strategies for exits)
- Updates vault via `vault.set_default_queue([strategy1, strategy2, ...])`

**4. Rebalancing Logic**
```python
def rebalance():
    total_assets = vault.totalAssets()
    total_idle = vault.totalIdle()

    # Check if rebalancing needed
    if total_idle < config.rebalance_threshold:
        return

    # Calculate target debts
    for strategy in strategies:
        target_debt = (total_assets - config.min_idle_buffer) * strategy.target_allocation
        current_debt = vault.strategies(strategy.address).current_debt

        # Adjust debt if deviation exceeds threshold
        if abs(target_debt - current_debt) > strategy.min_debt:
            vault.update_debt(strategy.address, target_debt)
```

### Integration with Admin (FinOps)

The bot operates within limits set by human administrators:

**Admin Responsibilities:**
1. **Set Strategy Max Debt:**
   - `vault.update_max_debt_for_strategy(strategy, new_max_debt)`
   - Bot cannot allocate beyond this limit
   - Provides risk control and governance

2. **Approve New Strategies:**
   - `vault.add_strategy(new_strategy)`
   - Admin adds strategy to whitelist
   - Bot then includes it in allocation calculations

3. **Emergency Controls:**
   - `vault.revoke_strategy(strategy)` - prevents new deposits
   - `vault.force_revoke_strategy(strategy)` - immediately withdraws all capital
   - `vault.shutdown_vault()` - stops all deposits, enables withdrawals only

4. **Adjust Vault Limits:**
   - `vault.set_deposit_limit(new_limit)` - control TVL growth
   - `vault.set_minimum_total_idle(amount)` - ensure withdrawal liquidity

**Operational Flow:**
```
┌──────────────┐
│  Admin       │ Sets max_debt, adds strategies, adjusts limits
│  (FinOps)    │
└──────────────┘
       │
       ▼
┌──────────────┐
│ Allocator    │ Monitors idle, rebalances within limits
│ Bot          │ Manages queue, executes allocation strategy
└──────────────┘
       │
       ▼
┌──────────────┐
│ Vault        │ Executes debt updates, enforces limits
└──────────────┘
```

### Technical Implementation

**Bot Architecture:**
- TypeScript/Node.js service
- Runs on scheduled intervals (e.g., every 6 hours)
- Uses ethers.js/viem for blockchain interactions
- Integrates with vault via `IVault` interface

**Monitoring & Alerting:**
- Track rebalancing transactions
- Alert on failed allocations
- Monitor strategy health metrics
- Gas price optimization for transaction timing

---

## Reward Token Harvester

### The Problem

Many DeFi protocols distribute rewards in their native governance tokens to boost effective APY. For example:

- **Morpho:** Distributes MORPHO tokens to MetaMorpho vault depositors
- **Compound:** Distributes COMP tokens
- **Aave:** Distributes stkAAVE tokens
- **Euler:** May distribute EUL tokens

These rewards are **not automatically included** in the vault's `totalAssets` calculation. They must be:
1. Claimed from reward distributors
2. Converted to USDC
3. Deposited back into the vault as profit

### Current Situation

Without reward handlers:
- Reward tokens accumulate unclaimed in strategy contracts
- Users don't benefit from this additional yield
- Reported APY is lower than effective APY
- Competitive disadvantage vs. native protocol deposits

### Proposed Solution: Harvester Bot + Proxy Contract

**Primary Component: Backend Bot** (similar to allocator bot)
- TypeScript/Node.js service running on schedule
- Monitors protocol APIs for claimable rewards (e.g., Morpho URD API with merkle proofs)
- Calculates optimal timing: harvest when `gasUsed × gasPrice < rewards × 0.02`
- Triggers claim transactions via proxy contract
- Uses DEX aggregators (1inch, Paraswap) for best swap rates

**Helper Component: Proxy Contract**
- Simple intermediary contract that acts on behalf of vault
- Receives rewards from protocol distributors
- Swaps reward tokens → USDC via DEX aggregators
- Deposits USDC back to vault as profit
- **Why needed:** Vault is immutable, can't add reward claiming logic directly

**Operational Flow:**
```
1. Bot queries API: "How much MORPHO can vault claim?"
2. If claimable_rewards > gas_threshold:
   3. Bot → proxy.harvestRewards(strategy, merkle_proof)
   4. Proxy → Morpho URD.claim() → receives MORPHO tokens
   5. Proxy → 1inch.swap(MORPHO → USDC)
   6. Proxy → vault.deposit(USDC)
   7. Vault updates pricePerShare → all users benefit
```

**Key Benefits:**
- Vault core stays clean (no modifications to battle-tested code)
- Bot handles off-chain optimization (timing, gas price monitoring)
- Proxy is minimal and upgradeable (low security risk)
- Rewards automatically distributed to all vault shareholders

**Expected Impact:**
- Morpho rewards: +1-5% APY boost
- Varies based on vault utilization and MORPHO token price
- Should be monitored and displayed separately in UI

---

## Subgraph for Historical Data

### Purpose

Index on-chain vault events to provide historical data, charts, and calculated metrics for the frontend dashboard.

### Implementation

**The Graph Subgraph:**
- Indexes vault events: `Deposit`, `Withdraw`, `StrategyReported`, `DebtUpdated`
- Stores time-series data: TVL snapshots, share price history, strategy allocations
- Pre-calculates metrics: APY, daily volume, strategy performance

**Key Metrics:**
- **Historical APY:** Calculate from share price changes over time periods (7d, 30d, 90d)
- **TVL Charts:** Daily/hourly snapshots of total value locked
- **Strategy Breakdown:** Track allocation changes and individual strategy yields
- **User Analytics:** Deposit/withdrawal volumes, unique depositors count

**Frontend Integration:**
```typescript
// Query subgraph for APY chart data
const apy7d = calculateAPY(pricePerShare_now, pricePerShare_7d_ago);
const tvlHistory = query.vaultSnapshots(last: 30, orderBy: timestamp);
```

**Benefits:**
- Fast historical queries (no need to scan all blocks)
- Decentralized data indexing (The Graph network)
- Enables rich dashboard visualizations
- Lower RPC load on frontend