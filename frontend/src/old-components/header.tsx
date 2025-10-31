const HeaderComponent: React.FC = () => {
  const [isConnecting, setIsConnecting] = React.useState(false);
  const [address, setAddress] = React.useState<string | null>(null);
  const [showWalletMenu, setShowWalletMenu] = React.useState(false); // dropdown only when connected

  /* ------------------- Memoized helpers ------------------- */
  // Shorten address for display (0x1234...abcd)
  const shortAddress = React.useMemo(() => {
    if (!address) return '';
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  }, [address]);

  // Generate a simple identicon color based on address hash
  const identiconColor = React.useMemo(() => {
    if (!address) return '#ccc';
    const hash = address.slice(2, 8); // take 6 hex chars
    return `#${hash}`;
  }, [address]);

  /* ------------------- Wallet connections ------------------- */
  const connectMetaMask = React.useCallback(async () => {
    if (!(window as any).ethereum) {
      alert('MetaMask not detected.');
      return;
    }
    try {
      setIsConnecting(true);
      let accounts: string[] = [];
      try {
        accounts = await (window as any).ethereum.request({ method: 'eth_requestAccounts' });
      } catch (reqError) {
        alert('Failed to connect MetaMask: ' + (reqError instanceof Error ? reqError.message : String(reqError)));
        setIsConnecting(false);
        return;
      }
      if (accounts.length === 0) {
        alert('No account found in MetaMask');
        setIsConnecting(false);
        return;
      }
      setAddress(accounts[0]);
    } catch (err) {
      alert('Error connecting MetaMask: ' + (err instanceof Error ? err.message : String(err)));
      console.error(err);
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnect = React.useCallback(() => {
    setAddress(null);
    setShowWalletMenu(false);
  }, []);

  const copyAddress = React.useCallback(() => {
    if (!address) return;
    navigator.clipboard.writeText(address).then(() => {
      alert('Address copied to clipboard');
    }).catch(() => {
      alert('Failed to copy address');
    });
    setShowWalletMenu(false);
  }, [address]);

  /* ------------------- UI memoizations ------------------- */
  const walletButtonContent = React.useMemo(() => {
    if (isConnecting) {
      return (
        <div className="flex items-center gap-1">
          {Lucide.Loader2 && <Lucide.Loader2 className="animate-spin" size={16} style={{ color: 'var(--basic-white)', textShadow: '0 1px 0 rgba(0,0,0,0.25)' }} />}
          <span className="font-custom" style={{ color: 'var(--basic-white)', textShadow: '0 1px 0 rgba(0,0,0,0.25)' }}>Connecting...</span>
        </div>
      );
    }
    if (address) {
      return (
        <div className="flex items-center gap-1">
          <div
            className="w-5 h-5 rounded-full border"
            style={{ backgroundColor: identiconColor, borderColor: 'var(--accent-blue)' }}
          ></div>
          <span className="font-custom" style={{ color: 'var(--basic-white)', textShadow: '0 1px 0 rgba(0,0,0,0.25)' }}>{shortAddress}</span>
        </div>
      );
    }
    return <span className="font-custom" style={{ color: 'var(--basic-white)', textShadow: '0 1px 0 rgba(0,0,0,0.25)' }}>Connect Wallet</span>;
  }, [isConnecting, address, shortAddress, identiconColor]);

  /* ------------------- Render ------------------- */
  return (
    <div
      className="w-full h-full min-h-[70px] rounded-md px-2 py-1 shadow-sm border-b border-gray-300 flex items-center relative"
      style={{
        // Institutional palette
        '--primary-blue': '#123F74',
        '--accent-blue': '#1976D2',
        '--secondary-blue': '#4682B4',
        '--light-grey-bg': '#F8F9FA',
        '--basic-white': '#FFFFFF',
        '--text-gray': '#495057',
        '--button-blue': '#1769AA',
        '--success-green': '#279A44',
        backgroundColor: 'var(--primary-blue)',
        color: 'var(--basic-white)'
      } as React.CSSProperties}
    >
      {/* Left: Logo */}
      <div className="flex items-center gap-2 px-2 py-1 rounded-md" style={{ backgroundColor: 'transparent' }}>
        <a href="/" className="block">
          <img
            src={`${MakeInfinite.useB64UrlForProjectImage('ShipShares_Tokenized_Cargo_Fleet_1761341041', 'cd7755c25dab5287bcd404910dbb016f.webp')}`}
            alt="ShipShares logo"
            className="h-8 md:h-12 w-auto max-h-12 rounded-md" style={{ borderRadius: '8px', boxShadow: '0 1px 4px rgba(0,0,0,0.1)' }}
          />
        </a>
      </div>

      {/* Center: Title */}
      <div className="absolute left-1/2 -translate-x-1/2">
        <h1 className="font-custom font-bold text-[18px] prose m-0" style={{ color: 'var(--basic-white)', textShadow: '0 1px 0 rgba(0,0,0,0.25)' }}>
          ShipShares
        </h1>
      </div>

      {/* Right section */}
      <div className="ml-auto flex items-center gap-2 relative">
        {/* Wallet Button */}
        <button
          onClick={() => {
            if (address) {
              setShowWalletMenu((prev) => !prev);
            } else {
              connectMetaMask();
            }
          }}
          className="flex items-center gap-1 px-3 py-1 rounded-md transition-shadow text-sm"
          style={{
            backgroundColor: 'var(--button-blue)',
            color: 'var(--basic-white)'
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 0 0 2px var(--accent-blue)`;
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.boxShadow = 'none';
          }}
        >
          {walletButtonContent}
        </button>

        {/* Connected Wallet Dropdown */}
        {address && showWalletMenu && (
          <div className="absolute right-0 top-full mt-2 w-44 shadow-lg border border-gray-200 rounded-md z-50 p-3 flex flex-col gap-2"
            style={{ backgroundColor: 'var(--primary-blue)' }}
          >
            <button
              onClick={copyAddress}
              className="flex items-center gap-2 px-3 py-2 rounded-md text-sm"
              style={{ backgroundColor: 'var(--secondary-blue)', color: 'var(--basic-white)' }}
            >
              {Lucide.Copy && <Lucide.Copy size={16} style={{ color: 'var(--basic-white)', textShadow: '0 1px 0 rgba(0,0,0,0.25)' }} />}
              Copy Address
            </button>
            <button
              onClick={disconnect}
              className="flex items-center gap-2 px-3 py-2 rounded-md text-sm"
              style={{ backgroundColor: 'var(--success-green)', color: 'var(--basic-white)' }}
            >
              {Lucide.LogOut && <Lucide.LogOut size={16} style={{ color: 'var(--basic-white)', textShadow: '0 1px 0 rgba(0,0,0,0.25)' }} />}
              Disconnect
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export { HeaderComponent as component };