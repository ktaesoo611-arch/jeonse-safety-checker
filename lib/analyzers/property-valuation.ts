import { MolitAPI, getDistrictCode } from '../apis/molit';
import { supabaseAdmin } from '../supabase';
import { PropertyDetails, ValuationResult, MolitTransaction, BuildingType, QualityTier, TierEstimate, TierGuidance, PercentileThresholds } from '../types';
import { getAdjacentDongs } from '../data/adjacent-dongs';

/**
 * Valuation Configuration
 *
 * For apartments: Uses Theil-Sen regression to predict expected value at today's date
 * For 연립다세대: Uses tiered hierarchy with floor/age filtering
 */
const VALUATION_CONFIG = {
  // Recency weighting for apartments
  RECENCY_HALFLIFE_DAYS: 60,

  // For apartments, we use tighter area filtering (building-level data is more consistent)
  APARTMENT_AREA_TOLERANCE: 2, // ±2㎡ for apartments

  // Area filter for multifamily (±15% pre-filter from MOLIT)
  AREA_FILTER_PERCENT: 15,

  // Legacy: kept for apartment triple-weighted calculation (not used for multifamily)
  AREA_HALFLIFE_PERCENT: 20,
  AGE_HALFLIFE_YEARS: 10,
  DEFAULT_AGE_WEIGHT: 0.5,
};

/**
 * Multifamily Filtering Configuration
 *
 * For 연립다세대, we apply additional filtering to get comparable transactions:
 * 1. Floor filter: Remove basement/semi-basement (floor ≤ 0)
 * 2. Age filter: Keep buildings within ±10 years of target (with fallback)
 */
const MULTIFAMILY_FILTER_CONFIG = {
  // Minimum transactions required after filtering
  MIN_TRANSACTIONS: 5,

  // Building age tolerance (years)
  AGE_TOLERANCE_PRIMARY: 10,   // First try: ±10 years
  AGE_TOLERANCE_FALLBACK: 15,  // Fallback: ±15 years
};

/**
 * Tiered Hierarchy Valuation Configuration
 *
 * Quality tiers are stratified by unit price percentiles to account for
 * unobserved heterogeneity (building quality, location premium, etc.)
 *
 * Using percentile-based stratification ensures tiers adapt to any district's
 * price level automatically.
 *
 * Each tier has its own depreciation rate reflecting different
 * maintenance and quality retention characteristics.
 */
const TIERED_CONFIG = {
  // Percentile thresholds for tier classification
  // Budget: < 25th, Standard: 25-50th, Mid: 50-75th, Premium: > 75th
  PERCENTILES: {
    budget:   { max: 25 },   // < 25th percentile
    standard: { max: 50 },   // 25th ~ 50th percentile
    mid:      { max: 75 },   // 50th ~ 75th percentile
    premium:  { max: 90 },   // 75th ~ 90th percentile
    top:      { max: 100 },  // > 90th percentile
  } as Record<QualityTier, { max: number }>,

  // Tier labels
  LABELS: {
    budget:   '하위 25% (Budget)',
    standard: '25-50% (Standard)',
    mid:      '50-75% (Mid)',
    premium:  '75-90% (Premium)',
    top:      '상위 10% (Top)',
  } as Record<QualityTier, string>,

  // Annual depreciation rates by tier (derived from market analysis)
  DEPRECIATION: {
    budget: 0.02,    // 2%/yr - lower quality buildings depreciate faster
    standard: 0.015, // 1.5%/yr
    mid: 0.01,       // 1%/yr
    premium: 0.005,  // 0.5%/yr - premium buildings hold value better
    top: 0.0025,     // 0.25%/yr - top-tier luxury properties hold value best
  } as Record<QualityTier, number>,

  // Recency half-life for tiered calculation (days)
  RECENCY_HALFLIFE_DAYS: 90,

  // Tier selection guidance for users (English)
  GUIDANCE: {
    top: [
      'Premium brand builder (래미안, 아이파크, 힐스테이트, etc.)',
      'Excellent location (station < 3 min, park/river view)',
      'New or near-new construction (< 5 years)',
      'Premium finishes and amenities',
      'High-floor unit with good orientation',
    ],
    premium: [
      'Major brand builder (Daelim, Hyundai, Samsung, etc.)',
      'Near subway station (within 5 min walk)',
      'Recently renovated',
      'Main road / park view',
      'Ample parking (1+ per unit)',
    ],
    mid: [
      'Mid-tier builder',
      'Near subway (within 10 min walk)',
      'Well-maintained',
      'Basic amenities available',
    ],
    standard: [
      'Local builder',
      'Good public transit access',
      'Basic facilities maintained',
    ],
    budget: [
      'Older building (20+ years)',
      'Limited public transit',
      'Insufficient parking',
      'Needs renovation',
    ],
  } as TierGuidance,
};

/**
 * Calculate percentile value from sorted array
 * @param sortedValues - Array of values sorted in ascending order
 * @param percentile - Percentile to calculate (0-100)
 */
function calculatePercentile(sortedValues: number[], percentile: number): number {
  if (sortedValues.length === 0) return 0;
  if (sortedValues.length === 1) return sortedValues[0];

  const index = (percentile / 100) * (sortedValues.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const fraction = index - lower;

  if (lower === upper) return sortedValues[lower];
  return sortedValues[lower] * (1 - fraction) + sortedValues[upper] * fraction;
}

/**
 * Theil-Sen Regression for time trend
 * Returns slope (원/day) and intercept (value at daysAgo=0, i.e., today)
 *
 * Theil-Sen is robust to outliers - uses median of all pairwise slopes.
 * Used for apartment Est. Value: predicts expected value at today's date.
 */
function theilSenTimeRegression(data: { daysAgo: number; value: number }[]): {
  slope: number;
  intercept: number;
} {
  const n = data.length;
  if (n < 2) return { slope: 0, intercept: data[0]?.value || 0 };

  // Calculate all pairwise slopes
  const slopes: number[] = [];
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const dx = data[i].daysAgo - data[j].daysAgo;
      if (Math.abs(dx) > 7) { // At least 1 week difference
        const dy = data[i].value - data[j].value;
        slopes.push(dy / dx);
      }
    }
  }

  if (slopes.length === 0) {
    return { slope: 0, intercept: data.reduce((s, d) => s + d.value, 0) / n };
  }

  slopes.sort((a, b) => a - b);
  const slope = slopes[Math.floor(slopes.length / 2)];

  // Intercept at daysAgo = 0 (today)
  const intercepts = data.map(d => d.value - slope * d.daysAgo);
  intercepts.sort((a, b) => a - b);
  const intercept = intercepts[Math.floor(intercepts.length / 2)];

  return { slope, intercept };
}


export class PropertyValuationEngine {
  private molitAPI: MolitAPI;

  constructor(molitApiKey: string) {
    this.molitAPI = new MolitAPI(molitApiKey);
  }

  async calculatePropertyValue(
    property: PropertyDetails,
    buildingType: BuildingType = 'apartment' // Default for backwards compatibility
  ): Promise<ValuationResult> {
    // Step 1: Get recent transaction data from MOLIT
    const lawdCd = getDistrictCode(property.city, property.district);

    if (!lawdCd) {
      throw new Error(`District code not found for ${property.city} ${property.district}`);
    }

    // For apartments and officetel: use building name as identifier (officetel has reliable names)
    // For multifamily (연립/다세대): use dong as identifier (building names are unreliable)
    const identifier = buildingType === 'multifamily'
      ? property.dong
      : property.buildingName;

    console.log(`📊 Valuation for ${buildingType}: identifier="${identifier}", area=${property.exclusiveArea}㎡`);

    // Fetch 12 months of data for better statistical reliability
    // 12 months provides: more data points, full seasonal coverage, better R² values
    let recentTransactions = await this.molitAPI.getRecentTransactionsByType(
      buildingType,
      lawdCd,
      identifier,
      property.exclusiveArea,
      12 // Last 12 months (changed from 6 for better trend accuracy)
    );

    // Step 1b: Fetch JEONSE (전세) transactions for jeonse price analysis
    // Moved BEFORE the sales check so we can still get jeonse data even if no sales
    let jeonseTransactions: MolitTransaction[] = [];
    try {
      jeonseTransactions = await this.molitAPI.getRecentJeonseTransactionsByType(
        buildingType,
        lawdCd,
        identifier,
        property.exclusiveArea,
        12 // Last 12 months
      );
      console.log(`📊 Jeonse transaction data: ${jeonseTransactions.length} txns`);

      // For multifamily: cascade to adjacent dongs → district if insufficient jeonse data
      if (buildingType === 'multifamily' && jeonseTransactions.length < 4) {
        const adjacentDongs = getAdjacentDongs(property.district, property.dong);
        if (adjacentDongs.length > 0) {
          console.log(`⚠️ Multifamily jeonse: Only ${jeonseTransactions.length} dong-level. Expanding to adjacent dongs: [${adjacentDongs.join(', ')}]`);
          jeonseTransactions = await this.molitAPI.getRecentMultifamilyJeonseByDongs(
            lawdCd, [property.dong, ...adjacentDongs], property.exclusiveArea, 12
          );
          console.log(`   → After adjacent dong expansion: ${jeonseTransactions.length} jeonse transactions`);
        }

        if (jeonseTransactions.length < 4) {
          console.log(`⚠️ Multifamily jeonse: Still only ${jeonseTransactions.length}. Expanding to district-wide...`);
          jeonseTransactions = await this.molitAPI.getRecentMultifamilyJeonseByDongs(
            lawdCd, [], property.exclusiveArea, 12
          );
          console.log(`   → After district expansion: ${jeonseTransactions.length} jeonse transactions`);
        }
      }
    } catch (error) {
      console.error('Failed to fetch jeonse transactions:', error);
      // Continue without jeonse data
    }

    // For multifamily: cascade sale transactions if insufficient (dong → adjacent dongs → district)
    if (buildingType === 'multifamily' && recentTransactions.length < 4) {
      console.log(`⚠️ Multifamily sale: Only ${recentTransactions.length} dong-level. Starting cascade expansion...`);
      const adjacentDongsForSale = getAdjacentDongs(property.district, property.dong);
      if (adjacentDongsForSale.length > 0) {
        console.log(`   Expanding to adjacent dongs: [${adjacentDongsForSale.join(', ')}]`);
        recentTransactions = await this.molitAPI.getRecentMultifamilyByDongs(
          lawdCd, [property.dong, ...adjacentDongsForSale], property.exclusiveArea, 12
        );
        console.log(`   → After adjacent dong expansion: ${recentTransactions.length} sale transactions`);
      }

      if (recentTransactions.length < 4) {
        console.log(`⚠️ Multifamily sale: Still only ${recentTransactions.length}. Expanding to district-wide...`);
        recentTransactions = await this.molitAPI.getRecentMultifamilyByDongs(
          lawdCd, [], property.exclusiveArea, 12
        );
        console.log(`   → After district expansion: ${recentTransactions.length} sale transactions`);
      }
    }

    // For officetel: don't early-return when building-level sales are 0
    // — the officetel block below will try dong-level cascade expansion
    if (recentTransactions.length === 0 && buildingType !== 'officetel') {
      // No sale transactions, but we may have jeonse transactions
      // Return a minimal valuation with just jeonse data
      if (jeonseTransactions.length > 0) {
        console.log('⚠️ No sale transactions found, but have jeonse transactions - returning partial valuation');
        return {
          valueLow: 0,
          valueMid: 0,
          valueHigh: 0,
          confidence: 0,
          trend: 'stable' as const,
          trendPercentage: 0,
          recentSales: [],
          pricePerPyeong: 0,
          dataSources: [],
          allJeonseTransactions: jeonseTransactions // Include jeonse data for scatter plot
        };
      }
      throw new Error('No recent transaction data found for this property');
    }

    // Log comparison: 6-month vs 12-month transaction counts
    const now = new Date();
    const transactions6M = recentTransactions.filter(t => {
      const transactionDate = new Date(t.year, t.month - 1, t.day);
      const monthsAgo = (now.getTime() - transactionDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
      return monthsAgo <= 6;
    });

    console.log(`📊 Sale transaction data: 6M=${transactions6M.length} txns, 12M=${recentTransactions.length} txns`);
    if (recentTransactions.length >= transactions6M.length * 1.5) {
      console.log(`   ✅ 12-month period provides ${((recentTransactions.length / Math.max(1, transactions6M.length) - 1) * 100).toFixed(0)}% more data points`);
    }

    // Different calculation paths based on building type
    let valueLow: number;
    let valueMid: number;
    let valueHigh: number;
    let baseValue: number;
    let tierEstimates: TierEstimate[] | undefined;
    let tierGuidance: TierGuidance | undefined;
    let tierPercentiles: PercentileThresholds | undefined;
    let valuationMethod: 'building' | 'dong-tiered' | undefined;
    // For multifamily/dong-tiered, use filtered transactions for more accurate trend
    let transactionsForTrend: MolitTransaction[] = recentTransactions;

    if (buildingType === 'multifamily') {
      // ===== MULTIFAMILY: Tiered hierarchy with floor filtering (NO age filter) =====
      // No base value calculation, no floor adjustment
      // Final values come directly from tier estimates
      //
      // IMPORTANT: Age filter is intentionally DISABLED for valuation.
      // - More transactions = better tier distribution and statistical reliability
      // - Building year is still used for age-weighted trend regression (see calculateTrend)
      // - Tiered hierarchy already accounts for quality differences via price percentiles

      const tieredResult = this.calculateTieredHierarchyValue(
        recentTransactions,
        property.exclusiveArea,
        undefined, // Skip age filter for valuation - more transactions = better tier distribution
        property.buildingYear // Age adjustment (depreciation normalization) still applied
      );
      tierEstimates = tieredResult.estimates;
      tierPercentiles = tieredResult.thresholds;
      tierGuidance = TIERED_CONFIG.GUIDANCE;

      // Use floor-filtered transactions for trend (building year used for weighting, not filtering)
      transactionsForTrend = tieredResult.filteredTransactions.length > 0
        ? tieredResult.filteredTransactions
        : recentTransactions;
      console.log(`📈 Using ${transactionsForTrend.length} floor-filtered transactions for age-weighted trend calculation`);

      // Use tier values directly as final output
      const budgetTier = tierEstimates.find(t => t.tier === 'budget');
      const standardTier = tierEstimates.find(t => t.tier === 'standard');
      const midTier = tierEstimates.find(t => t.tier === 'mid');
      const premiumTier = tierEstimates.find(t => t.tier === 'premium');
      const topTier = tierEstimates.find(t => t.tier === 'top');

      // valueLow = Budget, valueMid = Mid, valueHigh = Top (or Premium if no Top)
      // Use Standard as fallback for Mid if Mid tier is empty
      valueLow = budgetTier?.value || 0;
      valueMid = midTier?.value || standardTier?.value || 0;
      valueHigh = topTier?.value || premiumTier?.value || 0;

      // Base value for data sources display (use mid tier value)
      baseValue = valueMid;
      valuationMethod = 'dong-tiered';

      console.log('\n📊 Final Multifamily Tier Values:');
      console.log(`   Budget:   ${budgetTier ? (budgetTier.value / 100000000).toFixed(2) + '억' : 'N/A'} (${budgetTier?.transactionCount || 0} txns)`);
      console.log(`   Standard: ${standardTier ? (standardTier.value / 100000000).toFixed(2) + '억' : 'N/A'} (${standardTier?.transactionCount || 0} txns)`);
      console.log(`   Mid:      ${midTier ? (midTier.value / 100000000).toFixed(2) + '억' : 'N/A'} (${midTier?.transactionCount || 0} txns)`);
      console.log(`   Premium:  ${premiumTier ? (premiumTier.value / 100000000).toFixed(2) + '억' : 'N/A'} (${premiumTier?.transactionCount || 0} txns)`);
      console.log(`   Top:      ${topTier ? (topTier.value / 100000000).toFixed(2) + '억' : 'N/A'} (${topTier?.transactionCount || 0} txns)`);

    } else if (buildingType === 'officetel') {
      // ===== OFFICETEL: Hybrid approach =====
      // Primary: building-name match (like apartments)
      // Fallback: dong-level tiered (like multifamily) if insufficient building data
      const MIN_BUILDING_TXNS = 5;

      if (recentTransactions.length >= MIN_BUILDING_TXNS) {
        // Sufficient building-level data → Theil-Sen regression (same as apartments)
        console.log(`📊 Officetel: Using building-level valuation (${recentTransactions.length} txns)`);
        valuationMethod = 'building';

        const now2 = new Date();
        const regressionData = recentTransactions.map(t => {
          const txDate = new Date(t.year, t.month - 1, t.day);
          const daysAgo = (now2.getTime() - txDate.getTime()) / (1000 * 60 * 60 * 24);
          return { daysAgo, value: t.transactionAmount };
        });

        const regression = theilSenTimeRegression(regressionData);
        baseValue = regression.intercept;

        const dailyChange = regression.slope;
        const annualChangePercent = baseValue > 0 ? (-dailyChange * 365 / baseValue) * 100 : 0;
        console.log(`\n📊 Officetel Theil-Sen Regression:`);
        console.log(`   Transactions: ${recentTransactions.length}`);
        console.log(`   Predicted value (today): ₩${(baseValue / 100000000).toFixed(2)}억`);
        console.log(`   Slope: ${(dailyChange / 10000).toFixed(1)}만원/day`);
        console.log(`   Implied annual change: ${annualChangePercent.toFixed(1)}%`);

        valueLow = 0;
        valueMid = Math.floor(baseValue);
        valueHigh = 0;

      } else {
        // Insufficient building-level data → dong-level tiered fallback with cascade
        console.log(`📊 Officetel: Building data insufficient (${recentTransactions.length} txns). Falling back to dong-level tiered with cascade.`);
        valuationMethod = 'dong-tiered';

        // Fetch dong-level sale data with cascading expansion: dong → adjacent dongs → district
        // Level 1: Dong-level
        let dongTransactions = await this.molitAPI.getRecentOfficetelByDongs(
          lawdCd, [property.dong], property.exclusiveArea, 12
        );
        console.log(`📊 Officetel sale (dong-level): ${dongTransactions.length} transactions`);

        // Level 2: Expand to adjacent dongs if insufficient
        if (dongTransactions.length < 4) {
          const adjacentDongsForSale = getAdjacentDongs(property.district, property.dong);
          if (adjacentDongsForSale.length > 0) {
            console.log(`⚠️ Officetel sale: Only ${dongTransactions.length} dong-level. Expanding to adjacent dongs: [${adjacentDongsForSale.join(', ')}]`);
            dongTransactions = await this.molitAPI.getRecentOfficetelByDongs(
              lawdCd, [property.dong, ...adjacentDongsForSale], property.exclusiveArea, 12
            );
            console.log(`   → After adjacent dong expansion: ${dongTransactions.length} sale transactions`);
          }
        }

        // Level 3: Expand to district-wide if still insufficient
        if (dongTransactions.length < 4) {
          console.log(`⚠️ Officetel sale: Still only ${dongTransactions.length}. Expanding to district-wide...`);
          dongTransactions = await this.molitAPI.getRecentOfficetelByDongs(
            lawdCd, [], property.exclusiveArea, 12
          );
          console.log(`   → After district expansion: ${dongTransactions.length} sale transactions`);
        }
        // Fetch jeonse with cascading geographic expansion: dong → adjacent dongs → district
        let dongJeonseTransactions = await this.molitAPI.getRecentOfficetelJeonseByDongs(
          lawdCd, [property.dong], property.exclusiveArea, 12
        );
        console.log(`📊 Officetel jeonse (dong-level): ${dongJeonseTransactions.length} transactions`);

        // Level 2: Expand to adjacent dongs if insufficient
        if (dongJeonseTransactions.length < 4) {
          const adjacentDongs = getAdjacentDongs(property.district, property.dong);
          if (adjacentDongs.length > 0) {
            console.log(`⚠️ Officetel jeonse: Only ${dongJeonseTransactions.length} dong-level. Expanding to adjacent dongs: [${adjacentDongs.join(', ')}]`);
            dongJeonseTransactions = await this.molitAPI.getRecentOfficetelJeonseByDongs(
              lawdCd, [property.dong, ...adjacentDongs], property.exclusiveArea, 12
            );
            console.log(`   → After adjacent dong expansion: ${dongJeonseTransactions.length} jeonse transactions`);
          }
        }

        // Level 3: Expand to district-wide if still insufficient
        if (dongJeonseTransactions.length < 4) {
          console.log(`⚠️ Officetel jeonse: Still only ${dongJeonseTransactions.length}. Expanding to district-wide...`);
          dongJeonseTransactions = await this.molitAPI.getRecentOfficetelJeonseByDongs(
            lawdCd, [], property.exclusiveArea, 12
          );
          console.log(`   → After district expansion: ${dongJeonseTransactions.length} jeonse transactions`);
        }

        // Merge expanded jeonse data
        if (dongJeonseTransactions.length > 0) {
          jeonseTransactions = dongJeonseTransactions;
        }

        if (dongTransactions.length === 0) {
          throw new Error('No recent transaction data found for this officetel property (dong-level fallback)');
        }

        // Use tiered hierarchy (same as multifamily - no age filter)
        // More transactions = better tier distribution and statistical reliability
        const tieredResult = this.calculateTieredHierarchyValue(
          dongTransactions,
          property.exclusiveArea,
          undefined, // Skip age filter - same rationale as multifamily
          property.buildingYear // Age adjustment (depreciation normalization) still applied
        );
        tierEstimates = tieredResult.estimates;
        tierPercentiles = tieredResult.thresholds;
        tierGuidance = TIERED_CONFIG.GUIDANCE;

        // Store filtered transactions for trend calculation
        transactionsForTrend = tieredResult.filteredTransactions.length > 0
          ? tieredResult.filteredTransactions
          : dongTransactions;
        console.log(`📈 Using ${transactionsForTrend.length} ${tieredResult.filteredTransactions.length > 0 ? 'filtered' : 'original'} transactions for trend calculation (officetel dong-level)`);

        const budgetTier = tierEstimates.find(t => t.tier === 'budget');
        const standardTier = tierEstimates.find(t => t.tier === 'standard');
        const midTier = tierEstimates.find(t => t.tier === 'mid');
        const premiumTier = tierEstimates.find(t => t.tier === 'premium');
        const topTier = tierEstimates.find(t => t.tier === 'top');

        valueLow = budgetTier?.value || 0;
        valueMid = midTier?.value || standardTier?.value || 0;
        valueHigh = topTier?.value || premiumTier?.value || 0;
        baseValue = valueMid;

        console.log('\n📊 Final Officetel Tier Values (Dong-level Fallback):');
        console.log(`   Budget:   ${budgetTier ? (budgetTier.value / 100000000).toFixed(2) + '억' : 'N/A'} (${budgetTier?.transactionCount || 0} txns)`);
        console.log(`   Standard: ${standardTier ? (standardTier.value / 100000000).toFixed(2) + '억' : 'N/A'} (${standardTier?.transactionCount || 0} txns)`);
        console.log(`   Mid:      ${midTier ? (midTier.value / 100000000).toFixed(2) + '억' : 'N/A'} (${midTier?.transactionCount || 0} txns)`);
        console.log(`   Premium:  ${premiumTier ? (premiumTier.value / 100000000).toFixed(2) + '억' : 'N/A'} (${premiumTier?.transactionCount || 0} txns)`);
        console.log(`   Top:      ${topTier ? (topTier.value / 100000000).toFixed(2) + '억' : 'N/A'} (${topTier?.transactionCount || 0} txns)`);
      }

    } else {
      // ===== APARTMENTS: Theil-Sen regression approach =====
      // Predicts expected value at today's date using robust regression
      // Theil-Sen uses median of pairwise slopes → resilient to outlier transactions
      valuationMethod = 'building';

      const now2 = new Date();
      const regressionData = recentTransactions.map(t => {
        const txDate = new Date(t.year, t.month - 1, t.day);
        const daysAgo = (now2.getTime() - txDate.getTime()) / (1000 * 60 * 60 * 24);
        return { daysAgo, value: t.transactionAmount };
      });

      const regression = theilSenTimeRegression(regressionData);
      baseValue = regression.intercept; // Predicted value at daysAgo=0 (today)

      // Log regression details
      const dailyChange = regression.slope;
      const annualChangePercent = baseValue > 0 ? (-dailyChange * 365 / baseValue) * 100 : 0;
      console.log(`\n📊 Apartment Theil-Sen Regression:`);
      console.log(`   Transactions: ${recentTransactions.length}`);
      console.log(`   Predicted value (today): ₩${(baseValue / 100000000).toFixed(2)}억`);
      console.log(`   Slope: ${(dailyChange / 10000).toFixed(1)}만원/day`);
      console.log(`   Implied annual change: ${annualChangePercent.toFixed(1)}%`);

      valueLow = 0;
      valueMid = Math.floor(baseValue);
      valueHigh = 0;
    }

    // Calculate trend (with R-squared for confidence)
    // Use transactionsForTrend which may be filtered for multifamily/dong-tiered
    // Pass buildingYear for age-weighted regression (improves accuracy without reducing transaction count)
    const trend = this.calculateTrend(transactionsForTrend, property.buildingYear);

    // Determine confidence (using R-squared + data quality)
    const confidence = this.determineConfidence(transactionsForTrend, trend.rSquared);

    // Cache results
    await this.cacheResults(property, recentTransactions);

    return {
      valueLow,
      valueMid,
      valueHigh,
      confidence,
      recentSales: this.formatRecentSales(recentTransactions),
      pricePerPyeong: valueMid > 0 ? Math.floor(valueMid / (property.exclusiveArea * 0.3025)) : 0,
      trend: trend.direction,
      trendPercentage: trend.percentage,
      dataSources: [
        {
          name: '국토부 실거래가',
          value: baseValue,
          weight: 100
        }
        // Future: Add KB, 호갱노노, etc.
      ],
      allTransactions: recentTransactions, // Include all SALE transactions for price analysis
      allJeonseTransactions: jeonseTransactions, // Include all JEONSE transactions for jeonse price analysis
      // Tiered hierarchy for multifamily and officetel dong-level fallback
      tierEstimates,
      tierGuidance,
      tierPercentiles,
      valuationMethod,
    };
  }

  /**
   * Calculate base value using triple-weighted approach
   *
   * Combined Weight = Recency × Age Similarity × Area Similarity
   *
   * For apartments: Uses recency only (building-level data is consistent)
   * For multifamily: Uses all three weights (dong-level data needs more filtering)
   *
   * @param transactions - Filtered transactions from MOLIT API
   * @param targetArea - Target property's exclusive area (㎡)
   * @param targetBuildingYear - Target property's building year (optional)
   * @param buildingType - 'apartment' or 'multifamily'
   */
  private calculateTripleWeightedValue(
    transactions: MolitTransaction[],
    targetArea: number,
    targetBuildingYear: number | undefined,
    buildingType: BuildingType
  ): number {
    if (transactions.length === 0) return 0;

    const now = new Date();
    const useTripleWeight = buildingType === 'multifamily';

    // Area half-life in absolute terms (20% of target area)
    const areaHalfLife = targetArea * (VALUATION_CONFIG.AREA_HALFLIFE_PERCENT / 100);

    console.log(`\n📊 ${useTripleWeight ? 'Triple' : 'Single'}-Weighted Valuation:`);
    console.log(`   Transactions: ${transactions.length}`);
    if (useTripleWeight) {
      console.log(`   Target Area: ${targetArea}㎡ (half-life: ${areaHalfLife.toFixed(1)}㎡)`);
      console.log(`   Target Year: ${targetBuildingYear || 'unknown'}`);
    }

    // Calculate weights for each transaction
    const weightedData = transactions.map(t => {
      const transactionDate = new Date(t.year, t.month - 1, t.day);
      const daysAgo = (now.getTime() - transactionDate.getTime()) / (1000 * 60 * 60 * 24);

      // 1. Recency weight (always applied)
      const recencyWeight = Math.exp(-daysAgo / VALUATION_CONFIG.RECENCY_HALFLIFE_DAYS);

      // 2. Age similarity weight (for multifamily only)
      let ageWeight = 1.0;
      if (useTripleWeight) {
        if (targetBuildingYear && t.buildingYear) {
          const yearDiff = Math.abs(t.buildingYear - targetBuildingYear);
          ageWeight = Math.exp(-yearDiff / VALUATION_CONFIG.AGE_HALFLIFE_YEARS);
        } else {
          ageWeight = VALUATION_CONFIG.DEFAULT_AGE_WEIGHT;
        }
      }

      // 3. Area similarity weight (for multifamily only)
      let areaWeight = 1.0;
      if (useTripleWeight) {
        const areaDiff = Math.abs(t.exclusiveArea - targetArea);
        areaWeight = Math.exp(-areaDiff / areaHalfLife);
      }

      // Combined weight
      const combinedWeight = recencyWeight * ageWeight * areaWeight;

      return {
        transaction: t,
        daysAgo,
        recencyWeight,
        ageWeight,
        areaWeight,
        combinedWeight,
        weightedAmount: t.transactionAmount * combinedWeight
      };
    });

    // Sort by combined weight to show top contributors
    const sorted = [...weightedData].sort((a, b) => b.combinedWeight - a.combinedWeight);

    // Log top 5 contributors
    if (useTripleWeight) {
      console.log(`\n   Top 5 contributors:`);
      sorted.slice(0, 5).forEach((w, i) => {
        const t = w.transaction;
        const pct = (w.weightedAmount / weightedData.reduce((s, x) => s + x.weightedAmount, 0) * 100);
        console.log(`   ${i + 1}. ${(t.transactionAmount / 100000000).toFixed(2)}억 × ${w.combinedWeight.toFixed(3)} = ${(w.weightedAmount / 100000000).toFixed(3)}억 (${pct.toFixed(1)}%)`);
        console.log(`      Area: ${t.exclusiveArea}㎡, Built: ${t.buildingYear || '?'}, ${w.daysAgo.toFixed(0)}d ago`);
      });
    }

    // Calculate weighted average
    const totalWeightedAmount = weightedData.reduce((sum, w) => sum + w.weightedAmount, 0);
    const totalWeight = weightedData.reduce((sum, w) => sum + w.combinedWeight, 0);
    const baseValue = totalWeightedAmount / totalWeight;

    // Calculate effective sample size: (Σw)² / Σw²
    const sumSqWeights = weightedData.reduce((sum, w) => sum + Math.pow(w.combinedWeight, 2), 0);
    const effectiveSampleSize = Math.pow(totalWeight, 2) / sumSqWeights;

    console.log(`\n   Weighted Average: ₩${(baseValue / 100000000).toFixed(2)}억`);
    console.log(`   Effective Sample Size: ${effectiveSampleSize.toFixed(1)}`);

    return baseValue;
  }

  /**
   * Classify a transaction into a quality tier based on percentile thresholds
   * @param unitPrice - Price per ㎡ in won
   * @param thresholds - Percentile thresholds (p25, p50, p75)
   * @returns QualityTier
   */
  private classifyQualityTier(unitPrice: number, thresholds: PercentileThresholds): QualityTier {
    if (unitPrice < thresholds.p25) return 'budget';
    if (unitPrice < thresholds.p50) return 'standard';
    if (unitPrice < thresholds.p75) return 'mid';
    if (unitPrice < thresholds.p90) return 'premium';
    return 'top';
  }

  /**
   * Calculate percentile thresholds from transactions
   * @param transactions - All transactions to analyze
   * @returns Percentile thresholds (p25, p50, p75) in won/㎡
   */
  private calculatePercentileThresholds(transactions: MolitTransaction[]): PercentileThresholds {
    const unitPrices = transactions
      .map(t => t.transactionAmount / t.exclusiveArea)
      .sort((a, b) => a - b);

    return {
      p25: calculatePercentile(unitPrices, 25),
      p50: calculatePercentile(unitPrices, 50),
      p75: calculatePercentile(unitPrices, 75),
      p90: calculatePercentile(unitPrices, 90),
    };
  }

  /**
   * Filter transactions by floor (remove basement/semi-basement)
   * @param transactions - Raw transactions from MOLIT API
   * @returns Filtered transactions with floor > 0
   */
  private filterByFloor(transactions: MolitTransaction[]): {
    filtered: MolitTransaction[];
    removedCount: number;
  } {
    const filtered = transactions.filter(t => t.floor > 0);
    return {
      filtered,
      removedCount: transactions.length - filtered.length,
    };
  }

  /**
   * Filter transactions by building age (within tolerance of target year)
   * @param transactions - Transactions to filter
   * @param targetYear - Target building year
   * @param toleranceYears - Age tolerance in years (e.g., 10 = ±10 years)
   * @returns Filtered transactions within age tolerance
   */
  private filterByBuildingAge(
    transactions: MolitTransaction[],
    targetYear: number | undefined,
    toleranceYears: number
  ): {
    filtered: MolitTransaction[];
    removedCount: number;
  } {
    // If no target year, keep all transactions
    if (!targetYear) {
      return { filtered: transactions, removedCount: 0 };
    }

    const filtered = transactions.filter(t => {
      // Keep transactions without building year (don't lose data)
      if (!t.buildingYear) return true;
      return Math.abs(t.buildingYear - targetYear) <= toleranceYears;
    });

    return {
      filtered,
      removedCount: transactions.length - filtered.length,
    };
  }

  /**
   * Apply floor and age filtering with fallback logic for 연립다세대
   *
   * Filtering steps:
   * 1. Remove floor ≤ 0 (basement/semi-basement)
   * 2. Keep buildingYear ±10 years of target
   * 3. Fallback to ±15 years if insufficient data
   * 4. Fallback to no age filter if still insufficient
   *
   * @param transactions - Raw transactions from MOLIT API
   * @param targetBuildingYear - Target property's building year
   * @returns Filtered transactions and filter metadata
   */
  private applyMultifamilyFilters(
    transactions: MolitTransaction[],
    targetBuildingYear: number | undefined
  ): {
    filtered: MolitTransaction[];
    filterLog: {
      originalCount: number;
      afterFloorFilter: number;
      afterAgeFilter: number;
      floorRemovedCount: number;
      ageRemovedCount: number;
      ageTolerance: number | null;
      usedFallback: boolean;
    };
  } {
    const originalCount = transactions.length;

    // Step 1: Floor filter (remove basement/semi-basement)
    const floorResult = this.filterByFloor(transactions);
    let current = floorResult.filtered;
    const afterFloorFilter = current.length;
    const floorRemovedCount = floorResult.removedCount;

    // Step 2: Age filter with fallback
    let ageTolerance: number | null = null;
    let usedFallback = false;
    let ageRemovedCount = 0;

    if (targetBuildingYear) {
      // Try primary tolerance (±10 years)
      const primaryResult = this.filterByBuildingAge(
        current,
        targetBuildingYear,
        MULTIFAMILY_FILTER_CONFIG.AGE_TOLERANCE_PRIMARY
      );

      if (primaryResult.filtered.length >= MULTIFAMILY_FILTER_CONFIG.MIN_TRANSACTIONS) {
        current = primaryResult.filtered;
        ageTolerance = MULTIFAMILY_FILTER_CONFIG.AGE_TOLERANCE_PRIMARY;
        ageRemovedCount = primaryResult.removedCount;
      } else {
        // Fallback to wider tolerance (±15 years)
        const fallbackResult = this.filterByBuildingAge(
          current,
          targetBuildingYear,
          MULTIFAMILY_FILTER_CONFIG.AGE_TOLERANCE_FALLBACK
        );

        if (fallbackResult.filtered.length >= MULTIFAMILY_FILTER_CONFIG.MIN_TRANSACTIONS) {
          current = fallbackResult.filtered;
          ageTolerance = MULTIFAMILY_FILTER_CONFIG.AGE_TOLERANCE_FALLBACK;
          ageRemovedCount = fallbackResult.removedCount;
          usedFallback = true;
        } else {
          // No age filter - keep all floor-filtered transactions
          ageTolerance = null;
          ageRemovedCount = 0;
          usedFallback = true;
        }
      }
    }

    return {
      filtered: current,
      filterLog: {
        originalCount,
        afterFloorFilter,
        afterAgeFilter: current.length,
        floorRemovedCount,
        ageRemovedCount,
        ageTolerance,
        usedFallback,
      },
    };
  }

  /**
   * Calculate tiered hierarchy valuation for 연립다세대
   *
   * New approach (simplified):
   * 1. Apply floor filter (remove floor ≤ 0)
   * 2. Apply age filter (±10 years with fallback)
   * 3. Calculate percentile thresholds from filtered data
   * 4. Classify transactions into 5 tiers (budget/standard/mid/premium/top)
   * 5. Calculate tier values with recency weight + age adjustment
   * 6. Merge top tier into premium if < 3 transactions (graceful degradation)
   * 7. Return all tier values as final output
   *
   * @param transactions - Raw transactions from MOLIT API
   * @param targetArea - Target property's exclusive area (㎡)
   * @param targetBuildingYear - Target property's building year
   * @returns Array of TierEstimate for each quality tier
   */
  private calculateTieredHierarchyValue(
    transactions: MolitTransaction[],
    targetArea: number,
    targetBuildingYear: number | undefined,
    targetBuildingYearForAdjustment?: number | undefined
  ): { estimates: TierEstimate[]; thresholds: PercentileThresholds; filteredTransactions: MolitTransaction[] } {
    if (transactions.length === 0) return { estimates: [], thresholds: { p25: 0, p50: 0, p75: 0, p90: 0 }, filteredTransactions: [] };

    const now = new Date();
    const tiers: QualityTier[] = ['budget', 'standard', 'mid', 'premium', 'top'];

    // Step 1 & 2: Apply floor and age filtering
    const { filtered, filterLog } = this.applyMultifamilyFilters(transactions, targetBuildingYear);

    console.log('\n📊 Multifamily Valuation (Floor + Age Filtered):');
    console.log(`   Target Area: ${targetArea}㎡, Target Year: ${targetBuildingYear || 'unknown'}`);
    console.log(`   Filtering:`);
    console.log(`     - Original: ${filterLog.originalCount} transactions`);
    console.log(`     - After floor filter (removed floor ≤ 0): ${filterLog.afterFloorFilter} (removed ${filterLog.floorRemovedCount})`);
    if (filterLog.ageTolerance !== null) {
      console.log(`     - After age filter (±${filterLog.ageTolerance} years): ${filterLog.afterAgeFilter} (removed ${filterLog.ageRemovedCount})`);
    } else {
      console.log(`     - Age filter: not applied (insufficient data or no target year)`);
    }
    if (filterLog.usedFallback) {
      console.log(`     ⚠️ Used fallback filtering due to insufficient data`);
    }

    // If still no transactions after filtering, return empty
    if (filtered.length === 0) {
      console.log('   ❌ No transactions remaining after filtering');
      return { estimates: [], thresholds: { p25: 0, p50: 0, p75: 0, p90: 0 }, filteredTransactions: [] };
    }

    // Step 3: Calculate percentile thresholds from FILTERED transactions
    const thresholds = this.calculatePercentileThresholds(filtered);

    console.log(`   Percentile Thresholds (from ${filtered.length} filtered txns):`);
    console.log(`     P25=${(thresholds.p25/10000).toFixed(0)}만/㎡, P50=${(thresholds.p50/10000).toFixed(0)}만/㎡, P75=${(thresholds.p75/10000).toFixed(0)}만/㎡, P90=${(thresholds.p90/10000).toFixed(0)}만/㎡`);

    // Step 4: Classify each transaction by quality tier
    const transactionsByTier: Record<QualityTier, Array<MolitTransaction & { unitPrice: number; daysAgo: number }>> = {
      budget: [],
      standard: [],
      mid: [],
      premium: [],
      top: [],
    };

    filtered.forEach(t => {
      const unitPrice = t.transactionAmount / t.exclusiveArea;
      const tier = this.classifyQualityTier(unitPrice, thresholds);
      const transactionDate = new Date(t.year, t.month - 1, t.day);
      const daysAgo = (now.getTime() - transactionDate.getTime()) / (1000 * 60 * 60 * 24);
      transactionsByTier[tier].push({ ...t, unitPrice, daysAgo });
    });

    // Merge top tier into premium if insufficient transactions (< 3)
    if (transactionsByTier.top.length > 0 && transactionsByTier.top.length < 3) {
      console.log(`   ⚠️ Top tier has only ${transactionsByTier.top.length} transactions (< 3). Merging into Premium.`);
      transactionsByTier.premium.push(...transactionsByTier.top);
      transactionsByTier.top = [];
    }

    console.log(`   Tier distribution: budget=${transactionsByTier.budget.length}, standard=${transactionsByTier.standard.length}, mid=${transactionsByTier.mid.length}, premium=${transactionsByTier.premium.length}, top=${transactionsByTier.top.length}`);

    // Step 5 & 6: Calculate tier values
    const tierEstimates: TierEstimate[] = [];

    for (const tier of tiers) {
      const tierTxns = transactionsByTier[tier];
      if (tierTxns.length === 0) continue;

      const depreciation = TIERED_CONFIG.DEPRECIATION[tier];

      // Calculate recency-weighted unit price with age adjustment
      let totalWeightedUnitPrice = 0;
      let totalWeight = 0;

      tierTxns.forEach(t => {
        // Recency weight (90-day half-life)
        const recencyWeight = Math.exp(-t.daysAgo / TIERED_CONFIG.RECENCY_HALFLIFE_DAYS);

        // Age adjustment: adjust comparable's unit price to target building year
        // Uses targetBuildingYearForAdjustment (separate from filtering parameter)
        let ageAdjustment = 1.0;
        const adjustmentYear = targetBuildingYearForAdjustment ?? targetBuildingYear;
        if (adjustmentYear && t.buildingYear) {
          const yearDiff = adjustmentYear - t.buildingYear;
          // If target is newer (positive yearDiff), increase value
          // If target is older (negative yearDiff), decrease value
          ageAdjustment = 1 + (yearDiff * depreciation);
        }

        const adjustedUnitPrice = t.unitPrice * ageAdjustment;
        totalWeightedUnitPrice += adjustedUnitPrice * recencyWeight;
        totalWeight += recencyWeight;
      });

      const weightedUnitPrice = totalWeightedUnitPrice / totalWeight;
      const estimatedValue = weightedUnitPrice * targetArea;

      // Calculate effective sample size
      const weights = tierTxns.map(t => Math.exp(-t.daysAgo / TIERED_CONFIG.RECENCY_HALFLIFE_DAYS));
      const sumW = weights.reduce((a, b) => a + b, 0);
      const sumW2 = weights.reduce((a, b) => a + b * b, 0);
      const effectiveSampleSize = (sumW * sumW) / sumW2;

      // Get recent comparables (top 3 by recency)
      const recentComparables = [...tierTxns]
        .sort((a, b) => a.daysAgo - b.daysAgo)
        .slice(0, 3)
        .map(({ unitPrice, daysAgo, ...t }) => t as MolitTransaction);

      tierEstimates.push({
        tier,
        label: TIERED_CONFIG.LABELS[tier],
        value: Math.round(estimatedValue),
        unitPrice: Math.round(weightedUnitPrice),
        transactionCount: tierTxns.length,
        effectiveSampleSize: Math.round(effectiveSampleSize * 10) / 10,
        recentComparables,
        depreciationRate: depreciation,
      });

      console.log(`\n   ${TIERED_CONFIG.LABELS[tier]}:`);
      console.log(`     - Transactions: ${tierTxns.length}, Effective N: ${effectiveSampleSize.toFixed(1)}`);
      console.log(`     - Unit Price: ${(weightedUnitPrice / 10000).toFixed(0)}만원/㎡`);
      console.log(`     - Estimated Value: ${(estimatedValue / 100000000).toFixed(2)}억원`);
    }

    return { estimates: tierEstimates, thresholds, filteredTransactions: filtered };
  }

  /**
   * Legacy single-weight calculation (kept for backwards compatibility)
   */
  private calculateBaseValue(transactions: MolitTransaction[]): number {
    if (transactions.length === 0) return 0;

    // Weight recent transactions more heavily
    const now = new Date();
    const weightedSum = transactions.reduce((sum, t) => {
      const transactionDate = new Date(t.year, t.month - 1, t.day);
      const daysAgo = (now.getTime() - transactionDate.getTime()) / (1000 * 60 * 60 * 24);

      // Exponential decay: newer = higher weight
      const weight = Math.exp(-daysAgo / 60); // 60-day half-life

      return sum + (t.transactionAmount * weight);
    }, 0);

    const totalWeight = transactions.reduce((sum, t) => {
      const transactionDate = new Date(t.year, t.month - 1, t.day);
      const daysAgo = (now.getTime() - transactionDate.getTime()) / (1000 * 60 * 60 * 24);
      const weight = Math.exp(-daysAgo / 60);
      return sum + weight;
    }, 0);

    return weightedSum / totalWeight;
  }

  private applyFloorAdjustment(
    baseValue: number,
    floor: number,
    totalFloors: number
  ): number {
    // Korean apartment floor premium/discount

    // First floor: -10% to -15%
    if (floor === 1) return baseValue * 0.88;

    // Second floor: -5% to -8%
    if (floor === 2) return baseValue * 0.95;

    // Top floor: -2% to -5% (roof issues)
    if (floor === totalFloors) return baseValue * 0.97;

    // Mid-high floors (50-80% of building height): premium
    const relativePosition = floor / totalFloors;
    if (relativePosition >= 0.5 && relativePosition <= 0.8) {
      return baseValue * 1.05; // +5% premium
    }

    // All other floors: base value
    return baseValue;
  }

  /**
   * Calculate market trend using monthly-aggregated regression
   *
   * For 연립다세대 markets, individual transaction prices have high variance (2-3x within same month)
   * due to heterogeneous building quality/age. This makes transaction-level R² extremely low (<5%).
   *
   * Solution: Aggregate to monthly averages first, then run regression.
   * - Reduces within-month noise from property heterogeneity
   * - Produces meaningful R² values (typically 5-30% vs <5% for raw data)
   * - More reliable trend detection
   *
   * When targetBuildingYear is provided, applies age-based weighting to transactions
   * BEFORE aggregating to monthly averages.
   *
   * @param transactions - Transactions to analyze for trend
   * @param targetBuildingYear - Optional building year for age-weighted aggregation
   * @returns direction ('rising' | 'stable' | 'falling'), percentage change, and R-squared confidence
   */
  private calculateTrend(
    transactions: MolitTransaction[],
    targetBuildingYear?: number
  ): {
    direction: 'rising' | 'stable' | 'falling';
    percentage: number;
    rSquared: number;
  } {
    if (transactions.length < 3) {
      return { direction: 'stable', percentage: 0, rSquared: 0 };
    }

    // Constants for age-based weighting
    const AGE_WEIGHT_HALFLIFE = 10;
    const MIN_AGE_WEIGHT = 0.2;

    // Step 1: Calculate age-based weight for each transaction
    const weightedTransactions = transactions.map(t => {
      let weight = 1.0;
      if (targetBuildingYear && t.buildingYear) {
        const yearDiff = Math.abs(t.buildingYear - targetBuildingYear);
        weight = Math.max(MIN_AGE_WEIGHT, Math.exp(-yearDiff / AGE_WEIGHT_HALFLIFE));
      } else if (targetBuildingYear && !t.buildingYear) {
        weight = 0.5;
      }
      // Use unit price (per ㎡) for fair comparison across different sizes
      const unitPrice = t.transactionAmount / t.exclusiveArea;
      return { ...t, weight, unitPrice };
    });

    // Step 2: Aggregate to monthly weighted averages
    const monthlyData: Record<string, { totalWeightedPrice: number; totalWeight: number; count: number }> = {};

    weightedTransactions.forEach(t => {
      const monthKey = `${t.year}-${String(t.month).padStart(2, '0')}`;
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { totalWeightedPrice: 0, totalWeight: 0, count: 0 };
      }
      monthlyData[monthKey].totalWeightedPrice += t.unitPrice * t.weight;
      monthlyData[monthKey].totalWeight += t.weight;
      monthlyData[monthKey].count++;
    });

    // Convert to sorted array of monthly averages
    const sortedMonths = Object.keys(monthlyData).sort();
    if (sortedMonths.length < 3) {
      return { direction: 'stable', percentage: 0, rSquared: 0 };
    }

    const monthlyPoints = sortedMonths.map((month, index) => {
      const data = monthlyData[month];
      const avgPrice = data.totalWeightedPrice / data.totalWeight;
      return {
        x: index, // Month index (0, 1, 2, ...)
        y: avgPrice,
        month,
        count: data.count,
      };
    });

    // Step 3: Linear regression on monthly averages
    const n = monthlyPoints.length;
    const sumX = monthlyPoints.reduce((sum, p) => sum + p.x, 0);
    const sumY = monthlyPoints.reduce((sum, p) => sum + p.y, 0);
    const sumXY = monthlyPoints.reduce((sum, p) => sum + p.x * p.y, 0);
    const sumX2 = monthlyPoints.reduce((sum, p) => sum + p.x * p.x, 0);

    const denominator = n * sumX2 - sumX * sumX;
    if (Math.abs(denominator) < 1e-10) {
      return { direction: 'stable', percentage: 0, rSquared: 0 };
    }

    const slope = (n * sumXY - sumX * sumY) / denominator;
    const intercept = (sumY - slope * sumX) / n;

    // Calculate R-squared
    const yMean = sumY / n;
    const ssTotal = monthlyPoints.reduce((sum, p) => sum + Math.pow(p.y - yMean, 2), 0);
    const ssResidual = monthlyPoints.reduce((sum, p) => {
      const predicted = slope * p.x + intercept;
      return sum + Math.pow(p.y - predicted, 2);
    }, 0);
    const rSquared = ssTotal > 0 ? Math.max(0, Math.min(1, 1 - ssResidual / ssTotal)) : 0;

    // Calculate annualized percentage change
    // slope is change per month, annualize by multiplying by 12
    const annualizedChange = intercept > 0 ? (slope * 12 / intercept) * 100 : 0;

    // Determine direction with adjusted thresholds for monthly data
    // R² thresholds are lower because monthly aggregation improves reliability
    let threshold: number;
    let minR2: number;
    if (rSquared > 0.5) {
      threshold = 3;  // Strong trend
      minR2 = 0.05;
    } else if (rSquared > 0.2) {
      threshold = 5;  // Moderate trend
      minR2 = 0.05;
    } else {
      threshold = 8;  // Weak signal, need larger change
      minR2 = 0.03;
    }

    let direction: 'rising' | 'stable' | 'falling';
    if (annualizedChange > threshold && rSquared > minR2) {
      direction = 'rising';
    } else if (annualizedChange < -threshold && rSquared > minR2) {
      direction = 'falling';
    } else {
      direction = 'stable';
    }

    // Logging
    const totalTxns = transactions.length;
    if (targetBuildingYear) {
      const highWeightCount = weightedTransactions.filter(t => t.weight > 0.7).length;
      const medWeightCount = weightedTransactions.filter(t => t.weight > 0.4 && t.weight <= 0.7).length;
      const lowWeightCount = weightedTransactions.filter(t => t.weight <= 0.4).length;

      console.log('📊 Market trend analysis (Monthly-Aggregated, Age-Weighted):');
      console.log(`   - Target building year: ${targetBuildingYear}`);
      console.log(`   - Transactions: ${totalTxns} → ${n} monthly averages`);
      console.log(`   - Age weight distribution: high=${highWeightCount}, med=${medWeightCount}, low=${lowWeightCount}`);
    } else {
      console.log('📊 Market trend analysis (Monthly-Aggregated):');
      console.log(`   - Transactions: ${totalTxns} → ${n} monthly averages`);
    }

    // Calculate time span for logging
    const timeSpanMonths = n - 1;
    const monthlyChange = slope / intercept * 100;

    console.log(`   - Time span: ${timeSpanMonths} months`);
    console.log(`   - Monthly change: ${monthlyChange.toFixed(2)}%`);
    console.log(`   - Annualized change: ${annualizedChange.toFixed(1)}%`);
    console.log(`   - R-squared (trend reliability): ${(rSquared * 100).toFixed(1)}%`);
    console.log(`   - Threshold: ±${threshold}% (min R²: ${(minR2 * 100).toFixed(0)}%)`);
    console.log(`   - Direction: ${direction}`);

    return {
      direction,
      percentage: Math.abs(annualizedChange),
      rSquared
    };
  }

  /**
   * Determine valuation confidence based on data quality and statistical reliability
   *
   * Factors considered:
   * - R-squared from trend analysis (statistical reliability)
   * - Number of recent transactions (last 90 days)
   * - Total transaction count
   * - Time spread of data
   *
   * @param rSquared - R-squared value from linear regression (0-1)
   * @returns confidence score (0-1 range)
   */
  private determineConfidence(transactions: MolitTransaction[], rSquared: number): number {
    const now = new Date();

    // Count recent transactions (last 3 months)
    const recent = transactions.filter(t => {
      const transactionDate = new Date(t.year, t.month - 1, t.day);
      const daysAgo = (now.getTime() - transactionDate.getTime()) / (1000 * 60 * 60 * 24);
      return daysAgo < 90; // Last 3 months
    });

    // Calculate time span coverage
    const sorted = [...transactions].sort((a, b) => {
      const dateA = new Date(a.year, a.month - 1, a.day);
      const dateB = new Date(b.year, b.month - 1, b.day);
      return dateA.getTime() - dateB.getTime();
    });

    const firstDate = new Date(sorted[0].year, sorted[0].month - 1, sorted[0].day);
    const lastDate = new Date(sorted[sorted.length - 1].year, sorted[sorted.length - 1].month - 1, sorted[sorted.length - 1].day);
    const timeSpanDays = (lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24);

    // Calculate confidence as weighted average of multiple factors
    let confidence = 0;

    // Factor 1: R-squared (50% weight) - Statistical reliability of trend
    // R² > 0.7 = excellent, R² > 0.4 = good, R² > 0.2 = moderate, R² < 0.2 = poor
    const rSquaredScore = Math.min(1, rSquared / 0.7); // Normalize to 0-1 (0.7 = perfect)
    confidence += rSquaredScore * 0.5;

    // Factor 2: Transaction recency (25% weight)
    // 3+ recent = 1.0, 2 recent = 0.7, 1 recent = 0.5, 0 recent = 0.2
    let recencyScore = 0.2;
    if (recent.length >= 3) recencyScore = 1.0;
    else if (recent.length === 2) recencyScore = 0.7;
    else if (recent.length === 1) recencyScore = 0.5;
    confidence += recencyScore * 0.25;

    // Factor 3: Transaction volume (15% weight)
    // 10+ txns = 1.0, 5-9 txns = 0.7, 3-4 txns = 0.5, 1-2 txns = 0.3
    let volumeScore = 0.3;
    if (transactions.length >= 10) volumeScore = 1.0;
    else if (transactions.length >= 5) volumeScore = 0.7;
    else if (transactions.length >= 3) volumeScore = 0.5;
    confidence += volumeScore * 0.15;

    // Factor 4: Time span coverage (10% weight)
    // 180+ days = 1.0, 90-179 days = 0.7, 60-89 days = 0.5, <60 days = 0.3
    let timeSpanScore = 0.3;
    if (timeSpanDays >= 180) timeSpanScore = 1.0;
    else if (timeSpanDays >= 90) timeSpanScore = 0.7;
    else if (timeSpanDays >= 60) timeSpanScore = 0.5;
    confidence += timeSpanScore * 0.1;

    // Cap at 1.0 and ensure minimum of 0.1
    confidence = Math.max(0.1, Math.min(1.0, confidence));

    console.log('📊 Confidence calculation:');
    console.log(`   - R² score: ${(rSquaredScore * 100).toFixed(1)}% (weight: 50%)`);
    console.log(`   - Recency score: ${(recencyScore * 100).toFixed(1)}% (weight: 25%, ${recent.length} recent txns)`);
    console.log(`   - Volume score: ${(volumeScore * 100).toFixed(1)}% (weight: 15%, ${transactions.length} total txns)`);
    console.log(`   - Time span score: ${(timeSpanScore * 100).toFixed(1)}% (weight: 10%, ${timeSpanDays.toFixed(0)} days)`);
    console.log(`   - Final confidence: ${(confidence * 100).toFixed(1)}%`);

    return confidence;
  }

  private formatRecentSales(transactions: MolitTransaction[]) {
    const now = new Date();
    return transactions.slice(0, 5).map(t => {
      const transactionDate = new Date(t.year, t.month - 1, t.day);
      const daysAgo = Math.floor((now.getTime() - transactionDate.getTime()) / (1000 * 60 * 60 * 24));

      return {
        date: `${t.year}-${String(t.month).padStart(2, '0')}-${String(t.day).padStart(2, '0')}`,
        price: t.transactionAmount,
        floor: t.floor,
        daysAgo
      };
    });
  }

  private getTotalFloorsFromTransactions(transactions: MolitTransaction[]): number {
    // Estimate from max floor in transactions
    const maxFloor = Math.max(...transactions.map(t => t.floor));
    return Math.ceil(maxFloor * 1.1); // Assume some higher floors exist
  }

  private async cacheResults(property: PropertyDetails, transactions: MolitTransaction[]) {
    // Cache to database for faster future lookups
    try {
      // Note: property_id should be linked properly in production
      const cacheData = transactions.map(t => ({
        property_id: null,
        transaction_date: `${t.year}-${String(t.month).padStart(2, '0')}-${String(t.day).padStart(2, '0')}`,
        transaction_price: t.transactionAmount,
        floor: t.floor,
        area: t.exclusiveArea,
        data_source: 'molit',
        created_at: new Date().toISOString()
      }));

      await supabaseAdmin.from('transaction_cache').insert(cacheData);
    } catch (error) {
      console.error('Failed to cache transaction data:', error);
      // Don't throw - caching failure shouldn't break valuation
    }
  }
}
