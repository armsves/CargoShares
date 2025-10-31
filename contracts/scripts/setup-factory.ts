#!/usr/bin/env node

/**
 * Setup script to configure factory with marketplace address
 * Usage: 
 *   npm run setup:hedera:testnet
 *   npm run setup:flow:mainnet
 * 
 * Requires environment variables:
 *   FACTORY_ADDRESS - Address of deployed NFTCollectionFactory
 *   MARKETPLACE_ADDRESS - Address of deployed NFTMarketplace
 */

import { config } from 'dotenv';
import hre from 'hardhat';

config();

const NFT_COLLECTION_FACTORY_ABI = [
  {
    inputs: [{ internalType: 'address', name: '_marketplaceAddress', type: 'address' }],
    name: 'setMarketplaceAddress',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'marketplaceAddress',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
];

async function setupFactory() {
  const network = process.argv[2];
  
  if (!network) {
    console.error('Usage: tsx scripts/setup-factory.ts <network>');
    process.exit(1);
  }

  const factoryAddress = process.env.FACTORY_ADDRESS;
  const marketplaceAddress = process.env.MARKETPLACE_ADDRESS;

  if (!factoryAddress || !marketplaceAddress) {
    console.error('❌ Missing required environment variables:');
    console.error('   FACTORY_ADDRESS - Address of NFTCollectionFactory');
    console.error('   MARKETPLACE_ADDRESS - Address of NFTMarketplace');
    process.exit(1);
  }

  console.log(`🔧 Setting up factory on ${network}...`);
  console.log(`   Factory: ${factoryAddress}`);
  console.log(`   Marketplace: ${marketplaceAddress}`);

  try {
    const [deployer] = await hre.ethers.getSigners();
    console.log(`   Deployer: ${await deployer.getAddress()}`);

    const factory = await hre.ethers.getContractAt(
      'NFTCollectionFactory',
      factoryAddress
    );

    // Check current marketplace address
    const currentMarketplace = await factory.marketplaceAddress();
    if (currentMarketplace.toLowerCase() === marketplaceAddress.toLowerCase()) {
      console.log('✅ Marketplace address already set correctly');
      return;
    }

    // Set marketplace address
    console.log('📝 Setting marketplace address...');
    const tx = await factory.setMarketplaceAddress(marketplaceAddress);
    console.log(`   Transaction: ${tx.hash}`);
    
    const receipt = await tx.wait();
    console.log(`   Block: ${receipt.blockNumber}`);
    console.log('✅ Marketplace address set successfully!');

    // Verify
    const verified = await factory.marketplaceAddress();
    if (verified.toLowerCase() === marketplaceAddress.toLowerCase()) {
      console.log('✅ Verification successful!');
    } else {
      console.error('❌ Verification failed!');
      process.exit(1);
    }

  } catch (error: any) {
    console.error('❌ Setup failed:', error.message);
    if (error.reason) {
      console.error('   Reason:', error.reason);
    }
    console.error('   Full error:', error);
    process.exit(1);
  }
}

setupFactory();

