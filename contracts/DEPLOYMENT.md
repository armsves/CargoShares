# Deployment Guide for Hedera and Flow

This guide explains how to deploy the CargoShares contracts to Hedera and Flow blockchains.

## Prerequisites

1. **Node.js** and npm installed
2. **Private keys** for deployment accounts on both networks
3. **Funds** in your deployment accounts for gas fees

## Environment Setup

Create a `.env` file in the `contracts` directory:

```env
# Hedera Testnet
HEDERA_TESTNET_RPC_URL=https://testnet.hashio.io/api
HEDERA_TESTNET_PRIVATE_KEY=your_private_key_here

# Hedera Mainnet
HEDERA_MAINNET_RPC_URL=https://mainnet.hashio.io/api
HEDERA_MAINNET_PRIVATE_KEY=your_private_key_here

# Flow Testnet
FLOW_TESTNET_RPC_URL=https://testnet.evm.nodes.onflow.org
FLOW_TESTNET_PRIVATE_KEY=your_private_key_here

# Flow Mainnet
FLOW_MAINNET_RPC_URL=https://mainnet.evm.nodes.onflow.org
FLOW_MAINNET_PRIVATE_KEY=your_private_key_here

# For setup script (set after deployment)
FACTORY_ADDRESS=0x...
MARKETPLACE_ADDRESS=0x...
```

## Installation

```bash
cd contracts
npm install
```

## Deployment Steps

### 1. Compile Contracts

```bash
npm run compile
```

### 2. Deploy to Hedera Testnet

```bash
npm run deploy:hedera:testnet
```

This will deploy:
- NFTMarketplace
- NFTCollectionFactory
- CollectionVaultFactory

### 3. Deploy to Hedera Mainnet

```bash
npm run deploy:hedera:mainnet
```

### 4. Deploy to Flow Testnet

```bash
npm run deploy:flow:testnet
```

### 5. Deploy to Flow Mainnet

```bash
npm run deploy:flow:mainnet
```

## Post-Deployment Setup

After deployment, you need to configure the factory with the marketplace address:

1. **Set environment variables** in `.env`:
   ```env
   FACTORY_ADDRESS=<deployed_factory_address>
   MARKETPLACE_ADDRESS=<deployed_marketplace_address>
   ```

2. **Run setup script**:
   ```bash
   # For Hedera Testnet
   npm run setup:hedera:testnet
   
   # For Hedera Mainnet
   npm run setup:hedera:mainnet
   
   # For Flow Testnet
   npm run setup:flow:testnet
   
   # For Flow Mainnet
   npm run setup:flow:mainnet
   ```

## Manual Setup (Alternative)

If you prefer to set the marketplace address manually:

```javascript
// Connect to factory contract
const factory = await ethers.getContractAt("NFTCollectionFactory", FACTORY_ADDRESS);

// Set marketplace address
await factory.setMarketplaceAddress(MARKETPLACE_ADDRESS);
```

## Network Information

### Hedera

- **Testnet Chain ID**: 296
- **Mainnet Chain ID**: 295
- **Testnet Explorer**: https://hashscan.io/testnet
- **Mainnet Explorer**: https://hashscan.io
- **RPC**: Provided by Hashio.io

### Flow

- **Testnet Chain ID**: 545
- **Mainnet Chain ID**: 747
- **Testnet Explorer**: https://testnet.flowscan.org
- **Mainnet Explorer**: https://flowscan.org
- **RPC**: Provided by Flow EVM nodes

## Troubleshooting

### Hedera Deployment Issues

1. **Gas estimation errors**: Hedera uses HBAR, not ETH. Ensure your account has sufficient HBAR.
2. **RPC connection**: Verify RPC URL is correct and accessible.
3. **Account format**: Ensure private key is in correct format (0x prefix for EVM accounts).

### Flow Deployment Issues

1. **EVM compatibility**: Ensure you're using Flow EVM, not Cadence.
2. **Chain ID**: Verify correct chain ID for testnet/mainnet.
3. **Account setup**: Flow EVM accounts may require special setup.

## Verification

After deployment, verify contracts on block explorers:

- **Hedera**: https://hashscan.io (search contract address)
- **Flow**: https://flowscan.org (search contract address)

## Next Steps

1. **Update Frontend**: Update `.env.local` in frontend directory with deployed addresses
2. **Test**: Create a test collection and verify NFT minting
3. **Monitor**: Set up monitoring for contract events

## Security Notes

- **Never commit** `.env` files to version control
- **Use testnet** for initial testing
- **Verify contracts** on block explorers
- **Keep private keys secure**

