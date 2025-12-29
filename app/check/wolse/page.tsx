'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useHaptic } from '@/lib/hooks/useHaptic';

/**
 * Wolse Options Page
 * Step 2 for wolse renters - choose between price check only or full rental check
 */
export default function WolseOptionsPage() {
  const [mounted, setMounted] = useState(false);
  const [selectedOption, setSelectedOption] = useState<'price' | 'deposit' | 'full' | null>(null);
  const haptic = useHaptic();

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#2D3748] selection:bg-amber-200 selection:text-amber-900">
      {/* Background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-[#FEF7ED] via-[#FDFBF7] to-[#F5F0E8]" />
        <div className="absolute top-20 right-[10%] w-64 h-64 bg-orange-200/20 rounded-full blur-3xl" />
        <div className="absolute bottom-[20%] left-[10%] w-56 h-56 bg-green-200/20 rounded-full blur-3xl" />
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
          <Link href="/check" className="text-[#718096] hover:text-amber-700 flex items-center gap-2 text-sm">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </Link>
        </div>
      </nav>

      {/* Main Content */}
      <main className="relative z-10 min-h-screen flex items-center justify-center pt-20 pb-12 px-6">
        <div className={`max-w-4xl mx-auto w-full transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-50 border border-orange-200 rounded-full mb-6">
              <span className="text-orange-700 text-sm font-medium">Step 2 of 2 - Wolse</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-[#1A202C] mb-4">
              What would you like to check?
            </h1>
            <p className="text-lg text-[#4A5568] max-w-xl mx-auto">
              Choose what analysis you need for your wolse rental.
            </p>
          </div>

          {/* Option Cards */}
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            {/* Price Check Only */}
            <button
              onClick={(e) => {
                haptic.medium(e.currentTarget);
                setSelectedOption('price');
              }}
              className={`group p-6 rounded-3xl border-2 text-left transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${
                selectedOption === 'price'
                  ? 'bg-orange-50 border-orange-400 shadow-lg shadow-orange-100'
                  : 'bg-white border-orange-100 hover:border-orange-300'
              }`}
            >
              <div className="flex flex-col">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 transition-all ${
                  selectedOption === 'price'
                    ? 'bg-gradient-to-br from-orange-400 to-amber-600 shadow-lg'
                    : 'bg-orange-100 group-hover:bg-gradient-to-br group-hover:from-orange-400 group-hover:to-amber-600'
                }`}>
                  <CurrencyIcon className={`w-6 h-6 ${selectedOption === 'price' ? 'text-white' : 'text-orange-600 group-hover:text-white'}`} />
                </div>
                <h3 className="text-xl font-bold text-[#1A202C] mb-2">Wolse Price Check</h3>
                <p className="text-[#718096] text-sm mb-4">
                  Check if your monthly rent is fair
                </p>
                <ul className="text-sm text-[#4A5568] space-y-1.5 mb-4 flex-1">
                  <li className="flex items-center gap-2">
                    <CheckIcon className="w-4 h-4 text-orange-500" />
                    Market rate comparison
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckIcon className="w-4 h-4 text-orange-500" />
                    Price rating
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckIcon className="w-4 h-4 text-orange-500" />
                    Negotiation tips
                  </li>
                </ul>
                <div className="flex items-baseline gap-2">
                  <span className="text-lg font-bold text-[#1A202C]">FREE</span>
                  <span className="text-sm text-[#718096] line-through">₩9,900</span>
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">BETA</span>
                </div>
              </div>
              {selectedOption === 'price' && (
                <div className="absolute top-4 right-4 w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center">
                  <CheckIcon className="w-4 h-4 text-white" />
                </div>
              )}
            </button>

            {/* Deposit Safety Only */}
            <button
              onClick={(e) => {
                haptic.medium(e.currentTarget);
                setSelectedOption('deposit');
              }}
              className={`group p-6 rounded-3xl border-2 text-left transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${
                selectedOption === 'deposit'
                  ? 'bg-amber-50 border-amber-400 shadow-lg shadow-amber-100'
                  : 'bg-white border-amber-100 hover:border-amber-300'
              }`}
            >
              <div className="flex flex-col">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 transition-all ${
                  selectedOption === 'deposit'
                    ? 'bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg'
                    : 'bg-amber-100 group-hover:bg-gradient-to-br group-hover:from-amber-500 group-hover:to-orange-600'
                }`}>
                  <ShieldCheckIcon className={`w-6 h-6 ${selectedOption === 'deposit' ? 'text-white' : 'text-amber-600 group-hover:text-white'}`} />
                </div>
                <h3 className="text-xl font-bold text-[#1A202C] mb-2">Deposit Safety Check</h3>
                <p className="text-[#718096] text-sm mb-4">
                  Check if your deposit is protected
                </p>
                <ul className="text-sm text-[#4A5568] space-y-1.5 mb-4 flex-1">
                  <li className="flex items-center gap-2">
                    <CheckIcon className="w-4 h-4 text-amber-500" />
                    20+ risk factor analysis
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckIcon className="w-4 h-4 text-amber-500" />
                    등기부등본 translation
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckIcon className="w-4 h-4 text-amber-500" />
                    Safety score (0-100)
                  </li>
                </ul>
                <div className="flex items-baseline gap-2">
                  <span className="text-lg font-bold text-[#1A202C]">FREE</span>
                  <span className="text-sm text-[#718096] line-through">₩14,900</span>
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">BETA</span>
                </div>
              </div>
              {selectedOption === 'deposit' && (
                <div className="absolute top-4 right-4 w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center">
                  <CheckIcon className="w-4 h-4 text-white" />
                </div>
              )}
            </button>

            {/* Full Wolse Check */}
            <button
              onClick={(e) => {
                haptic.medium(e.currentTarget);
                setSelectedOption('full');
              }}
              className={`group p-6 rounded-3xl border-2 text-left transition-all duration-300 hover:shadow-xl hover:-translate-y-1 relative ${
                selectedOption === 'full'
                  ? 'bg-green-50 border-green-400 shadow-lg shadow-green-100'
                  : 'bg-white border-green-100 hover:border-green-300'
              }`}
            >
              {/* Best Value Badge */}
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="px-4 py-1.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white text-xs font-bold rounded-full shadow-lg">
                  Best Value
                </span>
              </div>

              <div className="flex flex-col">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 transition-all ${
                  selectedOption === 'full'
                    ? 'bg-gradient-to-br from-green-500 to-emerald-600 shadow-lg'
                    : 'bg-green-100 group-hover:bg-gradient-to-br group-hover:from-green-500 group-hover:to-emerald-600'
                }`}>
                  <CheckCircleIcon className={`w-6 h-6 ${selectedOption === 'full' ? 'text-white' : 'text-green-600 group-hover:text-white'}`} />
                </div>
                <h3 className="text-xl font-bold text-[#1A202C] mb-2">Full Wolse Check</h3>
                <p className="text-[#718096] text-sm mb-4">
                  Check both deposit safety AND rent price
                </p>
                <ul className="text-sm text-[#4A5568] space-y-1.5 mb-4 flex-1">
                  <li className="flex items-center gap-2">
                    <CheckIcon className="w-4 h-4 text-green-500" />
                    Everything in Price Check
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckIcon className="w-4 h-4 text-green-500" />
                    Everything in Deposit Check
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckIcon className="w-4 h-4 text-green-500" />
                    Combined PDF report
                  </li>
                </ul>
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="text-lg font-bold text-[#1A202C]">FREE</span>
                  <span className="text-sm text-[#718096] line-through">₩19,900</span>
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">BETA</span>
                </div>
                <p className="text-xs text-green-600 mt-2">Save ₩4,800 vs buying separately</p>
              </div>
              {selectedOption === 'full' && (
                <div className="absolute top-4 right-4 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                  <CheckIcon className="w-4 h-4 text-white" />
                </div>
              )}
            </button>
          </div>

          {/* Why deposit safety matters callout */}
          <div className="mb-12 p-6 bg-amber-50 rounded-2xl border border-amber-100">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <WarningIcon className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h3 className="font-semibold text-[#1A202C] mb-1">Why check your deposit too?</h3>
                <p className="text-sm text-[#4A5568]">
                  Even with wolse, you're still putting down a deposit (보증금) of ₩5M-₩50M or more.
                  If your landlord has hidden debts, you could lose this money. In 2023, over 24,000
                  victims lost their deposits to fraud.
                </p>
              </div>
            </div>
          </div>

          {/* Continue Button */}
          {selectedOption && (
            <div className={`text-center transition-all duration-500 ${selectedOption ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
              {selectedOption === 'price' && (
                <Link href="/analyze/wolse">
                  <button
                    onClick={(e) => haptic.medium(e.currentTarget)}
                    className="group px-10 py-5 bg-gradient-to-r from-orange-400 to-amber-500 text-white font-bold text-lg rounded-2xl hover:shadow-xl hover:shadow-orange-200/50 transition-all hover:-translate-y-1 inline-flex items-center gap-3"
                  >
                    Continue to Price Check
                    <svg className="w-6 h-6 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </button>
                </Link>
              )}
              {selectedOption === 'deposit' && (
                <Link href="/analyze">
                  <button
                    onClick={(e) => haptic.medium(e.currentTarget)}
                    className="group px-10 py-5 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold text-lg rounded-2xl hover:shadow-xl hover:shadow-amber-200/50 transition-all hover:-translate-y-1 inline-flex items-center gap-3"
                  >
                    Continue to Deposit Safety Check
                    <svg className="w-6 h-6 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </button>
                </Link>
              )}
              {selectedOption === 'full' && (
                <Link href="/analyze/full">
                  <button
                    onClick={(e) => haptic.medium(e.currentTarget)}
                    className="group px-10 py-5 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold text-lg rounded-2xl hover:shadow-xl hover:shadow-green-200/50 transition-all hover:-translate-y-1 inline-flex items-center gap-3"
                  >
                    Continue to Full Wolse Check
                    <svg className="w-6 h-6 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </button>
                </Link>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

// Icons
function HomeIcon({ className = "w-6 h-6" }: { className?: string }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>;
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

function WarningIcon({ className = "w-6 h-6" }: { className?: string }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>;
}

function CheckCircleIcon({ className = "w-6 h-6" }: { className?: string }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
}
