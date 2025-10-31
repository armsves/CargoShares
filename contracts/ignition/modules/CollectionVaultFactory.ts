import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("CollectionVaultFactoryModule", (m) => {
  const collectionVaultFactory = m.contract("CollectionVaultFactory");

  return { collectionVaultFactory };
});