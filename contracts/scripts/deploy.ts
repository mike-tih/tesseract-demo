import { ethers } from "ethers";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config();

/**
 * Deployment script for Tesseract Demo Vault
 *
 * Deploys Vault.vy directly from compiled bytecode + calls initialize()
 *
 * Usage:
 *   npm run deploy:sepolia
 *   npm run deploy:mainnet
 */

async function main() {
  // Detect network from command line args or environment
  // When run via "hardhat run --network X", args will be ["--network", "X"]
  const args = process.argv.slice(2);
  const networkIndex = args.indexOf('--network');
  let networkName = networkIndex >= 0 ? args[networkIndex + 1] : process.env.HARDHAT_NETWORK || "sepolia";

  // Use direct RPC connection to avoid hardhat-ethers bug with deployment transactions
  let rpcUrl: string;
  if (networkName === "mainnet") {
    rpcUrl = process.env.MAINNET_RPC_URL!;
  } else if (networkName === "sepolia") {
    rpcUrl = process.env.SEPOLIA_RPC_URL!;
  } else {
    throw new Error(`Unsupported network: ${networkName}`);
  }

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const deployer = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);
  const network = await provider.getNetwork();

  console.log("🚀 Tesseract Demo Vault Deployment");
  console.log("================================");
  console.log("Network:", networkName, `(chainId: ${network.chainId})`);
  console.log("Deployer:", deployer.address);
  console.log("Balance:", ethers.formatEther(await provider.getBalance(deployer.address)), "ETH\n");

  // Load environment variables
  const ADMIN_ADDRESS = process.env.ADMIN_ADDRESS || deployer.address;
  const VAULT_NAME = process.env.VAULT_NAME || "Tesseract Demo Vault";
  const VAULT_SYMBOL = process.env.VAULT_SYMBOL || "YINDX";
  const PROFIT_MAX_UNLOCK_TIME = parseInt(process.env.PROFIT_MAX_UNLOCK_TIME || "604800");

  // Auto-select USDC address based on network
  let USDC_ADDRESS: string;

  if (network.chainId === 1n) {
    // Ethereum Mainnet
    USDC_ADDRESS = process.env.MAINNET_USDC_ADDRESS || "";
    if (!USDC_ADDRESS) {
      throw new Error("MAINNET_USDC_ADDRESS not set in .env");
    }
  } else if (network.chainId === 11155111n) {
    // Sepolia Testnet
    USDC_ADDRESS = process.env.SEPOLIA_USDC_ADDRESS || "";
    if (!USDC_ADDRESS) {
      throw new Error("SEPOLIA_USDC_ADDRESS not set in .env");
    }
  } else {
    throw new Error(`Unsupported network: ${network.name} (chainId: ${network.chainId})`);
  }

  console.log("Configuration:");
  console.log("  USDC Address:", USDC_ADDRESS);
  console.log("  Admin Address:", ADMIN_ADDRESS);
  console.log("  Vault Name:", VAULT_NAME);
  console.log("  Vault Symbol:", VAULT_SYMBOL);
  console.log("  Profit Max Unlock Time:", PROFIT_MAX_UNLOCK_TIME, "seconds");
  console.log();

  // Load compiled Vault.vy artifact
  const artifactPath = path.join(__dirname, "../contracts/artifacts/Vault.json");

  if (!fs.existsSync(artifactPath)) {
    throw new Error(
      "Vault.json not found! Run 'npm run compile:vault' first"
    );
  }

  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

  // Deploy Vault
  console.log("📦 Deploying Vault...\n");

  console.log("   Creating factory...");
  console.log("   Bytecode length:", artifact.bytecode.length);

  const VaultFactory = new ethers.ContractFactory(
    artifact.abi,
    artifact.bytecode,
    deployer
  );

  console.log("   Sending deployment transaction...");
  const vault = await VaultFactory.deploy();

  const deployTx = vault.deploymentTransaction();
  console.log("   Deployment transaction sent:", deployTx?.hash);
  console.log("   Waiting for deployment (this may take 10-20 seconds on mainnet)...");

  // Wait for deployment with custom timeout (5 minutes for mainnet)
  await vault.waitForDeployment();
  const vaultAddress = await vault.getAddress();

  console.log("1️⃣  Vault deployed:", vaultAddress);

  // Initialize vault (Vyper contracts use initialize() instead of constructor)
  console.log("\n2️⃣  Initializing vault...");

  // Type cast to any to avoid TypeScript errors (ABI is dynamically loaded)
  const vaultContract = vault as any;

  const initTx = await vaultContract.initialize(
    USDC_ADDRESS,              // asset
    VAULT_NAME,                // name
    VAULT_SYMBOL,              // symbol
    ADMIN_ADDRESS,             // role_manager
    PROFIT_MAX_UNLOCK_TIME     // profit_max_unlock_time
  );

  console.log("   Initialization transaction sent:", initTx.hash);
  console.log("   Waiting for confirmation...");

  await initTx.wait();
  console.log("   ✅ Vault initialized");

  // Save deployment info
  const deploymentsDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const deploymentFile = path.join(deploymentsDir, `${network.name}.json`);
  const deployment = {
    network: networkName,
    chainId: Number(network.chainId),
    vault: vaultAddress,
    usdc: USDC_ADDRESS,
    admin: ADMIN_ADDRESS,
    deployedAt: new Date().toISOString(),
    deployer: deployer.address,
  };

  fs.writeFileSync(deploymentFile, JSON.stringify(deployment, null, 2));

  console.log("\n📝 Deployment info saved to:", deploymentFile);
  console.log("\n✅ Deployment complete!");
  console.log("\n📍 Vault Address:", vaultAddress);
  console.log("\nNext steps:");
  console.log("1. Run configuration: npm run configure:" + networkName);
  console.log("2. Deploy frontend and add strategies via Admin UI");
  console.log("3. Verify on Etherscan (optional):");
  console.log(`   npx hardhat verify --network ${networkName} ${vaultAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
