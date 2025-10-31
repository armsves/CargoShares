import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("NFTCollectionModule", (m) => {
  const name = m.getParameter("name", "Sample NFT Collection");
  const symbol = m.getParameter("symbol", "SNC");
  const baseURI = m.getParameter("baseURI", "https://api.example.com/metadata/");

  const nftCollection = m.contract("NFTCollection", [name, symbol, baseURI]);

  return { nftCollection };
});