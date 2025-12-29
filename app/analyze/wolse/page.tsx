'use client';

import { useState } from 'react';
import Link from 'next/link';
import { WolseInputForm, WolseFormData, WolsePreviewDisplay, WolseResultsDisplay, PaymentModal } from '@/components/wolse';
import { WolseAnalysisResult } from '@/lib/types';
import { analytics } from '@/lib/analytics';

type ViewState = 'form' | 'preview' | 'full';

export default function WolseAnalyzePage() {
  const [viewState, setViewState] = useState<ViewState>('form');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewResult, setPreviewResult] = useState<WolseAnalysisResult | null>(null);
  const [fullResult, setFullResult] = useState<WolseAnalysisResult | null>(null);
  const [inputData, setInputData] = useState<WolseFormData | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [unlocking, setUnlocking] = useState(false);

  // Step 1: Run analysis and show preview
  const handleSubmit = async (data: WolseFormData) => {
    setLoading(true);
    setError(null);

    try {
      // Run analysis (preview - not saved to DB)
      const response = await fetch('/api/wolse/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.error || 'Failed to analyze');
      }

      // Store result and input data in state
      setPreviewResult(responseData.result);
      setInputData(responseData.inputData);
      setViewState('preview');

      // Scroll to top to show results
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Open payment modal
  const handleUnlock = () => {
    setShowPaymentModal(true);
  };

  // Step 3a: Handle free beta unlock
  const handleFreeBeta = async () => {
    if (!previewResult || !inputData) return;

    setUnlocking(true);
    try {
      // Save to DB without payment
      const response = await fetch('/api/wolse/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          result: previewResult,
          inputData,
          paymentKey: null,
          paymentAmount: 0
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save analysis');
      }

      // Track free beta usage
      analytics.freeBetaUsed(data.result?.id || 'unknown', 'wolse');

      // Show full results
      setFullResult(data.result);
      setViewState('full');
      setShowPaymentModal(false);

      // Scroll to top to show results
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to unlock');
    } finally {
      setUnlocking(false);
    }
  };

  // Step 3b: Handle paid payment success
  const handlePaymentSuccess = async (paymentKey: string) => {
    if (!previewResult || !inputData) return;

    setUnlocking(true);
    try {
      // Save to DB with payment info
      const response = await fetch('/api/wolse/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          result: previewResult,
          inputData,
          paymentKey,
          paymentAmount: 9900
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save analysis');
      }

      // Show full results
      setFullResult(data.result);
      setViewState('full');
      setShowPaymentModal(false);

      // Scroll to top to show results
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setUnlocking(false);
    }
  };

  // Reset to form
  const handleNewAnalysis = () => {
    setViewState('form');
    setPreviewResult(null);
    setFullResult(null);
    setInputData(null);
    setError(null);
  };

  // Generate a temporary ID for the payment modal
  const tempAnalysisId = previewResult?.id || `temp_${Date.now()}`;

  return (
    <div className="min-h-screen bg-[#FDFBF7]">
      {/* Warm gradient background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-[#FEF7ED] via-[#FDFBF7] to-[#F5F0E8]" />
        <div className="absolute top-20 right-[10%] w-96 h-96 bg-amber-200/30 rounded-full blur-3xl" />
        <div className="absolute bottom-[20%] left-[5%] w-72 h-72 bg-orange-200/30 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative z-10 bg-[#FDFBF7]/80 backdrop-blur-md border-b border-amber-100">
        <div className="container mx-auto px-6 py-4 max-w-7xl flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-amber-200 group-hover:scale-105 transition-transform">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <span className="text-xl font-semibold text-[#2D3748]">K-Rent Safety</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/analyze"
              className="text-[#4A5568] hover:text-amber-600 font-medium transition-colors"
            >
              Deposit Safety
            </Link>
            <Link
              href="/analyze/full"
              className="text-[#4A5568] hover:text-green-600 font-medium transition-colors"
            >
              Full Wolse
            </Link>
          </div>
        </div>
      </header>

      <div className="relative z-10 container mx-auto px-6 py-12 max-w-4xl">
        {/* Breadcrumb */}
        <div className="mb-8">
          {viewState === 'form' ? (
            <Link href="/" className="text-amber-600 hover:text-amber-700 font-medium inline-flex items-center gap-2 group">
              <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to home
            </Link>
          ) : (
            <button
              onClick={handleNewAnalysis}
              className="text-amber-600 hover:text-amber-700 font-medium inline-flex items-center gap-2 group"
            >
              <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              New Analysis
            </button>
          )}
        </div>

        {/* Page Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-700 rounded-full text-sm font-semibold mb-6 border border-amber-200">
            <span>Wolse Fair Price Check</span>
            {viewState === 'preview' && (
              <>
                <span className="text-amber-400">|</span>
                <span>Preview</span>
              </>
            )}
            {viewState === 'full' && (
              <>
                <span className="text-amber-400">|</span>
                <span>Full Report</span>
              </>
            )}
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-[#1A202C] mb-4 tracking-tight" style={{ letterSpacing: '-0.03em' }}>
            {viewState === 'form' && 'Check if your rent is fair'}
            {viewState === 'preview' && 'Your Analysis Preview'}
            {viewState === 'full' && 'Your Full Report'}
          </h1>
          <p className="text-xl text-[#4A5568] max-w-2xl mx-auto">
            {viewState === 'form' && 'Compare your wolse quote against market rates and legal limits'}
            {viewState === 'preview' && 'Unlock to see exact numbers and negotiation scripts'}
            {viewState === 'full' && 'Based on recent market data and legal conversion rates'}
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700">
            <p className="font-medium">Error</p>
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Main Content */}
        {viewState === 'form' && (
          <>
            {/* Input Form */}
            <div className="bg-white rounded-3xl p-8 mb-8 shadow-xl shadow-amber-900/5 border border-amber-100">
              <WolseInputForm onSubmit={handleSubmit} loading={loading} />
            </div>

            {/* How It Works */}
            <div className="mt-12">
              <h2 className="text-2xl font-bold text-[#1A202C] mb-6 text-center">How It Works</h2>
              <div className="grid md:grid-cols-3 gap-6">
                <div className="bg-white rounded-3xl p-6 border border-amber-100 shadow-lg shadow-amber-900/5">
                  <div className="w-12 h-12 bg-gradient-to-br from-amber-100 to-orange-100 rounded-xl flex items-center justify-center mb-4">
                    <span className="text-2xl">📊</span>
                  </div>
                  <h3 className="font-bold text-[#1A202C] mb-2">1. Analyze</h3>
                  <p className="text-[#4A5568] text-sm leading-relaxed">
                    We analyze recent wolse contracts in your building to calculate the market rate
                  </p>
                </div>

                <div className="bg-white rounded-3xl p-6 border border-amber-100 shadow-lg shadow-amber-900/5">
                  <div className="w-12 h-12 bg-gradient-to-br from-amber-100 to-orange-100 rounded-xl flex items-center justify-center mb-4">
                    <span className="text-2xl">👀</span>
                  </div>
                  <h3 className="font-bold text-[#1A202C] mb-2">2. Preview</h3>
                  <p className="text-[#4A5568] text-sm leading-relaxed">
                    See if your rent is fair, overpriced, or a great deal - for free
                  </p>
                </div>

                <div className="bg-white rounded-3xl p-6 border border-amber-100 shadow-lg shadow-amber-900/5">
                  <div className="w-12 h-12 bg-gradient-to-br from-amber-100 to-orange-100 rounded-xl flex items-center justify-center mb-4">
                    <span className="text-2xl">🔓</span>
                  </div>
                  <h3 className="font-bold text-[#1A202C] mb-2">3. Unlock</h3>
                  <p className="text-[#4A5568] text-sm leading-relaxed">
                    Get exact numbers and negotiation scripts to use with your landlord
                  </p>
                </div>
              </div>
            </div>

            {/* What is Conversion Rate */}
            <div className="mt-8 bg-gradient-to-br from-amber-900 to-orange-950 rounded-3xl p-6 text-white shadow-xl shadow-amber-900/20">
              <h3 className="text-lg font-bold text-amber-100 mb-3 flex items-center gap-2">
                <span>💡</span> What is Conversion Rate (전환율)?
              </h3>
              <p className="text-amber-50/90 leading-relaxed mb-4">
                The conversion rate is the annual interest rate used to convert between deposit (보증금) and monthly rent (월세).
                A higher deposit means lower monthly rent, and vice versa.
              </p>
              <p className="text-amber-100/80 text-sm">
                <strong>Legal Limit:</strong> The Housing Lease Protection Act caps this rate at the Bank of Korea base rate + 2%.
                Currently this is <strong className="text-amber-200">4.5%</strong> (BOK 2.5% + 2%).
              </p>
            </div>
          </>
        )}

        {viewState === 'preview' && previewResult && (
          <WolsePreviewDisplay
            result={previewResult}
            onUnlock={handleUnlock}
            isLoading={unlocking}
          />
        )}

        {viewState === 'full' && fullResult && (
          <WolseResultsDisplay
            result={fullResult}
            onNewAnalysis={handleNewAnalysis}
          />
        )}
      </div>

      {/* Payment Modal */}
      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        onPaymentSuccess={handlePaymentSuccess}
        onFreeBeta={handleFreeBeta}
        amount={9900}
        orderName="Wolse Price Analysis"
        analysisId={tempAnalysisId}
        isBetaPeriod={true}
        isUnlocking={unlocking}
        previewResult={previewResult}
        inputData={inputData}
      />

      {/* Footer */}
      <footer className="relative z-10 bg-amber-50 border-t border-amber-100 py-8 mt-16">
        <div className="container mx-auto px-6 max-w-4xl text-center text-[#4A5568] text-sm">
          <p>
            Data source: MOLIT Real Transaction Price API (국토교통부 실거래가 공개시스템)
          </p>
          <p className="mt-2">
            Legal reference: Housing Lease Protection Act (주택임대차보호법)
          </p>
        </div>
      </footer>
    </div>
  );
}
