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
  top: string[];
  budget: string[];
  standard: string[];
  mid: string[];
  premium: string[];
}

type TierKey = 'budget' | 'standard' | 'mid' | 'premium' | 'top';

interface TierEstimatesSectionProps {
  tierEstimates: TierEstimate[] | null;
  tierGuidance: TierGuidance | null;
  valueMid: number | null; // Fallback if no tier estimates
  selectedTier: TierKey;
  onTierSelect: (tier: TierKey) => void;
}

export default function TierEstimatesSection({
  tierEstimates,
  tierGuidance,
  valueMid,
  selectedTier,
  onTierSelect,
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
  const topTier = tierEstimates.find(t => t.tier === 'top');

  // Display value based on selected tier
  const selectedTierData = tierEstimates.find(t => t.tier === selectedTier);
  const displayValue = selectedTierData?.value || midTier?.value || valueMid || 0;
  const selectedTierLabel = selectedTierData?.label || 'Mid Tier';

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
    {
      key: 'top',
      data: topTier,
      guidance: tierGuidance?.top || [],
      icon: '👑',
      color: 'rose',
      bgColor: 'bg-rose-50',
      borderColor: 'border-rose-200',
      textColor: 'text-rose-700',
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
              <p className="text-sm text-gray-500 mb-1">Estimated Value ({selectedTierLabel})</p>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900">
                ₩{formatAmount(displayValue)}
              </p>
              {budgetTier && (topTier || premiumTier) && (
                <p className="text-sm text-gray-500 mt-1">
                  Range: ₩{formatAmount(budgetTier.value)} ~ ₩{formatAmount((topTier || premiumTier)!.value)}
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
                    Select your property's quality tier
                  </p>
                  <p className="text-sm text-blue-700 mt-1">
                    Click on a tier to see how LTV and risk metrics change based on property condition.
                    <strong className="block mt-1">Default is Mid Tier. Select the tier that best matches your property.</strong>
                  </p>
                </div>
              </div>
            </div>

            {/* Tier Cards */}
            <div className="p-5 sm:p-6 space-y-4">
              {tiers.map((tier) => {
                if (!tier.data) return null;

                const isSelected = selectedTier === tier.key;

                return (
                  <button
                    key={tier.key}
                    onClick={() => onTierSelect(tier.key as TierKey)}
                    className={`w-full text-left rounded-xl border-2 p-4 sm:p-5 transition-all duration-200 hover:shadow-md ${
                      isSelected
                        ? `${tier.borderColor} ${tier.bgColor} ring-2 ring-offset-2 ${tier.color === 'amber' ? 'ring-amber-500' : tier.color === 'blue' ? 'ring-blue-500' : tier.color === 'emerald' ? 'ring-emerald-500' : tier.color === 'rose' ? 'ring-rose-500' : 'ring-purple-500'}`
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    {/* Tier Header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{tier.icon}</span>
                        <div>
                          <p className={`font-bold ${isSelected ? tier.textColor : 'text-gray-700'}`}>
                            {tier.data.label}
                          </p>
                          {isSelected && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-200 text-emerald-800 text-xs font-semibold rounded-full mt-1">
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                              Selected
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-xl sm:text-2xl font-bold ${isSelected ? tier.textColor : 'text-gray-700'}`}>
                          ₩{formatAmount(tier.data.value)}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {(tier.data.unitPrice / 10000).toFixed(0)}만/㎡
                        </p>
                      </div>
                    </div>

                    {/* Tier Characteristics - Only show for selected tier */}
                    {isSelected && tier.guidance.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-200/50">
                        <p className="text-xs text-gray-500 mb-2 font-medium">Typical characteristics:</p>
                        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                          {tier.guidance.map((item, idx) => (
                            <li key={idx} className="flex items-center gap-2 text-sm text-gray-600">
                              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: tier.color === 'amber' ? '#f59e0b' : tier.color === 'blue' ? '#3b82f6' : tier.color === 'emerald' ? '#10b981' : tier.color === 'rose' ? '#f43f5e' : '#8b5cf6' }} />
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Transaction Count - Only show for selected tier */}
                    {isSelected && (
                      <div className="mt-3 pt-3 border-t border-gray-200/50 flex items-center justify-between text-xs text-gray-500">
                        <span>Based on {tier.data.transactionCount} transactions</span>
                        <span>Depreciation: {(tier.data.depreciationRate * 100).toFixed(1)}%/yr</span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
