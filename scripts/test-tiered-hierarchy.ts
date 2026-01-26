/**
 * Tiered Hierarchy Valuation Approach
 *
 * Instead of auto-classifying, present estimates for each tier
 * and guide user to select based on qualitative factors.
 *
 * Run with: npx tsx scripts/test-tiered-hierarchy.ts
 */

import { config } from 'dotenv';
config({ path: '.env.local' });
import axios from 'axios';

interface Transaction {
  date: string;
  amount: number;
  area: number;
  floor: number;
  buildingYear?: number;
  buildingName?: string;
  legalDong: string;
  unitPrice: number;
  daysAgo: number;
  qualityTier?: QualityTier;
}

type QualityTier = 'budget' | 'standard' | 'mid' | 'premium';

const QUALITY_TIERS: Record<QualityTier, { min: number; max: number; label: string }> = {
  budget:   { min: 0,    max: 1200, label: 'Budget' },
  standard: { min: 1200, max: 1500, label: 'Standard' },
  mid:      { min: 1500, max: 1900, label: 'Mid' },
  premium:  { min: 1900, max: Infinity, label: 'Premium' },
};

// ═══════════════════════════════════════════════════════════════════
// TARGET PROPERTY
// ═══════════════════════════════════════════════════════════════════
const TARGET = {
  dong: '도선동',
  address: '329-1',
  floor: 2,
  exclusiveArea: 12.18,
  buildingYear: 0,  // Will determine from data
  // For validation (if known)
  actualTransaction: 0,
  actualListPrice: 0,
  // Nearby dongs for expanded search
  nearbyDongs: ['도선동', '신답동', '용답동', '마장동', '사근동'],
};

const LAWD_CD = '11200';
const RECENCY_HALFLIFE = 60;
const AREA_FILTER_PERCENT = 30;

function classifyQualityTier(unitPrice: number): QualityTier {
  const priceIn만 = unitPrice / 10000;
  if (priceIn만 < 1200) return 'budget';
  if (priceIn만 < 1500) return 'standard';
  if (priceIn만 < 1900) return 'mid';
  return 'premium';
}

async function fetchTransactions(apiKey: string, lawdCd: string): Promise<Transaction[]> {
  const allTransactions: Transaction[] = [];
  const today = new Date();
  const now = today.getTime();

  for (let i = 0; i < 12; i++) {
    const targetDate = new Date(today);
    targetDate.setMonth(today.getMonth() - i);
    const yearMonth = `${targetDate.getFullYear()}${(targetDate.getMonth() + 1).toString().padStart(2, '0')}`;

    try {
      const response = await axios.get(
        'https://apis.data.go.kr/1613000/RTMSDataSvcRHTrade/getRTMSDataSvcRHTrade',
        {
          params: { serviceKey: apiKey, pageNo: 1, numOfRows: 1000, LAWD_CD: lawdCd, DEAL_YMD: yearMonth },
          timeout: 30000
        }
      );

      const items = response.data.response?.body?.items?.item || [];
      const transactions = Array.isArray(items) ? items : [items];

      transactions.forEach((item: any) => {
        const amount = parseInt(String(item.dealAmount).replace(/,/g, '')) * 10000;
        const area = parseFloat(item.excluUseAr || '0');
        const txnDate = new Date(parseInt(item.dealYear), parseInt(item.dealMonth) - 1, parseInt(item.dealDay));
        const daysAgo = Math.floor((now - txnDate.getTime()) / (1000 * 60 * 60 * 24));
        const unitPrice = area > 0 ? amount / area : 0;

        allTransactions.push({
          date: `${item.dealYear}-${String(item.dealMonth).padStart(2, '0')}-${String(item.dealDay).padStart(2, '0')}`,
          amount, area,
          floor: parseInt(item.floor || '1'),
          buildingYear: item.buildYear ? parseInt(item.buildYear) : undefined,
          buildingName: item.aptNm?.trim() || '',
          legalDong: item.umdNm?.trim() || '',
          unitPrice, daysAgo,
          qualityTier: classifyQualityTier(unitPrice)
        });
      });
    } catch (error) {}
  }

  return allTransactions;
}

function calculateTierEstimate(
  transactions: Transaction[],
  targetArea: number,
  targetBuildingYear: number,
  tier: QualityTier
): { value: number; unitPrice: number; txnCount: number; effectiveSample: number; recentTxns: Transaction[] } {
  const currentYear = new Date().getFullYear();
  const areaTolerance = targetArea * (AREA_FILTER_PERCENT / 100);

  const filtered = transactions.filter(t =>
    Math.abs(t.area - targetArea) <= areaTolerance &&
    t.unitPrice > 0 &&
    t.qualityTier === tier
  );

  if (filtered.length === 0) {
    return { value: 0, unitPrice: 0, txnCount: 0, effectiveSample: 0, recentTxns: [] };
  }

  // Simple depreciation rate by tier (could be calibrated)
  const tierDepreciation: Record<QualityTier, number> = {
    budget: 0.02,    // 2%/yr - older buildings depreciate more
    standard: 0.015, // 1.5%/yr
    mid: 0.01,       // 1%/yr
    premium: 0.005,  // 0.5%/yr - premium buildings hold value
  };
  const depRate = tierDepreciation[tier];

  const weighted = filtered.map(t => {
    const recencyWeight = Math.exp(-t.daysAgo / RECENCY_HALFLIFE);
    let ageAdjustment = 1.0;
    if (targetBuildingYear && t.buildingYear) {
      const yearDiff = targetBuildingYear - t.buildingYear;
      ageAdjustment = 1 + (yearDiff * depRate);
      ageAdjustment = Math.max(0.7, Math.min(1.3, ageAdjustment));
    }
    const adjustedUnitPrice = t.unitPrice * ageAdjustment;
    return { ...t, recencyWeight, ageAdjustment, adjustedUnitPrice, weightedUP: adjustedUnitPrice * recencyWeight };
  });

  const totalWeightedUP = weighted.reduce((sum, t) => sum + t.weightedUP, 0);
  const totalWeight = weighted.reduce((sum, t) => sum + t.recencyWeight, 0);
  const sumSqWeights = weighted.reduce((sum, t) => sum + Math.pow(t.recencyWeight, 2), 0);

  const avgUnitPrice = totalWeight > 0 ? totalWeightedUP / totalWeight : 0;
  const baseValue = avgUnitPrice * targetArea;

  // Floor adjustment
  const floorAdjusted = TARGET.floor === 1 ? baseValue * 0.88
    : TARGET.floor === 2 ? baseValue * 0.95
    : baseValue;

  const effectiveSample = sumSqWeights > 0 ? Math.pow(totalWeight, 2) / sumSqWeights : 0;
  const recentTxns = weighted.sort((a, b) => a.daysAgo - b.daysAgo).slice(0, 3);

  return {
    value: floorAdjusted,
    unitPrice: avgUnitPrice,
    txnCount: filtered.length,
    effectiveSample,
    recentTxns
  };
}

async function main() {
  const apiKey = process.env.MOLIT_API_KEY;
  if (!apiKey) { console.error('MOLIT_API_KEY not set'); process.exit(1); }

  const currentYear = new Date().getFullYear();

  console.log('\n' + '═'.repeat(95));
  console.log(`  TIERED HIERARCHY VALUATION: ${TARGET.dong} ${TARGET.address}`);
  console.log('═'.repeat(95));

  // Fetch transactions
  const allTransactions = await fetchTransactions(apiKey, LAWD_CD);

  // Primary dong only
  const dongTransactions = allTransactions.filter(t => t.legalDong === TARGET.dong);

  // Expanded: include nearby dongs
  const nearbyDongs = (TARGET as any).nearbyDongs || [TARGET.dong];
  const expandedTransactions = allTransactions.filter(t => nearbyDongs.includes(t.legalDong));

  // Auto-detect building year if not specified
  let targetBuildingYear = TARGET.buildingYear;
  if (!targetBuildingYear || targetBuildingYear === 0) {
    const areaTolerance = TARGET.exclusiveArea * 0.3;
    const nearbyTxns = dongTransactions.filter(t =>
      Math.abs(t.area - TARGET.exclusiveArea) <= areaTolerance && t.buildingYear
    );
    if (nearbyTxns.length > 0) {
      const yearCounts = new Map<number, number>();
      nearbyTxns.forEach(t => {
        if (t.buildingYear) yearCounts.set(t.buildingYear, (yearCounts.get(t.buildingYear) || 0) + 1);
      });
      const sorted = [...yearCounts.entries()].sort((a, b) => b[1] - a[1]);
      targetBuildingYear = sorted[0]?.[0] || 2015;
    } else {
      targetBuildingYear = 2015;
    }
    console.log(`\n  Auto-detected building year: ${targetBuildingYear}`);
  }

  const targetAge = currentYear - targetBuildingYear;

  console.log(`\n  Target: ${TARGET.dong} ${TARGET.address}`);
  console.log(`  Specs: ${TARGET.exclusiveArea}㎡ | Built ${targetBuildingYear} (${targetAge}yr) | Floor ${TARGET.floor}`);
  console.log(`\n  Data available:`);
  console.log(`    • ${TARGET.dong} only: ${dongTransactions.length} transactions`);
  console.log(`    • Nearby dongs (${nearbyDongs.join(', ')}): ${expandedTransactions.length} transactions`);

  // Calculate estimates for each tier - both primary dong and expanded
  const tiers: QualityTier[] = ['budget', 'standard', 'mid', 'premium'];

  // Primary dong estimates
  const estimatesPrimary: Record<QualityTier, ReturnType<typeof calculateTierEstimate>> = {} as any;
  tiers.forEach(tier => {
    estimatesPrimary[tier] = calculateTierEstimate(dongTransactions, TARGET.exclusiveArea, targetBuildingYear, tier);
  });

  // Expanded (nearby dongs) estimates
  const estimatesExpanded: Record<QualityTier, ReturnType<typeof calculateTierEstimate>> = {} as any;
  tiers.forEach(tier => {
    estimatesExpanded[tier] = calculateTierEstimate(expandedTransactions, TARGET.exclusiveArea, targetBuildingYear, tier);
  });

  // Display primary dong results
  console.log('\n' + '═'.repeat(95));
  console.log(`  ESTIMATED VALUES - ${TARGET.dong} ONLY (${dongTransactions.length} transactions)`);
  console.log('═'.repeat(95));

  console.log('\n  ┌─────────────────────────────────────────────────────────────────────────────────────────┐');
  console.log('  │  Tier        │ Est.Value │ Unit Price │ Txns │ Recent Comparables                      │');
  console.log('  ├─────────────────────────────────────────────────────────────────────────────────────────┤');

  tiers.forEach(tier => {
    const e = estimatesPrimary[tier];
    if (e.txnCount === 0) {
      console.log(`  │  ${QUALITY_TIERS[tier].label.padEnd(10)} │    N/A    │     N/A    │    0 │ No data                                 │`);
    } else {
      const valueStr = `${(e.value / 10000 / 10000).toFixed(2)}억`;
      const upStr = `${(e.unitPrice / 10000 / 10000).toFixed(0)}만/㎡`;
      const recentStr = e.recentTxns.slice(0, 2).map(t => `${(t.amount/10000/10000).toFixed(1)}억`).join(', ');
      console.log(`  │  ${QUALITY_TIERS[tier].label.padEnd(10)} │ ${valueStr.padStart(9)} │ ${upStr.padStart(10)} │ ${String(e.txnCount).padStart(4)} │ ${recentStr.padEnd(39)} │`);
    }
  });

  console.log('  └─────────────────────────────────────────────────────────────────────────────────────────┘');

  // Display expanded results
  console.log('\n' + '═'.repeat(95));
  console.log(`  ESTIMATED VALUES - EXPANDED (${nearbyDongs.join(', ')}) - ${expandedTransactions.length} transactions`);
  console.log('═'.repeat(95));

  console.log('\n  ┌─────────────────────────────────────────────────────────────────────────────────────────┐');
  console.log('  │  Tier        │ Est.Value │ Unit Price │ Txns │ Recent Comparables                      │');
  console.log('  ├─────────────────────────────────────────────────────────────────────────────────────────┤');

  tiers.forEach(tier => {
    const e = estimatesExpanded[tier];
    if (e.txnCount === 0) {
      console.log(`  │  ${QUALITY_TIERS[tier].label.padEnd(10)} │    N/A    │     N/A    │    0 │ No data                                 │`);
    } else {
      const valueStr = `${(e.value / 10000 / 10000).toFixed(2)}억`;
      const upStr = `${(e.unitPrice / 10000 / 10000).toFixed(0)}만/㎡`;
      const recentStr = e.recentTxns.slice(0, 2).map(t => `${(t.amount/10000/10000).toFixed(1)}억`).join(', ');
      console.log(`  │  ${QUALITY_TIERS[tier].label.padEnd(10)} │ ${valueStr.padStart(9)} │ ${upStr.padStart(10)} │ ${String(e.txnCount).padStart(4)} │ ${recentStr.padEnd(39)} │`);
    }
  });

  console.log('  └─────────────────────────────────────────────────────────────────────────────────────────┘');

  // Use expanded estimates for the guidance section
  const estimates = estimatesExpanded;

  // Guidance section
  console.log('\n' + '═'.repeat(95));
  console.log('  SELECT YOUR TIER BASED ON PROPERTY CHARACTERISTICS');
  console.log('═'.repeat(95));

  console.log('\n  ┌─────────────────────────────────────────────────────────────────────────────────────────┐');
  console.log('  │  PREMIUM (>1,900만/㎡) - Select if:                                                     │');
  console.log('  │    ✓ 역세권 (within 300m of subway station)                                            │');
  console.log('  │    ✓ Brand-name building (e.g., 아이파크, 자이, 래미안)                                │');
  console.log('  │    ✓ High-end finishes and amenities                                                   │');
  console.log('  │    ✓ Excellent maintenance and building condition                                      │');
  console.log('  │    ✓ Underground parking with high ratio (>1.0)                                        │');
  console.log('  ├─────────────────────────────────────────────────────────────────────────────────────────┤');
  console.log('  │  MID (1,500-1,900만/㎡) - Select if:                                                    │');
  console.log('  │    ✓ Moderate distance to station (300-500m)                                           │');
  console.log('  │    ✓ Standard new construction (2015+)                                                 │');
  console.log('  │    ✓ Elevator available                                                                │');
  console.log('  │    ✓ Adequate parking                                                                  │');
  console.log('  │    ✓ Average building condition                                                        │');
  console.log('  ├─────────────────────────────────────────────────────────────────────────────────────────┤');
  console.log('  │  STANDARD (1,200-1,500만/㎡) - Select if:                                               │');
  console.log('  │    ✓ Far from station (>500m)                                                          │');
  console.log('  │    ✓ Older construction (2000-2015)                                                    │');
  console.log('  │    ✓ Basic amenities only                                                              │');
  console.log('  │    ✓ Limited or no elevator                                                            │');
  console.log('  │    ✓ Street parking or limited parking                                                 │');
  console.log('  ├─────────────────────────────────────────────────────────────────────────────────────────┤');
  console.log('  │  BUDGET (<1,200만/㎡) - Select if:                                                      │');
  console.log('  │    ✓ Very old building (<2000)                                                         │');
  console.log('  │    ✓ Poor condition or needs renovation                                                │');
  console.log('  │    ✓ No elevator, no parking                                                           │');
  console.log('  │    ✓ Undesirable location (noise, industrial area)                                     │');
  console.log('  └─────────────────────────────────────────────────────────────────────────────────────────┘');

  // Example selection
  console.log('\n' + '─'.repeat(95));
  console.log(`  HOW TO SELECT: ${TARGET.dong} ${TARGET.address} (${targetBuildingYear}-built, ${TARGET.exclusiveArea}㎡)`);
  console.log('─'.repeat(95));

  const premiumVal = estimates.premium.value > 0 ? `${(estimates.premium.value/10000/10000).toFixed(2)}억` : 'N/A';
  const midVal = estimates.mid.value > 0 ? `${(estimates.mid.value/10000/10000).toFixed(2)}억` : 'N/A';
  const standardVal = estimates.standard.value > 0 ? `${(estimates.standard.value/10000/10000).toFixed(2)}억` : 'N/A';
  const budgetVal = estimates.budget.value > 0 ? `${(estimates.budget.value/10000/10000).toFixed(2)}억` : 'N/A';

  console.log(`
  Property Characteristics:
    • Built: ${targetBuildingYear} (${targetAge} years old)
    • Area: ${TARGET.exclusiveArea}㎡ ${TARGET.exclusiveArea < 20 ? '→ Very small (원룸)' : TARGET.exclusiveArea < 40 ? '→ Small (원룸/투룸)' : '→ Standard'}
    • Floor: ${TARGET.floor}층

  Select based on property quality:
    ┌─────────────────────────────────────────────────────────────────────────┐
    │  If 역세권 + Brand building + High-end   → PREMIUM:  ${premiumVal.padStart(8)}       │
    │  If Moderate location + Standard new     → MID:      ${midVal.padStart(8)}       │
    │  If Far from station + Older/Basic       → STANDARD: ${standardVal.padStart(8)}       │
    │  If Poor condition + No amenities        → BUDGET:   ${budgetVal.padStart(8)}       │
    └─────────────────────────────────────────────────────────────────────────┘
  `);

  // Validation (only if actual data provided)
  if (TARGET.actualTransaction > 0) {
    console.log('─'.repeat(95));
    console.log('  VALIDATION (for reference only)');
    console.log('─'.repeat(95));

    const actualUP = (TARGET.actualTransaction * 10000) / TARGET.exclusiveArea;
    const actualTier = classifyQualityTier(actualUP);

    console.log(`
  Actual Transaction: ${TARGET.actualTransaction.toLocaleString()}만원
  Actual Unit Price: ${(actualUP/10000/10000).toFixed(0)}만/㎡ → Falls in "${QUALITY_TIERS[actualTier].label}" tier

  If user selected "${QUALITY_TIERS[actualTier].label}" tier:
    Estimated: ${(estimates[actualTier].value/10000/10000).toFixed(2)}억
    Actual: ${(TARGET.actualTransaction/10000).toFixed(2)}억
    Error: ${(((estimates[actualTier].value/10000) - TARGET.actualTransaction) / TARGET.actualTransaction * 100).toFixed(1)}%
    `);
  }

  console.log('═'.repeat(95) + '\n');
}

main().catch(console.error);
