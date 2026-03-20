const hre = require("hardhat");

async function main() {
  const signers = await hre.ethers.getSigners();

  if (signers.length === 0) {
    throw new Error("No signers available - check DEPLOYER_PRIVATE_KEY in .env");
  }

  const deployer = signers[0];
  console.log("Deploying BresoAgentRegistry...");
  console.log("Deployer:", deployer.address);
  console.log("Network:", hre.network.name);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Balance:", hre.ethers.formatEther(balance), "CELO");

  if (balance === 0n) {
    throw new Error("Deployer has no balance - get testnet tokens from faucet");
  }

  const Registry = await hre.ethers.getContractFactory("BresoAgentRegistry");
  const registry = await Registry.deploy();
  await registry.waitForDeployment();

  const address = await registry.getAddress();
  console.log("BresoAgentRegistry deployed to:", address);

  const tx = await registry.registerAgent(
    "BRESO - Soledad",
    "AI mental wellness companion for Latin America.",
    "https://github.com/ortugonzalez/mindbridge-"
  );
  await tx.wait();
  console.log("BRESO agent registered! TX:", tx.hash);

  const fs = require("fs");
  const output = {
    network: "celo-sepolia",
    contractAddress: address,
    registerTx: tx.hash,
    timestamp: new Date().toISOString()
  };
  fs.writeFileSync("deployment.json", JSON.stringify(output, null, 2));
  console.log("Saved to deployment.json");
  console.log("View on explorer: https://celo-sepolia.blockscout.com/address/" + address);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
