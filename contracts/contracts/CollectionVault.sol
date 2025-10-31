// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "./NFTCollection.sol";
import "./interfaces/ICollectionVault.sol";

contract CollectionVault is ICollectionVault {
    NFTCollection public nftCollection;
    mapping(address => uint256) public yieldBalance;
    uint256 public totalYield;

    event YieldDeposited(uint256 amount);
    event YieldDistributed(address indexed owner, uint256 amount);

    constructor(address _nftCollection) {
        nftCollection = NFTCollection(_nftCollection);
    }

    function depositYield() external payable {
        require(msg.value > 0, "Must deposit a positive amount");
        totalYield += msg.value;
        emit YieldDeposited(msg.value);
    }

    function distributeYield() external {
        uint256 totalSupply = nftCollection.totalSupply();
        require(totalSupply > 0, "No NFTs in collection");

        for (uint256 i = 0; i < totalSupply; i++) {
            address owner = nftCollection.ownerOf(i);
            uint256 yield = totalYield / totalSupply;
            yieldBalance[owner] += yield;
            emit YieldDistributed(owner, yield);
        }
        totalYield = 0; // Reset total yield after distribution
    }

    function claimYield() external {
        uint256 amount = yieldBalance[msg.sender];
        require(amount > 0, "No yield to claim");
        yieldBalance[msg.sender] = 0;
        payable(msg.sender).transfer(amount);
    }

    // Interface implementations
    function deposit(uint256 amount) external {
        require(amount > 0, "Must deposit a positive amount");
        totalYield += amount;
        emit YieldDeposited(amount);
    }

    function getYieldBalance(address owner) external view returns (uint256) {
        return yieldBalance[owner];
    }

    function totalDeposits() external view returns (uint256) {
        return totalYield;
    }

    function ownerOf(uint256 tokenId) external view returns (address) {
        return nftCollection.ownerOf(tokenId);
    }
}