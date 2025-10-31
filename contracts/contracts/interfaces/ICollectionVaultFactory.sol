// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./ICollectionVault.sol";

interface ICollectionVaultFactory {
    function createVault(string memory name, string memory symbol) external returns (ICollectionVault);
    function getVaults() external view returns (ICollectionVault[] memory);
}