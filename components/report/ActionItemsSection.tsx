'use client';

import { useState } from 'react';

interface NegotiationOption {
  name: string;
  rate: number;
  monthlyRent: number;
  monthlySavings: number;
  yearlySavings: number;
  script: string;
  recommended?: boolean;
}

interface ActionItemsSectionProps {
  reportType: 'jeonse' | 'wolse';
  recommendations: {
    mandatory: string[];
    recommended: string[];
    optional: string[];
  };
  negotiationOptions?: NegotiationOption[];
  rentDifference?: number;
  marketRate?: number;
  userRate?: number;
}

export default function ActionItemsSection({
  reportType,
  recommendations,
  negotiationOptions,
  rentDifference,
  marketRate,
  userRate,
}: ActionItemsSectionProps) {
  const [copiedScript, setCopiedScript] = useState<string | null>(null);

  const copyToClipboard = (text: string, optionName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedScript(optionName);
    setTimeout(() => setCopiedScript(null), 2000);
  };

  const formatAmount = (amount: number) => {
    if (amount >= 100000000) {
      return `${(amount / 100000000).toFixed(1)}억`;
    } else if (amount >= 10000) {
      return `${(amount / 10000).toLocaleString()}만원`;
    }
    return `${amount.toLocaleString()}원`;
  };

  return (
    <div className="mb-12">
      <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-8 flex items-center gap-3">
        <span className="text-3xl">✅</span>
        Action Items
      </h2>

      {/* Before Signing Checklist */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 mb-6 shadow-sm border border-gray-100">
        <h3 className="font-bold text-base sm:text-lg text-gray-900 mb-5">Before Signing</h3>
        <div className="space-y-4">
          <label className="flex items-start gap-3 sm:gap-4 cursor-pointer group">
            <input type="checkbox" className="mt-0.5 w-5 h-5 sm:w-6 sm:h-6 rounded border-gray-300 text-amber-600 focus:ring-amber-500" />
            <span className="text-sm sm:text-base text-gray-700 group-hover:text-gray-900">
              Verify building registry (등기부등본) on signing day
            </span>
          </label>
          <label className="flex items-start gap-3 sm:gap-4 cursor-pointer group">
            <input type="checkbox" className="mt-0.5 w-5 h-5 sm:w-6 sm:h-6 rounded border-gray-300 text-amber-600 focus:ring-amber-500" />
            <span className="text-sm sm:text-base text-gray-700 group-hover:text-gray-900">
              Confirm no new debts have been registered
            </span>
          </label>
          <label className="flex items-start gap-3 sm:gap-4 cursor-pointer group">
            <input type="checkbox" className="mt-0.5 w-5 h-5 sm:w-6 sm:h-6 rounded border-gray-300 text-amber-600 focus:ring-amber-500" />
            <span className="text-sm sm:text-base text-gray-700 group-hover:text-gray-900">
              Use certified bank transfer for deposit payment
            </span>
          </label>
          <label className="flex items-start gap-3 sm:gap-4 cursor-pointer group">
            <input type="checkbox" className="mt-0.5 w-5 h-5 sm:w-6 sm:h-6 rounded border-gray-300 text-amber-600 focus:ring-amber-500" />
            <span className="text-sm sm:text-base text-gray-700 group-hover:text-gray-900">
              Include special terms in contract if needed
            </span>
          </label>
        </div>
      </div>

      {/* After Signing Checklist */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 mb-6 shadow-sm border border-gray-100">
        <h3 className="font-bold text-base sm:text-lg text-gray-900 mb-5">After Signing</h3>
        <div className="space-y-4">
          <label className="flex items-start gap-3 sm:gap-4 cursor-pointer group">
            <input type="checkbox" className="mt-0.5 w-5 h-5 sm:w-6 sm:h-6 rounded border-gray-300 text-amber-600 focus:ring-amber-500" />
            <span className="text-sm sm:text-base text-gray-700 group-hover:text-gray-900">
              Move in and occupy the property
            </span>
          </label>
          <div className="ml-0">
            <label className="flex items-start gap-3 sm:gap-4 cursor-pointer group">
              <input type="checkbox" className="mt-0.5 w-5 h-5 sm:w-6 sm:h-6 rounded border-gray-300 text-amber-600 focus:ring-amber-500" />
              <div>
                <span className="text-sm sm:text-base text-gray-700 group-hover:text-gray-900">
                  Register move-in (전입신고) - same day
                </span>
                <div className="mt-3 ml-0 text-sm sm:text-base text-gray-500 space-y-2">
                  <p className="flex items-center gap-2">
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs sm:text-sm font-medium">F-visa</span>
                    체류지변경신고 at 주민센터 or Immigration Office
                  </p>
                  <p className="flex items-center gap-2">
                    <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs sm:text-sm font-medium">Overseas Korean</span>
                    거소이전신고 at 주민센터 or Immigration Office
                  </p>
                </div>
              </div>
            </label>
          </div>
          <label className="flex items-start gap-3 sm:gap-4 cursor-pointer group">
            <input type="checkbox" className="mt-0.5 w-5 h-5 sm:w-6 sm:h-6 rounded border-gray-300 text-amber-600 focus:ring-amber-500" />
            <span className="text-sm sm:text-base text-gray-700 group-hover:text-gray-900">
              Get confirmation date (확정일자) at community center
            </span>
          </label>
        </div>
      </div>

      {/* Negotiation Guide - Only for wolse with overpriced rent */}
      {negotiationOptions && negotiationOptions.length > 0 && rentDifference !== undefined && rentDifference > 0 && (
        <div className="bg-white rounded-2xl p-4 sm:p-6 mb-6 shadow-sm border border-gray-100">
          <h3 className="font-bold text-base sm:text-lg text-gray-900 mb-4 flex items-center gap-2">
            <span className="text-xl sm:text-2xl">🤝</span>
            Negotiation Guide
          </h3>

          {rentDifference > 0 && (
            <p className="text-sm sm:text-base text-gray-600 mb-4">
              You&apos;re paying {formatAmount(rentDifference)}/month above expected rent.
              Consider negotiating using these scripts.
            </p>
          )}

          <div className="space-y-4">
            {negotiationOptions.map((option, index) => (
              <div
                key={index}
                onClick={() => copyToClipboard(option.script, option.name)}
                className={`p-4 sm:p-5 rounded-xl border cursor-pointer transition-all hover:shadow-md ${
                  option.recommended
                    ? 'bg-amber-50 border-amber-200 hover:border-amber-300'
                    : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 sm:gap-0 mb-3">
                  <div>
                    <h4 className="font-semibold text-sm sm:text-base text-gray-900 flex flex-wrap items-center gap-2">
                      {option.name}
                      {option.recommended && (
                        <span className="text-xs bg-amber-600 text-white px-2 py-1 rounded-full">
                          Recommended
                        </span>
                      )}
                    </h4>
                    <p className="text-sm sm:text-base text-gray-500">
                      Rent: {formatAmount(option.monthlyRent)}/month
                    </p>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="font-bold text-sm sm:text-base text-amber-700">
                      Save {formatAmount(option.yearlySavings)}/yr
                    </p>
                    <p className="text-sm text-gray-500">
                      ({formatAmount(option.monthlySavings)}/month)
                    </p>
                  </div>
                </div>

                <div className="p-3 sm:p-4 bg-white rounded-lg border border-gray-200 text-sm sm:text-base text-gray-600 italic">
                  "{option.script}"
                </div>

                <div className="mt-3 text-right">
                  <span className={`text-xs sm:text-sm ${copiedScript === option.name ? 'text-emerald-600 font-medium' : 'text-gray-400'}`}>
                    {copiedScript === option.name ? '✓ Copied to clipboard!' : 'Click to copy'}
                  </span>
                </div>
              </div>
            ))}
          </div>

        </div>
      )}

      {/* No Negotiation Needed - with warning */}
      {(!rentDifference || rentDifference <= 0) && reportType === 'wolse' && (
        <div className="space-y-3 sm:space-y-4 mb-6">
          <div className="bg-emerald-50 rounded-2xl p-4 sm:p-6 border border-emerald-200">
            <div className="flex items-center gap-3">
              <span className="text-2xl sm:text-3xl">✅</span>
              <div>
                <p className="font-semibold text-sm sm:text-base text-emerald-900">Price Below Expected</p>
                <p className="text-sm sm:text-base text-emerald-700">
                  Your rent is at or below expected rent - no price negotiation needed.
                </p>
              </div>
            </div>
          </div>
          <div className="bg-amber-50 rounded-2xl p-4 sm:p-6 border border-amber-200">
            <div className="flex items-start gap-3">
              <span className="text-2xl sm:text-3xl">⚠️</span>
              <div>
                <p className="font-semibold text-sm sm:text-base text-amber-900">Verify Why Price is Low</p>
                <p className="text-sm sm:text-base text-amber-700">
                  Below-market prices often have reasons. Before signing, check for physical issues
                  (leaks, mold, noise), neighborhood problems, or why the landlord needs to rent quickly.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recommendations from Safety Analysis */}
      {recommendations.mandatory.length > 0 && (
        <div className="bg-red-50 rounded-2xl p-4 sm:p-6 mb-6 border border-red-200">
          <h3 className="font-bold text-base sm:text-lg text-red-800 mb-4 flex items-center gap-2">
            <span className="text-xl sm:text-2xl">🚨</span>
            Mandatory Actions
          </h3>
          <ul className="space-y-3">
            {recommendations.mandatory.map((item, index) => (
              <li key={index} className="flex gap-3 text-sm sm:text-base text-red-800">
                <span className="font-bold">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {recommendations.recommended.length > 0 && (
        <div className="bg-orange-50 rounded-2xl p-4 sm:p-6 mb-6 border border-orange-200">
          <h3 className="font-bold text-base sm:text-lg text-orange-800 mb-4 flex items-center gap-2">
            <span className="text-xl sm:text-2xl">⚠️</span>
            Recommended Actions
          </h3>
          <ul className="space-y-3">
            {recommendations.recommended.map((item, index) => (
              <li key={index} className="flex gap-3 text-sm sm:text-base text-orange-800">
                <span className="font-bold">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {recommendations.optional.length > 0 && (
        <div className="bg-blue-50 rounded-2xl p-4 sm:p-6 border border-blue-200">
          <h3 className="font-bold text-base sm:text-lg text-blue-800 mb-4 flex items-center gap-2">
            <span className="text-xl sm:text-2xl">💡</span>
            Optional Actions
          </h3>
          <ul className="space-y-3">
            {recommendations.optional.map((item, index) => (
              <li key={index} className="flex gap-3 text-sm sm:text-base text-blue-800">
                <span className="font-bold">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
