'use client';

import { WolseAnalysisResult } from '@/lib/types';

interface WolsePreviewDisplayProps {
  result: WolseAnalysisResult;
  onUnlock: () => void;
  isLoading?: boolean;
}

export function WolsePreviewDisplay({ result, onUnlock, isLoading }: WolsePreviewDisplayProps) {
  // Assessment color and icon
  const getAssessmentStyle = (assessment: string) => {
    switch (assessment) {
      case 'GOOD_DEAL':
        return {
          bg: 'bg-emerald-50',
          border: 'border-emerald-200',
          text: 'text-emerald-700',
          icon: '🎉',
          label: 'Great Deal!'
        };
      case 'FAIR':
        return {
          bg: 'bg-blue-50',
          border: 'border-blue-200',
          text: 'text-blue-700',
          icon: '✓',
          label: 'Fair Price'
        };
      case 'OVERPRICED':
        return {
          bg: 'bg-amber-50',
          border: 'border-amber-200',
          text: 'text-amber-700',
          icon: '⚠️',
          label: 'Above Market'
        };
      case 'SEVERELY_OVERPRICED':
        return {
          bg: 'bg-red-50',
          border: 'border-red-200',
          text: 'text-red-700',
          icon: '🚨',
          label: 'Significantly Overpriced'
        };
      default:
        return {
          bg: 'bg-gray-50',
          border: 'border-gray-200',
          text: 'text-gray-700',
          icon: '?',
          label: 'Unknown'
        };
    }
  };

  const assessmentStyle = getAssessmentStyle(result.assessment);

  // Format currency (visible version)
  const formatWon = (amount: number) => {
    if (amount >= 10000) {
      return `${(amount / 10000).toLocaleString()}만원`;
    }
    return `${amount.toLocaleString()}원`;
  };

  // Blurred placeholder
  const BlurredValue = ({ hint }: { hint: string }) => (
    <span className="relative inline-block">
      <span className="blur-md select-none">{hint}</span>
      <span className="absolute inset-0 flex items-center justify-center">
        <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      </span>
    </span>
  );

  return (
    <div className="space-y-8">
      {/* Assessment Banner - VISIBLE */}
      <div className={`rounded-3xl p-8 ${assessmentStyle.bg} ${assessmentStyle.border} border-2`}>
        <div className="flex items-start gap-4">
          <span className="text-4xl">{assessmentStyle.icon}</span>
          <div className="flex-1">
            <h2 className={`text-2xl font-bold mb-2 ${assessmentStyle.text}`}>
              {assessmentStyle.label}
            </h2>
            <p className="text-[#4A5568] text-lg leading-relaxed">
              {result.assessment === 'GOOD_DEAL' && 'Your rent is below market expectation. Lock in this rate and negotiate other terms!'}
              {result.assessment === 'FAIR' && 'Your rent is at market expectation. Focus on negotiating contract terms.'}
              {result.assessment === 'OVERPRICED' && 'Your rent is above market expectation. There may be room for negotiation.'}
              {result.assessment === 'SEVERELY_OVERPRICED' && 'Your rent is significantly above market. Strong negotiation is recommended.'}
            </p>
          </div>
        </div>
      </div>

      {/* Key Metrics - BLURRED */}
      <div className="grid md:grid-cols-3 gap-6">
        {/* Your Rent - VISIBLE */}
        <div className="bg-white rounded-3xl p-6 text-center shadow-xl shadow-amber-900/5 border border-amber-100">
          <p className="text-sm text-[#718096] mb-2">Your Rent</p>
          <p className="text-3xl font-bold text-[#1A202C]">{formatWon(result.userMonthlyRent)}</p>
          <p className="text-sm text-[#718096] mt-2">
            at {formatWon(result.userDeposit)} deposit
          </p>
        </div>

        {/* Expected Rent - BLURRED */}
        <div className="bg-white rounded-3xl p-6 text-center shadow-xl shadow-amber-900/5 border border-amber-100 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-amber-50/80 pointer-events-none" />
          <p className="text-sm text-[#718096] mb-2">Expected Rent</p>
          <p className="text-3xl font-bold text-amber-600">
            <BlurredValue hint="154만원" />
          </p>
          <p className="text-sm text-[#718096] mt-2">
            at your deposit level
          </p>
        </div>

        {/* Difference - BLURRED */}
        <div className="bg-amber-50 rounded-3xl p-6 text-center shadow-xl shadow-amber-900/5 border border-amber-200 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-amber-100/80 pointer-events-none" />
          <p className="text-sm text-[#718096] mb-2">Difference</p>
          <p className="text-3xl font-bold text-amber-600">
            <BlurredValue hint="+15만원" />
          </p>
          <p className="text-sm text-[#718096] mt-2">
            <BlurredValue hint="+10.2" />% vs expected
          </p>
        </div>
      </div>

      {/* Savings Teaser - BLURRED */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-3xl p-6 border border-amber-200">
        <h3 className="text-lg font-bold text-[#1A202C] mb-4 flex items-center gap-2">
          <span>💰</span> Potential Savings
        </h3>
        <div className="flex items-center justify-between">
          <p className="text-[#4A5568]">If negotiated to expected rent:</p>
          <p className="text-2xl font-bold text-amber-600">
            <BlurredValue hint="188만원" />/year
          </p>
        </div>
      </div>

      {/* Data Quality - PARTIAL */}
      <div className="bg-white rounded-3xl p-6 shadow-xl shadow-amber-900/5 border border-amber-100">
        <div className="grid md:grid-cols-2 gap-6 text-center">
          <div>
            <p className="text-sm text-[#718096] mb-1">Data Quality</p>
            <p className="text-xl font-bold text-[#1A202C]">{result.confidenceLevel}</p>
          </div>
          <div>
            <p className="text-sm text-[#718096] mb-1">Contracts Analyzed</p>
            <p className="text-xl font-bold text-[#1A202C]">{result.contractCount}</p>
          </div>
        </div>
      </div>

      {/* Locked Sections */}
      <div className="space-y-4">
        {/* Negotiation Scripts - LOCKED */}
        <div className="bg-gray-50 rounded-3xl p-6 border border-gray-200 relative overflow-hidden">
          <div className="absolute inset-0 backdrop-blur-sm bg-white/60 flex items-center justify-center z-10">
            <div className="text-center">
              <svg className="w-8 h-8 text-amber-500 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <p className="text-[#4A5568] font-medium">Unlock to see negotiation scripts</p>
            </div>
          </div>
          <h3 className="text-lg font-bold text-[#1A202C] mb-4 flex items-center gap-2">
            <span>🤝</span> Negotiation Scripts
          </h3>
          <div className="space-y-3">
            <div className="h-20 bg-gray-200 rounded-xl"></div>
            <div className="h-20 bg-gray-200 rounded-xl"></div>
          </div>
        </div>

        {/* Recent Transactions - LOCKED */}
        <div className="bg-gray-50 rounded-3xl p-6 border border-gray-200 relative overflow-hidden">
          <div className="absolute inset-0 backdrop-blur-sm bg-white/60 flex items-center justify-center z-10">
            <div className="text-center">
              <svg className="w-8 h-8 text-amber-500 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <p className="text-[#4A5568] font-medium">Unlock to see transaction data</p>
            </div>
          </div>
          <h3 className="text-lg font-bold text-[#1A202C] mb-4 flex items-center gap-2">
            <span>📊</span> Recent Transactions ({result.contractCount} contracts)
          </h3>
          <div className="space-y-2">
            <div className="h-8 bg-gray-200 rounded"></div>
            <div className="h-8 bg-gray-200 rounded"></div>
            <div className="h-8 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>

      {/* Unlock CTA */}
      <div className="bg-gradient-to-br from-amber-900 to-orange-950 rounded-3xl p-8 text-white shadow-xl">
        <div className="text-center">
          <h3 className="text-2xl font-bold mb-3">Unlock Full Report</h3>
          <p className="text-amber-100 mb-6 max-w-md mx-auto">
            Get exact numbers, negotiation scripts, and transaction data to negotiate your rent with confidence.
          </p>

          <div className="flex flex-wrap justify-center gap-3 mb-6 text-sm">
            <span className="bg-amber-100/20 px-3 py-1 rounded-full">✓ Exact expected rent</span>
            <span className="bg-amber-100/20 px-3 py-1 rounded-full">✓ Market rate %</span>
            <span className="bg-amber-100/20 px-3 py-1 rounded-full">✓ Savings calculation</span>
            <span className="bg-amber-100/20 px-3 py-1 rounded-full">✓ 3 negotiation scripts</span>
            <span className="bg-amber-100/20 px-3 py-1 rounded-full">✓ Transaction history</span>
          </div>

          <button
            onClick={onUnlock}
            disabled={isLoading}
            className="bg-gradient-to-r from-amber-400 to-orange-400 text-amber-900 font-bold text-lg px-10 py-4 rounded-2xl hover:shadow-xl hover:shadow-amber-400/30 transition-all duration-200 hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Processing...
              </span>
            ) : (
              <>Unlock for ₩9,900</>
            )}
          </button>

          <p className="text-amber-200/60 text-sm mt-4">
            Powered by MOLIT real transaction data
          </p>
        </div>
      </div>

      {/* Disclaimer */}
      <p className="text-sm text-[#718096] text-center">
        Analysis based on {result.contractCount} recent transactions.
        This preview will expire if you leave this page.
      </p>
    </div>
  );
}
