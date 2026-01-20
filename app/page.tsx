'use client';

import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';

// Custom hook for scroll animations
function useScrollAnimation(options = { threshold: 0.2 }) {
  const [isVisible, setIsVisible] = useState(false);
  const elementRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: options.threshold }
    );

    if (elementRef.current) {
      observer.observe(elementRef.current);
    }

    return () => observer.disconnect();
  }, [options.threshold]);

  return { isVisible, elementRef };
}

/**
 * Simplified Landing Page
 * Clean, minimal, mobile-first design
 */
export default function LandingPage() {
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [freeUnlocksRemaining, setFreeUnlocksRemaining] = useState(47);

  // Scroll animations for sections
  const howItWorksSection = useScrollAnimation({ threshold: 0.2 });
  const whatYouGetSection = useScrollAnimation({ threshold: 0.2 });
  const whyExistsSection = useScrollAnimation({ threshold: 0.3 });
  const coverageSection = useScrollAnimation({ threshold: 0.3 });
  const ctaSection = useScrollAnimation({ threshold: 0.3 });

  useEffect(() => {
    setMounted(true);

    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setAuthLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    // Fetch beta counter
    fetch('/api/beta/counter')
      .then(res => res.json())
      .then(data => {
        if (typeof data.remaining === 'number') {
          setFreeUnlocksRemaining(data.remaining);
        }
      })
      .catch(err => console.error('Failed to fetch beta counter:', err));

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#2D3748]">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-[#FDFBF7]/80 backdrop-blur-md border-b border-amber-100">
        {/* Animated gradient line */}
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-amber-400 via-orange-500 to-amber-400" style={{ backgroundSize: '200% 100%', animation: 'gradient-x 3s ease infinite' }} />

        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl blur-md opacity-50 group-hover:opacity-80 transition-opacity" />
              <div className="relative w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-amber-200 group-hover:scale-105 group-hover:rotate-3 transition-all">
                <HomeIcon className="w-5 h-5 text-white" />
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-bold bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 bg-clip-text text-transparent">K-Rent Safety</span>
              <span className="text-[10px] text-amber-600/60 font-medium tracking-wider uppercase hidden sm:block">Trusted Rental Analysis</span>
            </div>
          </Link>

          <div className="hidden md:flex items-center gap-2">
            {/* Auth Menu - Logged In Users */}
            {!authLoading && user && (
              <>
                <Link href="/dashboard" className="group px-4 py-2 rounded-xl text-sm font-medium text-[#4A5568] hover:text-amber-700 hover:bg-amber-50 transition-all flex items-center gap-2">
                  <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  Dashboard
                </Link>
                <Link href="/profile" className="group px-4 py-2 rounded-xl text-sm font-medium text-[#4A5568] hover:text-amber-700 hover:bg-amber-50 transition-all flex items-center gap-2">
                  <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Profile
                </Link>
                <button
                  onClick={handleLogout}
                  className="group px-4 py-2 rounded-xl text-sm font-medium text-[#4A5568] hover:text-red-600 hover:bg-red-50 transition-all flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Logout
                </button>
              </>
            )}

            {/* Auth Menu - Not Logged In */}
            {!authLoading && !user && (
              <>
                <Link href="/auth/login" className="group px-4 py-2 rounded-xl text-sm font-medium text-[#4A5568] hover:text-amber-700 hover:bg-amber-50 transition-all">
                  Log In
                </Link>
                <Link href="/auth/signup">
                  <button className="group px-5 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:shadow-lg hover:shadow-amber-200/50 transition-all hover:-translate-y-0.5 flex items-center gap-2">
                    Sign Up
                    <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden relative w-10 h-10 rounded-xl bg-amber-50 hover:bg-amber-100 transition-colors flex items-center justify-center"
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
        <div className={`md:hidden overflow-hidden transition-all duration-500 ease-out ${mobileMenuOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
          <div className="border-t border-amber-100 py-4 px-6 space-y-2 bg-[#FDFBF7]/95 backdrop-blur-md">
            {/* Auth Links */}
            {!authLoading && user && (
              <>
                <Link
                  href="/dashboard"
                  className="block px-6 py-3 rounded-xl text-sm font-medium text-[#4A5568] hover:text-amber-700 hover:bg-amber-50 transition-all"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Dashboard
                </Link>
                <Link
                  href="/profile"
                  className="block px-6 py-3 rounded-xl text-sm font-medium text-[#4A5568] hover:text-amber-700 hover:bg-amber-50 transition-all"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Profile
                </Link>
                <button
                  onClick={() => { handleLogout(); setMobileMenuOpen(false); }}
                  className="w-full text-left text-red-600 hover:bg-red-50 px-6 py-3 rounded-xl text-sm font-medium transition-all"
                >
                  Log Out
                </button>
              </>
            )}

            {!authLoading && !user && (
              <div className="space-y-2">
                <Link
                  href="/auth/login"
                  className="block px-6 py-3 rounded-xl text-sm font-medium text-[#4A5568] hover:text-amber-700 hover:bg-amber-50 transition-all"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Log In
                </Link>
                <Link
                  href="/auth/signup"
                  className="block bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:shadow-lg hover:shadow-amber-200/50 px-6 py-3.5 rounded-xl text-sm font-semibold text-center transition-all"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Sign Up Free
                </Link>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Animation styles */}
      <style jsx global>{`
        @keyframes gradient-x {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        @keyframes hero-pulse {
          0%, 100% {
            transform: scale(1);
            box-shadow: 0 10px 40px -10px rgba(251, 191, 36, 0.5);
          }
          50% {
            transform: scale(1.02);
            box-shadow: 0 20px 50px -10px rgba(251, 191, 36, 0.6);
          }
        }
        @keyframes hero-glow {
          0%, 100% {
            opacity: 0.4;
            transform: scale(1);
          }
          50% {
            opacity: 0.6;
            transform: scale(1.05);
          }
        }
        .animate-hero-pulse {
          animation: hero-pulse 2.5s ease-in-out infinite;
        }
        .animate-hero-glow {
          animation: hero-glow 2.5s ease-in-out infinite;
        }
      `}</style>

      {/* Section 1: Hero */}
      <section className="pt-28 pb-20 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className={`text-4xl md:text-5xl lg:text-6xl font-bold text-[#1A202C] leading-tight mb-6 transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            Stop overpaying for rent in Korea.
          </h1>
          <p className={`text-lg md:text-xl text-[#4A5568] mb-8 max-w-xl mx-auto transition-all duration-700 delay-100 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            Upload your quote. See if it's fair. Get negotiation scripts if it's not.
          </p>
          {/* Scarcity Counter */}
          {freeUnlocksRemaining > 0 && (
            <div className={`mb-8 transition-all duration-700 delay-150 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
              <span className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-200 rounded-full text-red-700 font-medium text-sm">
                <span className="text-lg">🔥</span>
                <span><span className="font-bold">{freeUnlocksRemaining}</span> free checks remaining</span>
                <span className="text-red-400">(then ₩39,900)</span>
              </span>
            </div>
          )}
          <div className={`transition-all duration-700 delay-200 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <Link href="/check">
              <button className="group relative px-10 py-5 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-lg rounded-2xl hover:shadow-2xl hover:shadow-amber-300/50 transition-all duration-300 hover:-translate-y-1 hover:scale-105 animate-hero-pulse">
                {/* Glow effect */}
                <span className="absolute inset-0 rounded-2xl bg-gradient-to-r from-amber-400 to-orange-400 blur-lg opacity-50 group-hover:opacity-75 transition-opacity animate-hero-glow" />
                <span className="relative flex items-center gap-3">
                  Check My Rent Free
                  <svg className="w-6 h-6 group-hover:translate-x-2 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </span>
              </button>
            </Link>
            <p className="mt-5 text-sm text-[#718096]">Results in 2 minutes</p>
          </div>
        </div>
      </section>

      {/* Section 2: How It Works */}
      <section
        ref={howItWorksSection.elementRef as React.RefObject<HTMLElement>}
        className={`py-24 px-6 bg-white transition-all duration-1000 ${howItWorksSection.isVisible ? 'opacity-100' : 'opacity-0'}`}
      >
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-amber-600 text-sm font-semibold tracking-wider uppercase">How it works</span>
            <h2 className="mt-4 text-3xl md:text-4xl font-bold text-[#1A202C]">
              Three simple steps
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-12">
            {/* Step 1 */}
            <div className={`text-center group transition-all duration-700 ${howItWorksSection.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`} style={{ transitionDelay: '0ms' }}>
              <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl flex items-center justify-center text-white text-2xl font-bold mx-auto mb-6 group-hover:scale-110 transition-transform shadow-lg">
                1
              </div>
              <h3 className="text-xl font-bold text-[#1A202C] mb-2">Choose your rental type</h3>
              <p className="text-[#718096]">Tell us if you have a jeonse or wolse contract</p>
            </div>

            {/* Step 2 */}
            <div className={`text-center group transition-all duration-700 ${howItWorksSection.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`} style={{ transitionDelay: '150ms' }}>
              <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-amber-600 rounded-2xl flex items-center justify-center text-white text-2xl font-bold mx-auto mb-6 group-hover:scale-110 transition-transform shadow-lg">
                2
              </div>
              <h3 className="text-xl font-bold text-[#1A202C] mb-2">Enter your quote</h3>
              <p className="text-[#718096]">Add your deposit amount and monthly rent</p>
            </div>

            {/* Step 3 */}
            <div className={`text-center group transition-all duration-700 ${howItWorksSection.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`} style={{ transitionDelay: '300ms' }}>
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center text-white text-2xl font-bold mx-auto mb-6 group-hover:scale-110 transition-transform shadow-lg">
                3
              </div>
              <h3 className="text-xl font-bold text-[#1A202C] mb-2">Get your report</h3>
              <p className="text-[#718096]">Receive your analysis in English, in about 2 minutes</p>
            </div>
          </div>

          <div className={`text-center transition-all duration-700 ${howItWorksSection.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`} style={{ transitionDelay: '450ms' }}>
            <Link href="/check">
              <button className="group px-10 py-5 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-lg rounded-2xl hover:shadow-xl hover:shadow-amber-200/50 transition-all hover:-translate-y-1 inline-flex items-center gap-3">
                Check My Rent Free
                <svg className="w-6 h-6 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* Section 3: What You Get */}
      <section
        ref={whatYouGetSection.elementRef as React.RefObject<HTMLElement>}
        className={`py-20 px-6 transition-all duration-1000 ${whatYouGetSection.isVisible ? 'opacity-100' : 'opacity-0'}`}
      >
        <div className="max-w-5xl mx-auto">
          <h2 className={`text-2xl md:text-3xl font-bold text-[#1A202C] text-center mb-12 transition-all duration-700 ${whatYouGetSection.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            See exactly what you'll get
          </h2>
          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Left: Tabbed Report Preview */}
            <ReportPreview />

            {/* Right: Bullet points */}
            <div className="space-y-5">
              <div className="flex items-start gap-4">
                <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-lg text-[#2D3748]">Safety score from 0 to 100</p>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-lg text-[#2D3748]">Compare your price to recent contracts</p>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-lg text-[#2D3748]">Risk warnings in plain English</p>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-lg text-[#2D3748]">Negotiation scripts to use with your landlord <span className="text-[#718096] text-base">(wolse only)</span></p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 4: Why This Exists */}
      <section
        ref={whyExistsSection.elementRef as React.RefObject<HTMLElement>}
        className={`py-20 px-6 bg-white transition-all duration-1000 ${whyExistsSection.isVisible ? 'opacity-100' : 'opacity-0'}`}
      >
        <div className="max-w-3xl mx-auto text-center">
          <h2 className={`text-2xl md:text-3xl font-bold text-[#1A202C] mb-6 transition-all duration-700 ${whyExistsSection.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            ₩2.28 trillion lost to deposit fraud in 2023.
          </h2>
          <p className={`text-lg text-[#4A5568] max-w-xl mx-auto transition-all duration-700 ${whyExistsSection.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`} style={{ transitionDelay: '150ms' }}>
            24,668 victims. Most were first-time renters who couldn't read the warning signs. We built this so you're not next.
          </p>
        </div>
      </section>

      {/* Section 5: Coverage */}
      <section
        ref={coverageSection.elementRef as React.RefObject<HTMLElement>}
        className={`py-20 px-6 transition-all duration-1000 ${coverageSection.isVisible ? 'opacity-100' : 'opacity-0'}`}
      >
        <div className="max-w-3xl mx-auto text-center">
          <h2 className={`text-2xl md:text-3xl font-bold text-[#1A202C] mb-6 transition-all duration-700 ${coverageSection.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            Apartments & 연립/다세대 in Seoul & Gyeonggi
          </h2>
          <p className={`text-lg text-[#4A5568] max-w-xl mx-auto transition-all duration-700 ${coverageSection.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`} style={{ transitionDelay: '150ms' }}>
            10,800+ apartments searchable by name, plus full support for 연립/다세대 (villa/townhouse) properties using neighborhood-level analysis.
          </p>
        </div>
      </section>

      {/* Section 6: Final CTA */}
      <section
        ref={ctaSection.elementRef as React.RefObject<HTMLElement>}
        className={`py-20 px-6 bg-gradient-to-br from-amber-500 to-orange-500 transition-all duration-1000 ${ctaSection.isVisible ? 'opacity-100' : 'opacity-0'}`}
      >
        <div className="max-w-3xl mx-auto text-center">
          <h2 className={`text-2xl md:text-3xl font-bold text-white mb-4 transition-all duration-700 ${ctaSection.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            Ready to check your rental?
          </h2>
          {/* Scarcity Counter */}
          {freeUnlocksRemaining > 0 && (
            <div className={`mb-8 transition-all duration-700 ${ctaSection.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`} style={{ transitionDelay: '100ms' }}>
              <span className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full text-white font-medium text-sm">
                <span className="text-lg">🔥</span>
                <span><span className="font-bold">{freeUnlocksRemaining}</span> free checks remaining</span>
              </span>
            </div>
          )}
          <div className={`transition-all duration-700 ${ctaSection.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`} style={{ transitionDelay: '150ms' }}>
            <Link href="/check">
              <button className="group px-10 py-5 bg-white text-amber-600 font-bold text-lg rounded-2xl hover:shadow-2xl transition-all hover:-translate-y-1 inline-flex items-center gap-3">
                Check My Rent Free
                <svg className="w-6 h-6 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </button>
            </Link>
          </div>
          <p className={`mt-6 text-sm text-white/80 transition-all duration-700 ${ctaSection.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`} style={{ transitionDelay: '300ms' }}>
            Results in 2 minutes
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 px-6 bg-[#1A202C] text-white">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            {/* Brand */}
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center">
                  <HomeIcon className="w-5 h-5 text-white" />
                </div>
                <span className="text-lg font-semibold">K-Rent Safety</span>
              </div>
              <p className="text-white/60 leading-relaxed max-w-sm">
                Helping foreigners in Korea protect their deposits and verify fair rent prices with clear, English-language analysis.
              </p>
            </div>

            {/* Services */}
            <div>
              <div className="text-white/40 text-sm uppercase tracking-wider mb-4">Services</div>
              <div className="space-y-3">
                <Link href="/analyze/jeonse" className="block text-white/70 hover:text-white transition-colors">Jeonse Check</Link>
                <Link href="/analyze/wolse" className="block text-white/70 hover:text-white transition-colors">Wolse Check</Link>
                <Link href="/pricing" className="block text-white/70 hover:text-white transition-colors">Pricing</Link>
              </div>
            </div>

            {/* Legal */}
            <div>
              <div className="text-white/40 text-sm uppercase tracking-wider mb-4">Legal</div>
              <div className="space-y-3">
                <Link href="/terms" className="block text-white/70 hover:text-white transition-colors">Terms of Service</Link>
                <Link href="/terms#refund-policy" className="block text-white/70 hover:text-white transition-colors">Refund Policy</Link>
                <Link href="/terms#disclaimer" className="block text-white/70 hover:text-white transition-colors">Disclaimer</Link>
              </div>
            </div>
          </div>

          {/* Contact Info */}
          <div className="pb-8 border-b border-white/10 mb-8">
            <div className="text-white/40 text-sm uppercase tracking-wider mb-4">Contact</div>
            <div className="flex flex-wrap gap-6 text-white/70">
              <p>ktaesoo611@gmail.com</p>
              <p>010-2382-8432</p>
            </div>
          </div>

          <div className="flex flex-col md:flex-row justify-between gap-4 text-white/40 text-sm">
            <div>
              <p>Jeonse Safety Research | Representative: Kim Tae-soo</p>
              <p>Business Registration: 595-47-01161</p>
            </div>
            <div className="md:text-right">
              <p>101-601, 407 Wangsimni-ro, Jung-gu, Seoul</p>
              <p>2025 All rights reserved</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

// Tabbed Report Preview Component
function ReportPreview() {
  const [activeTab, setActiveTab] = useState(0);
  const tabs = ['Risk', 'Market', 'Actions'];
  const fullTabs = ['Risk Analysis', 'Market Position', 'Action Items'];

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
      {/* Browser Header */}
      <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-3 sm:px-4 py-2.5 sm:py-3 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-red-400"></div>
            <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-yellow-400"></div>
            <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-green-400"></div>
          </div>
          <span className="text-[9px] sm:text-[10px] text-gray-400 font-medium truncate ml-2">Sample Report</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-100">
        {tabs.map((tab, i) => (
          <button
            key={tab}
            onClick={() => setActiveTab(i)}
            className={`flex-1 px-2 sm:px-3 py-2.5 text-[10px] sm:text-[11px] font-medium transition-colors whitespace-nowrap ${
              activeTab === i
                ? 'text-amber-600 border-b-2 border-amber-500 bg-amber-50/50'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <span className="sm:hidden">{tab}</span>
            <span className="hidden sm:inline">{fullTabs[i]}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="p-3 sm:p-4 min-h-[350px] sm:min-h-[400px] max-h-[350px] sm:max-h-[400px] overflow-y-auto">
        {/* Tab 1: Risk Analysis */}
        {activeTab === 0 && (
          <div className="space-y-3">
            {/* Safety Score Header */}
            <div className="text-center pb-3 border-b border-gray-100">
              <div className="inline-block px-2 sm:px-2.5 py-1 bg-red-100 text-red-700 text-[9px] sm:text-[10px] font-semibold rounded-full mb-2">
                Critical Risk
              </div>
              <div className="text-[10px] sm:text-xs text-gray-500 mb-0.5">Safety Score</div>
              <div className="text-2xl sm:text-3xl font-bold text-red-500">23<span className="text-xs sm:text-sm text-gray-400">/100</span></div>
            </div>

            {/* Detailed Scores */}
            <div className="space-y-2">
              <div className="text-[9px] sm:text-[10px] font-semibold text-gray-600 uppercase tracking-wide">Detailed Scores</div>
              <div className="space-y-2">
                {[
                  { label: 'LTV', weight: '40%', score: 0, color: 'red' },
                  { label: 'Legal', weight: '30%', score: 0, color: 'red' },
                  { label: 'Trend', weight: '15%', score: 85, color: 'green' },
                  { label: 'Building', weight: '15%', score: 70, color: 'amber' },
                ].map((item) => (
                  <div key={item.label}>
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-[10px] sm:text-[11px] text-gray-600">{item.label} ({item.weight})</span>
                      <span className={`text-[10px] sm:text-[11px] font-semibold text-${item.color}-500`}>{item.score}/100</span>
                    </div>
                    <div className="w-full h-1.5 sm:h-2 bg-gray-100 rounded-full">
                      <div className={`h-full bg-${item.color}-500 rounded-full`} style={{ width: `${item.score}%` }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Debt & Priority */}
            <div className="bg-gray-50 rounded-lg p-2.5 sm:p-3">
              <div className="text-[10px] sm:text-[11px] font-semibold text-gray-700 mb-2">Debt Analysis</div>
              <div className="grid grid-cols-3 gap-1.5 sm:gap-2 text-center">
                <div className="bg-white rounded p-1.5 sm:p-2">
                  <div className="text-[8px] sm:text-[9px] text-gray-500">Total Debt</div>
                  <div className="text-xs sm:text-sm font-bold text-red-500">₩70.5억</div>
                </div>
                <div className="bg-white rounded p-1.5 sm:p-2">
                  <div className="text-[8px] sm:text-[9px] text-gray-500">Deposit</div>
                  <div className="text-xs sm:text-sm font-bold text-amber-600">₩18.0억</div>
                </div>
                <div className="bg-white rounded p-1.5 sm:p-2">
                  <div className="text-[8px] sm:text-[9px] text-gray-500">Equity</div>
                  <div className="text-xs sm:text-sm font-bold text-red-600">-₩24억</div>
                </div>
              </div>
              <div className="mt-2 text-[9px] sm:text-[10px] text-red-600 text-center bg-red-50 rounded py-1">
                Negative equity! Debt exceeds value.
              </div>
            </div>

            {/* Detected Risks */}
            <div className="space-y-1.5">
              <div className="text-[10px] sm:text-[11px] font-semibold text-gray-700">Detected Risks (8)</div>
              {[
                { level: 'CRITICAL', name: 'Seizure', desc: 'Active seizure. AVOID!', color: 'red' },
                { level: 'CRITICAL', name: 'Auction', desc: 'In foreclosure. DO NOT PROCEED.', color: 'red' },
                { level: 'HIGH', name: 'Mortgage', desc: '₩12.8억 senior mortgage.', color: 'amber' },
                { level: 'HIGH', name: 'Jeonse', desc: '2 tenants, ₩51억 deposits.', color: 'amber' },
              ].map((risk) => (
                <div key={risk.name} className={`bg-${risk.color}-50 border border-${risk.color}-100 rounded-lg p-2`}>
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className={`px-1 py-0.5 bg-${risk.color}-500 text-white text-[7px] sm:text-[8px] font-bold rounded`}>{risk.level}</span>
                    <span className={`text-[10px] sm:text-[11px] font-medium text-${risk.color}-800`}>{risk.name}</span>
                  </div>
                  <p className={`text-[9px] sm:text-[10px] text-${risk.color}-600`}>{risk.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 2: Market Position */}
        {activeTab === 1 && (
          <div className="space-y-3">
            {/* Price Comparison - Stack on very small screens */}
            <div className="space-y-2">
              <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                <div className="bg-gray-50 rounded-lg p-2 sm:p-2.5 text-center">
                  <div className="text-[8px] sm:text-[9px] text-gray-500">Your Rent</div>
                  <div className="text-base sm:text-lg font-bold text-gray-800">400만</div>
                </div>
                <div className="bg-blue-50 rounded-lg p-2 sm:p-2.5 text-center">
                  <div className="text-[8px] sm:text-[9px] text-blue-600">Expected</div>
                  <div className="text-base sm:text-lg font-bold text-blue-600">353만</div>
                </div>
                <div className="bg-red-50 rounded-lg p-2 sm:p-2.5 text-center">
                  <div className="text-[8px] sm:text-[9px] text-red-600">Diff</div>
                  <div className="text-base sm:text-lg font-bold text-red-500">+47만</div>
                </div>
              </div>
              <div className="text-center text-[9px] sm:text-[10px] text-gray-500">
                +13.3% above market • at ₩18억 deposit
              </div>
            </div>

            {/* Simplified Chart for Mobile */}
            <div className="bg-gray-50 rounded-lg p-2.5 sm:p-3">
              <div className="text-[9px] sm:text-[10px] font-medium text-gray-700 mb-2">Rent Trend (12 months)</div>
              <div className="relative h-16 sm:h-20">
                <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between text-[7px] sm:text-[8px] text-gray-400">
                  <span>450</span>
                  <span>350</span>
                  <span>250</span>
                </div>
                <div className="ml-6 sm:ml-7 h-full relative">
                  <div className="absolute top-1 left-0 right-0 border-t-2 border-dashed border-red-400"></div>
                  <div className="absolute top-7 sm:top-8 left-0 right-0 border-t-2 border-blue-400"></div>
                  <div className="absolute top-5 sm:top-6 left-[15%] w-1.5 h-1.5 sm:w-2 sm:h-2 bg-green-500 rounded-full"></div>
                  <div className="absolute top-8 sm:top-10 left-[40%] w-1.5 h-1.5 sm:w-2 sm:h-2 bg-green-500 rounded-full"></div>
                  <div className="absolute top-10 sm:top-12 left-[65%] w-1.5 h-1.5 sm:w-2 sm:h-2 bg-green-500 rounded-full"></div>
                  <div className="absolute top-7 sm:top-8 left-[85%] w-1.5 h-1.5 sm:w-2 sm:h-2 bg-green-500 rounded-full"></div>
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 mt-2 text-[7px] sm:text-[8px]">
                <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-green-500 rounded-full"></span>Txns</span>
                <span className="flex items-center gap-1"><span className="w-2 sm:w-3 h-0.5 bg-blue-400"></span>Expected</span>
                <span className="flex items-center gap-1"><span className="w-2 sm:w-3 h-0.5 border-t border-dashed border-red-400"></span>Yours</span>
              </div>
            </div>

            {/* Alerts */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 sm:p-2.5">
              <div className="text-[9px] sm:text-[10px] font-semibold text-amber-700 mb-0.5">Above Market (+13.3%)</div>
              <p className="text-[9px] sm:text-[10px] text-amber-600">₩47만/month over expected. Room for negotiation.</p>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-2 sm:p-2.5">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-[9px] sm:text-[10px] font-semibold text-green-700">Trend: Declining (-4.3%)</span>
              </div>
              <p className="text-[9px] sm:text-[10px] text-green-600">Market favors tenants.</p>
            </div>

            {/* Recent Transactions - Simplified for mobile */}
            <div className="bg-white border border-gray-200 rounded-lg p-2 sm:p-2.5">
              <div className="text-[9px] sm:text-[10px] font-semibold text-gray-700 mb-2">Recent Transactions</div>
              <div className="space-y-1.5 text-[9px] sm:text-[10px]">
                {[
                  { date: '11.26', floor: '23F', price: '₩16억/460만' },
                  { date: '11.17', floor: '29F', price: '₩16억/380만' },
                  { date: '07.23', floor: '8F', price: '₩18억/320만' },
                  { date: '04.14', floor: '7F', price: '₩15억/500만' },
                ].map((tx, i) => (
                  <div key={i} className="flex items-center justify-between py-1 border-b border-gray-50 last:border-0">
                    <span className="text-gray-500">{tx.date}</span>
                    <span className="text-gray-500">{tx.floor}</span>
                    <span className="font-medium text-gray-700">{tx.price}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Savings */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-2 sm:p-2.5 text-center">
              <div className="text-[8px] sm:text-[9px] text-green-600">Potential Savings</div>
              <div className="text-lg sm:text-xl font-bold text-green-600">₩564만<span className="text-[10px] sm:text-xs font-normal">/yr</span></div>
            </div>
          </div>
        )}

        {/* Tab 3: Action Items */}
        {activeTab === 2 && (
          <div className="space-y-3">
            {/* Mandatory Actions */}
            <div className="bg-red-50 border border-red-200 rounded-lg p-2 sm:p-2.5">
              <div className="text-[9px] sm:text-[10px] font-bold text-red-700 mb-1.5">🚨 Mandatory</div>
              <div className="space-y-1">
                <div className="flex items-start gap-1.5">
                  <span className="text-red-500 text-[10px]">✗</span>
                  <span className="text-[9px] sm:text-[10px] text-red-700 font-medium">DO NOT SIGN - Risk too high</span>
                </div>
                <div className="flex items-start gap-1.5">
                  <span className="text-red-500 text-[10px]">✗</span>
                  <span className="text-[9px] sm:text-[10px] text-red-700">Find different property</span>
                </div>
              </div>
            </div>

            {/* Negotiation Scripts */}
            <div className="space-y-2">
              <div className="text-[9px] sm:text-[10px] font-semibold text-gray-700">Negotiation Scripts</div>
              <div className="bg-green-50 border border-green-200 rounded-lg p-2 sm:p-2.5">
                <div className="flex flex-wrap items-center justify-between gap-1 mb-1.5">
                  <div className="flex items-center gap-1">
                    <span className="text-[9px] sm:text-[10px] font-semibold text-green-700">Expected Rent</span>
                    <span className="px-1 py-0.5 bg-green-500 text-white text-[6px] sm:text-[7px] font-bold rounded">REC</span>
                  </div>
                  <span className="text-[8px] sm:text-[9px] font-bold text-green-600">Save ₩564만/yr</span>
                </div>
                <div className="bg-white rounded p-1.5 sm:p-2 text-[8px] sm:text-[9px] text-gray-600 leading-relaxed border border-green-100 italic">
                  "Based on recent contracts, expected rent at ₩18억 is 353만원. I'd like to adjust to this level."
                </div>
                <button className="mt-1.5 w-full py-1.5 bg-green-600 text-white text-[8px] sm:text-[9px] font-medium rounded active:bg-green-700">
                  Copy Script
                </button>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 sm:p-2.5">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[9px] sm:text-[10px] font-semibold text-blue-700">5% Discount</span>
                  <span className="text-[8px] sm:text-[9px] font-bold text-blue-600">Save ₩776만/yr</span>
                </div>
                <div className="bg-white rounded p-1.5 sm:p-2 text-[8px] sm:text-[9px] text-gray-600 leading-relaxed border border-blue-100 italic">
                  "Given market conditions, I'm hoping for 335만원 - a modest 5% discount."
                </div>
                <button className="mt-1.5 w-full py-1.5 bg-blue-600 text-white text-[8px] sm:text-[9px] font-medium rounded active:bg-blue-700">
                  Copy Script
                </button>
              </div>
            </div>

            {/* Checklists */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 sm:p-2.5">
              <div className="text-[9px] sm:text-[10px] font-semibold text-amber-800 mb-1.5">Before Signing</div>
              <div className="space-y-1">
                {['Verify 등기부등본', 'Confirm no new debts', 'Bank transfer for deposit', 'Special contract terms'].map((item) => (
                  <div key={item} className="flex items-center gap-1.5">
                    <div className="w-3 h-3 sm:w-3.5 sm:h-3.5 border border-amber-400 rounded bg-white flex-shrink-0"></div>
                    <span className="text-[8px] sm:text-[9px] text-amber-700">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 sm:p-2.5">
              <div className="text-[9px] sm:text-[10px] font-semibold text-blue-800 mb-1.5">After Signing</div>
              <div className="space-y-1">
                {['Move in & occupy', '전입신고 (same day)', '확정일자 at 주민센터', 'F-visa: 체류지변경신고'].map((item) => (
                  <div key={item} className="flex items-center gap-1.5">
                    <div className="w-3 h-3 sm:w-3.5 sm:h-3.5 border border-blue-400 rounded bg-white flex-shrink-0"></div>
                    <span className="text-[8px] sm:text-[9px] text-blue-700">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Icon component
function HomeIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  );
}
