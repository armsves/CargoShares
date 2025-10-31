'use client'

import { useState } from 'react'
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { CONTRACT_ADDRESSES, NFT_COLLECTION_FACTORY_ABI, NFT_MARKETPLACE_ABI } from '@/config/contracts'
import { formatEther } from 'viem'

export function SetupMarketplace() {
  const { address, isConnected } = useAccount()
  const [isSetting, setIsSetting] = useState(false)
  
  const marketplaceAddress = CONTRACT_ADDRESSES.NFT_MARKETPLACE
  const factoryAddress = CONTRACT_ADDRESSES.NFT_COLLECTION_FACTORY
  
  // Check current marketplace address
  const { data: currentMarketplace, refetch: refetchMarketplace } = useReadContract({
    address: CONTRACT_ADDRESSES.NFT_COLLECTION_FACTORY as `0x${string}`,
    abi: NFT_COLLECTION_FACTORY_ABI,
    functionName: 'marketplaceAddress',
  })

  // Check default listing price
  const { data: defaultListingPrice } = useReadContract({
    address: CONTRACT_ADDRESSES.NFT_COLLECTION_FACTORY as `0x${string}`,
    abi: NFT_COLLECTION_FACTORY_ABI,
    functionName: 'defaultListingPrice',
  })

  // Check if factory is authorized as lister
  const { data: isAuthorized } = useReadContract({
    address: CONTRACT_ADDRESSES.NFT_MARKETPLACE as `0x${string}`,
    abi: NFT_MARKETPLACE_ABI,
    functionName: 'authorizedListers',
    args: [CONTRACT_ADDRESSES.NFT_COLLECTION_FACTORY as `0x${string}`],
  })

  // Check marketplace owner
  const { data: marketplaceOwner } = useReadContract({
    address: CONTRACT_ADDRESSES.NFT_MARKETPLACE as `0x${string}`,
    abi: NFT_MARKETPLACE_ABI,
    functionName: 'owner',
  })

  const { writeContract, data: hash, isPending, error } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  const handleSetMarketplace = async () => {
    if (!isConnected || !address) {
      alert('Please connect your wallet')
      return
    }

    try {
      setIsSetting(true)
      await writeContract({
        address: CONTRACT_ADDRESSES.NFT_COLLECTION_FACTORY,
        abi: NFT_COLLECTION_FACTORY_ABI,
        functionName: 'setMarketplaceAddress',
        args: [marketplaceAddress],
      })
    } catch (err: any) {
      console.error('Failed to set marketplace:', err)
      alert(`Failed: ${err.message || 'Unknown error'}`)
    } finally {
      setIsSetting(false)
    }
  }

  // Check if marketplace is already set
  const isAlreadySet = currentMarketplace && 
    currentMarketplace.toLowerCase() === marketplaceAddress.toLowerCase()

  if (isSuccess) {
    refetchMarketplace()
  }

  const handleAuthorizeFactory = async () => {
    if (!isConnected || !address) {
      alert('Please connect your wallet')
      return
    }

    if (marketplaceOwner?.toLowerCase() !== address.toLowerCase()) {
      alert('Only the marketplace owner can authorize the factory')
      return
    }

    try {
      setIsSetting(true)
      await writeContract({
        address: CONTRACT_ADDRESSES.NFT_MARKETPLACE as `0x${string}`,
        abi: NFT_MARKETPLACE_ABI,
        functionName: 'setAuthorizedLister',
        args: [factoryAddress as `0x${string}`, true],
      })
    } catch (err: any) {
      console.error('Failed to authorize factory:', err)
      alert(`Failed: ${err.message || 'Unknown error'}`)
    } finally {
      setIsSetting(false)
    }
  }

  const isMarketplaceOwner = marketplaceOwner && address && 
    marketplaceOwner.toLowerCase() === address.toLowerCase()

  return (
    <div className="bg-white p-6 rounded-lg shadow max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-4 text-[#123F74]">Factory Setup</h2>
      <p className="text-sm text-gray-600 mb-6">
        Configure the factory to automatically list NFTs when collections are created.
      </p>
      
      <div className="space-y-6">
        {/* Status Overview */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-bold mb-3">Auto-Listing Configuration Status</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Marketplace Address Set:</span>
              <span className={isAlreadySet ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>
                {isAlreadySet ? '✓ Yes' : '✗ No'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Factory Authorized:</span>
              <span className={isAuthorized ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>
                {isAuthorized ? '✓ Yes' : '✗ No'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Default Listing Price:</span>
              <span className={defaultListingPrice && Number(defaultListingPrice) > 0 ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>
                {defaultListingPrice ? `${formatEther(defaultListingPrice as bigint)} ETH` : '✗ Not Set'}
              </span>
            </div>
          </div>
          
          {isAlreadySet && isAuthorized && defaultListingPrice && Number(defaultListingPrice) > 0 && (
            <div className="mt-4 bg-green-50 p-3 rounded">
              <p className="text-sm text-green-800 font-bold">
                ✅ Auto-listing is properly configured! New collections will automatically list NFTs at {formatEther(defaultListingPrice as bigint)} ETH each.
              </p>
            </div>
          )}
          
          {(!isAlreadySet || !isAuthorized || !defaultListingPrice || Number(defaultListingPrice) === 0) && (
            <div className="mt-4 bg-yellow-50 p-3 rounded">
              <p className="text-sm text-yellow-800">
                ⚠️ Auto-listing is not fully configured. Please complete the setup below.
              </p>
            </div>
          )}
        </div>

        {/* Addresses */}
        <div>
          <p className="text-sm text-gray-600 mb-2">
            <strong>Factory Address:</strong> {CONTRACT_ADDRESSES.NFT_COLLECTION_FACTORY}
          </p>
          <p className="text-sm text-gray-600 mb-2">
            <strong>Marketplace Address:</strong> {marketplaceAddress}
          </p>
        </div>

        {!isConnected && (
          <div className="bg-yellow-50 p-4 rounded-lg">
            <p className="text-sm text-yellow-800">
              Please connect your wallet to configure the factory.
            </p>
          </div>
        )}

        {/* Step 1: Set Marketplace Address */}
        <div className="border-t pt-4">
          <h3 className="font-bold mb-2">Step 1: Set Marketplace Address</h3>
          {isAlreadySet ? (
            <div className="bg-green-50 p-3 rounded-lg">
              <p className="text-sm text-green-800">✅ Marketplace address is already set correctly!</p>
            </div>
          ) : (
            <>
              {error && error.message?.includes('setMarketplaceAddress') && (
                <div className="bg-red-50 p-3 rounded-lg mb-2">
                  <p className="text-sm text-red-800">Error: {error.message}</p>
                  {error.message?.includes('Ownable') && (
                    <p className="text-xs text-red-600 mt-1">Only the factory owner can set the marketplace address.</p>
                  )}
                </div>
              )}
              <button
                onClick={handleSetMarketplace}
                disabled={!isConnected || isPending || isConfirming || isAlreadySet}
                className="w-full px-4 py-2 bg-[#1769AA] text-white rounded-lg hover:bg-[#1976D2] disabled:opacity-50 disabled:cursor-not-allowed transition text-sm"
              >
                {!isConnected ? 'Connect Wallet' : isPending || isConfirming ? 'Setting...' : 'Set Marketplace Address'}
              </button>
            </>
          )}
        </div>

        {/* Step 2: Authorize Factory */}
        <div className="border-t pt-4">
          <h3 className="font-bold mb-2">Step 2: Authorize Factory as Lister</h3>
          {isAuthorized ? (
            <div className="bg-green-50 p-3 rounded-lg">
              <p className="text-sm text-green-800">✅ Factory is authorized to list NFTs!</p>
            </div>
          ) : (
            <>
              {!isMarketplaceOwner && isConnected && (
                <div className="bg-orange-50 p-3 rounded-lg mb-2">
                  <p className="text-sm text-orange-800">
                    ⚠️ Only the marketplace owner can authorize the factory.
                    {marketplaceOwner && ` Marketplace owner: ${marketplaceOwner.slice(0, 10)}...`}
                  </p>
                </div>
              )}
              {error && error.message?.includes('setAuthorizedLister') && (
                <div className="bg-red-50 p-3 rounded-lg mb-2">
                  <p className="text-sm text-red-800">Error: {error.message}</p>
                </div>
              )}
              <button
                onClick={handleAuthorizeFactory}
                disabled={!isConnected || !isMarketplaceOwner || isPending || isConfirming || isAuthorized}
                className="w-full px-4 py-2 bg-[#1769AA] text-white rounded-lg hover:bg-[#1976D2] disabled:opacity-50 disabled:cursor-not-allowed transition text-sm"
              >
                {!isConnected ? 'Connect Wallet' : !isMarketplaceOwner ? 'Not Marketplace Owner' : isPending || isConfirming ? 'Authorizing...' : 'Authorize Factory'}
              </button>
            </>
          )}
        </div>

        {/* Transaction Status */}
        {(isPending || isConfirming) && (
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-blue-800">
              {isPending ? 'Waiting for transaction...' : 'Confirming transaction...'}
            </p>
            {hash && (
              <p className="text-xs text-blue-600 mt-1">
                Hash: {hash}
              </p>
            )}
          </div>
        )}

        {isSuccess && (
          <div className="bg-green-50 p-4 rounded-lg">
            <p className="text-sm text-green-800">
              ✅ Transaction successful! Please refresh the page to see updated status.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

