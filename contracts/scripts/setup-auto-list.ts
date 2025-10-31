import hre from 'hardhat';
import { ethers } from 'ethers';

async function main() {
  const factoryAddress = '0x5A8Db7Fd59fCa724385651f7dBa78E1D68C456A6';
  const marketplaceAddress = '0x483a5ACdb48Ad9036Bff3B1cf71b71D32Bc40257';

  console.log('Setting up marketplace and factory...');
  console.log(`Factory: ${factoryAddress}`);
  console.log(`Marketplace: ${marketplaceAddress}`);

  // Get signers - try hre.ethers first, fallback to direct import
  let signers: ethers.Signer[];
  try {
    signers = await hre.ethers.getSigners();
  } catch (err) {
    // Fallback: get provider and create signer from private key
    const provider = new ethers.JsonRpcProvider('https://testnet.hashio.io/api');
    const privateKey = process.env.HEDERA_TESTNET_PRIVATE_KEY;
    if (!privateKey) {
      throw new Error('HEDERA_TESTNET_PRIVATE_KEY not found in environment');
    }
    signers = [new ethers.Wallet(privateKey, provider)];
  }

  if (signers.length === 0) {
    throw new Error('No signers found. Make sure HEDERA_TESTNET_PRIVATE_KEY is set in .env');
  }

  const deployer = signers[0];
  console.log(`Deployer: ${await deployer.getAddress()}`);

  // Get contract instances
  let marketplace: ethers.Contract;
  let factory: ethers.Contract;
  
  try {
    marketplace = await hre.ethers.getContractAt(
      'NFTMarketplace',
      marketplaceAddress,
      deployer
    );
    factory = await hre.ethers.getContractAt(
      'NFTCollectionFactory',
      factoryAddress,
      deployer
    );
  } catch (err) {
    // Fallback: use ethers directly
    const marketplaceArtifact = await hre.artifacts.readArtifact('NFTMarketplace');
    const factoryArtifact = await hre.artifacts.readArtifact('NFTCollectionFactory');
    
    marketplace = new ethers.Contract(
      marketplaceAddress,
      marketplaceArtifact.abi,
      deployer
    );
    factory = new ethers.Contract(
      factoryAddress,
      factoryArtifact.abi,
      deployer
    );
  }

  // Step 1: Authorize factory to list NFTs
  console.log('\n📝 Step 1: Authorizing factory as lister...');
  try {
    const tx1 = await marketplace.setAuthorizedLister(factoryAddress, true);
    console.log(`Transaction hash: ${tx1.hash}`);
    await tx1.wait();
    console.log('✅ Factory authorized as lister');
  } catch (err: any) {
    console.log('⚠️  Authorization failed (may already be authorized):', err.message);
  }

  // Step 2: Set marketplace address in factory (if not already set)
  console.log('\n📝 Step 2: Setting marketplace address in factory...');
  const currentMarketplace = await factory.marketplaceAddress();
  if (currentMarketplace.toLowerCase() === marketplaceAddress.toLowerCase()) {
    console.log('✅ Marketplace address already set correctly');
  } else {
    const tx2 = await factory.setMarketplaceAddress(marketplaceAddress);
    console.log(`Transaction hash: ${tx2.hash}`);
    await tx2.wait();
    console.log('✅ Marketplace address set in factory');
  }

  // Step 3: Set default listing price (optional - defaults to 0.01 ETH)
  console.log('\n📝 Step 3: Setting default listing price...');
  try {
    const currentPrice = await factory.defaultListingPrice();
    const defaultPrice = ethers.parseEther('0.01'); // 0.01 ETH
    if (currentPrice === defaultPrice) {
      console.log('✅ Default listing price already set correctly');
    } else {
      const tx3 = await factory.setDefaultListingPrice(defaultPrice);
      console.log(`Transaction hash: ${tx3.hash}`);
      await tx3.wait();
      console.log(`✅ Default listing price set to ${ethers.formatEther(defaultPrice)} ETH`);
    }
  } catch (err: any) {
    console.log('⚠️  Could not set default listing price (function may not exist in current contract):', err.message);
  }

  // Verify setup
  console.log('\n✅ Setup complete!');
  console.log(`Factory: ${factoryAddress}`);
  console.log(`Marketplace: ${marketplaceAddress}`);
  try {
    const price = await factory.defaultListingPrice();
    console.log(`Default listing price: ${ethers.formatEther(price)} ETH`);
  } catch (err) {
    console.log('(Default listing price function not available in current contract)');
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
