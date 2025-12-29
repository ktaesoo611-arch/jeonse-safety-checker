'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useHaptic } from '@/lib/hooks/useHaptic';
import { analytics } from '@/lib/analytics';

/**
 * Rental Type Selection Page
 * Step 1 of the rental check flow - user chooses their rental type
 */
export default function CheckPage() {
  const [mounted, setMounted] = useState(false);
  const [selectedType, setSelectedType] = useState<'jeonse' | 'wolse' | null>(null);
  const haptic = useHaptic();

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#2D3748] selection:bg-amber-200 selection:text-amber-900">
      {/* Background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-[#FEF7ED] via-[#FDFBF7] to-[#F5F0E8]" />
        <div className="absolute top-20 left-[10%] w-64 h-64 bg-amber-200/20 rounded-full blur-3xl" />
        <div className="absolute bottom-[20%] right-[10%] w-56 h-56 bg-orange-200/20 rounded-full blur-3xl" />
      </div>

      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-[#FDFBF7]/80 backdrop-blur-md border-b border-amber-100">
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-amber-400 via-orange-500 to-amber-400" />
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl blur-md opacity-50 group-hover:opacity-80 transition-opacity" />
              <div className="relative w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-amber-200">
                <HomeIcon className="w-5 h-5 text-white" />
              </div>
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 bg-clip-text text-transparent">K-Rent Safety</span>
          </Link>
        </div>
      </nav>

      {/* Main Content */}
      <main className="relative z-10 min-h-screen flex items-center justify-center pt-20 pb-12 px-6">
        <div className={`max-w-4xl mx-auto w-full transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-200 rounded-full mb-6">
              <span className="text-amber-700 text-sm font-medium">Step 1 of 2</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-[#1A202C] mb-4">
              What type of rental contract do you have?
            </h1>
            <p className="text-lg text-[#4A5568] max-w-xl mx-auto">
              Select your rental type so we can provide the right analysis for your situation.
            </p>
          </div>

          {/* Rental Type Cards */}
          <div className="grid md:grid-cols-2 gap-6 mb-12">
            {/* Jeonse Card */}
            <button
              onClick={(e) => {
                haptic.medium(e.currentTarget);
                setSelectedType('jeonse');
              }}
              className={`group p-8 rounded-3xl border-2 text-left transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${
                selectedType === 'jeonse'
                  ? 'bg-amber-50 border-amber-400 shadow-lg shadow-amber-100'
                  : 'bg-white border-amber-100 hover:border-amber-300'
              }`}
            >
              <div className="flex items-start gap-4">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all ${
                  selectedType === 'jeonse'
                    ? 'bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg'
                    : 'bg-amber-100 group-hover:bg-gradient-to-br group-hover:from-amber-500 group-hover:to-orange-600'
                }`}>
                  <DepositIcon className={`w-7 h-7 ${selectedType === 'jeonse' ? 'text-white' : 'text-amber-600 group-hover:text-white'}`} />
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-[#1A202C] mb-2">Jeonse</h3>
                  <p className="text-[#718096] mb-4">
                    Large deposit (usually 50-80% of property value), no monthly rent
                  </p>
                  <div className="flex items-center gap-2 text-sm text-amber-700">
                    <ShieldCheckIcon className="w-4 h-4" />
                    <span>Deposit safety analysis included</span>
                  </div>
                </div>
                {selectedType === 'jeonse' && (
                  <div className="w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center">
                    <CheckIcon className="w-4 h-4 text-white" />
                  </div>
                )}
              </div>
            </button>

            {/* Wolse Card */}
            <button
              onClick={(e) => {
                haptic.medium(e.currentTarget);
                setSelectedType('wolse');
              }}
              className={`group p-8 rounded-3xl border-2 text-left transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${
                selectedType === 'wolse'
                  ? 'bg-orange-50 border-orange-400 shadow-lg shadow-orange-100'
                  : 'bg-white border-orange-100 hover:border-orange-300'
              }`}
            >
              <div className="flex items-start gap-4">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all ${
                  selectedType === 'wolse'
                    ? 'bg-gradient-to-br from-orange-400 to-amber-600 shadow-lg'
                    : 'bg-orange-100 group-hover:bg-gradient-to-br group-hover:from-orange-400 group-hover:to-amber-600'
                }`}>
                  <CurrencyIcon className={`w-7 h-7 ${selectedType === 'wolse' ? 'text-white' : 'text-orange-600 group-hover:text-white'}`} />
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-[#1A202C] mb-2">Wolse</h3>
                  <p className="text-[#718096] mb-4">
                    Smaller deposit + monthly rent payments
                  </p>
                  <div className="flex items-center gap-2 text-sm text-orange-700">
                    <CurrencyIcon className="w-4 h-4" />
                    <span>Price check + optional deposit safety</span>
                  </div>
                </div>
                {selectedType === 'wolse' && (
                  <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center">
                    <CheckIcon className="w-4 h-4 text-white" />
                  </div>
                )}
              </div>
            </button>
          </div>

          {/* Continue Button */}
          {selectedType && (
            <div className={`text-center transition-all duration-500 ${selectedType ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
              {selectedType === 'jeonse' ? (
                <Link href="/analyze">
                  <button
                    onClick={(e) => {
                      haptic.medium(e.currentTarget);
                      analytics.rentalTypeSelected('jeonse');
                    }}
                    className="group px-10 py-5 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-lg rounded-2xl hover:shadow-xl hover:shadow-amber-200/50 transition-all hover:-translate-y-1 inline-flex items-center gap-3"
                  >
                    Continue to Deposit Safety Check
                    <svg className="w-6 h-6 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </button>
                </Link>
              ) : (
                <Link href="/check/wolse">
                  <button
                    onClick={(e) => {
                      haptic.medium(e.currentTarget);
                      analytics.rentalTypeSelected('wolse');
                    }}
                    className="group px-10 py-5 bg-gradient-to-r from-orange-400 to-amber-500 text-white font-bold text-lg rounded-2xl hover:shadow-xl hover:shadow-orange-200/50 transition-all hover:-translate-y-1 inline-flex items-center gap-3"
                  >
                    Continue
                    <svg className="w-6 h-6 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </button>
                </Link>
              )}
            </div>
          )}

          {/* Not sure helper */}
          <div className="mt-12 text-center">
            <p className="text-[#718096] text-sm">
              Not sure which one you have?{' '}
              <a href="#help" className="text-amber-600 hover:text-amber-700 underline">
                Learn the difference
              </a>
            </p>
          </div>

          {/* Help Section */}
          <div id="help" className="mt-16 p-8 bg-white rounded-3xl border border-amber-100 shadow-sm">
            <h2 className="text-xl font-bold text-[#1A202C] mb-4">Jeonse vs Wolse: What's the difference?</h2>
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="font-semibold text-amber-700 mb-2">Jeonse (Key Money Deposit)</h3>
                <ul className="text-[#4A5568] space-y-2 text-sm">
                  <li>- Large upfront deposit (typically 50-80% of property value)</li>
                  <li>- No monthly rent payments</li>
                  <li>- Deposit returned at end of lease</li>
                  <li>- Common amounts: ₩100M - ₩1B+</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-orange-700 mb-2">Wolse (Monthly Rent)</h3>
                <ul className="text-[#4A5568] space-y-2 text-sm">
                  <li>- Smaller deposit (typically ₩5M - ₩50M)</li>
                  <li>- Monthly rent payments required</li>
                  <li>- More flexible, lower upfront cost</li>
                  <li>- Common rent: ₩50K - ₩300K/month</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// Icons
function HomeIcon({ className = "w-6 h-6" }: { className?: string }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>;
}

function DepositIcon({ className = "w-6 h-6" }: { className?: string }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>;
}

function CurrencyIcon({ className = "w-6 h-6" }: { className?: string }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
}

function ShieldCheckIcon({ className = "w-6 h-6" }: { className?: string }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>;
}

function CheckIcon({ className = "w-6 h-6" }: { className?: string }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>;
}
