import type { HardhatUserConfig } from "hardhat/config";

import hardhatToolboxMochaEthersPlugin from "@nomicfoundation/hardhat-toolbox-mocha-ethers";
import { configVariable } from "hardhat/config";

import dotenv from "dotenv";
dotenv.config();
const config: HardhatUserConfig = {
  plugins: [hardhatToolboxMochaEthersPlugin],
  solidity: {
    profiles: {
      default: {
        version: "0.8.28",
      },
      production: {
        version: "0.8.28",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    },
  },
  networks: {
    hardhatMainnet: {
      type: "edr-simulated",
      chainType: "l1",
    },
    hardhatOp: {
      type: "edr-simulated",
      chainType: "op",
    },
    sepolia: {
      type: "http",
      chainType: "l1",
      url: configVariable("SEPOLIA_RPC_URL"),
      accounts: [configVariable("SEPOLIA_PRIVATE_KEY")],
    },
    base: {
      type: "http",
      chainType: "l1",
      url: configVariable("BASE_RPC_URL"),
      accounts: [configVariable("BASE_PRIVATE_KEY")],
    },
    hederaTestnet: {
      type: "http",
      chainType: "l1",
      url: configVariable("HEDERA_TESTNET_RPC_URL") || "https://testnet.hashio.io/api",
      chainId: 296,
      accounts: [configVariable("HEDERA_TESTNET_PRIVATE_KEY")],
      gas: "auto",
      gasPrice: "auto",
    },
    hederaMainnet: {
      type: "http",
      chainType: "l1",
      url: configVariable("HEDERA_MAINNET_RPC_URL") || "https://mainnet.hashio.io/api",
      chainId: 295,
      accounts: [configVariable("HEDERA_MAINNET_PRIVATE_KEY")],
      gas: "auto",
      gasPrice: "auto",
    },
    flowTestnet: {
      type: "http",
      chainType: "l1",
      url: configVariable("FLOW_TESTNET_RPC_URL") || "https://testnet.evm.nodes.onflow.org",
      chainId: 545,
      accounts: [configVariable("FLOW_TESTNET_PRIVATE_KEY")],
      gas: "auto",
      gasPrice: "auto",
    },
    flowMainnet: {
      type: "http",
      chainType: "l1",
      url: configVariable("FLOW_MAINNET_RPC_URL") || "https://mainnet.evm.nodes.onflow.org",
      chainId: 747,
      accounts: [configVariable("FLOW_MAINNET_PRIVATE_KEY")],
      gas: "auto",
      gasPrice: "auto",
    },
  },
  verify: {
    etherscan: {
      apiKey: "T2JC7EAM9G5QQ6GD61XUZUDI3MFQJAK244",
    },
  },
chainDescriptors: {
    // Ethereum chains
    11155111: {
      name: "Sepolia",
      blockExplorers: {
        etherscan: {
          name: "Etherscan",
          url: "https://sepolia.etherscan.io",
          apiUrl: "https://api.etherscan.io/v2/api",
        },
      },
    },
    8453: {
      name: "Base",
      blockExplorers: {
        etherscan: {
          name: "Etherscan",
          url: "https://basescan.org/",
          apiUrl: "https://api.etherscan.io/v2/api",
        },
      },
    },
    // Hedera chains
    296: {
      name: "Hedera Testnet",
      blockExplorers: {
        hashscan: {
          name: "Hashscan",
          url: "https://hashscan.io/testnet",
          apiUrl: "https://api.testnet.hashscan.io",
        },
      },
    },
    295: {
      name: "Hedera Mainnet",
      blockExplorers: {
        hashscan: {
          name: "Hashscan",
          url: "https://hashscan.io",
          apiUrl: "https://api.hashscan.io",
        },
      },
    },
    // Flow chains
    545: {
      name: "Flow Testnet",
      blockExplorers: {
        flowscan: {
          name: "Flowscan",
          url: "https://testnet.flowscan.org",
        },
      },
    },
    747: {
      name: "Flow Mainnet",
      blockExplorers: {
        flowscan: {
          name: "Flowscan",
          url: "https://flowscan.org",
        },
      },
    },
  },
};

export default config;
