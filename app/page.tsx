'use client';

import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { useScrollAnimation } from '@/lib/hooks/useScrollAnimation';
import { useHaptic } from '@/lib/hooks/useHaptic';
import { supabase } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';

/**
 * Premium Landing Page V4 - Updated with Both Services
 * Design: Warm, Trustworthy, Neighborly
 * Services: Jeonse Safety Check + Wolse Price Check
 */
export default function LandingPageV4() {
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Haptic feedback
  const haptic = useHaptic();

  const servicesSection = useScrollAnimation({ threshold: 0.2 });
  const aboutSection = useScrollAnimation({ threshold: 0.2 });
  const processSection = useScrollAnimation({ threshold: 0.2 });
  const trustSection = useScrollAnimation({ threshold: 0.2 });
  const ctaSection = useScrollAnimation({ threshold: 0.3 });

  useEffect(() => {
    setMounted(true);

    // Get initial user
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setAuthLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#2D3748] selection:bg-amber-200 selection:text-amber-900">
      {/* Warm gradient background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-[#FEF7ED] via-[#FDFBF7] to-[#F5F0E8]" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 5L35 15H25L30 5z' fill='%23B8860B' fill-opacity='0.4'/%3E%3C/svg%3E")`,
            backgroundSize: '60px 60px'
          }}
        />
        <div className="absolute top-20 left-[10%] w-64 h-64 bg-amber-200/20 rounded-full blur-3xl animate-float-slow" />
        <div className="absolute top-[40%] right-[5%] w-48 h-48 bg-orange-200/20 rounded-full blur-3xl animate-float-slow-reverse" />
        <div className="absolute bottom-[20%] left-[20%] w-56 h-56 bg-yellow-200/15 rounded-full blur-3xl animate-float" />
        <div className="absolute top-[60%] right-[25%] w-40 h-40 bg-green-200/10 rounded-full blur-3xl animate-float-slow" />
      </div>

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
            {/* Navigation Links */}
            <a href="#services" className="px-4 py-2.5 rounded-xl text-sm font-medium text-[#4A5568] hover:text-amber-700 hover:bg-amber-50 transition-all">
              Services
            </a>
            <a href="#how-it-works" className="px-4 py-2.5 rounded-xl text-sm font-medium text-[#4A5568] hover:text-amber-700 hover:bg-amber-50 transition-all">
              How It Works
            </a>
            <Link href="/pricing" className="px-4 py-2.5 rounded-xl text-sm font-medium text-[#4A5568] hover:text-amber-700 hover:bg-amber-50 transition-all">
              Pricing
            </Link>

            {/* Primary CTA */}
            <Link href="/check">
              <button className="group px-5 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:shadow-lg hover:shadow-amber-200/50 transition-all hover:-translate-y-0.5 flex items-center gap-2">
                Check My Rental
                <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </button>
            </Link>

            <div className="w-px h-6 bg-gradient-to-b from-transparent via-amber-200 to-transparent mx-1" />

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
            onClick={(e) => {
              haptic.menu(e.currentTarget);
              setMobileMenuOpen(!mobileMenuOpen);
            }}
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
        <div
          className={`
            md:hidden overflow-hidden transition-all duration-500 ease-out
            ${mobileMenuOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}
          `}
        >
          <div className="border-t border-amber-100 py-4 px-6 space-y-2 bg-[#FDFBF7]/95 backdrop-blur-md">
            {/* Primary CTA */}
            <Link
              href="/check"
              className="block bg-gradient-to-r from-amber-500 to-orange-500 text-white px-6 py-4 rounded-xl text-center font-semibold shadow-md mb-4"
              onClick={(e) => {
                haptic.medium(e.currentTarget);
                setMobileMenuOpen(false);
              }}
            >
              Check My Rental
            </Link>

            {/* Navigation Links */}
            <a
              href="#services"
              className="block px-6 py-3 rounded-xl text-sm font-medium text-[#4A5568] hover:text-amber-700 hover:bg-amber-50 transition-all"
              onClick={(e) => {
                haptic.navigation(e.currentTarget);
                setMobileMenuOpen(false);
              }}
            >
              Services
            </a>
            <a
              href="#how-it-works"
              className="block px-6 py-3 rounded-xl text-sm font-medium text-[#4A5568] hover:text-amber-700 hover:bg-amber-50 transition-all"
              onClick={(e) => {
                haptic.navigation(e.currentTarget);
                setMobileMenuOpen(false);
              }}
            >
              How It Works
            </a>
            <Link
              href="/pricing"
              className="block px-6 py-3 rounded-xl text-sm font-medium text-[#4A5568] hover:text-amber-700 hover:bg-amber-50 transition-all"
              onClick={(e) => {
                haptic.navigation(e.currentTarget);
                setMobileMenuOpen(false);
              }}
            >
              Pricing
            </Link>

            {/* Auth Links */}
            {!authLoading && user && (
              <>
                <Link
                  href="/dashboard"
                  className="block px-6 py-3 rounded-xl text-sm font-medium text-[#4A5568] hover:text-amber-700 hover:bg-amber-50 transition-all"
                  onClick={(e) => {
                    haptic.navigation(e.currentTarget);
                    setMobileMenuOpen(false);
                  }}
                >
                  Dashboard
                </Link>
                <Link
                  href="/profile"
                  className="block px-6 py-3 rounded-xl text-sm font-medium text-[#4A5568] hover:text-amber-700 hover:bg-amber-50 transition-all"
                  onClick={(e) => {
                    haptic.navigation(e.currentTarget);
                    setMobileMenuOpen(false);
                  }}
                >
                  Profile
                </Link>
                <button
                  onClick={(e) => {
                    haptic.medium(e.currentTarget);
                    handleLogout();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full text-left text-red-600 hover:bg-red-50 px-6 py-3 rounded-xl text-sm font-medium transition-all"
                >
                  Log Out
                </button>
              </>
            )}

            {!authLoading && !user && (
              <div className="pt-2 space-y-2">
                <Link
                  href="/auth/login"
                  className="block px-6 py-3 rounded-xl text-sm font-medium text-[#4A5568] hover:text-amber-700 hover:bg-amber-50 transition-all"
                  onClick={(e) => {
                    haptic.navigation(e.currentTarget);
                    setMobileMenuOpen(false);
                  }}
                >
                  Log In
                </Link>
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
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 min-h-screen flex items-center pt-20">
        <div className="max-w-6xl mx-auto px-6 w-full">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left: Content */}
            <div className={`transition-all duration-1000 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-full mb-8">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-green-700 text-sm font-medium">Trusted by 1,000+ expats in Korea</span>
              </div>

              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-[1.1] text-[#1A202C] mb-6">
                Rent Safely in
                <span className="relative inline-block mx-3">
                  <span className="relative z-10">Korea</span>
                  <span className="absolute bottom-2 left-0 right-0 h-3 bg-amber-300/50 -z-0" />
                </span>
              </h1>

              <p className="text-lg text-[#4A5568] leading-relaxed mb-8 max-w-lg">
                Before you sign, make sure your deposit is protected and your rent is fair.
                We analyze Korean rental contracts — in English, in minutes.
              </p>

              {/* Single Primary CTA Button */}
              <div className="mb-8">
                <Link href="/check">
                  <button className="group px-10 py-5 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-lg rounded-2xl hover:shadow-xl hover:shadow-amber-200/50 transition-all hover:-translate-y-1 flex items-center gap-3">
                    Check My Rental
                    <svg className="w-6 h-6 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </button>
                </Link>
              </div>

              {/* Trust Badges */}
              <div className="flex flex-wrap items-center gap-3">
                <span className="px-4 py-2 bg-amber-50 border border-amber-200 rounded-full text-sm font-medium text-amber-700 flex items-center gap-2">
                  <HomeIcon className="w-4 h-4" />
                  Works for Jeonse & Wolse
                </span>
                <span className="px-4 py-2 bg-blue-50 border border-blue-200 rounded-full text-sm font-medium text-blue-700 flex items-center gap-2">
                  <TranslateIcon className="w-4 h-4" />
                  Full English
                </span>
                <span className="px-4 py-2 bg-green-50 border border-green-200 rounded-full text-sm font-medium text-green-700 flex items-center gap-2">
                  <ClockIcon className="w-4 h-4" />
                  Instant Results
                </span>
              </div>
            </div>

            {/* Right: Animated House Illustration */}
            <div className={`relative transition-all duration-1000 delay-300 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              <AnimatedHouse />
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section
        id="services"
        ref={servicesSection.elementRef as any}
        className={`relative z-10 py-24 px-6 bg-white transition-all duration-1000 ${servicesSection.isVisible ? 'opacity-100' : 'opacity-0'}`}
      >
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-amber-600 text-sm font-semibold tracking-wider uppercase">Our Services</span>
            <h2 className="mt-4 text-3xl md:text-4xl font-bold text-[#1A202C]">
              Complete protection for your rental
            </h2>
            <p className="mt-4 text-[#4A5568] max-w-2xl mx-auto">
              Choose the service that fits your needs and rent with confidence.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Deposit Safety Check */}
            <ServiceCard
              icon={<ShieldCheckIcon className="w-8 h-8" />}
              title="Deposit Safety Check"
              subtitle="Is your deposit protected?"
              description="We analyze the property register, verify ownership, detect liens and mortgages, and assess whether your deposit is safe. Works for any Korean rental contract."
              features={[
                "20+ risk factor analysis",
                "등기부등본 translation & analysis",
                "Deposit-to-value assessment",
                "Safety score (0-100)",
                "PDF report in English"
              ]}
              price="14,900"
              betaPrice="FREE"
              href="/analyze"
              color="amber"
              delay={0}
            />

            {/* Wolse Price Check */}
            <ServiceCard
              icon={<CurrencyIcon className="w-8 h-8" />}
              title="Wolse Price Check"
              subtitle="Is your rent fair?"
              description="We compare your monthly rent against actual market transactions in your building and neighborhood. Know if you're overpaying before you sign."
              features={[
                "Market rate comparison",
                "Price rating (Fair / High / Overpriced)",
                "Recent transaction data",
                "Negotiation tips if overpriced"
              ]}
              price="9,900"
              betaPrice="FREE"
              href="/analyze/wolse"
              color="orange"
              delay={200}
              tip="💡 Want deposit protection too? Choose Full Wolse Check"
            />

            {/* Full Wolse Check */}
            <ServiceCard
              icon={<CheckCircleIcon className="w-8 h-8" />}
              title="Full Wolse Check"
              subtitle="Complete protection for wolse renters"
              description="Get both deposit safety analysis AND rent price comparison in one report. Know your deposit is protected and your rent is fair — before you sign."
              features={[
                "Everything in Deposit Safety Check",
                "Everything in Wolse Price Check",
                "One combined report",
                "Single form submission"
              ]}
              price="19,900"
              betaPrice="FREE"
              href="/analyze/full"
              color="green"
              delay={400}
              badge="Best Value"
            />
          </div>
        </div>
      </section>

      {/* About Section */}
      <section
        id="about"
        ref={aboutSection.elementRef as any}
        className={`relative z-10 py-24 px-6 transition-all duration-1000 ${aboutSection.isVisible ? 'opacity-100' : 'opacity-0'}`}
      >
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-amber-600 text-sm font-semibold tracking-wider uppercase">Why we exist</span>
            <h2 className="mt-4 text-3xl md:text-4xl font-bold text-[#1A202C]">
              Moving to Korea should be exciting,<br />not stressful
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <ProblemCard
              icon={<DocumentIcon />}
              title="Complex documents"
              description="Korean property registers are filled with legal terms that even natives struggle to understand."
              color="red"
              delay={0}
            />
            <ProblemCard
              icon={<CurrencyIcon className="w-6 h-6" />}
              title="Deposits at risk"
              description="Rental deposits — whether jeonse (₩100M+) or wolse (₩5M-₩30M) — can be lost if the landlord has hidden debts. In 2023, 24,668 victims lost ₩2.28 trillion to deposit fraud."
              color="amber"
              delay={150}
            />
            <ProblemCard
              icon={<QuestionIcon />}
              title="Unfair rent prices"
              description="Landlords sometimes quote above market rates to foreigners who don't know the local prices."
              color="blue"
              delay={300}
            />
          </div>

          {/* Solution banner */}
          <StaggeredFadeIn delay={400}>
            <div className="mt-16 p-8 bg-gradient-to-r from-green-50 to-emerald-50 rounded-3xl border border-green-100 hover:shadow-xl hover:shadow-green-100/50 transition-all duration-300 group">
              <div className="flex flex-col md:flex-row items-center gap-6 text-center md:text-left">
                <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
                  <CheckCircleIcon className="w-8 h-8 text-green-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-green-900 mb-2">That's why we built K-Rent Safety</h3>
                  <p className="text-green-700">
                    We translate documents, analyze risks, check market rates, and give you clear answers —
                    all in English, in minutes.
                  </p>
                </div>
              </div>
            </div>
          </StaggeredFadeIn>
        </div>
      </section>

      {/* How It Works Section */}
      <section
        id="how-it-works"
        ref={processSection.elementRef as any}
        className={`relative z-10 py-24 px-6 bg-white transition-all duration-1000 ${processSection.isVisible ? 'opacity-100' : 'opacity-0'}`}
      >
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-amber-600 text-sm font-semibold tracking-wider uppercase">How it works</span>
            <h2 className="mt-4 text-3xl md:text-4xl font-bold text-[#1A202C]">
              Three simple steps to rental safety
            </h2>
          </div>

          {/* Unified 3-step workflow */}
          <div className="max-w-4xl mx-auto">
            <div className="grid md:grid-cols-3 gap-8 mb-12">
              {/* Step 1 */}
              <div className="text-center group">
                <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl flex items-center justify-center text-white text-2xl font-bold mx-auto mb-6 group-hover:scale-110 transition-transform shadow-lg">
                  1
                </div>
                <h3 className="text-xl font-bold text-[#1A202C] mb-2">Choose your rental type</h3>
                <p className="text-[#718096]">Tell us if you have a jeonse or wolse contract. We'll customize the analysis for your situation.</p>
              </div>

              {/* Step 2 */}
              <div className="text-center group">
                <div className="w-16 h-16 bg-gradient-to-br from-orange-400 to-amber-600 rounded-2xl flex items-center justify-center text-white text-2xl font-bold mx-auto mb-6 group-hover:scale-110 transition-transform shadow-lg">
                  2
                </div>
                <h3 className="text-xl font-bold text-[#1A202C] mb-2">Enter property details</h3>
                <p className="text-[#718096]">Search our database of 5,398+ Seoul apartments or upload your contract and property register.</p>
              </div>

              {/* Step 3 */}
              <div className="text-center group">
                <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center text-white text-2xl font-bold mx-auto mb-6 group-hover:scale-110 transition-transform shadow-lg">
                  3
                </div>
                <h3 className="text-xl font-bold text-[#1A202C] mb-2">Get your report</h3>
                <p className="text-[#718096]">Receive your safety score, risk analysis, and recommendations — all in English, in about 2 minutes.</p>
              </div>
            </div>

            {/* Single CTA Button */}
            <div className="text-center">
              <Link href="/check">
                <button className="group px-10 py-5 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-lg rounded-2xl hover:shadow-xl hover:shadow-amber-200/50 transition-all hover:-translate-y-1 inline-flex items-center gap-3">
                  Check My Rental
                  <svg className="w-6 h-6 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </button>
              </Link>
            </div>
          </div>

          {/* Sample report preview */}
          <StaggeredFadeIn delay={500}>
            <div className="mt-16 relative group">
              <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent z-10 pointer-events-none" />
              <div className="bg-[#1A202C] rounded-2xl p-6 shadow-2xl group-hover:shadow-amber-200/20 transition-all duration-500 group-hover:-translate-y-2">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span className="text-white/40 text-sm ml-4">Sample Analysis Results</span>
                </div>
                <div className="grid md:grid-cols-4 gap-4">
                  <div className="bg-white/5 rounded-xl p-4 hover:bg-white/10 transition-colors">
                    <div className="text-white/40 text-sm mb-2">Safety Score</div>
                    <div className="text-3xl font-bold text-green-400">87</div>
                    <div className="text-green-400 text-sm mt-1">Low Risk</div>
                  </div>
                  <div className="bg-white/5 rounded-xl p-4 hover:bg-white/10 transition-colors">
                    <div className="text-white/40 text-sm mb-2">Market Value</div>
                    <div className="text-2xl font-bold text-white">485M</div>
                    <div className="text-white/60 text-sm mt-1">vs 420M deposit</div>
                  </div>
                  <div className="bg-white/5 rounded-xl p-4 hover:bg-white/10 transition-colors">
                    <div className="text-white/40 text-sm mb-2">Rent Rating</div>
                    <div className="text-2xl font-bold text-amber-400">FAIR</div>
                    <div className="text-amber-400/70 text-sm mt-1">Within market</div>
                  </div>
                  <div className="bg-white/5 rounded-xl p-4 hover:bg-white/10 transition-colors">
                    <div className="text-white/40 text-sm mb-2">Potential Savings</div>
                    <div className="text-2xl font-bold text-white">₩50K</div>
                    <div className="text-white/60 text-sm mt-1">per month</div>
                  </div>
                </div>
              </div>
            </div>
          </StaggeredFadeIn>
        </div>
      </section>

      {/* Trust Section */}
      <section
        ref={trustSection.elementRef as any}
        className={`relative z-10 py-24 px-6 transition-all duration-1000 ${trustSection.isVisible ? 'opacity-100' : 'opacity-0'}`}
      >
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-amber-600 text-sm font-semibold tracking-wider uppercase">Why trust us</span>
            <h2 className="mt-4 text-3xl md:text-4xl font-bold text-[#1A202C]">
              Built by experts, for expats
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <TrustCard number="5,398+" label="Apartments" description="Seoul properties in database" delay={0} />
            <TrustCard number="20+" label="Risk Checks" description="Comprehensive analysis" delay={100} />
            <TrustCard number="100%" label="English" description="Full translation included" delay={200} />
            <TrustCard number="2 min" label="Results" description="Fast, accurate analysis" delay={300} />
          </div>

          {/* Testimonial */}
          <StaggeredFadeIn delay={400}>
            <div className="mt-16 p-8 bg-amber-50 rounded-3xl border border-amber-100 hover:shadow-lg hover:shadow-amber-100/50 transition-all duration-300 group">
              <div className="flex flex-col md:flex-row gap-6 items-start">
                <div className="text-6xl text-amber-300 group-hover:scale-110 transition-transform duration-300">"</div>
                <div>
                  <p className="text-lg text-[#4A5568] leading-relaxed mb-4">
                    I was about to sign a contract when I found K-Rent Safety. The analysis revealed a hidden
                    mortgage I didn't know about. Saved me from potentially losing my entire deposit.
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-amber-200 rounded-full flex items-center justify-center text-amber-700 font-bold group-hover:scale-110 transition-transform duration-300">
                      M
                    </div>
                    <div>
                      <div className="font-semibold text-[#2D3748]">Michael T.</div>
                      <div className="text-sm text-[#718096]">American expat in Seoul</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </StaggeredFadeIn>
        </div>
      </section>

      {/* CTA Section */}
      <section
        ref={ctaSection.elementRef as any}
        className={`relative z-10 py-24 px-6 bg-gradient-to-br from-amber-500 to-orange-500 transition-all duration-1000 ${ctaSection.isVisible ? 'opacity-100' : 'opacity-0'}`}
      >
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 rounded-full mb-8">
            <span className="text-white/90 text-sm font-medium">Free during beta</span>
          </div>

          <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
            Ready to rent safely in Korea?
          </h2>

          <p className="text-xl text-white/80 mb-10 max-w-2xl mx-auto">
            Join hundreds of expats who have navigated the Korean rental market with confidence.
          </p>

          <div className="flex justify-center">
            <Link href="/check">
              <button className="group px-12 py-6 bg-white text-amber-600 font-bold text-xl rounded-2xl hover:shadow-2xl transition-all hover:-translate-y-1 flex items-center gap-3">
                Check My Rental
                <svg className="w-6 h-6 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </button>
            </Link>
          </div>

          <p className="mt-6 text-white/60 text-sm">
            No credit card required - Results in minutes
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 py-16 px-6 bg-[#1A202C] text-white">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            {/* Brand */}
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center">
                  <HomeIcon className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-semibold">K-Rent Safety</span>
              </div>
              <p className="text-white/60 leading-relaxed max-w-sm">
                Helping foreigners in Korea protect their deposits and verify fair rent prices with clear, English-language analysis.
              </p>
            </div>

            {/* Services */}
            <div>
              <div className="text-white/40 text-sm uppercase tracking-wider mb-4">Services</div>
              <div className="space-y-3">
                <Link href="/analyze/full" className="block text-white/70 hover:text-white transition-colors">Full Wolse Check</Link>
                <Link href="/analyze" className="block text-white/70 hover:text-white transition-colors">Deposit Safety Check</Link>
                <Link href="/analyze/wolse" className="block text-white/70 hover:text-white transition-colors">Wolse Price Check</Link>
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

          <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between gap-4 text-white/40 text-sm">
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

      {/* Animations */}
      <style jsx global>{`
        @keyframes gradient-x {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        @keyframes v4-float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        @keyframes v4-float-slow {
          0%, 100% { transform: translateY(0px) scale(1); }
          50% { transform: translateY(-15px) scale(1.1); }
        }
        @keyframes v4-float-slow-reverse {
          0%, 100% { transform: translateY(0px) scale(1); }
          50% { transform: translateY(10px) scale(0.9); }
        }
        @keyframes v4-heartbeat {
          0%, 100% { transform: scale(1); }
          10% { transform: scale(1.1); }
          20% { transform: scale(1); }
          30% { transform: scale(1.1); }
          40% { transform: scale(1); }
        }
        @keyframes v4-smoke-rise {
          0% { transform: translateY(0) scale(1); opacity: 0.6; }
          100% { transform: translateY(-30px) scale(1.5); opacity: 0; }
        }
        .animate-float { animation: v4-float 3s ease-in-out infinite; }
        .animate-float-slow { animation: v4-float-slow 4s ease-in-out infinite; }
        .animate-float-slow-reverse { animation: v4-float-slow-reverse 5s ease-in-out infinite; }
        .animate-heartbeat { animation: v4-heartbeat 2s ease-in-out infinite; }
        .animate-smoke-1 { animation: v4-smoke-rise 3s ease-out infinite; animation-delay: 0s; }
        .animate-smoke-2 { animation: v4-smoke-rise 3s ease-out infinite; animation-delay: 1s; }
        .animate-smoke-3 { animation: v4-smoke-rise 3s ease-out infinite; animation-delay: 2s; }
      `}</style>
    </div>
  );
}

// ============ Service Card Component ============
function ServiceCard({
  icon, title, subtitle, description, features, price, betaPrice, href, color, delay = 0, tip, badge
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  description: string;
  features: string[];
  price: string;
  betaPrice: string;
  href: string;
  color: 'amber' | 'orange' | 'green';
  delay?: number;
  tip?: string;
  badge?: string;
}) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const gradients = {
    amber: 'from-amber-500 to-orange-600',
    orange: 'from-orange-400 to-amber-600',
    green: 'from-green-500 to-emerald-600'
  };

  const bgColors = {
    amber: 'bg-amber-50 border-amber-200 hover:border-amber-300',
    orange: 'bg-orange-50 border-orange-200 hover:border-orange-300',
    green: 'bg-green-50 border-green-200 hover:border-green-300'
  };

  const checkColors = {
    amber: 'text-amber-500',
    orange: 'text-orange-500',
    green: 'text-green-500'
  };

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setTimeout(() => setIsVisible(true), delay);
        }
      },
      { threshold: 0.2 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [delay]);

  return (
    <div
      ref={ref}
      className={`group p-8 rounded-3xl border-2 transition-all duration-700 hover:shadow-xl hover:-translate-y-2 relative ${bgColors[color]} ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'
      }`}
    >
      {badge && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className={`px-4 py-1.5 bg-gradient-to-r ${gradients[color]} text-white text-xs font-bold rounded-full shadow-lg`}>
            {badge}
          </span>
        </div>
      )}
      <div className={`w-14 h-14 bg-gradient-to-br ${gradients[color]} rounded-2xl flex items-center justify-center text-white mb-6 group-hover:scale-110 transition-transform shadow-lg`}>
        {icon}
      </div>
      <h3 className="text-2xl font-bold text-[#1A202C] mb-1">{title}</h3>
      {subtitle && <p className="text-sm text-[#718096] mb-3">{subtitle}</p>}
      <p className="text-[#4A5568] mb-6 leading-relaxed">{description}</p>

      <ul className="space-y-3 mb-8">
        {features.map((feature, i) => (
          <li key={i} className="flex items-center gap-3 text-[#4A5568]">
            <svg className={`w-5 h-5 ${checkColors[color]} flex-shrink-0`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            {feature}
          </li>
        ))}
      </ul>

      <div className="flex items-baseline gap-2 mb-6">
        <span className="text-3xl font-bold text-[#1A202C]">{betaPrice}</span>
        <span className="text-[#718096] line-through">₩{price}</span>
        <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">BETA</span>
      </div>

      <Link href={href}>
        <button className={`w-full py-4 bg-gradient-to-r ${gradients[color]} text-white font-semibold rounded-xl hover:shadow-lg transition-all flex items-center justify-center gap-2`}>
          Get Started
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
        </button>
      </Link>

      {tip && (
        <p className="mt-4 text-xs text-[#718096] text-center">{tip}</p>
      )}
    </div>
  );
}

// ============ Workflow Step Component ============
function WorkflowStep({ number, title, description }: { number: string; title: string; description: string }) {
  return (
    <div className="flex items-start gap-4">
      <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-amber-600 font-bold text-sm flex-shrink-0 shadow-md">
        {number}
      </div>
      <div>
        <div className="font-semibold text-[#1A202C]">{title}</div>
        <div className="text-sm text-[#718096]">{description}</div>
      </div>
    </div>
  );
}

// ============ Animated House Component ============
function AnimatedHouse() {
  const [windowsLit, setWindowsLit] = useState([true, true, true, true]);
  const [showHeart, setShowHeart] = useState(true);

  useEffect(() => {
    setWindowsLit([false, false, false, false]);
    const timeouts: NodeJS.Timeout[] = [];

    [0, 1, 2, 3].forEach((index) => {
      const timeout = setTimeout(() => {
        setWindowsLit(prev => {
          const newState = [...prev];
          newState[index] = true;
          return newState;
        });
      }, 500 + index * 300);
      timeouts.push(timeout);
    });

    setShowHeart(false);
    const heartTimeout = setTimeout(() => setShowHeart(true), 2500);
    timeouts.push(heartTimeout);

    return () => timeouts.forEach(t => clearTimeout(t));
  }, []);

  return (
    <div className="relative w-full max-w-lg mx-auto aspect-square">
      <div className="absolute inset-0 bg-gradient-to-br from-amber-100 to-orange-100 rounded-full scale-90" />
      <svg viewBox="0 0 400 350" className="relative z-10 w-full h-auto drop-shadow-2xl">
        <ellipse cx="200" cy="320" rx="150" ry="20" fill="#8B7355" opacity="0.2" />
        <rect x="80" y="150" width="240" height="150" rx="8" fill="#FEFCE8" stroke="#D97706" strokeWidth="3" />
        <path d="M60 160 L200 60 L340 160 Z" fill="#DC2626" stroke="#B91C1C" strokeWidth="3" />
        <path d="M80 160 L200 80 L320 160 Z" fill="#EF4444" />
        <rect x="260" y="80" width="40" height="60" fill="#78716C" stroke="#57534E" strokeWidth="2" />
        <circle cx="280" cy="60" r="8" fill="#E5E5E5" className="animate-smoke-1" />
        <circle cx="285" cy="45" r="10" fill="#D4D4D4" className="animate-smoke-2" />
        <circle cx="275" cy="30" r="7" fill="#E5E5E5" className="animate-smoke-3" />
        <rect x="170" y="210" width="60" height="90" rx="30" fill="#92400E" stroke="#78350F" strokeWidth="3" />
        <circle cx="215" cy="260" r="5" fill="#FCD34D" />
        <rect x="100" y="170" width="50" height="50" rx="4" fill={windowsLit[0] ? '#FEF3C7' : '#E5E7EB'} stroke="#D97706" strokeWidth="2" />
        <line x1="125" y1="170" x2="125" y2="220" stroke="#D97706" strokeWidth="2" />
        <line x1="100" y1="195" x2="150" y2="195" stroke="#D97706" strokeWidth="2" />
        <rect x="250" y="170" width="50" height="50" rx="4" fill={windowsLit[1] ? '#FEF3C7' : '#E5E7EB'} stroke="#D97706" strokeWidth="2" />
        <line x1="275" y1="170" x2="275" y2="220" stroke="#D97706" strokeWidth="2" />
        <line x1="250" y1="195" x2="300" y2="195" stroke="#D97706" strokeWidth="2" />
        <rect x="100" y="240" width="50" height="50" rx="4" fill={windowsLit[2] ? '#FEF3C7' : '#E5E7EB'} stroke="#D97706" strokeWidth="2" />
        <line x1="125" y1="240" x2="125" y2="290" stroke="#D97706" strokeWidth="2" />
        <line x1="100" y1="265" x2="150" y2="265" stroke="#D97706" strokeWidth="2" />
        <rect x="250" y="240" width="50" height="50" rx="4" fill={windowsLit[3] ? '#FEF3C7' : '#E5E7EB'} stroke="#D97706" strokeWidth="2" />
        <line x1="275" y1="240" x2="275" y2="290" stroke="#D97706" strokeWidth="2" />
        <line x1="250" y1="265" x2="300" y2="265" stroke="#D97706" strokeWidth="2" />
        {showHeart && (
          <path d="M200 20 C190 10 175 10 170 25 C165 40 180 55 200 70 C220 55 235 40 230 25 C225 10 210 10 200 20 Z" fill="#EF4444" className="animate-heartbeat" />
        )}
        <g transform="translate(320, 180)">
          <path d="M0 10 L20 0 L40 10 L40 30 C40 45 20 55 20 55 C20 55 0 45 0 30 Z" fill="#10B981" />
          <path d="M12 28 L18 34 L30 20" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </g>
      </svg>
      <div className="absolute top-10 left-10 w-8 h-8 bg-amber-200 rounded-full opacity-60" />
      <div className="absolute bottom-20 right-10 w-6 h-6 bg-green-200 rounded-full opacity-60" />
      <div className="absolute top-1/2 left-0 w-4 h-4 bg-orange-200 rounded-full opacity-40" />
    </div>
  );
}

// ============ Helper Components ============
function ProblemCard({ icon, title, description, color, delay = 0 }: { icon: React.ReactNode; title: string; description: string; color: string; delay?: number }) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const colorClasses: Record<string, string> = {
    red: 'bg-red-50 border-red-100 text-red-600',
    amber: 'bg-amber-50 border-amber-100 text-amber-600',
    blue: 'bg-blue-50 border-blue-100 text-blue-600',
  };

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) setTimeout(() => setIsVisible(true), delay); },
      { threshold: 0.2 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [delay]);

  return (
    <div
      ref={ref}
      className={`group p-6 rounded-2xl border transition-all duration-500 hover:shadow-lg hover:-translate-y-1 ${colorClasses[color]} ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      }`}
    >
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 ${colorClasses[color]}`}>
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-[#2D3748] mb-2">{title}</h3>
      <p className="text-[#718096]">{description}</p>
    </div>
  );
}

function TrustCard({ number, label, description, delay = 0 }: { number: string; label: string; description: string; delay?: number }) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) setTimeout(() => setIsVisible(true), delay); },
      { threshold: 0.2 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [delay]);

  return (
    <div
      ref={ref}
      className={`group p-6 bg-white rounded-2xl border border-amber-100 text-center hover:shadow-xl hover:shadow-amber-200/50 hover:-translate-y-2 transition-all duration-500 ${
        isVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-8 scale-95'
      }`}
    >
      <div className="text-3xl font-bold text-amber-600 mb-1 group-hover:scale-110 transition-transform duration-300">{number}</div>
      <div className="text-lg font-semibold text-[#2D3748] mb-1">{label}</div>
      <div className="text-sm text-[#718096]">{description}</div>
    </div>
  );
}

function StaggeredFadeIn({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) setTimeout(() => setIsVisible(true), delay); },
      { threshold: 0.1 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [delay]);

  return (
    <div ref={ref} className={`transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
      {children}
    </div>
  );
}

// ============ Icons ============
function HomeIcon({ className = "w-6 h-6" }: { className?: string }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>;
}
function ShieldCheckIcon({ className = "w-6 h-6" }: { className?: string }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>;
}
function TranslateIcon({ className = "w-6 h-6" }: { className?: string }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" /></svg>;
}
function ClockIcon({ className = "w-6 h-6" }: { className?: string }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
}
function DocumentIcon() {
  return <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>;
}
function CurrencyIcon({ className = "w-6 h-6" }: { className?: string }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
}
function QuestionIcon() {
  return <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
}
function CheckCircleIcon({ className = "w-6 h-6" }: { className?: string }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
}
