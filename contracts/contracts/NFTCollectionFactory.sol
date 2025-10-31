// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./NFTCollection.sol";
import "./interfaces/INFTCollectionFactory.sol";
import "./interfaces/INFTMarketplace.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract NFTCollectionFactory is INFTCollectionFactory, Ownable, ReentrancyGuard {
    CollectionInfo[] public collections;
    mapping(address => uint256[]) public creatorToCollectionIndexes;
    mapping(address => CollectionInfo) public collectionAddressToInfo;
    
    uint256 public creationFee = 0; // Fee in wei to create a collection
    address public marketplaceAddress; // Address of the NFT marketplace
    uint256 public defaultMintCount = 100; // Default number of NFTs to mint when creating a collection
    uint256 public defaultListingPrice = 0.01 ether; // Default price for listing NFTs (0.01 ETH)
    
    constructor() Ownable(msg.sender) ReentrancyGuard() {}
    
    modifier validAddress(address _address) {
        require(_address != address(0), "Invalid address");
        _;
    }

    function createCollection(
        string memory name,
        string memory symbol,
        string memory baseURI
    ) external payable nonReentrant returns (address) {
        require(bytes(name).length > 0, "Name cannot be empty");
        require(bytes(symbol).length > 0, "Symbol cannot be empty");
        require(msg.value >= creationFee, "Insufficient fee");

        // Deploy new NFTCollection (factory is initially the owner)
        NFTCollection newCollection = new NFTCollection(name, symbol, baseURI);
        
        // Mint NFTs to marketplace BEFORE transferring ownership (if marketplace is set)
        if (marketplaceAddress != address(0)) {
            for (uint256 i = 0; i < defaultMintCount; i++) {
                newCollection.mint(marketplaceAddress);
                // Automatically list the NFT on the marketplace
                if (defaultListingPrice > 0) {
                    INFTMarketplace(marketplaceAddress).listOwnedNFT(
                        address(newCollection),
                        i,
                        address(0), // Native ETH
                        defaultListingPrice
                    );
                }
            }
        }
        
        // Transfer ownership to the creator AFTER minting
        newCollection.transferOwnership(msg.sender);
        
        // Create collection info
        CollectionInfo memory newCollectionInfo = CollectionInfo({
            collectionAddress: address(newCollection),
            name: name,
            symbol: symbol,
            baseURI: baseURI,
            creator: msg.sender,
            createdAt: block.timestamp
        });
        
        // Store collection info
        collections.push(newCollectionInfo);
        uint256 collectionIndex = collections.length - 1;
        creatorToCollectionIndexes[msg.sender].push(collectionIndex);
        collectionAddressToInfo[address(newCollection)] = newCollectionInfo;
        
        // Emit event
        emit CollectionCreated(
            address(newCollection),
            name,
            symbol,
            baseURI,
            msg.sender,
            block.timestamp
        );
        
        return address(newCollection);
    }

    function createCollectionWithMint(
        string memory name,
        string memory symbol,
        string memory baseURI,
        uint256 mintCount
    ) external payable nonReentrant returns (address) {
        require(bytes(name).length > 0, "Name cannot be empty");
        require(bytes(symbol).length > 0, "Symbol cannot be empty");
        require(msg.value >= creationFee, "Insufficient fee");
        require(marketplaceAddress != address(0), "Marketplace not set");
        require(mintCount > 0, "Mint count must be greater than 0");

        // Deploy new NFTCollection (factory is initially the owner)
        NFTCollection newCollection = new NFTCollection(name, symbol, baseURI);
        
        // Mint NFTs to marketplace BEFORE transferring ownership
        for (uint256 i = 0; i < mintCount; i++) {
            newCollection.mint(marketplaceAddress);
            // Automatically list the NFT on the marketplace
            if (defaultListingPrice > 0) {
                INFTMarketplace(marketplaceAddress).listOwnedNFT(
                    address(newCollection),
                    i,
                    address(0), // Native ETH
                    defaultListingPrice
                );
            }
        }
        
        // Transfer ownership to the creator AFTER minting
        newCollection.transferOwnership(msg.sender);
        
        // Create collection info
        CollectionInfo memory newCollectionInfo = CollectionInfo({
            collectionAddress: address(newCollection),
            name: name,
            symbol: symbol,
            baseURI: baseURI,
            creator: msg.sender,
            createdAt: block.timestamp
        });
        
        // Store collection info
        collections.push(newCollectionInfo);
        uint256 collectionIndex = collections.length - 1;
        creatorToCollectionIndexes[msg.sender].push(collectionIndex);
        collectionAddressToInfo[address(newCollection)] = newCollectionInfo;
        
        // Emit event
        emit CollectionCreated(
            address(newCollection),
            name,
            symbol,
            baseURI,
            msg.sender,
            block.timestamp
        );
        
        return address(newCollection);
    }

    function getCollection(uint256 index) external view returns (CollectionInfo memory) {
        require(index < collections.length, "Index out of bounds");
        return collections[index];
    }
    
    function getCollectionsCount() external view returns (uint256) {
        return collections.length;
    }
    
    function getCollectionsByCreator(address creator) external view validAddress(creator) returns (address[] memory) {
        uint256[] memory indexes = creatorToCollectionIndexes[creator];
        address[] memory creatorCollections = new address[](indexes.length);
        
        for (uint256 i = 0; i < indexes.length; i++) {
            creatorCollections[i] = collections[indexes[i]].collectionAddress;
        }
        
        return creatorCollections;
    }
    
    function getAllCollections() external view returns (address[] memory) {
        address[] memory allCollections = new address[](collections.length);
        
        for (uint256 i = 0; i < collections.length; i++) {
            allCollections[i] = collections[i].collectionAddress;
        }
        
        return allCollections;
    }
    
    function getCollectionInfo(address collectionAddress) external view validAddress(collectionAddress) returns (CollectionInfo memory) {
        CollectionInfo memory info = collectionAddressToInfo[collectionAddress];
        require(info.collectionAddress != address(0), "Collection not found");
        return info;
    }

    // Owner functions
    function setCreationFee(uint256 _fee) external onlyOwner {
        creationFee = _fee;
    }
    
    function withdrawFees() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No fees to withdraw");
        
        (bool success, ) = payable(owner()).call{value: balance}("");
        require(success, "Fee withdrawal failed");
    }
    
    // View function to get collection count by creator
    function getCollectionCountByCreator(address creator) external view validAddress(creator) returns (uint256) {
        return creatorToCollectionIndexes[creator].length;
    }

    // Owner functions for marketplace configuration
    function setMarketplaceAddress(address _marketplaceAddress) external onlyOwner validAddress(_marketplaceAddress) {
        marketplaceAddress = _marketplaceAddress;
    }

    function setDefaultMintCount(uint256 _count) external onlyOwner {
        defaultMintCount = _count;
    }

    function setDefaultListingPrice(uint256 _price) external onlyOwner {
        defaultListingPrice = _price;
    }
}