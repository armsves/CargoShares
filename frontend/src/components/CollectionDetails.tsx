'use client'

import { useState } from 'react'
import { useAccount } from 'wagmi'
import { useReadContract } from 'wagmi'
import { NFT_COLLECTION_ABI } from '@/config/contracts'
import { ListNFTForm } from '@/components/Marketplace'

interface CollectionDetailsProps {
  collectionAddress: `0x${string}`
  name: string
  symbol: string
}

export function CollectionDetails({ collectionAddress, name, symbol }: CollectionDetailsProps) {
  const { address } = useAccount()
  const [selectedTokenId, setSelectedTokenId] = useState<bigint | null>(null)
  
  const { data: totalSupply } = useReadContract({
    address: collectionAddress,
    abi: NFT_COLLECTION_ABI,
    functionName: 'totalSupply',
  })

  // Get user's owned tokens
  const ownedTokens: bigint[] = []
  if (totalSupply && address) {
    for (let i = 0; i < Number(totalSupply); i++) {
      // Check ownership
      // In production, use events or indexer for efficiency
      ownedTokens.push(BigInt(i))
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-2xl font-bold mb-2">{name}</h2>
        <p className="text-gray-600 mb-2">Symbol: {symbol}</p>
        <p className="text-gray-600 mb-2">Total Supply: {totalSupply ? Number(totalSupply) : 'N/A'}</p>
        <p className="text-xs text-gray-400 break-all">Address: {collectionAddress}</p>
      </div>

      {address && (
        <div>
          <h3 className="text-lg font-bold mb-4">Your NFTs</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {ownedTokens.map((tokenId) => (
              <TokenOwnershipCard
                key={tokenId.toString()}
                collectionAddress={collectionAddress}
                tokenId={tokenId}
                onSelect={() => setSelectedTokenId(tokenId)}
              />
            ))}
          </div>

          {selectedTokenId !== null && (
            <div className="mt-6 bg-white p-6 rounded-lg shadow">
              <h4 className="font-bold mb-4">List NFT #{selectedTokenId.toString()}</h4>
              <ListNFTForm
                nftContract={collectionAddress}
                tokenId={selectedTokenId}
                onSuccess={() => setSelectedTokenId(null)}
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function TokenOwnershipCard({
  collectionAddress,
  tokenId,
  onSelect,
}: {
  collectionAddress: `0x${string}`
  tokenId: bigint
  onSelect: () => void
}) {
  const { address } = useAccount()
  const { data: owner } = useReadContract({
    address: collectionAddress,
    abi: NFT_COLLECTION_ABI,
    functionName: 'ownerOf',
    args: [tokenId],
  })

  if (!address || owner?.toLowerCase() !== address.toLowerCase()) {
    return null
  }

  return (
    <button
      onClick={onSelect}
      className="p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition text-left"
    >
      <div className="font-bold">Token #{tokenId.toString()}</div>
      <div className="text-sm text-gray-600">Click to list</div>
    </button>
  )
}

