'use client';

import { useState } from 'react';

interface TierEstimate {
  tier: string;
  label: string;
  value: number;
  unitPrice: number;
  depreciationRate: number;
  transactionCount: number;
}

interface TierGuidance {
  budget: string[];
  standard: string[];
  mid: string[];
  premium: string[];
}

interface TierEstimatesSectionProps {
  tierEstimates: TierEstimate[] | null;
  tierGuidance: TierGuidance | null;
  valueMid: number | null; // Fallback if no tier estimates
}

export default function TierEstimatesSection({
  tierEstimates,
  tierGuidance,
  valueMid,
}: TierEstimatesSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const formatAmount = (amount: number) => {
    return `${(amount / 100000000).toFixed(2)}억`;
  };

  // If no tier estimates, don't show this section
  if (!tierEstimates || tierEstimates.length === 0) {
    return null;
  }

  // Get tier values
  const budgetTier = tierEstimates.find(t => t.tier === 'budget');
  const standardTier = tierEstimates.find(t => t.tier === 'standard');
  const midTier = tierEstimates.find(t => t.tier === 'mid');
  const premiumTier = tierEstimates.find(t => t.tier === 'premium');

  // Default display value (Mid tier or valueMid fallback)
  const displayValue = midTier?.value || valueMid || 0;

  // Tier config for rendering
  const tiers = [
    {
      key: 'budget',
      data: budgetTier,
      guidance: tierGuidance?.budget || [],
      icon: '🏚️',
      color: 'amber',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-200',
      textColor: 'text-amber-700',
      isSafetyTier: true,
    },
    {
      key: 'standard',
      data: standardTier,
      guidance: tierGuidance?.standard || [],
      icon: '🏠',
      color: 'blue',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      textColor: 'text-blue-700',
      isSafetyTier: false,
    },
    {
      key: 'mid',
      data: midTier,
      guidance: tierGuidance?.mid || [],
      icon: '🏡',
      color: 'emerald',
      bgColor: 'bg-emerald-50',
      borderColor: 'border-emerald-200',
      textColor: 'text-emerald-700',
      isSafetyTier: false,
    },
    {
      key: 'premium',
      data: premiumTier,
      guidance: tierGuidance?.premium || [],
      icon: '🏰',
      color: 'purple',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200',
      textColor: 'text-purple-700',
      isSafetyTier: false,
    },
  ];

  return (
    <div className="mb-8">
      {/* Section Header */}
      <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6 flex items-center gap-3">
        <span className="text-3xl">🏠</span>
        Property Value Estimate
      </h2>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Collapsed View - Click to Expand */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full p-5 sm:p-6 flex items-center justify-between hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-4">
            <div className="text-left">
              <p className="text-sm text-gray-500 mb-1">Estimated Value (Mid Tier)</p>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900">
                ₩{formatAmount(displayValue)}
              </p>
              {budgetTier && premiumTier && (
                <p className="text-sm text-gray-500 mt-1">
                  Range: ₩{formatAmount(budgetTier.value)} ~ ₩{formatAmount(premiumTier.value)}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 text-gray-500">
            <span className="text-sm font-medium">
              {isExpanded ? 'Hide tiers' : 'See all tiers'}
            </span>
            <svg
              className={`w-5 h-5 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </button>

        {/* Expanded View - Tier Details */}
        {isExpanded && (
          <div className="border-t border-gray-100">
            {/* Info Banner */}
            <div className="px-5 sm:px-6 py-4 bg-blue-50 border-b border-blue-100">
              <div className="flex items-start gap-3">
                <span className="text-xl">ℹ️</span>
                <div>
                  <p className="text-sm text-blue-800 font-medium">
                    Property values vary by quality tier
                  </p>
                  <p className="text-sm text-blue-700 mt-1">
                    Select the tier that best matches your property's condition to understand its market position.
                    <strong className="block mt-1">Safety scoring uses Budget tier (conservative estimate) to protect your deposit.</strong>
                  </p>
                </div>
              </div>
            </div>

            {/* Tier Cards */}
            <div className="p-5 sm:p-6 space-y-4">
              {tiers.map((tier) => {
                if (!tier.data) return null;

                return (
                  <div
                    key={tier.key}
                    className={`rounded-xl border-2 ${tier.borderColor} ${tier.bgColor} p-4 sm:p-5 transition-all duration-200 hover:shadow-md`}
                  >
                    {/* Tier Header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{tier.icon}</span>
                        <div>
                          <p className={`font-bold ${tier.textColor}`}>
                            {tier.data.label}
                          </p>
                          {tier.isSafetyTier && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-200 text-amber-800 text-xs font-semibold rounded-full mt-1">
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                              Used for Safety
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-xl sm:text-2xl font-bold ${tier.textColor}`}>
                          ₩{formatAmount(tier.data.value)}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {(tier.data.unitPrice / 10000).toFixed(0)}만/㎡
                        </p>
                      </div>
                    </div>

                    {/* Tier Characteristics */}
                    {tier.guidance.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-200/50">
                        <p className="text-xs text-gray-500 mb-2 font-medium">Typical characteristics:</p>
                        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                          {tier.guidance.map((item, idx) => (
                            <li key={idx} className="flex items-center gap-2 text-sm text-gray-600">
                              <span className={`w-1.5 h-1.5 rounded-full ${tier.bgColor.replace('50', '400')}`} style={{ backgroundColor: tier.color === 'amber' ? '#f59e0b' : tier.color === 'blue' ? '#3b82f6' : tier.color === 'emerald' ? '#10b981' : '#8b5cf6' }} />
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Transaction Count */}
                    <div className="mt-3 pt-3 border-t border-gray-200/50 flex items-center justify-between text-xs text-gray-500">
                      <span>Based on {tier.data.transactionCount} transactions</span>
                      <span>Depreciation: {(tier.data.depreciationRate * 100).toFixed(1)}%/yr</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
