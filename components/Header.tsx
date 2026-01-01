'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useHaptic } from '@/lib/hooks/useHaptic';
import type { User } from '@supabase/supabase-js';

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);
  const haptic = useHaptic();

  useEffect(() => {
    // Get initial user
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setIsLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  };

  const isActive = (path: string) => pathname === path;

  return (
    <>
      <header
        className={`
          fixed top-0 w-full z-50 transition-all duration-500
          ${scrolled
            ? 'bg-white/95 backdrop-blur-xl shadow-lg shadow-amber-900/10 border-b border-amber-100'
            : 'bg-gradient-to-r from-[#FDFBF7]/90 via-white/80 to-[#FEF7ED]/90 backdrop-blur-md border-b border-amber-100/50'
          }
        `}
      >
        {/* Animated gradient line at top */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 via-orange-500 to-amber-400 background-animate" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 md:h-20">
            {/* Logo */}
            <Link href="/" className="flex items-center group relative">
              <div className="flex items-center gap-3">
                {/* Animated logo container */}
                <div className="relative">
                  {/* Glow effect */}
                  <div className="absolute inset-0 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl blur-lg opacity-40 group-hover:opacity-70 transition-opacity duration-500 scale-110" />
                  <div className="relative w-10 h-10 md:w-11 md:h-11 bg-gradient-to-br from-amber-500 via-orange-500 to-amber-600 rounded-xl flex items-center justify-center shadow-lg shadow-amber-300/50 group-hover:shadow-amber-400/60 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                    <svg className="w-5 h-5 md:w-6 md:h-6 text-white drop-shadow-sm" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                  </div>
                </div>
                <div className="flex flex-col">
                  <span className="text-lg md:text-xl font-bold bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 bg-clip-text text-transparent group-hover:from-amber-500 group-hover:to-orange-500 transition-all duration-300">
                    K-Rent Safety
                  </span>
                  <span className="text-[10px] text-amber-600/70 font-medium tracking-wider uppercase hidden sm:block">
                    Trusted Rental Analysis
                  </span>
                </div>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              {/* Home Link */}
              <NavLink href="/" active={isActive('/')}>
                Home
              </NavLink>

              {/* Services Dropdown */}
              <div
                className="relative"
                onMouseEnter={() => setServicesOpen(true)}
                onMouseLeave={() => setServicesOpen(false)}
              >
                <button
                  className={`
                    relative px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-300
                    flex items-center gap-1.5 group
                    ${servicesOpen
                      ? 'text-amber-700 bg-amber-50'
                      : 'text-[#4A5568] hover:text-amber-700 hover:bg-amber-50/70'
                    }
                  `}
                >
                  <span>Services</span>
                  <svg
                    className={`w-4 h-4 transition-transform duration-300 ${servicesOpen ? 'rotate-180' : ''}`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                  {/* Active dot indicator */}
                  {(isActive('/analyze/jeonse') || isActive('/analyze/wolse')) && (
                    <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-amber-500 rounded-full" />
                  )}
                </button>

                {/* Dropdown Menu */}
                <div
                  className={`
                    absolute top-full left-1/2 -translate-x-1/2 mt-2 w-72
                    transition-all duration-300 transform origin-top
                    ${servicesOpen
                      ? 'opacity-100 visible scale-100 translate-y-0'
                      : 'opacity-0 invisible scale-95 -translate-y-2'
                    }
                  `}
                >
                  {/* Arrow */}
                  <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white rotate-45 border-l border-t border-amber-100 rounded-tl-sm" />

                  <div className="relative bg-white rounded-2xl shadow-2xl shadow-amber-200/40 border border-amber-100 overflow-hidden">
                    {/* Jeonse Check */}
                    <Link
                      href="/analyze/jeonse"
                      className="flex items-center gap-4 px-5 py-4 hover:bg-gradient-to-r hover:from-amber-50 hover:to-orange-50 transition-all duration-300 group/item border-b border-amber-50"
                    >
                      <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl blur opacity-40 group-hover/item:opacity-70 transition-opacity" />
                        <div className="relative w-11 h-11 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-200 group-hover/item:scale-110 group-hover/item:rotate-3 transition-all duration-300">
                          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                          </svg>
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-[#1A202C] text-sm group-hover/item:text-amber-700 transition-colors flex items-center gap-2">
                          Jeonse Check
                          <span className="px-1.5 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold rounded-md uppercase">Free</span>
                        </div>
                        <div className="text-xs text-[#718096] mt-0.5">Deposit safety + price analysis</div>
                      </div>
                      <svg className="w-4 h-4 text-amber-400 opacity-0 group-hover/item:opacity-100 group-hover/item:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>

                    {/* Wolse Check */}
                    <Link
                      href="/analyze/wolse"
                      className="flex items-center gap-4 px-5 py-4 hover:bg-gradient-to-r hover:from-orange-50 hover:to-amber-50 transition-all duration-300 group/item"
                    >
                      <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-br from-orange-400 to-amber-500 rounded-xl blur opacity-40 group-hover/item:opacity-70 transition-opacity" />
                        <div className="relative w-11 h-11 rounded-xl bg-gradient-to-br from-orange-400 to-amber-600 flex items-center justify-center shadow-lg shadow-orange-200 group-hover/item:scale-110 group-hover/item:rotate-3 transition-all duration-300">
                          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-[#1A202C] text-sm group-hover/item:text-orange-700 transition-colors flex items-center gap-2">
                          Wolse Check
                          <span className="px-1.5 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold rounded-md uppercase">Free</span>
                        </div>
                        <div className="text-xs text-[#718096] mt-0.5">Deposit safety + rent analysis</div>
                      </div>
                      <svg className="w-4 h-4 text-orange-400 opacity-0 group-hover/item:opacity-100 group-hover/item:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </div>
                </div>
              </div>

              {user ? (
                <>
                  <NavLink href="/dashboard" active={isActive('/dashboard')}>
                    My Analyses
                  </NavLink>
                  <NavLink href="/profile" active={isActive('/profile')}>
                    Profile
                  </NavLink>

                  {/* Divider */}
                  <div className="w-px h-6 bg-gradient-to-b from-transparent via-amber-200 to-transparent mx-2" />

                  <button
                    onClick={handleLogout}
                    className="text-[#4A5568] hover:text-red-600 hover:bg-red-50 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-300"
                  >
                    Log Out
                  </button>
                </>
              ) : (
                <>
                  {!isLoading && (
                    <>
                      <NavLink href="/auth/login" active={isActive('/auth/login')}>
                        Log In
                      </NavLink>

                      {/* Divider */}
                      <div className="w-px h-6 bg-gradient-to-b from-transparent via-amber-200 to-transparent mx-2" />

                      {/* CTA Button */}
                      <Link href="/auth/signup">
                        <button className="relative group px-6 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 overflow-hidden">
                          {/* Background gradient */}
                          <div className="absolute inset-0 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 background-animate" />
                          {/* Shine effect */}
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                          {/* Shadow */}
                          <div className="absolute inset-0 rounded-xl shadow-lg shadow-amber-300/50 group-hover:shadow-amber-400/60 transition-shadow" />
                          <span className="relative text-white flex items-center gap-2">
                            Sign Up
                            <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                            </svg>
                          </span>
                        </button>
                      </Link>
                    </>
                  )}
                </>
              )}
            </nav>

            {/* Mobile Menu Button */}
            <button
              onClick={(e) => {
                haptic.menu(e.currentTarget);
                setMobileMenuOpen(!mobileMenuOpen);
              }}
              className="md:hidden relative w-10 h-10 rounded-xl bg-amber-50 hover:bg-amber-100 transition-colors flex items-center justify-center group"
              aria-label="Toggle menu"
            >
              <div className="w-5 h-4 flex flex-col justify-between">
                <span className={`w-full h-0.5 bg-amber-600 rounded-full transition-all duration-300 origin-center ${mobileMenuOpen ? 'rotate-45 translate-y-1.5' : ''}`} />
                <span className={`w-full h-0.5 bg-amber-600 rounded-full transition-all duration-300 ${mobileMenuOpen ? 'opacity-0 scale-0' : ''}`} />
                <span className={`w-full h-0.5 bg-amber-600 rounded-full transition-all duration-300 origin-center ${mobileMenuOpen ? '-rotate-45 -translate-y-2' : ''}`} />
              </div>
            </button>
          </div>

          {/* Mobile Menu */}
          <div
            className={`
              md:hidden overflow-hidden transition-all duration-500 ease-out
              ${mobileMenuOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}
            `}
          >
            <div className="border-t border-amber-100 py-4 space-y-2">
              <MobileNavLink href="/" onClick={() => setMobileMenuOpen(false)} active={isActive('/')}>
                Home
              </MobileNavLink>

              {/* Services Section */}
              <div className="px-4 py-3 bg-amber-50/50 rounded-2xl mx-2">
                <div className="text-xs text-amber-700 uppercase tracking-wider font-semibold mb-3 flex items-center gap-2">
                  <span className="w-4 h-px bg-amber-300" />
                  Services
                  <span className="flex-1 h-px bg-amber-300" />
                </div>
                <Link
                  href="/analyze/jeonse"
                  className="flex items-center gap-3 px-3 py-3 hover:bg-white rounded-xl transition-all mb-2 group"
                  onClick={(e) => {
                    haptic.navigation(e.currentTarget);
                    setMobileMenuOpen(false);
                  }}
                >
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-md shadow-amber-200 group-hover:scale-105 transition-transform">
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-[#1A202C] text-sm">Jeonse Check</div>
                    <div className="text-xs text-[#718096]">Deposit safety + price analysis</div>
                  </div>
                </Link>
                <Link
                  href="/analyze/wolse"
                  className="flex items-center gap-3 px-3 py-3 hover:bg-white rounded-xl transition-all group"
                  onClick={(e) => {
                    haptic.navigation(e.currentTarget);
                    setMobileMenuOpen(false);
                  }}
                >
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-400 to-amber-600 flex items-center justify-center shadow-md shadow-orange-200 group-hover:scale-105 transition-transform">
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-[#1A202C] text-sm">Wolse Check</div>
                    <div className="text-xs text-[#718096]">Deposit safety + rent analysis</div>
                  </div>
                </Link>
              </div>

              {user ? (
                <>
                  <MobileNavLink href="/dashboard" onClick={() => setMobileMenuOpen(false)} active={isActive('/dashboard')}>
                    My Analyses
                  </MobileNavLink>
                  <MobileNavLink href="/profile" onClick={() => setMobileMenuOpen(false)} active={isActive('/profile')}>
                    Profile
                  </MobileNavLink>
                  <button
                    onClick={(e) => {
                      haptic.medium(e.currentTarget);
                      handleLogout();
                      setMobileMenuOpen(false);
                    }}
                    className="w-full text-left text-red-600 hover:bg-red-50 px-6 py-3 rounded-xl text-sm font-medium transition-all mx-2"
                    style={{ width: 'calc(100% - 16px)' }}
                  >
                    Log Out
                  </button>
                </>
              ) : (
                <>
                  {!isLoading && (
                    <div className="px-2 pt-2 space-y-2">
                      <MobileNavLink href="/auth/login" onClick={() => setMobileMenuOpen(false)} active={isActive('/auth/login')}>
                        Log In
                      </MobileNavLink>
                      <Link
                        href="/auth/signup"
                        className="block bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:shadow-lg hover:shadow-amber-200/50 px-6 py-3.5 rounded-xl text-sm font-semibold text-center transition-all"
                        onClick={(e) => {
                          haptic.medium(e.currentTarget);
                          setMobileMenuOpen(false);
                        }}
                      >
                        Sign Up Free
                      </Link>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Spacer */}
      <div className="h-16 md:h-20" />

      {/* CSS for animated gradient */}
      <style jsx global>{`
        @keyframes gradient-x {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        .background-animate {
          background-size: 200% 200%;
          animation: gradient-x 3s ease infinite;
        }
      `}</style>
    </>
  );
}

// Nav Link Component
function NavLink({ href, children, active }: { href: string; children: React.ReactNode; active: boolean }) {
  return (
    <Link
      href={href}
      className={`
        relative px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-300
        ${active
          ? 'text-amber-700 bg-amber-50'
          : 'text-[#4A5568] hover:text-amber-700 hover:bg-amber-50/70'
        }
      `}
    >
      {children}
      {active && (
        <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-amber-500 rounded-full" />
      )}
    </Link>
  );
}

// Mobile Nav Link Component
function MobileNavLink({ href, children, onClick, active }: { href: string; children: React.ReactNode; onClick: () => void; active: boolean }) {
  const haptic = useHaptic();

  return (
    <Link
      href={href}
      className={`
        block px-6 py-3 rounded-xl text-sm font-medium transition-all mx-2
        ${active
          ? 'text-amber-700 bg-amber-50'
          : 'text-[#4A5568] hover:text-amber-700 hover:bg-amber-50'
        }
      `}
      onClick={(e) => {
        haptic.navigation(e.currentTarget);
        onClick();
      }}
    >
      {children}
    </Link>
  );
}
