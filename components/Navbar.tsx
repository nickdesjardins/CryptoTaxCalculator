'use client'; // Add this directive for useState hook

import Link from 'next/link';
import { useState } from 'react';

const Navbar = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  // Simple SVG icons
  const HamburgerIcon = () => (
    <svg
      className="w-6 h-6"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 6h16M4 12h16m-7 6h7" // Adjusted middle line
      />
    </svg>
  );

  const CloseIcon = () => (
    <svg
      className="w-6 h-6"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M6 18L18 6M6 6l12 12"
      />
    </svg>
  );


  return (
    <header className="font-sans">
      {/* Red Top Bar */}
      <div className="bg-brand-red text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-10"> {/* Adjusted height */}
            {/* Site Title */}
            <div className="flex-shrink-0">
              <Link href="/" className="text-lg font-semibold"> {/* Adjusted size/weight */}
                Coin2Cad
              </Link>
            </div>
            {/* Optional: Add language toggle or other minimal elements here if needed */}
          </div>
        </div>
      </div>

      {/* White Main Navigation Bar */}
      <nav className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14"> {/* Adjusted height */}
            {/* Placeholder for potential logo/brand mark if different from title */}
            <div className="flex-shrink-0">
              {/* Could add a small logo here if desired */}
              <span className="sr-only">Main Navigation</span> {/* Accessibility */}
            </div>

            {/* Desktop Links */}
            <div className="hidden md:flex items-center space-x-6"> {/* Adjusted spacing */}
              <Link href="/" className="text-gray-800 hover:underline px-3 py-2 text-sm font-medium"> {/* Adjusted styles */}
                Home
              </Link>
              <Link href="/upload" className="text-gray-800 hover:underline px-3 py-2 text-sm font-medium"> {/* Adjusted styles */}
                Coin to CAD
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden flex items-center">
              <button
                onClick={toggleMobileMenu}
                type="button"
                className="inline-flex items-center justify-center p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-brand-red" // Adjusted colors
                aria-controls="mobile-menu"
                aria-expanded={isMobileMenuOpen}
              >
                <span className="sr-only">Open main menu</span>
                {isMobileMenuOpen ? <CloseIcon /> : <HamburgerIcon />}
              </button>
            </div>

             {/* Spacer for Desktop view to push mobile button right if no logo/placeholder used */}
             <div className="hidden md:flex flex-grow"></div>

          </div>
        </div>

        {/* Mobile Menu */}
        {/* Improved mobile menu: full width, better styling */}
        <div className={`md:hidden ${isMobileMenuOpen ? 'block' : 'hidden'} absolute top-0 inset-x-0 h-screen z-50 bg-white transform transition ease-in-out duration-300 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`} id="mobile-menu">
           <div className="pt-5 pb-3 px-4 space-y-1">
             {/* Mobile Menu Header (optional: add close button here too) */}
             <div className="flex justify-between items-center mb-4">
                <span className="text-lg font-semibold text-gray-900">Menu</span>
                <button onClick={toggleMobileMenu} className="p-2 text-gray-600 hover:text-gray-900">
                    <CloseIcon />
                </button>
             </div>
             {/* Mobile Links */}
             <Link
               href="/"
               className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900"
               onClick={() => setIsMobileMenuOpen(false)}
             >
               Home
             </Link>
             <Link
               href="/upload"
               className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900"
               onClick={() => setIsMobileMenuOpen(false)}
             >
               Coin to CAD
             </Link>
           </div>
         </div>
      </nav>
    </header>
  );
};

export default Navbar;