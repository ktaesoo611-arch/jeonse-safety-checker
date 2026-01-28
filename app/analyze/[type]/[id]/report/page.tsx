'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, notFound } from 'next/navigation';
import Link from 'next/link';
import {
  ReportHero,
  RiskAnalysisSection,
  MarketPositionSection,
  ActionItemsSection,
  TierEstimatesSection
} from '@/components/report';
import { generateVerdict as generateVerdictFromScores, type RiskLevel } from '@/lib/utils/scoring';

interface RecalculatedScores {
  ltvScore: number;
  overallScore: number;
  riskLevel: RiskLevel;
  ltv: number;
  equity: number;
  propertyValue: number;
}

export default function ReportPage() {
  const params = useParams();
  const type = params.type as string;
  const analysisId = params.id as string;

  if (type !== 'jeonse' && type !== 'wolse') {
    notFound();
  }

  const isWolse = type === 'wolse';

  // Try to load from sessionStorage first (cached by preview page for instant load)
  const [reportData, setReportData] = useState<any>(() => {
    if (typeof window !== 'undefined') {
      const cached = sessionStorage.getItem(`report-${analysisId}`);
      if (cached) {
        sessionStorage.removeItem(`report-${analysisId}`);
        const parsed = JSON.parse(cached);
        console.log('[Report] Loaded from cache:', {
          hasWolseAnalysis: !!parsed.wolseAnalysis,
          wolseAnalysisKeys: parsed.wolseAnalysis ? Object.keys(parsed.wolseAnalysis) : [],
          recentTransactions: parsed.wolseAnalysis?.recentTransactions?.length || 0
        });
        return parsed;
      }
    }
    return null;
  });
  const [isLoading, setIsLoading] = useState(!reportData);
  const [error, setError] = useState<string | null>(null);
  // Selected tier for LTV calculation - load from sessionStorage or default to 'mid'
  const [selectedTier, setSelectedTier] = useState<'budget' | 'standard' | 'mid' | 'premium'>(() => {
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem(`tier-${analysisId}`);
      if (saved && ['budget', 'standard', 'mid', 'premium'].includes(saved)) {
        return saved as 'budget' | 'standard' | 'mid' | 'premium';
      }
    }
    return 'mid';
  });
  // Recalculated scores based on tier selection
  const [recalculatedScores, setRecalculatedScores] = useState<RecalculatedScores | null>(null);

  // Persist tier selection to sessionStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(`tier-${analysisId}`, selectedTier);
    }
  }, [selectedTier, analysisId]);

  // Handle scores recalculation from RiskAnalysisSection
  const handleScoresRecalculated = useCallback((scores: RecalculatedScores) => {
    setRecalculatedScores(scores);
  }, []);

  useEffect(() => {
    // Skip fetch if we have cached data
    if (reportData) {
      console.log('[Report] Using cached data from sessionStorage');
      return;
    }

    let retryCount = 0;
    const maxRetries = 2;

    async function fetchReport() {
      try {
        const response = await fetch(`/api/analysis/report/${analysisId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch report');
        }
        const data = await response.json();

        // For wolse reports, check if recentTransactions is loaded
        // If not, retry after a short delay (race condition with database)
        if (isWolse && data.wolseAnalysis) {
          const hasTransactions = data.wolseAnalysis.recentTransactions?.length > 0;
          const hasMarketData = data.wolseAnalysis.contractCount > 0;

          if (!hasTransactions && hasMarketData && retryCount < maxRetries) {
            console.log(`[Report] Wolse data incomplete, retrying... (${retryCount + 1}/${maxRetries})`);
            retryCount++;
            setTimeout(fetchReport, 500); // Retry after 500ms
            return;
          }
        }

        setReportData(data);
        setIsLoading(false);
      } catch (err) {
        console.error('Error fetching report:', err);
        setError('Failed to load report. Please try again.');
        setIsLoading(false);
      }
    }

    fetchReport();
  }, [analysisId, isWolse, reportData]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-amber-200 border-t-amber-500 rounded-full animate-spin mx-auto mb-6" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Loading Report</h2>
          <p className="text-gray-600">Please wait...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Error Loading Report</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <Link href="/dashboard" className="inline-flex items-center gap-2 px-6 py-3 bg-amber-500 text-white font-semibold rounded-xl hover:bg-amber-600 transition-colors">
            Go to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // Transform API data to component props
  // API structure: { property, riskAnalysis, recommendations, summary, ... }
  const property = reportData?.property || {};
  const riskAnalysis = reportData?.riskAnalysis || {};
  const summary = reportData?.summary || {};
  const valuation = property?.valuation || {};
  const wolseAnalysis = reportData?.wolseAnalysis || {};
  const jeonseAnalysis = reportData?.jeonseAnalysis || null;

  // Debug: log wolseAnalysis data
  console.log('[Report] wolseAnalysis from reportData:', {
    hasData: Object.keys(wolseAnalysis).length > 0,
    userDeposit: wolseAnalysis?.userDeposit,
    userMonthlyRent: wolseAnalysis?.userMonthlyRent,
    recentTransactions: wolseAnalysis?.recentTransactions?.length,
    contractCount: wolseAnalysis?.contractCount
  });

  // Get selected tier label for display
  const selectedTierData = valuation?.tierEstimates?.find((t: any) => t.tier === selectedTier);
  const selectedTierLabel = selectedTierData?.label || null;

  // Generate dynamic verdict based on recalculated scores
  const dynamicVerdict = recalculatedScores
    ? generateVerdictFromScores(recalculatedScores.riskLevel, recalculatedScores.overallScore)
    : riskAnalysis?.verdict || summary?.verdict || generateVerdict(reportData);

  const heroProps = {
    address: property?.address || 'Address not available',
    buildingNumber: property?.buildingNumber || null,
    unit: property?.unit || null,
    area: property?.area || null,
    riskLevel: (riskAnalysis?.riskLevel || summary?.riskLevel || 'UNKNOWN') as 'SAFE' | 'MODERATE' | 'HIGH' | 'CRITICAL' | 'UNKNOWN',
    safetyScore: riskAnalysis?.overallScore || summary?.safetyScore || 0,
    deposit: property?.proposedJeonse || wolseAnalysis?.userDeposit || 0,
    monthlyRent: isWolse ? (wolseAnalysis?.userMonthlyRent || reportData?.monthlyRent || undefined) : undefined,
    estimatedValue: property?.estimatedValue || valuation?.valueMid || null,
    verdict: dynamicVerdict,
    reportDate: new Date(reportData?.completedAt || reportData?.generatedAt || Date.now()).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }),
    reportType: type as 'jeonse' | 'wolse',
    // Override values for tier-based recalculation
    overrideSafetyScore: recalculatedScores?.overallScore,
    overrideRiskLevel: recalculatedScores?.riskLevel,
    overrideEstimatedValue: recalculatedScores?.propertyValue,
    selectedTierLabel: selectedTierLabel,
  };

  const riskProps = {
    scores: {
      ltvScore: riskAnalysis?.scores?.ltvScore || 0,
      debtScore: riskAnalysis?.scores?.debtScore || 0,
      legalScore: riskAnalysis?.scores?.legalScore || 0,
      marketScore: riskAnalysis?.scores?.marketScore || 0,
      buildingScore: riskAnalysis?.scores?.buildingScore || 0,
    },
    metrics: {
      ltv: riskAnalysis?.metrics?.ltv || 0,
      ltvRange: riskAnalysis?.metrics?.ltvRange || null,
      totalDebt: riskAnalysis?.metrics?.totalDebt || 0,
      availableEquity: riskAnalysis?.metrics?.availableEquity || 0,
      debtCount: riskAnalysis?.metrics?.debtCount || 0,
    },
    tierEstimates: valuation?.tierEstimates || null,
    debtRanking: riskAnalysis?.debtRanking || [],
    smallAmountPriority: riskAnalysis?.smallAmountPriority || null,
    risks: riskAnalysis?.risks || [],
    proposedDeposit: property?.proposedJeonse || wolseAnalysis?.userDeposit || 0,
    estimatedValue: property?.estimatedValue || valuation?.valueMid || null,
    reportType: type as 'jeonse' | 'wolse',
  };

  const marketProps = {
    reportType: type as 'jeonse' | 'wolse',
    jeonseData: !isWolse ? {
      marketTrend: valuation?.marketTrend || 'stable',
      confidence: valuation?.confidence || null,
      valueLow: valuation?.valueLow || null,
      valueMid: valuation?.valueMid || null,
      valueHigh: valuation?.valueHigh || null,
      proposedJeonse: property?.proposedJeonse || 0,
      estimatedValue: property?.estimatedValue || valuation?.valueMid || null,
      // New jeonse analysis data
      expectedJeonse: jeonseAnalysis?.expectedJeonse || null,
      jeonseDifference: jeonseAnalysis?.jeonseDifference || null,
      jeonseDifferencePercent: jeonseAnalysis?.jeonseDifferencePercent || null,
      assessment: jeonseAnalysis?.assessment || null,
      assessmentDetails: jeonseAnalysis?.assessmentDetails || null,
      potentialSavings: jeonseAnalysis?.potentialSavings || 0,
      trend: jeonseAnalysis?.trend || null,
      transactionData: jeonseAnalysis?.transactionData || [],
      regressionLine: jeonseAnalysis?.regressionLine || null,
      contractCount: jeonseAnalysis?.contractCount || 0,
    } : undefined,
    wolseData: isWolse ? {
      userDeposit: wolseAnalysis?.userDeposit || property?.proposedJeonse || 0,
      userMonthlyRent: wolseAnalysis?.userMonthlyRent || reportData?.monthlyRent || 0,
      userRate: wolseAnalysis?.userRate || 0,
      marketRate: wolseAnalysis?.marketRate || 0,
      marketRateRange: wolseAnalysis?.marketRateRange || { low: 0, high: 0 },
      legalRate: wolseAnalysis?.legalRate || 4.5,
      expectedRent: wolseAnalysis?.expectedRent || 0,
      rentDifference: wolseAnalysis?.rentDifference || 0,
      rentDifferencePercent: wolseAnalysis?.rentDifferencePercent || 0,
      assessment: wolseAnalysis?.assessment || 'FAIR',
      assessmentDetails: wolseAnalysis?.assessmentDetails,
      contractCount: wolseAnalysis?.contractCount || 0,
      confidenceLevel: wolseAnalysis?.confidenceLevel,
      savingsPotential: wolseAnalysis?.savingsPotential || { vsMarket: 0, vsLegal: 0 },
      trend: wolseAnalysis?.trend,
      recentTransactions: wolseAnalysis?.recentTransactions,
      // Tiered expected rent for multifamily
      tieredExpectedRent: wolseAnalysis?.tieredExpectedRent,
      selectedTierExpectedRent: wolseAnalysis?.selectedTierExpectedRent,
    } : undefined,
  };

  const actionProps = {
    reportType: type as 'jeonse' | 'wolse',
    recommendations: reportData?.recommendations || {
      mandatory: [],
      recommended: [],
      optional: [],
    },
    negotiationOptions: isWolse ? wolseAnalysis?.negotiationOptions : undefined,
    rentDifference: isWolse ? wolseAnalysis?.rentDifference : undefined,
    marketRate: isWolse ? wolseAnalysis?.marketRate : undefined,
    userRate: isWolse ? wolseAnalysis?.userRate : undefined,
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#FDFBF7]/80 backdrop-blur-md border-b border-amber-100 print:hidden">
        <div className="container mx-auto px-6 py-4 max-w-7xl flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className={`w-10 h-10 bg-gradient-to-br ${isWolse ? 'from-orange-500 to-amber-600' : 'from-amber-500 to-orange-600'} rounded-xl flex items-center justify-center shadow-lg`}>
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <span className="text-xl font-semibold text-[#2D3748]">K-Rent Safety</span>
          </Link>
          <div className="flex items-center gap-4">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-medium"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print
            </button>
            <Link
              href="/dashboard"
              className={`flex items-center gap-2 px-4 py-2 bg-gradient-to-r ${isWolse ? 'from-orange-500 to-amber-500' : 'from-amber-500 to-orange-500'} text-white rounded-xl hover:shadow-lg transition-all font-medium`}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              Dashboard
            </Link>
          </div>
        </div>
      </header>

      {/* Report Content */}
      <div className="container mx-auto px-6 py-8 max-w-4xl">
        <ReportHero {...heroProps} />
        {/* Tier Estimates Section - Only show for multifamily properties with tier data */}
        {valuation?.tierEstimates && valuation.tierEstimates.length > 0 && (
          <TierEstimatesSection
            tierEstimates={valuation.tierEstimates}
            tierGuidance={valuation.tierGuidance || null}
            valueMid={valuation.valueMid || null}
            selectedTier={selectedTier}
            onTierSelect={setSelectedTier}
          />
        )}
        <RiskAnalysisSection
          {...riskProps}
          selectedTier={selectedTier}
          onScoresRecalculated={handleScoresRecalculated}
        />
        <MarketPositionSection {...marketProps} selectedTier={selectedTier} />
        <ActionItemsSection {...actionProps} />

        {/* New Analysis Button */}
        <div className="mt-12 flex justify-center print:hidden">
          <Link
            href={`/analyze/${type}`}
            className={`flex items-center gap-3 px-8 py-4 bg-gradient-to-r ${isWolse ? 'from-orange-500 to-amber-500' : 'from-amber-500 to-orange-500'} text-white rounded-2xl hover:shadow-xl hover:scale-105 transition-all font-semibold text-lg`}
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New {isWolse ? 'Wolse' : 'Jeonse'} Analysis
          </Link>
        </div>

        {/* Footer */}
        <div className="mt-12 pt-8 border-t border-gray-200 text-center text-sm text-gray-500 print:mt-8">
          <p>Report generated by K-Rent Safety</p>
          <p className="mt-1">This report is for informational purposes only and does not constitute legal or financial advice.</p>
        </div>
      </div>
    </div>
  );
}

// Helper function to generate verdict based on risk level
function generateVerdict(data: any): string {
  const riskLevel = data?.riskAnalysis?.riskLevel || data?.summary?.riskLevel || 'MODERATE';
  const safetyScore = data?.riskAnalysis?.overallScore || data?.summary?.safetyScore || 50;

  switch (riskLevel) {
    case 'SAFE':
      return `Your deposit safety analysis shows a score of ${safetyScore}/100, indicating low risk. The property appears to have adequate equity and no significant legal issues. You may proceed with caution while following our recommended actions.`;
    case 'MODERATE':
      return `Your deposit safety analysis shows a score of ${safetyScore}/100, indicating moderate risk. There are some factors to consider before proceeding. Review the detailed breakdown below for specific concerns and recommendations.`;
    case 'HIGH':
      return `Your deposit safety analysis shows a score of ${safetyScore}/100, indicating elevated risk. We recommend carefully reviewing the risk factors below and considering alternatives before proceeding with this property.`;
    case 'CRITICAL':
      return `Your deposit safety analysis shows a score of ${safetyScore}/100, indicating critical risk. We strongly recommend reconsidering this property due to significant safety concerns identified in the analysis.`;
    default:
      return `Your deposit safety analysis is complete. Review the detailed breakdown below for a comprehensive understanding of your rental situation.`;
  }
}
