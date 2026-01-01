'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter, notFound } from 'next/navigation';
import Link from 'next/link';
import { loadPaymentWidget } from '@tosspayments/payment-widget-sdk';
import { analytics } from '@/lib/analytics';

const TOSS_CLIENT_KEY = process.env.NEXT_PUBLIC_TOSS_PAYMENTS_CLIENT_KEY || '';
const PAYMENT_AMOUNT = 39900; // ₩39,900 for full analysis
const DEV_MODE = process.env.NEXT_PUBLIC_ENABLE_DEV_MODE === 'true';

export default function PaymentPage() {
  const params = useParams();
  const router = useRouter();
  const type = params.type as string;
  const analysisId = params.id as string;

  if (type !== 'jeonse' && type !== 'wolse') {
    notFound();
  }

  const isWolse = type === 'wolse';
  const accentColor = isWolse ? 'orange' : 'amber';

  const [paymentWidget, setPaymentWidget] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [orderData, setOrderData] = useState<any>(null);
  const [showPaymentWidget, setShowPaymentWidget] = useState(false);
  const hasTrackedPageView = useRef(false);

  // Track payment page view
  useEffect(() => {
    if (!hasTrackedPageView.current) {
      hasTrackedPageView.current = true;
      analytics.paymentInitiated(analysisId, PAYMENT_AMOUNT);
    }
  }, [analysisId]);

  // Initialize payment widget
  useEffect(() => {
    async function initializePayment() {
      try {
        setIsLoading(true);

        // Create payment order
        const response = await fetch('/api/payments/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            analysisId,
            amount: PAYMENT_AMOUNT,
            orderName: `${isWolse ? '월세' : '전세'} 안전 검사 서비스`,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to create payment order');
        }

        const data = await response.json();
        setOrderData(data.payment);

        // Load Toss Payments Widget SDK
        const widget = await loadPaymentWidget(TOSS_CLIENT_KEY, `customer_${analysisId}`);
        setPaymentWidget(widget);
        setIsLoading(false);
      } catch (err: any) {
        console.error('Error initializing payment:', err);
        setError(`Payment initialization failed: ${err.message || 'Unknown error'}`);
        setIsLoading(false);
      }
    }

    initializePayment();
  }, [analysisId, isWolse]);

  // Render payment widget when showPaymentWidget becomes true
  useEffect(() => {
    if (showPaymentWidget && paymentWidget) {
      async function renderWidget() {
        try {
          await paymentWidget.renderPaymentMethods('#payment-method', { value: PAYMENT_AMOUNT });
          await paymentWidget.renderAgreement('#agreement');
        } catch (err: any) {
          console.error('Failed to render payment widget:', err);
          setError(`Failed to render payment widget: ${err.message}`);
        }
      }
      renderWidget();
    }
  }, [showPaymentWidget, paymentWidget]);

  const handlePayment = async () => {
    if (!orderData) return;

    try {
      // Show the payment widget UI
      setShowPaymentWidget(true);
    } catch (err: any) {
      console.error('Payment request failed:', err);
      setError(err.message || 'Payment request failed.');
    }
  };

  const handlePaymentWidgetSubmit = async () => {
    try {
      if (!paymentWidget || !orderData) {
        throw new Error('Payment widget not ready');
      }

      await paymentWidget.requestPayment({
        orderId: orderData.orderId,
        orderName: orderData.orderName,
        successUrl: `${window.location.origin}/analyze/${type}/${analysisId}/report`,
        failUrl: `${window.location.origin}/analyze/${type}/${analysisId}/payment?error=payment_failed`,
        customerEmail: orderData.customerEmail || undefined,
        customerName: orderData.customerName || undefined,
      });
    } catch (err: any) {
      console.error('Payment request failed:', err);
      setError(err.message || 'Payment request failed.');
    }
  };

  const handleSkipPayment = async () => {
    if (!DEV_MODE) return;

    try {
      setIsLoading(true);

      const response = await fetch('/api/payments/skip-dev', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analysisId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to skip payment');
      }

      analytics.freeBetaUsed(analysisId, type);
      router.push(`/analyze/${type}/${analysisId}/report`);
    } catch (err: any) {
      console.error('Skip payment failed:', err);
      setError(err.message || 'Failed to skip payment');
      setIsLoading(false);
    }
  };

  if (error) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 text-center border border-red-100">
          <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-2xl flex items-center justify-center">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment Error</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => setError(null)}
            className={`w-full bg-gradient-to-r ${isWolse ? 'from-orange-500 to-amber-500' : 'from-amber-500 to-orange-500'} text-white px-6 py-3 rounded-xl font-semibold`}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFBF7]">
      {/* Background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-[#FEF7ED] via-[#FDFBF7] to-[#F5F0E8]" />
        <div className={`absolute top-20 right-[10%] w-64 h-64 ${isWolse ? 'bg-orange-200/20' : 'bg-amber-200/20'} rounded-full blur-3xl`} />
        <div className={`absolute bottom-[30%] left-[5%] w-48 h-48 ${isWolse ? 'bg-amber-200/20' : 'bg-orange-200/20'} rounded-full blur-3xl`} />
      </div>

      {/* Header */}
      <header className="relative z-10 bg-[#FDFBF7]/80 backdrop-blur-md border-b border-amber-100">
        <div className="container mx-auto px-6 py-4 max-w-7xl">
          <Link href="/" className="flex items-center gap-3 group">
            <div className={`w-10 h-10 bg-gradient-to-br ${isWolse ? 'from-orange-500 to-amber-600' : 'from-amber-500 to-orange-600'} rounded-xl flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform`}>
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <span className="text-xl font-semibold text-[#2D3748]">K-Rent Safety</span>
          </Link>
        </div>
      </header>

      <div className="relative z-10 container mx-auto px-6 py-16 max-w-2xl">
        {/* Breadcrumb */}
        <div className="mb-8">
          <Link href={`/analyze/${type}/${analysisId}/preview`} className={`text-${accentColor}-600 hover:text-${accentColor}-700 font-medium inline-flex items-center gap-2 group`}>
            <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Preview
          </Link>
        </div>

        {/* Header Section */}
        <div className="text-center mb-10">
          <div className={`inline-flex items-center gap-2 px-4 py-2 bg-${accentColor}-50 text-${accentColor}-700 rounded-full text-sm font-semibold mb-6 border border-${accentColor}-200`}>
            <span>{isWolse ? 'Wolse' : 'Jeonse'} Check</span>
            <span className={`text-${accentColor}-400`}>|</span>
            <span>Step 4 of 4</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-[#1A202C] mb-4 tracking-tight">
            Complete Payment
          </h1>
          <p className="text-xl text-[#4A5568]">
            Unlock your full safety analysis report
          </p>
        </div>

        {/* Payment Info Card */}
        <div className={`bg-white rounded-3xl shadow-xl p-8 mb-6 border border-${accentColor}-100`}>
          <div className={`flex items-center gap-4 mb-6 pb-6 border-b border-${accentColor}-100`}>
            <div className={`w-14 h-14 bg-gradient-to-br from-${accentColor}-100 to-orange-100 rounded-2xl flex items-center justify-center`}>
              <svg className={`w-7 h-7 text-${accentColor}-600`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#1A202C]">{isWolse ? 'Wolse' : 'Jeonse'} Safety Analysis</h2>
              <p className="text-[#718096]">Complete risk + market analysis</p>
            </div>
          </div>

          {/* What's Included */}
          <div className="mb-6 space-y-3">
            <div className="flex items-center gap-3 text-gray-700">
              <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span>Full risk analysis with detailed scores</span>
            </div>
            <div className="flex items-center gap-3 text-gray-700">
              <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span>Debt ranking & priority analysis</span>
            </div>
            <div className="flex items-center gap-3 text-gray-700">
              <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span>Market position & price comparison</span>
            </div>
            <div className="flex items-center gap-3 text-gray-700">
              <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span>Actionable recommendations</span>
            </div>
          </div>

          <div className="flex justify-between items-center pt-4 border-t border-gray-100">
            <span className="text-gray-600 font-medium">Total</span>
            <span className="text-3xl font-bold text-gray-900">₩{PAYMENT_AMOUNT.toLocaleString()}</span>
          </div>
        </div>

        {/* Payment Button */}
        {isLoading ? (
          <div className="bg-white rounded-3xl shadow-xl p-12 text-center border border-amber-100">
            <div className="w-16 h-16 mx-auto mb-4 relative">
              <div className={`absolute inset-0 border-4 border-${accentColor}-200 rounded-full`}></div>
              <div className={`absolute inset-0 border-4 border-${accentColor}-500 border-t-transparent rounded-full animate-spin`}></div>
            </div>
            <p className="text-gray-600 font-medium">Loading payment...</p>
          </div>
        ) : (
          <div className="bg-white rounded-3xl shadow-xl p-8 border border-amber-100">
            {!showPaymentWidget ? (
              <div className="space-y-4">
                <button
                  onClick={handlePayment}
                  className={`w-full bg-gradient-to-r ${isWolse ? 'from-orange-500 to-amber-500' : 'from-amber-500 to-orange-500'} text-white text-lg font-bold px-8 py-5 rounded-2xl hover:shadow-xl transition-all hover:-translate-y-1 flex items-center justify-center gap-3`}
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                  Pay ₩{PAYMENT_AMOUNT.toLocaleString()}
                </button>

                {DEV_MODE && (
                  <button
                    onClick={handleSkipPayment}
                    className="w-full bg-gray-100 text-gray-700 text-sm font-medium px-6 py-3 rounded-xl hover:bg-gray-200 transition-colors"
                  >
                    Skip Payment (Dev Mode)
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Payment Method</h3>
                  <div id="payment-method" className="min-h-[200px] border border-gray-200 rounded-2xl overflow-hidden"></div>
                </div>
                <div id="agreement"></div>
                <button
                  onClick={handlePaymentWidgetSubmit}
                  className={`w-full bg-gradient-to-r ${isWolse ? 'from-orange-500 to-amber-500' : 'from-amber-500 to-orange-500'} text-white text-lg font-bold px-8 py-4 rounded-2xl hover:shadow-xl transition-all`}
                >
                  Complete Payment
                </button>
                <button
                  onClick={() => setShowPaymentWidget(false)}
                  className="w-full bg-gray-100 text-gray-600 text-sm font-medium px-6 py-3 rounded-xl hover:bg-gray-200 transition-colors"
                >
                  Back
                </button>
              </div>
            )}
          </div>
        )}

        {/* Security Notice */}
        <div className="mt-6 text-center text-sm text-gray-500 flex items-center justify-center gap-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          Securely processed by Toss Payments
        </div>
      </div>
    </div>
  );
}
