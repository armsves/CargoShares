#!/usr/bin/env node

/**
 * Deployment script for Hedera networks (JavaScript version)
 * Usage: node scripts/deploy-hedera.js hederaTestnet
 */

import { execSync } from 'child_process';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

config();

const network = process.argv[2] || 'hederaTestnet';

if (!network.includes('hedera')) {
  console.error('This script is for Hedera deployments only. Use deploy-flow for Flow.');
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
  console.log(`3. Run: node scripts/setup-factory.js ${network}`);
  console.log('4. Update your frontend .env.local with the new addresses');
  
} catch (error) {
  console.error('\n❌ Deployment failed:', error.message);
  process.exit(1);
}
