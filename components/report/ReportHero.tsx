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
}: ReportHeroProps) {
  const getRiskPosition = () => {
    switch (riskLevel) {
      case 'SAFE': return 0;
      case 'MODERATE': return 1;
      case 'HIGH': return 2;
      case 'CRITICAL': return 2;
      case 'UNKNOWN': return -1; // No position highlighted
      default: return 1;
    }
  };

  const getRiskText = () => {
    switch (riskLevel) {
      case 'SAFE': return 'Safe to Proceed';
      case 'MODERATE': return 'Moderate Risk';
      case 'HIGH': return 'High Risk';
      case 'CRITICAL': return 'Critical Risk';
      case 'UNKNOWN': return 'Analysis Pending';
      default: return riskLevel;
    }
  };

  const getRiskColor = () => {
    switch (riskLevel) {
      case 'SAFE': return 'text-emerald-600';
      case 'MODERATE': return 'text-amber-600';
      case 'HIGH': return 'text-orange-600';
      case 'CRITICAL': return 'text-red-600';
      case 'UNKNOWN': return 'text-gray-500';
      default: return 'text-gray-600';
    }
  };

  const getRiskBadgeColor = () => {
    switch (riskLevel) {
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
      <div className="bg-white rounded-3xl p-8 mb-8 shadow-lg border border-gray-100">
        {/* Traffic Light Indicator */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-4">
            {/* SAFE */}
            <div className="flex flex-col items-center group">
              <div className={`w-10 h-10 rounded-full border-2 transition-all duration-200 group-hover:scale-110 ${
                position === 0
                  ? 'bg-emerald-500 border-emerald-600 shadow-lg shadow-emerald-200'
                  : 'bg-gray-100 border-gray-200 group-hover:bg-emerald-50 group-hover:border-emerald-300'
              }`} />
              <span className={`text-xs mt-2 font-medium transition-colors duration-200 ${position === 0 ? 'text-emerald-600' : 'text-gray-400 group-hover:text-emerald-500'}`}>
                Safe
              </span>
            </div>

            {/* Connector */}
            <div className="w-16 h-0.5 bg-gray-200" />

            {/* MODERATE */}
            <div className="flex flex-col items-center group">
              <div className={`w-10 h-10 rounded-full border-2 transition-all duration-200 group-hover:scale-110 ${
                position === 1
                  ? 'bg-amber-500 border-amber-600 shadow-lg shadow-amber-200'
                  : 'bg-gray-100 border-gray-200 group-hover:bg-amber-50 group-hover:border-amber-300'
              }`} />
              <span className={`text-xs mt-2 font-medium transition-colors duration-200 ${position === 1 ? 'text-amber-600' : 'text-gray-400 group-hover:text-amber-500'}`}>
                Moderate
              </span>
            </div>

            {/* Connector */}
            <div className="w-16 h-0.5 bg-gray-200" />

            {/* HIGH/CRITICAL */}
            <div className="flex flex-col items-center group">
              <div className={`w-10 h-10 rounded-full border-2 transition-all duration-200 group-hover:scale-110 ${
                position === 2
                  ? riskLevel === 'CRITICAL'
                    ? 'bg-red-600 border-red-700 shadow-lg shadow-red-200'
                    : 'bg-orange-500 border-orange-600 shadow-lg shadow-orange-200'
                  : 'bg-gray-100 border-gray-200 group-hover:bg-orange-50 group-hover:border-orange-300'
              }`} />
              <span className={`text-xs mt-2 font-medium transition-colors duration-200 ${
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
        <div className="text-center mb-6">
          <span className={`inline-block px-5 py-2.5 rounded-full text-sm font-bold ${getRiskColor()} bg-gray-50 border border-gray-200`}>
            {getRiskText()}
          </span>
        </div>

        {/* Address */}
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 text-center mb-6">
          {address}
          {buildingNumber && ` ${buildingNumber}`}
          {unit && ` ${unit}`}
          {area && ` ${Math.floor(area)}㎡`}
        </h1>

        {/* Key Metrics */}
        <div className="flex justify-center gap-6 flex-wrap">
          <div className="text-center px-6 py-4 bg-gray-50 rounded-xl border border-gray-100 hover:bg-white hover:shadow-md hover:border-gray-200 transition-all duration-200">
            <p className="text-sm text-gray-500 mb-1">Deposit</p>
            <p className="text-xl font-bold text-gray-900">{formatAmount(deposit)}</p>
          </div>

          <div className="text-center px-6 py-4 bg-gray-50 rounded-xl border border-gray-100 hover:bg-white hover:shadow-md hover:border-gray-200 transition-all duration-200">
            <p className="text-sm text-gray-500 mb-1">Safety Score</p>
            <p className="text-xl font-bold text-gray-900">{safetyScore}/100</p>
          </div>

          {monthlyRent !== undefined && (
            <div className="text-center px-6 py-4 bg-gray-50 rounded-xl border border-gray-100 hover:bg-white hover:shadow-md hover:border-gray-200 transition-all duration-200">
              <p className="text-sm text-gray-500 mb-1">Monthly Rent</p>
              <p className="text-xl font-bold text-gray-900">{formatAmount(monthlyRent)}</p>
            </div>
          )}

          {estimatedValue && (
            <div className="text-center px-6 py-4 bg-gray-50 rounded-xl border border-gray-100 hover:bg-white hover:shadow-md hover:border-gray-200 transition-all duration-200">
              <p className="text-sm text-gray-500 mb-1">Est. Value</p>
              <p className="text-xl font-bold text-gray-900">{formatAmount(estimatedValue)}</p>
            </div>
          )}
        </div>

        {/* Report Date */}
        <p className="text-center text-sm text-gray-400 mt-6">
          Report generated: {reportDate}
        </p>
      </div>

      {/* Verdict Section */}
      {verdict && (
        <div className="bg-white rounded-2xl p-6 mb-8 shadow-sm border border-gray-100">
          <p className="text-lg text-gray-700 leading-relaxed text-center">
            {verdict}
          </p>
        </div>
      )}
    </>
  );
}
