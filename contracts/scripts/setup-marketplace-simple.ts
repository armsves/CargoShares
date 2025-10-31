import hre from 'hardhat';

async function main() {
  const factoryAddress = '0xf6c9f4A8e497677AC5e01DaF90e549605d5FFC5A';
  const marketplaceAddress = '0x2b86c3b937a37Bc14c6556a59CF388180081BB95';

  console.log('Connecting to Hedera Testnet...');
  console.log(`Factory: ${factoryAddress}`);
  console.log(`Marketplace: ${marketplaceAddress}`);

  // Get signers using hre.ethers
  const signers = await hre.ethers.getSigners();
  if (signers.length === 0) {
    throw new Error('No signers found. Make sure HEDERA_TESTNET_PRIVATE_KEY is set in .env');
  }

  const deployer = signers[0];
  console.log(`Deployer: ${await deployer.getAddress()}`);

  // Get contract instance
  const factory = await hre.ethers.getContractAt(
    'NFTCollectionFactory',
    factoryAddress,
    deployer
  );

  // Check current marketplace address
  try {
    const currentMarketplace = await factory.marketplaceAddress();
    console.log(`Current marketplace address: ${currentMarketplace}`);

    if (currentMarketplace.toLowerCase() === marketplaceAddress.toLowerCase()) {
      console.log('✅ Marketplace address already set correctly');
      return;
    }
  } catch (error) {
    console.log('Checking current marketplace address...');
  }

  // Set marketplace address
  console.log('📝 Setting marketplace address...');
  const tx = await factory.setMarketplaceAddress(marketplaceAddress);
  console.log(`Transaction hash: ${tx.hash}`);
  console.log('Waiting for confirmation...');
  
  const receipt = await tx.wait();
  console.log(`✅ Transaction confirmed in block: ${receipt.blockNumber}`);
  
  // Verify
  const verified = await factory.marketplaceAddress();
  if (verified.toLowerCase() === marketplaceAddress.toLowerCase()) {
    console.log('✅ Marketplace address set successfully!');
    console.log(`Verified marketplace address: ${verified}`);
  } else {
    console.error('❌ Verification failed!');
    console.error(`Expected: ${marketplaceAddress}`);
    console.error(`Got: ${verified}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
