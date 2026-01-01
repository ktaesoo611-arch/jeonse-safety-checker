'use client';

import MarketPositionSection from '@/components/report/MarketPositionSection';

// Mock data for testing the chart
const mockWolseData = {
  userDeposit: 200000000, // 2억
  userMonthlyRent: 3500000, // 350만
  userRate: 5.2,
  marketRate: 4.5,
  marketRateRange: { low: 4.0, high: 5.0 },
  legalRate: 4.5,
  expectedRent: 3121000, // 312.1만
  rentDifference: 379000, // +37.9만
  rentDifferencePercent: 12.2,
  assessment: 'OVERPRICED' as const,
  assessmentDetails: 'You are paying 37.9만원 more than the expected market rent of 312.1만원. Consider negotiating.',
  contractCount: 66,
  confidenceLevel: 'HIGH',
  savingsPotential: {
    vsMarket: 4548000,
    vsLegal: 0
  },
  trend: {
    direction: 'DECLINING' as const,
    percentage: 8.5,
    advice: 'Market rents are declining. Good time to negotiate.'
  },
  recentTransactions: [
    { year: 2025, month: 12, day: 28, exclusiveArea: 84.9, floor: 15, deposit: 500000000, monthlyRent: 1700000 },
    { year: 2025, month: 12, day: 20, exclusiveArea: 84.5, floor: 10, deposit: 450000000, monthlyRent: 1900000 },
    { year: 2025, month: 12, day: 15, exclusiveArea: 84.2, floor: 8, deposit: 400000000, monthlyRent: 2100000 },
    { year: 2025, month: 11, day: 28, exclusiveArea: 84.8, floor: 12, deposit: 550000000, monthlyRent: 1500000 },
    { year: 2025, month: 11, day: 15, exclusiveArea: 84.3, floor: 5, deposit: 300000000, monthlyRent: 2800000 },
    { year: 2025, month: 11, day: 10, exclusiveArea: 84.6, floor: 18, deposit: 350000000, monthlyRent: 2500000 },
    { year: 2025, month: 10, day: 25, exclusiveArea: 84.1, floor: 7, deposit: 480000000, monthlyRent: 1800000 },
    { year: 2025, month: 10, day: 18, exclusiveArea: 84.7, floor: 14, deposit: 420000000, monthlyRent: 2000000 },
    { year: 2025, month: 10, day: 5, exclusiveArea: 84.4, floor: 9, deposit: 380000000, monthlyRent: 2200000 },
    { year: 2025, month: 9, day: 20, exclusiveArea: 84.9, floor: 16, deposit: 520000000, monthlyRent: 1600000 },
    { year: 2025, month: 9, day: 12, exclusiveArea: 84.2, floor: 6, deposit: 280000000, monthlyRent: 2900000 },
    { year: 2025, month: 9, day: 5, exclusiveArea: 84.5, floor: 11, deposit: 460000000, monthlyRent: 1850000 },
    { year: 2025, month: 8, day: 28, exclusiveArea: 84.3, floor: 4, deposit: 320000000, monthlyRent: 2700000 },
    { year: 2025, month: 8, day: 15, exclusiveArea: 84.8, floor: 13, deposit: 490000000, monthlyRent: 1750000 },
    { year: 2025, month: 8, day: 8, exclusiveArea: 84.6, floor: 17, deposit: 440000000, monthlyRent: 1950000 },
    { year: 2025, month: 7, day: 22, exclusiveArea: 84.1, floor: 3, deposit: 260000000, monthlyRent: 3100000 },
    { year: 2025, month: 7, day: 10, exclusiveArea: 84.4, floor: 8, deposit: 370000000, monthlyRent: 2300000 },
    { year: 2025, month: 6, day: 28, exclusiveArea: 84.7, floor: 15, deposit: 510000000, monthlyRent: 1650000 },
    { year: 2025, month: 6, day: 15, exclusiveArea: 84.2, floor: 6, deposit: 340000000, monthlyRent: 2600000 },
    { year: 2025, month: 6, day: 5, exclusiveArea: 84.9, floor: 12, deposit: 450000000, monthlyRent: 1900000 },
    { year: 2025, month: 5, day: 20, exclusiveArea: 84.5, floor: 10, deposit: 400000000, monthlyRent: 2150000 },
    { year: 2025, month: 5, day: 10, exclusiveArea: 84.3, floor: 7, deposit: 360000000, monthlyRent: 2400000 },
    { year: 2025, month: 4, day: 25, exclusiveArea: 84.8, floor: 14, deposit: 480000000, monthlyRent: 1800000 },
    { year: 2025, month: 4, day: 12, exclusiveArea: 84.6, floor: 5, deposit: 300000000, monthlyRent: 2850000 },
    { year: 2025, month: 3, day: 28, exclusiveArea: 84.1, floor: 11, deposit: 430000000, monthlyRent: 2050000 },
    { year: 2025, month: 3, day: 15, exclusiveArea: 84.4, floor: 9, deposit: 390000000, monthlyRent: 2250000 },
    { year: 2025, month: 2, day: 20, exclusiveArea: 84.7, floor: 16, deposit: 530000000, monthlyRent: 1550000 },
    { year: 2025, month: 2, day: 8, exclusiveArea: 84.2, floor: 4, deposit: 250000000, monthlyRent: 3200000 },
    { year: 2025, month: 1, day: 25, exclusiveArea: 84.9, floor: 13, deposit: 470000000, monthlyRent: 1850000 },
    { year: 2025, month: 1, day: 10, exclusiveArea: 84.5, floor: 8, deposit: 350000000, monthlyRent: 2550000 },
  ],
  impliedJeonseToday: 1032000000, // 10.32억
  userImpliedJeonse: 1133000000, // 11.33억
};

export default function TestChartPage() {
  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Chart Test Page</h1>
        <MarketPositionSection
          reportType="wolse"
          wolseData={mockWolseData}
        />
      </div>
    </div>
  );
}
