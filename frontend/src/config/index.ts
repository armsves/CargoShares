import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { mainnet, arbitrum } from '@reown/appkit/networks'
import type { AppKitNetwork } from '@reown/appkit/networks'
import { defineChain } from 'viem'

// Custom Hedera Testnet chain definition
const hederaTestnet = defineChain({
  id: 296,
  name: 'Hedera Testnet',
  nativeCurrency: {
    name: 'HBAR',
    symbol: 'HBAR',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ['https://testnet.hashio.io/api'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Hashscan',
      url: 'https://hashscan.io/testnet',
    },
  },
})

// Custom Flow Testnet chain definition  
const flowTestnet = defineChain({
  id: 545,
  name: 'Flow Testnet',
  nativeCurrency: {
    name: 'FLOW',
    symbol: 'FLOW',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ['https://testnet.evm.nodes.onflow.org'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Flowscan',
      url: 'https://testnet.flowscan.org',
    },
  },
})

// Get projectId from https://dashboard.reown.com
export const projectId = process.env.NEXT_PUBLIC_PROJECT_ID || "b56e18d47c72ab683b10814fe9495694" // this is a public projectId only to use on localhost

if (!projectId) {
  throw new Error('Project ID is not defined')
}

// Include Hedera and Flow testnets in supported networks
export const networks = [hederaTestnet, flowTestnet, mainnet, arbitrum] as [AppKitNetwork, ...AppKitNetwork[]]

//Set up the Wagmi Adapter (Config) with retry settings for rate limiting
export const wagmiAdapter = new WagmiAdapter({
  ssr: true,
  projectId,
  networks,
  queryClientConfig: {
    defaultOptions: {
      queries: {
        retry: (failureCount, error: unknown) => {
          // Don't retry on 429 errors immediately - wait longer
          const errorObj = error as { status?: number; message?: string } | null
          if (errorObj?.status === 429 || errorObj?.message?.includes('429')) {
            return failureCount < 2 // Only retry twice for rate limits
          }
          return failureCount < 3
        },
        retryDelay: (attemptIndex, error: unknown) => {
          // Exponential backoff, longer delay for rate limits
          const errorObj = error as { status?: number; message?: string } | null
          if (errorObj?.status === 429 || errorObj?.message?.includes('429')) {
            return Math.min(1000 * 2 ** attemptIndex * 5, 30000) // 5s, 10s, 20s max
          }
          return Math.min(1000 * 2 ** attemptIndex, 30000)
        },
        staleTime: 60000, // Cache for 60 seconds (increased from 30s)
        gcTime: 600000, // Keep in cache for 10 minutes (increased from 5min)
      },
    },
  },
})

export const config = wagmiAdapter.wagmiConfig
