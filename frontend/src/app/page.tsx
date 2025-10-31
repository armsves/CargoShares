'use client'

import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
import { useCreationFee, useCollectionsCount, useCollection, useCreateCollection, useNFTCollection } from '@/hooks/useContracts'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { Marketplace } from '@/components/MarketplaceListings'
import { ListMarketplaceNFTs } from '@/components/ListMarketplaceNFTs'
import { SetupMarketplace } from '@/components/SetupMarketplace'

type Tab = 'home' | 'marketplace' | 'collections' | 'create' | 'setup'

export default function MainApp() {
  const { isConnected } = useAccount()
  const [activeTab, setActiveTab] = useState<Tab>('home')
  
  // Collection creation form state
  const [name, setName] = useState('')
  const [symbol, setSymbol] = useState('')
  const [baseURI, setBaseURI] = useState('')
  const [mintCount, setMintCount] = useState('100')
  const [createError, setCreateError] = useState<string | null>(null)
  
  const { fee } = useCreationFee()
  const { count, refetch: refetchCount } = useCollectionsCount()
  const { createCollection, hash, isPending, isConfirming, isSuccess } = useCreateCollection()

  // Watch for CollectionCreated events
  useEffect(() => {
    if (isSuccess) {
      refetchCount()
      setName('')
      setSymbol('')
      setBaseURI('')
      setMintCount('100')
      setCreateError(null)
    }
  }, [isSuccess, refetchCount])

  const handleCreateCollection = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreateError(null)

    if (!name.trim() || !symbol.trim()) {
      setCreateError('Name and symbol are required')
      return
    }

    const mintCountNum = parseInt(mintCount) || 0
    if (mintCountNum <= 0) {
      setCreateError('Mint count must be greater than 0')
      return
    }

    try {
      await createCollection(name.trim(), symbol.trim(), baseURI.trim(), mintCountNum)
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create collection'
      setCreateError(errorMessage)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F6F0]">
      <Header />
      
      <main className="flex-1 pt-[72px]">
        {/* Hero Section */}
        {activeTab === 'home' && (
          <section className="relative bg-gradient-to-b from-[#1E3A8A] to-[#0A2463] text-white min-h-[80vh] flex items-center justify-center overflow-hidden">
            <div className="max-w-[1280px] mx-auto px-6 md:px-12 py-12 md:py-20 relative z-10 w-full">
              <div className="text-center flex flex-col items-center justify-center">
                <h1 className="text-4xl md:text-5xl lg:text-[56px] font-bold mb-4 md:mb-6 leading-tight max-w-4xl">
                  Own Cargo Ships, Earn Monthly Yields
                </h1>
                <p className="text-base md:text-lg lg:text-xl text-white/90 max-w-3xl mx-auto mb-8 md:mb-12 leading-relaxed">
                  Fractionalize ownership of cargo ships through NFTs. Own a piece of maritime history and earn passive income from shipping operations.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12 md:mb-20">
                  <button
                    onClick={() => setActiveTab('marketplace')}
                    className="px-6 md:px-8 h-12 bg-[#D4AF37] text-[#0A2463] font-semibold rounded-lg hover:bg-[#D4AF37]/90 transition-all duration-300 transform hover:scale-105 shadow-lg"
                  >
                    Explore Ships
                  </button>
                  <button
                    onClick={() => setActiveTab('marketplace')}
                    className="px-6 md:px-8 h-12 bg-transparent border-2 border-white text-white font-semibold rounded-lg hover:bg-white/10 transition-all duration-300"
                  >
                    Learn More
                  </button>
                </div>

                {/* Statistics Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 w-full max-w-4xl mx-auto mt-8">
                  <div className="bg-[rgba(255,255,255,0.10)] backdrop-blur-sm rounded-lg p-4 md:p-6 border border-[rgba(255,255,255,0.20)]">
                    <div className="text-3xl md:text-4xl lg:text-[48px] font-bold text-[#D4AF37] mb-2">{count || 0}</div>
                    <div className="text-white text-sm md:text-base">Total Ships</div>
                  </div>
                  <div className="bg-[rgba(255,255,255,0.10)] backdrop-blur-sm rounded-lg p-4 md:p-6 border border-[rgba(255,255,255,0.20)]">
                    <div className="text-3xl md:text-4xl lg:text-[48px] font-bold text-[#D4AF37] mb-2">-</div>
                    <div className="text-white text-sm md:text-base">Active Investors</div>
                  </div>
                  <div className="bg-[rgba(255,255,255,0.10)] backdrop-blur-sm rounded-lg p-4 md:p-6 border border-[rgba(255,255,255,0.20)]">
                    <div className="text-3xl md:text-4xl lg:text-[48px] font-bold text-[#D4AF37] mb-2">-</div>
                    <div className="text-white text-sm md:text-base">Monthly Yield</div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        <div className="max-w-[1280px] mx-auto px-6 md:px-12 py-8 md:py-20">
          {/* Tabs - Only show when not on home */}
          {activeTab !== 'home' && (
            <div className="mb-6 border-b border-[#E5E7EB]">
              <div className="flex gap-4 overflow-x-auto">
                <button
                  onClick={() => setActiveTab('home')}
                  className="px-4 py-2 font-medium whitespace-nowrap text-[#6B7280] hover:text-[#0A2463]"
                >
                  Home
                </button>
                <button
                  onClick={() => setActiveTab('marketplace')}
                  className={`px-4 py-2 font-medium whitespace-nowrap ${
                    activeTab === 'marketplace'
                      ? 'border-b-2 border-[#0A2463] text-[#0A2463]'
                      : 'text-[#6B7280] hover:text-[#0A2463]'
                  }`}
                >
                  Marketplace
                </button>
                <button
                  onClick={() => setActiveTab('collections')}
                  className={`px-4 py-2 font-medium whitespace-nowrap ${
                    activeTab === 'collections'
                      ? 'border-b-2 border-[#0A2463] text-[#0A2463]'
                      : 'text-[#6B7280] hover:text-[#0A2463]'
                  }`}
                >
                  Collections ({count})
                </button>
                <button
                  onClick={() => setActiveTab('create')}
                  className={`px-4 py-2 font-medium whitespace-nowrap ${
                    activeTab === 'create'
                      ? 'border-b-2 border-[#0A2463] text-[#0A2463]'
                      : 'text-[#6B7280] hover:text-[#0A2463]'
                  }`}
                >
                  Create Collection
                </button>
                <button
                  onClick={() => setActiveTab('setup')}
                  className={`px-4 py-2 font-medium whitespace-nowrap ${
                    activeTab === 'setup'
                      ? 'border-b-2 border-[#0A2463] text-[#0A2463]'
                      : 'text-[#6B7280] hover:text-[#0A2463]'
                  }`}
                >
                  Setup
                </button>
              </div>
            </div>
          )}

          {/* Tab Content */}
          {activeTab === 'home' && (
            <>
              {/* Featured Ships Grid */}
              <section className="py-12 md:py-20">
                <h2 className="text-2xl md:text-3xl font-bold text-[#0A2463] mb-8 md:mb-12 text-center">Featured Ships</h2>
                {count > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {Array.from({ length: Math.min(count || 0, 6) }).map((_, index) => (
                      <FeaturedShipCard 
                        key={index} 
                        index={index} 
                        onNavigateToMarketplace={() => setActiveTab('marketplace')}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 pt-24">
                    <div className="bg-[#F8F6F0] p-6 md:p-8 rounded-lg border border-[#E5E7EB] max-w-md mx-auto">
                      <p className="text-base md:text-lg text-[#6B7280] mb-6">No ships available yet</p>
                      <button
                        onClick={() => setActiveTab('create')}
                        className="px-6 py-3 bg-[#1E3A8A] text-white rounded-lg hover:bg-[#0A2463] transition-all duration-300 font-semibold"
                      >
                        Create Your First Ship
                      </button>
                    </div>
                  </div>
                )}
              </section>

              {/* How It Works Section */}
              <section className="py-12 md:py-20 border-t border-[#E5E7EB]">
                <h2 className="text-2xl md:text-3xl font-bold text-[#0A2463] mb-8 md:mb-12 text-center">How It Works</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="bg-[#F8F6F0] p-6 rounded-lg border border-[#E5E7EB] hover:border-[#3B82F6] hover:shadow-lg transition-all duration-300 flex flex-col h-full">
                    <div className="w-16 h-16 bg-[#D4AF37] rounded-full flex items-center justify-center mb-4 mx-auto">
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                    </div>
                    <h3 className="text-lg md:text-xl font-bold text-[#0A2463] mb-2 text-center">1. Browse Ships</h3>
                    <p className="text-[#1F2937] text-sm md:text-base leading-relaxed text-center">Explore our marketplace of fractionalized cargo ships available as NFTs.</p>
                  </div>
                  <div className="bg-[#F8F6F0] p-6 rounded-lg border border-[#E5E7EB] hover:border-[#3B82F6] hover:shadow-lg transition-all duration-300 flex flex-col h-full">
                    <div className="w-16 h-16 bg-[#D4AF37] rounded-full flex items-center justify-center mb-4 mx-auto">
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <h3 className="text-lg md:text-xl font-bold text-[#0A2463] mb-2 text-center">2. Purchase NFTs</h3>
                    <p className="text-[#1F2937] text-sm md:text-base leading-relaxed text-center">Buy fractional ownership shares represented as NFTs on the blockchain.</p>
                  </div>
                  <div className="bg-[#F8F6F0] p-6 rounded-lg border border-[#E5E7EB] hover:border-[#3B82F6] hover:shadow-lg transition-all duration-300 flex flex-col h-full">
                    <div className="w-16 h-16 bg-[#D4AF37] rounded-full flex items-center justify-center mb-4 mx-auto">
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <h3 className="text-lg md:text-xl font-bold text-[#0A2463] mb-2 text-center">3. Earn Yields</h3>
                    <p className="text-[#1F2937] text-sm md:text-base leading-relaxed text-center">Receive monthly distributions from shipping operations based on your ownership percentage.</p>
                  </div>
                  <div className="bg-[#F8F6F0] p-6 rounded-lg border border-[#E5E7EB] hover:border-[#3B82F6] hover:shadow-lg transition-all duration-300 flex flex-col h-full">
                    <div className="w-16 h-16 bg-[#D4AF37] rounded-full flex items-center justify-center mb-4 mx-auto">
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    </div>
                    <h3 className="text-lg md:text-xl font-bold text-[#0A2463] mb-2 text-center">4. Trade Anytime</h3>
                    <p className="text-[#1F2937] text-sm md:text-base leading-relaxed text-center">Sell your NFT shares on the marketplace whenever you want liquidity.</p>
                  </div>
                </div>
              </section>
            </>
          )}

          {activeTab === 'marketplace' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold mb-4 text-[#0A2463]">Marketplace</h2>
                <p className="text-[#6B7280] mb-6">Browse and purchase NFTs from the marketplace.</p>
              </div>
              <Marketplace />
              
              <div className="mt-8">
                <h3 className="text-xl font-bold mb-4 text-[#0A2463]">List Marketplace NFTs</h3>
                <p className="text-sm text-[#6B7280] mb-4">
                  NFTs minted to the marketplace when collections are created need to be listed for sale.
                </p>
                <ListMarketplaceNFTs />
              </div>
            </div>
          )}

          {activeTab === 'collections' && (
            <div>
              <h2 className="text-2xl font-bold mb-4 text-[#0A2463]">Collections</h2>
              <p className="text-[#6B7280] mb-6">Total Collections: {count}</p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: count }).map((_, index) => (
                  <CollectionCard key={index} index={index} />
                ))}
              </div>
            </div>
          )}

          {activeTab === 'create' && (
            <div className="max-w-2xl mx-auto py-4">
              <h2 className="text-2xl font-bold py-4 mb-4 text-[#0A2463]">Create Collection</h2>
              <form onSubmit={handleCreateCollection} className="bg-[#F8F6F0] p-6 rounded-lg shadow space-y-4 border border-[#E5E7EB]">
                <div>
                  <label className="block text-sm font-medium mb-2">Collection Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg focus:ring-2 focus:ring-[#0A2463] focus:border-transparent bg-white"
                    placeholder="e.g., SS Atlantis"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Symbol</label>
                  <input
                    type="text"
                    value={symbol}
                    onChange={(e) => setSymbol(e.target.value)}
                    className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg focus:ring-2 focus:ring-[#0A2463] focus:border-transparent bg-white"
                    placeholder="e.g., ATL"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Base URI</label>
                  <input
                    type="text"
                    value={baseURI}
                    onChange={(e) => setBaseURI(e.target.value)}
                    className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg focus:ring-2 focus:ring-[#0A2463] focus:border-transparent bg-white"
                    placeholder="https://example.com/metadata/"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Number of NFTs to Mint</label>
                  <input
                    type="number"
                    value={mintCount}
                    onChange={(e) => setMintCount(e.target.value)}
                    className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg focus:ring-2 focus:ring-[#0A2463] focus:border-transparent bg-white"
                    placeholder="100"
                    min="1"
                    required
                  />
                  <p className="text-sm text-[#6B7280] mt-1">
                    NFTs will be minted directly to the marketplace for sale
                  </p>
                </div>
                
                {fee && parseFloat(fee) > 0 && (
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <p className="text-sm text-blue-800">
                      Creation Fee: {fee} ETH
                    </p>
                  </div>
                )}
                
                {createError && (
                  <div className="bg-red-50 p-3 rounded-lg">
                    <p className="text-sm text-red-800">{createError}</p>
                    {createError.includes('Marketplace not set') && (
                      <p className="text-xs text-red-600 mt-2">
                        Go to the Setup tab to configure the marketplace address first.
                      </p>
                    )}
                  </div>
                )}
                
                {(isPending || isConfirming) && (
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <p className="text-sm text-blue-800">
                      {isPending ? 'Creating collection...' : 'Waiting for confirmation...'}
                    </p>
                  </div>
                )}
                
                {isSuccess && (
                  <div className="bg-green-50 p-3 rounded-lg">
                    <p className="text-sm text-green-800">
                      Collection created successfully! Transaction: {hash}
                    </p>
                  </div>
                )}
                
                <button
                  type="submit"
                  disabled={!isConnected || isPending || isConfirming}
                  className="w-full px-4 py-3 bg-[#1E3A8A] text-white rounded-lg hover:bg-[#0A2463] disabled:opacity-50 disabled:cursor-not-allowed transition font-semibold"
                >
                  {!isConnected ? 'Connect Wallet' : isPending || isConfirming ? 'Creating...' : 'Create Collection'}
                </button>
              </form>
            </div>
          )}

          {activeTab === 'setup' && (
            <div>
              <SetupMarketplace />
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  )
}

function FeaturedShipCard({ index, onNavigateToMarketplace }: { index: number; onNavigateToMarketplace: () => void }) {
  const { collection, isLoading } = useCollection(index)
  const { totalSupply } = useNFTCollection(
    collection?.collectionAddress ? collection.collectionAddress : undefined
  )

  if (isLoading || !collection) {
    return (
      <div className="bg-[#F8F6F0] p-6 rounded-lg border border-[#E5E7EB] animate-pulse">
        <div className="h-48 bg-[#E5E7EB] rounded-lg mb-4"></div>
        <div className="h-4 bg-[#E5E7EB] rounded w-3/4 mb-2"></div>
        <div className="h-4 bg-[#E5E7EB] rounded w-1/2"></div>
      </div>
    )
  }

  return (
    <div className="bg-[#F8F6F0] p-4 md:p-6 rounded-lg border border-[#E5E7EB] hover:border-[#3B82F6] hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
      <div className="h-40 md:h-48 bg-gradient-to-br from-[#1E3A8A] to-[#0A2463] rounded-lg mb-4 flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-[#0A2463]/80 to-transparent"></div>
        <svg className="w-20 h-20 md:w-24 md:h-24 text-white/30 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      </div>
      <h3 className="font-bold text-lg md:text-xl lg:text-2xl text-[#0A2463] mb-2 md:mb-3">{collection.name}</h3>
      <p className="text-xs md:text-sm text-[#6B7280] mb-3 md:mb-4">Symbol: {collection.symbol}</p>
      {totalSupply !== undefined && (
        <p className="text-xs md:text-sm text-[#6B7280] mb-3 md:mb-4">Total Supply: {totalSupply}</p>
      )}
      <button
        onClick={onNavigateToMarketplace}
        className="w-full px-4 py-2 bg-[#0A2463] text-white rounded-lg hover:bg-[#1E3A8A] transition-all duration-300 font-medium"
      >
        View Marketplace
      </button>
    </div>
  )
}

function CollectionCard({ index }: { index: number }) {
  const { collection, isLoading } = useCollection(index)
  // Only fetch NFT collection details when collection address is available AND user expands
  // Use lazy loading to avoid unnecessary calls
  const [showDetails, setShowDetails] = useState(false)
  const { name, symbol, totalSupply } = useNFTCollection(
    showDetails && collection?.collectionAddress ? collection.collectionAddress : undefined
  )

  if (isLoading || !collection) {
    return (
      <div className="bg-[#F8F6F0] p-6 rounded-lg border border-[#E5E7EB]">
        <div className="animate-pulse">
          <div className="h-4 bg-[#E5E7EB] rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-[#E5E7EB] rounded w-1/2"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-[#F8F6F0] p-6 rounded-lg border border-[#E5E7EB] hover:border-[#3B82F6] transition-all hover:shadow-lg">
      <h3 className="font-bold text-lg mb-2 text-[#0A2463]">{collection.name}</h3>
      <p className="text-sm text-[#6B7280] mb-2">Symbol: {collection.symbol}</p>
      {showDetails && (
        <>
          <p className="text-sm text-[#6B7280] mb-2">
            Total Supply: {totalSupply !== undefined ? totalSupply : 'Loading...'}
          </p>
          <p className="text-sm text-[#6B7280] mb-2">
            Name: {name || collection.name}
          </p>
          <p className="text-sm text-[#6B7280] mb-2">
            Symbol: {symbol || collection.symbol}
          </p>
        </>
      )}
      <p className="text-xs text-[#6B7280] break-all mb-2">
        Address: {collection.collectionAddress}
      </p>
      <button
        onClick={() => setShowDetails(!showDetails)}
        className="text-xs text-[#1E3A8A] hover:text-[#0A2463] hover:underline font-medium"
      >
        {showDetails ? 'Hide Details' : 'Show Details'}
      </button>
    </div>
  )
}
