# Tesseract Demo Vault

ERC-4626 vault aggregator built on Yearn V3 that accepts USDC and distributes capital across multiple Morpho USDC vaults.

> **Note**: This is a technical assessment project for Tesseract.

## Live Deployment

### Contracts

**Ethereum Mainnet:**
- Vault: [`0xB6D9171a325188AB0fECD756B8Cc2CEFf817336F`](https://etherscan.io/address/0xB6D9171a325188AB0fECD756B8Cc2CEFf817336F)
- USDC: [`0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48`](https://etherscan.io/address/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48)

**Sepolia Testnet:**
- Vault: [`0xCebA0ba1706931b5272EBB5eABE6E9453C462fB2`](https://sepolia.etherscan.io/address/0xCebA0ba1706931b5272EBB5eABE6E9453C462fB2)
- USDC: [`0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238`](https://sepolia.etherscan.io/address/0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238)

### Live App

[https://tesseract-demo-alpha.vercel.app/](https://tesseract-demo-alpha.vercel.app/)

## Project Structure

```
tesseract-demo/
├── contracts/          # Smart contracts (Hardhat + Vyper)
│   ├── contracts/
│   │   ├── interfaces/     # Solidity interfaces
│   │   └── vault/          # Yearn V3 Vault.vy
│   └── scripts/            # Deployment scripts
│
└── frontend/          # React + TypeScript + wagmi
    ├── src/
    │   ├── pages/          # User & Admin pages
    │   ├── components/     # React components
    │   ├── hooks/          # Custom hooks
    │   └── config/         # Contract ABIs & config
    └── public/
```

## Architecture

```
User (USDC) → Tesseract Vault (ERC-4626) → Strategies (MetaMorpho Vaults)
                     ↓
              Vault Shares (TDV)
```

**Key Components:**
- **Yearn V3 Vault** - Unmodified, battle-tested vault implementation
- **ERC-4626** - Standard vault interface for deposits/withdrawals
- **Multi-Strategy** - Distribute capital across multiple Morpho vaults
- **Role-Based Access** - Granular permissions for strategy management
- **Web Dashboard** - React frontend for users and admins

## Features

**User Features:**
- Deposit USDC, receive vault shares (TDV)
- Withdraw USDC by burning shares
- View strategy breakdown and allocation
- Real-time vault statistics

**Admin Features:**
- Add/remove strategies
- Set max debt per strategy
- Rebalance capital allocation
- Manage deposit limits
- Role management (14 role types)

## Strategy Implementation

**Strategy A — Morpho USDC Vaults:** ✅ Implemented
- Direct ERC-4626 integration with MetaMorpho vaults
- Native USDC deposits, no conversion needed

**Strategy B — PYUSD Vault on Euler:** Requires wrapper contract
- Would need custom ERC-4626 wrapper contract as intermediary layer
- Handles USDC → PYUSD conversion before depositing to Euler
- Additional considerations: incentive rewards claiming, valuation oracles, manipulation risks

## Quick Start

### 1. Contracts Setup

```bash
cd contracts

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your RPC URL and private key

# Compile Yearn V3 Vault
npm run compile:vault

# Deploy to Sepolia testnet
npm run deploy:sepolia

# Configure strategies (optional)
npm run configure:sepolia
```

### 2. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with deployed vault address

# Run development server
npm run dev
```

Visit `http://localhost:5173`

## Deployment

### Deploy Vault Contract

```bash
cd contracts

# Deploy to Sepolia
npm run deploy:sepolia

# Deploy to Mainnet
npm run deploy:mainnet
```

The deployment script will:
1. Deploy Yearn V3 Vault with USDC as asset
2. Set admin address
3. Output vault address

### Deploy Frontend

```bash
cd frontend

# Build for production
npm run build

# Preview build
npm run preview
```

Deploy `dist/` folder to Vercel, Netlify, or any static hosting.

## Configuration

### Environment Variables

**Contracts (`contracts/.env`):**
```env
MAINNET_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY
PRIVATE_KEY=your_private_key
ADMIN_ADDRESS=0x...
MAINNET_USDC_ADDRESS=0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48
```

**Frontend (`frontend/.env`):**
```env
VITE_WALLET_CONNECT_ID=your_walletconnect_project_id
VITE_MAINNET_VAULT_ADDRESS=0x...
VITE_MAINNET_USDC_ADDRESS=0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48
```

## Tech Stack

**Contracts:**
- Vyper 0.3.10 (Yearn V3 Vault)
- Hardhat (deployment framework)
- Solidity 0.8.x (interfaces)

**Frontend:**
- React 18 + TypeScript
- Vite (build tool)
- wagmi v2 + viem (Ethereum interactions)
- RainbowKit (wallet connection)
- TailwindCSS (styling)

## Resources

- [Yearn V3 Documentation](https://docs.yearn.fi/developers/v3/overview)
- [Yearn V3 GitHub](https://github.com/yearn/yearn-vaults-v3)
- [ERC-4626 Standard](https://eips.ethereum.org/EIPS/eip-4626)
- [Morpho Documentation](https://docs.morpho.blue)
- [wagmi Documentation](https://wagmi.sh)

## License

GPL-3.0 (same as Yearn V3)
