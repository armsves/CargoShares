// Use Hardhat console instead:
// npx hardhat console --network hederaTestnet
// Then paste these commands:

const factoryAddress = '0xC16a6F9fBadd7E42C90cCB773f8F988221BebBd9';
const marketplaceAddress = '0x2b86c3b937a37Bc14c6556a59CF388180081BB95';

const factory = await ethers.getContractAt('NFTCollectionFactory', factoryAddress);
const currentMarketplace = await factory.marketplaceAddress();
console.log('Current marketplace:', currentMarketplace);

if (currentMarketplace.toLowerCase() !== marketplaceAddress.toLowerCase()) {
  console.log('Setting marketplace address...');
  const tx = await factory.setMarketplaceAddress(marketplaceAddress);
  console.log('Transaction hash:', tx.hash);
  await tx.wait();
  console.log('Done!');
  
  const verified = await factory.marketplaceAddress();
  console.log('Verified marketplace:', verified);
} else {
  console.log('Marketplace already set correctly!');
}
