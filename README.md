# Yield Index Vault

ERC-4626 vault aggregator that accepts USDC and distributes capital across multiple Morpho USDC vaults. Built on Yearn V3 Vault (unmodified).

## Project Structure

```
tesseract-demo/
├── contracts/          # Smart contracts (Hardhat + Vyper)
│   ├── contracts/
│   │   ├── interfaces/     # Solidity interfaces
│   │   └── vendor/         # Yearn V3 Vault.vy
│   ├── scripts/            # Deployment & configuration
│   ├── artifacts/          # Compiled contracts
│   └── README.md          # Contracts documentation
│
└── frontend/          # React + TypeScript frontend
    ├── src/
    │   ├── pages/          # User & Admin pages
    │   ├── components/     # React components
    │   ├── hooks/          # Custom hooks
    │   └── config/         # wagmi & contract config
    └── README.md          # Frontend documentation
```

## Quick Start

### Contracts

```bash
cd contracts

# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your settings

# 3. Compile Yearn V3 Vault
npm run compile:vault

# 4. Deploy vault
npm run deploy:sepolia

# 5. Configure strategies
npm run configure:sepolia
```

**See [`contracts/README.md`](./contracts/README.md) for detailed instructions.**

### Frontend

```bash
cd frontend

# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env with deployed vault address

# 3. Run development server
npm run dev
```

**See [`frontend/README.md`](./frontend/README.md) for detailed instructions.**

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
        │ Admin: addStrategy(), updateDebt()
        ▼
┌───────────────────────────────────────────────────────────────────────┐
│                    STRATEGIES (ERC-4626 Vaults)                        │
├─────────────────┬─────────────────┬─────────────────┬─────────────────┤
│  Strategy 1     │  Strategy 2     │  Strategy 3     │  Strategy 4     │
│  (USDC market)  │  (USDC market)  │  (USDC market)  │  (USDC market)  │
│  e.g. MetaMorpho│  e.g. MetaMorpho│  e.g. MetaMorpho│  e.g. MetaMorpho│
└─────────────────┴─────────────────┴─────────────────┴─────────────────┘
```

## Key Features

✅ **ERC-4626 Compliant** - Standard vault interface
✅ **Multi-Strategy** - Distribute capital across 4 strategies
✅ **Yearn V3 Base** - Battle-tested, audited vault
✅ **No Router Needed** - Vault handles rebalancing internally
✅ **Granular Roles** - 14 role types for access control
✅ **Admin Dashboard** - Web UI for strategy management

## User Flow

### Deposit
1. User approves USDC to vault
2. User calls `deposit(amount, receiver)`
3. Vault mints shares to user
4. Admin allocates capital via `updateDebt(strategy, amount)`

### Withdraw
1. User calls `withdraw(assets, receiver, owner)`
2. Vault pulls funds from strategies (via withdraw queue)
3. Vault burns shares and returns USDC

### Admin Rebalance
1. View current allocations in admin panel
2. Adjust debt per strategy
3. Call `updateDebt()` for each strategy
4. Vault handles transfers automatically

## Configuration

### Environment Variables

Both `contracts/` and `frontend/` need `.env` files:

**Contracts:**
```env
MAINNET_RPC_URL=...
SEPOLIA_RPC_URL=...
PRIVATE_KEY=...
USDC_ADDRESS=0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48
ADMIN_ADDRESS=0x...
STRATEGY_1=0x...  # ERC-4626 vault address
STRATEGY_2=0x...
STRATEGY_3=0x...
STRATEGY_4=0x...
```

**Frontend:**
```env
VITE_WALLET_CONNECT_ID=...
VITE_MAINNET_RPC_URL=...
VITE_SEPOLIA_RPC_URL=...
VITE_VAULT_ADDRESS=...  # From deployment
VITE_USDC_ADDRESS=...
```

## Deployment Checklist

- [ ] Configure `.env` in `contracts/`
- [ ] Find/deploy Yearn V3 VaultFactory (or use existing)
- [ ] Select 4 ERC-4626 USDC strategies (e.g., MetaMorpho vaults)
- [ ] Run `npm run compile:vault` in `contracts/`
- [ ] Run `npm run deploy:sepolia` to test on Sepolia
- [ ] Run `npm run configure:sepolia` to add strategies
- [ ] Test deposit/withdraw on Sepolia
- [ ] Deploy to mainnet when ready
- [ ] Configure frontend `.env` with vault address
- [ ] Deploy frontend to Vercel/Netlify

## Security

- ⚠️ Vault contract is **unmodified Yearn V3** (audited)
- ⚠️ Strategies must be **trusted and ERC-4626 compliant**
- ⚠️ Admin has **full control** over capital allocation
- ⚠️ Use **multisig** for admin address in production
- ⚠️ Test thoroughly on **testnet** before mainnet

## Resources

- [Yearn V3 Docs](https://docs.yearn.fi/developers/v3/overview)
- [Yearn V3 GitHub](https://github.com/yearn/yearn-vaults-v3)
- [ERC-4626 Standard](https://eips.ethereum.org/EIPS/eip-4626)
- [Morpho Docs](https://docs.morpho.blue)
- [wagmi Docs](https://wagmi.sh)
- [RainbowKit Docs](https://www.rainbowkit.com)

## Next Steps

1. **Complete Frontend Setup**:
   - Copy config files from plan (vite.config.ts, tailwind.config.ts, etc.)
   - Implement User page components
   - Implement Admin page components
   - See `/frontend/README.md` for detailed instructions

2. **Find Strategy Addresses**:
   - Research MetaMorpho USDC vaults on Sepolia/Mainnet
   - Verify ERC-4626 compliance
   - Add addresses to `.env`

3. **Test Deployment**:
   - Deploy on Sepolia testnet
   - Test all user flows
   - Test admin operations

4. **Production Deployment**:
   - Deploy on Ethereum mainnet
   - Verify contracts on Etherscan
   - Set up multisig for admin
   - Deploy frontend

## License

GPL-3.0 (same as Yearn V3)
