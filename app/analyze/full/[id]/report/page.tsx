'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Tooltip from '@/components/Tooltip';
import Link from 'next/link';
import { WolseAnalysisResult, WolseNegotiationOption } from '@/lib/types';

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

export default function FullRentalReportPage() {
  const params = useParams();
  const analysisId = params.id as string;

  const [report, setReport] = useState<ReportData | null>(null);
  const [wolseResult, setWolseResult] = useState<WolseAnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedScript, setCopiedScript] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch deposit safety report
        const reportResponse = await fetch(`/api/analysis/report/${analysisId}`);
        if (!reportResponse.ok) {
          throw new Error('Unable to load safety report');
        }
        const reportData = await reportResponse.json();
        setReport(reportData);

        // Load wolse result from session storage
        const storedWolse = sessionStorage.getItem(`full-rental-wolse-result-${analysisId}`);
        if (storedWolse) {
          setWolseResult(JSON.parse(storedWolse));
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [analysisId]);

  const copyToClipboard = (text: string, optionName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedScript(optionName);
    setTimeout(() => setCopiedScript(null), 2000);
  };

  const formatWon = (amount: number) => {
    if (amount >= 10000) {
      return `${(amount / 10000).toLocaleString()}만원`;
    }
    return `${amount.toLocaleString()}원`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-[#4A5568] text-lg">Loading comprehensive report...</p>
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] py-16">
        <div className="container mx-auto px-6 max-w-2xl">
          <div className="bg-white rounded-3xl shadow-xl shadow-green-900/5 border border-green-100 text-center py-16 px-8">
            <div className="w-20 h-20 mx-auto mb-6 bg-red-100 rounded-2xl flex items-center justify-center">
              <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-[#1A202C] mb-3">Error occurred</h2>
            <p className="text-[#4A5568] mb-8 text-lg">{error || 'Report not found'}</p>
            <Link href="/" className="inline-block px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold rounded-2xl hover:shadow-lg hover:shadow-green-200/50 transition-all">
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

  const getRiskLevelText = (level: string) => {
    switch (level) {
      case 'SAFE': return 'Safe';
      case 'MODERATE': return 'Moderate Risk';
      case 'HIGH': return 'High Risk';
      case 'CRITICAL': return 'Critical Risk';
      default: return level;
    }
  };

  const getAssessmentStyle = (assessment: string) => {
    switch (assessment) {
      case 'GOOD_DEAL':
        return { bg: 'bg-gradient-to-br from-emerald-500 to-teal-600', border: 'border-emerald-400', text: 'text-white', icon: '🎉', label: 'Great Deal!', isGradient: true };
      case 'FAIR':
        return { bg: 'bg-gradient-to-br from-blue-500 to-indigo-600', border: 'border-blue-400', text: 'text-white', icon: '✓', label: 'Fair Price', isGradient: true };
      case 'OVERPRICED':
        return { bg: 'bg-gradient-to-br from-amber-500 to-orange-600', border: 'border-amber-400', text: 'text-white', icon: '⚠️', label: 'Above Market', isGradient: true };
      case 'SEVERELY_OVERPRICED':
        return { bg: 'bg-gradient-to-br from-red-500 to-rose-600', border: 'border-red-400', text: 'text-white', icon: '🚨', label: 'Significantly Overpriced', isGradient: true };
      default:
        return { bg: 'bg-gradient-to-br from-gray-500 to-gray-600', border: 'border-gray-400', text: 'text-white', icon: '?', label: 'Unknown', isGradient: true };
    }
  };

  const getTrendIcon = (direction: string) => {
    switch (direction) {
      case 'RISING': return '📈';
      case 'DECLINING': return '📉';
      default: return '➡️';
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] print:bg-white">
      {/* Header */}
      <header className="bg-[#FDFBF7]/80 backdrop-blur-md border-b border-green-100 sticky top-0 z-50 print:static print:bg-white print:border-gray-200">
        <div className="container mx-auto px-6 py-4 max-w-7xl">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-green-200 group-hover:scale-105 transition-transform print:shadow-none">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <span className="text-xl font-semibold text-[#2D3748]">K-Rent Safety</span>
            </Link>
            <div className="flex gap-3 print:hidden">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-white border border-green-200 text-[#4A5568] rounded-xl hover:bg-green-50 transition-colors flex items-center gap-2 font-medium"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Print
              </button>
              <Link href="/check">
                <button className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:shadow-lg hover:shadow-green-200/50 transition-all font-medium">
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
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-full text-sm font-semibold mb-4 border border-green-200 print:bg-green-100">
            <span>Full Wolse Check Complete</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-[#1A202C] mb-3 tracking-tight" style={{ letterSpacing: '-0.03em' }}>
            Comprehensive Report
          </h1>
          <p className="text-xl text-[#4A5568]">{report.property.address}</p>
        </div>

        {/* Two-Column Summary */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Deposit Safety Score */}
          <div className={`rounded-3xl p-8 text-white bg-gradient-to-br ${getRiskLevelColor(report.riskAnalysis.riskLevel)} shadow-2xl`}>
            <div className="text-center">
              <div className="inline-block px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full border border-white/30 font-bold text-sm mb-4">
                Deposit Safety
              </div>
              <div className="mb-4">
                <div className="text-6xl font-bold mb-1">
                  {report.riskAnalysis.overallScore}
                  <span className="text-2xl opacity-80">/100</span>
                </div>
                <div className="text-lg opacity-90">{getRiskLevelText(report.riskAnalysis.riskLevel)}</div>
              </div>
              <p className="text-sm opacity-90 max-w-sm mx-auto leading-relaxed">
                {report.riskAnalysis.verdict}
              </p>
            </div>
          </div>

          {/* Price Check Score */}
          {wolseResult && (
            <div className={`rounded-3xl p-8 ${getAssessmentStyle(wolseResult.assessment).bg} shadow-2xl`}>
              <div className="text-center">
                <div className="inline-block px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full border border-white/30 font-bold text-sm mb-4 text-white">
                  Price Check
                </div>
                <div className="mb-4">
                  <div className="text-5xl mb-2">{getAssessmentStyle(wolseResult.assessment).icon}</div>
                  <div className="text-2xl font-bold text-white">
                    {getAssessmentStyle(wolseResult.assessment).label}
                  </div>
                </div>
                <p className="text-sm text-white/90 max-w-sm mx-auto leading-relaxed">
                  {wolseResult.assessmentDetails}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* ==================== DEPOSIT SAFETY SECTION ==================== */}
        <div className="mb-16">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shadow-green-200">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-[#1A202C]">Deposit Safety Analysis</h2>
          </div>

          {/* Property Info */}
          <div className="bg-white rounded-3xl p-8 mb-8 shadow-xl shadow-green-900/5 border border-green-100 print:shadow-none print:border-gray-200">
            <h3 className="text-xl font-bold text-[#1A202C] mb-6">Property Information</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="bg-green-50/50 rounded-xl p-5 border border-green-100 print:bg-gray-50 print:border-gray-200">
                <p className="text-sm text-gray-600 mb-2 font-medium">Deposit Amount</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-gray-900">
                    ₩{(report.property.proposedJeonse / 100000000).toFixed(1)}
                  </span>
                  <span className="text-lg font-semibold text-gray-700">억</span>
                </div>
              </div>
              <div className="bg-green-50/50 rounded-xl p-5 border border-green-100 print:bg-gray-50 print:border-gray-200">
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
                      <p className="text-gray-600 mt-3 pt-3 border-t border-gray-200">
                        <span className="font-semibold text-orange-600">⚠️ Important:</span> This is an estimate. Actual market value may vary.
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
              <div className="bg-green-50/50 rounded-xl p-5 border border-green-100 print:bg-gray-50 print:border-gray-200">
                <p className="text-sm text-gray-600 mb-2 font-medium">LTV Ratio</p>
                <p className="text-2xl font-bold text-gray-900">{report.riskAnalysis.metrics.ltv.toFixed(1)}%</p>
              </div>
              <div className="bg-green-50/50 rounded-xl p-5 border border-green-100 print:bg-gray-50 print:border-gray-200">
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
          <div className="bg-white rounded-3xl p-8 mb-8 shadow-xl shadow-green-900/5 border border-green-100 print:shadow-none print:border-gray-200">
            <h3 className="text-xl font-bold text-[#1A202C] mb-6">Detailed Scores</h3>
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
                    description: 'Calculates total exposure ratio: LTV = (All Existing Debt + Your Deposit) / Property Value. Lower LTV means more equity cushion to protect your deposit.',
                    scoring: '100 pts: <50% • 80 pts: 50-60% • 60 pts: 60-70% • 40 pts: 70-80% • 20 pts: 80-90% • 0 pts: >90%'
                  },
                  debtScore: {
                    title: 'Debt Structure Analysis',
                    description: 'Evaluates existing debt burden. Calculation: Start at 100pts → Apply debt ratio penalty → Subtract creditor penalty.',
                    scoring: 'Debt Ratio: >70% (-50pts), 60-70% (-30pts), 50-60% (-15pts) | Creditor Penalty: -5pts each, max -20pts'
                  },
                  legalScore: {
                    title: 'Legal & Compliance Check',
                    description: 'Checks for legal issues in 등기부등본 that could jeopardize your deposit.',
                    scoring: 'Critical: Seizure/Auction -100pts | Serious: Superficies -40pts, Provisional Registration -35pts | Moderate: Shared Ownership -25pts'
                  },
                  marketScore: {
                    title: 'Market Conditions Analysis',
                    description: 'Assesses market trend with confidence-amplified impact.',
                    scoring: 'Base: 70pts | Rising: +8~25pts | Falling: -15~35pts | Low confidence: -10pts'
                  },
                  buildingScore: {
                    title: 'Building Age Assessment',
                    description: 'Evaluates building age and physical condition.',
                    scoring: '<5 yrs: 100pts • 5-10: 90pts • 10-15: 80pts • 15-20: 70pts • 20-25: 60pts • >30: 40pts'
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
                    <div className={`h-3 rounded-full overflow-hidden ${value === 0 ? 'bg-red-200 ring-2 ring-red-500 ring-offset-1' : 'bg-gray-200'}`}>
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

          {/* Debt Ranking */}
          {report.riskAnalysis.debtRanking && report.riskAnalysis.debtRanking.length > 0 && (
            <div className="bg-white rounded-3xl p-8 mb-8 shadow-xl shadow-green-900/5 border border-green-100 print:shadow-none print:border-gray-200">
              <div className="flex items-center gap-3 mb-6">
                <h3 className="text-xl font-bold text-[#1A202C]">Debt & Collateral Analysis</h3>
                <Tooltip content={
                  <div>
                    <p className="font-bold text-gray-900 mb-2">Understanding Debt Priority</p>
                    <p className="text-gray-700 mb-3">
                      In case of property auction, creditors are repaid in order of registration date.
                    </p>
                    <p className="font-semibold text-gray-900 mb-1">Priority Levels:</p>
                    <ul className="text-gray-700 mb-3 space-y-1 ml-4 list-disc">
                      <li><span className="font-semibold">Senior:</span> First mortgage - highest priority</li>
                      <li><span className="font-semibold">Junior:</span> Second mortgage - repaid after senior</li>
                      <li><span className="font-semibold">Subordinate:</span> Lower priority - higher risk</li>
                    </ul>
                    <p className="text-gray-600 mt-2 pt-2 border-t border-gray-200">
                      <span className="font-semibold text-orange-600">⚠️</span> Your deposit will rank after all registered claims.
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
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-5 border border-purple-100">
                  <p className="text-sm text-purple-700 mb-2 font-medium">Your Deposit (Proposed)</p>
                  <p className="text-2xl font-bold text-purple-900">
                    ₩{(report.property.proposedJeonse / 100000000).toFixed(1)}억
                  </p>
                </div>
                <div className={`bg-gradient-to-br rounded-xl p-5 border ${
                  report.riskAnalysis.metrics.availableEquity > 0
                    ? 'from-emerald-50 to-teal-50 border-emerald-100'
                    : 'from-red-50 to-rose-50 border-red-100'
                }`}>
                  <p className={`text-sm mb-2 font-medium ${report.riskAnalysis.metrics.availableEquity > 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                    Available Equity
                  </p>
                  <p className={`text-2xl font-bold ${report.riskAnalysis.metrics.availableEquity > 0 ? 'text-emerald-900' : 'text-red-900'}`}>
                    {report.riskAnalysis.metrics.availableEquity >= 0 ? '+' : ''}₩{(report.riskAnalysis.metrics.availableEquity / 100000000).toFixed(1)}억
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
                      <th className="text-center py-4 px-4 text-xs font-bold text-gray-700 uppercase tracking-wider">Registration Date</th>
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
                            <div className="font-medium text-sm text-gray-800">{debt.type}</div>
                            {debt.type.includes('근저당권') && (
                              <div className="text-xs text-gray-500 mt-0.5">(Mortgage)</div>
                            )}
                            {debt.type.includes('전세권') && (
                              <div className="text-xs text-gray-500 mt-0.5">(Jeonse Rights)</div>
                            )}
                            {debt.type.includes('임차권') && (
                              <div className="text-xs text-gray-500 mt-0.5">(Lease Rights)</div>
                            )}
                          </td>
                          <td className="py-5 px-4 text-center">
                            <div className={`font-bold text-xl ${isYourDeposit ? 'text-purple-900' : 'text-gray-900'}`}>
                              ₩{(debt.amount / 100000000).toFixed(1)}억
                            </div>
                          </td>
                          <td className="py-5 px-4 text-center">
                            <div className="text-gray-700 text-sm font-medium">{debt.registrationDate}</div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Risks */}
          {report.riskAnalysis.risks.length > 0 && (
            <div className="bg-white rounded-3xl p-8 mb-8 shadow-xl shadow-green-900/5 border border-green-100 print:shadow-none print:border-gray-200">
              <h3 className="text-xl font-bold text-[#1A202C] mb-6">
                Detected Risks ({report.riskAnalysis.risks.length})
              </h3>
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

          {/* Recommendations */}
          <div className="bg-white rounded-3xl p-8 mb-8 shadow-xl shadow-green-900/5 border border-green-100 print:shadow-none print:border-gray-200">
            <h3 className="text-xl font-bold text-[#1A202C] mb-6">Safety Recommendations</h3>

            {report.recommendations.mandatory.length > 0 && (
              <div className="mb-6">
                <h4 className="font-bold text-red-600 text-lg mb-4 flex items-center gap-2">
                  <span className="text-2xl">🚨</span> Mandatory Actions
                </h4>
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
                <h4 className="font-bold text-orange-600 text-lg mb-4 flex items-center gap-2">
                  <span className="text-2xl">⚠️</span> Recommended Actions
                </h4>
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
                <h4 className="font-bold text-blue-600 text-lg mb-4 flex items-center gap-2">
                  <span className="text-2xl">💡</span> Optional Actions
                </h4>
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
        </div>

        {/* ==================== PRICE CHECK SECTION ==================== */}
        {wolseResult && (
          <div className="mb-16">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shadow-green-200">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-3xl font-bold text-[#1A202C]">Rent Price Analysis</h2>
            </div>

            {/* Key Metrics */}
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white rounded-3xl p-6 text-center shadow-xl shadow-green-900/10 border border-green-200">
                <p className="text-sm text-[#718096] mb-2">Your Rent</p>
                <p className="text-3xl font-bold text-[#1A202C]">{formatWon(wolseResult.userMonthlyRent)}</p>
                <p className="text-sm text-[#718096] mt-2">
                  at {formatWon(wolseResult.userDeposit)} deposit
                </p>
              </div>

              <div className="bg-white rounded-3xl p-6 text-center shadow-xl shadow-green-900/10 border border-green-200">
                <p className="text-sm text-[#718096] mb-2">Expected Rent (Market)</p>
                <p className="text-3xl font-bold text-green-600">{formatWon(wolseResult.expectedRent ?? wolseResult.userMonthlyRent)}</p>
                <p className="text-sm text-[#718096] mt-2">
                  at {wolseResult.marketRate.toFixed(1)}% market rate
                </p>
              </div>

              <div className={`rounded-3xl p-6 text-center shadow-xl shadow-green-900/10 border ${
                (wolseResult.rentDifference ?? 0) <= 0
                  ? 'bg-emerald-50 border-emerald-200'
                  : (wolseResult.rentDifferencePercent ?? 0) <= 5
                  ? 'bg-blue-50 border-blue-200'
                  : 'bg-red-50 border-red-200'
              }`}>
                <p className="text-sm text-[#718096] mb-2">Difference</p>
                <p className={`text-3xl font-bold ${
                  (wolseResult.rentDifference ?? 0) <= 0 ? 'text-emerald-600' :
                  (wolseResult.rentDifferencePercent ?? 0) <= 5 ? 'text-blue-600' : 'text-red-600'
                }`}>
                  {(wolseResult.rentDifference ?? 0) >= 0 ? '+' : ''}{formatWon(wolseResult.rentDifference ?? 0)}
                </p>
                <p className="text-sm text-[#718096] mt-2">
                  {(wolseResult.rentDifferencePercent ?? 0) >= 0 ? '+' : ''}{(wolseResult.rentDifferencePercent ?? 0).toFixed(1)}% vs expected
                </p>
              </div>
            </div>

            {/* Market Rate Info */}
            <div className="bg-white rounded-3xl p-6 shadow-xl shadow-green-900/10 border border-green-200 mb-8">
              <div className="grid md:grid-cols-3 gap-6 text-center mb-6">
                <div>
                  <p className="text-sm text-[#718096] mb-1">Market Rate</p>
                  <p className="text-xl font-bold text-[#1A202C]">{wolseResult.marketRate.toFixed(2)}%</p>
                  <p className="text-xs text-[#A0AEC0]">Range: {wolseResult.marketRateRange.low.toFixed(1)}%-{wolseResult.marketRateRange.high.toFixed(1)}%</p>
                </div>
                <div>
                  <p className="text-sm text-[#718096] mb-1">Legal Maximum</p>
                  <p className="text-xl font-bold text-blue-600">{wolseResult.legalRate.toFixed(2)}%</p>
                  <p className="text-xs text-[#A0AEC0]">Housing Lease Protection Act</p>
                </div>
                <div>
                  <p className="text-sm text-[#718096] mb-1">Data Quality</p>
                  <p className="text-xl font-bold text-[#1A202C]">{wolseResult.confidenceLevel}</p>
                  <p className="text-xs text-[#A0AEC0]">{wolseResult.contractCount} transactions</p>
                </div>
              </div>
            </div>

            {/* Savings Potential */}
            {(wolseResult.savingsPotential.vsMarket > 0 || wolseResult.savingsPotential.vsLegal > 0) && (
              <div className="bg-gradient-to-r from-green-100 to-emerald-100 rounded-3xl p-6 border border-green-300 mb-8">
                <h3 className="text-lg font-bold text-[#1A202C] mb-4 flex items-center gap-2">
                  <span>💰</span> Potential Savings
                </h3>
                <div className="grid md:grid-cols-2 gap-6">
                  {wolseResult.savingsPotential.vsMarket > 0 && (
                    <div>
                      <p className="text-sm text-[#4A5568]">If negotiated to market rate:</p>
                      <p className="text-2xl font-bold text-green-600">
                        {formatWon(wolseResult.savingsPotential.vsMarket)}/year
                      </p>
                    </div>
                  )}
                  {wolseResult.savingsPotential.vsLegal > 0 && (
                    <div>
                      <p className="text-sm text-[#4A5568]">If negotiated to legal max:</p>
                      <p className="text-2xl font-bold text-blue-600">
                        {formatWon(wolseResult.savingsPotential.vsLegal)}/year
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Price Trend */}
            <div className="bg-white rounded-3xl p-6 shadow-xl shadow-green-900/10 border border-green-200 mb-8">
              <h3 className="text-lg font-bold text-[#1A202C] mb-4 flex items-center gap-2">
                <span>{getTrendIcon(wolseResult.trend.direction)}</span> Price Trend
              </h3>
              <p className="text-[#4A5568] leading-relaxed">{wolseResult.trend.advice}</p>
              <div className="mt-4 flex items-center gap-4 text-sm text-[#718096]">
                <span>Direction: <strong className="text-[#1A202C]">{wolseResult.trend.direction}</strong></span>
                <span>Change: <strong className="text-[#1A202C]">{wolseResult.trend.percentage.toFixed(1)}%</strong> over 12 months</span>
              </div>
            </div>

            {/* Negotiation Options */}
            {wolseResult.negotiationOptions.length > 0 && (
              <div className="mb-8">
                <h3 className="text-xl font-bold text-[#1A202C] mb-4 flex items-center gap-2">
                  <span>🤝</span> Negotiation Options
                </h3>
                <p className="text-[#4A5568] mb-4">Use these scripts when negotiating with your landlord. Click to copy.</p>

                <div className="space-y-4">
                  {wolseResult.negotiationOptions.map((option, index) => (
                    <div
                      key={index}
                      className={`bg-white rounded-3xl p-6 cursor-pointer transition-all hover:shadow-xl shadow-xl shadow-green-900/10 border ${
                        option.recommended ? 'border-2 border-green-400 bg-green-50/30' : 'border-green-200'
                      }`}
                      onClick={() => copyToClipboard(option.script, option.name)}
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h4 className="font-bold text-[#1A202C] flex items-center gap-2">
                            {option.name}
                            {option.recommended && (
                              <span className="text-xs bg-gradient-to-r from-green-500 to-emerald-600 text-white px-2 py-0.5 rounded-full">
                                Recommended
                              </span>
                            )}
                          </h4>
                          <p className="text-sm text-[#718096]">
                            Rate: {option.rate.toFixed(2)}% • Rent: {formatWon(option.monthlyRent)}/month
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-green-600">
                            Save {formatWon(option.yearlySavings)}/yr
                          </p>
                          <p className="text-sm text-[#718096]">
                            ({formatWon(option.monthlySavings)}/month)
                          </p>
                        </div>
                      </div>

                      <div className="bg-green-50 rounded-2xl p-4 text-sm text-[#4A5568] leading-relaxed border border-green-200">
                        "{option.script}"
                      </div>

                      <div className="mt-3 text-right">
                        <span className={`text-sm ${copiedScript === option.name ? 'text-green-600 font-medium' : 'text-[#A0AEC0]'}`}>
                          {copiedScript === option.name ? '✓ Copied to clipboard!' : 'Click to copy script'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Transactions */}
            {wolseResult.recentTransactions.length > 0 && (
              <div className="bg-white rounded-3xl p-6 shadow-xl shadow-green-900/10 border border-green-200">
                <h3 className="text-lg font-bold text-[#1A202C] mb-4 flex items-center gap-2">
                  <span>📊</span> Recent Transactions ({wolseResult.contractCount} contracts)
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b-2 border-green-200">
                        <th className="text-left py-3 px-3 font-semibold text-[#4A5568]">Date</th>
                        <th className="text-left py-3 px-3 font-semibold text-[#4A5568]">Area</th>
                        <th className="text-left py-3 px-3 font-semibold text-[#4A5568]">Floor</th>
                        <th className="text-right py-3 px-3 font-semibold text-[#4A5568]">Deposit</th>
                        <th className="text-right py-3 px-3 font-semibold text-[#4A5568]">Monthly Rent</th>
                      </tr>
                    </thead>
                    <tbody>
                      {wolseResult.recentTransactions.slice(0, 10).map((tx, index) => (
                        <tr key={index} className="border-b border-green-100 hover:bg-green-50/50">
                          <td className="py-3 px-3 text-[#4A5568]">
                            {tx.year}.{tx.month.toString().padStart(2, '0')}.{tx.day.toString().padStart(2, '0')}
                          </td>
                          <td className="py-3 px-3 text-[#4A5568]">{tx.exclusiveArea.toFixed(1)}㎡</td>
                          <td className="py-3 px-3 text-[#4A5568]">{tx.floor}F</td>
                          <td className="py-3 px-3 text-right text-[#1A202C] font-medium">
                            {formatWon(tx.deposit)}
                          </td>
                          <td className="py-3 px-3 text-right text-[#1A202C] font-medium">
                            {formatWon(tx.monthlyRent)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8 print:hidden">
          <Link href="/check" className="flex-1">
            <button className="w-full px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold text-lg rounded-2xl hover:shadow-xl hover:shadow-green-200/50 transition-all hover:-translate-y-1">
              Start new analysis
            </button>
          </Link>
          <button
            onClick={() => window.print()}
            className="flex-1 px-8 py-4 bg-white border-2 border-green-200 text-[#4A5568] font-semibold text-lg rounded-2xl hover:bg-green-50 transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Save as PDF
          </button>
        </div>

        {/* Disclaimer */}
        <div className="bg-green-50 rounded-2xl p-6 border border-green-200 print:bg-gray-100 print:border-gray-200">
          <p className="font-bold text-gray-900 mb-2">Disclaimer</p>
          <div className="space-y-2 text-sm text-gray-600 leading-relaxed">
            <p>
              This analysis is for informational purposes only and is not legal advice or investment counsel.
              Please consult with professionals before making important decisions.
            </p>
            <p>
              <span className="font-semibold text-gray-900">Deposit Safety:</span> Based on the Housing Lease Protection Act Enforcement Decree (effective March 1, 2025).
              Mortgage debt estimates are based on 채권최고액 (Maximum Secured Amount) divided by 1.2 to approximate the actual principal.
            </p>
            <p>
              <span className="font-semibold text-gray-900">Rent Price Check:</span> Based on {wolseResult?.contractCount || 0} recent transactions.
              Market rates may vary. This is for reference only.
            </p>
          </div>
        </div>
      </div>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          .print\\:hidden { display: none !important; }
          @page { size: A4; margin: 1.5cm; }
          body { background: white !important; }
        }
      `}</style>
    </div>
  );
}
