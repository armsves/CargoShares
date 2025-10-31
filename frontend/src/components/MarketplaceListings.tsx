'use client'

import { useState, useEffect, useCallback } from 'react'
import { usePublicClient, useWatchContractEvent } from 'wagmi'
import { useBuyNFT } from '@/hooks/useContracts'
import { CONTRACT_ADDRESSES, NFT_MARKETPLACE_ABI } from '@/config/contracts'
import { formatEther, decodeEventLog } from 'viem'

interface Listing {
  nftContract: `0x${string}`
  tokenId: bigint
  seller: `0x${string}`
  price: bigint
  isActive: boolean
}

export function Marketplace() {
  const [listings, setListings] = useState<Listing[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const publicClient = usePublicClient()

  // Fetch listings from events
  const fetchListings = useCallback(async () => {
    if (!publicClient || !CONTRACT_ADDRESSES.NFT_MARKETPLACE) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    try {
      // Get current block number
      const currentBlock = await publicClient.getBlockNumber()
      const fromBlock = currentBlock - BigInt(200000) // Last 200k blocks
      
      // Query Listed events
      const logs = await publicClient.getLogs({
        address: CONTRACT_ADDRESSES.NFT_MARKETPLACE as `0x${string}`,
        event: {
          type: 'event',
          name: 'Listed',
          inputs: [
            { indexed: true, name: 'nftContract', type: 'address' },
            { indexed: true, name: 'tokenId', type: 'uint256' },
            { indexed: true, name: 'seller', type: 'address' },
            { indexed: false, name: 'paymentToken', type: 'address' },
            { indexed: false, name: 'price', type: 'uint256' },
          ],
        },
        fromBlock: fromBlock > 0 ? fromBlock : BigInt(0),
        toBlock: 'latest',
      })

      // Filter active listings - batch verify using multicall
      const activeListings: Listing[] = []
      
      // First, decode all events
      const decodedEvents: Array<{ nftContract: `0x${string}`, tokenId: bigint, seller: `0x${string}`, price: bigint }> = []
      
      for (const log of logs) {
        try {
          const decoded = decodeEventLog({
            abi: NFT_MARKETPLACE_ABI,
            data: log.data,
            topics: log.topics,
          })
          
          const args = decoded.args as { nftContract?: string; tokenId?: bigint; seller?: string; price?: bigint }
          const { nftContract, tokenId, seller, price } = args
          if (nftContract && tokenId && seller && price) {
            decodedEvents.push({
              nftContract: nftContract as `0x${string}`,
              tokenId: BigInt(tokenId.toString()),
              seller: seller as `0x${string}`,
              price: BigInt(price.toString()),
            })
          }
        } catch (err) {
          console.warn('Error decoding listing log:', err)
        }
      }

      // Batch verify active status using multicall (limit to 50 at a time)
      const batchSize = 50
      const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))
      
      for (let i = 0; i < decodedEvents.length; i += batchSize) {
        const batch = decodedEvents.slice(i, i + batchSize)
        
        // Add delay between batches
        if (i > 0) {
          await delay(200) // 200ms delay between batches
        }
        
        try {
          // Use multicall to batch requests
          const calls = batch.map((event) => ({
            address: CONTRACT_ADDRESSES.NFT_MARKETPLACE as `0x${string}`,
            abi: NFT_MARKETPLACE_ABI,
            functionName: 'getListing',
            args: [event.nftContract, event.tokenId],
          }))
          
          let results: Array<{ status: 'success' | 'failure'; result?: unknown; error?: Error }>
          try {
            const multicallResults = await publicClient.multicall({ contracts: calls })
            results = multicallResults.map((r: { status?: 'success' | 'failure'; result?: unknown; error?: Error }) => ({
              status: r.status || 'success',
              result: r.result,
              error: r.error,
            }))
          } catch (multicallErr: unknown) {
            // If multicall fails (e.g., chain doesn't support it), fall back to individual calls
            const errorMessage = multicallErr instanceof Error ? multicallErr.message : String(multicallErr)
            console.warn('Multicall failed, using individual calls:', errorMessage)
            results = []
            const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))
            
            for (let j = 0; j < batch.length; j++) {
              if (j > 0) {
                await delay(100)
              }
              try {
                const result = await publicClient.readContract({
                  address: CONTRACT_ADDRESSES.NFT_MARKETPLACE as `0x${string}`,
                  abi: NFT_MARKETPLACE_ABI,
                  functionName: 'getListing',
                  args: [batch[j].nftContract, batch[j].tokenId],
                })
                results.push({ status: 'success' as const, result })
              } catch (err) {
                results.push({ status: 'failure' as const, error: err instanceof Error ? err : new Error(String(err)) })
              }
            }
          }
          
          results.forEach((result, index) => {
            if (result.status === 'success' && result.result) {
              const listingResult = result.result as { isActive?: boolean }
              if (listingResult.isActive) {
                activeListings.push({
                  ...batch[index],
                  isActive: true,
                })
              }
            }
          })
        } catch (err) {
          // If all fails, fall back to trusting events (assume active)
          console.warn('Failed to verify listings, using events as-is:', err)
          batch.forEach((event) => {
            activeListings.push({
              ...event,
              isActive: true,
            })
          })
        }
      }
      
      setListings(activeListings)
    } catch (err) {
      console.error('Error fetching listings:', err)
      setListings([])
    } finally {
      setIsLoading(false)
    }
  }, [publicClient])

  // Watch for new listings
  useWatchContractEvent({
    address: CONTRACT_ADDRESSES.NFT_MARKETPLACE as `0x${string}`,
    abi: NFT_MARKETPLACE_ABI,
    eventName: 'Listed',
    onLogs() {
      fetchListings()
    },
  })

  useWatchContractEvent({
    address: CONTRACT_ADDRESSES.NFT_MARKETPLACE as `0x${string}`,
    abi: NFT_MARKETPLACE_ABI,
    eventName: 'Purchased',
    onLogs() {
      fetchListings()
    },
  })

  useWatchContractEvent({
    address: CONTRACT_ADDRESSES.NFT_MARKETPLACE as `0x${string}`,
    abi: NFT_MARKETPLACE_ABI,
    eventName: 'Cancelled',
    onLogs() {
      fetchListings()
    },
  })

  useEffect(() => {
    // Only fetch when component is mounted and publicClient is available
    if (publicClient) {
      fetchListings()
    }
  }, [fetchListings, publicClient])

  if (isLoading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow">
        <p className="text-gray-600">Loading marketplace listings...</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-[#123F74]">Marketplace Listings</h2>
        <button
          onClick={() => fetchListings()}
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm"
        >
          Refresh
        </button>
      </div>
      
      {listings.length === 0 ? (
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-gray-600">No active listings found.</p>
          <p className="text-sm text-gray-400 mt-2">
            NFTs are minted to the marketplace when collections are created, but they need to be listed for sale.
            Scroll down to list NFTs from collections.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {listings.map((listing) => (
            <ListingCard key={`${listing.nftContract}-${listing.tokenId.toString()}`} listing={listing} />
          ))}
        </div>
      )}
    </div>
  )
}

function ListingCard({ listing }: { listing: Listing }) {
  const { buyNFT, isPending, isConfirming, isSuccess, error } = useBuyNFT()

  const handleBuy = async () => {
    try {
      // Use the raw bigint price directly - no conversion needed
      await buyNFT(listing.nftContract, listing.tokenId, listing.price)
    } catch (err) {
      console.error('Purchase failed:', err)
    }
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition">
      <h3 className="font-bold text-lg mb-2">
        Token #{listing.tokenId.toString()}
      </h3>
      <p className="text-sm text-gray-600 mb-2">
        Contract: {listing.nftContract.slice(0, 10)}...
      </p>
      <p className="text-lg font-bold text-[#123F74] mb-4">
        {formatEther(listing.price)} ETH
      </p>
      
      {error && (
        <div className="bg-red-50 p-2 rounded text-sm text-red-800 mb-2">
          {error.message}
        </div>
      )}
      
      {(isPending || isConfirming) && (
        <div className="bg-blue-50 p-2 rounded text-sm text-blue-800 mb-2">
          {isPending ? 'Purchasing...' : 'Waiting for confirmation...'}
        </div>
      )}
      
      {isSuccess && (
        <div className="bg-green-50 p-2 rounded text-sm text-green-800 mb-2">
          Purchase successful!
        </div>
      )}
      
      <button
        onClick={handleBuy}
        disabled={isPending || isConfirming || !listing.isActive}
        className="w-full px-4 py-2 bg-[#1769AA] text-white rounded-lg hover:bg-[#1976D2] disabled:opacity-50"
      >
        {isPending || isConfirming ? 'Processing...' : 'Buy NFT'}
      </button>
    </div>
  )
}
