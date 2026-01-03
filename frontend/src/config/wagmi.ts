import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { mainnet, sepolia } from 'wagmi/chains';

export const config = getDefaultConfig({
  appName: 'Tesseract Demo Vault',
  projectId: import.meta.env.VITE_WALLET_CONNECT_ID || '',
  chains: [mainnet, sepolia],
});
