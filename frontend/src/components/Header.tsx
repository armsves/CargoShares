'use client'

import { ConnectButton } from '@/components/ConnectButton'
import Image from 'next/image'
import Link from 'next/link'
import { useState, useEffect } from 'react'

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <header 
      className={`fixed top-0 left-0 right-0 z-50 h-[72px] transition-all duration-300 ${
        isScrolled 
          ? 'bg-[rgba(10,36,99,0.90)] backdrop-blur-md shadow-lg' 
          : 'bg-[rgba(10,36,99,0.90)] backdrop-blur-sm'
      }`}
    >
      <nav className="h-full max-w-[1280px] mx-auto px-4 md:px-12 flex items-center justify-between">
        {/* Left: Logo */}
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
            <div className="relative h-10 w-10">
              <Image
                src="/CargoShares-logo.png"
                alt="CargoShares Logo"
                fill
                className="object-contain"
                priority
              />
            </div>
            <span className="text-white font-bold text-lg">
              CargoShares
            </span>
          </Link>
        </div>

        {/* Center: Navigation Links */}
        <div className="hidden md:flex items-center gap-8 flex-1 justify-center">
          <a
            href="#marketplace"
            className="text-white hover:text-[#D4AF37] transition-colors font-medium text-base"
          >
            Marketplace
          </a>
          <a
            href="#my-ships"
            className="text-white hover:text-[#D4AF37] transition-colors font-medium text-base"
          >
            My Ships
          </a>
          <a
            href="#vault"
            className="text-white hover:text-[#D4AF37] transition-colors font-medium text-base"
          >
            Vault
          </a>
          <a
            href="#about"
            className="text-white hover:text-[#D4AF37] transition-colors font-medium text-base"
          >
            About
          </a>
        </div>

        {/* Right: Wallet Connect Button */}
        <div className="flex items-center gap-4">
          <div className="hidden md:block">
            <div className="[&_button]:rounded-lg [&_button]:hover:bg-[#D4AF37]/10 [&_button]:transition-all">
              <ConnectButton />
            </div>
          </div>
          
          {/* Mobile menu button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden text-white p-2 hover:bg-white/10 rounded-lg transition-colors"
            aria-label="Toggle menu"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              {isMenuOpen ? (
                <path d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </nav>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden absolute top-[72px] left-0 right-0 bg-[rgba(10,36,99,0.98)] backdrop-blur-sm border-t border-white/10 shadow-lg">
          <div className="px-4 py-4 space-y-3">
            <a
              href="#marketplace"
              className="block text-white hover:text-[#D4AF37] transition-colors font-medium py-2"
              onClick={() => setIsMenuOpen(false)}
            >
              Marketplace
            </a>
            <a
              href="#my-ships"
              className="block text-white hover:text-[#D4AF37] transition-colors font-medium py-2"
              onClick={() => setIsMenuOpen(false)}
            >
              My Ships
            </a>
            <a
              href="#vault"
              className="block text-white hover:text-[#D4AF37] transition-colors font-medium py-2"
              onClick={() => setIsMenuOpen(false)}
            >
              Vault
            </a>
            <a
              href="#about"
              className="block text-white hover:text-[#D4AF37] transition-colors font-medium py-2"
              onClick={() => setIsMenuOpen(false)}
            >
              About
            </a>
            <div className="pt-2 border-t border-white/10">
              <ConnectButton />
            </div>
          </div>
        </div>
      )}
    </header>
  )
}

