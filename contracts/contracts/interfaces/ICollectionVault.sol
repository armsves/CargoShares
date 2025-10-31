// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface ICollectionVault {
    function deposit(uint256 amount) external;
    function distributeYield() external;
    function getYieldBalance(address owner) external view returns (uint256);
    function totalDeposits() external view returns (uint256);
    function ownerOf(uint256 tokenId) external view returns (address);
}