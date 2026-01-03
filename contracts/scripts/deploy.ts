import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

/**
 * Deployment script for Yield Index Vault
 *
 * Deploys Vault.vy directly from compiled bytecode + calls initialize()
 *
 * Usage:
 *   npm run deploy:sepolia
 *   npm run deploy:mainnet
 */

async function main() {
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();

  console.log("🚀 Yield Index Vault Deployment");
  console.log("================================");
  console.log("Network:", network.name, `(chainId: ${network.chainId})`);
  console.log("Deployer:", deployer.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH\n");

  // Load environment variables
  const USDC_ADDRESS = process.env.USDC_ADDRESS;
  const ADMIN_ADDRESS = process.env.ADMIN_ADDRESS || deployer.address;

  if (!USDC_ADDRESS) {
    throw new Error("USDC_ADDRESS not set in .env");
  }

  console.log("Configuration:");
  console.log("  USDC Address:", USDC_ADDRESS);
  console.log("  Admin Address:", ADMIN_ADDRESS);
  console.log();

  // Load compiled Vault.vy artifact
  const artifactPath = path.join(__dirname, "../artifacts/Vault.json");

  if (!fs.existsSync(artifactPath)) {
    throw new Error(
      "Vault.json not found! Run 'npm run compile:vault' first"
    );
  }

  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

  // Deploy Vault
  console.log("📦 Deploying Vault...\n");

  const VaultFactory = new ethers.ContractFactory(
    artifact.abi,
    artifact.bytecode,
    deployer
  );

  const vault = await VaultFactory.deploy();
  await vault.waitForDeployment();
  const vaultAddress = await vault.getAddress();

  console.log("1️⃣  Vault deployed:", vaultAddress);

  // Initialize vault (Vyper contracts use initialize() instead of constructor)
  console.log("\n2️⃣  Initializing vault...");

  const initTx = await vault.initialize(
    USDC_ADDRESS,              // asset
    "Yield Index Vault",       // name
    "YINDX",                   // symbol
    ADMIN_ADDRESS,             // role_manager
    604800                     // profit_max_unlock_time (7 days in seconds)
  );

  await initTx.wait();
  console.log("   ✅ Vault initialized");

  // Save deployment info
  const deploymentsDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const deploymentFile = path.join(deploymentsDir, `${network.name}.json`);
  const deployment = {
    network: network.name,
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
  console.log("1. Run configuration: npm run configure:sepolia");
  console.log("2. Deploy frontend and add strategies via Admin UI");
  console.log("3. Verify on Etherscan (optional):");
  console.log(`   npx hardhat verify --network ${network.name} ${vaultAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
