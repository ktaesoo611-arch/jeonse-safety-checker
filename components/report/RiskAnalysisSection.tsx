'use client';

import React from 'react';
import Tooltip from '@/components/Tooltip';
import {
  calculateLtvScore,
  calculateOverallScore,
  determineRiskLevel,
  type RiskLevel,
} from '@/lib/utils/scoring';

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

interface LTVRange {
  conservative: number;
  moderate: number;
  optimistic: number;
  conservativeLabel: string;
  optimisticLabel: string;
}

interface TierEstimate {
  tier: string;
  label: string;
  value: number;
  unitPrice: number;
}

type TierKey = 'budget' | 'standard' | 'mid' | 'premium';

interface RecalculatedScores {
  ltvScore: number;
  overallScore: number;
  riskLevel: RiskLevel;
  ltv: number;
  equity: number;
  propertyValue: number;
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
    ltvRange?: LTVRange | null;
    totalDebt: number;
    availableEquity: number;
    debtCount: number;
  };
  tierEstimates?: TierEstimate[] | null;
  selectedTier?: TierKey;
  onScoresRecalculated?: (scores: RecalculatedScores) => void;
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
  tierEstimates,
  selectedTier = 'mid',
  onScoresRecalculated,
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

  // Calculate property value and LTV based on selected tier (if tier estimates available)
  const selectedTierData = tierEstimates?.find(t => t.tier === selectedTier);
  const displayPropertyValue = selectedTierData?.value || estimatedValue || 0;

  // Calculate LTV based on selected tier value
  const calculatedLtv = displayPropertyValue > 0
    ? ((metrics.totalDebt + proposedDeposit) / displayPropertyValue) * 100
    : metrics.ltv;

  // Calculate available equity based on selected tier
  const calculatedEquity = displayPropertyValue - metrics.totalDebt - proposedDeposit;

  // Recalculate scores based on selected tier
  const recalculatedLtvScore = calculateLtvScore(calculatedLtv);

  // Filter out property-value-dependent risks and regenerate them based on tier selection
  const valueBasedRiskTypes = ['critical_ltv', 'high_ltv', 'elevated_ltv', 'high_deposit_ratio', 'high_debt'];
  const nonValueBasedRisks = risks.filter(r => !valueBasedRiskTypes.includes(r.type));

  // Generate dynamic LTV risk based on calculated LTV
  const dynamicLtvRisk: RiskItem | null = (() => {
    const ltvRatio = calculatedLtv / 100;
    if (ltvRatio > 0.80) {
      return {
        type: 'critical_ltv',
        severity: 'CRITICAL',
        description: `LTV is ${calculatedLtv.toFixed(1)}%, exceeding the safe limit of 80%. In foreclosure, you likely won't recover your deposit.`,
        category: 'debt' as const,
      };
    } else if (ltvRatio > 0.70) {
      return {
        type: 'high_ltv',
        severity: 'HIGH',
        description: `LTV is ${calculatedLtv.toFixed(1)}%, above the recommended 70% threshold. Your deposit has limited protection in foreclosure.`,
        category: 'debt' as const,
      };
    } else if (ltvRatio > 0.60) {
      return {
        type: 'elevated_ltv',
        severity: 'MEDIUM',
        description: `LTV is ${calculatedLtv.toFixed(1)}%. While acceptable, it's above the ideal 60% threshold.`,
        category: 'debt' as const,
      };
    }
    return null;
  })();

  // Generate dynamic deposit ratio risk based on selected tier's property value
  const dynamicDepositRatioRisk: RiskItem | null = (() => {
    if (displayPropertyValue <= 0) return null;
    const depositRatio = proposedDeposit / displayPropertyValue;
    if (depositRatio > 0.70) {
      return {
        type: 'high_deposit_ratio',
        severity: 'MEDIUM',
        description: `Your deposit is ${(depositRatio * 100).toFixed(1)}% of property value. Recommended maximum is 70%.`,
        category: 'debt' as const,
      };
    }
    return null;
  })();

  // Generate dynamic high debt risk based on selected tier's property value
  const dynamicHighDebtRisk: RiskItem | null = (() => {
    if (displayPropertyValue <= 0 || metrics.totalDebt <= 0) return null;
    const debtRatio = (metrics.totalDebt / displayPropertyValue) * 100;
    if (debtRatio > 70) {
      return {
        type: 'high_debt',
        severity: 'HIGH',
        description: `Existing debt is ${formatAmount(metrics.totalDebt)} (${debtRatio.toFixed(1)}% of property value). High risk of foreclosure.`,
        category: 'debt' as const,
      };
    } else if (debtRatio > 50) {
      return {
        type: 'high_debt',
        severity: 'MEDIUM',
        description: `Existing debt is ${formatAmount(metrics.totalDebt)} (${debtRatio.toFixed(1)}% of property value). Moderate debt level.`,
        category: 'debt' as const,
      };
    }
    return null;
  })();

  // Combine non-value-based risks with dynamic risks
  const displayRisks = [
    ...nonValueBasedRisks,
    ...(dynamicLtvRisk ? [dynamicLtvRisk] : []),
    ...(dynamicDepositRatioRisk ? [dynamicDepositRatioRisk] : []),
    ...(dynamicHighDebtRisk ? [dynamicHighDebtRisk] : []),
  ];

  // Recalculate overall score and risk level using the updated risks
  const recalculatedOverallScore = calculateOverallScore(
    recalculatedLtvScore,
    scores.legalScore,
    scores.marketScore,
    scores.buildingScore
  );
  const recalculatedRiskLevel = determineRiskLevel(recalculatedOverallScore, displayRisks);

  // Notify parent of recalculated scores - always notify when tier estimates exist
  React.useEffect(() => {
    if (onScoresRecalculated && tierEstimates && tierEstimates.length > 0) {
      onScoresRecalculated({
        ltvScore: recalculatedLtvScore,
        overallScore: recalculatedOverallScore,
        riskLevel: recalculatedRiskLevel,
        ltv: calculatedLtv,
        equity: calculatedEquity,
        propertyValue: displayPropertyValue,
      });
    }
  }, [selectedTier, tierEstimates, onScoresRecalculated, recalculatedLtvScore, recalculatedOverallScore, recalculatedRiskLevel, calculatedLtv, calculatedEquity, displayPropertyValue]);

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

  // Filter out debtScore from display and use recalculated LTV score
  const displayScores = Object.entries(scores)
    .filter(([key]) => key !== 'debtScore')
    .map(([key, value]) => {
      // Replace ltvScore with recalculated value based on selected tier
      if (key === 'ltvScore' && tierEstimates && tierEstimates.length > 0) {
        return [key, recalculatedLtvScore] as [string, number];
      }
      return [key, value] as [string, number];
    });

  return (
    <div className="mb-12">
      {/* Section Header */}
      <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-8 flex items-center gap-3">
        <span className="text-3xl">🛡️</span>
        Risk Analysis
      </h2>

      {/* Horizontal Metrics Bar */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 mb-6 shadow-sm border border-gray-100">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-4">
          {/* LTV */}
          <div className="text-center p-4 sm:p-5 rounded-xl bg-gray-50 border border-gray-100 hover:bg-white hover:shadow-md hover:border-gray-200 transition-all duration-200 cursor-default">
            <div className="flex items-center justify-center gap-1.5 mb-2">
              <p className="text-xs sm:text-sm text-gray-600 font-medium">LTV</p>
              <Tooltip content={
                <div>
                  <p className="font-bold text-gray-900 mb-1">Loan-to-Value Ratio</p>
                  <p className="text-gray-700 text-sm">Total debt + your deposit divided by property value. Lower is safer.</p>
                  {selectedTierData && (
                    <div className="mt-2 pt-2 border-t border-gray-200">
                      <p className="text-gray-900 font-semibold text-xs mb-1">Current tier: {selectedTierData.label}</p>
                      <p className="text-gray-600 text-xs">Property value: ₩{(selectedTierData.value / 100000000).toFixed(2)}억</p>
                    </div>
                  )}
                  {metrics.ltvRange && (
                    <div className="mt-2 pt-2 border-t border-gray-200">
                      <p className="text-gray-900 font-semibold text-xs mb-1">LTV Range (by tier):</p>
                      <p className="text-gray-600 text-xs">Conservative: {metrics.ltvRange.conservative.toFixed(0)}%</p>
                      <p className="text-gray-600 text-xs">Moderate: {metrics.ltvRange.moderate.toFixed(0)}%</p>
                      <p className="text-gray-600 text-xs">Optimistic: {metrics.ltvRange.optimistic.toFixed(0)}%</p>
                    </div>
                  )}
                  <p className="text-gray-500 text-xs mt-2">&lt;60% Safe | 60-70% OK | 70-80% Risky | &gt;80% Danger</p>
                </div>
              }>
                <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </Tooltip>
            </div>
            <p className={`text-2xl sm:text-3xl font-bold ${
              calculatedLtv > 80 ? 'text-red-600' :
              calculatedLtv > 70 ? 'text-orange-600' :
              calculatedLtv > 60 ? 'text-amber-600' : 'text-emerald-600'
            }`}>
              {calculatedLtv.toFixed(0)}%
            </p>
            {/* Tier indicator */}
            {selectedTierData && (
              <p className="text-xs text-gray-500 mt-1">
                {selectedTierData.label}
              </p>
            )}
            {/* LTV Range indicator - only show if no tier selection */}
            {!selectedTierData && metrics.ltvRange && (
              <p className="text-xs text-gray-500 mt-1">
                {metrics.ltvRange.optimistic.toFixed(0)}% ~ {metrics.ltvRange.conservative.toFixed(0)}%
              </p>
            )}
            <div className="w-full h-2 bg-gray-200 rounded-full mt-3 overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  calculatedLtv > 80 ? 'bg-red-500' :
                  calculatedLtv > 70 ? 'bg-orange-500' :
                  calculatedLtv > 60 ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(calculatedLtv, 100)}%` }}
              />
            </div>
          </div>

          {/* Legal */}
          {(() => {
            // Count legal issues but exclude existing tenant claims (jeonse/lease rights)
            // Those are separate tenant rights, not legal problems like seizures/auctions
            const tenantClaimTypes = ['existing_jeonse', 'existing_lease', 'existing_jeonse_lease'];
            const legalIssueCount = risks.filter(r =>
              r.category === 'legal' && !tenantClaimTypes.includes(r.type)
            ).length;
            return (
              <div className="text-center p-4 sm:p-5 rounded-xl bg-gray-50 border border-gray-100 hover:bg-white hover:shadow-md hover:border-gray-200 transition-all duration-200 cursor-default">
                <div className="flex items-center justify-center gap-1.5 mb-2">
                  <p className="text-xs sm:text-sm text-gray-600 font-medium">Legal</p>
                  <Tooltip content={
                    <div>
                      <p className="font-bold text-gray-900 mb-1">Legal Issues</p>
                      <p className="text-gray-700 text-sm">Problems found in 등기부등본: seizures, auctions, liens, provisional registrations, etc.</p>
                      <p className="text-gray-500 text-xs mt-2">0 = Clean | 1-2 = Review needed | 3+ = High risk</p>
                    </div>
                  }>
                    <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </Tooltip>
                </div>
                <p className={`text-2xl sm:text-3xl font-bold ${
                  legalIssueCount === 0 ? 'text-emerald-600' :
                  legalIssueCount <= 2 ? 'text-amber-600' : 'text-red-600'
                }`}>
                  {legalIssueCount === 0 ? '✓' : legalIssueCount}
                </p>
                <p className={`text-sm sm:text-base mt-2 font-medium ${
                  legalIssueCount === 0 ? 'text-emerald-600' :
                  legalIssueCount <= 2 ? 'text-amber-600' : 'text-red-600'
                }`}>
                  {legalIssueCount === 0 ? 'Clean' : `Issue${legalIssueCount > 1 ? 's' : ''}`}
                </p>
              </div>
            );
          })()}

          {/* Building */}
          <div className="text-center p-4 sm:p-5 rounded-xl bg-gray-50 border border-gray-100 hover:bg-white hover:shadow-md hover:border-gray-200 transition-all duration-200 cursor-default">
            <div className="flex items-center justify-center gap-1.5 mb-2">
              <p className="text-xs sm:text-sm text-gray-600 font-medium">Building</p>
              <Tooltip content={
                <div>
                  <p className="font-bold text-gray-900 mb-1">Building Age Score</p>
                  <p className="text-gray-700 text-sm">Based on building age. Older buildings have higher maintenance costs and lower resale value.</p>
                  <p className="text-gray-500 text-xs mt-2">&lt;15yr = Good | 15-25yr = Fair | &gt;25yr = Old</p>
                </div>
              }>
                <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </Tooltip>
            </div>
            <p className={`text-2xl sm:text-3xl font-bold ${
              scores.buildingScore >= 80 ? 'text-emerald-600' :
              scores.buildingScore >= 60 ? 'text-amber-600' : 'text-orange-600'
            }`}>
              {scores.buildingScore >= 80 ? '✓' : scores.buildingScore}
            </p>
            <p className={`text-sm sm:text-base mt-2 font-medium ${
              scores.buildingScore >= 80 ? 'text-emerald-600' :
              scores.buildingScore >= 60 ? 'text-amber-600' : 'text-orange-600'
            }`}>
              {scores.buildingScore >= 80 ? 'Good' :
               scores.buildingScore >= 60 ? 'Fair' : 'Old'}
            </p>
          </div>

          {/* Debt Rank */}
          <div className="text-center p-4 sm:p-5 rounded-xl bg-gray-50 border border-gray-100 hover:bg-white hover:shadow-md hover:border-gray-200 transition-all duration-200 cursor-default">
            <div className="flex items-center justify-center gap-1.5 mb-2">
              <p className="text-xs sm:text-sm text-gray-600 font-medium">Debt Rank</p>
              <Tooltip content={
                <div>
                  <p className="font-bold text-gray-900 mb-1">Your Repayment Priority</p>
                  <p className="text-gray-700 text-sm">Your position in the repayment queue if the property is auctioned. Lower rank = paid first.</p>
                  <p className="text-gray-500 text-xs mt-2">#1 = First priority | Higher # = More risk</p>
                </div>
              }>
                <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </Tooltip>
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-gray-900">
              #{debtRanking?.find(d => d.type.includes('Your Deposit'))?.rank ||
                debtRanking?.length || 1}
            </p>
            <p className="text-sm sm:text-base mt-2 font-medium text-gray-500">Last</p>
          </div>

          {/* Small Amount Priority */}
          <div className="text-center p-4 sm:p-5 rounded-xl bg-gray-50 border border-gray-100 hover:bg-white hover:shadow-md hover:border-gray-200 transition-all duration-200 cursor-default col-span-2 sm:col-span-1">
            <div className="flex items-center justify-center gap-1.5 mb-2">
              <p className="text-xs sm:text-sm text-gray-600 font-medium">Priority</p>
              <Tooltip content={
                <div>
                  <p className="font-bold text-gray-900 mb-1">소액임차인 최우선변제</p>
                  <p className="text-gray-700 text-sm">If your deposit is below the regional threshold, you get priority repayment even before bank mortgages.</p>
                  <p className="text-gray-500 text-xs mt-2">Seoul: ≤₩1.65억 | 수도권: ≤₩1.45억</p>
                </div>
              }>
                <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </Tooltip>
            </div>
            <p className={`text-2xl sm:text-3xl font-bold ${
              smallAmountPriority?.isEligible ? 'text-emerald-600' : 'text-gray-400'
            }`}>
              {smallAmountPriority?.isEligible ? '✓' : '—'}
            </p>
            <p className={`text-sm sm:text-base mt-2 font-medium ${
              smallAmountPriority?.isEligible ? 'text-emerald-600' : 'text-gray-400'
            }`}>
              {smallAmountPriority?.isEligible ? 'Eligible' : 'Not Eligible'}
            </p>
          </div>
        </div>
      </div>

      {/* Detailed Scores with Progress Bars */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 mb-6 shadow-sm border border-gray-100">
        <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-6">Detailed Scores</h3>
        <div className="space-y-6">
          {displayScores.map(([key, value]) => {
            const scoreInfo = scoreDescriptions[key];
            if (!scoreInfo) return null;

            return (
              <div key={key}>
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm sm:text-base text-gray-900">{scoreLabels[key]}</span>
                    <Tooltip content={
                      <div>
                        <p className="font-bold text-gray-900 mb-2">{scoreInfo.title}</p>
                        <p className="text-gray-700 mb-3">{scoreInfo.description}</p>
                        <p className="font-semibold text-gray-900 mb-1">Scoring:</p>
                        <p className="text-gray-600 text-xs">{scoreInfo.scoring}</p>
                      </div>
                    }>
                      <svg className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                    </Tooltip>
                  </div>
                  <span className="font-bold text-base sm:text-lg text-gray-900">{value}/100</span>
                </div>
                <div className="h-3 sm:h-4 rounded-full overflow-hidden print-progress-bar bg-gray-200">
                  {value > 0 && (
                    <div
                      className={`h-full bg-gradient-to-r transition-all duration-500 print-progress-fill ${
                        value >= 75 ? 'from-emerald-500 to-teal-500' :
                        value >= 50 ? 'from-yellow-500 to-orange-400' :
                        value >= 25 ? 'from-orange-500 to-red-500' :
                        'from-red-600 to-rose-600'
                      }`}
                      style={{ width: `${value}%` }}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Debt & Priority Analysis */}
      {debtRanking && debtRanking.length > 0 && (
        <div className="bg-white rounded-2xl p-4 sm:p-6 mb-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-6">
            <h3 className="text-lg sm:text-xl font-bold text-gray-900">Debt & Priority Analysis</h3>
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6">
            <div className="p-4 sm:p-5 rounded-xl bg-blue-50 border border-blue-100 hover:bg-blue-100 hover:shadow-md transition-all duration-200">
              <p className="text-sm sm:text-base text-blue-600 font-medium mb-1">Total Debt</p>
              <p className="text-xl sm:text-2xl font-bold text-blue-900">{formatAmount(metrics.totalDebt)}</p>
            </div>
            <div className="p-4 sm:p-5 rounded-xl bg-purple-50 border border-purple-100 hover:bg-purple-100 hover:shadow-md transition-all duration-200">
              <p className="text-sm sm:text-base text-purple-600 font-medium mb-1">Your Deposit</p>
              <p className="text-xl sm:text-2xl font-bold text-purple-900">{formatAmount(proposedDeposit)}</p>
            </div>
            <div className={`p-4 sm:p-5 rounded-xl transition-all duration-200 ${
              calculatedEquity > 0
                ? 'bg-emerald-50 border border-emerald-100 hover:bg-emerald-100 hover:shadow-md'
                : 'bg-red-50 border border-red-100 hover:bg-red-100 hover:shadow-md'
            }`}>
              <p className={`text-sm sm:text-base font-medium ${calculatedEquity > 0 ? 'text-emerald-600' : 'text-red-600'} mb-1`}>
                Available Equity
              </p>
              <p className={`text-xl sm:text-2xl font-bold ${calculatedEquity > 0 ? 'text-emerald-900' : 'text-red-900'}`}>
                {calculatedEquity >= 0 ? '+' : ''}{formatAmount(calculatedEquity)}
              </p>
            </div>
          </div>

          {/* Debt Ranking Table */}
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <table className="w-full text-sm sm:text-base min-w-[500px]">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-center py-3 sm:py-4 px-2 sm:px-3 text-xs sm:text-sm font-semibold text-gray-500 uppercase">Rank</th>
                  <th className="text-center py-3 sm:py-4 px-2 sm:px-3 text-xs sm:text-sm font-semibold text-gray-500 uppercase">Priority</th>
                  <th className="text-left py-3 sm:py-4 px-2 sm:px-3 text-xs sm:text-sm font-semibold text-gray-500 uppercase">Type</th>
                  <th className="text-right py-3 sm:py-4 px-2 sm:px-3 text-xs sm:text-sm font-semibold text-gray-500 uppercase">Amount</th>
                  <th className="text-right py-3 sm:py-4 px-2 sm:px-3 text-xs sm:text-sm font-semibold text-gray-500 uppercase">Date</th>
                </tr>
              </thead>
              <tbody>
                {debtRanking.map((debt, index) => {
                  const isYourDeposit = debt.type.includes('Your Deposit');
                  return (
                    <tr key={index} className={`border-b border-gray-100 transition-colors duration-150 ${isYourDeposit ? 'bg-purple-50 hover:bg-purple-100' : 'hover:bg-gray-50'}`}>
                      <td className="py-4 sm:py-5 px-2 sm:px-3 text-center">
                        <span className="inline-flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gray-800 text-white text-sm sm:text-base font-bold">
                          {debt.rank}
                        </span>
                      </td>
                      <td className="py-4 sm:py-5 px-2 sm:px-3 text-center">
                        <span className={`inline-block px-2 sm:px-3 py-1 sm:py-1.5 rounded text-xs sm:text-sm font-semibold uppercase ${
                          isYourDeposit ? 'bg-purple-600 text-white' :
                          debt.priority === 'senior' ? 'bg-red-100 text-red-700' :
                          debt.priority === 'junior' ? 'bg-orange-100 text-orange-700' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>
                          {isYourDeposit ? 'You' : debt.priority}
                        </span>
                      </td>
                      <td className="py-4 sm:py-5 px-2 sm:px-3 text-left text-gray-700">
                        <span className="text-sm sm:text-base">{debt.type}</span>
                        {debt.type.includes('근저당권') && <span className="text-gray-400 text-xs sm:text-sm ml-1">(Mortgage)</span>}
                        {debt.type.includes('전세권') && <span className="text-gray-400 text-xs sm:text-sm ml-1">(Jeonse Rights)</span>}
                        {debt.type.includes('임차권') && <span className="text-gray-400 text-xs sm:text-sm ml-1">(Lease Rights)</span>}
                      </td>
                      <td className="py-4 sm:py-5 px-2 sm:px-3 text-right font-semibold text-gray-900 text-sm sm:text-base">{formatAmount(debt.amount)}</td>
                      <td className="py-4 sm:py-5 px-2 sm:px-3 text-right text-gray-500 text-xs sm:text-sm">{debt.registrationDate.split(' (')[0]}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Equity Calculation */}
          <div className="mt-6 p-4 sm:p-6 bg-gradient-to-r from-gray-50 to-slate-50 rounded-xl border border-gray-200">
            <h4 className="font-bold text-base sm:text-lg text-gray-900 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              Equity Calculation
              {selectedTierData && (
                <span className="text-sm font-normal text-gray-500">({selectedTierData.label})</span>
              )}
            </h4>
            <div className="space-y-2 text-sm sm:text-base">
              <div className="flex justify-between py-3 border-b border-gray-200">
                <div className="flex items-center gap-2">
                  <span className="text-gray-700">Estimated Property Value</span>
                  {tierEstimates && tierEstimates.length > 0 && (
                    <Tooltip content={
                      <div>
                        <p className="font-bold text-gray-900 mb-2">Property Value by Tier</p>
                        <p className="text-gray-700 text-sm mb-3">Select a tier above to see values. Currently showing: {selectedTierData?.label || 'Default'}</p>
                        <div className="space-y-1">
                          {tierEstimates.map((tier) => (
                            <div key={tier.tier} className="flex justify-between text-sm">
                              <span className={`text-gray-700 ${tier.tier === selectedTier ? 'font-semibold' : ''}`}>
                                {tier.label}{tier.tier === selectedTier ? ' (Selected)' : ''}:
                              </span>
                              <span className={`font-medium ${tier.tier === selectedTier ? 'text-blue-600' : 'text-gray-900'}`}>
                                {(tier.value / 100000000).toFixed(2)}억
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    }>
                      <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                    </Tooltip>
                  )}
                </div>
                <span className="font-bold text-gray-900">{formatAmount(displayPropertyValue)}</span>
              </div>
              <div className="flex justify-between py-3 border-b border-gray-200">
                <span className="text-gray-700">Total Registered Debt</span>
                <span className="font-bold text-red-700">- {formatAmount(metrics.totalDebt)}</span>
              </div>
              <div className="flex justify-between py-3 border-b border-gray-200">
                <span className="text-gray-700">Your Deposit (Proposed)</span>
                <span className="font-bold text-purple-700">- {formatAmount(proposedDeposit)}</span>
              </div>
              <div className="flex justify-between py-4 bg-white rounded-lg px-4 mt-3">
                <span className="font-bold text-gray-900">Remaining Equity</span>
                <span className={`font-bold text-lg sm:text-xl ${
                  calculatedEquity > 0 ? 'text-emerald-700' : 'text-red-700'
                }`}>
                  {calculatedEquity >= 0 ? '+' : ''}{formatAmount(calculatedEquity)}
                </span>
              </div>
            </div>

            {calculatedEquity <= 0 && (
              <div className="mt-4 p-4 sm:p-5 bg-red-100 border-l-4 border-red-600 rounded">
                <p className="text-red-900 font-semibold flex items-center gap-2 text-sm sm:text-base">
                  <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  Critical: Negative equity detected!
                </p>
                <p className="text-red-800 text-sm sm:text-base mt-2">
                  The total debt plus your proposed deposit exceeds the property value. <span className="font-bold">We strongly recommend reconsidering this property.</span>
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Small Amount Priority */}
      {smallAmountPriority && (
        <div className={`rounded-2xl p-4 sm:p-6 mb-6 border ${
          smallAmountPriority.isEligible
            ? 'bg-emerald-50 border-emerald-200'
            : 'bg-gray-50 border-gray-200'
        }`}>
          <div className="flex items-start gap-3 sm:gap-4">
            <span className="text-3xl sm:text-4xl">{smallAmountPriority.isEligible ? '✅' : '❌'}</span>
            <div className="flex-1">
              <h3 className="font-bold text-base sm:text-lg text-gray-900 mb-3">
                Small Amount Priority Repayment (소액임차인 최우선변제)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 text-sm sm:text-base">
                <div>
                  <p className="text-gray-500 mb-1">Region</p>
                  <p className="font-semibold text-gray-900">{smallAmountPriority.region}</p>
                </div>
                <div>
                  <p className="text-gray-500 mb-1">Threshold</p>
                  <p className="font-semibold text-gray-900">{formatAmountPrecise(smallAmountPriority.threshold)}</p>
                </div>
                <div>
                  <p className="text-gray-500 mb-1">Protected</p>
                  <p className="font-semibold text-gray-900">{formatAmountPrecise(smallAmountPriority.protectedAmount)}</p>
                </div>
              </div>
              {smallAmountPriority.isEligible && proposedDeposit <= smallAmountPriority.protectedAmount && (
                <p className="mt-4 text-sm sm:text-base text-emerald-700">
                  Your deposit of {formatAmount(proposedDeposit)} is within the protected amount.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Detected Risks */}
      {displayRisks.length > 0 ? (
        <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-gray-100">
          <h3 className="font-bold text-base sm:text-lg text-gray-900 mb-4 flex items-center gap-2">
            <span className="text-xl sm:text-2xl">⚠️</span>
            Detected Risks ({displayRisks.length})
          </h3>
          <div className="space-y-3 sm:space-y-4">
            {displayRisks.map((risk, index) => (
              <div
                key={index}
                className={`p-4 sm:p-5 rounded-xl border ${
                  risk.severity === 'CRITICAL' ? 'bg-red-50 border-red-200' :
                  risk.severity === 'HIGH' ? 'bg-orange-50 border-orange-200' :
                  'bg-yellow-50 border-yellow-200'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <p className="font-semibold text-sm sm:text-base text-gray-900">{risk.type}</p>
                      <span className={`px-2 sm:px-3 py-1 rounded text-xs sm:text-sm font-bold ${
                        risk.severity === 'CRITICAL' ? 'bg-red-600 text-white' :
                        risk.severity === 'HIGH' ? 'bg-orange-600 text-white' :
                        'bg-yellow-600 text-white'
                      }`}>
                        {risk.severity}
                      </span>
                    </div>
                    <p className="text-sm sm:text-base text-gray-600">{risk.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-emerald-50 rounded-2xl p-4 sm:p-6 border border-emerald-200">
          <div className="flex items-center gap-3">
            <span className="text-2xl sm:text-3xl">✅</span>
            <div>
              <p className="font-semibold text-base sm:text-lg text-emerald-900">No Critical Risks Detected</p>
              <p className="text-sm sm:text-base text-emerald-700">The property registry appears clean with no major legal issues.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
