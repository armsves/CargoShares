'use client'

import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
import { useListNFT } from '@/hooks/useContracts'
import { NFT_COLLECTION_ABI, CONTRACT_ADDRESSES } from '@/config/contracts'
import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'

interface ListNFTFormProps {
  nftContract: `0x${string}`
  tokenId: bigint
  onSuccess?: () => void
}

export function ListNFTForm({ nftContract, tokenId, onSuccess }: ListNFTFormProps) {
  const { address } = useAccount()
  const [price, setPrice] = useState('')
  const [isApproved, setIsApproved] = useState(false)
  const [isCheckingApproval, setIsCheckingApproval] = useState(false)
  const { listNFT, hash, isPending, isConfirming, isSuccess, error } = useListNFT()
  
  const { writeContract: approveContract } = useWriteContract()
  const { isLoading: isApproving } = useWaitForTransactionReceipt({
    hash: hash,
  })

  // Check if marketplace is approved
  const { data: approved, refetch: refetchApproval } = useReadContract({
    address: nftContract,
    abi: NFT_COLLECTION_ABI,
    functionName: 'isApprovedForAll',
    args: address ? [address, CONTRACT_ADDRESSES.NFT_MARKETPLACE as `0x${string}`] : undefined,
    query: {
      enabled: !!address && !!CONTRACT_ADDRESSES.NFT_MARKETPLACE,
    },
  })

  useEffect(() => {
    if (address) {
      setIsCheckingApproval(true)
      refetchApproval().then(() => {
        setIsApproved(approved === true)
        setIsCheckingApproval(false)
      })
    }
  }, [address, approved, refetchApproval])

  const handleApprove = async () => {
    if (!CONTRACT_ADDRESSES.NFT_MARKETPLACE) return
    
    try {
      await approveContract({
        address: nftContract,
        abi: NFT_COLLECTION_ABI,
        functionName: 'setApprovalForAll',
        args: [CONTRACT_ADDRESSES.NFT_MARKETPLACE as `0x${string}`, true],
      })
      // Refetch approval status after a delay
      setTimeout(() => {
        refetchApproval()
      }, 2000)
    } catch (err) {
      console.error('Approval failed:', err)
    }
  }

  const handleList = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!price || parseFloat(price) <= 0) {
      return
    }

    try {
      await listNFT(nftContract, tokenId, price)
    } catch (err) {
      console.error('Listing failed:', err)
    }
  }

  useEffect(() => {
    if (isSuccess && onSuccess) {
      onSuccess()
    }
  }, [isSuccess, onSuccess])

  if (isCheckingApproval) {
    return <div className="text-sm text-gray-600">Checking approval...</div>
  }

  if (!isApproved) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-gray-600">
          You need to approve the marketplace to list this NFT.
        </p>
        <button
          onClick={handleApprove}
          disabled={isApproving}
          className="px-4 py-2 bg-[#1769AA] text-white rounded-lg hover:bg-[#1976D2] disabled:opacity-50"
        >
          {isApproving ? 'Approving...' : 'Approve Marketplace'}
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleList} className="space-y-3">
      <div>
        <label className="block text-sm font-medium mb-1">Price (ETH)</label>
        <input
          type="number"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          step="0.0001"
          min="0"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#123F74] focus:border-transparent"
          placeholder="0.1"
          required
        />
      </div>
      
      {error && (
        <div className="bg-red-50 p-2 rounded text-sm text-red-800">
          {error.message}
        </div>
      )}
      
      {(isPending || isConfirming) && (
        <div className="bg-blue-50 p-2 rounded text-sm text-blue-800">
          {isPending ? 'Creating listing...' : 'Waiting for confirmation...'}
        </div>
      )}
      
      {isSuccess && (
        <div className="bg-green-50 p-2 rounded text-sm text-green-800">
          NFT listed successfully!
        </div>
      )}
      
      <button
        type="submit"
        disabled={isPending || isConfirming}
        className="w-full px-4 py-2 bg-[#1769AA] text-white rounded-lg hover:bg-[#1976D2] disabled:opacity-50"
      >
        {isPending || isConfirming ? 'Listing...' : 'List NFT'}
      </button>
    </form>
  )
}

interface MyNFTsProps {
  nftContract: `0x${string}`
}

export function MyNFTs({ nftContract }: MyNFTsProps) {
  const { address } = useAccount()
  const [selectedTokenId, setSelectedTokenId] = useState<bigint | null>(null)

  // In a real app, you'd fetch all tokens owned by the user
  // This is a simplified version
  const { data: totalSupply } = useReadContract({
    address: nftContract,
    abi: NFT_COLLECTION_ABI,
    functionName: 'totalSupply',
  })

  // Check ownership for each token (simplified - in production, use events or indexer)
  const tokens: bigint[] = []
  if (totalSupply && address) {
    for (let i = 0; i < Number(totalSupply); i++) {
      tokens.push(BigInt(i))
    }
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold">Your NFTs</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {tokens.map((tokenId) => (
          <TokenCard
            key={tokenId.toString()}
            nftContract={nftContract}
            tokenId={tokenId}
            onSelect={() => setSelectedTokenId(tokenId)}
          />
        ))}
      </div>
      
      {selectedTokenId !== null && (
        <div className="mt-6 p-4 bg-white rounded-lg shadow">
          <h4 className="font-bold mb-4">List NFT #{selectedTokenId.toString()}</h4>
          <ListNFTForm
            nftContract={nftContract}
            tokenId={selectedTokenId}
            onSuccess={() => setSelectedTokenId(null)}
          />
        </div>
      )}
    </div>
  )
}

function TokenCard({
  nftContract,
  tokenId,
  onSelect,
}: {
  nftContract: `0x${string}`
  tokenId: bigint
  onSelect: () => void
}) {
  const { address } = useAccount()
  const { data: owner } = useReadContract({
    address: nftContract,
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

