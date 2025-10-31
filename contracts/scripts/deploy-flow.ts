#!/usr/bin/env node

/**
 * Deployment script for Flow networks
 * Usage: 
 *   npm run deploy:flow:testnet
 *   npm run deploy:flow:mainnet
 */

import { execSync } from 'child_process';
import { config } from 'dotenv';

// Load environment variables
config();

const network = process.argv[2] || 'flowTestnet';

if (!network.includes('flow')) {
  console.error('This script is for Flow deployments only. Use deploy:hedera for Hedera.');
  process.exit(1);
}

console.log(`🚀 Deploying contracts to ${network}...`);
console.log(`   Make sure you have set ${network.toUpperCase()}_PRIVATE_KEY in your .env file`);

try {
  // Deploy using Hardhat Ignition
  execSync(
    `npx hardhat ignition deploy ignition/modules/CompleteSystem.ts --network ${network}`,
    { stdio: 'inherit', cwd: process.cwd() }
  );
  
  console.log(`\n✅ Deployment to ${network} completed successfully!`);
  console.log('\n📝 Next steps:');
  console.log('1. Copy the deployed contract addresses from the output above');
  console.log('2. Set the marketplace address in your .env file:');
  console.log('   FACTORY_ADDRESS=<factory_address>');
  console.log('   MARKETPLACE_ADDRESS=<marketplace_address>');
  console.log(`3. Run: npm run setup:${network}`);
  console.log('4. Update your frontend .env.local with the new addresses');
  
} catch (error) {
  console.error('\n❌ Deployment failed:', error);
  process.exit(1);
}

