import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";

dotenv.config();

const CELO_RPC_URL = process.env.CELO_RPC_URL || "https://alfajores-forno.celo-testnet.org";
const DEPLOYER_PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY || "0x0000000000000000000000000000000000000000000000000000000000000001";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    alfajores: {
      url: CELO_RPC_URL,
      chainId: 44787,
      accounts: [DEPLOYER_PRIVATE_KEY],
    },
    hardhat: {
      chainId: 31337,
    },
  },
  paths: {
    sources: "./",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
};

export default config;
