'use client';

import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Line,
  ComposedChart,
} from 'recharts';

// BOK Rate constant for jeonse calculation
const CONVERSION_RATE = 0.045; // 4.5% (BOK 2.5% + 2%)

interface WolseMarketData {
  userDeposit: number;
  userMonthlyRent: number;
  userRate: number;
  marketRate: number;
  marketRateRange: { low: number; high: number };
  legalRate: number;
  expectedRent: number;
  rentDifference: number;
  rentDifferencePercent: number;
  assessment: 'GOOD_DEAL' | 'FAIR' | 'OVERPRICED' | 'SEVERELY_OVERPRICED';
  assessmentDetails?: string;
  contractCount: number;
  confidenceLevel?: string;
  savingsPotential: {
    vsMarket: number;
    vsLegal: number;
  };
  trend?: {
    direction: 'RISING' | 'STABLE' | 'DECLINING';
    percentage: number;
    advice: string;
  };
  recentTransactions?: Array<{
    year: number;
    month: number;
    day: number;
    exclusiveArea: number;
    floor: number;
    deposit: number;
    monthlyRent: number;
  }>;
  // Jeonse-centric data
  impliedJeonseToday?: number;
  userImpliedJeonse?: number;
}

interface JeonseMarketData {
  marketTrend: 'rising' | 'stable' | 'falling' | null;
  confidence: number | null;
  valueLow: number | null;
  valueMid: number | null;
  valueHigh: number | null;
  proposedJeonse: number;
  estimatedValue: number | null;
  // New jeonse analysis fields (optional for backward compatibility)
  expectedJeonse?: number | null;
  jeonseDifference?: number | null;
  jeonseDifferencePercent?: number | null;
  assessment?: 'GOOD_DEAL' | 'FAIR' | 'OVERPRICED' | 'SEVERELY_OVERPRICED' | null;
  assessmentDetails?: string | null;
  potentialSavings?: number;
  trend?: {
    direction: 'RISING' | 'STABLE' | 'DECLINING';
    percentage: number;
    advice: string;
  } | null;
  transactionData?: Array<{
    daysAgo: number;
    price: number; // In 억
    date: string;
    floor: number;
    exclusiveArea: number;
  }>;
  regressionLine?: {
    slope: number; // 억/day
    intercept: number; // Value at daysAgo=0 (in 억)
  } | null;
  contractCount?: number;
}

interface MarketPositionSectionProps {
  reportType: 'jeonse' | 'wolse';
  wolseData?: WolseMarketData;
  jeonseData?: JeonseMarketData;
}

export default function MarketPositionSection({
  reportType,
  wolseData,
  jeonseData,
}: MarketPositionSectionProps) {
  const formatAmount = (amount: number) => {
    if (amount >= 100000000) {
      return `₩${(amount / 100000000).toFixed(1)}억`;
    } else if (amount >= 10000) {
      return `${(amount / 10000).toLocaleString()}만원`;
    }
    return `${amount.toLocaleString()}원`;
  };

  const getAssessmentStyle = (assessment: string) => {
    switch (assessment) {
      case 'GOOD_DEAL':
        return { color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', icon: '🎉', label: 'Great Deal' };
      case 'FAIR':
        return { color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', icon: '✓', label: 'Fair Price' };
      case 'OVERPRICED':
        return { color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', icon: '⚠️', label: 'Above Market' };
      case 'SEVERELY_OVERPRICED':
        return { color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', icon: '🚨', label: 'Overpriced' };
      default:
        return { color: 'text-gray-600', bg: 'bg-gray-50', border: 'border-gray-200', icon: '?', label: 'Unknown' };
    }
  };

  const getTrendIcon = (direction: string) => {
    switch (direction) {
      case 'RISING': return '📈';
      case 'DECLINING': return '📉';
      default: return '➡️';
    }
  };

  // Wolse Market Position
  if (reportType === 'wolse' && wolseData) {
    const style = getAssessmentStyle(wolseData.assessment);

    return (
      <div className="mb-12">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-8 flex items-center gap-3">
          <span className="text-3xl">📊</span>
          Market Position
        </h2>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-6">
          <div className="bg-white rounded-2xl p-5 sm:p-6 text-center shadow-sm border border-gray-100 hover:shadow-lg hover:border-gray-200 transition-all duration-200 cursor-default">
            <p className="text-sm sm:text-base text-gray-500 mb-2">Your Rent</p>
            <p className="text-2xl sm:text-3xl font-bold text-gray-900">{formatAmount(wolseData.userMonthlyRent)}</p>
            <p className="text-sm sm:text-base text-gray-400 mt-2">
              at {formatAmount(wolseData.userDeposit)} deposit
            </p>
          </div>

          <div className="bg-white rounded-2xl p-5 sm:p-6 text-center shadow-sm border border-gray-100 hover:shadow-lg hover:border-gray-200 transition-all duration-200 cursor-default">
            <p className="text-sm sm:text-base text-gray-500 mb-2">Expected Rent</p>
            <p className="text-2xl sm:text-3xl font-bold text-emerald-600">{formatAmount(wolseData.expectedRent)}</p>
            <p className="text-sm sm:text-base text-gray-400 mt-2">
              at your deposit level
            </p>
          </div>

          <div className={`rounded-2xl p-5 sm:p-6 text-center shadow-sm border hover:shadow-lg transition-all duration-200 cursor-default ${
            wolseData.rentDifference <= 0
              ? 'bg-emerald-50 border-emerald-200 hover:bg-emerald-100'
              : wolseData.rentDifferencePercent <= 5
              ? 'bg-blue-50 border-blue-200 hover:bg-blue-100'
              : 'bg-red-50 border-red-200 hover:bg-red-100'
          }`}>
            <p className="text-sm sm:text-base text-gray-500 mb-2">Difference</p>
            <p className={`text-2xl sm:text-3xl font-bold ${
              wolseData.rentDifference <= 0 ? 'text-emerald-600' :
              wolseData.rentDifferencePercent <= 5 ? 'text-blue-600' : 'text-red-600'
            }`}>
              {wolseData.rentDifference >= 0 ? '+' : ''}{formatAmount(wolseData.rentDifference)}
            </p>
            <p className="text-sm sm:text-base text-gray-400 mt-2">
              {wolseData.rentDifferencePercent >= 0 ? '+' : ''}{wolseData.rentDifferencePercent.toFixed(1)}% vs expected
            </p>
          </div>
        </div>

        {/* Rent at Your Deposit Level - Scatter Plot with Regression */}
        {wolseData.recentTransactions && wolseData.recentTransactions.length > 0 && (() => {
          const now = new Date();

          // Calculate rent at user's deposit for each transaction
          const scatterData = wolseData.recentTransactions.map(tx => {
            const txDate = new Date(tx.year, tx.month - 1, tx.day);
            const daysAgo = Math.floor((now.getTime() - txDate.getTime()) / (1000 * 60 * 60 * 24));
            const impliedJeonse = tx.deposit + tx.monthlyRent * 12 / CONVERSION_RATE;
            const rentAtRef = (impliedJeonse - wolseData.userDeposit) * CONVERSION_RATE / 12;

            return {
              daysAgo,
              rentAtRef: rentAtRef / 10000, // Convert to 만원
              date: `${tx.year}.${tx.month}.${tx.day}`,
              deposit: tx.deposit / 10000,
              monthlyRent: tx.monthlyRent / 10000,
            };
          }).sort((a, b) => b.daysAgo - a.daysAgo); // Sort oldest first

          if (scatterData.length < 2) return null;

          // Calculate Theil-Sen regression
          const slopes: number[] = [];
          for (let i = 0; i < scatterData.length; i++) {
            for (let j = i + 1; j < scatterData.length; j++) {
              const dx = scatterData[i].daysAgo - scatterData[j].daysAgo;
              if (Math.abs(dx) > 7) {
                const dy = scatterData[i].rentAtRef - scatterData[j].rentAtRef;
                slopes.push(dy / dx);
              }
            }
          }

          let slope = 0;
          let intercept = scatterData.reduce((s, d) => s + d.rentAtRef, 0) / scatterData.length;

          if (slopes.length > 0) {
            slopes.sort((a, b) => a - b);
            slope = slopes[Math.floor(slopes.length / 2)];
            const intercepts = scatterData.map(d => d.rentAtRef - slope * d.daysAgo);
            intercepts.sort((a, b) => a - b);
            intercept = intercepts[Math.floor(intercepts.length / 2)];
          }

          // Generate regression line points (always span 12 months = 365 days)
          const maxDaysAgo = 365;
          const dataMaxDaysAgo = Math.max(...scatterData.map(d => d.daysAgo));
          const regressionLine = [
            { daysAgo: 0, rentAtRef: intercept },
            { daysAgo: Math.min(dataMaxDaysAgo, maxDaysAgo), rentAtRef: intercept + slope * Math.min(dataMaxDaysAgo, maxDaysAgo) },
          ];

          // Y-axis bounds
          const allRents = [...scatterData.map(d => d.rentAtRef), wolseData.userMonthlyRent / 10000, wolseData.expectedRent / 10000];
          const yMin = Math.floor(Math.min(...allRents) * 0.9 / 10) * 10;
          const yMax = Math.ceil(Math.max(...allRents) * 1.1 / 10) * 10;

          // X-axis: Convert daysAgo to month labels
          const formatXAxis = (daysAgo: number) => {
            const d = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
            return `${d.getMonth() + 1}월`;
          };

          return (
            <div className="bg-white rounded-2xl p-4 sm:p-6 mb-6 shadow-sm border border-gray-100 hover:shadow-lg hover:border-gray-200 transition-all duration-200">
              <h3 className="font-bold text-base sm:text-lg text-gray-900 mb-2">Rent at Your Deposit Level</h3>
              <p className="text-sm sm:text-base text-gray-500 mb-4">
                Market rent normalized to {formatAmount(wolseData.userDeposit)} deposit over the past 12 months
              </p>

              {/* Scatter Plot with Regression Line */}
              <div className="h-64 sm:h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    margin={{ top: 20, right: 30, left: 10, bottom: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      type="number"
                      dataKey="daysAgo"
                      domain={[0, maxDaysAgo]}
                      tickFormatter={formatXAxis}
                      reversed
                      tick={{ fontSize: 12, fill: '#6b7280' }}
                      axisLine={{ stroke: '#d1d5db' }}
                      label={{ value: 'Time', position: 'bottom', offset: 0, fontSize: 12, fill: '#9ca3af' }}
                    />
                    <YAxis
                      type="number"
                      dataKey="rentAtRef"
                      domain={[yMin, yMax]}
                      tick={{ fontSize: 12, fill: '#6b7280' }}
                      axisLine={{ stroke: '#d1d5db' }}
                      tickFormatter={(v) => `${v}만`}
                      label={{ value: 'Rent (만원)', angle: -90, position: 'insideLeft', offset: 10, fontSize: 12, fill: '#9ca3af' }}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          // Only show tooltip for scatter points (not regression line)
                          if (!data.date) return null;
                          return (
                            <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200 text-sm">
                              <p className="font-medium text-gray-900">{data.date}</p>
                              {data.deposit !== undefined && data.monthlyRent !== undefined && (
                                <p className="text-gray-600">Original: {data.deposit.toLocaleString()}만 / {data.monthlyRent.toLocaleString()}만</p>
                              )}
                              <p className="text-blue-600 font-medium">At your deposit: {data.rentAtRef.toFixed(0)}만</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />

                    {/* User's Rent Reference Line */}
                    <ReferenceLine
                      y={wolseData.userMonthlyRent / 10000}
                      stroke={wolseData.rentDifference <= 0 ? '#10b981' : wolseData.rentDifferencePercent <= 10 ? '#f59e0b' : '#ef4444'}
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      label={{
                        value: `Your Rent: ${(wolseData.userMonthlyRent / 10000).toFixed(0)}만`,
                        position: 'right',
                        fill: wolseData.rentDifference <= 0 ? '#10b981' : wolseData.rentDifferencePercent <= 10 ? '#f59e0b' : '#ef4444',
                        fontSize: 11,
                      }}
                    />

                    {/* Expected Rent Reference Line */}
                    <ReferenceLine
                      y={wolseData.expectedRent / 10000}
                      stroke="#10b981"
                      strokeWidth={2}
                      label={{
                        value: `Expected: ${(wolseData.expectedRent / 10000).toFixed(0)}만`,
                        position: 'insideTopRight',
                        fill: '#10b981',
                        fontSize: 11,
                      }}
                    />

                    {/* Regression Line */}
                    <Line
                      data={regressionLine}
                      type="linear"
                      dataKey="rentAtRef"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={false}
                      legendType="none"
                    />

                    {/* Scatter Points - using Line with dots only */}
                    <Line
                      data={scatterData}
                      type="monotone"
                      dataKey="rentAtRef"
                      stroke="transparent"
                      dot={{ fill: '#3b82f6', fillOpacity: 0.6, r: 5 }}
                      activeDot={{ fill: '#3b82f6', r: 7 }}
                      isAnimationActive={false}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              {/* Legend */}
              <div className="flex flex-wrap items-center gap-3 sm:gap-4 mt-4 text-xs sm:text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500 opacity-60" />
                  <span className="text-gray-600">Market transactions</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-0.5 bg-blue-500" />
                  <span className="text-gray-600">Trend line</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-0.5 bg-emerald-500" />
                  <span className="text-gray-600">Expected rent</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-0.5 border-t-2 border-dashed" style={{ borderColor: wolseData.rentDifference <= 0 ? '#10b981' : wolseData.rentDifferencePercent <= 10 ? '#f59e0b' : '#ef4444' }} />
                  <span className="text-gray-600">Your rent</span>
                </div>
              </div>

              {/* Assessment Badge */}
              <div className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-full ${style.bg} ${style.border} border mt-4`}>
                <span className="text-lg">{style.icon}</span>
                <span className={`font-semibold text-sm sm:text-base ${style.color}`}>{style.label}</span>
                <span className={`text-xs sm:text-sm ${style.color}`}>
                  ({wolseData.rentDifference >= 0 ? '+' : ''}{(wolseData.rentDifference / 10000).toFixed(0)}만, {wolseData.rentDifferencePercent >= 0 ? '+' : ''}{wolseData.rentDifferencePercent.toFixed(1)}%)
                </span>
              </div>

              {wolseData.assessmentDetails && (
                <p className="mt-4 text-gray-600 text-sm sm:text-base">{wolseData.assessmentDetails}</p>
              )}

              {/* Warning for Good Deal / Fair Price */}
              {(wolseData.assessment === 'GOOD_DEAL' || wolseData.assessment === 'FAIR') && (
                <div className="mt-4 p-4 sm:p-5 rounded-xl bg-amber-50 border border-amber-200">
                  <div className="flex items-start gap-3">
                    <span className="text-xl sm:text-2xl">⚠️</span>
                    <div>
                      <p className="font-semibold text-amber-900 text-sm sm:text-base">
                        {wolseData.assessment === 'GOOD_DEAL' ? 'Verify Why Price is Low' : 'Check Physical Condition'}
                      </p>
                      <p className="text-sm sm:text-base text-amber-700 mt-1">
                        {wolseData.assessment === 'GOOD_DEAL'
                          ? 'Below-market prices often have reasons. Check for physical issues (leaks, mold, noise), neighborhood problems, or why the landlord needs to rent quickly.'
                          : 'Visit the property to check for physical issues like water damage, mold, noise levels, and overall maintenance condition.'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* Savings Potential */}
        {wolseData.savingsPotential.vsMarket > 0 && (
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl p-4 sm:p-6 mb-6 border border-amber-200 hover:shadow-lg transition-all duration-200">
            <h3 className="font-bold text-base sm:text-lg text-gray-900 mb-4 flex items-center gap-2">
              <span className="text-xl sm:text-2xl">💰</span>
              Potential Savings
            </h3>
            <div className="p-4 sm:p-5 rounded-xl bg-white/50 hover:bg-white hover:shadow-md transition-all duration-200 cursor-default">
              <p className="text-sm sm:text-base text-gray-600">If negotiated to expected rent:</p>
              <p className="text-xl sm:text-2xl font-bold text-amber-700 mt-1">{formatAmount(wolseData.savingsPotential.vsMarket)}/year</p>
            </div>
          </div>
        )}

        {/* Price Trend */}
        {wolseData.trend && (
          <div className="bg-white rounded-2xl p-4 sm:p-6 mb-6 shadow-sm border border-gray-100 hover:shadow-lg hover:border-gray-200 transition-all duration-200">
            <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span className="text-xl sm:text-2xl">{getTrendIcon(wolseData.trend.direction)}</span>
              Price Trend
            </h3>
            <p className="text-sm sm:text-base text-gray-600 leading-relaxed">{wolseData.trend.advice}</p>
            <div className="mt-4 flex flex-wrap items-center gap-3 sm:gap-4 text-sm sm:text-base text-gray-500">
              <span>Direction: <strong className="text-gray-900">{wolseData.trend.direction}</strong></span>
              <span>Change: <strong className="text-gray-900">{wolseData.trend.percentage.toFixed(1)}%</strong> over 12 months</span>
            </div>
          </div>
        )}

        {/* Recent Transactions */}
        {wolseData.recentTransactions && wolseData.recentTransactions.length > 0 && (
          <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-gray-100 hover:shadow-lg hover:border-gray-200 transition-all duration-200">
            <h3 className="font-bold text-base sm:text-lg text-gray-900 mb-4 flex items-center gap-2">
              <span className="text-xl sm:text-2xl">📊</span>
              Recent Transactions ({wolseData.recentTransactions.length} contracts)
            </h3>
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <table className="w-full text-sm sm:text-base min-w-[450px]">
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    <th className="text-left py-3 sm:py-4 px-3 text-xs sm:text-sm font-semibold text-gray-500 uppercase">Date</th>
                    <th className="text-left py-3 sm:py-4 px-3 text-xs sm:text-sm font-semibold text-gray-500 uppercase">Area</th>
                    <th className="text-left py-3 sm:py-4 px-3 text-xs sm:text-sm font-semibold text-gray-500 uppercase">Floor</th>
                    <th className="text-right py-3 sm:py-4 px-3 text-xs sm:text-sm font-semibold text-gray-500 uppercase">Deposit</th>
                    <th className="text-right py-3 sm:py-4 px-3 text-xs sm:text-sm font-semibold text-gray-500 uppercase">Monthly</th>
                  </tr>
                </thead>
                <tbody>
                  {wolseData.recentTransactions.slice(0, 10).map((tx, index) => (
                    <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 sm:py-4 px-3 text-gray-600">
                        {tx.year}.{tx.month.toString().padStart(2, '0')}.{tx.day.toString().padStart(2, '0')}
                      </td>
                      <td className="py-3 sm:py-4 px-3 text-gray-600">{tx.exclusiveArea.toFixed(1)}㎡</td>
                      <td className="py-3 sm:py-4 px-3 text-gray-600">{tx.floor}F</td>
                      <td className="py-3 sm:py-4 px-3 text-right font-medium text-gray-900">{formatAmount(tx.deposit)}</td>
                      <td className="py-3 sm:py-4 px-3 text-right font-medium text-gray-900">{formatAmount(tx.monthlyRent)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Jeonse Market Position
  if (reportType === 'jeonse' && jeonseData) {
    const style = jeonseData.assessment ? getAssessmentStyle(jeonseData.assessment) : null;
    const hasAnalysis = jeonseData.expectedJeonse !== null && jeonseData.expectedJeonse !== undefined &&
                        jeonseData.transactionData && jeonseData.transactionData.length > 0;

    return (
      <div className="mb-12">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-8 flex items-center gap-3">
          <span className="text-3xl">📊</span>
          Market Position
        </h2>

        {/* Key Metrics - Only show if we have analysis data */}
        {hasAnalysis && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-6">
            <div className="bg-white rounded-2xl p-5 sm:p-6 text-center shadow-sm border border-gray-100 hover:shadow-lg hover:border-gray-200 transition-all duration-200 cursor-default">
              <p className="text-sm sm:text-base text-gray-500 mb-2">Your Jeonse</p>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900">{formatAmount(jeonseData.proposedJeonse)}</p>
            </div>

            <div className="bg-white rounded-2xl p-5 sm:p-6 text-center shadow-sm border border-gray-100 hover:shadow-lg hover:border-gray-200 transition-all duration-200 cursor-default">
              <p className="text-sm sm:text-base text-gray-500 mb-2">Expected Jeonse</p>
              <p className="text-2xl sm:text-3xl font-bold text-emerald-600">{formatAmount(jeonseData.expectedJeonse!)}</p>
              <p className="text-sm sm:text-base text-gray-400 mt-2">
                based on {jeonseData.contractCount || 0} recent contracts
              </p>
            </div>

            <div className={`rounded-2xl p-5 sm:p-6 text-center shadow-sm border hover:shadow-lg transition-all duration-200 cursor-default ${
              (jeonseData.jeonseDifference || 0) <= 0
                ? 'bg-emerald-50 border-emerald-200 hover:bg-emerald-100'
                : (jeonseData.jeonseDifferencePercent || 0) <= 5
                ? 'bg-blue-50 border-blue-200 hover:bg-blue-100'
                : 'bg-red-50 border-red-200 hover:bg-red-100'
            }`}>
              <p className="text-sm sm:text-base text-gray-500 mb-2">Difference</p>
              <p className={`text-2xl sm:text-3xl font-bold ${
                (jeonseData.jeonseDifference || 0) <= 0 ? 'text-emerald-600' :
                (jeonseData.jeonseDifferencePercent || 0) <= 5 ? 'text-blue-600' : 'text-red-600'
              }`}>
                {(jeonseData.jeonseDifference || 0) >= 0 ? '+' : ''}{formatAmount(jeonseData.jeonseDifference || 0)}
              </p>
              <p className="text-sm sm:text-base text-gray-400 mt-2">
                {(jeonseData.jeonseDifferencePercent || 0) >= 0 ? '+' : ''}{(jeonseData.jeonseDifferencePercent || 0).toFixed(1)}% vs expected
              </p>
            </div>
          </div>
        )}

        {/* Scatter Plot with Regression Line */}
        {jeonseData.transactionData && jeonseData.transactionData.length >= 2 && jeonseData.regressionLine && (() => {
          const now = new Date();
          const scatterData = [...jeonseData.transactionData].sort((a, b) => b.daysAgo - a.daysAgo);

          // Y-axis bounds (in 억)
          const userJeonseInEok = jeonseData.proposedJeonse / 100000000;
          const expectedInEok = (jeonseData.expectedJeonse || 0) / 100000000;
          const allPrices = [...scatterData.map(d => d.price), userJeonseInEok, expectedInEok];
          const yMin = Math.floor(Math.min(...allPrices) * 0.9 * 10) / 10;
          const yMax = Math.ceil(Math.max(...allPrices) * 1.1 * 10) / 10;

          // X-axis: always span 12 months
          const maxDaysAgo = 365;
          const dataMaxDaysAgo = Math.max(...scatterData.map(d => d.daysAgo));

          // Generate regression line points
          const regressionLineData = [
            { daysAgo: 0, price: jeonseData.regressionLine!.intercept },
            { daysAgo: Math.min(dataMaxDaysAgo, maxDaysAgo), price: jeonseData.regressionLine!.intercept + jeonseData.regressionLine!.slope * Math.min(dataMaxDaysAgo, maxDaysAgo) },
          ];

          // Format X-axis to show months
          const formatXAxis = (daysAgo: number) => {
            const d = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
            return `${d.getMonth() + 1}월`;
          };

          return (
            <div className="bg-white rounded-2xl p-4 sm:p-6 mb-6 shadow-sm border border-gray-100 hover:shadow-lg hover:border-gray-200 transition-all duration-200">
              <h3 className="font-bold text-base sm:text-lg text-gray-900 mb-2">Jeonse Market Transactions</h3>
              <p className="text-sm sm:text-base text-gray-500 mb-4">
                Recent jeonse transactions for similar units over the past 12 months
              </p>

              {/* Scatter Plot */}
              <div className="h-64 sm:h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    margin={{ top: 20, right: 30, left: 10, bottom: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      type="number"
                      dataKey="daysAgo"
                      domain={[0, maxDaysAgo]}
                      tickFormatter={formatXAxis}
                      reversed
                      tick={{ fontSize: 12, fill: '#6b7280' }}
                      axisLine={{ stroke: '#d1d5db' }}
                      label={{ value: 'Time', position: 'bottom', offset: 0, fontSize: 12, fill: '#9ca3af' }}
                    />
                    <YAxis
                      type="number"
                      dataKey="price"
                      domain={[yMin, yMax]}
                      tick={{ fontSize: 12, fill: '#6b7280' }}
                      axisLine={{ stroke: '#d1d5db' }}
                      tickFormatter={(v) => `${v.toFixed(1)}억`}
                      label={{ value: 'Jeonse (억)', angle: -90, position: 'insideLeft', offset: 10, fontSize: 12, fill: '#9ca3af' }}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          if (!data.date) return null;
                          return (
                            <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200 text-sm">
                              <p className="font-medium text-gray-900">{data.date}</p>
                              <p className="text-gray-600">{data.exclusiveArea?.toFixed(1)}㎡ · {data.floor}F</p>
                              <p className="text-blue-600 font-medium">{data.price.toFixed(2)}억</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />

                    {/* User's Jeonse Reference Line */}
                    <ReferenceLine
                      y={userJeonseInEok}
                      stroke={(jeonseData.jeonseDifference || 0) <= 0 ? '#10b981' : (jeonseData.jeonseDifferencePercent || 0) <= 10 ? '#f59e0b' : '#ef4444'}
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      label={{
                        value: `Your Jeonse: ${userJeonseInEok.toFixed(2)}억`,
                        position: 'right',
                        fill: (jeonseData.jeonseDifference || 0) <= 0 ? '#10b981' : (jeonseData.jeonseDifferencePercent || 0) <= 10 ? '#f59e0b' : '#ef4444',
                        fontSize: 11,
                      }}
                    />

                    {/* Expected Jeonse Reference Line */}
                    <ReferenceLine
                      y={expectedInEok}
                      stroke="#10b981"
                      strokeWidth={2}
                      label={{
                        value: `Expected: ${expectedInEok.toFixed(2)}억`,
                        position: 'insideTopRight',
                        fill: '#10b981',
                        fontSize: 11,
                      }}
                    />

                    {/* Regression Line */}
                    <Line
                      data={regressionLineData}
                      type="linear"
                      dataKey="price"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={false}
                      legendType="none"
                    />

                    {/* Scatter Points */}
                    <Line
                      data={scatterData}
                      type="monotone"
                      dataKey="price"
                      stroke="transparent"
                      dot={{ fill: '#3b82f6', fillOpacity: 0.6, r: 5 }}
                      activeDot={{ fill: '#3b82f6', r: 7 }}
                      isAnimationActive={false}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              {/* Legend */}
              <div className="flex flex-wrap items-center gap-3 sm:gap-4 mt-4 text-xs sm:text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500 opacity-60" />
                  <span className="text-gray-600">Market transactions</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-0.5 bg-blue-500" />
                  <span className="text-gray-600">Trend line</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-0.5 bg-emerald-500" />
                  <span className="text-gray-600">Expected jeonse</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-0.5 border-t-2 border-dashed" style={{ borderColor: (jeonseData.jeonseDifference || 0) <= 0 ? '#10b981' : (jeonseData.jeonseDifferencePercent || 0) <= 10 ? '#f59e0b' : '#ef4444' }} />
                  <span className="text-gray-600">Your jeonse</span>
                </div>
              </div>

              {/* Assessment Badge */}
              {style && (
                <div className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-full ${style.bg} ${style.border} border mt-4`}>
                  <span className="text-lg">{style.icon}</span>
                  <span className={`font-semibold text-sm sm:text-base ${style.color}`}>{style.label}</span>
                  <span className={`text-xs sm:text-sm ${style.color}`}>
                    ({(jeonseData.jeonseDifference || 0) >= 0 ? '+' : ''}{((jeonseData.jeonseDifference || 0) / 100000000).toFixed(2)}억, {(jeonseData.jeonseDifferencePercent || 0) >= 0 ? '+' : ''}{(jeonseData.jeonseDifferencePercent || 0).toFixed(1)}%)
                  </span>
                </div>
              )}

              {jeonseData.assessmentDetails && (
                <p className="mt-4 text-gray-600 text-sm sm:text-base">{jeonseData.assessmentDetails}</p>
              )}

              {/* Warning for Good Deal / Fair Price */}
              {jeonseData.assessment && (jeonseData.assessment === 'GOOD_DEAL' || jeonseData.assessment === 'FAIR') && (
                <div className="mt-4 p-4 sm:p-5 rounded-xl bg-amber-50 border border-amber-200">
                  <div className="flex items-start gap-3">
                    <span className="text-xl sm:text-2xl">⚠️</span>
                    <div>
                      <p className="font-semibold text-amber-900 text-sm sm:text-base">
                        {jeonseData.assessment === 'GOOD_DEAL' ? 'Verify Why Price is Low' : 'Check Physical Condition'}
                      </p>
                      <p className="text-sm sm:text-base text-amber-700 mt-1">
                        {jeonseData.assessment === 'GOOD_DEAL'
                          ? 'Below-market jeonse often has reasons. Check for physical issues (leaks, mold, noise), building maintenance, or why the landlord needs funds urgently.'
                          : 'Visit the property to check for physical issues like water damage, mold, noise levels, and overall maintenance condition.'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* Potential Savings */}
        {jeonseData.potentialSavings && jeonseData.potentialSavings > 0 && (
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl p-4 sm:p-6 mb-6 border border-amber-200 hover:shadow-lg transition-all duration-200">
            <h3 className="font-bold text-base sm:text-lg text-gray-900 mb-4 flex items-center gap-2">
              <span className="text-xl sm:text-2xl">💰</span>
              Potential Savings
            </h3>
            <div className="p-4 sm:p-5 rounded-xl bg-white/50 hover:bg-white hover:shadow-md transition-all duration-200 cursor-default">
              <p className="text-sm sm:text-base text-gray-600">If negotiated to expected jeonse:</p>
              <p className="text-xl sm:text-2xl font-bold text-amber-700 mt-1">{formatAmount(jeonseData.potentialSavings)}</p>
            </div>
          </div>
        )}

        {/* Price Trend */}
        {jeonseData.trend && (
          <div className="bg-white rounded-2xl p-4 sm:p-6 mb-6 shadow-sm border border-gray-100 hover:shadow-lg hover:border-gray-200 transition-all duration-200">
            <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span className="text-xl sm:text-2xl">{getTrendIcon(jeonseData.trend.direction)}</span>
              Price Trend
            </h3>
            <p className="text-sm sm:text-base text-gray-600 leading-relaxed">{jeonseData.trend.advice}</p>
            <div className="mt-4 flex flex-wrap items-center gap-3 sm:gap-4 text-sm sm:text-base text-gray-500">
              <span>Direction: <strong className="text-gray-900">{jeonseData.trend.direction}</strong></span>
              <span>Change: <strong className="text-gray-900">{jeonseData.trend.percentage.toFixed(1)}%</strong> annually</span>
            </div>
          </div>
        )}

        {/* Recent Transactions Table */}
        {jeonseData.transactionData && jeonseData.transactionData.length > 0 && (
          <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-gray-100 hover:shadow-lg hover:border-gray-200 transition-all duration-200">
            <h3 className="font-bold text-base sm:text-lg text-gray-900 mb-4 flex items-center gap-2">
              <span className="text-xl sm:text-2xl">📋</span>
              Recent Transactions ({jeonseData.transactionData.length} contracts)
            </h3>
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <table className="w-full text-sm sm:text-base min-w-[400px]">
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    <th className="text-left py-3 sm:py-4 px-3 text-xs sm:text-sm font-semibold text-gray-500 uppercase">Date</th>
                    <th className="text-left py-3 sm:py-4 px-3 text-xs sm:text-sm font-semibold text-gray-500 uppercase">Area</th>
                    <th className="text-left py-3 sm:py-4 px-3 text-xs sm:text-sm font-semibold text-gray-500 uppercase">Floor</th>
                    <th className="text-right py-3 sm:py-4 px-3 text-xs sm:text-sm font-semibold text-gray-500 uppercase">Jeonse</th>
                  </tr>
                </thead>
                <tbody>
                  {jeonseData.transactionData.slice(0, 10).map((tx, index) => (
                    <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 sm:py-4 px-3 text-gray-600">{tx.date}</td>
                      <td className="py-3 sm:py-4 px-3 text-gray-600">{tx.exclusiveArea?.toFixed(1)}㎡</td>
                      <td className="py-3 sm:py-4 px-3 text-gray-600">{tx.floor}F</td>
                      <td className="py-3 sm:py-4 px-3 text-right font-medium text-gray-900">{tx.price.toFixed(2)}억</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Fallback: Show old view if no analysis data */}
        {!hasAnalysis && (
          <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-gray-100">
            {/* Price Comparison */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6">
              <div className="text-center p-4 sm:p-5 rounded-xl bg-gray-50 border border-gray-100 hover:bg-white hover:shadow-md hover:border-gray-200 transition-all duration-200 cursor-default">
                <p className="text-xs sm:text-sm text-gray-500 mb-1">Your Jeonse</p>
                <p className="text-lg sm:text-xl font-bold text-gray-900">{formatAmount(jeonseData.proposedJeonse)}</p>
              </div>
              {jeonseData.estimatedValue && (
                <div className="text-center p-4 sm:p-5 rounded-xl bg-gray-50 border border-gray-100 hover:bg-white hover:shadow-md hover:border-gray-200 transition-all duration-200 cursor-default">
                  <p className="text-xs sm:text-sm text-gray-500 mb-1">Est. Market Value</p>
                  <p className="text-lg sm:text-xl font-bold text-gray-900">{formatAmount(jeonseData.estimatedValue)}</p>
                </div>
              )}
              {jeonseData.estimatedValue && (
                <div className="text-center p-4 sm:p-5 rounded-xl bg-amber-50 border border-amber-100 hover:bg-amber-100 hover:shadow-md transition-all duration-200 cursor-default">
                  <p className="text-xs sm:text-sm text-amber-600 mb-1">Jeonse Ratio</p>
                  <p className="text-lg sm:text-xl font-bold text-amber-700">{((jeonseData.proposedJeonse / jeonseData.estimatedValue) * 100).toFixed(1)}%</p>
                </div>
              )}
              <div className="text-center p-4 sm:p-5 rounded-xl bg-gray-50 border border-gray-100 hover:bg-white hover:shadow-md hover:border-gray-200 transition-all duration-200 cursor-default">
                <p className="text-xs sm:text-sm text-gray-500 mb-1">Market Trend</p>
                <p className={`text-lg sm:text-xl font-bold ${
                  jeonseData.marketTrend === 'rising' ? 'text-emerald-600' :
                  jeonseData.marketTrend === 'falling' ? 'text-red-600' : 'text-gray-600'
                }`}>
                  {jeonseData.marketTrend === 'rising' ? '📈 Rising' :
                   jeonseData.marketTrend === 'falling' ? '📉 Falling' : '➡️ Stable'}
                </p>
              </div>
            </div>

            {/* Price Range */}
            {jeonseData.valueLow && jeonseData.valueHigh && (
              <div className="p-4 sm:p-5 rounded-xl bg-blue-50 border border-blue-100 hover:bg-blue-100 hover:shadow-md transition-all duration-200 cursor-default">
                <p className="text-sm sm:text-base text-blue-700 mb-2">Estimated Value Range</p>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm sm:text-base text-blue-800">{formatAmount(jeonseData.valueLow)}</span>
                  <div className="flex-1 mx-3 sm:mx-4 h-2 sm:h-3 bg-blue-200 rounded-full relative">
                    {jeonseData.valueMid && (
                      <div
                        className="absolute top-0 w-3 h-3 sm:w-4 sm:h-4 bg-blue-600 rounded-full -mt-0.5 sm:-mt-1"
                        style={{
                          left: `${((jeonseData.valueMid - jeonseData.valueLow) / (jeonseData.valueHigh - jeonseData.valueLow)) * 100}%`,
                          transform: 'translateX(-50%)'
                        }}
                      />
                    )}
                  </div>
                  <span className="font-semibold text-sm sm:text-base text-blue-800">{formatAmount(jeonseData.valueHigh)}</span>
                </div>
                {jeonseData.confidence && (
                  <p className="text-xs sm:text-sm text-blue-600 mt-2">
                    Confidence: {(jeonseData.confidence * 100).toFixed(0)}%
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return null;
}
