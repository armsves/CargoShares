// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./NFTCollection.sol";
import "./CollectionVault.sol";
import "./interfaces/ICollectionVaultFactory.sol";

contract CollectionVaultFactory is ICollectionVaultFactory {
    mapping(address => address) public collectionToVault;
    address[] public allVaults;

    event VaultCreated(address indexed collection, address indexed vault);

    function createVault(string memory name, string memory symbol) external returns (ICollectionVault) {
        NFTCollection newCollection = new NFTCollection(name, symbol, "");
        CollectionVault newVault = new CollectionVault(address(newCollection));
        
        collectionToVault[address(newCollection)] = address(newVault);
        allVaults.push(address(newVault));
        
        emit VaultCreated(address(newCollection), address(newVault));
        
        return ICollectionVault(address(newVault));
    }

    function createCollectionVault(string memory name, string memory symbol) external returns (address) {
        ICollectionVault vault = this.createVault(name, symbol);
        return address(vault);
    }

    function getVaults() external view returns (ICollectionVault[] memory) {
        ICollectionVault[] memory vaults = new ICollectionVault[](allVaults.length);
        for (uint256 i = 0; i < allVaults.length; i++) {
            vaults[i] = ICollectionVault(allVaults[i]);
        }
        return vaults;
    }

    function getVault(address collection) external view returns (address) {
        return collectionToVault[collection];
    }
}