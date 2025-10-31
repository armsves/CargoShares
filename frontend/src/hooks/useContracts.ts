import { useReadContract, useWriteContract, useWaitForTransactionReceipt, useWatchContractEvent, useChainId } from 'wagmi'
import { CONTRACT_ADDRESSES, NFT_COLLECTION_FACTORY_ABI, NFT_MARKETPLACE_ABI, NFT_COLLECTION_ABI } from '@/config/contracts'
import { parseEther, formatEther } from 'viem'

// Hook to get creation fee
export function useCreationFee() {
  const { data, isLoading, error } = useReadContract({
    address: CONTRACT_ADDRESSES.NFT_COLLECTION_FACTORY,
    abi: NFT_COLLECTION_FACTORY_ABI,
    functionName: 'creationFee',
  })

  return {
    fee: data ? formatEther(data as bigint) : '0',
    isLoading,
    error,
  }
}

// Hook to get collections count
export function useCollectionsCount() {
  const { data, isLoading, error, refetch } = useReadContract({
    address: CONTRACT_ADDRESSES.NFT_COLLECTION_FACTORY,
    abi: NFT_COLLECTION_FACTORY_ABI,
    functionName: 'getCollectionsCount',
  })

  return {
    count: data ? Number(data) : 0,
    isLoading,
    error,
    refetch,
  }
}

// Hook to get a collection by index
export function useCollection(index: number) {
  const { data, isLoading, error } = useReadContract({
    address: CONTRACT_ADDRESSES.NFT_COLLECTION_FACTORY,
    abi: NFT_COLLECTION_FACTORY_ABI,
    functionName: 'getCollection',
    args: [BigInt(index)],
    query: {
      enabled: index >= 0,
    },
  })

  return {
    collection: data as {
      collectionAddress: `0x${string}`
      name: string
      symbol: string
      baseURI: string
      creator: `0x${string}`
      createdAt: bigint
    } | undefined,
    isLoading,
    error,
  }
}

// Hook to create a collection
export function useCreateCollection() {
  const { writeContract, data: hash, isPending, error } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  const createCollection = (
    name: string,
    symbol: string,
    baseURI: string,
    mintCount?: number
  ) => {
    if (!CONTRACT_ADDRESSES.NFT_COLLECTION_FACTORY) {
      throw new Error('NFT Collection Factory address not set')
    }

    if (mintCount !== undefined && mintCount > 0) {
      return writeContract({
        address: CONTRACT_ADDRESSES.NFT_COLLECTION_FACTORY,
        abi: NFT_COLLECTION_FACTORY_ABI,
        functionName: 'createCollectionWithMint',
        args: [name, symbol, baseURI, BigInt(mintCount)],
      })
    } else {
      return writeContract({
        address: CONTRACT_ADDRESSES.NFT_COLLECTION_FACTORY,
        abi: NFT_COLLECTION_FACTORY_ABI,
        functionName: 'createCollection',
        args: [name, symbol, baseURI],
      })
    }
  }

  return {
    createCollection,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  }
}

// Hook to get marketplace listing
export function useMarketplaceListing(nftContract: `0x${string}` | undefined, tokenId: bigint | undefined) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: CONTRACT_ADDRESSES.NFT_MARKETPLACE,
    abi: NFT_MARKETPLACE_ABI,
    functionName: 'getListing',
    args: nftContract && tokenId !== undefined ? [nftContract, tokenId] : undefined,
    query: {
      enabled: !!nftContract && tokenId !== undefined,
    },
  })

  return {
    listing: data as {
      seller: `0x${string}`
      paymentToken: `0x${string}`
      price: bigint
      isActive: boolean
    } | undefined,
    isLoading,
    error,
    refetch,
  }
}

// Hook to list an NFT
export function useListNFT() {
  const { writeContract, data: hash, isPending, error } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  const listNFT = (
    nftContract: `0x${string}`,
    tokenId: bigint,
    price: string // Price in ETH
  ) => {
    if (!CONTRACT_ADDRESSES.NFT_MARKETPLACE) {
      throw new Error('Marketplace address not set')
    }

    return writeContract({
      address: CONTRACT_ADDRESSES.NFT_MARKETPLACE,
      abi: NFT_MARKETPLACE_ABI,
      functionName: 'list',
      args: [nftContract, tokenId, '0x0000000000000000000000000000000000000000' as `0x${string}`, parseEther(price)],
    })
  }

  return {
    listNFT,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  }
}

// Hook to buy an NFT
export function useBuyNFT() {
  const { writeContract, data: hash, isPending, error } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })
  const chainId = useChainId()

  const buyNFT = (nftContract: `0x${string}`, tokenId: bigint, price: string | bigint) => {
    if (!CONTRACT_ADDRESSES.NFT_MARKETPLACE) {
      throw new Error('Marketplace address not set')
    }

    // Handle both string (ETH format) and bigint (wei format)
    const value = typeof price === 'bigint' ? price : parseEther(price)
    
    console.log('buyNFT called:', {
      nftContract,
      tokenId: tokenId.toString(),
      price,
      priceType: typeof price,
      value: value.toString(),
      valueFormatted: formatEther(value),
      chainId,
      isHedera: HEDERA_CHAIN_IDS.includes(chainId),
    })

    return writeContract({
      address: CONTRACT_ADDRESSES.NFT_MARKETPLACE,
      abi: NFT_MARKETPLACE_ABI,
      functionName: 'buy',
      args: [nftContract, tokenId],
      value: value,
    })
  }

  return {
    buyNFT,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  }
}

// Hook to cancel a listing
export function useCancelListing() {
  const { writeContract, data: hash, isPending, error } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  const cancelListing = (nftContract: `0x${string}`, tokenId: bigint) => {
    if (!CONTRACT_ADDRESSES.NFT_MARKETPLACE) {
      throw new Error('Marketplace address not set')
    }

    return writeContract({
      address: CONTRACT_ADDRESSES.NFT_MARKETPLACE,
      abi: NFT_MARKETPLACE_ABI,
      functionName: 'cancelListing',
      args: [nftContract, tokenId],
    })
  }

  return {
    cancelListing,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  }
}

// Hook to watch marketplace events
export function useWatchMarketplaceEvents() {
  useWatchContractEvent({
    address: CONTRACT_ADDRESSES.NFT_MARKETPLACE,
    abi: NFT_MARKETPLACE_ABI,
    eventName: 'Listed',
    onLogs(logs) {
      console.log('New listing:', logs)
    },
  })

  useWatchContractEvent({
    address: CONTRACT_ADDRESSES.NFT_MARKETPLACE,
    abi: NFT_MARKETPLACE_ABI,
    eventName: 'Purchased',
    onLogs(logs) {
      console.log('NFT purchased:', logs)
    },
  })

  useWatchContractEvent({
    address: CONTRACT_ADDRESSES.NFT_MARKETPLACE,
    abi: NFT_MARKETPLACE_ABI,
    eventName: 'Cancelled',
    onLogs(logs) {
      console.log('Listing cancelled:', logs)
    },
  })
}

// Hook to get NFT collection info
export function useNFTCollection(address: `0x${string}` | undefined) {
  const { data: name, isLoading: nameLoading } = useReadContract({
    address,
    abi: NFT_COLLECTION_ABI,
    functionName: 'name',
    query: { enabled: !!address },
  })

  const { data: symbol, isLoading: symbolLoading } = useReadContract({
    address,
    abi: NFT_COLLECTION_ABI,
    functionName: 'symbol',
    query: { enabled: !!address },
  })

  const { data: totalSupply, isLoading: supplyLoading } = useReadContract({
    address,
    abi: NFT_COLLECTION_ABI,
    functionName: 'totalSupply',
    query: { enabled: !!address },
  })

  return {
    name: name as string | undefined,
    symbol: symbol as string | undefined,
    totalSupply: totalSupply ? Number(totalSupply) : undefined,
    isLoading: nameLoading || symbolLoading || supplyLoading,
  }
}

