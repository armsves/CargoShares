import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("CollectionVaultModule", (m) => {
  const nftCollectionAddress = m.getParameter("nftCollectionAddress");

  const collectionVault = m.contract("CollectionVault", [nftCollectionAddress]);

  return { collectionVault };
});