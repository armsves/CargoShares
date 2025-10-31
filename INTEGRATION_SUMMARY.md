# CargoShares Integration Summary

## Overview

This project integrates NFT collection creation, marketplace functionality, and user NFT listing capabilities into a Next.js application using Wagmi/Viem.

## Changes Made

### 1. Smart Contracts

#### NFTMarketplace.sol
- **New contract** for listing and selling NFTs
- Features:
  - List NFTs for sale (native ETH payments)
  - Buy NFTs from marketplace
  - Cancel listings
  - Marketplace fee (configurable, default 2.5%)
  - Can receive NFTs directly (for minting)

#### NFTCollectionFactory.sol Updates
- **Added**: Automatic minting to marketplace when collections are created
- **New fields**:
  - `marketplaceAddress`: Address of the NFT marketplace
  - `defaultMintCount`: Default number of NFTs to mint (default: 100)
- **New functions**:
  - `createCollectionWithMint()`: Create collection with custom mint count
  - `setMarketplaceAddress()`: Owner function to set marketplace address
  - `setDefaultMintCount()`: Owner function to set default mint count

### 2. Frontend Integration

#### Contract Configuration (`src/config/contracts.ts`)
- Contract ABIs for:
  - NFTCollectionFactory
  - NFTMarketplace
  - NFTCollection
- Contract address configuration via environment variables

#### Hooks (`src/hooks/useContracts.ts`)
- `useCreationFee()`: Get collection creation fee
- `useCollectionsCount()`: Get total collections count
- `useCollection()`: Get collection by index
- `useCreateCollection()`: Create new collection with minting
- `useMarketplaceListing()`: Get marketplace listing details
- `useListNFT()`: List an NFT for sale
- `useBuyNFT()`: Buy an NFT from marketplace
- `useCancelListing()`: Cancel a listing
- `useNFTCollection()`: Get NFT collection metadata

#### Components

**Header.tsx**
- Wallet connection UI
- Branding and navigation

**Footer.tsx**
- Simple footer with copyright

**MainApp (page.tsx)**
- Home page with overview
- Marketplace tab for browsing listings
- Collections tab showing all collections
- Create Collection tab with form for creating collections

**Marketplace.tsx**
- `ListNFTForm`: Component for listing NFTs
- `MyNFTs`: Component showing user's NFTs

**MarketplaceListings.tsx**
- `Marketplace`: Main marketplace component showing active listings
- `ListingCard`: Individual listing card component

**CollectionDetails.tsx**
- View collection details
- View and list owned NFTs from a collection

## Setup Instructions

### 1. Deploy Contracts

1. Deploy `NFTMarketplace` contract
2. Deploy `NFTCollectionFactory` contract
3. Set marketplace address in factory:
   ```solidity
   factory.setMarketplaceAddress(marketplaceAddress)
   ```

### 2. Frontend Configuration

Create a `.env.local` file in the `frontend` directory:

```env
NEXT_PUBLIC_NFT_FACTORY_ADDRESS=0x...
NEXT_PUBLIC_MARKETPLACE_ADDRESS=0x...
NEXT_PUBLIC_PROJECT_ID=your_reown_project_id
```

### 3. Install Dependencies

```bash
cd frontend
npm install
```

### 4. Run Development Server

```bash
npm run dev
```

## Key Features

### Collection Creation
- Users can create NFT collections with:
  - Name
  - Symbol
  - Base URI
  - Number of NFTs to mint
- NFTs are automatically minted to the marketplace when collection is created
- Collection ownership is transferred to creator

### Marketplace
- Browse active listings
- Purchase NFTs with native ETH
- View listing details (price, seller, etc.)

### User NFT Management
- View owned NFTs from collections
- List NFTs for sale:
  - Approve marketplace (one-time per collection)
  - Set price
  - List NFT
- Cancel listings

## Architecture

### Contract Flow

1. **Collection Creation**:
   ```
   User → Factory.createCollectionWithMint() 
   → Collection deployed 
   → NFTs minted to marketplace
   → Ownership transferred to creator
   ```

2. **Listing NFT**:
   ```
   User → Approve marketplace (if needed)
   → ListNFT() → NFT transferred to marketplace
   → Listing created
   ```

3. **Buying NFT**:
   ```
   Buyer → BuyNFT() with ETH
   → NFT transferred to buyer
   → Payment sent to seller (minus fee)
   → Fee kept by marketplace
   ```

### Frontend Flow

- Uses Wagmi for wallet connection
- Uses Viem for contract interactions
- React hooks for state management
- Real-time updates via event watching

## Notes

- **Marketplace Address**: Must be set in factory before collections can mint NFTs automatically
- **Approval**: Users need to approve marketplace once per collection before listing
- **Events**: Marketplace listens to Listed, Purchased, and Cancelled events for real-time updates
- **Gas Optimization**: Consider batching mint operations for large collections

## Future Enhancements

- [ ] Implement proper event indexing for efficient listing fetching
- [ ] Add pagination for collections and listings
- [ ] Add collection detail pages
- [ ] Add filtering and search
- [ ] Add user profile page
- [ ] Add transaction history
- [ ] Support ERC20 payment tokens
- [ ] Add auction functionality

