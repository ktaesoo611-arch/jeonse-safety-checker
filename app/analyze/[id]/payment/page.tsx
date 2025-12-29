'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { loadPaymentWidget } from '@tosspayments/payment-widget-sdk';

const TOSS_CLIENT_KEY = process.env.NEXT_PUBLIC_TOSS_PAYMENTS_CLIENT_KEY || '';
const PAYMENT_AMOUNT = 0; // Free during beta period - Updated 2025-12-02
const DEV_MODE = process.env.NEXT_PUBLIC_ENABLE_DEV_MODE === 'true';

export default function PaymentPage() {
  const params = useParams();
  const router = useRouter();
  const analysisId = params.id as string;

  // Version: 2025-12-02-v2 - Force cache bust

  const [paymentWidget, setPaymentWidget] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [orderData, setOrderData] = useState<any>(null);
  const [showPaymentWidget, setShowPaymentWidget] = useState(false);

  // Initialize payment widget
  useEffect(() => {
    async function initializePayment() {
      try {
        setIsLoading(true);

        console.log('Starting payment initialization...');
        console.log('TOSS_CLIENT_KEY:', TOSS_CLIENT_KEY ? 'Present' : 'Missing');

        // Create payment order
        console.log('Creating payment order for analysis:', analysisId);
        const response = await fetch('/api/payments/create', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            analysisId,
            amount: PAYMENT_AMOUNT,
            orderName: '전세 안전 검사 서비스',
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error('Payment order creation failed:', errorData);
          throw new Error(errorData.error || 'Failed to create payment order');
        }

        const data = await response.json();
        console.log('Payment order created:', data);
        setOrderData(data.payment);

        // Load Toss Payments Widget SDK
        console.log('Loading Toss Payment Widget...');
        const paymentWidget = await loadPaymentWidget(TOSS_CLIENT_KEY, `customer_${analysisId}`);
        console.log('Payment Widget loaded');
        console.log('Available methods:', Object.keys(paymentWidget));
        console.log('PaymentWidget object:', paymentWidget);

        setPaymentWidget(paymentWidget);

        console.log('Payment initialization complete');
        setIsLoading(false);
      } catch (err: any) {
        console.error('Error initializing payment:', err);
        console.error('Error details:', {
          message: err.message,
          code: err.code,
          stack: err.stack,
        });
        setError(`Payment initialization failed: ${err.message || 'Unknown error'}`);
        setIsLoading(false);
      }
    }

    initializePayment();
  }, [analysisId]);

  // Render payment widget when showPaymentWidget becomes true
  useEffect(() => {
    if (showPaymentWidget && paymentWidget) {
      async function renderWidget() {
        try {
          console.log('Rendering payment widget...');

          // Render payment methods - use selector string
          await paymentWidget.renderPaymentMethods(
            '#payment-method',
            { value: 14900 }
          );

          // Render agreement - use selector string
          await paymentWidget.renderAgreement('#agreement');

          console.log('Payment widget rendered successfully');
        } catch (err: any) {
          console.error('Failed to render payment widget:', err);
          setError(`Failed to render payment widget: ${err.message}`);
        }
      }

      renderWidget();
    }
  }, [showPaymentWidget, paymentWidget]);

  const handlePayment = async (amount: number = PAYMENT_AMOUNT) => {
    console.log('=== handlePayment called ===');
    console.log('Payment amount:', amount);
    console.log('orderData:', orderData);

    if (!orderData) {
      console.log('No orderData, returning early');
      return;
    }

    try {
      // If payment amount is 0 (free beta), mark as approved and redirect to upload
      if (amount === 0) {
        console.log('Free beta detected - marking payment as approved');
        setIsLoading(true);

        const response = await fetch('/api/payments/skip-dev', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            analysisId,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to process free beta');
        }

        console.log('Payment marked as approved, redirecting to upload');
        router.push(`/analyze/${analysisId}/upload`);
        return;
      }

      console.log('Proceeding to Toss Payments with amount:', amount);

      if (!paymentWidget) {
        throw new Error('Payment widget not initialized');
      }

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

      console.log('Requesting payment...');

      // Use Toss Payment Widget SDK requestPayment method
      await paymentWidget.requestPayment({
        orderId: orderData.orderId,
        orderName: orderData.orderName,
        successUrl: `${window.location.origin}/analyze/${analysisId}/payment/success`,
        failUrl: `${window.location.origin}/analyze/${analysisId}/payment/fail`,
        customerEmail: orderData.customerEmail || undefined,
        customerName: orderData.customerName || undefined,
      });
    } catch (err: any) {
      console.error('Payment request failed:', err);
      setError(err.message || 'Payment request failed.');
    }
  };

  const handleSkipPayment = async () => {
    try {
      setIsLoading(true);

      const response = await fetch('/api/payments/skip-dev', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          analysisId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to skip payment');
      }

      // Redirect to analysis page to continue with upload
      router.push(`/analyze/${analysisId}`);
    } catch (err: any) {
      console.error('Skip payment failed:', err);
      setError(err.message || 'Failed to skip payment');
      setIsLoading(false);
    }
  };

  if (error) {
    return (
      <div className="min-h-screen bg-[#FDFBF7]">
        {/* Warm gradient background */}
        <div className="fixed inset-0 z-0 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-b from-[#FEF7ED] via-[#FDFBF7] to-[#F5F0E8]" />
          <div className="absolute top-20 right-[10%] w-64 h-64 bg-amber-200/20 rounded-full blur-3xl" />
          <div className="absolute bottom-[30%] left-[5%] w-48 h-48 bg-orange-200/20 rounded-full blur-3xl" />
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

        <div className="relative z-10 flex items-center justify-center p-8 min-h-[80vh]">
          <div className="max-w-md w-full bg-white rounded-3xl shadow-xl shadow-amber-900/5 p-8 text-center border border-amber-100">
            <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-2xl flex items-center justify-center">
              <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-[#1A202C] mb-2">Payment Error</h2>
            <p className="text-[#4A5568] mb-6">{error}</p>
            <button
              onClick={() => router.push(`/analyze/${analysisId}`)}
              className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white px-6 py-3 rounded-xl hover:shadow-lg hover:shadow-amber-200/50 transition-all font-semibold"
            >
              Go Back
            </button>
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
        <div className="absolute top-20 right-[10%] w-64 h-64 bg-amber-200/20 rounded-full blur-3xl" />
        <div className="absolute bottom-[30%] left-[5%] w-48 h-48 bg-orange-200/20 rounded-full blur-3xl" />
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

      <div className="relative z-10 container mx-auto px-6 py-16 max-w-2xl">
        {/* Breadcrumb */}
        <div className="mb-8">
          <Link href="/" className="text-amber-600 hover:text-amber-700 font-medium inline-flex items-center gap-2 group">
            <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to home
          </Link>
        </div>

        {/* Header Section */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-700 rounded-full text-sm font-semibold mb-6 border border-amber-200">
            <span>Deposit Safety</span>
            <span className="text-amber-400">|</span>
            <span>Step 2 of 4</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-[#1A202C] mb-4 tracking-tight" style={{ letterSpacing: '-0.03em' }}>
            Complete Payment
          </h1>
          <p className="text-xl text-[#4A5568]">
            Pay for K-Rent Safety Analysis service
          </p>
        </div>

        {/* Payment Info Card */}
        <div className="bg-white rounded-3xl shadow-xl shadow-amber-900/5 p-8 mb-6 border border-amber-100">
          <div className="flex items-center gap-4 mb-6 pb-6 border-b border-amber-100">
            <div className="w-14 h-14 bg-gradient-to-br from-amber-100 to-orange-100 rounded-2xl flex items-center justify-center">
              <svg className="w-7 h-7 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#1A202C]">K-Rent Safety Analysis</h2>
              <p className="text-[#718096]">Complete deposit safety check</p>
            </div>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[#4A5568] font-medium">Amount</span>
            <div className="text-right">
              <span className="text-3xl font-bold text-amber-600">
                {PAYMENT_AMOUNT === 0 ? 'Free' : `₩${Number(PAYMENT_AMOUNT).toLocaleString()}`}
              </span>
              {PAYMENT_AMOUNT === 0 && (
                <p className="text-sm text-amber-600 font-medium">Beta Period</p>
              )}
            </div>
          </div>
        </div>

        {/* Payment Button */}
        {isLoading ? (
          <div className="bg-white rounded-3xl shadow-xl shadow-amber-900/5 p-12 text-center border border-amber-100">
            <div className="w-16 h-16 mx-auto mb-4 relative">
              <div className="absolute inset-0 border-4 border-amber-200 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
            <p className="text-[#4A5568] font-medium">Loading payment information...</p>
          </div>
        ) : (
          <div className="bg-white rounded-3xl shadow-xl shadow-amber-900/5 p-8 border border-amber-100">
            {!showPaymentWidget ? (
              <>
                <div className="space-y-4 mb-8">
                  <div className="p-5 bg-blue-50 rounded-2xl border border-blue-100">
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">💳</span>
                      <div>
                        <p className="font-semibold text-[#1A202C] mb-1">Test Payment Integration</p>
                        <p className="text-sm text-[#4A5568]">For Toss Payments Review - Click to see checkout integration</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-5 bg-amber-50 rounded-2xl border border-amber-200">
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">🎉</span>
                      <div>
                        <p className="font-semibold text-[#1A202C] mb-1">Beta Free Trial</p>
                        <p className="text-sm text-[#4A5568]">Use the service without payment during beta period</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Payment Buttons */}
                <div className="space-y-4">
                  {/* Test Payment Button - For Toss Demo */}
                  <button
                    onClick={() => handlePayment(14900)}
                    className="w-full bg-blue-600 text-white text-lg font-semibold px-8 py-4 rounded-2xl hover:bg-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center gap-3"
                  >
                    <span className="text-xl">💳</span>
                    <span>Test Payment (₩14,900)</span>
                  </button>

                  {/* Free Beta Button */}
                  <button
                    onClick={() => handlePayment(0)}
                    className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white text-lg font-semibold px-8 py-4 rounded-2xl hover:shadow-xl hover:shadow-amber-200/50 transition-all duration-200 hover:-translate-y-1 flex items-center justify-center gap-3"
                  >
                    <span className="text-xl">🎉</span>
                    <span>Continue Free (Beta)</span>
                  </button>
                </div>
              </>
            ) : (
              <>
                {/* Toss Payment Widget UI */}
                <div className="space-y-6">
                  {/* Payment Methods */}
                  <div>
                    <h3 className="text-lg font-semibold text-[#1A202C] mb-3">Payment Method</h3>
                    <div id="payment-method" className="min-h-[200px] border border-amber-100 rounded-2xl overflow-hidden"></div>
                  </div>

                  {/* Agreement */}
                  <div>
                    <div id="agreement"></div>
                  </div>

                  {/* Payment Button */}
                  <button
                    onClick={handlePaymentWidgetSubmit}
                    className="w-full bg-blue-600 text-white text-lg font-semibold px-8 py-4 rounded-2xl hover:bg-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl"
                  >
                    Pay ₩14,900
                  </button>

                  {/* Back Button */}
                  <button
                    onClick={() => setShowPaymentWidget(false)}
                    className="w-full bg-gray-100 text-[#4A5568] text-sm font-medium px-6 py-3 rounded-xl hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Back to Options
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Information Card */}
        <div className="mt-6 bg-gradient-to-br from-amber-900 to-orange-950 rounded-3xl p-6 text-white shadow-xl shadow-amber-900/20">
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-12 h-12 bg-amber-100/20 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-amber-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-amber-100 mb-2 text-lg">Important Information</h3>
              <ul className="text-sm text-amber-50/90 space-y-2">
                <li>After payment, you can upload your property register document for analysis</li>
                <li>Multiple payment methods supported: cards, bank transfer, and mobile payments</li>
                <li>All payments are securely processed through Toss Payments</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
