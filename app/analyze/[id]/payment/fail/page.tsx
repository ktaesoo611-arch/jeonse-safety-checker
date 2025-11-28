'use client';

import { useParams, useRouter, useSearchParams } from 'next/navigation';

export default function PaymentFailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const analysisId = params.id as string;

  const errorCode = searchParams.get('code');
  const errorMessage = searchParams.get('message');

  const getErrorMessage = (code: string | null) => {
    switch (code) {
      case 'PAY_PROCESS_CANCELED':
        return '사용자가 결제를 취소하였습니다.';
      case 'PAY_PROCESS_ABORTED':
        return '결제 진행 중 오류가 발생하였습니다.';
      case 'REJECT_CARD_COMPANY':
        return '카드사에서 결제를 거부하였습니다.';
      case 'EXCEED_MAX_CARD_INSTALLMENT_PLAN':
        return '설정 가능한 최대 할부 개월수를 초과하였습니다.';
      case 'INVALID_REQUEST':
        return '잘못된 결제 요청입니다.';
      case 'NOT_SUPPORTED_METHOD':
        return '지원하지 않는 결제 수단입니다.';
      default:
        return errorMessage || '결제 처리 중 오류가 발생하였습니다.';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        <div className="text-red-500 text-6xl mb-6">❌</div>

        <h2 className="text-3xl font-bold text-gray-900 mb-3">결제 실패</h2>

        <div className="bg-red-50 rounded-xl p-4 mb-6">
          <p className="text-red-800 font-medium mb-1">
            {getErrorMessage(errorCode)}
          </p>
          {errorCode && (
            <p className="text-sm text-red-600">
              오류 코드: {errorCode}
            </p>
          )}
        </div>

        <p className="text-gray-600 mb-8">
          결제가 정상적으로 처리되지 않았습니다.
          <br />
          다시 시도해주시거나 다른 결제 수단을 이용해주세요.
        </p>

        <div className="space-y-3">
          <button
            onClick={() => router.push(`/analyze/${analysisId}/payment`)}
            className="w-full bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 transition-colors font-semibold"
          >
            다시 결제하기
          </button>

          <button
            onClick={() => router.push(`/analyze/${analysisId}`)}
            className="w-full bg-gray-100 text-gray-700 px-6 py-3 rounded-xl hover:bg-gray-200 transition-colors"
          >
            돌아가기
          </button>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200">
          <p className="text-sm text-gray-500">
            결제 관련 문의사항이 있으시면
            <br />
            고객센터로 연락주시기 바랍니다.
          </p>
        </div>
      </div>
    </div>
  );
}
