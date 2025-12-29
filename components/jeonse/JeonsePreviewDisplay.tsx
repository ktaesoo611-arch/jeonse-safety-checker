'use client';

interface MortgageRanking {
  rank: number;
  type: string;
  amount: number;
  registrationDate: string;
  priority: 'senior' | 'junior' | 'subordinate';
}

interface JeonsePreviewData {
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
    debtRanking?: MortgageRanking[];
  };
  summary: {
    criticalIssues: number;
    highIssues: number;
    moderateIssues: number;
  };
}

interface JeonsePreviewDisplayProps {
  data: JeonsePreviewData;
  onUnlock: () => void;
  isLoading?: boolean;
}

export function JeonsePreviewDisplay({ data, onUnlock, isLoading }: JeonsePreviewDisplayProps) {
  const { property, riskAnalysis, summary } = data;

  // Risk level styling
  const getRiskLevelStyle = (level: string) => {
    switch (level) {
      case 'SAFE':
        return {
          bg: 'bg-emerald-50',
          border: 'border-emerald-200',
          text: 'text-emerald-700',
          gradient: 'from-emerald-600 to-teal-600',
          icon: '🛡️',
          label: 'Safe'
        };
      case 'MODERATE':
        return {
          bg: 'bg-yellow-50',
          border: 'border-yellow-200',
          text: 'text-yellow-700',
          gradient: 'from-yellow-500 to-orange-500',
          icon: '⚠️',
          label: 'Moderate Risk'
        };
      case 'HIGH':
        return {
          bg: 'bg-orange-50',
          border: 'border-orange-200',
          text: 'text-orange-700',
          gradient: 'from-orange-600 to-red-500',
          icon: '🔶',
          label: 'High Risk'
        };
      case 'CRITICAL':
        return {
          bg: 'bg-red-50',
          border: 'border-red-200',
          text: 'text-red-700',
          gradient: 'from-red-600 to-rose-700',
          icon: '🚨',
          label: 'Critical Risk'
        };
      default:
        return {
          bg: 'bg-gray-50',
          border: 'border-gray-200',
          text: 'text-gray-700',
          gradient: 'from-gray-600 to-gray-700',
          icon: '?',
          label: 'Unknown'
        };
    }
  };

  const riskStyle = getRiskLevelStyle(riskAnalysis.riskLevel);
  const totalIssues = summary.criticalIssues + summary.highIssues + summary.moderateIssues;

  // Format amount in Korean units
  const formatEok = (amount: number) => {
    const eok = amount / 100000000;
    return `₩${eok.toFixed(1)}억`;
  };

  // Blurred placeholder component
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
      {/* Risk Level Banner - VISIBLE */}
      <div className={`rounded-3xl p-8 ${riskStyle.bg} ${riskStyle.border} border-2`}>
        <div className="flex items-start gap-4">
          <span className="text-4xl">{riskStyle.icon}</span>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h2 className={`text-2xl font-bold ${riskStyle.text}`}>
                {riskStyle.label}
              </h2>
              <span className={`px-3 py-1 rounded-full text-sm font-bold bg-gradient-to-r ${riskStyle.gradient} text-white`}>
                {riskAnalysis.riskLevel}
              </span>
            </div>
            <p className="text-[#4A5568] text-lg leading-relaxed">
              {riskAnalysis.verdict}
            </p>
          </div>
        </div>
      </div>

      {/* Issues Summary - VISIBLE */}
      {totalIssues > 0 && (
        <div className="bg-white rounded-3xl p-6 shadow-xl shadow-amber-900/5 border border-amber-100">
          <h3 className="text-lg font-bold text-[#1A202C] mb-4 flex items-center gap-2">
            <span>⚠️</span> Issues Detected
          </h3>
          <div className="flex flex-wrap gap-4">
            {summary.criticalIssues > 0 && (
              <div className="flex items-center gap-2 bg-red-50 px-4 py-2 rounded-xl border border-red-200">
                <span className="w-3 h-3 bg-red-500 rounded-full"></span>
                <span className="font-bold text-red-700">{summary.criticalIssues} Critical</span>
              </div>
            )}
            {summary.highIssues > 0 && (
              <div className="flex items-center gap-2 bg-orange-50 px-4 py-2 rounded-xl border border-orange-200">
                <span className="w-3 h-3 bg-orange-500 rounded-full"></span>
                <span className="font-bold text-orange-700">{summary.highIssues} High</span>
              </div>
            )}
            {summary.moderateIssues > 0 && (
              <div className="flex items-center gap-2 bg-yellow-50 px-4 py-2 rounded-xl border border-yellow-200">
                <span className="w-3 h-3 bg-yellow-500 rounded-full"></span>
                <span className="font-bold text-yellow-700">{summary.moderateIssues} Moderate</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Property & Score - PARTIAL BLUR */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Jeonse Amount - VISIBLE */}
        <div className="bg-white rounded-3xl p-6 shadow-xl shadow-amber-900/5 border border-amber-100">
          <p className="text-sm text-[#718096] mb-2">Your Deposit</p>
          <p className="text-3xl font-bold text-[#1A202C]">{formatEok(property.proposedJeonse)}</p>
          <p className="text-sm text-[#718096] mt-2">{property.address}</p>
        </div>

        {/* Safety Score - BLURRED */}
        <div className="bg-white rounded-3xl p-6 shadow-xl shadow-amber-900/5 border border-amber-100 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-amber-50/80 pointer-events-none" />
          <p className="text-sm text-[#718096] mb-2">Safety Score</p>
          <p className="text-3xl font-bold text-[#1A202C]">
            <BlurredValue hint="78" />
            <span className="text-lg text-[#718096]">/100</span>
          </p>
          <p className="text-sm text-[#718096] mt-2">
            Unlock to see detailed score
          </p>
        </div>
      </div>

      {/* Key Metrics - BLURRED */}
      <div className="bg-white rounded-3xl p-6 shadow-xl shadow-amber-900/5 border border-amber-100">
        <h3 className="text-lg font-bold text-[#1A202C] mb-4">Financial Analysis</h3>
        <div className="grid md:grid-cols-4 gap-6">
          <div className="text-center">
            <p className="text-sm text-[#718096] mb-1">Est. Market Value</p>
            <p className="text-xl font-bold text-[#1A202C]">
              <BlurredValue hint="₩9.8억" />
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm text-[#718096] mb-1">LTV Ratio</p>
            <p className="text-xl font-bold text-[#1A202C]">
              <BlurredValue hint="72.5%" />
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm text-[#718096] mb-1">Total Debt</p>
            <p className="text-xl font-bold text-[#1A202C]">
              <BlurredValue hint="₩3.2억" />
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm text-[#718096] mb-1">Available Equity</p>
            <p className="text-xl font-bold text-[#1A202C]">
              <BlurredValue hint="+₩1.5억" />
            </p>
          </div>
        </div>
      </div>

      {/* Debt Ranking - LOCKED */}
      <div className="bg-gray-50 rounded-3xl p-6 border border-gray-200 relative overflow-hidden">
        <div className="absolute inset-0 backdrop-blur-sm bg-white/60 flex items-center justify-center z-10">
          <div className="text-center">
            <svg className="w-8 h-8 text-amber-500 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <p className="text-[#4A5568] font-medium">Unlock to see debt priority ranking</p>
          </div>
        </div>
        <h3 className="text-lg font-bold text-[#1A202C] mb-4 flex items-center gap-2">
          <span>📊</span> Debt & Priority Ranking
        </h3>
        <div className="space-y-2">
          <div className="h-12 bg-gray-200 rounded-xl"></div>
          <div className="h-12 bg-gray-200 rounded-xl"></div>
          <div className="h-12 bg-gray-200 rounded-xl"></div>
        </div>
      </div>

      {/* Risk Details - LOCKED */}
      <div className="bg-gray-50 rounded-3xl p-6 border border-gray-200 relative overflow-hidden">
        <div className="absolute inset-0 backdrop-blur-sm bg-white/60 flex items-center justify-center z-10">
          <div className="text-center">
            <svg className="w-8 h-8 text-amber-500 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <p className="text-[#4A5568] font-medium">Unlock to see detailed risk analysis</p>
          </div>
        </div>
        <h3 className="text-lg font-bold text-[#1A202C] mb-4 flex items-center gap-2">
          <span>⚠️</span> Detailed Risk Analysis ({riskAnalysis.risks.length} items)
        </h3>
        <div className="space-y-3">
          <div className="h-20 bg-gray-200 rounded-xl"></div>
          <div className="h-20 bg-gray-200 rounded-xl"></div>
        </div>
      </div>

      {/* Recommendations - LOCKED */}
      <div className="bg-gray-50 rounded-3xl p-6 border border-gray-200 relative overflow-hidden">
        <div className="absolute inset-0 backdrop-blur-sm bg-white/60 flex items-center justify-center z-10">
          <div className="text-center">
            <svg className="w-8 h-8 text-amber-500 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <p className="text-[#4A5568] font-medium">Unlock to see personalized recommendations</p>
          </div>
        </div>
        <h3 className="text-lg font-bold text-[#1A202C] mb-4 flex items-center gap-2">
          <span>💡</span> Recommendations
        </h3>
        <div className="space-y-2">
          <div className="h-10 bg-gray-200 rounded-xl"></div>
          <div className="h-10 bg-gray-200 rounded-xl"></div>
          <div className="h-10 bg-gray-200 rounded-xl"></div>
        </div>
      </div>

      {/* Unlock CTA */}
      <div className="bg-gradient-to-br from-amber-900 to-orange-950 rounded-3xl p-8 text-white shadow-xl">
        <div className="text-center">
          <h3 className="text-2xl font-bold mb-3">Unlock Full Safety Report</h3>
          <p className="text-amber-100 mb-6 max-w-md mx-auto">
            Get the complete analysis with exact scores, debt rankings, and personalized recommendations to protect your deposit.
          </p>

          <div className="flex flex-wrap justify-center gap-3 mb-6 text-sm">
            <span className="bg-amber-100/20 px-3 py-1 rounded-full">✓ Exact safety score</span>
            <span className="bg-amber-100/20 px-3 py-1 rounded-full">✓ LTV & debt metrics</span>
            <span className="bg-amber-100/20 px-3 py-1 rounded-full">✓ Debt priority ranking</span>
            <span className="bg-amber-100/20 px-3 py-1 rounded-full">✓ All risk details</span>
            <span className="bg-amber-100/20 px-3 py-1 rounded-full">✓ Action recommendations</span>
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
              <>Unlock for ₩14,900</>
            )}
          </button>

          <p className="text-amber-200/60 text-sm mt-4">
            Free during beta period!
          </p>
        </div>
      </div>

      {/* Disclaimer */}
      <p className="text-sm text-[#718096] text-center">
        This preview is based on the analysis of your uploaded document.
        Unlock to see the complete report with all details.
      </p>
    </div>
  );
}
