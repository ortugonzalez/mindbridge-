require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

const key = process.env.DEPLOYER_PRIVATE_KEY;
// Only include the key when it looks like a valid 32-byte hex private key
const accounts = key && /^(0x)?[0-9a-fA-F]{64}$/.test(key) ? [key] : [];

module.exports = {
  solidity: {
    version: "0.8.24",
    settings: { evmVersion: "cancun" }
  },
  networks: {
    "celo-sepolia": {
      url: "https://celo-sepolia.drpc.org",
      chainId: 11142220,
      accounts
    }
  }
};
