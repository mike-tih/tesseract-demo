# Tesseract Demo Vault - Frontend

React + TypeScript frontend for Tesseract Demo Vault. Built with Vite, wagmi v2, RainbowKit, and Tailwind CSS.

## ✅ What's Done

- ✅ Vite + React + TypeScript setup
- ✅ wagmi v2 + viem + RainbowKit configured
- ✅ Tailwind CSS styling
- ✅ Basic routing (User & Admin pages)
- ✅ Wallet connection (RainbowKit)
- ✅ Contract configuration
- ✅ Page layouts & UI components
- ✅ **Contract interaction hooks** (useVaultData, useUserPosition, useStrategies, useAdminRole)
- ✅ **Full deposit/withdraw functionality**
- ✅ **Admin panel with strategy management**
- ✅ **Transaction state handling & loading indicators**

## 🚀 Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env:
# - Add WalletConnect Project ID
# - Add deployed Vault address

# 3. Run development server
npm run dev
```

Visit http://localhost:3000

## 📦 Structure

```
src/
├── config/
│   ├── wagmi.ts          # wagmi + RainbowKit config
│   └── contracts.ts      # Contract addresses & ABIs
├── pages/
│   ├── UserPage.tsx      # Deposit/withdraw interface
│   └── AdminPage.tsx     # Strategy management
├── App.tsx               # Main app with routing
└── main.tsx              # App entry with providers
```

## 📋 Implemented Features

### User Page (/)
- **Vault Stats Display**: Real-time TVL, user balance, and shares
- **Deposit Flow**:
  - USDC balance display
  - Smart approval (only shows when needed)
  - Transaction state handling (approving, depositing)
  - Input validation
- **Withdraw Flow**:
  - Available balance display
  - Transaction state handling
  - Max amount validation
- **Strategy Breakdown**: Live data from all configured strategies with allocation percentages

### Admin Page (/admin)
- **Role-Based Access Control**: Checks user permissions on-chain
- **Strategy Management**:
  - Add new ERC-4626 strategies
  - View all strategies with current/max debt
  - Active status indicators
- **Rebalancing**:
  - Update individual strategy debt allocations
  - One-click equal allocation across all strategies
  - Dropdown strategy selection
- **Queue Management**: View withdraw queue order

### Custom Hooks (src/hooks/)
- **useVaultData**: Fetch totalAssets, totalSupply, depositLimit
- **useUserPosition**: User shares, USDC balance, allowance
- **useStrategies**: All strategies, debt allocations, queue
- **useAdminRole**: Permission checks for all admin operations

## ⏳ Remaining Tasks

### 1. Get Full Vault ABI

After compiling the Vault contract, update the ABI in `src/config/contracts.ts`:
```bash
# In contracts directory
npm run compile:vault

# Copy the ABI from artifacts/Vault.json to frontend/src/config/contracts.ts
# Replace the simplified VAULT_ABI with the full ABI
```

### 2. Configure Environment Variables

Update `.env.local` with actual deployed addresses:
```env
VITE_WALLET_CONNECT_ID=your_walletconnect_project_id
VITE_VAULT_ADDRESS=0x...  # Deployed vault address
VITE_USDC_ADDRESS=0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48  # Mainnet USDC
VITE_DEFAULT_CHAIN_ID=1  # 1 for mainnet, 11155111 for Sepolia
```

### 3. Test Before Deployment

Run the dev server and test all features:
```bash
npm run dev
# Visit http://localhost:3000
# Connect wallet
# Test deposit/withdraw
# Test admin operations (if you have admin role)
```

## 🎨 Available Components

Pre-styled Tailwind classes:
- `.btn-primary` - Primary button
- `.btn-secondary` - Secondary button
- `.card` - Card container
- `.input` - Text input
- `.label` - Form label

## 📝 Environment Variables

```env
VITE_WALLET_CONNECT_ID=your_project_id
VITE_VAULT_ADDRESS=0x...  # From deployment
VITE_USDC_ADDRESS=0x...   # USDC token
VITE_DEFAULT_CHAIN_ID=11155111  # Sepolia
```

## 🧪 Testing

1. Deploy contracts on Sepolia
2. Configure .env with deployed vault address
3. Run `npm run dev`
4. Connect wallet (Sepolia testnet)
5. Test deposit/withdraw flows
6. Test admin operations

## 📚 Resources

- [wagmi Docs](https://wagmi.sh)
- [RainbowKit Docs](https://www.rainbowkit.com)
- [TanStack Query](https://tanstack.com/query)
- [Tailwind CSS](https://tailwindcss.com)

## License

GPL-3.0
