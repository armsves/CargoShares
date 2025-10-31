// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface INFTCollectionFactory {
    struct CollectionInfo {
        address collectionAddress;
        string name;
        string symbol;
        string baseURI;
        address creator;
        uint256 createdAt;
    }

    event CollectionCreated(
        address indexed collectionAddress,
        string name,
        string symbol,
        string baseURI,
        address indexed creator,
        uint256 createdAt
    );

    function createCollection(
        string memory name,
        string memory symbol,
        string memory baseURI
    ) external payable returns (address);

    function getCollection(uint256 index) external view returns (CollectionInfo memory);
    
    function getCollectionsCount() external view returns (uint256);
    
    function getCollectionsByCreator(address creator) external view returns (address[] memory);
    
    function getAllCollections() external view returns (address[] memory);
    
    function getCollectionInfo(address collectionAddress) external view returns (CollectionInfo memory);
}