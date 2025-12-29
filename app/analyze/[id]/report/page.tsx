'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Tooltip from '@/components/Tooltip';
import Link from 'next/link';

interface MortgageRanking {
  rank: number;
  type: string;
  amount: number;
  registrationDate: string;
  priority: 'senior' | 'junior' | 'subordinate';
}

interface ReportData {
  analysisId: string;
  property: {
    address: string;
    proposedJeonse: number;
    estimatedValue: number | null;
    valuation?: {
      valueLow: number | null;
      valueMid: number | null;
      valueHigh: number | null;
      confidence: number | null;
      marketTrend: 'rising' | 'stable' | 'falling' | null;
    };
  };
  riskAnalysis: {
    overallScore: number;
    riskLevel: string;
    verdict: string;
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
    risks: Array<{
      type: string;
      severity: string;
      description: string;
    }>;
    debtRanking?: MortgageRanking[];
    smallAmountPriority?: {
      isEligible: boolean;
      threshold: number;
      protectedAmount: number;
      region: string;
    };
  };
  recommendations: {
    mandatory: string[];
    recommended: string[];
    optional: string[];
  };
  summary: {
    safetyScore: number;
    riskLevel: string;
    isSafe: boolean;
    criticalIssues: number;
    highIssues: number;
    moderateIssues: number;
  };
}

export default function ReportPage() {
  const params = useParams();
  const analysisId = params.id as string;

  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const response = await fetch(`/api/analysis/report/${analysisId}`);

        if (!response.ok) {
          throw new Error('Unable to load report');
        }

        const data = await response.json();
        setReport(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [analysisId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-[#4A5568] text-lg">Loading report...</p>
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] py-16">
        <div className="container mx-auto px-6 max-w-2xl">
          <div className="bg-white rounded-3xl shadow-xl shadow-amber-900/5 border border-amber-100 text-center py-16 px-8">
            <div className="w-20 h-20 mx-auto mb-6 bg-red-100 rounded-2xl flex items-center justify-center">
              <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-[#1A202C] mb-3">Error occurred</h2>
            <p className="text-[#4A5568] mb-8 text-lg">{error || 'Report not found'}</p>
            <Link href="/" className="inline-block px-8 py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold rounded-2xl hover:shadow-lg hover:shadow-amber-200/50 transition-all">
              Back to home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'SAFE': return 'from-emerald-600 to-teal-600';
      case 'MODERATE': return 'from-yellow-500 to-orange-500';
      case 'HIGH': return 'from-orange-600 to-red-500';
      case 'CRITICAL': return 'from-red-600 to-rose-700';
      default: return 'from-gray-600 to-gray-700';
    }
  };

  const getRiskLevelBg = (level: string) => {
    switch (level) {
      case 'SAFE': return 'bg-emerald-50 border-emerald-200';
      case 'MODERATE': return 'bg-yellow-50 border-yellow-200';
      case 'HIGH': return 'bg-orange-50 border-orange-200';
      case 'CRITICAL': return 'bg-red-50 border-red-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  };

  const getRiskLevelText = (level: string) => {
    switch (level) {
      case 'SAFE': return 'Safe';
      case 'MODERATE': return 'Moderate Risk';
      case 'HIGH': return 'High Risk';
      case 'CRITICAL': return 'Critical Risk';
      default: return level;
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] print:bg-white">
      {/* Header */}
      <header className="bg-[#FDFBF7]/80 backdrop-blur-md border-b border-amber-100 sticky top-0 z-50 print:static print:bg-white print:border-gray-200">
        <div className="container mx-auto px-6 py-4 max-w-7xl">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-amber-200 group-hover:scale-105 transition-transform print:shadow-none">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <span className="text-xl font-semibold text-[#2D3748]">K-Rent Safety</span>
            </Link>
            <div className="flex gap-3 print:hidden">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-white border border-amber-200 text-[#4A5568] rounded-xl hover:bg-amber-50 transition-colors flex items-center gap-2 font-medium"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Print
              </button>
              <Link href="/">
                <button className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl hover:shadow-lg hover:shadow-amber-200/50 transition-all font-medium">
                  New analysis
                </button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-12 max-w-5xl">
        {/* Page Header */}
        <div className="mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-700 rounded-full text-sm font-semibold mb-4 border border-amber-200 print:bg-amber-100">
            <span>Analysis Complete</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-[#1A202C] mb-3 tracking-tight" style={{ letterSpacing: '-0.03em' }}>
            Safety Analysis Report
          </h1>
          <p className="text-xl text-[#4A5568]">{report.property.address}</p>
        </div>

        {/* Overall Score - Hero Card */}
        <div className={`rounded-3xl p-12 mb-8 text-white bg-gradient-to-br ${getRiskLevelColor(report.riskAnalysis.riskLevel)} shadow-2xl`}>
          <div className="text-center">
            <div className="inline-block px-6 py-3 bg-white/20 backdrop-blur-sm rounded-full border border-white/30 font-bold text-lg mb-6">
              {getRiskLevelText(report.riskAnalysis.riskLevel)}
            </div>
            <div className="mb-6">
              <div className="text-8xl font-bold mb-2">
                {report.riskAnalysis.overallScore}
                <span className="text-4xl opacity-80">/100</span>
              </div>
              <div className="text-xl opacity-90">Safety Score</div>
            </div>
            <p className="text-2xl opacity-95 max-w-3xl mx-auto leading-relaxed font-medium">
              {report.riskAnalysis.verdict}
            </p>
          </div>
        </div>

        {/* Property Info */}
        <div className="bg-white rounded-3xl p-8 mb-8 shadow-xl shadow-amber-900/5 border border-amber-100 print:shadow-none print:border-gray-200">
          <h2 className="text-2xl font-bold text-[#1A202C] mb-6">Property Information</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="bg-amber-50/50 rounded-xl p-5 border border-amber-100 print:bg-gray-50 print:border-gray-200">
              <p className="text-sm text-gray-600 mb-2 font-medium">Your Deposit</p>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold text-gray-900">
                  ₩{(report.property.proposedJeonse / 100000000).toFixed(1)}
                </span>
                <span className="text-lg font-semibold text-gray-700">억</span>
              </div>
            </div>
            <div className="bg-amber-50/50 rounded-xl p-5 border border-amber-100 print:bg-gray-50 print:border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <p className="text-sm text-gray-600 font-medium">Est. Market Value</p>
                <Tooltip content={
                  <div>
                    <p className="font-bold text-gray-900 mb-2">How is this calculated?</p>
                    <p className="text-gray-700 mb-3">
                      {report.property.valuation?.confidence && report.property.valuation.confidence !== 0.5
                        ? `Calculated as the average of recent real market transactions from the MOLIT (Ministry of Land, Infrastructure and Transport) database.`
                        : `Estimated based on the proposed deposit amount using typical deposit-to-value ratios (70%), as recent transaction data was not available.`}
                    </p>

                    {report.property.valuation?.confidence && report.property.valuation.confidence !== 0.5 && (
                      <>
                        <p className="font-semibold text-gray-900 mb-1">Data Confidence</p>
                        <p className="text-gray-700 mb-3">
                          {(report.property.valuation.confidence * 100).toFixed(0)}% confidence based on {
                            report.property.valuation.confidence >= 0.7 ? 'strong statistical trend and multiple recent transactions' :
                            report.property.valuation.confidence >= 0.4 ? 'moderate statistical trend and several transactions' :
                            'limited transaction data with weak trend reliability'
                          }
                        </p>
                      </>
                    )}

                    {report.property.valuation?.valueLow && report.property.valuation?.valueHigh && (
                      <>
                        <p className="font-semibold text-gray-900 mb-1">Estimated Range</p>
                        <p className="text-gray-700 mb-3">
                          ₩{(report.property.valuation.valueLow / 100000000).toFixed(1)}억 - ₩{(report.property.valuation.valueHigh / 100000000).toFixed(1)}억
                        </p>
                      </>
                    )}

                    {report.property.valuation?.marketTrend && (
                      <>
                        <p className="font-semibold text-gray-900 mb-1">Market Trend</p>
                        <p className="text-gray-700 mb-3 capitalize">
                          {report.property.valuation.marketTrend === 'rising' && '📈 Rising'}
                          {report.property.valuation.marketTrend === 'stable' && (
                            <>
                              ➡️ Stable
                              {report.property.valuation?.confidence === 0.5 && (
                                <span className="text-amber-600 ml-1">⚠️ (No transaction data)</span>
                              )}
                            </>
                          )}
                          {report.property.valuation.marketTrend === 'falling' && '📉 Falling'}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {report.property.valuation?.confidence && report.property.valuation.confidence !== 0.5
                            ? 'Based on linear regression analysis of past 12 months'
                            : 'No recent transaction data available - trend unknown'}
                        </p>
                      </>
                    )}

                    <p className="text-gray-600 mt-3 pt-3 border-t border-gray-200">
                      <span className="font-semibold text-orange-600">⚠️ Important:</span> This is an estimate. Actual market value may vary. We recommend getting an independent professional appraisal (감정평가) before proceeding.
                    </p>
                  </div>
                }>
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </Tooltip>
              </div>
              {report.property.estimatedValue ? (
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-gray-900">
                    ₩{(report.property.estimatedValue / 100000000).toFixed(1)}
                  </span>
                  <span className="text-lg font-semibold text-gray-700">억</span>
                </div>
              ) : (
                <p className="text-2xl font-bold text-gray-900">N/A</p>
              )}
            </div>
            <div className="bg-amber-50/50 rounded-xl p-5 border border-amber-100 print:bg-gray-50 print:border-gray-200">
              <p className="text-sm text-gray-600 mb-2 font-medium">LTV Ratio</p>
              <p className="text-2xl font-bold text-gray-900">{report.riskAnalysis.metrics.ltv.toFixed(1)}%</p>
            </div>
            <div className="bg-amber-50/50 rounded-xl p-5 border border-amber-100 print:bg-gray-50 print:border-gray-200">
              <p className="text-sm text-gray-600 mb-2 font-medium">Total Debt</p>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold text-gray-900">
                  ₩{(report.riskAnalysis.metrics.totalDebt / 100000000).toFixed(1)}
                </span>
                <span className="text-lg font-semibold text-gray-700">억</span>
              </div>
            </div>
          </div>
        </div>

        {/* Component Scores */}
        <div className="bg-white rounded-3xl p-8 mb-8 shadow-xl shadow-amber-900/5 border border-amber-100 print:shadow-none print:border-gray-200 print:page-break-before">
          <h2 className="text-2xl font-bold text-[#1A202C] mb-6">Detailed Scores</h2>
          <div className="space-y-5">
            {Object.entries(report.riskAnalysis.scores).map(([key, value]) => {
              const labels: Record<string, string> = {
                ltvScore: 'Loan-to-Value Score',
                debtScore: 'Debt Analysis Score',
                legalScore: 'Legal Compliance Score',
                marketScore: 'Market Analysis Score',
                buildingScore: 'Building Status Score'
              };

              const descriptions: Record<string, { title: string; description: string; scoring: string }> = {
                ltvScore: {
                  title: 'Loan-to-Value Ratio Assessment',
                  description: 'Calculates total exposure ratio: LTV = (All Existing Debt + Your Deposit) / Property Value. Existing debt includes mortgages, jeonse rights (전세권), and lease rights (임차권). Lower LTV means more equity cushion to protect your deposit in foreclosure.',
                  scoring: '100 pts: <50% (Excellent) • 80 pts: 50-60% (Good) • 60 pts: 60-70% (Acceptable) • 40 pts: 70-80% (Risky) • 20 pts: 80-90% (Dangerous) • 0 pts: >90% (Critical)'
                },
                debtScore: {
                  title: 'Debt Structure Analysis',
                  description: 'Evaluates existing debt burden (excluding your deposit). Total debt includes mortgages, jeonse rights (전세권), and lease rights (임차권). Calculation: Start at 100pts → Apply debt ratio penalty → Subtract creditor penalty (capped at -20pts).',
                  scoring: 'Step 1 - Debt Ratio: >70% (-50pts), 60-70% (-30pts), 50-60% (-15pts), 40-50% (-5pts), <40% (no penalty) | Step 2 - Creditor Penalty: -5pts per creditor (mortgages + jeonse/lease rights), capped at -20pts max | Final Score: 100 - penalties (worst case: 100 - 50 - 20 = 30pts minimum)'
                },
                legalScore: {
                  title: 'Legal & Compliance Check',
                  description: 'Checks for legal issues that could jeopardize your deposit. Starts at 100pts and deducts for each issue found in the 등기부등본.',
                  scoring: 'Critical Issues: Seizure (압류) -100pts, Auction (경매) -100pts, Provisional Seizure (가압류) -50pts | Serious Issues: Superficies (지상권) -40pts, Provisional Registration (가등기) -35pts, Provisional Disposition (가처분) -30pts | Moderate Issues: Shared Ownership (공동소유) -25pts, Easement (지역권) -20pts, Advance Notice (예고등기) -15pts, Unregistered Land Rights (대지권미등기) -10pts | Liens: -25pts each'
                },
                marketScore: {
                  title: 'Market Conditions Analysis',
                  description: 'Assesses market trend with confidence-amplified impact. Higher confidence strengthens the trend signal (good news gets better, bad news gets worse). Lower confidence adds uncertainty penalty.',
                  scoring: 'Base: 70pts | Rising Market: High confidence ≥70% (+25pts), Medium 40-70% (+15pts), Low <40% (+8pts) | Falling Market: High confidence ≥70% (-35pts), Medium 40-70% (-25pts), Low <40% (-15pts) | Stable: No adjustment | Low confidence <40%: Additional -10pts uncertainty penalty'
                },
                buildingScore: {
                  title: 'Building Age Assessment',
                  description: 'Evaluates building age and physical condition. Older buildings typically have higher maintenance costs and potential structural issues.',
                  scoring: 'Age-based: <5 years (100pts), 5-10 (90pts), 10-15 (80pts), 15-20 (70pts), 20-25 (60pts), 25-30 (50pts), >30 (40pts)'
                }
              };

              const scoreInfo = descriptions[key];

              return (
                <div key={key}>
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900 text-lg">{labels[key]}</span>
                      <Tooltip content={
                        <div>
                          <p className="font-bold text-gray-900 mb-2">{scoreInfo.title}</p>
                          <p className="text-gray-700 mb-3">{scoreInfo.description}</p>
                          <p className="font-semibold text-gray-900 mb-1">Scoring:</p>
                          <p className="text-gray-600">{scoreInfo.scoring}</p>
                        </div>
                      }>
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                      </Tooltip>
                    </div>
                    <span className="font-bold text-gray-900 text-lg">{value}/100</span>
                  </div>
                  <div className={`h-3 rounded-full overflow-hidden ${
                    value === 0
                      ? 'bg-red-200 ring-2 ring-red-500 ring-offset-1'
                      : 'bg-gray-200'
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

        {/* Debt Breakdown */}
        {report.riskAnalysis.debtRanking && report.riskAnalysis.debtRanking.length > 0 && (
          <div className="bg-white rounded-3xl p-8 mb-8 shadow-xl shadow-amber-900/5 border border-amber-100 print:shadow-none print:border-gray-200">
            <div className="flex items-center gap-3 mb-6">
              <h2 className="text-2xl font-bold text-[#1A202C]">Debt & Collateral Analysis</h2>
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
                  <p className="text-gray-600 mt-2 pt-2 border-t border-gray-200 text-[11px]">
                    <span className="font-semibold">📝 Note:</span> This ranking shows all competing claims on the property: mortgages (근저당권), jeonse rights (전세권), and lease rights (임차권). All of these compete for repayment in foreclosure, ranked by registration date.
                  </p>
                  <p className="text-gray-600 mt-3 pt-3 border-t border-gray-200">
                    <span className="font-semibold text-orange-600">⚠️ Important:</span> Your proposed deposit will rank after all currently registered claims shown above. Ensure sufficient equity remains to cover your deposit.
                  </p>
                </div>
              }>
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </Tooltip>
            </div>

            {/* Summary Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-5 border border-blue-100">
                <p className="text-sm text-blue-700 mb-2 font-medium">Total Registered Debt</p>
                <p className="text-2xl font-bold text-blue-900">
                  ₩{(report.riskAnalysis.metrics.totalDebt / 100000000).toFixed(1)}억
                </p>
                <p className="text-xs text-blue-600 mt-1">{report.riskAnalysis.debtRanking.filter(d => d.type.includes('근저당권')).length} mortgage(s)</p>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-5 border border-purple-100">
                <p className="text-sm text-purple-700 mb-2 font-medium">Your Deposit (Proposed)</p>
                <p className="text-2xl font-bold text-purple-900">
                  ₩{(report.property.proposedJeonse / 100000000).toFixed(1)}억
                </p>
                <p className="text-xs text-purple-600 mt-1">Unregistered - will rank last</p>
              </div>
              <div className={`bg-gradient-to-br rounded-xl p-5 border ${
                report.riskAnalysis.metrics.availableEquity > 0
                  ? 'from-emerald-50 to-teal-50 border-emerald-100'
                  : 'from-red-50 to-rose-50 border-red-100'
              }`}>
                <p className={`text-sm mb-2 font-medium ${
                  report.riskAnalysis.metrics.availableEquity > 0 ? 'text-emerald-700' : 'text-red-700'
                }`}>
                  Available Equity
                </p>
                <p className={`text-2xl font-bold ${
                  report.riskAnalysis.metrics.availableEquity > 0 ? 'text-emerald-900' : 'text-red-900'
                }`}>
                  {report.riskAnalysis.metrics.availableEquity >= 0 ? '+' : ''}₩{(report.riskAnalysis.metrics.availableEquity / 100000000).toFixed(1)}억
                </p>
                <p className={`text-xs mt-1 ${
                  report.riskAnalysis.metrics.availableEquity > 0 ? 'text-emerald-600' : 'text-red-600'
                }`}>
                  {report.riskAnalysis.metrics.availableEquity > 0 ? 'Positive equity cushion' : 'Negative equity - HIGH RISK'}
                </p>
              </div>
            </div>

            {/* Debt Ranking Table */}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b-2 border-gray-300 bg-gray-50">
                    <th className="text-center py-4 px-4 text-xs font-bold text-gray-700 uppercase tracking-wider">Rank</th>
                    <th className="text-center py-4 px-4 text-xs font-bold text-gray-700 uppercase tracking-wider">Priority</th>
                    <th className="text-center py-4 px-4 text-xs font-bold text-gray-700 uppercase tracking-wider">Type</th>
                    <th className="text-center py-4 px-4 text-xs font-bold text-gray-700 uppercase tracking-wider">Amount</th>
                    <th className="text-center py-4 px-4 text-xs font-bold text-gray-700 uppercase tracking-wider">Registration<br/>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {report.riskAnalysis.debtRanking.map((debt, index) => {
                    const isYourDeposit = debt.type.includes('Your Deposit');
                    const priorityColors = {
                      senior: 'bg-red-50/80 border-l-4 border-red-500',
                      junior: 'bg-orange-50/80 border-l-4 border-orange-500',
                      subordinate: 'bg-yellow-50/80 border-l-4 border-yellow-500'
                    };
                    const priorityBadges = {
                      senior: 'bg-red-600 text-white',
                      junior: 'bg-orange-600 text-white',
                      subordinate: 'bg-yellow-600 text-white'
                    };

                    return (
                      <tr
                        key={index}
                        className={`border-b border-gray-200 ${
                          isYourDeposit ? 'bg-gradient-to-r from-purple-100/70 via-purple-50/50 to-purple-100/70 border-l-4 border-purple-600' : priorityColors[debt.priority]
                        }`}
                      >
                        <td className="py-5 px-4 text-center">
                          <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-gradient-to-br from-gray-700 to-gray-800 text-white font-bold text-sm">
                            {debt.rank}
                          </span>
                        </td>
                        <td className="py-5 px-4 text-center">
                          {isYourDeposit ? (
                            <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-r from-purple-600 to-purple-700 text-white uppercase tracking-wide">
                              YOUR DEPOSIT
                            </span>
                          ) : (
                            <span className={`inline-flex items-center px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wide ${priorityBadges[debt.priority]}`}>
                              {debt.priority}
                            </span>
                          )}
                        </td>
                        <td className="py-5 px-4 text-center">
                          <div className={`font-medium text-sm ${isYourDeposit ? 'text-gray-900' : 'text-gray-800'}`}>
                            {debt.type.replace(' (Mortgage)', '')}
                          </div>
                          {!isYourDeposit && (
                            <div className="text-xs text-gray-500 mt-0.5">(Mortgage)</div>
                          )}
                        </td>
                        <td className="py-5 px-4 text-center">
                          <div className={`font-bold text-xl ${isYourDeposit ? 'text-purple-900' : 'text-gray-900'}`}>
                            ₩{(debt.amount / 100000000).toFixed(1)}억
                          </div>
                        </td>
                        <td className="py-5 px-4 text-center">
                          {debt.registrationDate.includes('(') ? (
                            <>
                              <div className="text-gray-700 text-sm font-medium">
                                {debt.registrationDate.split(' (')[0]}
                              </div>
                              <div className="text-xs text-gray-500 mt-0.5">
                                ({debt.registrationDate.split(' (')[1].replace(')', '')})
                              </div>
                            </>
                          ) : (
                            <div className="text-gray-700 text-sm font-medium whitespace-nowrap">
                              {debt.registrationDate}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Calculation Breakdown */}
            <div className="mt-6 p-5 bg-gradient-to-r from-gray-50 to-slate-50 rounded-xl border border-gray-200">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                Equity Calculation
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between py-2 border-b border-gray-200">
                  <span className="text-gray-700">Estimated Property Value</span>
                  <span className="font-bold text-gray-900">₩{((report.property.estimatedValue || 0) / 100000000).toFixed(1)}억</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-200">
                  <span className="text-gray-700">Total Registered Debt</span>
                  <span className="font-bold text-red-700">- ₩{(report.riskAnalysis.metrics.totalDebt / 100000000).toFixed(1)}억</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-200">
                  <span className="text-gray-700">Your Deposit (Proposed)</span>
                  <span className="font-bold text-purple-700">- ₩{(report.property.proposedJeonse / 100000000).toFixed(1)}억</span>
                </div>
                <div className="flex justify-between py-3 bg-white rounded-lg px-3 mt-2">
                  <span className="font-bold text-gray-900">Remaining Equity</span>
                  <span className={`font-bold text-lg ${
                    report.riskAnalysis.metrics.availableEquity > 0 ? 'text-emerald-700' : 'text-red-700'
                  }`}>
                    {report.riskAnalysis.metrics.availableEquity >= 0 ? '+' : ''}₩{(report.riskAnalysis.metrics.availableEquity / 100000000).toFixed(1)}억
                  </span>
                </div>
              </div>

              {report.riskAnalysis.metrics.availableEquity <= 0 && (
                <div className="mt-4 p-4 bg-red-100 border-l-4 border-red-600 rounded">
                  <p className="text-red-900 font-semibold flex items-center gap-2">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    Critical: Negative equity detected!
                  </p>
                  <p className="text-red-800 text-sm mt-2">
                    The total debt plus your proposed deposit exceeds the property value. This means there may not be enough value to fully cover your deposit in case of foreclosure. <span className="font-bold">We strongly recommend reconsidering this property.</span>
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Risks */}
        {report.riskAnalysis.risks.length > 0 && (
          <div className="bg-white rounded-3xl p-8 mb-8 shadow-xl shadow-amber-900/5 border border-amber-100 print:shadow-none print:border-gray-200">
            <h2 className="text-2xl font-bold text-[#1A202C] mb-6">
              Detected Risks ({report.riskAnalysis.risks.length})
            </h2>
            <div className="space-y-4">
              {report.riskAnalysis.risks.map((risk, index) => (
                <div
                  key={index}
                  className={`p-6 rounded-2xl border-2 ${
                    risk.severity === 'CRITICAL' ? 'bg-red-50 border-red-200' :
                    risk.severity === 'HIGH' ? 'bg-orange-50 border-orange-200' :
                    'bg-yellow-50 border-yellow-200'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <span className="text-3xl flex-shrink-0">⚠️</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-3 mb-2 flex-wrap">
                        <p className="font-bold text-gray-900 text-lg break-words flex-1 min-w-0">{risk.type}</p>
                        <span className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-bold ${
                          risk.severity === 'CRITICAL' ? 'bg-red-600 text-white' :
                          risk.severity === 'HIGH' ? 'bg-orange-600 text-white' :
                          'bg-yellow-600 text-white'
                        }`}>
                          {risk.severity}
                        </span>
                      </div>
                      <p className="text-gray-700 leading-relaxed break-words">{risk.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Small Amount Priority */}
        {report.riskAnalysis.smallAmountPriority && (
          <div className="bg-white rounded-3xl p-8 mb-8 shadow-xl shadow-amber-900/5 border border-amber-100 print:shadow-none print:border-gray-200">
            <h2 className="text-2xl font-bold text-[#1A202C] mb-6">Small Amount Priority Repayment</h2>
            <div className={`p-6 rounded-2xl border-2 ${
              report.riskAnalysis.smallAmountPriority.isEligible
                ? 'bg-emerald-50 border-emerald-200'
                : 'bg-gray-50 border-gray-200'
            }`}>
              <p className="text-2xl font-bold mb-4">
                {report.riskAnalysis.smallAmountPriority.isEligible ? '✅ Eligible' : '❌ Not Eligible'}
              </p>
              <div className="grid md:grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-gray-600 mb-1 font-medium">Region</p>
                  <p className="font-semibold text-gray-900">{report.riskAnalysis.smallAmountPriority.region}</p>
                </div>
                <div>
                  <p className="text-gray-600 mb-1 font-medium">Threshold</p>
                  <p className="font-semibold text-gray-900">₩{(report.riskAnalysis.smallAmountPriority.threshold / 100000000).toFixed(2)}억</p>
                </div>
                <div>
                  <p className="text-gray-600 mb-1 font-medium">Protected Amount</p>
                  <p className="font-semibold text-gray-900">₩{(report.riskAnalysis.smallAmountPriority.protectedAmount / 10000000).toFixed(0)}M</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Recommendations */}
        <div className="bg-white rounded-3xl p-8 mb-8 shadow-xl shadow-amber-900/5 border border-amber-100 print:shadow-none print:border-gray-200">
          <h2 className="text-2xl font-bold text-[#1A202C] mb-6">Recommendations</h2>

          {report.recommendations.mandatory.length > 0 && (
            <div className="mb-6">
              <h3 className="font-bold text-red-600 text-lg mb-4 flex items-center gap-2">
                <span className="text-2xl">🚨</span> Mandatory Actions
              </h3>
              <ul className="space-y-3">
                {report.recommendations.mandatory.map((item, index) => (
                  <li key={index} className="flex gap-3 p-4 bg-red-50 rounded-xl border border-red-100">
                    <span className="text-red-600 font-bold flex-shrink-0">•</span>
                    <span className="text-gray-800 leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {report.recommendations.recommended.length > 0 && (
            <div className="mb-6">
              <h3 className="font-bold text-orange-600 text-lg mb-4 flex items-center gap-2">
                <span className="text-2xl">⚠️</span> Recommended Actions
              </h3>
              <ul className="space-y-3">
                {report.recommendations.recommended.map((item, index) => (
                  <li key={index} className="flex gap-3 p-4 bg-orange-50 rounded-xl border border-orange-100">
                    <span className="text-orange-600 font-bold flex-shrink-0">•</span>
                    <span className="text-gray-800 leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {report.recommendations.optional.length > 0 && (
            <div>
              <h3 className="font-bold text-blue-600 text-lg mb-4 flex items-center gap-2">
                <span className="text-2xl">💡</span> Optional Actions
              </h3>
              <ul className="space-y-3">
                {report.recommendations.optional.map((item, index) => (
                  <li key={index} className="flex gap-3 p-4 bg-blue-50 rounded-xl border border-blue-100">
                    <span className="text-blue-600 font-bold flex-shrink-0">•</span>
                    <span className="text-gray-800 leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8 print:hidden">
          <Link href="/" className="flex-1">
            <button className="w-full px-8 py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold text-lg rounded-2xl hover:shadow-xl hover:shadow-amber-200/50 transition-all hover:-translate-y-1">
              Start new analysis
            </button>
          </Link>
          <button
            onClick={() => window.print()}
            className="flex-1 px-8 py-4 bg-white border-2 border-amber-200 text-[#4A5568] font-semibold text-lg rounded-2xl hover:bg-amber-50 transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Save as PDF
          </button>
        </div>

        {/* Disclaimer */}
        <div className="bg-amber-50 rounded-2xl p-6 border border-amber-200 print:bg-gray-100 print:border-gray-200">
          <p className="font-bold text-gray-900 mb-2">Disclaimer</p>
          <div className="space-y-2 text-sm text-gray-600 leading-relaxed">
            <p>
              This analysis is for informational purposes only and is not legal advice or investment counsel.
              Please consult with professionals before making important decisions.
              Based on the Housing Lease Protection Act Enforcement Decree (effective March 1, 2025).
            </p>
            <p className="pt-2 border-t border-gray-300">
              <span className="font-semibold text-gray-900">Note on Debt Calculation:</span> Mortgage debt estimates are based on
              채권최고액 (Maximum Secured Amount) divided by 1.2 to approximate the actual principal.
              The 채권최고액 is typically set at 120% of the loan principal to cover interest and fees.
              Actual debt amounts may vary and should be verified with the creditor.
            </p>
          </div>
        </div>
      </div>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          /* Force print color mode */
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }

          /* Hide elements that shouldn't print */
          .print\\:hidden {
            display: none !important;
          }

          /* Page setup */
          @page {
            size: A4;
            margin: 1.5cm;
          }

          body {
            background: white !important;
          }

          /* Reset warm background for print */
          .bg-\\[\\#FDFBF7\\] {
            background-color: white !important;
          }

          /* Show header logo but hide buttons */
          header .flex.gap-3 {
            display: none !important;
          }

          /* Page break control */
          .print\\:page-break-before {
            page-break-before: always !important;
            break-before: always !important;
            margin-top: 0 !important;
          }

          /* Prevent orphaned headers */
          h2 {
            page-break-after: avoid !important;
            break-after: avoid !important;
          }

          /* Make table fit and prevent cutting */
          table {
            page-break-inside: auto !important;
            width: 100% !important;
            table-layout: fixed !important;
            border-collapse: collapse !important;
          }

          tr {
            page-break-inside: avoid !important;
            page-break-after: auto !important;
          }

          thead {
            display: table-header-group !important;
          }

          /* Prevent page breaks in critical sections */
          .no-break {
            page-break-inside: avoid !important;
          }

          /* Ensure gradients and colors print */
          [class*="bg-gradient"],
          [class*="bg-red"],
          [class*="bg-orange"],
          [class*="bg-yellow"],
          [class*="bg-emerald"],
          [class*="bg-purple"],
          [class*="bg-blue"] {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          /* Fix table cell sizing for print */
          td, th {
            word-wrap: break-word !important;
            overflow-wrap: break-word !important;
            padding: 8px 6px !important;
            vertical-align: middle !important;
          }

          /* Reduce font sizes slightly for better fit */
          .container {
            max-width: 100% !important;
            padding-left: 0.5cm !important;
            padding-right: 0.5cm !important;
          }

          /* Hide scrollbar */
          .overflow-x-auto {
            overflow-x: visible !important;
          }

          /* Debt Ranking Table - Clean print styling */
          table {
            border-collapse: collapse !important;
            width: 100% !important;
            font-size: 11px !important;
            line-height: 1.4 !important;
          }

          table thead tr {
            background-color: #f9fafb !important;
            border-bottom: 2px solid #d1d5db !important;
          }

          table th {
            font-size: 10px !important;
            font-weight: 700 !important;
            padding: 12px 8px !important;
            text-align: center !important;
            vertical-align: middle !important;
            color: #374151 !important;
            text-transform: uppercase !important;
            letter-spacing: 0.025em !important;
          }

          table tbody tr {
            border-bottom: 1px solid #e5e7eb !important;
          }

          table td {
            padding: 14px 8px !important;
            vertical-align: middle !important;
            text-align: center !important;
          }

          /* Column widths */
          table th:nth-child(1), table td:nth-child(1) { width: 12% !important; }  /* Rank */
          table th:nth-child(2), table td:nth-child(2) { width: 22% !important; }  /* Priority */
          table th:nth-child(3), table td:nth-child(3) { width: 24% !important; }  /* Type */
          table th:nth-child(4), table td:nth-child(4) { width: 24% !important; }  /* Amount */
          table th:nth-child(5), table td:nth-child(5) { width: 18% !important; }  /* Date */

          /* Rank badge - smaller for PDF */
          table td:nth-child(1) span {
            display: inline-flex !important;
            width: 30px !important;
            height: 30px !important;
            font-size: 11px !important;
            font-weight: 700 !important;
            align-items: center !important;
            justify-content: center !important;
            border-radius: 50% !important;
            background: linear-gradient(to bottom right, #374151, #1f2937) !important;
            color: white !important;
          }

          /* Priority badges - consistent sizing */
          table td:nth-child(2) span {
            font-size: 9px !important;
            font-weight: 700 !important;
            padding: 5px 10px !important;
            white-space: nowrap !important;
            display: inline-block !important;
            border-radius: 6px !important;
            text-transform: uppercase !important;
            letter-spacing: 0.05em !important;
          }

          /* Type column - split into two lines */
          table td:nth-child(3) div:first-child {
            font-size: 11px !important;
            font-weight: 600 !important;
            color: #1f2937 !important;
            margin-bottom: 2px !important;
          }

          table td:nth-child(3) div:last-child {
            font-size: 9px !important;
            font-weight: 400 !important;
            color: #6b7280 !important;
          }

          /* Amount - clean and bold */
          table td:nth-child(4) div {
            font-size: 14px !important;
            font-weight: 700 !important;
            color: #1f2937 !important;
            white-space: nowrap !important;
          }

          /* Registration Date */
          table td:nth-child(5) div {
            font-size: 10px !important;
            font-weight: 500 !important;
            color: #374151 !important;
            white-space: nowrap !important;
          }

          /* Row background colors for print */
          table tbody tr.border-l-4 {
            border-left-width: 4px !important;
            border-left-style: solid !important;
          }

          /* Remove hover effects in print */
          table tbody tr {
            box-shadow: none !important;
          }
        }
      `}</style>
    </div>
  );
}
