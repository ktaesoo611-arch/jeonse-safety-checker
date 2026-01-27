'use client';

interface ReportHeroProps {
  address: string;
  buildingNumber?: string | null;
  unit?: string | null;
  area?: number | null;
  riskLevel: 'SAFE' | 'MODERATE' | 'HIGH' | 'CRITICAL' | 'UNKNOWN';
  safetyScore: number;
  deposit: number;
  monthlyRent?: number;
  estimatedValue?: number | null;
  verdict?: string;
  reportDate: string;
  reportType: 'jeonse' | 'wolse';
  // Override values for tier-based recalculation
  overrideSafetyScore?: number;
  overrideRiskLevel?: 'SAFE' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  overrideEstimatedValue?: number;
  selectedTierLabel?: string;
}

export default function ReportHero({
  address,
  buildingNumber,
  unit,
  area,
  riskLevel,
  safetyScore,
  deposit,
  monthlyRent,
  estimatedValue,
  verdict,
  reportDate,
  reportType,
  overrideSafetyScore,
  overrideRiskLevel,
  overrideEstimatedValue,
  selectedTierLabel,
}: ReportHeroProps) {
  // Use override values when provided (tier-based recalculation)
  const displaySafetyScore = overrideSafetyScore ?? safetyScore;
  const displayRiskLevel = overrideRiskLevel ?? riskLevel;
  const displayEstimatedValue = overrideEstimatedValue ?? estimatedValue;
  const getRiskPosition = () => {
    switch (displayRiskLevel) {
      case 'SAFE': return 0;
      case 'MODERATE': return 1;
      case 'HIGH': return 2;
      case 'CRITICAL': return 2;
      case 'UNKNOWN': return -1; // No position highlighted
      default: return 1;
    }
  };

  const getRiskText = () => {
    switch (displayRiskLevel) {
      case 'SAFE': return 'Safe to Proceed';
      case 'MODERATE': return 'Moderate Risk';
      case 'HIGH': return 'High Risk';
      case 'CRITICAL': return 'Critical Risk';
      case 'UNKNOWN': return 'Analysis Pending';
      default: return displayRiskLevel;
    }
  };

  const getRiskColor = () => {
    switch (displayRiskLevel) {
      case 'SAFE': return 'text-emerald-600';
      case 'MODERATE': return 'text-amber-600';
      case 'HIGH': return 'text-orange-600';
      case 'CRITICAL': return 'text-red-600';
      case 'UNKNOWN': return 'text-gray-500';
      default: return 'text-gray-600';
    }
  };

  const getRiskBadgeColor = () => {
    switch (displayRiskLevel) {
      case 'SAFE': return 'bg-emerald-100 text-emerald-700';
      case 'MODERATE': return 'bg-amber-100 text-amber-700';
      case 'HIGH': return 'bg-orange-100 text-orange-700';
      case 'CRITICAL': return 'bg-red-100 text-red-700';
      case 'UNKNOWN': return 'bg-gray-100 text-gray-600';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  const formatAmount = (amount: number) => {
    if (amount >= 100000000) {
      return `₩${(amount / 100000000).toFixed(1)}억`;
    } else if (amount >= 10000) {
      return `${(amount / 10000).toLocaleString()}만원`;
    }
    return `${amount.toLocaleString()}원`;
  };

  const position = getRiskPosition();

  return (
    <>
      <div className="bg-white rounded-3xl p-6 sm:p-10 mb-8 shadow-lg border border-gray-100">
        {/* Traffic Light Indicator */}
        <div className="flex justify-center mb-10">
          <div className="flex items-center gap-3 sm:gap-6">
            {/* SAFE */}
            <div className="flex flex-col items-center group">
              <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full border-3 transition-all duration-200 group-hover:scale-110 ${
                position === 0
                  ? 'bg-emerald-500 border-emerald-600 shadow-xl shadow-emerald-200'
                  : 'bg-gray-100 border-gray-200 group-hover:bg-emerald-50 group-hover:border-emerald-300'
              }`} />
              <span className={`text-sm sm:text-base mt-3 font-semibold transition-colors duration-200 ${position === 0 ? 'text-emerald-600' : 'text-gray-400 group-hover:text-emerald-500'}`}>
                Safe
              </span>
            </div>

            {/* Connector */}
            <div className="w-8 sm:w-16 h-1 bg-gray-200 rounded-full" />

            {/* MODERATE */}
            <div className="flex flex-col items-center group">
              <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full border-3 transition-all duration-200 group-hover:scale-110 ${
                position === 1
                  ? 'bg-amber-500 border-amber-600 shadow-xl shadow-amber-200'
                  : 'bg-gray-100 border-gray-200 group-hover:bg-amber-50 group-hover:border-amber-300'
              }`} />
              <span className={`text-sm sm:text-base mt-3 font-semibold transition-colors duration-200 ${position === 1 ? 'text-amber-600' : 'text-gray-400 group-hover:text-amber-500'}`}>
                Moderate
              </span>
            </div>

            {/* Connector */}
            <div className="w-8 sm:w-16 h-1 bg-gray-200 rounded-full" />

            {/* HIGH/CRITICAL */}
            <div className="flex flex-col items-center group">
              <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full border-3 transition-all duration-200 group-hover:scale-110 ${
                position === 2
                  ? riskLevel === 'CRITICAL'
                    ? 'bg-red-600 border-red-700 shadow-xl shadow-red-200'
                    : 'bg-orange-500 border-orange-600 shadow-xl shadow-orange-200'
                  : 'bg-gray-100 border-gray-200 group-hover:bg-orange-50 group-hover:border-orange-300'
              }`} />
              <span className={`text-sm sm:text-base mt-3 font-semibold transition-colors duration-200 ${
                position === 2
                  ? riskLevel === 'CRITICAL' ? 'text-red-600' : 'text-orange-600'
                  : 'text-gray-400 group-hover:text-orange-500'
              }`}>
                High
              </span>
            </div>
          </div>
        </div>

        {/* Risk Status Badge */}
        <div className="text-center mb-8">
          <span className={`inline-block px-6 py-3 rounded-full text-base sm:text-lg font-bold ${getRiskColor()} bg-gray-50 border-2 border-gray-200`}>
            {getRiskText()}
          </span>
        </div>

        {/* Address */}
        <div className="text-center mb-8">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 leading-tight">
            {address}
          </h1>
          {(buildingNumber || unit || area) && (
            <p className="text-xl sm:text-2xl md:text-3xl font-semibold text-gray-600 mt-2">
              {buildingNumber}
              {unit && ` ${unit}`}
              {area && ` ${Math.floor(area)}㎡`}
            </p>
          )}
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 sm:flex sm:justify-center gap-4 sm:gap-6">
          <div className="text-center px-4 sm:px-8 py-5 bg-blue-50 rounded-2xl border-2 border-blue-100 hover:bg-blue-100 hover:shadow-md hover:border-blue-200 transition-all duration-200">
            <p className="text-sm sm:text-base text-blue-600 font-medium mb-2">Deposit</p>
            <p className="text-xl sm:text-2xl font-bold text-blue-900">{formatAmount(deposit)}</p>
          </div>

          <div className={`text-center px-4 sm:px-8 py-5 rounded-2xl border-2 hover:shadow-md transition-all duration-200 ${
            displaySafetyScore >= 70 ? 'bg-emerald-50 border-emerald-100 hover:bg-emerald-100 hover:border-emerald-200' :
            displaySafetyScore >= 50 ? 'bg-amber-50 border-amber-100 hover:bg-amber-100 hover:border-amber-200' :
            'bg-red-50 border-red-100 hover:bg-red-100 hover:border-red-200'
          }`}>
            <p className={`text-sm sm:text-base font-medium mb-2 ${
              displaySafetyScore >= 70 ? 'text-emerald-600' :
              displaySafetyScore >= 50 ? 'text-amber-600' : 'text-red-600'
            }`}>Safety Score</p>
            <p className={`text-xl sm:text-2xl font-bold ${
              displaySafetyScore >= 70 ? 'text-emerald-900' :
              displaySafetyScore >= 50 ? 'text-amber-900' : 'text-red-900'
            }`}>{displaySafetyScore}/100</p>
            {selectedTierLabel && (
              <p className="text-xs text-gray-500 mt-1">{selectedTierLabel}</p>
            )}
          </div>

          {monthlyRent !== undefined && (
            <div className="text-center px-4 sm:px-8 py-5 bg-purple-50 rounded-2xl border-2 border-purple-100 hover:bg-purple-100 hover:shadow-md hover:border-purple-200 transition-all duration-200">
              <p className="text-sm sm:text-base text-purple-600 font-medium mb-2">Monthly Rent</p>
              <p className="text-xl sm:text-2xl font-bold text-purple-900">{formatAmount(monthlyRent)}</p>
            </div>
          )}

          {displayEstimatedValue && displayEstimatedValue >= 50000000 && (
            <div className="text-center px-4 sm:px-8 py-5 bg-slate-50 rounded-2xl border-2 border-slate-200 hover:bg-slate-100 hover:shadow-md hover:border-slate-300 transition-all duration-200">
              <p className="text-sm sm:text-base text-slate-600 font-medium mb-2">Est. Value</p>
              <p className="text-xl sm:text-2xl font-bold text-slate-900">{formatAmount(displayEstimatedValue)}</p>
              {selectedTierLabel && (
                <p className="text-xs text-gray-500 mt-1">{selectedTierLabel}</p>
              )}
            </div>
          )}
        </div>

        {/* Report Date */}
        <p className="text-center text-sm sm:text-base text-gray-400 mt-8">
          Report generated: {reportDate}
        </p>
      </div>

      {/* Verdict Section */}
      {verdict && (
        <div className="bg-white rounded-2xl p-6 sm:p-8 mb-8 shadow-sm border border-gray-100">
          <p className="text-base sm:text-lg md:text-xl text-gray-700 leading-relaxed text-center">
            {verdict}
          </p>
        </div>
      )}
    </>
  );
}
