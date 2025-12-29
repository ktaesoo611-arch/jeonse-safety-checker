'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { JeonsePreviewDisplay } from '@/components/jeonse';
import { loadPaymentWidget } from '@tosspayments/payment-widget-sdk';

const TOSS_CLIENT_KEY = process.env.NEXT_PUBLIC_TOSS_PAYMENTS_CLIENT_KEY || '';

interface PreviewData {
  analysisId: string;
  property: {
    address: string;
    proposedJeonse: number;
    estimatedValue: number | null;
  };
  riskAnalysis: {
    overallScore: number;
    riskLevel: string;
    verdict: string;
    metrics: {
      ltv: number;
      totalDebt: number;
      availableEquity: number;
      debtCount: number;
    };
    risks: Array<{
      type: string;
      severity: string;
      description: string;
    }>;
  };
  summary: {
    criticalIssues: number;
    highIssues: number;
    moderateIssues: number;
  };
}

export default function JeonsePreviewPage() {
  const params = useParams();
  const router = useRouter();
  const analysisId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const [paymentWidget, setPaymentWidget] = useState<any>(null);
  const [showPaymentMethods, setShowPaymentMethods] = useState(false);

  // Fetch preview data
  useEffect(() => {
    async function fetchPreview() {
      try {
        const response = await fetch(`/api/analysis/report/${analysisId}`);

        if (!response.ok) {
          throw new Error('Unable to load preview');
        }

        const data = await response.json();
        setPreviewData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    fetchPreview();
  }, [analysisId]);

  // Initialize payment widget when modal opens
  useEffect(() => {
    if (!showPaymentModal || !TOSS_CLIENT_KEY) return;

    async function initWidget() {
      try {
        const shortId = analysisId.replace(/-/g, '').substring(0, 32);
        const widget = await loadPaymentWidget(TOSS_CLIENT_KEY, `jeonse_${shortId}`);
        setPaymentWidget(widget);
      } catch (err) {
        console.error('Failed to load payment widget:', err);
        setError('Failed to initialize payment');
      }
    }

    initWidget();
  }, [showPaymentModal, analysisId]);

  // Render payment methods
  useEffect(() => {
    if (showPaymentMethods && paymentWidget) {
      async function renderWidget() {
        try {
          await paymentWidget.renderPaymentMethods('#jeonse-payment-method', { value: 14900 });
          await paymentWidget.renderAgreement('#jeonse-agreement');
        } catch (err: any) {
          console.error('Failed to render payment widget:', err);
          setError(`Failed to render payment: ${err.message}`);
        }
      }
      renderWidget();
    }
  }, [showPaymentMethods, paymentWidget]);

  const handleUnlock = () => {
    setShowPaymentModal(true);
  };

  const handleFreeBeta = useCallback(async () => {
    setUnlocking(true);
    try {
      // Mark as paid (free beta) and redirect to full report
      const response = await fetch('/api/payments/skip-dev', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analysisId })
      });

      if (!response.ok) {
        throw new Error('Failed to unlock');
      }

      // Redirect to full report
      router.push(`/analyze/${analysisId}/report`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to unlock');
      setUnlocking(false);
    }
  }, [analysisId, router]);

  const handlePayment = useCallback(async () => {
    if (!paymentWidget) return;

    try {
      setUnlocking(true);
      const orderId = `jeonse_${analysisId}_${Date.now()}`;

      await paymentWidget.requestPayment({
        orderId,
        orderName: 'Deposit Safety Analysis',
        successUrl: `${window.location.origin}/analyze/${analysisId}/payment/success`,
        failUrl: `${window.location.origin}/analyze/${analysisId}/preview?error=payment_failed`,
      });
    } catch (err: any) {
      console.error('Payment request failed:', err);
      setError(err.message || 'Payment failed');
      setUnlocking(false);
    }
  }, [paymentWidget, analysisId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 relative">
            <div className="absolute inset-0 border-4 border-amber-200 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <p className="text-[#4A5568] font-medium">Loading preview...</p>
        </div>
      </div>
    );
  }

  if (error || !previewData) {
    return (
      <div className="min-h-screen bg-[#FDFBF7]">
        <div className="fixed inset-0 z-0 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-b from-[#FEF7ED] via-[#FDFBF7] to-[#F5F0E8]" />
        </div>

        <header className="relative z-10 bg-[#FDFBF7]/80 backdrop-blur-md border-b border-amber-100">
          <div className="container mx-auto px-6 py-4 max-w-7xl">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-amber-200 group-hover:scale-105 transition-transform">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <span className="text-xl font-semibold text-[#2D3748]">K-Rent Safety</span>
            </Link>
          </div>
        </header>

        <div className="relative z-10 flex items-center justify-center p-8 min-h-[80vh]">
          <div className="max-w-md w-full bg-white rounded-3xl shadow-xl shadow-amber-900/5 p-8 text-center border border-amber-100">
            <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-2xl flex items-center justify-center">
              <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-[#1A202C] mb-2">Error</h2>
            <p className="text-[#4A5568] mb-6">{error || 'Preview not found'}</p>
            <Link
              href="/"
              className="inline-block w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white px-6 py-3 rounded-xl hover:shadow-lg hover:shadow-amber-200/50 transition-all font-semibold"
            >
              Back to home
            </Link>
          </div>
        </div>
      </div>
    );
  }

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
        <div className="container mx-auto px-6 py-4 max-w-7xl">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-amber-200 group-hover:scale-105 transition-transform">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <span className="text-xl font-semibold text-[#2D3748]">K-Rent Safety</span>
          </Link>
        </div>
      </header>

      <div className="relative z-10 container mx-auto px-6 py-12 max-w-4xl">
        {/* Breadcrumb */}
        <div className="mb-8">
          <Link href="/" className="text-amber-600 hover:text-amber-700 font-medium inline-flex items-center gap-2 group">
            <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to home
          </Link>
        </div>

        {/* Page Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-700 rounded-full text-sm font-semibold mb-6 border border-amber-200">
            <span>Deposit Safety</span>
            <span className="text-amber-400">|</span>
            <span>Preview</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-[#1A202C] mb-4 tracking-tight" style={{ letterSpacing: '-0.03em' }}>
            Analysis Preview
          </h1>
          <p className="text-xl text-[#4A5568] max-w-2xl mx-auto">
            See your risk level - unlock for full details and recommendations
          </p>
        </div>

        {/* Preview Display */}
        <JeonsePreviewDisplay
          data={previewData}
          onUnlock={handleUnlock}
          isLoading={unlocking}
        />
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowPaymentModal(false)}
          />

          {/* Modal */}
          <div className="relative bg-white rounded-3xl shadow-2xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
            {/* Close button */}
            <button
              onClick={() => setShowPaymentModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors z-10"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Header */}
            <div className="p-6 border-b border-amber-100">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gradient-to-br from-amber-100 to-orange-100 rounded-2xl flex items-center justify-center">
                  <span className="text-2xl">🔓</span>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-[#1A202C]">Unlock Full Report</h2>
                  <p className="text-[#718096]">Deposit Safety Analysis</p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              {!showPaymentMethods ? (
                <>
                  {/* What's included */}
                  <div className="mb-6">
                    <h3 className="font-semibold text-[#1A202C] mb-3">What you'll get:</h3>
                    <ul className="space-y-2">
                      <li className="flex items-center gap-2 text-[#4A5568]">
                        <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Exact safety score with breakdown
                      </li>
                      <li className="flex items-center gap-2 text-[#4A5568]">
                        <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        LTV ratio and debt analysis
                      </li>
                      <li className="flex items-center gap-2 text-[#4A5568]">
                        <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Debt priority ranking table
                      </li>
                      <li className="flex items-center gap-2 text-[#4A5568]">
                        <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Detailed risk descriptions
                      </li>
                      <li className="flex items-center gap-2 text-[#4A5568]">
                        <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Personalized recommendations
                      </li>
                    </ul>
                  </div>

                  {/* Price */}
                  <div className="bg-amber-50 rounded-2xl p-4 mb-6 border border-amber-200">
                    <div className="flex justify-between items-center">
                      <span className="text-[#4A5568] font-medium">Total</span>
                      <div className="text-right">
                        <span className="text-2xl font-bold text-amber-600">Free</span>
                        <p className="text-sm text-amber-600">Beta Period</p>
                      </div>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="space-y-3">
                    <button
                      onClick={handleFreeBeta}
                      disabled={unlocking}
                      className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold py-4 rounded-2xl hover:shadow-lg hover:shadow-amber-200/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {unlocking ? (
                        <span className="flex items-center justify-center gap-2">
                          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          Unlocking...
                        </span>
                      ) : (
                        'Unlock Free (Beta)'
                      )}
                    </button>

                    <button
                      onClick={() => setShowPaymentMethods(true)}
                      disabled={!paymentWidget}
                      className="w-full bg-white border-2 border-amber-200 text-[#4A5568] font-medium py-3 rounded-2xl hover:bg-amber-50 transition-colors disabled:opacity-50"
                    >
                      Or pay ₩14,900 to support us
                    </button>
                  </div>
                </>
              ) : (
                <>
                  {/* Payment widget */}
                  <div className="space-y-4">
                    <div id="jeonse-payment-method" className="min-h-[200px]"></div>
                    <div id="jeonse-agreement"></div>

                    <button
                      onClick={handlePayment}
                      disabled={unlocking}
                      className="w-full bg-blue-600 text-white font-semibold py-4 rounded-2xl hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                      {unlocking ? 'Processing...' : 'Pay ₩14,900'}
                    </button>

                    <button
                      onClick={() => setShowPaymentMethods(false)}
                      className="w-full text-[#718096] text-sm py-2 hover:text-[#4A5568] transition-colors"
                    >
                      ← Back to options
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-amber-100 bg-amber-50/50 rounded-b-3xl">
              <p className="text-xs text-[#718096] text-center">
                Secure payment powered by Toss Payments
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
