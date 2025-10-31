'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt, usePublicClient, useReadContract, useChainId } from 'wagmi'
import { useCollectionsCount, useCollection, useBuyNFT } from '@/hooks/useContracts'
import { getContractAddresses, NFT_COLLECTION_ABI, NFT_MARKETPLACE_ABI } from '@/config/contracts'
import { parseEther, decodeEventLog, formatEther } from 'viem'

interface MarketplaceNFT {
  collectionAddress: `0x${string}`
  tokenId: bigint
  isListed: boolean
  listingPrice?: bigint
}

export function ListMarketplaceNFTs() {
  const { address, isConnected } = useAccount()
  const { count } = useCollectionsCount()
  const [selectedCollection, setSelectedCollection] = useState<`0x${string}` | null>(null)
  const [marketplaceNFTs, setMarketplaceNFTs] = useState<MarketplaceNFT[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedNFT, setSelectedNFT] = useState<{ collection: `0x${string}`; tokenId: bigint } | null>(null)
  const [price, setPrice] = useState('')
  const [isBatchListing, setIsBatchListing] = useState(false)
  const [batchListHash, setBatchListHash] = useState<`0x${string}` | null>(null)
  
  const publicClient = usePublicClient()
  const chainId = useChainId()
  const { writeContract, data: hash, isPending, error } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })
  const isWaiting = isConfirming
  
  const contractAddresses = getContractAddresses(chainId)

  // Get default listing price from factory
  const { data: defaultListingPrice } = useReadContract({
    address: contractAddresses.NFT_COLLECTION_FACTORY,
    abi: [
      {
        inputs: [],
        name: 'defaultListingPrice',
        outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
      },
    ],
    functionName: 'defaultListingPrice',
  })

  // Check if user is marketplace owner
  const { data: marketplaceOwner } = useReadContract({
    address: contractAddresses.NFT_MARKETPLACE,
    abi: NFT_MARKETPLACE_ABI,
    functionName: 'owner',
  })

  const isMarketplaceOwner = marketplaceOwner && address && 
    (marketplaceOwner as string).toLowerCase() === address.toLowerCase()

  // Fetch NFTs owned by marketplace for a collection
  const fetchMarketplaceNFTs = useCallback(async (collectionAddress: `0x${string}`) => {
    if (!publicClient) return
    
    setIsLoading(true)
    try {
      // Get total supply
      const totalSupply = await publicClient.readContract({
        address: collectionAddress,
        abi: NFT_COLLECTION_ABI,
        functionName: 'totalSupply',
      })
      
      const nfts: MarketplaceNFT[] = []
      const totalTokens = Number(totalSupply)
      
      // Limit to first 50 tokens to avoid rate limiting
      const maxTokens = Math.min(totalTokens, 10)
      
      if (maxTokens === 0) {
        setMarketplaceNFTs([])
        setIsLoading(false)
        return
      }
      
      // Use Transfer events to find marketplace-owned NFTs (more efficient)
      let eventBasedFound = false
      try {
        const currentBlock = await publicClient.getBlockNumber()
        // Use a much smaller block range for Flow testnet (limited to ~10k blocks)
        const maxBlocks = chainId === 545 ? BigInt(5000) : BigInt(50000) // 5k for Flow, 50k for others
        const fromBlock = currentBlock > maxBlocks ? currentBlock - maxBlocks : BigInt(0)

        console.log('Fetching Transfer events for collection:', collectionAddress)
        console.log('Chain ID:', chainId)
        console.log('Marketplace address:', contractAddresses.NFT_MARKETPLACE)
        console.log('Block range:', fromBlock.toString(), 'to latest (max', maxBlocks.toString(), 'blocks)')

        // Get Transfer events where marketplace received NFTs
        // Use topics for filtering since 'to' is indexed
        const marketplaceAddress = contractAddresses.NFT_MARKETPLACE
        const marketplaceAddressLower = marketplaceAddress.toLowerCase()

        let transferLogs: Awaited<ReturnType<typeof publicClient.getLogs>> = []
        try {
          transferLogs = await publicClient.getLogs({
            address: collectionAddress,
            event: {
              type: 'event',
              name: 'Transfer',
              inputs: [
                { indexed: true, name: 'from', type: 'address' },
                { indexed: true, name: 'to', type: 'address' },
                { indexed: true, name: 'tokenId', type: 'uint256' },
              ],
            },
            fromBlock: fromBlock,
            toBlock: 'latest',
            args: {
              to: marketplaceAddress,
            },
          })
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : String(error)
          console.warn('Failed to fetch Transfer events in one request:', errorMessage)
          // If the range is too large, try with an even smaller range
          if (errorMessage.includes('limited to') || errorMessage.includes('413')) {
            const smallerFromBlock = currentBlock > BigInt(2000) ? currentBlock - BigInt(2000) : BigInt(0)
            console.log('Retrying with smaller block range:', smallerFromBlock.toString(), 'to latest')
            try {
              transferLogs = await publicClient.getLogs({
                address: collectionAddress,
                event: {
                  type: 'event',
                  name: 'Transfer',
                  inputs: [
                    { indexed: true, name: 'from', type: 'address' },
                    { indexed: true, name: 'to', type: 'address' },
                    { indexed: true, name: 'tokenId', type: 'uint256' },
                  ],
                },
                fromBlock: smallerFromBlock,
                toBlock: 'latest',
                args: {
                  to: marketplaceAddress,
                },
              })
            } catch (retryError: unknown) {
              const retryErrorMessage = retryError instanceof Error ? retryError.message : String(retryError)
              console.warn('Retry also failed:', retryErrorMessage)
              transferLogs = []
            }
          }
        }
        
        console.log(`Found ${transferLogs.length} Transfer events to marketplace`)
        
        // Extract token IDs from events
        const marketplaceTokenIds = new Set<bigint>()
        
        for (const log of transferLogs) {
          try {
            const decoded = decodeEventLog({
              abi: [
                {
                  type: 'event',
                  name: 'Transfer',
                  inputs: [
                    { indexed: true, name: 'from', type: 'address' },
                    { indexed: true, name: 'to', type: 'address' },
                    { indexed: true, name: 'tokenId', type: 'uint256' },
                  ],
                },
              ],
              data: log.data,
              topics: log.topics,
            })
            
            const decodedArgs = decoded.args as { to?: string; tokenId?: bigint }
            const toAddress = decodedArgs.to?.toLowerCase()
            const tokenId = decodedArgs.tokenId ? BigInt(decodedArgs.tokenId.toString()) : BigInt(0)
            
            // Double-check that 'to' matches marketplace
            if (toAddress === marketplaceAddressLower && tokenId < BigInt(maxTokens)) {
              marketplaceTokenIds.add(tokenId)
            }
          } catch (err) {
            console.warn('Error decoding transfer log:', err)
          }
        }
        
        console.log(`Found ${marketplaceTokenIds.size} unique marketplace-owned tokens from events`)
        
        // Batch check listing status for found tokens
        const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))
        const tokenArray = Array.from(marketplaceTokenIds).slice(0, maxTokens)
        
        if (tokenArray.length > 0) {
          eventBasedFound = true
          // Use multicall to batch listing checks
          const batchSize = 10
          for (let i = 0; i < tokenArray.length; i += batchSize) {
            const batch = tokenArray.slice(i, i + batchSize)
            
            if (i > 0) {
              await delay(300) // 300ms delay between batches
            }
            
            try {
              const calls = batch.map((tokenId) => ({
                address: contractAddresses.NFT_MARKETPLACE,
                abi: NFT_MARKETPLACE_ABI,
                functionName: 'getListing',
                args: [collectionAddress, tokenId],
              }))

              let results: Array<{ status: 'success' | 'failure'; result?: unknown; error?: unknown }>

              // Skip multicall for Flow testnet (chainId 545) as it doesn't support it
              if (chainId === 545) {
                results = []
                for (let j = 0; j < batch.length; j++) {
                  if (j > 0) {
                    await delay(100)
                  }
                  try {
                    const result = await publicClient.readContract({
                      address: contractAddresses.NFT_MARKETPLACE,
                      abi: NFT_MARKETPLACE_ABI,
                      functionName: 'getListing',
                      args: [collectionAddress, batch[j]],
                    })
                    results.push({ status: 'success' as const, result })
                  } catch (err) {
                    results.push({ status: 'failure' as const, error: err })
                  }
                }
              } else {
                try {
                  results = await publicClient.multicall({ contracts: calls })
                } catch (multicallErr: unknown) {
                  // If multicall fails (e.g., chain doesn't support it), fall back to individual calls
                  const errorMessage = multicallErr instanceof Error ? multicallErr.message : String(multicallErr)
                  console.warn('Multicall failed, using individual calls:', errorMessage)
                  results = []

                  // Call each contract individually with delays
                for (let j = 0; j < batch.length; j++) {
                  if (j > 0) {
                    await delay(100) // Small delay between individual calls
                  }
                  try {
                    const result = await publicClient.readContract({
                      address: contractAddresses.NFT_MARKETPLACE,
                      abi: NFT_MARKETPLACE_ABI,
                      functionName: 'getListing',
                      args: [collectionAddress, batch[j]],
                    })
                    results.push({ status: 'success' as const, result })
                  } catch (err) {
                    results.push({ status: 'failure' as const, error: err })
                  }
                }
                }
              }

              results.forEach((result, index) => {
                if (result.status === 'success' && result.result) {
                  // getListing returns a struct object: { seller, paymentToken, price, isActive }
                  // viem/wagmi converts tuples to objects
                  const listing = result.result as { isActive: boolean; price?: bigint; seller?: string; paymentToken?: string } | null
                  
                  if (!listing) {
                    return
                  }
                  
                  const isActive = listing.isActive === true
                  
                  // Handle price conversion - viem might return it as bigint, string, or number
                  let priceBigInt: bigint | undefined = undefined
                  if (listing.price !== undefined && listing.price !== null) {
                    if (typeof listing.price === 'bigint') {
                      priceBigInt = listing.price
                    } else if (typeof listing.price === 'string') {
                      priceBigInt = BigInt(listing.price)
                    } else if (typeof listing.price === 'number') {
                      priceBigInt = BigInt(listing.price)
                    } else {
                      // Try to convert anyway
                      priceBigInt = BigInt(String(listing.price))
                    }
                  }
                  
                  console.log(`Listing check for token ${batch[index]}:`, listing, 'isActive:', isActive)
                  console.log(`Price for token ${batch[index]}:`, listing.price, 'type:', typeof listing.price, 'as bigint:', priceBigInt?.toString(), 'formatted:', priceBigInt ? formatEther(priceBigInt) : 'N/A')
                  
                  nfts.push({
                    collectionAddress,
                    tokenId: batch[index],
                    isListed: isActive,
                    listingPrice: priceBigInt,
                  })
                } else {
                  console.log(`Token ${batch[index]} - No listing data or failed:`, result.status, result.error)
                  nfts.push({
                    collectionAddress,
                    tokenId: batch[index],
                    isListed: false,
                  })
                }
              })
            } catch (err) {
              console.warn('Batch listing check failed:', err)
              // If batch fails, add tokens without listing status
              batch.forEach((tokenId) => {
                nfts.push({
                  collectionAddress,
                  tokenId,
                  isListed: false,
                })
              })
            }
          }
        }
      } catch (eventErr) {
        console.warn('Event-based fetch failed, using ownerOf fallback:', eventErr)
        eventBasedFound = false
      }
      
      // Fallback: Use ownerOf with batching if events didn't find anything or failed
      if (!eventBasedFound || nfts.length === 0) {
        console.log('Using ownerOf fallback to find marketplace NFTs')
        
        const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))
        const batchSize = 10
        
        for (let i = 0; i < maxTokens; i += batchSize) {
          if (i > 0) {
            await delay(300) // 300ms delay between batches
          }
          
          const batch = Array.from({ length: Math.min(batchSize, maxTokens - i) }, (_, idx) => i + idx)
          
            try {
              const calls = batch.map((tokenId) => ({
                address: collectionAddress,
                abi: NFT_COLLECTION_ABI,
                functionName: 'ownerOf',
                args: [BigInt(tokenId)],
              }))

              let results: Array<{ status: 'success' | 'failure'; result?: unknown; error?: unknown }>

              // Skip multicall for Flow testnet (chainId 545) as it doesn't support it
              if (chainId === 545) {
                console.log('Skipping multicall for Flow testnet, using individual calls')
                results = []
                for (let j = 0; j < batch.length; j++) {
                  if (j > 0) {
                    await delay(100)
                  }
                  try {
                    const result = await publicClient.readContract({
                      address: collectionAddress,
                      abi: NFT_COLLECTION_ABI,
                      functionName: 'ownerOf',
                      args: [BigInt(batch[j])],
                    })
                    results.push({ status: 'success' as const, result })
                  } catch (err) {
                    results.push({ status: 'failure' as const, error: err })
                  }
                }
              } else {
                try {
                  results = await publicClient.multicall({ contracts: calls })
                } catch (multicallErr: unknown) {
                  // If multicall fails, fall back to individual calls
                  const errorMessage = multicallErr instanceof Error ? multicallErr.message : String(multicallErr)
                  console.warn('Multicall failed, using individual calls:', errorMessage)
                  results = []

                  for (let j = 0; j < batch.length; j++) {
                    if (j > 0) {
                      await delay(100)
                    }
                    try {
                      const result = await publicClient.readContract({
                        address: collectionAddress,
                        abi: NFT_COLLECTION_ABI,
                        functionName: 'ownerOf',
                        args: [BigInt(batch[j])],
                      })
                      results.push({ status: 'success' as const, result })
                    } catch (err) {
                      results.push({ status: 'failure' as const, error: err })
                    }
                  }
                }
              }
              
              results.forEach((result, index) => {
                if (result.status === 'success' && result.result) {
                  const owner = typeof result.result === 'string' ? result.result.toLowerCase() : String(result.result).toLowerCase()
                  const marketplace = contractAddresses.NFT_MARKETPLACE.toLowerCase()
                  
                  if (owner === marketplace) {
                    // Check if already in nfts array (from events)
                    const tokenId = BigInt(batch[index])
                    const exists = nfts.find(n => n.tokenId === tokenId)
                    
                    if (!exists) {
                      nfts.push({
                        collectionAddress,
                        tokenId,
                        isListed: false,
                      })
                    }
                  }
                } else if (result.status === 'failure') {
                  // Token might not exist yet, skip
                  console.log(`Token ${batch[index]} might not exist or error:`, result.error)
                }
              })
            } catch (err) {
              console.warn('Batch ownerOf check failed:', err)
              if (err instanceof Error && err.message.includes('429')) {
                console.warn('Rate limited, stopping fetch')
                break
              }
            }
        }
        
        // After finding marketplace-owned NFTs, batch check their listing status for ALL NFTs
        if (nfts.length > 0) {
          console.log(`Found ${nfts.length} marketplace-owned NFTs, checking listing status for all`)
          
          // Check listing status for ALL NFTs, not just unlisted ones
          const batchSize = 10
          for (let i = 0; i < nfts.length; i += batchSize) {
            if (i > 0) {
              await delay(300)
            }
            
            const batch = nfts.slice(i, i + batchSize)
            
              try {
              const calls = batch.map((nft) => ({
                address: contractAddresses.NFT_MARKETPLACE,
                abi: NFT_MARKETPLACE_ABI,
                functionName: 'getListing',
                args: [nft.collectionAddress, nft.tokenId],
              }))

              let results: Array<{ status: 'success' | 'failure'; result?: unknown; error?: unknown }>

              // Skip multicall for Flow testnet (chainId 545) as it doesn't support it
              if (chainId === 545) {
                results = []
                for (let j = 0; j < batch.length; j++) {
                  if (j > 0) {
                    await delay(100)
                  }
                  try {
                    const result = await publicClient.readContract({
                      address: contractAddresses.NFT_MARKETPLACE,
                      abi: NFT_MARKETPLACE_ABI,
                      functionName: 'getListing',
                      args: [batch[j].collectionAddress, batch[j].tokenId],
                    })
                    results.push({ status: 'success' as const, result })
                  } catch (err) {
                    results.push({ status: 'failure' as const, error: err })
                  }
                }
              } else {
                try {
                  results = await publicClient.multicall({ contracts: calls })
                } catch (multicallErr: unknown) {
                  // If multicall fails, fall back to individual calls
                  const errorMessage = multicallErr instanceof Error ? multicallErr.message : String(multicallErr)
                  console.warn('Multicall failed, using individual calls:', errorMessage)
                  results = []

                  for (let j = 0; j < batch.length; j++) {
                    if (j > 0) {
                      await delay(100)
                    }
                    try {
                      const result = await publicClient.readContract({
                        address: contractAddresses.NFT_MARKETPLACE,
                        abi: NFT_MARKETPLACE_ABI,
                        functionName: 'getListing',
                        args: [batch[j].collectionAddress, batch[j].tokenId],
                      })
                      results.push({ status: 'success' as const, result })
                    } catch (err) {
                      results.push({ status: 'failure' as const, error: err })
                    }
                  }
                }
              }

              results.forEach((result, index) => {
                if (result.status === 'success' && result.result) {
                  // getListing returns a struct object: { seller, paymentToken, price, isActive }
                  // viem/wagmi converts tuples to objects
                  const listing = result.result as { isActive: boolean; price?: bigint; seller?: string; paymentToken?: string } | null
                  
                  if (!listing) {
                    return
                  }
                  
                  const isActive = listing.isActive === true
                  
                  // Handle price conversion - viem might return it as bigint, string, or number
                  let priceBigInt: bigint | undefined = undefined
                  if (listing.price !== undefined && listing.price !== null) {
                    if (typeof listing.price === 'bigint') {
                      priceBigInt = listing.price
                    } else if (typeof listing.price === 'string') {
                      priceBigInt = BigInt(listing.price)
                    } else if (typeof listing.price === 'number') {
                      priceBigInt = BigInt(listing.price)
                    } else {
                      // Try to convert anyway
                      priceBigInt = BigInt(String(listing.price))
                    }
                  }
                  
                  console.log(`Listing status check for token ${batch[index].tokenId}:`, listing, 'isActive:', isActive)
                  console.log(`Price for token ${batch[index].tokenId}:`, listing.price, 'type:', typeof listing.price, 'as bigint:', priceBigInt?.toString(), 'formatted:', priceBigInt ? formatEther(priceBigInt) : 'N/A')
                  
                  const nftIndex = nfts.findIndex(n => 
                    n.tokenId === batch[index].tokenId && 
                    n.collectionAddress === batch[index].collectionAddress
                  )
                  if (nftIndex >= 0) {
                    nfts[nftIndex].isListed = isActive
                    nfts[nftIndex].listingPrice = priceBigInt
                    console.log(`Updated token ${batch[index].tokenId} listing status to:`, isActive)
                  }
                } else {
                  console.log(`Token ${batch[index].tokenId} - Failed to check listing:`, result.status, result.error)
                }
              })
              } catch (err) {
                console.warn('Failed to check listing status:', err)
              }
          }
        }
      }
      
      console.log(`Final result: Found ${nfts.length} marketplace NFTs`)
      setMarketplaceNFTs(nfts)
      
      if (totalTokens > maxTokens) {
        console.warn(`Collection has ${totalTokens} tokens, only showing first ${maxTokens}`)
      }
      
      if (nfts.length === 0) {
        console.warn('No marketplace NFTs found. Collection might not have any NFTs minted to marketplace yet.')
      }
    } catch (err) {
      console.error('Error fetching marketplace NFTs:', err)
      if (err instanceof Error && err.message.includes('429')) {
        alert('Rate limit exceeded. Please wait a moment and try again.')
      }
    } finally {
      setIsLoading(false)
    }
  }, [publicClient, chainId, contractAddresses])

  const handleListNFT = async () => {
    if (!selectedNFT || !price || parseFloat(price) <= 0) return
    
    try {
      await writeContract({
        address: contractAddresses.NFT_MARKETPLACE,
        abi: NFT_MARKETPLACE_ABI,
        functionName: 'listOwnedNFT',
        args: [
          selectedNFT.collection,
          selectedNFT.tokenId,
          '0x0000000000000000000000000000000000000000' as `0x${string}`, // Native ETH
          parseEther(price),
        ],
      })
    } catch (err) {
      console.error('Listing failed:', err)
    }
  }

  const handleBatchListAll = async () => {
    if (!selectedCollection || !defaultListingPrice || marketplaceNFTs.length === 0) return
    
    const unlistedNFTs = marketplaceNFTs.filter(nft => !nft.isListed)
    if (unlistedNFTs.length === 0) {
      alert('All NFTs are already listed!')
      return
    }
    
    if (!confirm(`List all ${unlistedNFTs.length} unlisted NFTs at ${formatEther(defaultListingPrice as bigint)} ETH each?`)) {
      return
    }
    
    setIsBatchListing(true)
    setBatchListHash(null)
    
    try {
      // List NFTs one by one sequentially, checking status before each listing
      const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))
      let successCount = 0
      let skipCount = 0
      
      for (let i = 0; i < unlistedNFTs.length; i++) {
        const nft = unlistedNFTs[i]
        
        try {
          // First, check if already listed (double-check before listing)
          try {
            const listingCheck = await publicClient?.readContract({
              address: contractAddresses.NFT_MARKETPLACE,
              abi: NFT_MARKETPLACE_ABI,
              functionName: 'getListing',
              args: [nft.collectionAddress, nft.tokenId],
            })
            
            // getListing returns a struct object: { seller, paymentToken, price, isActive }
            // viem/wagmi converts tuples to objects
            console.log(`Pre-check token ${nft.tokenId}:`, listingCheck, 'type:', typeof listingCheck)
            
            if (listingCheck && typeof listingCheck === 'object' && 'isActive' in listingCheck) {
              const listingCheckTyped = listingCheck as { isActive?: boolean } | null
              const isActive = listingCheckTyped?.isActive === true
              console.log(`Pre-check token ${nft.tokenId}: isActive:`, isActive)
              if (isActive === true) {
                console.log(`Token ${nft.tokenId.toString()} is already listed, skipping`)
                skipCount++
                continue
              }
            } else {
              console.log(`Pre-check token ${nft.tokenId}: Unknown format:`, typeof listingCheck, listingCheck)
            }
          } catch (checkErr) {
            // If check fails, proceed with listing attempt
            console.warn(`Could not check listing status for token ${nft.tokenId}:`, checkErr)
          }
          
          await writeContract({
            address: contractAddresses.NFT_MARKETPLACE,
            abi: NFT_MARKETPLACE_ABI,
            functionName: 'listOwnedNFT',
            args: [
              nft.collectionAddress,
              nft.tokenId,
              '0x0000000000000000000000000000000000000000' as `0x${string}`, // Native ETH
              defaultListingPrice as bigint,
            ],
          })
          
          if (i === 0 && hash) {
            setBatchListHash(hash)
          }
          
          successCount++
          
          // Wait for transaction to be sent before next one
          await delay(1500) // 1.5 second delay between transactions
        } catch (err: unknown) {
          console.error(`Failed to list token ${nft.tokenId}:`, err)
          
          // If it's an "Already listed" error, skip it
          const errorMessage = err instanceof Error ? err.message : String(err)
          if (errorMessage.includes('Already listed') || errorMessage.includes('already listed')) {
            skipCount++
            continue
          }
          
          // For other errors, stop batch listing
          const finalErrorMessage = err instanceof Error ? err.message : 'Unknown error'
          alert(`Error listing token ${nft.tokenId}: ${finalErrorMessage}. Stopping batch listing.`)
          break
        }
      }
      
      // Show summary
      if (successCount > 0 || skipCount > 0) {
        const message = `Batch listing complete!\n- Successfully listed: ${successCount}\n- Skipped (already listed): ${skipCount}`
        alert(message)
      }
      
      // Refresh the NFTs list after a delay
      setTimeout(() => {
        if (selectedCollection) {
          fetchMarketplaceNFTs(selectedCollection)
        }
      }, 3000)
    } catch (err) {
      console.error('Batch listing failed:', err)
      alert('Batch listing encountered an error. Some NFTs may have been listed.')
    } finally {
      setIsBatchListing(false)
    }
  }

  useEffect(() => {
    if (isSuccess && selectedNFT) {
      setSelectedNFT(null)
      setPrice('')
      if (selectedCollection) {
        fetchMarketplaceNFTs(selectedCollection)
      }
    }
  }, [isSuccess, selectedNFT, selectedCollection, fetchMarketplaceNFTs])

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold mb-4 text-[#123F74]">List Marketplace NFTs</h3>
        <p className="text-sm text-gray-600 mb-4">
          NFTs minted to the marketplace when collections are created need to be listed for sale.
          Select a collection to see NFTs owned by the marketplace.
        </p>
        {!isConnected && (
          <div className="bg-yellow-50 p-4 rounded-lg mb-4">
            <p className="text-yellow-800 text-sm">Please connect your wallet to continue.</p>
          </div>
        )}
        {isConnected && !isMarketplaceOwner && (
          <div className="bg-orange-50 p-4 rounded-lg mb-4">
            <p className="text-orange-800 text-sm">
              ⚠️ Only the marketplace owner can list NFTs owned by the marketplace.
              Marketplace owner: {marketplaceOwner?.slice(0, 10)}...
            </p>
          </div>
        )}
        {isConnected && isMarketplaceOwner && (
          <div className="bg-green-50 p-4 rounded-lg mb-4">
            <p className="text-green-800 text-sm">✅ You are the marketplace owner. You can list NFTs.</p>
          </div>
        )}
      </div>

      {/* Collection Selector */}
      <div>
        <label className="block text-sm font-medium mb-2">Select Collection</label>
        {isLoading && (
          <div className="bg-blue-50 p-4 rounded-lg mb-4">
            <p className="text-blue-800 text-sm">
              ⚠️ Fetching NFTs... This may take a moment. Using optimized batch fetching to minimize rate limits.
            </p>
            <p className="text-blue-700 text-xs mt-1">
              Only checking first 50 tokens. If needed, use Transfer events to find more.
            </p>
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from({ length: count }).map((_, index) => (
            <CollectionSelector
              key={index}
              index={index}
              onSelect={async (collectionAddress) => {
                if (isLoading) {
                  alert('Please wait for current fetch to complete')
                  return
                }
                setSelectedCollection(collectionAddress)
                await fetchMarketplaceNFTs(collectionAddress)
              }}
            />
          ))}
        </div>
      </div>

      {/* Marketplace NFTs */}
      {selectedCollection && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-lg font-bold">Marketplace NFTs</h4>
            {marketplaceNFTs.length > 0 && !isLoading && (
              <div className="flex gap-2 items-center">
                <button
                  onClick={() => {
                    if (selectedCollection) {
                      fetchMarketplaceNFTs(selectedCollection)
                    }
                  }}
                  disabled={isLoading}
                  className="px-3 py-1 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 text-sm"
                >
                  Refresh
                </button>
                <span className="text-sm text-gray-600">
                  {marketplaceNFTs.filter(n => !n.isListed).length} unlisted
                </span>
                {defaultListingPrice && marketplaceNFTs.filter(n => !n.isListed).length > 0 && (
                  <button
                    onClick={handleBatchListAll}
                    disabled={isBatchListing || isPending || !isMarketplaceOwner}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    {isBatchListing ? 'Listing...' : `Batch List All (${formatEther(defaultListingPrice as bigint)} ETH)`}
                  </button>
                )}
              </div>
            )}
          </div>
          {isLoading ? (
            <p className="text-gray-600">Loading...</p>
          ) : marketplaceNFTs.length === 0 ? (
            <p className="text-gray-600">No NFTs found in marketplace for this collection.</p>
          ) : (
            <>
              {isBatchListing && (
                <div className="bg-blue-50 p-4 rounded-lg mb-4">
                  <p className="text-blue-800 text-sm">
                    ⏳ Batch listing NFTs... This may take a moment. Please don&apos;t close this page.
                  </p>
                  {batchListHash && (
                    <p className="text-blue-700 text-xs mt-1">
                      Transaction: {batchListHash.slice(0, 20)}...
                    </p>
                  )}
                </div>
              )}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {marketplaceNFTs.map((nft) => (
                  <NFTCard
                    key={nft.tokenId.toString()}
                    nft={nft}
                    selectedNFT={selectedNFT}
                    onSelect={() => {
                      if (!nft.isListed) {
                        setSelectedNFT({ collection: nft.collectionAddress, tokenId: nft.tokenId })
                      }
                    }}
                    onPurchaseSuccess={() => {
                      // Refresh the NFT list after purchase
                      if (selectedCollection) {
                        fetchMarketplaceNFTs(selectedCollection)
                      }
                    }}
                    isBatchListing={isBatchListing}
                  />
                ))}
              </div>
            </>
          )}

          {/* List NFT Form */}
          {selectedNFT && !marketplaceNFTs.find(n => n.tokenId === selectedNFT.tokenId)?.isListed && (
            <div className="mt-6 bg-white p-6 rounded-lg shadow">
              <h4 className="font-bold mb-4">List Token #{selectedNFT.tokenId.toString()}</h4>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Price (ETH)</label>
                  <input
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    step="0.0001"
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#123F74] focus:border-transparent"
                    placeholder="0.1"
                  />
                </div>
                
                {error && (
                  <div className="bg-red-50 p-2 rounded text-sm text-red-800">
                    {error.message}
                  </div>
                )}
                
                {(isPending || isConfirming || isWaiting) && (
                  <div className="bg-blue-50 p-2 rounded text-sm text-blue-800">
                    {isPending ? 'Waiting for transaction...' : isConfirming ? 'Confirming...' : 'Processing...'}
                  </div>
                )}
                
                {isSuccess && (
                  <div className="bg-green-50 p-2 rounded text-sm text-green-800">
                    NFT listed successfully!
                  </div>
                )}
                
                <button
                  onClick={handleListNFT}
                  disabled={!price || parseFloat(price) <= 0 || isPending || isConfirming || isWaiting || !isMarketplaceOwner}
                  className="w-full px-4 py-2 bg-[#1769AA] text-white rounded-lg hover:bg-[#1976D2] disabled:opacity-50"
                >
                  {isPending || isConfirming || isWaiting ? 'Listing...' : 'List NFT'}
                </button>
                {!isMarketplaceOwner && (
                  <p className="text-xs text-red-600 mt-2">
                    Only marketplace owner can list NFTs owned by the marketplace.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// NFTCard component to display NFT with buy/select functionality
function NFTCard({
  nft,
  selectedNFT,
  onSelect,
  onPurchaseSuccess,
  isBatchListing,
}: {
  nft: MarketplaceNFT
  selectedNFT: { collection: `0x${string}`; tokenId: bigint } | null
  onSelect: () => void
  onPurchaseSuccess: () => void
  isBatchListing: boolean
}) {
  const { buyNFT, hash, isPending, isConfirming, isSuccess, error } = useBuyNFT()
  const { address, isConnected } = useAccount()
  const publicClient = usePublicClient()
  const chainId = useChainId()
  const contractAddresses = getContractAddresses(chainId)

  // Verify ownership after purchase
  const { data: ownerAfterPurchase } = useReadContract({
    address: nft.collectionAddress,
    abi: NFT_COLLECTION_ABI,
    functionName: 'ownerOf',
    args: [nft.tokenId],
    query: {
      enabled: isSuccess && !!address,
    },
  })

  useEffect(() => {
    if (isSuccess) {
      // Refresh list after successful purchase
      setTimeout(() => {
        onPurchaseSuccess()
      }, 2000) // Wait 2 seconds for block confirmation
      
      // Verify ownership
      if (ownerAfterPurchase && address) {
        const isOwner = (ownerAfterPurchase as string).toLowerCase() === address.toLowerCase()
        if (isOwner) {
          console.log('✅ Ownership verified: NFT is in your wallet!', {
            collection: nft.collectionAddress,
            tokenId: nft.tokenId.toString(),
            owner: ownerAfterPurchase,
          })
        } else {
          console.warn('⚠️ Ownership verification failed:', {
            expected: address,
            actual: ownerAfterPurchase,
          })
        }
      }
    }
  }, [isSuccess, ownerAfterPurchase, address, nft.collectionAddress, nft.tokenId, onPurchaseSuccess])

  const handleBuy = async (e: React.MouseEvent) => {
    e.stopPropagation() // Prevent card selection when clicking buy
    
    if (!nft.listingPrice) {
      alert('Listing price not available')
      return
    }

    if (!isConnected) {
      alert('Please connect your wallet')
      return
    }

    try {
      // Double-check the actual listing price from the contract before buying
      if (publicClient) {
        const actualListing = await publicClient.readContract({
          address: contractAddresses.NFT_MARKETPLACE,
          abi: NFT_MARKETPLACE_ABI,
          functionName: 'getListing',
          args: [nft.collectionAddress, nft.tokenId],
        })
        
        const listingTyped = actualListing as { price?: bigint } | null
        const actualPrice = listingTyped?.price
        console.log('Actual listing price from contract:', {
          storedPrice: nft.listingPrice.toString(),
          contractPrice: actualPrice?.toString(),
          contractPriceFormatted: actualPrice ? formatEther(BigInt(actualPrice.toString())) : 'N/A',
          match: nft.listingPrice.toString() === actualPrice?.toString(),
        })
        
        // Use the actual price from contract to ensure exact match
        if (actualPrice) {
          const priceBigInt = typeof actualPrice === 'bigint' ? actualPrice : BigInt(String(actualPrice))
          await buyNFT(nft.collectionAddress, nft.tokenId, priceBigInt)
        } else {
          await buyNFT(nft.collectionAddress, nft.tokenId, nft.listingPrice as bigint)
        }
      } else {
        await buyNFT(nft.collectionAddress, nft.tokenId, nft.listingPrice as bigint)
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Purchase failed'
      console.error('Purchase failed:', err)
      alert(errorMessage)
    }
  }

  const isSelected = selectedNFT?.tokenId === nft.tokenId

  if (nft.isListed) {
    // Listed NFT - show buy button
    return (
      <div className={`p-4 border rounded-lg ${
        isSelected ? 'border-[#123F74] bg-blue-50' : 'border-green-300 bg-green-50'
      }`}>
        <div className="font-bold mb-2">Token #{nft.tokenId.toString()}</div>
        <div className="text-xs text-green-600 mb-2">✓ Listed</div>
        {nft.listingPrice && (
          <div className="text-lg font-bold text-[#123F74] mb-3">
            {formatEther(nft.listingPrice)} ETH
          </div>
        )}
        
        {error && (
          <div className="bg-red-50 p-2 rounded text-xs text-red-800 mb-2">
            {error.message}
          </div>
        )}
        
        {(isPending || isConfirming) && (
          <div className="bg-blue-50 p-2 rounded text-xs text-blue-800 mb-2">
            {isPending ? 'Waiting for transaction...' : 'Confirming...'}
          </div>
        )}
        
        {isSuccess && (
          <div className="bg-green-50 p-2 rounded text-xs text-green-800 mb-2">
            Purchase successful! NFT transferred to your wallet.
            <div className="mt-1 text-xs">
              Collection: {nft.collectionAddress}
              <br />
              Token ID: #{nft.tokenId.toString()}
              {ownerAfterPurchase && address && (
                <div className="mt-1">
                  {((ownerAfterPurchase as string).toLowerCase() === address.toLowerCase()) ? (
                    <span className="text-green-700 font-semibold">✅ Verified: You own this NFT!</span>
                  ) : (
                    <span className="text-orange-600">⚠️ Verifying ownership...</span>
                  )}
                </div>
              )}
              <br />
              <span className="text-gray-600 mt-1 block">
                💡 Tip: Add this collection address to your wallet to view the NFT: {nft.collectionAddress}
              </span>
            </div>
          </div>
        )}
        
        <button
          onClick={handleBuy}
          disabled={isPending || isConfirming || isSuccess || !isConnected || isBatchListing}
          className="w-full px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold"
        >
          {isPending ? 'Waiting...' : isConfirming ? 'Confirming...' : isSuccess ? 'Purchased!' : 'Buy Now'}
        </button>
        
        {hash && (
          <p className="text-xs text-gray-500 mt-1 truncate">
            TX: {hash.slice(0, 10)}...
          </p>
        )}
      </div>
    )
  }

  // Unlisted NFT - show select button
  return (
    <button
      onClick={onSelect}
      className={`p-4 border rounded-lg text-left ${
        isSelected
          ? 'border-[#123F74] bg-blue-50'
          : 'border-gray-200 hover:border-gray-300'
      } ${isBatchListing ? 'opacity-50' : ''}`}
      disabled={isBatchListing}
    >
      <div className="font-bold">Token #{nft.tokenId.toString()}</div>
      <div className="text-xs text-gray-600 mt-1">Not listed</div>
    </button>
  )
}

function CollectionSelector({ index, onSelect }: { index: number; onSelect: (address: `0x${string}`) => void }) {
  const { collection, isLoading } = useCollection(index)
  
  if (isLoading || !collection) {
    return (
      <div className="p-4 border border-gray-200 rounded-lg">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    )
  }

  return (
    <button
      onClick={() => onSelect(collection.collectionAddress)}
      className="p-4 border border-gray-200 rounded-lg hover:border-[#123F74] hover:bg-blue-50 text-left transition"
    >
      <div className="font-bold text-sm">{collection.name}</div>
      <div className="text-xs text-gray-600 mt-1">{collection.symbol}</div>
      <div className="text-xs text-gray-400 mt-1 break-all">{collection.collectionAddress.slice(0, 20)}...</div>
    </button>
  )
}
