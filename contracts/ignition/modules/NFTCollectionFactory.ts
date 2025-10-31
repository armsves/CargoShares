import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("NFTCollectionFactoryModule", (m) => {
  const nftCollectionFactory = m.contract("NFTCollectionFactory");

  return { nftCollectionFactory };
});