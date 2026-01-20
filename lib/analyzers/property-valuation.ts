import { MolitAPI, getDistrictCode } from '../apis/molit';
import { supabaseAdmin } from '../supabase';
import { PropertyDetails, ValuationResult, MolitTransaction, BuildingType, QualityTier, TierEstimate, TierGuidance, PercentileThresholds } from '../types';

/**
 * Triple-Weighted Valuation Configuration
 *
 * For 연립다세대, we use three weighting factors:
 * 1. Recency: Recent transactions are weighted higher (60-day half-life)
 * 2. Age Similarity: Similar-age buildings are weighted higher (10-year half-life)
 * 3. Area Similarity: Similar-size units are weighted higher (20% of target area half-life)
 *
 * Combined Weight = exp(-daysAgo/60) × exp(-|yearDiff|/10) × exp(-|areaDiff|/(targetArea×0.20))
 */
const VALUATION_CONFIG = {
  // Recency weighting
  RECENCY_HALFLIFE_DAYS: 60,

  // Age similarity weighting (building year)
  AGE_HALFLIFE_YEARS: 10,
  DEFAULT_AGE_WEIGHT: 0.5, // When building year is unknown

  // Area similarity weighting (percentage-based)
  AREA_HALFLIFE_PERCENT: 20, // 20% of target area
  AREA_FILTER_PERCENT: 15, // ±15% pre-filter for multifamily

  // For apartments, we use tighter area filtering (building-level data is more consistent)
  APARTMENT_AREA_TOLERANCE: 2, // ±2㎡ for apartments
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
    premium:  { max: 100 },  // > 75th percentile
  } as Record<QualityTier, { max: number }>,

  // Tier labels
  LABELS: {
    budget:   '하위 25% (Budget)',
    standard: '25-50% (Standard)',
    mid:      '50-75% (Mid)',
    premium:  '상위 25% (Premium)',
  } as Record<QualityTier, string>,

  // Annual depreciation rates by tier (derived from market analysis)
  DEPRECIATION: {
    budget: 0.02,    // 2%/yr - lower quality buildings depreciate faster
    standard: 0.015, // 1.5%/yr
    mid: 0.01,       // 1%/yr
    premium: 0.005,  // 0.5%/yr - premium buildings hold value better
  } as Record<QualityTier, number>,

  // Recency half-life for tiered calculation (days)
  RECENCY_HALFLIFE_DAYS: 90,

  // Tier selection guidance for users
  GUIDANCE: {
    premium: [
      '브랜드 건설사 (대림, 현대, 삼성 등)',
      '역세권 (도보 5분 이내)',
      '최근 리모델링 완료',
      '대로변 / 공원 조망',
      '주차 충분 (세대당 1대 이상)',
    ],
    mid: [
      '중견 건설사',
      '역세권 (도보 10분 이내)',
      '관리 양호',
      '기본 편의시설 구비',
    ],
    standard: [
      '일반 건설사',
      '대중교통 접근 양호',
      '기본 시설 유지 상태',
    ],
    budget: [
      '노후 건물 (20년+)',
      '대중교통 접근 불편',
      '주차 부족',
      '리모델링 필요',
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

    // For apartments: use building name as identifier
    // For multifamily (연립/다세대): use dong as identifier (building names are unreliable)
    const identifier = buildingType === 'apartment'
      ? property.buildingName
      : property.dong;

    console.log(`📊 Valuation for ${buildingType}: identifier="${identifier}", area=${property.exclusiveArea}㎡`);

    // Fetch 12 months of data for better statistical reliability
    // 12 months provides: more data points, full seasonal coverage, better R² values
    const recentTransactions = await this.molitAPI.getRecentTransactionsByType(
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
    } catch (error) {
      console.error('Failed to fetch jeonse transactions:', error);
      // Continue without jeonse data
    }

    if (recentTransactions.length === 0) {
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

    // Step 2: Calculate base value from recent sales using triple-weighted approach
    const baseValue = this.calculateTripleWeightedValue(
      recentTransactions,
      property.exclusiveArea,
      property.buildingYear,
      buildingType
    );

    // Step 2b: For multifamily, also calculate tiered hierarchy estimates
    let tierEstimates: TierEstimate[] | undefined;
    let tierGuidance: TierGuidance | undefined;
    let tierPercentiles: PercentileThresholds | undefined;
    if (buildingType === 'multifamily') {
      const tieredResult = this.calculateTieredHierarchyValue(
        recentTransactions,
        property.exclusiveArea,
        property.buildingYear
      );
      tierEstimates = tieredResult.estimates;
      tierPercentiles = tieredResult.thresholds;
      tierGuidance = TIERED_CONFIG.GUIDANCE;
    }

    // Step 3: Apply floor premium/discount
    const totalFloors = this.getTotalFloorsFromTransactions(recentTransactions);
    const floorAdjustedValue = this.applyFloorAdjustment(
      baseValue,
      property.floor,
      totalFloors
    );

    // Step 4: Calculate trend (with R-squared for confidence)
    const trend = this.calculateTrend(recentTransactions);

    // Step 5: Determine confidence (using R-squared + data quality)
    const confidence = this.determineConfidence(recentTransactions, trend.rSquared);

    // Step 6: Determine value range
    const valueLow = Math.floor(floorAdjustedValue * 0.95);
    const valueMid = Math.floor(floorAdjustedValue);
    const valueHigh = Math.floor(floorAdjustedValue * 1.05);

    // Step 7: Cache results
    await this.cacheResults(property, recentTransactions);

    return {
      valueLow,
      valueMid,
      valueHigh,
      confidence,
      recentSales: this.formatRecentSales(recentTransactions),
      pricePerPyeong: Math.floor(valueMid / (property.exclusiveArea * 0.3025)),
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
      // Tiered hierarchy for multifamily
      tierEstimates,
      tierGuidance,
      tierPercentiles,
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
    return 'premium';
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
    };
  }

  /**
   * Calculate tiered hierarchy valuation for 연립다세대
   *
   * This method stratifies transactions by quality tier using percentile-based
   * classification (adapts to any district's price level) and calculates
   * separate estimates for each tier, allowing users to select the
   * appropriate tier based on property characteristics.
   *
   * @param transactions - Filtered transactions from MOLIT API
   * @param targetArea - Target property's exclusive area (㎡)
   * @param targetBuildingYear - Target property's building year
   * @returns Array of TierEstimate for each quality tier with sufficient data
   */
  private calculateTieredHierarchyValue(
    transactions: MolitTransaction[],
    targetArea: number,
    targetBuildingYear: number | undefined
  ): { estimates: TierEstimate[]; thresholds: PercentileThresholds } {
    if (transactions.length === 0) return { estimates: [], thresholds: { p25: 0, p50: 0, p75: 0 } };

    const now = new Date();
    const tiers: QualityTier[] = ['budget', 'standard', 'mid', 'premium'];

    // Calculate percentile thresholds from all transactions
    const thresholds = this.calculatePercentileThresholds(transactions);

    // Classify each transaction by quality tier using percentiles
    const transactionsByTier: Record<QualityTier, Array<MolitTransaction & { unitPrice: number; daysAgo: number }>> = {
      budget: [],
      standard: [],
      mid: [],
      premium: [],
    };

    transactions.forEach(t => {
      const unitPrice = t.transactionAmount / t.exclusiveArea;
      const tier = this.classifyQualityTier(unitPrice, thresholds);
      const transactionDate = new Date(t.year, t.month - 1, t.day);
      const daysAgo = (now.getTime() - transactionDate.getTime()) / (1000 * 60 * 60 * 24);
      transactionsByTier[tier].push({ ...t, unitPrice, daysAgo });
    });

    console.log('\n📊 Tiered Hierarchy Valuation (Percentile-Based):');
    console.log(`   Target Area: ${targetArea}㎡, Target Year: ${targetBuildingYear || 'unknown'}`);
    console.log(`   Percentile Thresholds: P25=${(thresholds.p25/10000).toFixed(0)}만/㎡, P50=${(thresholds.p50/10000).toFixed(0)}만/㎡, P75=${(thresholds.p75/10000).toFixed(0)}만/㎡`);
    console.log(`   Tier distribution: budget=${transactionsByTier.budget.length}, standard=${transactionsByTier.standard.length}, mid=${transactionsByTier.mid.length}, premium=${transactionsByTier.premium.length}`);

    const tierEstimates: TierEstimate[] = [];

    for (const tier of tiers) {
      const tierTxns = transactionsByTier[tier];
      if (tierTxns.length === 0) continue;

      const depreciation = TIERED_CONFIG.DEPRECIATION[tier];

      // Calculate recency-weighted unit price with age adjustment
      let totalWeightedUnitPrice = 0;
      let totalWeight = 0;

      tierTxns.forEach(t => {
        // Recency weight
        const recencyWeight = Math.exp(-t.daysAgo / TIERED_CONFIG.RECENCY_HALFLIFE_DAYS);

        // Age adjustment: adjust comparable's unit price to target building year
        let ageAdjustment = 1.0;
        if (targetBuildingYear && t.buildingYear) {
          const yearDiff = targetBuildingYear - t.buildingYear;
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
      console.log(`   - Transactions: ${tierTxns.length}, Effective N: ${effectiveSampleSize.toFixed(1)}`);
      console.log(`   - Unit Price: ${(weightedUnitPrice / 10000).toFixed(0)}만원/㎡`);
      console.log(`   - Estimated Value: ${(estimatedValue / 100000000).toFixed(2)}억원`);
    }

    return { estimates: tierEstimates, thresholds };
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
   * Calculate market trend using linear regression for statistical reliability
   *
   * This method uses linear regression to detect real trends vs random noise:
   * - Calculates best-fit line through transaction data
   * - Uses R-squared to measure trend reliability (0-1)
   * - Annualizes percentage change for comparability
   * - Dynamic thresholds based on statistical confidence
   *
   * @returns direction ('rising' | 'stable' | 'falling'), percentage change, and R-squared confidence
   */
  private calculateTrend(transactions: MolitTransaction[]): {
    direction: 'rising' | 'stable' | 'falling';
    percentage: number;
    rSquared: number;
  } {
    if (transactions.length < 3) {
      // Need at least 3 data points for meaningful regression
      return { direction: 'stable', percentage: 0, rSquared: 0 };
    }

    // Sort by date
    const sorted = [...transactions].sort((a, b) => {
      const dateA = new Date(a.year, a.month - 1, a.day);
      const dateB = new Date(b.year, b.month - 1, b.day);
      return dateA.getTime() - dateB.getTime();
    });

    // Convert to time series (days since first transaction, price)
    const firstDate = new Date(sorted[0].year, sorted[0].month - 1, sorted[0].day);
    const dataPoints = sorted.map(t => {
      const date = new Date(t.year, t.month - 1, t.day);
      const daysSinceFirst = (date.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24);
      return { x: daysSinceFirst, y: t.transactionAmount };
    });

    // Calculate linear regression: y = mx + b
    // Using least squares method to find best-fit line
    const n = dataPoints.length;
    const sumX = dataPoints.reduce((sum, p) => sum + p.x, 0);
    const sumY = dataPoints.reduce((sum, p) => sum + p.y, 0);
    const sumXY = dataPoints.reduce((sum, p) => sum + p.x * p.y, 0);
    const sumX2 = dataPoints.reduce((sum, p) => sum + p.x * p.x, 0);
    const sumY2 = dataPoints.reduce((sum, p) => sum + p.y * p.y, 0);

    // Slope (m) = rate of price change per day
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Calculate R-squared (goodness of fit) - measures how well trend line fits data
    // R² = 1 means perfect fit, R² = 0 means no trend
    const yMean = sumY / n;
    const ssTotal = dataPoints.reduce((sum, p) => sum + Math.pow(p.y - yMean, 2), 0);
    const ssResidual = dataPoints.reduce((sum, p) => {
      const predicted = slope * p.x + intercept;
      return sum + Math.pow(p.y - predicted, 2);
    }, 0);
    const rSquared = Math.max(0, Math.min(1, 1 - (ssResidual / ssTotal)));

    // Calculate annualized percentage change
    const firstPrice = sorted[0].transactionAmount;
    const lastPrice = sorted[sorted.length - 1].transactionAmount;
    const timeSpanDays = dataPoints[dataPoints.length - 1].x;
    const timeSpanYears = Math.max(0.1, timeSpanDays / 365); // Avoid division by zero

    // Annualized percentage change (normalized to 1 year)
    const rawChange = ((lastPrice - firstPrice) / firstPrice) * 100;
    const annualizedChange = rawChange / timeSpanYears;

    // Determine direction with dynamic thresholds based on R-squared confidence
    // Higher R² = more reliable trend = can use smaller threshold
    // Lower R² = noisy data = need larger change to confirm trend
    let threshold: number;
    if (rSquared > 0.7) {
      threshold = 2; // Strong trend, use 2% threshold
    } else if (rSquared > 0.4) {
      threshold = 3; // Moderate trend, use 3% threshold
    } else {
      threshold = 5; // Weak trend, use 5% threshold (conservative)
    }

    let direction: 'rising' | 'stable' | 'falling';
    if (annualizedChange > threshold && rSquared > 0.3) {
      // Rising trend with sufficient confidence
      direction = 'rising';
    } else if (annualizedChange < -threshold && rSquared > 0.3) {
      // Falling trend with sufficient confidence
      direction = 'falling';
    } else {
      // Either change is small OR R² is too low (noisy data)
      direction = 'stable';
    }

    console.log('📊 Market trend analysis (Linear Regression):');
    console.log(`   - Data points: ${n}`);
    console.log(`   - Time span: ${timeSpanDays.toFixed(0)} days (${timeSpanYears.toFixed(2)} years)`);
    console.log(`   - Raw change: ${rawChange.toFixed(1)}%`);
    console.log(`   - Annualized change: ${annualizedChange.toFixed(1)}%`);
    console.log(`   - R-squared (trend reliability): ${(rSquared * 100).toFixed(1)}%`);
    console.log(`   - Threshold: ±${threshold}%`);
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
