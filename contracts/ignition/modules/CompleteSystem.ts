import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("CompleteSystemModule", (m) => {
  // Deploy marketplace first
  const nftMarketplace = m.contract("NFTMarketplace");
  
  // Deploy factories
  const nftCollectionFactory = m.contract("NFTCollectionFactory");
  const collectionVaultFactory = m.contract("CollectionVaultFactory");

  // Set marketplace address in factory after deployment
  // Note: This requires the factory owner to call setMarketplaceAddress manually
  // or we can add it as a call if we have the owner address
  
  return { 
    nftMarketplace,
    nftCollectionFactory, 
    collectionVaultFactory, 
  };
});
