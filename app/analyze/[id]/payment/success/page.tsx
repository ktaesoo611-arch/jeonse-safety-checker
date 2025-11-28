'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';

export default function PaymentSuccessPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const analysisId = params.id as string;

  const [isVerifying, setIsVerifying] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function verifyPayment() {
      try {
        const paymentKey = searchParams.get('paymentKey');
        const orderId = searchParams.get('orderId');
        const amount = searchParams.get('amount');

        if (!paymentKey || !orderId || !amount) {
          throw new Error('결제 정보가 누락되었습니다');
        }

        // Verify payment with backend
        const response = await fetch('/api/payments/verify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            orderId,
            paymentKey,
            amount: parseInt(amount),
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || '결제 검증에 실패했습니다');
        }

        // Payment verified successfully
        setIsVerifying(false);

        // Redirect to upload page after 2 seconds
        setTimeout(() => {
          router.push(`/analyze/${analysisId}/upload`);
        }, 2000);

      } catch (err: any) {
        console.error('Payment verification error:', err);
        setError(err.message || '결제 검증 중 오류가 발생했습니다');
        setIsVerifying(false);
      }
    }

    verifyPayment();
  }, [analysisId, searchParams, router]);

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="text-red-500 text-6xl mb-4">❌</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">결제 검증 실패</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => router.push(`/analyze/${analysisId}`)}
            className="w-full bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 transition-colors"
          >
            돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        {isVerifying ? (
          <>
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-6"></div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">결제 확인 중</h2>
            <p className="text-gray-600">결제를 검증하고 있습니다. 잠시만 기다려주세요...</p>
          </>
        ) : (
          <>
            <div className="text-green-500 text-6xl mb-6 animate-bounce">✓</div>
            <h2 className="text-3xl font-bold text-gray-900 mb-3">결제 완료!</h2>
            <p className="text-gray-600 mb-6">
              결제가 성공적으로 완료되었습니다.
              <br />
              등기부등본 업로드 페이지로 이동합니다...
            </p>

            <div className="bg-blue-50 rounded-xl p-4">
              <p className="text-sm text-blue-800">
                💡 등기부등본을 업로드하시면 AI 분석이 시작됩니다
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
