'use client'

import { useState } from 'react'

export function Footer() {
  const [email, setEmail] = useState('')

  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Handle newsletter subscription
    console.log('Newsletter subscription:', email)
    setEmail('')
    alert('Thank you for subscribing!')
  }

  return (
    <footer className="w-full bg-[#0A2463] text-white mt-auto">
      {/* Top Section: 4 Columns */}
      <div className="max-w-[1280px] mx-auto px-6 md:px-12 py-12 md:py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
          {/* Company */}
          <div>
            <h3 className="text-lg font-bold mb-4">Company</h3>
            <ul className="space-y-2 text-[#6B7280]">
              <li>
                <a href="#about" className="hover:text-white transition-colors duration-300">
                  About Us
                </a>
              </li>
              <li>
                <a href="#careers" className="hover:text-white transition-colors duration-300">
                  Careers
                </a>
              </li>
              <li>
                <a href="#contact" className="hover:text-white transition-colors duration-300">
                  Contact
                </a>
              </li>
              <li>
                <a href="#partners" className="hover:text-white transition-colors duration-300">
                  Partners
                </a>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h3 className="text-lg font-bold mb-4">Resources</h3>
            <ul className="space-y-2 text-[#6B7280]">
              <li>
                <a href="#docs" className="hover:text-white transition-colors duration-300">
                  Documentation
                </a>
              </li>
              <li>
                <a href="#guides" className="hover:text-white transition-colors duration-300">
                  Guides
                </a>
              </li>
              <li>
                <a href="#faq" className="hover:text-white transition-colors duration-300">
                  FAQ
                </a>
              </li>
              <li>
                <a href="#blog" className="hover:text-white transition-colors duration-300">
                  Blog
                </a>
              </li>
            </ul>
          </div>

          {/* Community */}
          <div>
            <h3 className="text-lg font-bold mb-4">Community</h3>
            <ul className="space-y-2 text-[#6B7280]">
              <li>
                <a href="#discord" className="hover:text-white transition-colors duration-300">
                  Discord
                </a>
              </li>
              <li>
                <a href="#twitter" className="hover:text-white transition-colors duration-300">
                  Twitter
                </a>
              </li>
              <li>
                <a href="#telegram" className="hover:text-white transition-colors duration-300">
                  Telegram
                </a>
              </li>
              <li>
                <a href="#github" className="hover:text-white transition-colors duration-300">
                  GitHub
                </a>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-lg font-bold mb-4">Legal</h3>
            <ul className="space-y-2 text-[#6B7280]">
              <li>
                <a href="#privacy" className="hover:text-white transition-colors duration-300">
                  Privacy Policy
                </a>
              </li>
              <li>
                <a href="#terms" className="hover:text-white transition-colors duration-300">
                  Terms of Service
                </a>
              </li>
              <li>
                <a href="#cookies" className="hover:text-white transition-colors duration-300">
                  Cookie Policy
                </a>
              </li>
              <li>
                <a href="#compliance" className="hover:text-white transition-colors duration-300">
                  Compliance
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Newsletter Section */}
        <div className="border-t border-white/10 pt-12 mb-12">
          <div className="max-w-md mx-auto text-center">
            <h3 className="text-lg font-bold mb-2">Stay Updated</h3>
            <p className="text-[#6B7280] mb-6 text-base">
              Subscribe to our newsletter for the latest updates on cargo ships and yields.
            </p>
            <form onSubmit={handleNewsletterSubmit} className="flex gap-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="flex-1 px-4 py-3 rounded-lg bg-[#1E3A8A] border border-white/20 text-white placeholder:text-[#6B7280] focus:outline-none focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent transition-all duration-300"
                required
              />
              <button
                type="submit"
                className="px-6 py-3 bg-[#D4AF37] text-[#0A2463] font-semibold rounded-lg hover:bg-[#D4AF37]/90 transition-all duration-300"
              >
                Subscribe
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Bottom Section: Social Media & Copyright */}
      <div className="border-t border-white/10 py-8">
        <div className="max-w-[1280px] mx-auto px-6 md:px-12">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            {/* Social Media Icons */}
            <div className="flex items-center gap-4">
              <a
                href="#twitter"
                className="text-[#6B7280] hover:text-white transition-colors duration-300"
                aria-label="Twitter"
              >
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z" />
                </svg>
              </a>
              <a
                href="#discord"
                className="text-[#6B7280] hover:text-white transition-colors duration-300"
                aria-label="Discord"
              >
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                </svg>
              </a>
              <a
                href="#telegram"
                className="text-[#6B7280] hover:text-white transition-colors duration-300"
                aria-label="Telegram"
              >
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15.056-.217.06-.094.14-.16.224-.21.143-.083.32-.106.476-.09z" />
                </svg>
              </a>
              <a
                href="#github"
                className="text-[#6B7280] hover:text-white transition-colors duration-300"
                aria-label="GitHub"
              >
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                  <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                </svg>
              </a>
            </div>

            {/* Blockchain Network Badges */}
            <div className="flex items-center gap-3">
              <span className="text-sm text-[#6B7280] font-medium">Powered by:</span>
              <div className="flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full hover:bg-white/20 transition-all duration-300">
                <span className="text-sm font-semibold">Hedera</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full hover:bg-white/20 transition-all duration-300">
                <span className="text-sm font-semibold">Flow</span>
              </div>
            </div>

            {/* Copyright */}
            <div className="text-[#6B7280] text-sm">
              © {new Date().getFullYear()} CargoShares. All rights reserved.
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}

