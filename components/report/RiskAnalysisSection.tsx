'use client';

import Tooltip from '@/components/Tooltip';

interface MortgageRanking {
  rank: number;
  type: string;
  amount: number;
  registrationDate: string;
  priority: 'senior' | 'junior' | 'subordinate';
}

interface SmallAmountPriority {
  isEligible: boolean;
  threshold: number;
  protectedAmount: number;
  region: string;
}

interface RiskItem {
  type: string;
  severity: string;
  description: string;
  category?: 'debt' | 'legal' | 'market' | 'building' | 'priority';
}

interface RiskAnalysisSectionProps {
  scores: {
    ltvScore: number;
    debtScore: number;
    legalScore: number;
    marketScore: number;
    buildingScore: number;
  };
  metrics: {
    ltv: number;
    totalDebt: number;
    availableEquity: number;
    debtCount: number;
  };
  debtRanking?: MortgageRanking[];
  smallAmountPriority?: SmallAmountPriority;
  risks: RiskItem[];
  proposedDeposit: number;
  estimatedValue: number | null;
  reportType: 'jeonse' | 'wolse';
}

export default function RiskAnalysisSection({
  scores,
  metrics,
  debtRanking,
  smallAmountPriority,
  risks,
  proposedDeposit,
  estimatedValue,
  reportType,
}: RiskAnalysisSectionProps) {
  const formatAmount = (amount: number) => {
    return `₩${(amount / 100000000).toFixed(1)}억`;
  };

  // Format with 2 decimal places for small amount priority thresholds
  const formatAmountPrecise = (amount: number) => {
    return `₩${(amount / 100000000).toFixed(2)}억`;
  };

  // Score labels and detailed descriptions for tooltips
  // Weight distribution: LTV 40%, Legal 30%, Market 15%, Building 15%
  const scoreLabels: Record<string, string> = {
    ltvScore: 'Loan-to-Value (40%)',
    legalScore: 'Legal Issues (30%)',
    marketScore: 'Market Trend (15%)',
    buildingScore: 'Building Age (15%)'
  };

  const scoreDescriptions: Record<string, { title: string; description: string; scoring: string }> = {
    ltvScore: {
      title: 'Loan-to-Value Ratio (40% of Safety Score)',
      description: 'Calculates total exposure ratio: LTV = (All Existing Debt + Your Deposit) / Property Value. Lower LTV means more equity cushion to protect your deposit in foreclosure.',
      scoring: '100 pts: <50% (Excellent) • 80 pts: 50-60% (Good) • 60 pts: 60-70% (Acceptable) • 40 pts: 70-80% (Risky) • 20 pts: 80-90% (Dangerous) • 0 pts: >90% (Critical)'
    },
    legalScore: {
      title: 'Legal & Compliance Check (30% of Safety Score)',
      description: 'Checks for legal issues that could jeopardize your deposit. Starts at 100pts and deducts for each issue found in the 등기부등본.',
      scoring: 'Critical: Seizure (압류) -100, Auction (경매) -100, Provisional Seizure (가압류) -50 | Serious: Superficies (지상권) -40, Provisional Registration (가등기) -35, Provisional Disposition (가처분) -30'
    },
    marketScore: {
      title: 'Market Conditions (15% of Safety Score)',
      description: 'Assesses market trend with confidence-amplified impact. Rising markets provide buffer, falling markets increase risk.',
      scoring: 'Base: 70pts | Rising: +8 to +25pts | Falling: -15 to -35pts (based on confidence level)'
    },
    buildingScore: {
      title: 'Building Age (15% of Safety Score)',
      description: 'Evaluates building age. Older buildings have higher maintenance costs and potential structural issues.',
      scoring: '<5yr: 100 | 5-10yr: 90 | 10-15yr: 80 | 15-20yr: 70 | 20-25yr: 60 | 25-30yr: 50 | >30yr: 40'
    }
  };

  // Filter out debtScore from display
  const displayScores = Object.entries(scores).filter(([key]) => key !== 'debtScore');

  return (
    <div className="mb-12">
      {/* Section Header */}
      <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
        <span className="text-2xl">🛡️</span>
        Risk Analysis
      </h2>

      {/* Horizontal Metrics Bar */}
      <div className="bg-white rounded-2xl p-6 mb-6 shadow-sm border border-gray-100">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {/* LTV */}
          <div className="text-center p-4 rounded-xl bg-gray-50 border border-gray-100 hover:bg-white hover:shadow-md hover:border-gray-200 transition-all duration-200 cursor-default">
            <div className="flex items-center justify-center gap-1 mb-1">
              <p className="text-xs text-gray-500 uppercase tracking-wide">LTV</p>
              <Tooltip content={
                <div>
                  <p className="font-bold text-gray-900 mb-1">Loan-to-Value Ratio</p>
                  <p className="text-gray-700 text-sm">Total debt + your deposit divided by property value. Lower is safer.</p>
                  <p className="text-gray-500 text-xs mt-2">&lt;60% Safe | 60-70% OK | 70-80% Risky | &gt;80% Danger</p>
                </div>
              }>
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </Tooltip>
            </div>
            <p className={`text-2xl font-bold ${
              metrics.ltv > 80 ? 'text-red-600' :
              metrics.ltv > 70 ? 'text-orange-600' :
              metrics.ltv > 60 ? 'text-amber-600' : 'text-emerald-600'
            }`}>
              {metrics.ltv.toFixed(0)}%
            </p>
            <div className="w-full h-1.5 bg-gray-200 rounded-full mt-2 overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  metrics.ltv > 80 ? 'bg-red-500' :
                  metrics.ltv > 70 ? 'bg-orange-500' :
                  metrics.ltv > 60 ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(metrics.ltv, 100)}%` }}
              />
            </div>
          </div>

          {/* Legal */}
          {(() => {
            const legalIssueCount = risks.filter(r => r.category === 'legal').length;
            return (
              <div className="text-center p-4 rounded-xl bg-gray-50 border border-gray-100 hover:bg-white hover:shadow-md hover:border-gray-200 transition-all duration-200 cursor-default">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Legal</p>
                  <Tooltip content={
                    <div>
                      <p className="font-bold text-gray-900 mb-1">Legal Issues</p>
                      <p className="text-gray-700 text-sm">Problems found in 등기부등본: seizures, auctions, liens, provisional registrations, etc.</p>
                      <p className="text-gray-500 text-xs mt-2">0 = Clean | 1-2 = Review needed | 3+ = High risk</p>
                    </div>
                  }>
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </Tooltip>
                </div>
                <p className={`text-2xl font-bold ${
                  legalIssueCount === 0 ? 'text-emerald-600' :
                  legalIssueCount <= 2 ? 'text-amber-600' : 'text-red-600'
                }`}>
                  {legalIssueCount === 0 ? '✓' : legalIssueCount}
                </p>
                <p className={`text-xs mt-1 ${
                  legalIssueCount === 0 ? 'text-emerald-600' :
                  legalIssueCount <= 2 ? 'text-amber-600' : 'text-red-600'
                }`}>
                  {legalIssueCount === 0 ? 'Clean' : `Issue${legalIssueCount > 1 ? 's' : ''}`}
                </p>
              </div>
            );
          })()}

          {/* Building */}
          <div className="text-center p-4 rounded-xl bg-gray-50 border border-gray-100 hover:bg-white hover:shadow-md hover:border-gray-200 transition-all duration-200 cursor-default">
            <div className="flex items-center justify-center gap-1 mb-1">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Building</p>
              <Tooltip content={
                <div>
                  <p className="font-bold text-gray-900 mb-1">Building Age Score</p>
                  <p className="text-gray-700 text-sm">Based on building age. Older buildings have higher maintenance costs and lower resale value.</p>
                  <p className="text-gray-500 text-xs mt-2">&lt;15yr = Good | 15-25yr = Fair | &gt;25yr = Old</p>
                </div>
              }>
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </Tooltip>
            </div>
            <p className={`text-2xl font-bold ${
              scores.buildingScore >= 80 ? 'text-emerald-600' :
              scores.buildingScore >= 60 ? 'text-amber-600' : 'text-orange-600'
            }`}>
              {scores.buildingScore >= 80 ? '✓' : scores.buildingScore}
            </p>
            <p className={`text-xs mt-1 ${
              scores.buildingScore >= 80 ? 'text-emerald-600' :
              scores.buildingScore >= 60 ? 'text-amber-600' : 'text-orange-600'
            }`}>
              {scores.buildingScore >= 80 ? 'Good' :
               scores.buildingScore >= 60 ? 'Fair' : 'Old'}
            </p>
          </div>

          {/* Debt Rank */}
          <div className="text-center p-4 rounded-xl bg-gray-50 border border-gray-100 hover:bg-white hover:shadow-md hover:border-gray-200 transition-all duration-200 cursor-default">
            <div className="flex items-center justify-center gap-1 mb-1">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Debt Rank</p>
              <Tooltip content={
                <div>
                  <p className="font-bold text-gray-900 mb-1">Your Repayment Priority</p>
                  <p className="text-gray-700 text-sm">Your position in the repayment queue if the property is auctioned. Lower rank = paid first.</p>
                  <p className="text-gray-500 text-xs mt-2">#1 = First priority | Higher # = More risk</p>
                </div>
              }>
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </Tooltip>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              #{debtRanking?.find(d => d.type.includes('Your Deposit'))?.rank ||
                debtRanking?.length || 1}
            </p>
            <p className="text-xs mt-1 text-gray-500">Last</p>
          </div>

          {/* Small Amount Priority */}
          <div className="text-center p-4 rounded-xl bg-gray-50 border border-gray-100 hover:bg-white hover:shadow-md hover:border-gray-200 transition-all duration-200 cursor-default">
            <div className="flex items-center justify-center gap-1 mb-1">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Priority</p>
              <Tooltip content={
                <div>
                  <p className="font-bold text-gray-900 mb-1">소액임차인 최우선변제</p>
                  <p className="text-gray-700 text-sm">If your deposit is below the regional threshold, you get priority repayment even before bank mortgages.</p>
                  <p className="text-gray-500 text-xs mt-2">Seoul: ≤₩1.65억 | 수도권: ≤₩1.45억</p>
                </div>
              }>
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </Tooltip>
            </div>
            <p className={`text-2xl font-bold ${
              smallAmountPriority?.isEligible ? 'text-emerald-600' : 'text-gray-400'
            }`}>
              {smallAmountPriority?.isEligible ? '✓' : '—'}
            </p>
            <p className={`text-xs mt-1 ${
              smallAmountPriority?.isEligible ? 'text-emerald-600' : 'text-gray-400'
            }`}>
              {smallAmountPriority?.isEligible ? 'Eligible' : 'Not Eligible'}
            </p>
          </div>
        </div>
      </div>

      {/* Detailed Scores with Progress Bars */}
      <div className="bg-white rounded-2xl p-6 mb-6 shadow-sm border border-gray-100">
        <h3 className="text-lg font-bold text-gray-900 mb-6">Detailed Scores</h3>
        <div className="space-y-5">
          {displayScores.map(([key, value]) => {
            const scoreInfo = scoreDescriptions[key];
            if (!scoreInfo) return null;

            return (
              <div key={key}>
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900">{scoreLabels[key]}</span>
                    <Tooltip content={
                      <div>
                        <p className="font-bold text-gray-900 mb-2">{scoreInfo.title}</p>
                        <p className="text-gray-700 mb-3">{scoreInfo.description}</p>
                        <p className="font-semibold text-gray-900 mb-1">Scoring:</p>
                        <p className="text-gray-600 text-xs">{scoreInfo.scoring}</p>
                      </div>
                    }>
                      <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                    </Tooltip>
                  </div>
                  <span className="font-bold text-gray-900">{value}/100</span>
                </div>
                <div className={`h-2.5 rounded-full overflow-hidden ${
                  value === 0 ? 'bg-red-200 ring-2 ring-red-500 ring-offset-1' : 'bg-gray-200'
                }`}>
                  <div
                    className={`h-full bg-gradient-to-r transition-all duration-500 ${
                      value >= 75 ? 'from-emerald-500 to-teal-500' :
                      value >= 50 ? 'from-yellow-500 to-orange-400' :
                      value >= 25 ? 'from-orange-500 to-red-500' :
                      value === 0 ? 'from-red-700 to-red-900' : 'from-red-600 to-rose-600'
                    }`}
                    style={{ width: `${value || 0.5}%`, minWidth: value === 0 ? '4px' : '0' }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Debt & Priority Analysis */}
      {debtRanking && debtRanking.length > 0 && (
        <div className="bg-white rounded-2xl p-6 mb-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-6">
            <h3 className="text-lg font-bold text-gray-900">Debt & Priority Analysis</h3>
            <Tooltip content={
              <div>
                <p className="font-bold text-gray-900 mb-2">Understanding Debt Priority</p>
                <p className="text-gray-700 mb-3">
                  In case of property auction, creditors are repaid in order of registration date. Understanding this ranking is crucial for assessing your deposit safety.
                </p>
                <p className="font-semibold text-gray-900 mb-1">Priority Levels:</p>
                <ul className="text-gray-700 mb-3 space-y-1 ml-4 list-disc">
                  <li><span className="font-semibold">Senior:</span> First mortgage - highest priority repayment</li>
                  <li><span className="font-semibold">Junior:</span> Second mortgage - repaid after senior debt</li>
                  <li><span className="font-semibold">Subordinate:</span> Lower priority - higher risk</li>
                </ul>
                <p className="text-gray-600 mt-2 pt-2 border-t border-gray-200">
                  <span className="font-semibold text-orange-600">⚠️ Important:</span> Your proposed deposit will rank after all currently registered claims.
                </p>
              </div>
            }>
              <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </Tooltip>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="p-4 rounded-xl bg-blue-50 border border-blue-100 hover:bg-blue-100 hover:shadow-md transition-all duration-200">
              <p className="text-xs text-blue-600 mb-1">Total Debt</p>
              <p className="text-xl font-bold text-blue-900">{formatAmount(metrics.totalDebt)}</p>
            </div>
            <div className="p-4 rounded-xl bg-purple-50 border border-purple-100 hover:bg-purple-100 hover:shadow-md transition-all duration-200">
              <p className="text-xs text-purple-600 mb-1">Your Deposit</p>
              <p className="text-xl font-bold text-purple-900">{formatAmount(proposedDeposit)}</p>
            </div>
            <div className={`p-4 rounded-xl transition-all duration-200 ${
              metrics.availableEquity > 0
                ? 'bg-emerald-50 border border-emerald-100 hover:bg-emerald-100 hover:shadow-md'
                : 'bg-red-50 border border-red-100 hover:bg-red-100 hover:shadow-md'
            }`}>
              <p className={`text-xs ${metrics.availableEquity > 0 ? 'text-emerald-600' : 'text-red-600'} mb-1`}>
                Available Equity
              </p>
              <p className={`text-xl font-bold ${metrics.availableEquity > 0 ? 'text-emerald-900' : 'text-red-900'}`}>
                {metrics.availableEquity >= 0 ? '+' : ''}{formatAmount(metrics.availableEquity)}
              </p>
            </div>
          </div>

          {/* Debt Ranking Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-center py-3 px-2 text-xs font-semibold text-gray-500 uppercase">Rank</th>
                  <th className="text-center py-3 px-2 text-xs font-semibold text-gray-500 uppercase">Priority</th>
                  <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase">Type</th>
                  <th className="text-right py-3 px-2 text-xs font-semibold text-gray-500 uppercase">Amount</th>
                  <th className="text-right py-3 px-2 text-xs font-semibold text-gray-500 uppercase">Date</th>
                </tr>
              </thead>
              <tbody>
                {debtRanking.map((debt, index) => {
                  const isYourDeposit = debt.type.includes('Your Deposit');
                  return (
                    <tr key={index} className={`border-b border-gray-100 transition-colors duration-150 ${isYourDeposit ? 'bg-purple-50 hover:bg-purple-100' : 'hover:bg-gray-50'}`}>
                      <td className="py-4 px-2 text-center">
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gray-800 text-white text-xs font-bold">
                          {debt.rank}
                        </span>
                      </td>
                      <td className="py-4 px-2 text-center">
                        <span className={`inline-block px-2 py-1 rounded text-xs font-semibold uppercase ${
                          isYourDeposit ? 'bg-purple-600 text-white' :
                          debt.priority === 'senior' ? 'bg-red-100 text-red-700' :
                          debt.priority === 'junior' ? 'bg-orange-100 text-orange-700' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>
                          {isYourDeposit ? 'You' : debt.priority}
                        </span>
                      </td>
                      <td className="py-4 px-2 text-left text-gray-700">
                        {debt.type}
                        {debt.type.includes('근저당권') && <span className="text-gray-400 text-xs ml-1">(Mortgage)</span>}
                        {debt.type.includes('전세권') && <span className="text-gray-400 text-xs ml-1">(Jeonse Rights)</span>}
                        {debt.type.includes('임차권') && <span className="text-gray-400 text-xs ml-1">(Lease Rights)</span>}
                      </td>
                      <td className="py-4 px-2 text-right font-semibold text-gray-900">{formatAmount(debt.amount)}</td>
                      <td className="py-4 px-2 text-right text-gray-500 text-xs">{debt.registrationDate.split(' (')[0]}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Equity Calculation */}
          <div className="mt-6 p-5 bg-gradient-to-r from-gray-50 to-slate-50 rounded-xl border border-gray-200">
            <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              Equity Calculation
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between py-2 border-b border-gray-200">
                <span className="text-gray-700">Estimated Property Value</span>
                <span className="font-bold text-gray-900">{formatAmount(estimatedValue || 0)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-200">
                <span className="text-gray-700">Total Registered Debt</span>
                <span className="font-bold text-red-700">- {formatAmount(metrics.totalDebt)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-200">
                <span className="text-gray-700">Your Deposit (Proposed)</span>
                <span className="font-bold text-purple-700">- {formatAmount(proposedDeposit)}</span>
              </div>
              <div className="flex justify-between py-3 bg-white rounded-lg px-3 mt-2">
                <span className="font-bold text-gray-900">Remaining Equity</span>
                <span className={`font-bold text-lg ${
                  metrics.availableEquity > 0 ? 'text-emerald-700' : 'text-red-700'
                }`}>
                  {metrics.availableEquity >= 0 ? '+' : ''}{formatAmount(metrics.availableEquity)}
                </span>
              </div>
            </div>

            {metrics.availableEquity <= 0 && (
              <div className="mt-4 p-4 bg-red-100 border-l-4 border-red-600 rounded">
                <p className="text-red-900 font-semibold flex items-center gap-2">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  Critical: Negative equity detected!
                </p>
                <p className="text-red-800 text-sm mt-2">
                  The total debt plus your proposed deposit exceeds the property value. <span className="font-bold">We strongly recommend reconsidering this property.</span>
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Small Amount Priority */}
      {smallAmountPriority && (
        <div className={`rounded-2xl p-6 mb-6 border ${
          smallAmountPriority.isEligible
            ? 'bg-emerald-50 border-emerald-200'
            : 'bg-gray-50 border-gray-200'
        }`}>
          <div className="flex items-start gap-4">
            <span className="text-3xl">{smallAmountPriority.isEligible ? '✅' : '❌'}</span>
            <div className="flex-1">
              <h3 className="font-bold text-gray-900 mb-2">
                Small Amount Priority Repayment (소액임차인 최우선변제)
              </h3>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Region</p>
                  <p className="font-semibold text-gray-900">{smallAmountPriority.region}</p>
                </div>
                <div>
                  <p className="text-gray-500">Threshold</p>
                  <p className="font-semibold text-gray-900">{formatAmountPrecise(smallAmountPriority.threshold)}</p>
                </div>
                <div>
                  <p className="text-gray-500">Protected</p>
                  <p className="font-semibold text-gray-900">{formatAmountPrecise(smallAmountPriority.protectedAmount)}</p>
                </div>
              </div>
              {smallAmountPriority.isEligible && proposedDeposit <= smallAmountPriority.protectedAmount && (
                <p className="mt-3 text-sm text-emerald-700">
                  Your deposit of {formatAmount(proposedDeposit)} is within the protected amount.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Detected Risks */}
      {risks.length > 0 ? (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <span>⚠️</span>
            Detected Risks ({risks.length})
          </h3>
          <div className="space-y-3">
            {risks.map((risk, index) => (
              <div
                key={index}
                className={`p-4 rounded-xl border ${
                  risk.severity === 'CRITICAL' ? 'bg-red-50 border-red-200' :
                  risk.severity === 'HIGH' ? 'bg-orange-50 border-orange-200' :
                  'bg-yellow-50 border-yellow-200'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-gray-900">{risk.type}</p>
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                        risk.severity === 'CRITICAL' ? 'bg-red-600 text-white' :
                        risk.severity === 'HIGH' ? 'bg-orange-600 text-white' :
                        'bg-yellow-600 text-white'
                      }`}>
                        {risk.severity}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">{risk.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-emerald-50 rounded-2xl p-6 border border-emerald-200">
          <div className="flex items-center gap-3">
            <span className="text-2xl">✅</span>
            <div>
              <p className="font-semibold text-emerald-900">No Critical Risks Detected</p>
              <p className="text-sm text-emerald-700">The property registry appears clean with no major legal issues.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
