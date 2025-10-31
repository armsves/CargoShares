// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract NFTMarketplace is ERC721Holder, ReentrancyGuard, Ownable {
    struct Listing {
        address seller;
        address paymentToken; // address(0) for native ETH
        uint256 price;
        bool isActive;
    }

    // Mapping: nftContract => tokenId => Listing
    mapping(address => mapping(uint256 => Listing)) public listings;
    
    // Authorized addresses that can list NFTs on behalf of the marketplace
    mapping(address => bool) public authorizedListers;
    
    // Marketplace fee in basis points (e.g., 250 = 2.5%)
    uint256 public marketplaceFee = 250; // 2.5%
    uint256 public constant BASIS_POINTS = 10000;

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

    constructor() Ownable(msg.sender) {}

    /**
     * @dev List an NFT for sale
     * @param nftContract Address of the NFT contract
     * @param tokenId Token ID to list
     * @param paymentToken Address of payment token (address(0) for native ETH)
     * @param price Price in wei (or payment token units)
     */
    function list(
        address nftContract,
        uint256 tokenId,
        address paymentToken,
        uint256 price
    ) external nonReentrant {
        require(price > 0, "Price must be greater than 0");
        require(paymentToken == address(0), "Only native ETH payments supported");
        
        IERC721 nft = IERC721(nftContract);
        require(nft.ownerOf(tokenId) == msg.sender, "Not the owner");
        require(
            nft.getApproved(tokenId) == address(this) ||
            nft.isApprovedForAll(msg.sender, address(this)),
            "Marketplace not approved"
        );

        // Transfer NFT to marketplace
        nft.safeTransferFrom(msg.sender, address(this), tokenId);

        listings[nftContract][tokenId] = Listing({
            seller: msg.sender,
            paymentToken: paymentToken,
            price: price,
            isActive: true
        });

        emit Listed(nftContract, tokenId, msg.sender, paymentToken, price);
    }

    /**
     * @dev Cancel a listing
     * @param nftContract Address of the NFT contract
     * @param tokenId Token ID to cancel listing for
     */
    function cancelListing(address nftContract, uint256 tokenId) external nonReentrant {
        Listing storage listing = listings[nftContract][tokenId];
        require(listing.isActive, "Listing not active");
        require(listing.seller == msg.sender, "Not the seller");

        listing.isActive = false;

        // Return NFT to seller
        IERC721(nftContract).safeTransferFrom(address(this), msg.sender, tokenId);

        emit Cancelled(nftContract, tokenId, msg.sender);
    }

    /**
     * @dev Buy an NFT
     * @param nftContract Address of the NFT contract
     * @param tokenId Token ID to buy
     */
    function buy(address nftContract, uint256 tokenId) external payable nonReentrant {
        Listing storage listing = listings[nftContract][tokenId];
        require(listing.isActive, "Listing not active");
        require(listing.paymentToken == address(0), "Only native ETH payments supported");
        
        // Debug: Log the values for troubleshooting
        // Hedera EVM uses 18 decimals for msg.value, but prices might be stored differently
        // For Hedera: if msg.value is in 8 decimals (tinybar), we need to multiply by 10^10
        // But if Hedera EVM already uses 18 decimals, we compare directly
        
        // Check if we're on Hedera (chain ID 296 or 295)
        bool isHedera = block.chainid == 296 || block.chainid == 295;
        uint256 normalizedValue = msg.value;
        
        if (isHedera) {
            // Hedera's native currency uses 8 decimals, but EVM compatibility uses 18 decimals
            // However, msg.value might be in 8 decimals (tinybar) on Hedera
            // Convert from 8 decimals to 18 decimals by multiplying by 10^10
            normalizedValue = msg.value * 10**10;
        }
        
        require(normalizedValue >= listing.price, "Insufficient payment");

        address seller = listing.seller;
        uint256 price = listing.price;

        // Mark listing as inactive
        listing.isActive = false;

        // Calculate fees
        uint256 feeAmount = (price * marketplaceFee) / BASIS_POINTS;
        uint256 sellerAmount = price - feeAmount;

        // Transfer NFT to buyer
        IERC721(nftContract).safeTransferFrom(address(this), msg.sender, tokenId);

        // Transfer payment to seller (minus fee)
        // On Hedera, convert back to 8 decimals for transfer
        uint256 sellerAmountToTransfer = isHedera ? sellerAmount / 10**10 : sellerAmount;
        (bool success, ) = payable(seller).call{value: sellerAmountToTransfer}("");
        require(success, "Payment to seller failed");

        // Refund excess payment
        if (normalizedValue > price) {
            uint256 excessAmount = normalizedValue - price;
            uint256 excessToRefund = isHedera ? excessAmount / 10**10 : excessAmount;
            (bool refundSuccess, ) = payable(msg.sender).call{value: excessToRefund}("");
            require(refundSuccess, "Refund failed");
        }

        emit Purchased(nftContract, tokenId, seller, msg.sender, price);
    }

    /**
     * @dev List an NFT that is already owned by the marketplace (authorized lister or owner)
     * @param nftContract Address of the NFT contract
     * @param tokenId Token ID to list
     * @param paymentToken Address of payment token (address(0) for native ETH)
     * @param price Price in wei (or payment token units)
     */
    function listOwnedNFT(
        address nftContract,
        uint256 tokenId,
        address paymentToken,
        uint256 price
    ) external nonReentrant {
        require(price > 0, "Price must be greater than 0");
        require(paymentToken == address(0), "Only native ETH payments supported");
        require(msg.sender == owner() || authorizedListers[msg.sender], "Not authorized");
        
        IERC721 nft = IERC721(nftContract);
        require(nft.ownerOf(tokenId) == address(this), "NFT not owned by marketplace");
        
        // Check if already listed
        require(!listings[nftContract][tokenId].isActive, "Already listed");

        listings[nftContract][tokenId] = Listing({
            seller: owner(), // Seller is marketplace owner
            paymentToken: paymentToken,
            price: price,
            isActive: true
        });

        emit Listed(nftContract, tokenId, owner(), paymentToken, price);
    }

    /**
     * @dev Set authorized lister address (only owner)
     * @param lister Address to authorize
     * @param authorized Whether to authorize or revoke authorization
     */
    function setAuthorizedLister(address lister, bool authorized) external onlyOwner {
        authorizedListers[lister] = authorized;
    }

    /**
     * @dev Get listing details
     * @param nftContract Address of the NFT contract
     * @param tokenId Token ID
     */
    function getListing(address nftContract, uint256 tokenId)
        external
        view
        returns (Listing memory)
    {
        return listings[nftContract][tokenId];
    }

    /**
     * @dev Set marketplace fee (only owner)
     * @param _fee Fee in basis points (e.g., 250 = 2.5%)
     */
    function setMarketplaceFee(uint256 _fee) external onlyOwner {
        require(_fee <= BASIS_POINTS, "Fee cannot exceed 100%");
        marketplaceFee = _fee;
    }

    /**
     * @dev Withdraw accumulated fees (only owner)
     */
    function withdrawFees() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No fees to withdraw");
        (bool success, ) = payable(owner()).call{value: balance}("");
        require(success, "Withdrawal failed");
    }

    /**
     * @dev Allow marketplace to receive NFTs directly (for minting)
     */
    function onERC721Received(
        address,
        address,
        uint256,
        bytes memory
    ) public pure override returns (bytes4) {
        return this.onERC721Received.selector;
    }
}

