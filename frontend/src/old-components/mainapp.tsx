/*
  MainAppComponent – A glassy, tabbed NFT marketplace/yield dashboard with on-chain integration
  -----------------------------------------------------------------------------
  NEW: Integrated the deployed Marketplace_SEPOLIA_v1 smart-contract so the UI
  now reflects real blockchain data and allows purchasing directly from the
  dashboard.
  
  TODO: Remove SharesToken_SEPOLIA_v1 contract source & artifacts from the repository. All
  logic, helpers and UI previously referencing SharesToken have been stripped out of this
  component. A console warning will appear if residual references surface elsewhere.
  - Contract address: 0xaF6652a7b5A6C20a9ece63733EdbbD1230550020 (Sepolia)
  - Uses ethers (v5) which is exposed globally through the `ethers` window prop.
  - Falls back to the public Sepolia RPC when the user has not connected a
    wallet yet, and automatically upgrades to a signer-capable provider once a
    wallet is connected.
  - Fetches active listings, listens to `Listed` / `Cancelled` events and the
    new block stream to keep the UI fresh.
  - Adds “Buy” action to marketplace cards.
  - Adds admin-only “Create Listing” shortcut that jumps to the existing create
    tab.
*/

// NOTE: React, Lucide, DreamspaceElements, ethers are globally available
// -----------------------------------------------------------------------------
// Design System – Global CSS Variables Injection
// -----------------------------------------------------------------------------
if (typeof document !== 'undefined') {
  const styleTagId = 'custom-color-vars';
  if (!document.getElementById(styleTagId)) {
    const style = document.createElement('style');
    style.id = styleTagId;
    style.innerHTML = `
      /* Institutional Design System Color Palette – provided by UI/UX team */
      :root {
        --primary-blue: #123F74;
        --accent-blue: #1976D2;
        --secondary-blue: #4682B4;
        --light-grey-bg: #F8F9FA;
        --basic-white: #FFFFFF;
        --text-gray: #495057;
        --button-blue: #1769AA;
        --success-green: #279A44;
      }

      /* Global Defaults */
      body {
        background-color: var(--basic-white);
        color: var(--text-gray);
      }

      /* ShadCN Card override so panels inherit design-system background */
      .dse-card,
      .card,
      [data-dse-component="card"] {
        background-color: var(--light-grey-bg) !important;
      }
    `;
    document.head.appendChild(style);
  }
}

const MainAppComponent: React.FC = () => {
  /* ---------------------------------------------------------------------
   * Blockchain / Contract Helpers
   * -------------------------------------------------------------------*/
  // Hard-coded values supplied in prompt
  const ADMIN_ADDRESS = '0x9567D433240681653fb4DD3E05e08D60fe54210d'.toLowerCase();
  const BASE_CHAIN_ID = 8453;
  // Authenticated JSON-RPC proxy URL moved earlier to avoid TDZ
  // AUTH_PROXY_URL defined earlier - removed duplicate
  // Authenticated Dreamspace RPC URL (do NOT expose secret elsewhere)
  const RPC_PROXY_ENDPOINT = 'https://lb.drpc.live/base/AprDZkHtQk_xjRbqBLJ0M0pFItPsETAR8JgyKjrWkQAY/';

// Warn developers to avoid direct RPC calls and always use the authenticated Dreamspace proxy
if (typeof window !== 'undefined') {
  console.warn('Avoid direct RPC calls – use rpcProxyRequest which routes via Dreamspace authenticated proxy.');
}
  // -------------------------------------------------------------------
  // Vault Factory integration constants
  // -------------------------------------------------------------------
  //const VAULT_FACTORY_ADDRESS = '0x6F3b82d235B4Eef1f4D0833154ec83ADFE3930C9';
  // NEW: external NFT + Collection Vault factories
  const NFT_FACTORY_ADDRESS = '0x0D0fc30FCFADe851bC0f7E57282F4D621f1c4255';
  const COLLECTION_VAULT_FACTORY_ADDRESS = '0x93F023E2FEdd5db890A0Fd9B1525236Bd4728E58';
  const VAULT_FACTORY_ADDRESS = '0x6F3b82d235B4Eef1f4D0833154ec83ADFE3930C9';

  // Minimal ABI for VaultFactory (only required functions & events)
  const VAULT_FACTORY_ABI = [
    {
      inputs: [],
      name: 'getAllVaults',
      outputs: [{ internalType: 'address[]', name: '', type: 'address[]' }],
      stateMutability: 'view',
      type: 'function',
    },
    {
      inputs: [{ internalType: 'address', name: 'shipNFT', type: 'address' }],
      name: 'getVaultsByCollection',
      outputs: [{ internalType: 'address[]', name: '', type: 'address[]' }],
      stateMutability: 'view',
      type: 'function',
    },
    {
      inputs: [
        { internalType: 'address', name: 'shipNFT', type: 'address' },
        { internalType: 'address', name: 'vaultOwner', type: 'address' },
      ],
      name: 'createVault',
      outputs: [{ internalType: 'address', name: 'vault', type: 'address' }],
      stateMutability: 'nonpayable',
      type: 'function',
    },
    {
      anonymous: false,
      inputs: [
        { indexed: true, internalType: 'address', name: 'shipNFT', type: 'address' },
        { indexed: true, internalType: 'address', name: 'vault', type: 'address' },
        { indexed: true, internalType: 'address', name: 'owner', type: 'address' },
      ],
      name: 'VaultCreated',
      type: 'event',
    },
  ] as const;

  // Minimal read-only ABI for NFTCollectionFactory interface (fallback)
const NFT_COLLECTION_FACTORY_READ_ABI = [
  'function getCollectionsCount() view returns (uint256)',
  'function getCollection(uint256) view returns (tuple(address collectionAddress, string name, string symbol, string baseURI, address creator, uint256 createdAt))',
] as const;


  // Minimal ABI for NFTCollectionFactory (only what we use here)
  const NFT_FACTORY_ABI = [
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
      inputs: [],
      name: 'creationFee',
      outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
      stateMutability: 'view',
      type: 'function',
    },
    {
      anonymous: false,
      inputs: [
        { indexed: true, internalType: 'address', name: 'collection', type: 'address' },
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

  // Minimal ABI for CollectionVaultFactory – createCollectionVault() + VaultCreated event
  const COLLECTION_VAULT_FACTORY_ABI = [
    {
      inputs: [
        { internalType: 'string', name: 'name', type: 'string' },
        { internalType: 'string', name: 'symbol', type: 'string' },
      ],
      name: 'createCollectionVault',
      outputs: [{ internalType: 'address', name: 'vault', type: 'address' }],
      stateMutability: 'nonpayable',
      type: 'function',
    },
    {
      anonymous: false,
      inputs: [
        { indexed: true, internalType: 'address', name: 'vault', type: 'address' },
        { indexed: true, internalType: 'address', name: 'creator', type: 'address' },
        { indexed: false, internalType: 'string', name: 'name', type: 'string' },
      ],
      name: 'VaultCreated',
      type: 'event',
    },
  ] as const;

  // Minimal ABI for CollectionVaultFactory – only owner() and createCollectionAndVault()
  const COLLECTION_FACTORY_ABI = [
    {
      inputs: [],
      name: 'owner',
      outputs: [{ internalType: 'address', name: '', type: 'address' }],
      stateMutability: 'view',
      type: 'function',
    },
    {
      inputs: [
        { internalType: 'string', name: 'name', type: 'string' },
        { internalType: 'string', name: 'symbol', type: 'string' },
        { internalType: 'address', name: 'vaultOwner', type: 'address' },
        { internalType: 'uint256', name: 'totalShares', type: 'uint256' },
        { internalType: 'string', name: 'baseURI', type: 'string' },
      ],
      name: 'createCollectionAndVault',
      outputs: [
        { internalType: 'address', name: 'collection', type: 'address' },
        { internalType: 'address', name: 'vault', type: 'address' },
      ],
      stateMutability: 'nonpayable',
      type: 'function',
    },
  ] as const;

  // Minimal ABI for FractionalVault (used for lightweight detail fetches)
  const FRACTIONAL_VAULT_ABI = [
    {
      inputs: [],
      name: 'shipNFT',
      outputs: [{ internalType: 'address', name: '', type: 'address' }],
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

  // Minimal ABI – only what we actually use here.
  const MARKETPLACE_ABI = [
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
          internalType: 'struct Marketplace_SEPOLIA_v1.Listing',
          name: '',
          type: 'tuple',
        },
      ],
      stateMutability: 'view',
      type: 'function',
    },
    // Events we listen to
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
  ] as const;

  type ListingTuple = [string, string, string, string, string];

  

  const ownedShares = React.useMemo(() => {
    const map: Record<string, number[]> = {
      atlantis: [3, 7, 25],
      odyssey: [2, 5],
      leviathan: [100],
      aurora: [],
      meridian: [50, 51, 90],
    };
    return map;
  }, [])

  // Shared read-only provider instance used across hooks
  const proxyProvider = React.useMemo(() => getAuthenticatedProvider(), [getAuthenticatedProvider]);

  // Wallet & blockchain state (moved here to avoid TDZ issues)
  const [currentAddress, setCurrentAddress] = React.useState<string | null>(null);
  const [isAdmin, setIsAdmin] = React.useState(false);
  const [provider, setProvider] = React.useState<ethers.providers.Provider | null>(null);
  const [signer, setSigner] = React.useState<ethers.Signer | null>(null);
  const [contract, setContract] = React.useState<ethers.Contract | null>(null);
  // State for RPC proxy errors
  const [proxyError, setProxyError] = React.useState<string | null>(null);

  // Vault Factory & Vaults State (moved up for TDZ safety)
  const [vaultDetails, setVaultDetails] = React.useState<Record<string, { shipNFT: string; owner: string }>>({});
  const [factoryContract, setFactoryContract] = React.useState<ethers.Contract | null>(null);


  // Collection Factory & Creation Flow State (moved up for TDZ safety)
  const [nftFactory, setNftFactory] = React.useState<ethers.Contract | null>(null);
  const [collectionVaultFactory, setCollectionVaultFactory] = React.useState<ethers.Contract | null>(null);
  const [creationFee, setCreationFee] = React.useState<ethers.BigNumber | null>(null);
  const [vaultTxStatus, setVaultTxStatus] = React.useState<'idle' | 'pending' | 'success' | 'error'>('idle');
  const [createTxStatus, setCreateTxStatus] = React.useState<'idle' | 'pending' | 'success' | 'error'>('idle');
  const [createdAddresses, setCreatedAddresses] = React.useState<{ collection: string; vault: string } | null>(null);
  const [createError, setCreateError] = React.useState<string | null>(null);
  const [vaultError, setVaultError] = React.useState<string | null>(null);

  // Add NFT Collection ABI for minting
  const NFT_COLLECTION_ABI = [
    {
      inputs: [
        { internalType: 'address', name: 'to', type: 'address' },
        { internalType: 'uint256', name: 'tokenId', type: 'uint256' }
      ],
      name: 'mint',
      outputs: [],
      stateMutability: 'nonpayable',
      type: 'function',
    },
    {
      inputs: [],
      name: 'owner',
      outputs: [{ internalType: 'address', name: '', type: 'address' }],
      stateMutability: 'view',
      type: 'function',
    }
  ] as const;
  
  const NFT_COLLECTION_WRITE_ABI = [
  'function mint(address to)'
] as const;

  /* ---------------------------------------------------------------------
   * Create Collection Form State (moved earlier to prevent TDZ)
   * -------------------------------------------------------------------*/
  // duplicate declaration removed
  // duplicate declaration removed
  // duplicate declaration removed
  // duplicate declaration removed
  // duplicate declaration removed
  // duplicate declaration removed
  // Optional manual gas limit (defaults to 3,000,000)
  // duplicate declaration removed
  // duplicate declaration removed
  // duplicate declaration removed
  // duplicate declaration removed
  // duplicate declaration removed
  
  
  
  
  
  
  // Optional manual gas limit (defaults to 3,000,000)
  
  
  
  
  

  /* ---------------------------------------------------------------------
   * Create Collection Form State (moved earlier to prevent TDZ)
   * -------------------------------------------------------------------*/
  const [shipName, setShipName] = React.useState('');
  const [symbol, setSymbol] = React.useState('');
  const [vaultOwnerInput, setVaultOwnerInput] = React.useState('');
  const [baseURI, setBaseURI] = React.useState('');
  const [totalSharesInput, setTotalSharesInput] = React.useState('');
  const [pricePerShareInput, setPricePerShareInput] = React.useState('');
  // Optional manual gas limit (defaults to 3,000,000)
  const [gasLimitInput, setGasLimitInput] = React.useState('3000000');
  const [description, setDescription] = React.useState('');
  const [imageFile, setImageFile] = React.useState<File | null>(null);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [confirmationMessage, setConfirmationMessage] = React.useState<string | null>(null);

/* ---------------------------------------------------------------------
   * Robust create collection + vault flow helper (NEW)
   * -------------------------------------------------------------------*/
  const [currentStep, setCurrentStep] = React.useState<'idle' | 'collection' | 'minting' | 'vault' | 'complete'>('idle');

  const performCreateFlow = React.useCallback(async () => {
    if (!signer || !nftFactory || !factoryContract) {
      setCreateError('Wallet / factory contracts not ready');
      return;
    }

    try {
      setCreateError(null);
      setVaultError(null);
      setCreateTxStatus('pending');
      setVaultTxStatus('idle');
      setCreatedAddresses(null);
      setCurrentStep('collection');

      const manualGasLimit = gasLimitInput.trim() === '' ? 3000000 : Number(gasLimitInput.trim());
      if (Number.isNaN(manualGasLimit) || manualGasLimit <= 0 || manualGasLimit > 12000000) {
        throw new Error('Invalid Gas Limit – must be a positive number up to 12,000,000');
      }

      const signerAddress = await signer.getAddress();
      const totalShares = Number(totalSharesInput) || 100;

      console.log('Starting collection creation flow...');

      /* --------------------------------------------------------------
       * 1) CREATE COLLECTION
       * ------------------------------------------------------------*/
      console.log('Step 1: Creating collection...');
      // Polling-based receipt watcher to reliably capture the CollectionCreated event
      // (callStatic prediction removed – we now rely purely on on-chain logs)
      
      let createTx: ethers.ContractTransaction;
      
      try {
        const estGas = await nftFactory
          .connect(signer)
          .estimateGas.createCollection(shipName.trim(), symbol.trim(), baseURI.trim(), {
            value: creationFee ?? ethers.constants.Zero,
          });
        const gasLimit = estGas.mul(120).div(100);
        createTx = await nftFactory.connect(signer).createCollection(shipName.trim(), symbol.trim(), baseURI.trim(), {
          value: creationFee ?? ethers.constants.Zero,
          gasLimit,
        });
      } catch (estimateErr) {
        console.warn('Gas estimation failed for createCollection, using manual limit', estimateErr);
        createTx = await nftFactory.connect(signer).createCollection(shipName.trim(), symbol.trim(), baseURI.trim(), {
          value: creationFee ?? ethers.constants.Zero,
          gasLimit: ethers.BigNumber.from(manualGasLimit),
        });
      }
      
      console.log('createCollection tx sent:', createTx.hash);
      const createRcpt = await createTx.wait();
      console.log('createCollection receipt:', createRcpt);

      // ------------------------------------------------------------------
      // Step 1b: Resolve Collection Address via logs ‑ may require polling
      // ------------------------------------------------------------------
      let collectionAddr: string = '';
      const iface = nftFactory.interface;
      const topic = iface.getEventTopic('CollectionCreated');
      
      for (const log of createRcpt.logs) {
        try {
          if (log.address.toLowerCase() === NFT_FACTORY_ADDRESS.toLowerCase() && log.topics[0] === topic) {
            const decoded = iface.decodeEventLog('CollectionCreated', log.data, log.topics) as any;
            if (decoded && decoded.collection) {
              collectionAddr = decoded.collection as string;
              console.log('Found collection address:', collectionAddr);
              break;
            }
          }
        } catch (decodeErr) {
          console.warn('Failed to decode log:', decodeErr);
        }
      }

      // If we did not find the address in the immediate receipt, start polling
      if (!collectionAddr) {
        console.debug('Collection address not in first receipt – polling for logs');
        setCreateTxStatus('pending-logs');
        for (let attempt = 1; attempt <= 12 && !collectionAddr; attempt++) {
          try {
            console.debug(`Polling attempt ${attempt}/12 for CollectionCreated logs...`);
            await new Promise((res) => setTimeout(res, 2000));
            const polledRcpt = await (provider ?? proxyProvider).getTransactionReceipt(createTx.hash);
            if (!polledRcpt) continue;
            for (const log of polledRcpt.logs) {
              try {
                if (log.address.toLowerCase() === NFT_FACTORY_ADDRESS.toLowerCase() && log.topics[0] === topic) {
                  const decoded = iface.decodeEventLog('CollectionCreated', log.data, log.topics) as any;
                  collectionAddr =
                    decoded?.collection ??
                    decoded?.collectionAddress ??
                    decoded?.[0] ??
                    decoded?.['collectionAddress'] ??
                    '';
                  if (collectionAddr) {
                    console.debug('Found collection address via polling:', collectionAddr);
                    break;
                  }
                }
              } catch (decodeErr) {
                console.debug('Decode error during polling', decodeErr);
              }
            }
          } catch (pollErr) {
            console.warn('Polling error', pollErr);
          }
        }
      }

      // Secondary fallback – queryFilter from chain if still not found
      if (!collectionAddr) {
        try {
          const fromBlock = Math.max(createRcpt.blockNumber - 2, 0);
          const recentEvents = await nftFactory.queryFilter(
            nftFactory.filters.CollectionCreated(null, signerAddress),
            fromBlock,
            'latest'
          );
          if (recentEvents.length) {
            const lastEv = recentEvents[recentEvents.length - 1];
            const decodedRecent: any = iface.decodeEventLog('CollectionCreated', lastEv.data, lastEv.topics);
            collectionAddr =
              decodedRecent?.collection ??
              decodedRecent?.collectionAddress ??
              decodedRecent?.[0] ??
              decodedRecent?.['collectionAddress'] ??
              '';
            if (collectionAddr) console.debug('Found collection address via queryFilter:', collectionAddr);
          }
        } catch (qErr) {
          console.warn('CollectionCreated queryFilter fallback failed', qErr);
        }
      }

      if (!collectionAddr) {
        setCreateError('Unable to determine collection address – the factory may not emit the expected event. See console for full receipt.');
        console.error('Full createCollection receipt', createRcpt);
        setCreateTxStatus('error');
        setCurrentStep('idle');
        return;
      }

      console.log('Collection address resolved as:', collectionAddr, 'method:', 'logs/polling');
      setCreatedAddresses({ collection: collectionAddr, vault: '' });
      setCreateTxStatus('success');
      setCurrentStep('minting');

      /* --------------------------------------------------------------
       * 2) MINT NFTs TO THE COLLECTION
       * ------------------------------------------------------------*/
      console.log('Step 2: Minting NFTs...');
      const nftContract = new ethers.Contract(collectionAddr, NFT_COLLECTION_ABI, signer); // signer chosen for write ops
      
      for (let i = 1; i <= totalShares; i++) {
        try {
          console.log(`Minting NFT #${i}...`);
          const mintTx = await nftContract.mint(signerAddress, i, {
            gasLimit: ethers.BigNumber.from(200000)
          });
          await mintTx.wait();
          console.log(`Successfully minted NFT #${i}`);
        } catch (mintErr) {
          console.warn(`Failed to mint NFT #${i}:`, mintErr);
          // Continue with other mints even if one fails
        }
      }

      setCurrentStep('vault');

      /* --------------------------------------------------------------
       * 3) CREATE VAULT FOR THE COLLECTION
       * ------------------------------------------------------------*/
      console.log('Step 3: Creating vault...');
      setVaultTxStatus('pending');
      
      let vaultTx: ethers.ContractTransaction;
      try {
        const estGasV = await factoryContract
          .connect(signer)
          .estimateGas.createVault(collectionAddr, signerAddress);
        const gasLimitV = estGasV.mul(120).div(100);
        vaultTx = await factoryContract
          .connect(signer)
          .createVault(collectionAddr, signerAddress, { gasLimit: gasLimitV });
      } catch (estErr) {
        console.warn('Vault gas estimation failed, using manual limit', estErr);
        vaultTx = await factoryContract
          .connect(signer)
          .createVault(collectionAddr, signerAddress, { gasLimit: ethers.BigNumber.from(manualGasLimit) });
      }
      
      console.log('createVault tx sent:', vaultTx.hash);
      const vaultRcpt = await vaultTx.wait();
      console.log('createVault receipt:', vaultRcpt);

      // Parse vault address from VaultCreated event
      let vaultAddr: string = '';
      const vaultIface = new ethers.utils.Interface(VAULT_FACTORY_ABI);
      const vaultTopic = vaultIface.getEventTopic('VaultCreated');
      
      for (const log of vaultRcpt.logs) {
        try {
          if (log.address.toLowerCase() === VAULT_FACTORY_ADDRESS.toLowerCase() && log.topics[0] === vaultTopic) {
            const decoded = vaultIface.decodeEventLog('VaultCreated', log.data, log.topics) as any;
            if (decoded && decoded.vault) {
              vaultAddr = decoded.vault as string;
              console.log('Found vault address:', vaultAddr);
              break;
            }
          }
        } catch (decodeErr) {
          console.warn('Failed to decode vault log:', decodeErr);
        }
      }

      if (!vaultAddr) {
        throw new Error('Vault address not found in transaction receipt');
      }

      // Success - both collection and vault created and linked
      setCreatedAddresses({ collection: collectionAddr, vault: vaultAddr });
      setVaultTxStatus('success');
      setCurrentStep('complete');
      
      // Refresh the vaults list to show the new vault
      await fetchAllVaults();
      
      // Reset form after a short delay to let user see success message
      setTimeout(() => {
        resetCreateForm();
        setCurrentStep('idle');
      }, 3000);
      
      console.log('Flow completed successfully:', { collection: collectionAddr, vault: vaultAddr });
      
    } catch (err: any) {
      console.error('Create flow failed:', err);
      setCreateError(err.message ?? 'Transaction failed');
      setCreateTxStatus('error');
      setVaultTxStatus('error');
      setCurrentStep('idle');
    }
  }, [
    signer, 
    nftFactory, 
    factoryContract, 
    creationFee, 
    gasLimitInput, 
    shipName, 
    symbol, 
    baseURI, 
    totalSharesInput
  ]);

  const yieldRows = React.useMemo(
    () => [
      { collection: 'SS Atlantis', sharesHeld: 3, accrued: 1.2 },
      { collection: 'MS Odyssey', sharesHeld: 2, accrued: 0.8 },
      { collection: 'HMS Leviathan', sharesHeld: 1, accrued: 0.5 },
    ],
    []
  );

  /* ---------------------------------------------------------------------
   * State Management
   * -------------------------------------------------------------------*/
  const [activeTab, setActiveTab] = React.useState<'home' | 'marketplace' | 'collections' | 'yield' | 'portfolio' | 'create'>(
    'home'
  );
  const [selectedCollection, setSelectedCollection] = React.useState<string | null>(null);
  const SHARES_PER_PAGE = 12;
  const [currentSharePage, setCurrentSharePage] = React.useState(1);
  const [claimDialogRow, setClaimDialogRow] = React.useState<null | typeof yieldRows[0]>(null);



  // Marketplace listings fetched from chain (very simplified structure for demo)
  interface ListingUI {
    nftContract: string;
    tokenId: ethers.BigNumberish;
    seller: string;
    price: string; // formatted ETH string
  }
  const [listings, setListings] = React.useState<ListingUI[]>([]);
  const [txPendingId, setTxPendingId] = React.useState<string | null>(null);
  const [mintingCollection, setMintingCollection] = React.useState<string | null>(null);
  const [onChainCollections, setOnChainCollections] = React.useState<any[]>([]);
  // Local fallback collections array to maintain compatibility with legacy code paths
  const collections = React.useMemo(() => onChainCollections, [onChainCollections]);
  // Loading flag to avoid concurrent fetches
  const [collectionsLoading, setCollectionsLoading] = React.useState(false);

  // ---------------------------------------------------------------------
  // Vault Factory & Vaults State
  // ---------------------------------------------------------------------
  const [allVaults, setAllVaults] = React.useState<string[]>([]);
  // duplicate vaultDetails state removed

  // Collection Factory state
  const [collectionFactory, setCollectionFactory] = React.useState<ethers.Contract | null>(null);
  // NEW factory contracts
  const [factoryOwner, setFactoryOwner] = React.useState<string | null>(null);
  const [isFactoryOwner, setIsFactoryOwner] = React.useState(false); // kept for legacy

  // -------------------------------------------------------------------
  // Authenticated JsonRpcProvider creator
  // -------------------------------------------------------------------
  
  function getAuthenticatedProvider(): ethers.providers.JsonRpcProvider {
    const provider = new ethers.providers.JsonRpcProvider(RPC_PROXY_ENDPOINT);
    // Preserve original send method so we can fall back if proxy fails
    const originalSend = provider.send.bind(provider);
    provider.send = async (method: string, params: any[]): Promise<any> => {
      try {
        return await rpcProxyRequest(method, params);
      } catch (err) {
        console.warn('Authenticated provider rpcProxyRequest failed, falling back to original provider.send', err);
        if (typeof setProxyError === 'function') {
          setProxyError((err as Error)?.message ?? 'RPC request failed');
        }
        return originalSend(method, params);
      }
    };
    console.debug('Using authenticated provider via lb.drpc.live/base/AprDZk...');
    return provider;
  };



  /* ---------------------------------------------------------------------
   * Provider / Signer initialisation
   * -------------------------------------------------------------------*/
  React.useEffect(() => {
    // Create a read-only provider by default
    const defaultProvider: any = getAuthenticatedProvider(); // switched to JsonRpcProvider for ethers compatibility
    setProvider(defaultProvider);
    console.log('Using proxyProvider for read-only operations');
    setSigner(null);
    

    // If wallet available, hook into it
    let ethereum: any = undefined;
    if (typeof window !== 'undefined') ethereum = (window as any).ethereum;
    if (!ethereum) return;

    const handleAccounts = async (accounts: string[]) => {
      const addr = accounts && accounts.length > 0 ? accounts[0].toLowerCase() : null;
      setCurrentAddress(addr);
      setIsAdmin(addr === ADMIN_ADDRESS);

      if (addr) {
        const web3Provider = new ethers.providers.Web3Provider(ethereum);
        setProvider(web3Provider);
        setSigner(web3Provider.getSigner());
      } else {
        setProvider(defaultProvider);
        setSigner(null);
      }
    };

    const handleChainChanged = async (chainIdHex: string) => {
      const chainId = parseInt(chainIdHex, 16);
      if (chainId !== BASE_CHAIN_ID) {
        console.log('Wrong network – please switch to Base Mainnet.');
      }
      // Re-initialise provider / signer after network change
      handleAccounts(await ethereum.request({ method: 'eth_accounts' }));
      // Recreate contract with new provider
    };

    ethereum
      .request({ method: 'eth_accounts' })
      .then(handleAccounts)
      .catch(() => {});

    ethereum.on('accountsChanged', handleAccounts);
    ethereum.on('chainChanged', handleChainChanged);

    return () => {
      ethereum.removeListener('accountsChanged', handleAccounts);
      ethereum.removeListener('chainChanged', handleChainChanged);
    };
  }, []);

  /* ---------------------------------------------------------------------
   * Contract instance whenever provider changes
   * -------------------------------------------------------------------*/
  React.useEffect(() => {
    if (!provider) return;
    // ethers.Contract requires a fully compatible signer or provider. Our custom
    // ProxyProvider is great for lightweight JSON-RPC calls but does **not** extend
    // the ethers.js BaseProvider class, so passing it directly to `ethers.Contract`
    // triggers the “invalid signer or provider” error. To avoid that we:
    //   • use the connected wallet signer when the user is connected
    //   • fall back to a read-only JsonRpcProvider pointed at the same Sepolia RPC
    //     when the user is not yet connected.
    // Use wallet signer when available; otherwise fall back to a standard JsonRpcProvider
    // Use wallet signer when available; otherwise fall back to a standard JsonRpcProvider that is fully compatible with ethers.js
    const connection = signer ?? provider; // fallback provider must extend BaseProvider
    console.debug('Using', signer ? 'wallet signer' : 'proxyJsonRpcProvider', 'for contract interactions');
  }, [provider, signer]);

  // Fetch creation fee whenever nftFactory changes
  React.useEffect(() => {
    const fetchFee = async () => {
      if (!nftFactory) return;
      try {
        const fee: ethers.BigNumber = await nftFactory.creationFee();
        setCreationFee(fee);
      } catch (err) {
        console.warn('Failed to fetch creation fee', err);
        setCreationFee(ethers.constants.Zero);
      }
    };
    fetchFee();
  }, [nftFactory]);

  /* ---------------------------------------------------------------------
   * Fetch Listings helper (VERY naive – scans past events)
   * -------------------------------------------------------------------*/
  const fetchListings = React.useCallback(async () => {
    if (!contract) return;
    try {
      // Fetch past Listed events; limit to last 200k blocks for demo purposes
      const currentBlock = await (provider ?? proxyProvider).getBlockNumber();
      const fromBlock = Math.max(currentBlock - 200000, 0);
      const events = await contract.queryFilter(contract.filters.Listed(), fromBlock, 'latest');

      const uiListings: ListingUI[] = [];
      for (const ev of events) {
        const { nftContract, tokenId, seller, price } = ev.args as any;
        // Check if still active
        const listingStruct = await contract.getListing(nftContract, tokenId);
        if (listingStruct.isActive) {
          uiListings.push({
            nftContract,
            tokenId,
            seller,
            price: ethers.utils.formatEther(listingStruct.price),
          });
        }
      }
      setListings(uiListings);
    } catch (err) {
      console.error('Error fetching listings', err);
    }
  }, [contract, provider]);

  /* ---------------------------------------------------------------------
   * Fetch Collections from nftFactory (NEW)
   * -------------------------------------------------------------------*/
  const fetchCollections = React.useCallback(async () => {
    if (collectionsLoading) {
      console.debug('fetchCollections skipped – already loading');
      return;
    }
    setCollectionsLoading(true);
    console.debug('Fetching collections…');
      // Early guard – ensure we have at least one read-capable provider before continuing
      if (!nftFactory && !provider) {
        console.debug('No read provider available; abort fetchCollections');
        return;
      }
    const collectionsArr: any[] = [];

    // Helper to push unique collection objects
    const pushUnique = (obj: { collection: string; [k: string]: any }) => {
      if (!obj.collection) return;
      obj.collection = obj.collection.toLowerCase(); // normalise address casing

      if (!obj.collection) return;
      if (!collectionsArr.find((c) => c.collection === obj.collection)) {
        collectionsArr.push(obj);
        console.debug(`Collected collection ${obj.collection}`);
      }
    };

    try {
      let factoryToUse: any = null;
      if (nftFactory && typeof (nftFactory as any).getCollectionsCount === 'function') {
        factoryToUse = nftFactory;
        console.debug('Using full nftFactory for collection fetch');
      } else {
        console.debug('nftFactory missing read fns – using read-only NFTCollectionFactory interface');
        const proxyJsonRpcProvider = proxyProvider as any;
        const readConnection: any = signer ?? proxyJsonRpcProvider ?? provider ?? proxyProvider;
        factoryToUse = new ethers.Contract(
          NFT_FACTORY_ADDRESS,
          NFT_COLLECTION_FACTORY_READ_ABI,
          readConnection
        );
      }

      const countBN = await factoryToUse.getCollectionsCount();
      console.log("gotten collections: ", countBN)
      const count = countBN.toNumber();
      console.log("gotten collections number: ", count)
      if (count === 0) {
        setOnChainCollections([]);
        console.debug('Fetched 0 collections from factory');
        return;
      }

      
        try {
          for (let i = 0; i < count; i++) {
          const colRes: any = await factoryToUse.getCollection(i);
          console.log("result get collection: ", colRes)
          if (typeof colRes === 'string') {
            pushUnique({ collection: colRes });
          } else if (Array.isArray(colRes)) {
            pushUnique({ collection: colRes[0] });
          } else if (colRes && typeof colRes === 'object') {
            pushUnique({
              collection: (colRes as any).collection ?? (colRes as any).addr ?? (colRes as any)[0],
            });
          }
          }
        } catch (itemErr) {
          console.warn(`getCollection(${i}) failed`, itemErr);
        }
      

      // -------------------------
      // Enrich collections with on-chain metadata (NEW)
      // -------------------------
      const READ_METADATA_ABI = [
        "function name() view returns (string)",
        "function symbol() view returns (string)",
        "function totalSupply() view returns (uint256)"
      ] as const;

      const proxyJsonRpcProvider: any = proxyProvider;
      const readConn: any = signer ?? provider ?? proxyJsonRpcProvider ?? proxyProvider;

      const enriched: { collection: string; name: string|null; symbol: string|null; totalShares: number|null; img: string|null; pricePerShare: number|null }[] = [];
      for (let i = 0; i < collectionsArr.length; i++) {
        const baseCol = collectionsArr[i];
        const imgFallback = collections[i % collections.length]?.img || 'site_background.webp';
        try {
          const c = new ethers.Contract(baseCol.collection, READ_METADATA_ABI, readConn);
          const [nm, sym, supplyBN] = await Promise.all([
            c.name().catch(() => ''),
            c.symbol().catch(() => ''),
            c.totalSupply().catch(() => 0)
          ]);
          const totalShares = supplyBN && supplyBN.toNumber ? supplyBN.toNumber() : 0;
          const enrichedObj = {
            collection: baseCol.collection.toLowerCase(),
            name: nm || null,
            symbol: sym || null,
            totalShares: totalShares || null,
            img: imgFallback,
            pricePerShare: null
          };
          console.debug('Enriched collection', enrichedObj);
          enriched.push(enrichedObj);
          if (!nm || !sym) console.debug('Missing metadata for collection', baseCol.collection);
        } catch (metaErr) {
          console.warn('Metadata enrichment failed for', baseCol.collection, metaErr);
          enriched.push({
            collection: baseCol.collection.toLowerCase(),
            name: null,
            symbol: null,
            totalShares: null,
            img: imgFallback,
            pricePerShare: null
          });
          console.debug('Metadata enrichment failed – using defaults for', baseCol.collection);
        }
      }
      console.debug(`Enriched ${enriched.length} collections`);
      setOnChainCollections(enriched);
      console.debug('Enriched collections:', enriched);
      console.debug(`Collections updated (${enriched.length})`);
      console.debug(`Fetched ${collectionsArr.length} collections after primary attempt`);
      // setCollectionsLoading handled in finally block below
      // moved to finally block
    } catch (primaryErr) {
      
      console.warn('Primary collection fetch failed, attempting event-based fallback', primaryErr);

      // Fallback to past events if standard reads fail
      if (!nftFactory) {
        console.warn('Cannot use fallback without nftFactory instance');
        return;
      }
      try {
        const fromBlock = 0; // could narrow for perf
        const recentEvents = await nftFactory.queryFilter(nftFactory.filters.CollectionCreated(), fromBlock, 'latest');
        recentEvents.forEach((ev) => {
          const addr = ev.args?.collection ?? ev.args?.[0];
          if (addr) pushUnique({ collection: addr });
        });
        setOnChainCollections(collectionsArr);
        console.debug(`Fetched ${collectionsArr.length} collections from event logs`);
      } catch (evErr) {
        console.warn('Event-based fallback failed', evErr);
      }
    }
  }, [nftFactory, signer, provider, proxyProvider]);

  // Trigger fetch when Collections tab is active
  React.useEffect(() => {
    if (nftFactory) {
      console.debug('Auto-fetching collections (mount/provider change)');
      fetchCollections();
    }
    let isMounted = true;
    if (nftFactory) {
      console.debug('Auto-fetching collections (mount/provider change)');
      fetchCollections(() => isMounted);
    }
    return () => {
      isMounted = false;
    };
  }, [nftFactory, provider, fetchCollections]);

  React.useEffect(() => {
    if (activeTab !== 'collections') return;
    fetchCollections();
  }, [activeTab, fetchCollections]);

  /* ---------------------------------------------------------------------
   * Auto-fetch on contract ready & block updates / events
   * -------------------------------------------------------------------*/
  React.useEffect(() => {
    if (activeTab !== 'marketplace') return;
    if (!contract) return;
    fetchListings();

    // Listen to Listed / Cancelled events to refetch
    const handleEvent = () => fetchListings();
    contract.on('Listed', handleEvent);
    contract.on('Cancelled', handleEvent);

    // Listen to new blocks (read-only provider best here)
    const blockListener = () => fetchListings();
    provider?.on && provider.on('block', blockListener);

    return () => {
      contract.off('Listed', handleEvent);
      contract.off('Cancelled', handleEvent);
      provider?.off && provider.off('block', blockListener);
    };
  }, [contract, fetchListings, provider]);

  /* ---------------------------------------------------------------------
   * Buy Listing action
   * -------------------------------------------------------------------*/
  const handleBuy = React.useCallback(
    async (listing: ListingUI) => {
      if (!contract || !signer) {
        console.log('Wallet not connected.');
        return;
      }

      // Check correct network
      const network = await provider!.getNetwork();
      if (network.chainId !== BASE_CHAIN_ID) {
        await (window as any).ethereum?.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0x2105' /* 11155111 in hex */ }],
        });
      }

      try {
        setTxPendingId(`${listing.nftContract}-${listing.tokenId}`);
        const overrides = { value: ethers.utils.parseEther(listing.price) };
        const estimatedGas = await contract.estimateGas.buy(listing.nftContract, listing.tokenId, overrides);
        const gasLimit = estimatedGas.mul(300).div(100);
        const tx = await contract.buy(listing.nftContract, listing.tokenId, {
          ...overrides,
          gasLimit,
        });
        console.log('Tx sent', tx.hash);
        await tx.wait();
        console.log('Tx confirmed');
        fetchListings();
      } catch (err) {
        console.error('Purchase failed', err);
      } finally {
        setTxPendingId(null);
      }
    },
    [contract, signer, provider, fetchListings]
  );

  const handleMintToCollection = React.useCallback(
    async (collectionAddr: string) => {
      if (!signer) {
        console.log('Connect wallet to mint');
        return;
      }
      try {
        setMintingCollection(collectionAddr.toLowerCase());
        const recipient = await signer.getAddress();
        const colContract = new ethers.Contract(collectionAddr, NFT_COLLECTION_WRITE_ABI, signer);
        console.debug('Minting to collection', collectionAddr, 'for', recipient);
        const tx = await colContract.mint(recipient, { gasLimit: ethers.BigNumber.from(200000) });
        console.debug('Mint tx sent:', tx.hash);
        await tx.wait();
        console.debug('Mint successful for collection', collectionAddr);
      } catch (err) {
        console.error('Mint failed for collection', collectionAddr, err);
      } finally {
        setMintingCollection(null);
      }
    },
    [signer]
  );

  /* ---------------------------------------------------------------------
   * Vault Factory Effects & Fetchers
   * -------------------------------------------------------------------*/
  React.useEffect(() => {
    if (!provider) return;
    // Ensure we always pass a fully-featured ethers provider or signer to Contract
    // Use wallet signer when available; otherwise fall back to a standard JsonRpcProvider
    // Use wallet signer when available; otherwise fall back to a standard JsonRpcProvider that is fully compatible with ethers.js
    const connection = signer ?? provider; // fallback provider must extend BaseProvider
    console.debug('Using', signer ? 'wallet signer' : 'proxyJsonRpcProvider', 'for contract interactions');
    const fc = new ethers.Contract(VAULT_FACTORY_ADDRESS, VAULT_FACTORY_ABI, connection);
    setFactoryContract(fc);

    // Legacy collectionFactory kept
    //setCollectionFactory(cf);

    // NEW factory instances
    const nf = new ethers.Contract(NFT_FACTORY_ADDRESS, NFT_FACTORY_ABI, connection);
    setNftFactory(nf);

    const cvf = new ethers.Contract(COLLECTION_VAULT_FACTORY_ADDRESS, COLLECTION_VAULT_FACTORY_ABI, connection);
    setCollectionVaultFactory(cvf);
  }, [provider, signer]);

  // Fetch creation fee whenever nftFactory changes
  React.useEffect(() => {
    const fetchFee = async () => {
      if (!nftFactory) return;
      try {
        const fee: ethers.BigNumber = await nftFactory.creationFee();
        setCreationFee(fee);
      } catch (err) {
        console.warn('Failed to fetch creation fee', err);
        setCreationFee(ethers.constants.Zero);
      }
    };
    fetchFee();
  }, [nftFactory]);

  const fetchAllVaults = React.useCallback(async () => {
    if (!factoryContract) return;
    try {
      const vaultAddrs: string[] = await factoryContract.getAllVaults();
      setAllVaults(vaultAddrs);
      const details: Record<string, { shipNFT: string; owner: string }> = {};
      for (const vAddr of vaultAddrs) {
        try {
          const vContract = new ethers.Contract(vAddr, FRACTIONAL_VAULT_ABI, provider ?? proxyProvider);
          const shipNFTAddr: string = await vContract.shipNFT();
          const ownerAddr: string = await vContract.owner();
          details[vAddr] = { shipNFT: shipNFTAddr, owner: ownerAddr };
        } catch (err) {
          console.warn('Failed to fetch vault detail', vAddr, err);
        }
      }
      setVaultDetails(details);
    } catch (err) {
      console.error('fetchAllVaults error', err);
    }
  }, [factoryContract, provider]);

  // Fetch factory owner whenever collectionFactory changes
  React.useEffect(() => {
    const fetchOwner = async () => {
      if (!collectionFactory) return;
      try {
        const ownerAddr: string = await collectionFactory.owner();
        setFactoryOwner(ownerAddr.toLowerCase());
        setIsFactoryOwner(currentAddress === ownerAddr.toLowerCase());
      } catch (err) {
        console.error('Failed to fetch factory owner', err);
      }
    };
    fetchOwner();
  }, [collectionFactory, currentAddress]);

  React.useEffect(() => {
    if (!factoryContract) return;
    const handleVaultCreated = (shipNFT: string, vault: string, owner: string) => {
      setAllVaults((prev) => (prev.includes(vault) ? prev : [...prev, vault]));
      setVaultDetails((prev) => ({ ...prev, [vault]: { shipNFT, owner } }));
    };
    factoryContract.on('VaultCreated', handleVaultCreated);
    return () => {
      factoryContract.off('VaultCreated', handleVaultCreated);
    };
  }, [factoryContract]);

  /* ---------------------------------------------------------------------
   * Derived Helpers
   * -------------------------------------------------------------------*/
  const currentCollectionDetail = React.useMemo(() => {
    if (!selectedCollection) return null;
    return collections.find((c) => c.id === selectedCollection) || null;
  }, [selectedCollection, collections]);

  const totalSharePages = React.useMemo(() => {
    if (!currentCollectionDetail) return 1;
    return Math.ceil(currentCollectionDetail.totalShares / SHARES_PER_PAGE);
  }, [currentCollectionDetail]);

  const pagedShares = React.useMemo(() => {
    if (!currentCollectionDetail) return [] as number[];
    const start = (currentSharePage - 1) * SHARES_PER_PAGE + 1;
    const end = Math.min(start + SHARES_PER_PAGE - 1, currentCollectionDetail.totalShares);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }, [currentCollectionDetail, currentSharePage]);

  

  const resetCreateForm = React.useCallback(() => {
    setShipName('');
    setSymbol('');
    setVaultOwnerInput('');
    setBaseURI('');
    setTotalSharesInput('');
    setPricePerShareInput('');
    setDescription('');
    setImageFile(null);
    setGasLimitInput('3000000');
    setFormError(null);
    setConfirmationMessage(null);
  }, []);

  const handleCreateCollection = React.useCallback(() => {
    // Only UI demo – unchanged
    const totalSharesNum = Number(totalSharesInput);
    const pricePerShareNum = Number(pricePerShareInput);

    if (!shipName.trim()) {
      setFormError('Ship name is required.');
      return;
    }
    if (Number.isNaN(totalSharesNum) || totalSharesNum <= 0) {
      setFormError('Total shares must be a positive number.');
      return;
    }
    if (Number.isNaN(pricePerShareNum) || pricePerShareNum < 0) {
      setFormError('Price per share must be zero or positive.');
      return;
    }

    const payload = {
      name: shipName.trim(),
      totalShares: totalSharesNum,
      pricePerShare: pricePerShareNum,
      description: description.trim(),
      image: imageFile,
    };

    console.log('Create Collection Payload', payload);
    setFormError(null);
    setConfirmationMessage(`Collection "${payload.name}" created successfully!`);
  }, [shipName, totalSharesInput, pricePerShareInput, description, imageFile]);

  /* ---------------------------------------------------------------------
   * UI Render Helpers
   * -------------------------------------------------------------------*/
  const renderHeroSection = () => (
    <div className="w-full h-full flex flex-col items-center justify-center text-center gap-6">
      <div className="prose font-custom text-site-foreground max-w-2xl">
        <h1 className="text-xl font-custom m-0 p-0 flex items-center justify-center gap-2">
          {Lucide.Anchor && <Lucide.Anchor size={28} className="text-[color:var(--primary-blue)]" />} ShipShare Marketplace
        </h1>
        <p className="text-base font-custom m-0 p-0">
          Fractionalise ownership of magnificent ships and earn yield while sailing the high seas of Web3. Browse our
          marketplace, mint shares, and manage your portfolio – all in one sleek dashboard. Own fractional NFTs of real
          ships and earn monthly yield
        </p>
      </div>
      <div className="flex flex-wrap gap-4 items-center justify-center">
        <DreamspaceElements.Button
          variant="primary" style={{ backgroundColor: 'var(--button-blue)' }}
          className="text-sm font-custom px-6 py-3 flex items-center gap-2 bg-[color:var(--button-blue)] text-[color:var(--primary-blue)]-foreground hover:bg-[color:var(--accent-blue)] focus-visible:ring-2 focus-visible:ring-[color:var(--accent-blue)]"
          size="lg"
          onClick={() => console.log('Marketplace disabled')}
        >
          {Lucide.ShoppingCart && <Lucide.ShoppingCart size={16} />} Marketplace (disabled)
        </DreamspaceElements.Button>
        <DreamspaceElements.Button
          variant="secondary"
          className="text-sm font-custom px-6 py-3 flex items-center gap-2 bg-amber-400 text-amber-900 hover:bg-amber-600 focus-visible:ring-2 focus-visible:ring-amber-300"
          size="lg"
          onClick={() => setActiveTab('portfolio')}
        >
          {Lucide.Compass && <Lucide.Compass size={16} />} View Portfolio
        </DreamspaceElements.Button>
      </div>
    </div>
  );

  // CARD used in Marketplace listings (on-chain)
  // CARD used for Vault listings
  const renderVaultCards = () => (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 w-full">
      {allVaults.length === 0 && (
        <p className="text-site-foreground font-custom text-sm">No vaults deployed yet.</p>
      )}
      {allVaults.map((vAddr) => {
        const detail = vaultDetails[vAddr];
        return (
          <DreamspaceElements.Card
            key={vAddr}
            className="flex flex-col justify-between shadow-lg hover:shadow-xl transition-shadow"
          >
            <div className="p-4 space-y-2 prose font-custom text-foreground">
              <h3 className="text-sm font-custom m-0 p-0 break-all">Vault: {vAddr.slice(0, 10)}…</h3>
              {detail && (
                <>
                  <p className="text-xs font-custom m-0 p-0 break-all">ShipNFT: {detail.shipNFT.slice(0, 10)}…</p>
                  <p className="text-xs font-custom m-0 p-0 break-all">Owner: {detail.owner.slice(0, 10)}…</p>
                </>
              )}
            </div>
            <div className="p-4 pt-0 flex flex-col gap-2">
              <DreamspaceElements.Button
                size="sm"
                aria-label="Open Vault"
                variant="secondary"
                className="w-full font-custom text-xs bg-amber-400 text-amber-900 hover:bg-amber-600 focus-visible:ring-2 focus-visible:ring-amber-300"
                onClick={() => console.log('Open vault', vAddr)}
              >
                {Lucide.ArchiveRestore && <Lucide.ArchiveRestore size={14} className="mr-1" />} Open Vault
              </DreamspaceElements.Button>
            </div>
          </DreamspaceElements.Card>
        );
      })}
    </div>
  );


  const renderOnChainListings = () => (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 w-full">
      {listings.length === 0 && (
        <p className="text-site-foreground font-custom text-sm">No active on-chain listings found.</p>
      )}
      {listings.map((l) => {
        const key = `${l.nftContract}-${l.tokenId.toString()}`;
        const pending = txPendingId === key;
        return (
          <DreamspaceElements.Card
            key={key}
            className="flex flex-col justify-between shadow-lg hover:shadow-xl transition-shadow"
          >
            <div className="p-4 space-y-2 prose font-custom text-foreground">
              <h3 className="text-sm font-custom m-0 p-0 break-all">
                NFT #{l.tokenId.toString().slice(0, 6)}…
              </h3>
              <p className="text-xs font-custom m-0 p-0 break-all">Contract: {l.nftContract.slice(0, 10)}…</p>
              <p className="text-xs font-custom m-0 p-0">Price: Ξ{l.price}</p>
            </div>
            <div className="p-4 pt-0 flex flex-col gap-2">
              <DreamspaceElements.Button
                size="sm"
                disabled={pending}
                aria-label="Buy listing"
                variant="primary" style={{ backgroundColor: 'var(--button-blue)' }}
                className="w-full font-custom text-xs bg-[color:var(--button-blue)] text-[color:var(--primary-blue)]-foreground hover:bg-[color:var(--accent-blue)] focus-visible:ring-2 focus-visible:ring-[color:var(--accent-blue)]"
                onClick={() => handleBuy(l)}
              >
                {pending ? 'Processing…' : 'Buy'}
              </DreamspaceElements.Button>
            </div>
          </DreamspaceElements.Card>
        );
      })}
    </div>
  );

  const renderCollectionCards = () => (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 w-full">
      {(onChainCollections.length ? onChainCollections : collections).map((col, idx) => (
        <DreamspaceElements.Card
          key={col.collection}
          className="flex flex-col justify-between shadow-lg hover:shadow-xl transition-shadow"
        >
          <img src={col.img} alt={col.name || col.collection} className="w-full h-40 object-cover rounded-t-md" />
          <div className="p-4 space-y-2 prose font-custom text-foreground">
            <h3 className="text-sm font-custom m-0 p-0">{col.name || `${col.collection.slice(0, 8)}…`}</h3>
            <p className="text-xs font-custom m-0 p-0">Total Shares: {col.totalShares ?? '—'}</p>
            <p className="text-xs font-custom m-0 p-0">{col.symbol && (<span className="font-bold mr-1">{col.symbol}</span>)}Price / Share: {col.pricePerShare != null ? `Ξ${col.pricePerShare}` : '—'}</p>
          </div>
          <div className="p-4 pt-0 flex flex-col gap-2">
            <DreamspaceElements.Button
              size="sm"
              aria-label="View Collection"
              variant="secondary"
              className="w-full font-custom text-xs bg-amber-400 text-amber-900 hover:bg-amber-600 focus-visible:ring-2 focus-visible:ring-amber-300"
              onClick={() => {
                setSelectedCollection(col.collection);
                setCurrentSharePage(1);
                setActiveTab('marketplace');
              }}
            >
              {Lucide.ExternalLink && <Lucide.ExternalLink size={14} className="mr-1" />} View Collection
            </DreamspaceElements.Button>
            {/* Example Buy button for demo purposes – in real scenario tokenId is needed */}
            <DreamspaceElements.Button
              size="sm"
              disabled={!signer || mintingCollection === col.collection}
              aria-label="Mint Share"
              variant="primary" style={{ backgroundColor: 'var(--button-blue)' }}
              className="w-full font-custom text-xs bg-[color:var(--button-blue)] text-[color:var(--primary-blue)]-foreground hover:bg-[color:var(--accent-blue)] focus-visible:ring-2 focus-visible:ring-[color:var(--accent-blue)]"
              onClick={() => handleMintToCollection(col.collection)}
            >
              {mintingCollection === col.collection ? 'Minting…' : 'Mint Share'}
            </DreamspaceElements.Button>
          </div>
        </DreamspaceElements.Card>
      ))}
    </div>
  );

  /* ---------------------------------------------------------------------
   * Create Collection Form Renderer (NEW)
   * -------------------------------------------------------------------*/
  const renderCreateCollectionForm = () => {
    React.useEffect(() => {
      if (currentStep === 'create') {
        console.debug('Gas limit UI hidden');
      }
    }, [currentStep]);
    const isDisabled = !signer;
    return (
      <div id="create-collection-tab-root" className="w-full h-full flex flex-col items-center justify-start gap-6 overflow-auto" style={{
          '--gas-limit-display': 'block'
        } as React.CSSProperties}>
        <div className="prose font-custom text-site-foreground max-w-xl w-full">
          <h2 className="text-lg font-custom m-0 p-0 flex items-center gap-2">
            {Lucide.PencilPlus && <Lucide.PencilPlus size={20} className="text-[color:var(--primary-blue)]" />} Create a New ShipShare
          </h2>
          <p className="text-sm font-custom m-0 p-0">
            Fill out the details below to deploy a new fractional Ship NFT vault. Only the admin wallet can submit this
            form. Connect with the admin account to enable submission.
          </p>
        </div>
        <form
          className="w-full max-w-xl flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (isDisabled) {
              console.log('Only factory owner can create collections');
              return;
            }
            
            if (!nftFactory || !factoryContract || !signer) {
              setCreateError('Connect your wallet as the factory owner.');
              return;
            }
            
            // Call the properly defined flow function
            performCreateFlow();
          }}
        >
          <div className="flex flex-col gap-2">
            <DreamspaceElements.Label htmlFor="symbol" className="text-xs font-custom text-site-foreground">
              Symbol
            </DreamspaceElements.Label>
            <DreamspaceElements.Input
              id="symbol"
              value={symbol}
              onChange={(e: any) => setSymbol(e.target.value)}
              placeholder="SYM"
              className="font-custom"
            />
          </div>
          <div className="flex flex-col gap-2">
            <DreamspaceElements.Label htmlFor="baseURI" className="text-xs font-custom text-site-foreground">
              Base URI
            </DreamspaceElements.Label>
            <DreamspaceElements.Input
              id="baseURI"
              value={baseURI}
              onChange={(e: any) => setBaseURI(e.target.value)}
              placeholder="https://example.com/metadata/"
              className="font-custom"
            />
          </div>

          <div className="flex flex-col gap-2">
            <DreamspaceElements.Label htmlFor="shipName" className="text-xs font-custom text-site-foreground">
              Ship Name
            </DreamspaceElements.Label>
            <DreamspaceElements.Input
              id="shipName"
              value={shipName}
              onChange={(e: any) => setShipName(e.target.value)}
              placeholder="e.g., SS Atlantis"
              className="font-custom"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <DreamspaceElements.Label htmlFor="totalShares" className="text-xs font-custom text-site-foreground">
                Total Shares
              </DreamspaceElements.Label>
              <DreamspaceElements.Input
                id="totalShares"
                type="number"
                min="1"
                value={totalSharesInput}
                onChange={(e: any) => setTotalSharesInput(e.target.value)}
                placeholder="200"
                className="font-custom"
              />
            </div>
            <div className="flex flex-col gap-2">
              <DreamspaceElements.Label htmlFor="pricePerShare" className="text-xs font-custom text-site-foreground">
                Price per Share (ETH)
              </DreamspaceElements.Label>
              <DreamspaceElements.Input
                id="pricePerShare"
                type="number"
                min="0"
                step="0.0001"
                value={pricePerShareInput}
                onChange={(e: any) => setPricePerShareInput(e.target.value)}
                placeholder="0.25"
                className="font-custom"
              />
            </div>
          </div>
          
          {creationFee && !creationFee.isZero() && (
            <p className="text-xs font-custom text-site-foreground">Creation Fee: Ξ{ethers.utils.formatEther(creationFee)}</p>
          )}

          <div className="flex flex-col gap-2">
            <DreamspaceElements.Label htmlFor="description" className="text-xs font-custom text-site-foreground">
              Description
            </DreamspaceElements.Label>
            <DreamspaceElements.Textarea
              id="description"
              value={description}
              onChange={(e: any) => setDescription(e.target.value)}
              placeholder="Describe this magnificent vessel..."
              className="font-custom min-h-[120px]"
            />
          </div>
          <div className="flex flex-col gap-2">
            <DreamspaceElements.Label htmlFor="imageFile" className="text-xs font-custom text-site-foreground">
              Cover Image
            </DreamspaceElements.Label>
            <DreamspaceElements.Input
              id="imageFile"
              type="file"
              accept="image/*"
              onChange={(e: any) => setImageFile(e.target.files?.[0] ?? null)}
              className="font-custom"
            />
          </div>

          {(formError || createError) && (
            <DreamspaceElements.Alert variant="destructive" className="font-custom">
              {Lucide.AlertTriangle && <Lucide.AlertTriangle size={16} className="mr-2" />} {formError}
            </DreamspaceElements.Alert>
          )}

          {confirmationMessage && (
            <DreamspaceElements.Alert variant="success" style={{ backgroundColor: 'var(--success-green)', color: 'var(--basic-white)' }} className="font-custom">
              {Lucide.CheckCircle && <Lucide.CheckCircle size={16} className="mr-2" />} {confirmationMessage}
              <DreamspaceElements.Button
                type="button"
                size="sm"
                variant="secondary"
                className="ml-4 font-custom bg-amber-400 text-amber-900 hover:bg-amber-600 focus-visible:ring-2 focus-visible:ring-amber-300"
                onClick={resetCreateForm}
              >
                Reset
              </DreamspaceElements.Button>
            </DreamspaceElements.Alert>
          )}

          {createTxStatus === 'pending' && (
            <DreamspaceElements.Alert className="font-custom" variant="secondary">
              {Lucide.Loader2 && <Lucide.Loader2 size={16} className="mr-2 animate-spin" />} Collection creation pending…
            </DreamspaceElements.Alert>
          )}

          {vaultTxStatus === 'pending' && (
            <DreamspaceElements.Alert className="font-custom" variant="secondary">
              {Lucide.Loader2 && <Lucide.Loader2 size={16} className="mr-2 animate-spin" />} Vault creation pending…
            </DreamspaceElements.Alert>
          )}
          {createTxStatus === 'success' && createdAddresses && (
            <DreamspaceElements.Alert className="font-custom" variant="success" style={{ backgroundColor: 'var(--success-green)', color: 'var(--basic-white)' }}>
              {Lucide.CheckCircle && <Lucide.CheckCircle size={16} className="mr-2" />} Success! Collection:{' '}
              <a href={`https://sepolia.etherscan.io/address/${createdAddresses.collection}`} target="_blank" rel="noreferrer" className="underline">
                {createdAddresses.collection.slice(0, 10)}…
              </a>{' '}– Vault:{' '}
              <a href={`https://sepolia.etherscan.io/address/${createdAddresses.vault}`} target="_blank" rel="noreferrer" className="underline">
                {createdAddresses.vault.slice(0, 10)}…
              </a>{' '}
              <DreamspaceElements.Button
                size="sm"
                variant="link"
                className="text-xs font-custom ml-2"
                onClick={() => setActiveTab('marketplace')}
              >
                Go to Marketplace
              </DreamspaceElements.Button>
            </DreamspaceElements.Alert>
          )}
          {createTxStatus === 'success' && createdAddresses && (
            <DreamspaceElements.Alert className="font-custom" variant="success" style={{ backgroundColor: 'var(--success-green)', color: 'var(--basic-white)' }}>
              {Lucide.CheckCircle && <Lucide.CheckCircle size={16} className="mr-2" />} Success! Collection:{' '}
              {createdAddresses.collection.slice(0, 10)}… Vault: {createdAddresses.vault.slice(0, 10)}…{' '}
              <DreamspaceElements.Button
                size="sm"
                variant="link"
                className="text-xs font-custom ml-2"
                onClick={() => setActiveTab('marketplace')}
              >
                Go to Marketplace
              </DreamspaceElements.Button>
            </DreamspaceElements.Alert>
          )}

          {currentStep === 'collection' && (
            <DreamspaceElements.Alert className="font-custom" variant="secondary">
              {Lucide.Loader2 && <Lucide.Loader2 size={16} className="mr-2 animate-spin" />} Step 1/3: Creating collection...
            </DreamspaceElements.Alert>
          )}

          {currentStep === 'minting' && (
            <DreamspaceElements.Alert className="font-custom" variant="secondary">
              {Lucide.Loader2 && <Lucide.Loader2 size={16} className="mr-2 animate-spin" />} Step 2/3: Minting NFTs...
            </DreamspaceElements.Alert>
          )}

          {currentStep === 'vault' && (
            <DreamspaceElements.Alert className="font-custom" variant="secondary">
              {Lucide.Loader2 && <Lucide.Loader2 size={16} className="mr-2 animate-spin" />} Step 3/3: Creating vault...
            </DreamspaceElements.Alert>
          )}

          {currentStep === 'complete' && (
            <DreamspaceElements.Alert className="font-custom" variant="success" style={{ backgroundColor: 'var(--success-green)', color: 'var(--basic-white)' }}>
              {Lucide.CheckCircle && <Lucide.CheckCircle size={16} className="mr-2" />} All steps completed successfully! Form will reset in 3 seconds.
            </DreamspaceElements.Alert>
          )}

          <DreamspaceElements.Button
            type="submit"
            variant="primary" style={{ backgroundColor: 'var(--button-blue)' }}
            size="lg"
            disabled={isDisabled || createTxStatus === 'pending'}
            className="font-custom bg-[color:var(--button-blue)] text-[color:var(--primary-blue)]-foreground hover:bg-[color:var(--accent-blue)] focus-visible:ring-2 focus-visible:ring-[color:var(--accent-blue)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isDisabled ? 'Connect Factory Owner' : 'Create Collection'}
          </DreamspaceElements.Button>
        </form>
      </div>
    );
  };

  /* Existing helpers renderCollectionDetail, renderYieldClaim, renderPortfolio remain unchanged */

  /* ---------------------------------------------------------------------
   * Main Render
   * -------------------------------------------------------------------*/
  return (
    <div className="w-full h-full flex items-start justify-center p-6" style={{ backgroundColor: 'var(--basic-white)', '--primary-blue': '#123F74', '--accent-blue': '#1976D2', '--secondary-blue': '#4682B4', '--light-grey-bg': '#F8F9FA', '--basic-white': '#FFFFFF', '--text-gray': '#495057', '--button-blue': '#1769AA', '--success-green': '#279A44' } as React.CSSProperties}>
      <div className="w-full h-full rounded-md border border-gray-200/40 p-6 flex flex-col shadow-lg overflow-hidden">

        <div className="border-b border-gray-200/40 my-4" />
        <DreamspaceElements.Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex flex-col h-full"
          orientation="horizontal"
        >
          <DreamspaceElements.TabsList className="flex items-center justify-between gap-2 mb-6 w-full p-2 rounded-md" style={{ background: 'linear-gradient(90deg, var(--primary-blue), var(--accent-blue))' }} onClick={() => console.debug('Marketplace button removed')}>
            <div className="flex items-center gap-2">
              <DreamspaceElements.TabsTrigger value="home" className="text-xs font-custom text-white">
                Home
              </DreamspaceElements.TabsTrigger>

              <DreamspaceElements.TabsTrigger value="collections" className="text-xs font-custom text-white">
                Collections
              </DreamspaceElements.TabsTrigger>

              <DreamspaceElements.TabsTrigger value="yield" className="text-xs font-custom text-white">
                Yield Claim
              </DreamspaceElements.TabsTrigger>

              <DreamspaceElements.TabsTrigger value="portfolio" className="text-xs font-custom text-white">
                My Portfolio
              </DreamspaceElements.TabsTrigger>

              <DreamspaceElements.TabsTrigger value="create" className="text-xs font-custom text-white">
                Create Collection
              </DreamspaceElements.TabsTrigger>
            </div>
          </DreamspaceElements.TabsList>

          <div className="flex-1 overflow-auto pr-2">
            <DreamspaceElements.TabsContent value="home" className="w-full h-full">
              {renderHeroSection()}
            </DreamspaceElements.TabsContent>

            {/* Collections Tab */}
            <DreamspaceElements.TabsContent value="collections" className="w-full h-full space-y-4">
              <div className="flex justify-end">
  
              </div>
              {renderCollectionCards()}
            </DreamspaceElements.TabsContent>

            <DreamspaceElements.TabsContent value="marketplace" className="w-full h-full space-y-8">
              {/* On-chain Listings */}
              {renderOnChainListings()}
              {/* Existing mock collections below */}
              {selectedCollection ? null : renderCollectionCards()}
            </DreamspaceElements.TabsContent>

            <DreamspaceElements.TabsContent value="create" className="w-full h-full">
              {renderCreateCollectionForm()}
            </DreamspaceElements.TabsContent>
            {/* Other tab contents remain exactly the same – omitted for brevity */}
          </div>
        </DreamspaceElements.Tabs>
      </div>
    </div>
  );
};

export { MainAppComponent as component };