# Security and Risk Analysis

## Executive Summary

The Tesseract vault inherits Yearn V3's battle-tested security model while introducing multi-strategy integration risks. The system prioritizes user fund safety through defense-in-depth, fail-safe defaults, and graceful degradation under attack.

**Risk Hierarchy:**
- **Critical:** Strategy selection and integration
- **High:** Profit reporting, admin key management
- **Medium:** Withdrawal queue, liquidity management
- **Low:** Core vault logic (proven Yearn V3 code)

---

## Highest-Risk Components

### 1. Strategy Contracts (Critical Risk)

**Why Critical:**
- Hold 90%+ of user funds during normal operation
- External code execution outside vault control
- Integration with third-party protocols (Morpho, Euler)
- Potential for complete capital loss if exploited

**Primary Attack Vector:**
```
Malicious Strategy Flow:
Admin adds compromised strategy → Vault allocates 1M USDC via update_debt()
→ Strategy.deposit() transfers to attacker → Permanent loss
```

**Mitigations:**

1. **Strategy Whitelisting**
   - Only `ADD_STRATEGY_MANAGER` role can add strategies
   - Requires multi-sig approval (4/7)
   - 48-hour timelock before activation

2. **Debt Limits**
   - Per-strategy `max_debt` caps (e.g., 20% of TVL)
   - Limits blast radius of single failure
   - Enforced in `update_debt()` function

3. **Approval Checklist**
   - Smart contract audit required
   - ERC-4626 compliance verification
   - Testnet deployment with monitoring
   - Gradual rollout (low initial max_debt)

4. **Emergency Controls**
   - `revoke_strategy()` - stops new deposits
   - `force_revoke_strategy()` - immediate full withdrawal
   - Executable by `REVOKE_STRATEGY_MANAGER` (2/7 multi-sig)

5. **Continuous Monitoring**
   - Off-chain health checks every 5 minutes
   - Alert on unexpected balance changes >2%
   - Automatic revocation if loss exceeds 10%

### 2. Profit Reporting (High Risk)

**Risk:** Manipulation of share price via false profit reports

**Protection:**
- **Automated Calculation:** Vault queries `strategy.totalAssets()` directly, no manual input
- **Profit Unlocking:** Gains unlock linearly over 7 days (`profitMaxUnlockTime`)
- **Loss Transparency:** Users must accept `max_loss` parameter to withdraw during losses
- **Accountant Validation:** Optional accountant contract validates reasonableness (currently disabled)

**Why It Works:**
- Linear unlocking prevents instant price pumps
- Attackers cannot deposit and immediately withdraw at inflated prices
- 7-day window allows detection and response

### 3. Admin Key Compromise (High Risk)

**Single Point of Failure:** `role_manager` controls all permissions

**Attack Impact:**
```
Attacker gains role_manager key → Grants self ADD_STRATEGY_MANAGER role
→ Adds malicious strategy → Allocates all funds → Drains vault
```

**Mitigations:**

1. **Multi-Signature Governance**
   ```
   Gnosis Safe 4-of-7 Multi-Sig
   ├─ 3 Core Team Members
   ├─ 2 External Advisors
   ├─ 1 Security Firm Rep
   └─ 1 Community Rep
   ```

2. **Tiered Authorization**
   - Standard operations: 4/7 signatures
   - Emergency response: 2/7 signatures (revoke, shutdown)
   - Bot operations: Single EOA (limited to DEBT_MANAGER role)

3. **Emergency Shutdown**
   ```vyper
   def shutdown_vault():
       self.isShutdown = True  # Stops deposits, allows withdrawals
   ```
   - Any admin can trigger during compromise
   - Prevents attacker from adding malicious strategies
   - Users retain exit rights

---

## Smart Contract Security

### Core Protections (Inherited from Yearn V3)

**Reentrancy:** Not possible
- Vyper's checks-effects-interactions pattern
- State updates before external calls
- No cross-function reentrancy allowed

**Integer Overflow:** Not possible
- Vyper 0.3.10 built-in overflow protection
- All arithmetic operations revert on overflow

**Access Control:** Role-based permissions (14 roles)
- Bitmask system for granular permissions
- Two-step role manager transfer
- Least privilege principle enforced

### Known Limitations

**No Upgradability:**
- Vault is immutable (design choice)
- Bug fixes require user migration to new vault
- Tradeoff: Security > flexibility

**Unlimited Strategy Approvals:**
- Vault approves exact amounts to strategies
- No residual approvals after deposits
- Risk: Compromised strategy can drain approved amount

---

## Strategy-Specific Risks

### Failure Modes (Explicitly Designed For)

#### 1. Strategy Insolvency (100% Loss)

**System Response:**
```vyper
# process_report() handles gracefully
loss = current_debt - strategy_total_assets
self.totalDebt -= loss
# Loss socialized to all shareholders via reduced pricePerShare
# Vault continues operating normally
```

**User Impact:**
- Share price decreases proportionally
- Can still deposit/withdraw from vault
- Other strategies unaffected

**Recovery:** Revoke failed strategy, reallocate to healthy ones

#### 2. Strategy Illiquidity

**Scenario:** Cannot withdraw (e.g., all Morpho USDC borrowed)

**Protection:**
- `minimum_total_idle` = 5% TVL kept liquid in vault
- Absorbs small withdrawals without touching strategies

**Behavior:**
- Small withdrawals: Instant (from idle buffer)
- Large withdrawals: Pull from strategies via queue
- Insufficient liquidity: Revert (intentional, prevents bank run)

#### 3. Strategy Reports Incorrect Values

**Risk:** Malicious ERC-4626 lies about share value

**Detection:**
```python
vault_view = vault.strategies(strategy).current_debt
strategy_view = strategy.convertToAssets(vault.balanceOf(strategy))

if abs(vault_view - strategy_view) / vault_view > 0.01:
    alert_and_revoke(strategy)
```

**Prevention:** Only whitelist audited, reputable ERC-4626 implementations

---

## Economic Risks

### Bank Run Scenario

**Trigger:** 30%+ users withdraw simultaneously

**Protection Mechanisms:**

1. **Withdrawal Queue** - Spreads load across strategies in order
2. **Max Loss Requirement** - Users must accept potential loss
3. **Idle Buffer** - 5% TVL always liquid for small withdrawals
4. **Intentional Revert** - Prevents unfair first-mover advantage

**Designed Outcome:**
- System degrades gracefully under stress
- No single user can drain vault ahead of others
- Orderly withdrawal queue maintained

### Liquidity Crisis

**Scenario:** All strategies illiquid simultaneously

**Response:**
- Withdrawals revert with "Insufficient liquidity"
- Users wait for strategies to become liquid
- No emergency liquidations at unfair prices

**Acceptance:** This is intentional design, prevents forced selling

---

## External Dependencies

### Morpho Protocol Risk

**Dependency:** Primary strategies are MetaMorpho vaults

**Risk Assessment:**
- Smart contract exploit → Accepts (Morpho is audited by Trail of Bits, Spearbit)
- Oracle manipulation → Not our concern (we're lenders, not borrowers)
- Governance attack → Mitigated (use trusted MetaMorpho curators)
- Liquidity freeze → Accepted (inherent lending risk)

**Justification:** Morpho is industry-leading with >$2B TVL and immutable core

### USDC Centralization

**Risks Accepted:**
- **USDC Depeg:** Vault shares still function correctly
- **Address Freezing:** Extremely low likelihood
- **USDC Shutdown:** Emergency governance can add migration strategy

**Why USDC:** Simplicity over diversification (multi-stablecoin adds complexity)

---

## Design Tradeoffs

### 1. Immutability vs. Upgradability

**Decision:** Immutable (no proxy, no upgrade keys)

**Rationale:**
- ✅ No admin can change vault logic
- ✅ Eliminates entire class of upgrade attacks
- ✅ Simpler security model
- ❌ Cannot patch bugs (must migrate)

**Why Immutable:** Security > flexibility for user funds

### 2. Flexibility vs. Safety

**Decision:** Flexible strategy system with strict safety rails

- Flexibility: Any ERC-4626 strategy can be added
- Safety: Whitelisting, debt caps, multi-sig governance

**Balance:** Professional management within strict limits

### 3. Centralization vs. Decentralization

**Strategy Selection:** Centralized (multi-sig)
- Requires expertise for yield optimization
- Emergency response capabilities

**User Actions:** Decentralized (permissionless)
- Fair access for deposits/withdrawals
- Prevents censorship

**Justification:** Users trust professional management, retain exit rights

### 4. Gas Efficiency vs. Simplicity

**Decision:** Favor simplicity over gas optimization

**Examples:**
- Withdrawal queue: Array iteration (~5-10K extra gas)
- Share calculation: Built-in Vyper math (safe but not optimal)
- Event logging: Detailed events (transparency > gas)

**Rationale:** Security and auditability > user gas costs

### 5. Single Asset vs. Multi-Asset

**Decision:** USDC only

**Pros:** Simple accounting, no oracles, lower gas, clear APY
**Cons:** USDC centralization risk, limited market

**Why:** First version should be simple, can expand later

---

## User Protection Mechanisms

### Share Price Manipulation Protection

**Mechanism:** Profit unlocking period (7 days)
```vyper
profitMaxUnlockTime: public(uint256) = 604800  # 7 days
profitUnlockingRate: public(uint256)  # profit per second
```

**Effect:** Share price increases gradually, not instantly
- Prevents pump-and-dump attacks
- Front-running profit reports unprofitable

### Loss Transparency

**Mechanism:** Explicit `max_loss` parameter
```vyper
def withdraw(..., max_loss: uint256):
    actual_loss = self._calculate_loss(assets)
    assert actual_loss <= max_loss, "Loss exceeds max_loss"
```

**User Experience:** Must accept losses explicitly, no surprises

### Deposit Limits

**Evolution:**
- Launch: 1M USDC
- Month 1: 5M USDC (proven stable)
- Month 3: 20M USDC (strategies tested)
- Month 6: 100M USDC (mature product)

**Purpose:** Gradual risk scaling as confidence grows

### Emergency Shutdown

**Trigger:** Critical bug, admin compromise, or regulatory pressure

**Effect:**
```vyper
def deposit(...): assert not self.isShutdown  # Blocked
def withdraw(...): # Always allowed
```

**User Protection:** Prevents new deposits, always allows exit
