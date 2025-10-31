// Contract ABIs and addresses configuration
export const NFT_COLLECTION_FACTORY_ABI = [
  {
    inputs: [
      { internalType: 'string', name: 'name', type: 'string' },
      { internalType: 'string', name: 'symbol', type: 'string' },
      { internalType: 'string', name: 'baseURI', type: 'string' },
    ],
    name: 'createCollection',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'string', name: 'name', type: 'string' },
      { internalType: 'string', name: 'symbol', type: 'string' },
      { internalType: 'string', name: 'baseURI', type: 'string' },
      { internalType: 'uint256', name: 'mintCount', type: 'uint256' },
    ],
    name: 'createCollectionWithMint',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'creationFee',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getCollectionsCount',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: 'index', type: 'uint256' }],
    name: 'getCollection',
    outputs: [
      {
        components: [
          { internalType: 'address', name: 'collectionAddress', type: 'address' },
          { internalType: 'string', name: 'name', type: 'string' },
          { internalType: 'string', name: 'symbol', type: 'string' },
          { internalType: 'string', name: 'baseURI', type: 'string' },
          { internalType: 'address', name: 'creator', type: 'address' },
          { internalType: 'uint256', name: 'createdAt', type: 'uint256' },
        ],
        internalType: 'struct INFTCollectionFactory.CollectionInfo',
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'defaultListingPrice',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: '_price', type: 'uint256' }],
    name: 'setDefaultListingPrice',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'marketplaceAddress',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: '_marketplaceAddress', type: 'address' }],
    name: 'setMarketplaceAddress',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'address', name: 'collectionAddress', type: 'address' },
      { indexed: true, internalType: 'address', name: 'creator', type: 'address' },
      { indexed: false, internalType: 'string', name: 'name', type: 'string' },
      { indexed: false, internalType: 'string', name: 'symbol', type: 'string' },
      { indexed: false, internalType: 'string', name: 'baseURI', type: 'string' },
      { indexed: false, internalType: 'uint256', name: 'createdAt', type: 'uint256' },
    ],
    name: 'CollectionCreated',
    type: 'event',
  },
] as const;

export const NFT_MARKETPLACE_ABI = [
  {
    inputs: [
      { internalType: 'address', name: 'nftContract', type: 'address' },
      { internalType: 'uint256', name: 'tokenId', type: 'uint256' },
      { internalType: 'address', name: 'paymentToken', type: 'address' },
      { internalType: 'uint256', name: 'price', type: 'uint256' },
    ],
    name: 'listOwnedNFT',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'nftContract', type: 'address' },
      { internalType: 'uint256', name: 'tokenId', type: 'uint256' },
      { internalType: 'address', name: 'paymentToken', type: 'address' },
      { internalType: 'uint256', name: 'price', type: 'uint256' },
    ],
    name: 'list',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'nftContract', type: 'address' },
      { internalType: 'uint256', name: 'tokenId', type: 'uint256' },
    ],
    name: 'cancelListing',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'nftContract', type: 'address' },
      { internalType: 'uint256', name: 'tokenId', type: 'uint256' },
    ],
    name: 'buy',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'owner',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'lister', type: 'address' },
      { internalType: 'bool', name: 'authorized', type: 'bool' },
    ],
    name: 'setAuthorizedLister',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'nftContract', type: 'address' },
      { internalType: 'uint256', name: 'tokenId', type: 'uint256' },
      { internalType: 'address', name: 'paymentToken', type: 'address' },
      { internalType: 'uint256', name: 'price', type: 'uint256' },
    ],
    name: 'listOwnedNFT',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'nftContract', type: 'address' },
      { internalType: 'uint256', name: 'tokenId', type: 'uint256' },
    ],
    name: 'getListing',
    outputs: [
      {
        components: [
          { internalType: 'address', name: 'seller', type: 'address' },
          { internalType: 'address', name: 'paymentToken', type: 'address' },
          { internalType: 'uint256', name: 'price', type: 'uint256' },
          { internalType: 'bool', name: 'isActive', type: 'bool' },
        ],
        internalType: 'struct INFTMarketplace.Listing',
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'address', name: 'nftContract', type: 'address' },
      { indexed: true, internalType: 'uint256', name: 'tokenId', type: 'uint256' },
      { indexed: true, internalType: 'address', name: 'seller', type: 'address' },
      { indexed: false, internalType: 'address', name: 'paymentToken', type: 'address' },
      { indexed: false, internalType: 'uint256', name: 'price', type: 'uint256' },
    ],
    name: 'Listed',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'address', name: 'nftContract', type: 'address' },
      { indexed: true, internalType: 'uint256', name: 'tokenId', type: 'uint256' },
      { indexed: true, internalType: 'address', name: 'seller', type: 'address' },
    ],
    name: 'Cancelled',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'address', name: 'nftContract', type: 'address' },
      { indexed: true, internalType: 'uint256', name: 'tokenId', type: 'uint256' },
      { indexed: true, internalType: 'address', name: 'seller', type: 'address' },
      { indexed: false, internalType: 'address', name: 'buyer', type: 'address' },
      { indexed: false, internalType: 'uint256', name: 'price', type: 'uint256' },
    ],
    name: 'Purchased',
    type: 'event',
  },
  {
    inputs: [
      { internalType: 'address', name: 'lister', type: 'address' },
      { internalType: 'bool', name: 'authorized', type: 'bool' },
    ],
    name: 'setAuthorizedLister',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: '', type: 'address' },
    ],
    name: 'authorizedListers',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'owner',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

export const NFT_COLLECTION_ABI = [
  {
    inputs: [{ internalType: 'address', name: 'to', type: 'address' }],
    name: 'mint',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'name',
    outputs: [{ internalType: 'string', name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'symbol',
    outputs: [{ internalType: 'string', name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'totalSupply',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: 'tokenId', type: 'uint256' }],
    name: 'ownerOf',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'operator', type: 'address' },
      { internalType: 'bool', name: 'approved', type: 'bool' },
    ],
    name: 'setApprovalForAll',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'owner', type: 'address' },
      { internalType: 'address', name: 'operator', type: 'address' },
    ],
    name: 'isApprovedForAll',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

// Network-aware contract addresses
export function getContractAddresses(chainId?: number) {
  // Hedera Testnet (296) and Mainnet (295)
  if (chainId === 296 || chainId === 295) {
    return HEDERA_TESTNET_ADDRESSES;
  }

  // Flow Testnet (545) and Mainnet (747)
  if (chainId === 545 || chainId === 747) {
    return FLOW_TESTNET_ADDRESSES;
  }

  // Default to Hedera Testnet
  return HEDERA_TESTNET_ADDRESSES;
}

// Legacy export for backward compatibility - will be deprecated
export const CONTRACT_ADDRESSES = {
  NFT_COLLECTION_FACTORY: process.env.NEXT_PUBLIC_NFT_FACTORY_ADDRESS || '0x5A8Db7Fd59fCa724385651f7dBa78E1D68C456A6',
  NFT_MARKETPLACE: process.env.NEXT_PUBLIC_MARKETPLACE_ADDRESS || '0x483a5ACdb48Ad9036Bff3B1cf71b71D32Bc40257',
} as const;

// Deployed addresses for Hedera Testnet
export const HEDERA_TESTNET_ADDRESSES = {
  NFT_COLLECTION_FACTORY: '0x5A8Db7Fd59fCa724385651f7dBa78E1D68C456A6' as `0x${string}`,
  NFT_MARKETPLACE: '0x483a5ACdb48Ad9036Bff3B1cf71b71D32Bc40257' as `0x${string}`,
  COLLECTION_VAULT_FACTORY: '0xA8036a0056fb919aa9069615f7741D2593544b8A' as `0x${string}`,
} as const;

// Deployed addresses for Flow Testnet
export const FLOW_TESTNET_ADDRESSES = {
  NFT_COLLECTION_FACTORY: '0x365B0E89f4b01D72Dd4FF54093801463738bd275' as `0x${string}`,
  NFT_MARKETPLACE: '0x8703A0AE3F1Ffc843ae90eE2021f62A27471d47C' as `0x${string}`,
  COLLECTION_VAULT_FACTORY: '0x0a662224fDAE523F85037A0f288aD6cf681E939D' as `0x${string}`,
} as const;

