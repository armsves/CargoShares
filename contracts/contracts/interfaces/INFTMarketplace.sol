// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface INFTMarketplace {
    struct Listing {
        address seller;
        address paymentToken;
        uint256 price;
        bool isActive;
    }

    event Listed(
        address indexed nftContract,
        uint256 indexed tokenId,
        address indexed seller,
        address paymentToken,
        uint256 price
    );

    event Cancelled(
        address indexed nftContract,
        uint256 indexed tokenId,
        address indexed seller
    );

    event Purchased(
        address indexed nftContract,
        uint256 indexed tokenId,
        address indexed seller,
        address buyer,
        uint256 price
    );

    function list(
        address nftContract,
        uint256 tokenId,
        address paymentToken,
        uint256 price
    ) external;

    function cancelListing(address nftContract, uint256 tokenId) external;

    function buy(address nftContract, uint256 tokenId) external payable;

    function getListing(address nftContract, uint256 tokenId)
        external
        view
        returns (Listing memory);

    function setMarketplaceFee(uint256 _fee) external;

    function withdrawFees() external;

    function listOwnedNFT(
        address nftContract,
        uint256 tokenId,
        address paymentToken,
        uint256 price
    ) external;

    function setAuthorizedLister(address lister, bool authorized) external;
}

