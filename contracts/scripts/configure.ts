import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

/**
 * Configuration script for Yield Index Vault
 *
 * This script configures a deployed Yearn V3 Vault:
 * 1. Sets admin roles
 * 2. Sets deposit limits
 *
 * Note: Strategies are added via the admin UI, not during deployment
 *
 * Usage:
 *   npm run configure -- --network sepolia
 *   npm run configure -- --network mainnet
 */

async function main() {
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();

  console.log("⚙️  Yield Index Vault Configuration");
  console.log("===================================");
  console.log("Network:", network.name, `(chainId: ${network.chainId})`);
  console.log("Deployer:", deployer.address);
  console.log();

  // Load deployment info
  const deploymentFile = path.join(__dirname, `../deployments/${network.name}.json`);

  if (!fs.existsSync(deploymentFile)) {
    throw new Error(
      `Deployment file not found: ${deploymentFile}\n` +
        "Please run 'npm run deploy' first"
    );
  }

  const deployment = JSON.parse(fs.readFileSync(deploymentFile, "utf8"));
  const vaultAddress = deployment.vault;

  console.log("Vault Address:", vaultAddress);
  console.log();

  // Load configuration from environment
  const ADMIN_ADDRESS = process.env.ADMIN_ADDRESS || deployer.address;
  const MAX_DEPOSIT_LIMIT = process.env.MAX_DEPOSIT_LIMIT || "10000000"; // 10M USDC default

  // Connect to vault
  const vault = await ethers.getContractAt(
    "contracts/contracts/interfaces/IVault.sol:IVault",
    vaultAddress
  );

  // Import Roles library
  const RolesLib = await ethers.getContractAt(
    "contracts/contracts/interfaces/Roles.sol:Roles",
    ethers.ZeroAddress // Library doesn't need deployment
  );

  const ALL_ROLES = 16383n; // Roles.ALL

  console.log("Configuration:");
  console.log("  Admin:", ADMIN_ADDRESS);
  console.log(`  Max Deposit Limit: ${MAX_DEPOSIT_LIMIT} USDC`);
  console.log();

  // Step 1: Grant admin all roles
  console.log("1️⃣  Granting admin roles...");
  const currentRoles = await vault.roles(ADMIN_ADDRESS);

  if (currentRoles === ALL_ROLES) {
    console.log("   ✅ Admin already has all roles");
  } else {
    const tx = await vault.set_role(ADMIN_ADDRESS, ALL_ROLES);
    await tx.wait();
    console.log("   ✅ Admin roles granted (tx:", tx.hash, ")");
  }

  console.log();

  // Step 2: Set deposit limit
  console.log("2️⃣  Setting deposit limit...");
  const depositLimit = ethers.parseUnits(MAX_DEPOSIT_LIMIT, 6);
  console.log(`   Limit: ${ethers.formatUnits(depositLimit, 6)} USDC`);

  try {
    const tx = await vault.set_deposit_limit(depositLimit);
    await tx.wait();
    console.log("   ✅ Deposit limit set (tx:", tx.hash, ")");
  } catch (error: any) {
    console.error("   ❌ Failed to set deposit limit:", error.message);
  }

  console.log();
  console.log("✅ Configuration complete!");
  console.log("\nVault deployed successfully!");
  console.log("\nNext steps:");
  console.log("1. Deploy frontend and connect to vault");
  console.log("2. Add strategies via Admin UI (Admin → Add Strategy)");
  console.log("3. Set max debt limits for each strategy");
  console.log("4. Configure withdraw queue");
  console.log("5. Allocate capital using the rebalance panel");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
