'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { loadTossPayments } from '@tosspayments/tosspayments-sdk';

const TOSS_CLIENT_KEY = process.env.NEXT_PUBLIC_TOSS_PAYMENTS_CLIENT_KEY || '';
const PAYMENT_AMOUNT = 0; // Free during beta period - Updated 2025-12-02
const DEV_MODE = process.env.NEXT_PUBLIC_ENABLE_DEV_MODE === 'true';

export default function PaymentPage() {
  const params = useParams();
  const router = useRouter();
  const analysisId = params.id as string;

  const [paymentWidget, setPaymentWidget] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [orderData, setOrderData] = useState<any>(null);

  const paymentMethodsRef = useRef<HTMLDivElement>(null);
  const agreementRef = useRef<HTMLDivElement>(null);

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

        // Load Toss Payments SDK (for Payment Window, not Widget)
        console.log('Loading Toss Payments SDK...');
        const tossPayments = await loadTossPayments(TOSS_CLIENT_KEY);
        console.log('Toss Payments SDK loaded');
        console.log('Available methods:', Object.keys(tossPayments));
        console.log('TossPayments object:', tossPayments);

        setPaymentWidget(tossPayments);

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

  const handlePayment = async () => {
    console.log('=== handlePayment called ===');
    console.log('PAYMENT_AMOUNT:', PAYMENT_AMOUNT);
    console.log('orderData:', orderData);

    if (!orderData) {
      console.log('No orderData, returning early');
      return;
    }

    try {
      // If payment amount is 0 (free beta), skip payment and go directly to analysis page
      if (PAYMENT_AMOUNT === 0) {
        console.log('Free beta detected - redirecting to analysis page');
        console.log('Redirecting to:', `/analyze/${analysisId}`);
        router.push(`/analyze/${analysisId}`);
        return;
      }

      console.log('Payment amount is not 0, proceeding to Toss Payments');

      // Redirect to Toss Payments hosted payment page
      const paymentUrl = new URL('https://payment.toss.im/web/pay');

      paymentUrl.searchParams.append('clientKey', TOSS_CLIENT_KEY);
      paymentUrl.searchParams.append('amount', PAYMENT_AMOUNT.toString());
      paymentUrl.searchParams.append('orderId', orderData.orderId);
      paymentUrl.searchParams.append('orderName', orderData.orderName);
      paymentUrl.searchParams.append('successUrl', `${window.location.origin}/analyze/${analysisId}/payment/success`);
      paymentUrl.searchParams.append('failUrl', `${window.location.origin}/analyze/${analysisId}/payment/fail`);

      if (orderData.customerEmail) {
        paymentUrl.searchParams.append('customerEmail', orderData.customerEmail);
      }
      if (orderData.customerName) {
        paymentUrl.searchParams.append('customerName', orderData.customerName);
      }

      // Redirect to Toss Payments
      window.location.href = paymentUrl.toString();
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
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment Error</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => router.push(`/analyze/${analysisId}`)}
            className="w-full bg-emerald-600 text-white px-6 py-3 rounded-xl hover:bg-emerald-700 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Payment
          </h1>
          <p className="text-gray-600">
            Complete payment for Jeonse Safety Analysis service
          </p>
        </div>

        {/* Payment Info */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
          <div className="flex justify-between items-center mb-4 pb-4 border-b">
            <span className="text-gray-600">Service</span>
            <span className="font-semibold text-gray-900">Jeonse Safety Analysis</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Amount</span>
            <span className="text-2xl font-bold text-blue-600">
              ₩{PAYMENT_AMOUNT.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Payment Button */}
        {isLoading ? (
          <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading payment information...</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Pay Now</h2>

            <div className="space-y-4 mb-6">
              {PAYMENT_AMOUNT === 0 ? (
                <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-100">
                  <p className="text-sm text-gray-700 mb-2">
                    <span className="font-semibold">🎉 Beta Free Trial:</span> No payment required
                  </p>
                  <p className="text-xs text-gray-600">
                    Click the button below to continue with your free analysis
                  </p>
                </div>
              ) : (
                <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-100">
                  <p className="text-sm text-gray-700 mb-2">
                    <span className="font-semibold">💳 Payment Method:</span> Credit/Debit Card
                  </p>
                  <p className="text-xs text-gray-600">
                    Click the button below to open Toss Payments secure checkout
                  </p>
                </div>
              )}
            </div>

            {/* Payment Button */}
            <button
              onClick={handlePayment}
              className="w-full bg-emerald-600 text-white text-lg font-semibold px-8 py-4 rounded-xl hover:bg-emerald-700 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              {PAYMENT_AMOUNT === 0 ? 'Continue to Upload (Free)' : `Pay ₩${PAYMENT_AMOUNT.toLocaleString()}`}
            </button>
          </div>
        )}

        {/* Information */}
        <div className="mt-6 bg-emerald-50 rounded-xl p-6">
          <h3 className="font-semibold text-gray-900 mb-2 flex items-center">
            <span className="text-emerald-600 mr-2">ℹ️</span>
            Important Information
          </h3>
          <ul className="text-sm text-gray-700 space-y-2">
            <li>• After payment, you can upload your property register document for analysis</li>
            <li>• Multiple payment methods supported: cards, bank transfer, and mobile payments</li>
            <li>• All payments are securely processed through Toss Payments</li>
            <li>• For payment inquiries, please contact customer support</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
