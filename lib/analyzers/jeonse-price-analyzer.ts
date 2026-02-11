import { MolitTransaction, QualityTier, TieredExpectedJeonse } from '../types';

// Depreciation rates by tier (same as property-valuation and wolse-price-analyzer)
const JEONSE_TIERED_CONFIG = {
  DEPRECIATION: {
    budget: 0.02,    // 2%/yr
    standard: 0.015, // 1.5%/yr
    mid: 0.01,       // 1%/yr
    premium: 0.005,  // 0.5%/yr
  } as Record<QualityTier, number>,
};

/**
 * Jeonse Price Analysis Result
 */
export interface JeonsePriceAnalysisResult {
  // User's input
  proposedJeonse: number;

  // Regression results
  expectedJeonse: number;        // From regression at daysAgo=0
  jeonseDifference: number;      // proposedJeonse - expectedJeonse (positive = overpaying)
  jeonseDifferencePercent: number;

  // Assessment
  assessment: 'GOOD_DEAL' | 'FAIR' | 'OVERPRICED' | 'SEVERELY_OVERPRICED';
  assessmentDetails: string;

  // Savings
  potentialSavings: number;      // If overpaying, the excess amount

  // Trend
  trend: {
    direction: 'RISING' | 'STABLE' | 'DECLINING';
    percentage: number;          // Annual percentage change
    advice: string;
  };

  // For scatter plot
  transactionData: Array<{
    daysAgo: number;
    price: number;               // In 억
    date: string;
    floor: number;
    exclusiveArea: number;
  }>;

  // Regression line
  regressionLine: {
    slope: number;               // 억/day
    intercept: number;           // Value at daysAgo=0 (in 억)
  };

  contractCount: number;
}

/**
 * Theil-Sen Regression for time trend
 * Returns slope (원/day) and intercept (value at daysAgo=0, i.e., today)
 *
 * Theil-Sen is robust to outliers - uses median of all pairwise slopes
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
      const dx = data[i].daysAgo - data[j].daysAgo; // older - newer
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

/**
 * Filter out renewal contracts (갱신) from transactions
 *
 * Renewal contracts are limited to 5% increase under Korean law,
 * so they don't represent true market rates.
 */
function filterRenewalContracts(transactions: MolitTransaction[]): {
  filtered: MolitTransaction[];
  renewalCount: number;
} {
  const filtered: MolitTransaction[] = [];
  let renewalCount = 0;

  for (const t of transactions) {
    // Check for renewal contract (갱신)
    // contractType can be '신규', '갱신', or undefined (old data without this field)
    if (t.contractType === '갱신') {
      renewalCount++;
    } else {
      filtered.push(t);
    }
  }

  return { filtered, renewalCount };
}

/**
 * Remove outliers using IQR method
 */
function removeOutliers(transactions: MolitTransaction[]): {
  clean: MolitTransaction[];
  removed: number;
} {
  if (transactions.length < 4) {
    return { clean: transactions, removed: 0 };
  }

  const multiplier = 1.5;

  // Calculate IQR for prices
  const sortedPrices = [...transactions].sort((a, b) => a.transactionAmount - b.transactionAmount);
  const q1Idx = Math.floor(transactions.length * 0.25);
  const q3Idx = Math.floor(transactions.length * 0.75);
  const q1 = sortedPrices[q1Idx].transactionAmount;
  const q3 = sortedPrices[q3Idx].transactionAmount;
  const iqr = q3 - q1;
  const lower = q1 - multiplier * iqr;
  const upper = q3 + multiplier * iqr;

  const clean = transactions.filter(t =>
    t.transactionAmount >= lower && t.transactionAmount <= upper
  );

  return {
    clean,
    removed: transactions.length - clean.length
  };
}

/**
 * Format amount for display
 */
function formatWon(amount: number): string {
  if (amount >= 100000000) {
    return `${(amount / 100000000).toFixed(2)}억`;
  } else if (amount >= 10000) {
    return `${(amount / 10000).toLocaleString()}만원`;
  }
  return `${amount.toLocaleString()}원`;
}

/**
 * Jeonse Price Analyzer
 *
 * Analyzes a user's proposed jeonse against recent market transactions.
 * Uses Theil-Sen regression to calculate expected jeonse at today's date.
 */
export class JeonsePriceAnalyzer {
  private readonly AREA_TOLERANCE = 5; // ±5 sqm tolerance for filtering

  /**
   * Analyze proposed jeonse against market data
   */
  analyze(
    proposedJeonse: number,
    transactions: MolitTransaction[],
    userArea?: number
  ): JeonsePriceAnalysisResult | null {
    // Filter by area if provided
    let filteredTransactions = transactions;
    if (userArea) {
      filteredTransactions = this.filterByArea(transactions, userArea);
    }

    // Filter out renewal contracts (갱신)
    // Renewals are capped at 5% increase and don't represent true market rates
    const originalCount = filteredTransactions.length;
    const renewalFilterResult = filterRenewalContracts(filteredTransactions);
    filteredTransactions = renewalFilterResult.filtered;

    if (renewalFilterResult.renewalCount > 0) {
      console.log(`\n🔍 RENEWAL CONTRACT FILTER:`);
      console.log(`   Original: ${originalCount} transactions`);
      console.log(`   🔄 Renewals (갱신) removed: ${renewalFilterResult.renewalCount}`);
      console.log(`   ✅ New contracts (신규) kept: ${filteredTransactions.length}`);
    }

    // Need at least 3 transactions for meaningful analysis
    if (filteredTransactions.length < 3) {
      console.log(`⚠️ Insufficient transactions for jeonse price analysis: ${filteredTransactions.length}`);
      return null;
    }

    // Remove outliers
    const { clean, removed } = removeOutliers(filteredTransactions);
    console.log(`📊 Jeonse price analysis: ${clean.length} clean transactions (${removed} outliers removed)`);

    if (clean.length < 3) {
      console.log(`⚠️ Insufficient clean transactions: ${clean.length}`);
      return null;
    }

    // Convert to time series data
    const now = new Date();
    const timeSeriesData = clean.map(t => {
      const txDate = new Date(t.year, t.month - 1, t.day);
      const daysAgo = Math.floor((now.getTime() - txDate.getTime()) / (1000 * 60 * 60 * 24));
      return {
        daysAgo,
        value: t.transactionAmount,
        transaction: t
      };
    });

    // Run Theil-Sen regression
    const regression = theilSenTimeRegression(
      timeSeriesData.map(d => ({ daysAgo: d.daysAgo, value: d.value }))
    );

    // Expected jeonse at today (daysAgo = 0)
    const expectedJeonse = regression.intercept;
    const jeonseDifference = proposedJeonse - expectedJeonse;
    const jeonseDifferencePercent = (jeonseDifference / expectedJeonse) * 100;

    // Calculate trend
    const trend = this.calculateTrend(regression.slope, expectedJeonse, timeSeriesData);

    // Generate assessment
    const assessment = this.generateAssessment(jeonseDifference, jeonseDifferencePercent, expectedJeonse);

    // Calculate potential savings (if overpaying)
    const potentialSavings = Math.max(0, jeonseDifference);

    // Prepare scatter plot data (convert to 억)
    const transactionData = timeSeriesData.map(d => ({
      daysAgo: d.daysAgo,
      price: d.value / 100000000, // Convert to 억
      date: `${d.transaction.year}.${d.transaction.month}.${d.transaction.day}`,
      floor: d.transaction.floor,
      exclusiveArea: d.transaction.exclusiveArea
    }));

    console.log(`\n✅ Jeonse Price Analysis Complete:`);
    console.log(`   Expected Jeonse: ${formatWon(expectedJeonse)}`);
    console.log(`   Proposed Jeonse: ${formatWon(proposedJeonse)}`);
    console.log(`   Difference: ${formatWon(jeonseDifference)} (${jeonseDifferencePercent.toFixed(1)}%)`);
    console.log(`   Assessment: ${assessment.level}`);
    console.log(`   Trend: ${trend.direction} (${trend.percentage.toFixed(1)}% annually)`);

    return {
      proposedJeonse,
      expectedJeonse,
      jeonseDifference,
      jeonseDifferencePercent,
      assessment: assessment.level,
      assessmentDetails: assessment.details,
      potentialSavings,
      trend,
      transactionData,
      regressionLine: {
        slope: regression.slope / 100000000, // Convert to 억/day
        intercept: regression.intercept / 100000000 // Convert to 억
      },
      contractCount: clean.length
    };
  }

  /**
   * Filter transactions by area (±5 sqm tolerance)
   */
  private filterByArea(transactions: MolitTransaction[], targetArea: number): MolitTransaction[] {
    return transactions.filter(t =>
      Math.abs(t.exclusiveArea - targetArea) <= this.AREA_TOLERANCE
    );
  }

  /**
   * Calculate trend from regression slope
   *
   * Note: Since X-axis is daysAgo (higher = older), the slope interpretation is:
   * - Positive slope: prices were HIGHER in the past → DECLINING market
   * - Negative slope: prices are HIGHER now → RISING market
   */
  private calculateTrend(
    slope: number,
    currentValue: number,
    data: { daysAgo: number; value: number }[]
  ): {
    direction: 'RISING' | 'STABLE' | 'DECLINING';
    percentage: number;
    advice: string;
  } {
    // Calculate annual percentage change
    // slope is 원/day, so annual change = slope * 365
    // NEGATE because positive slope with daysAgo means prices are declining
    const annualChange = -slope * 365;
    const annualPercentage = (annualChange / currentValue) * 100;

    // Determine direction (threshold: ±3%)
    let direction: 'RISING' | 'STABLE' | 'DECLINING';
    if (annualPercentage > 3) {
      direction = 'RISING';
    } else if (annualPercentage < -3) {
      direction = 'DECLINING';
    } else {
      direction = 'STABLE';
    }

    // Generate advice
    let advice: string;
    switch (direction) {
      case 'RISING':
        advice = `Jeonse prices are rising (+${Math.abs(annualPercentage).toFixed(1)}% annually). If this is a fair deal, consider not delaying too long.`;
        break;
      case 'DECLINING':
        advice = `Jeonse prices are declining (${Math.abs(annualPercentage).toFixed(1)}% annually). You may have negotiating leverage - landlords may be motivated to close deals quickly.`;
        break;
      case 'STABLE':
      default:
        advice = `Jeonse prices are stable. Take your time to find the best deal and negotiate confidently.`;
    }

    return {
      direction,
      percentage: Math.abs(annualPercentage),
      advice
    };
  }

  /**
   * Generate assessment based on price difference
   */
  private generateAssessment(
    difference: number,
    differencePercent: number,
    expectedJeonse: number
  ): {
    level: 'GOOD_DEAL' | 'FAIR' | 'OVERPRICED' | 'SEVERELY_OVERPRICED';
    details: string;
  } {
    // Good deal: more than 3% below expected
    if (differencePercent <= -3) {
      return {
        level: 'GOOD_DEAL',
        details: `Your proposed jeonse is ${formatWon(Math.abs(difference))} (${Math.abs(differencePercent).toFixed(1)}%) below the expected market price of ${formatWon(expectedJeonse)}. This is a good deal, but verify why the price is low - check the property condition and landlord's financial status.`
      };
    }

    // Fair: within ±3% of expected
    if (differencePercent <= 3) {
      return {
        level: 'FAIR',
        details: `Your proposed jeonse is within ${Math.abs(differencePercent).toFixed(1)}% of the expected market price of ${formatWon(expectedJeonse)}. This is a fair price aligned with recent market transactions.`
      };
    }

    // Overpriced: 3-10% above expected
    if (differencePercent <= 10) {
      return {
        level: 'OVERPRICED',
        details: `Your proposed jeonse is ${formatWon(difference)} (${differencePercent.toFixed(1)}%) above the expected market price of ${formatWon(expectedJeonse)}. Consider negotiating down to save ${formatWon(difference)}.`
      };
    }

    // Severely overpriced: more than 10% above expected
    return {
      level: 'SEVERELY_OVERPRICED',
      details: `Your proposed jeonse is ${formatWon(difference)} (${differencePercent.toFixed(1)}%) above the expected market price of ${formatWon(expectedJeonse)}. This is significantly overpriced - strongly recommend negotiating or looking for alternatives.`
    };
  }

  /**
   * Tiered jeonse analysis for dong-tiered valuations.
   *
   * Segments jeonse transactions into 4 quality tiers based on unit jeonse
   * percentiles (P25/P50/P75), then runs Theil-Sen regression per tier.
   *
   * @returns Tiered expected jeonse values and percentile thresholds, or null if insufficient data
   */
  analyzeTiered(
    transactions: MolitTransaction[],
    userArea?: number,
    targetBuildingYear?: number
  ): { tieredExpectedJeonse: TieredExpectedJeonse[]; percentileThresholds: { p25: number; p50: number; p75: number } } | null {
    // Step 1: Filter by area if provided
    let filtered = transactions;
    if (userArea) {
      filtered = this.filterByArea(transactions, userArea);
    }

    // Filter out renewal contracts (갱신)
    const renewalResult = filterRenewalContracts(filtered);
    filtered = renewalResult.filtered;

    // Remove outliers
    const { clean } = removeOutliers(filtered);

    if (clean.length < 4) {
      console.log(`⚠️ Insufficient transactions for tiered jeonse analysis: ${clean.length}`);
      return null;
    }

    // Step 2: Calculate unit jeonse per transaction
    const now = new Date();
    const enriched = clean.map(t => {
      const unitJeonse = t.transactionAmount / t.exclusiveArea;
      const txDate = new Date(t.year, t.month - 1, t.day);
      const daysAgo = Math.floor((now.getTime() - txDate.getTime()) / (1000 * 60 * 60 * 24));
      return { ...t, unitJeonse, daysAgo };
    });

    // Step 3: Compute percentile thresholds
    const thresholds = this.calculatePercentileThresholds(enriched.map(e => e.unitJeonse));

    console.log(`\n📊 Tiered Jeonse Analysis:`);
    console.log(`   Transactions: ${enriched.length} clean`);
    console.log(`   P25=${(thresholds.p25/10000).toFixed(0)}만/㎡, P50=${(thresholds.p50/10000).toFixed(0)}만/㎡, P75=${(thresholds.p75/10000).toFixed(0)}만/㎡`);

    // Step 4: Classify into tiers
    const tierLabels: Record<QualityTier, string> = {
      budget: 'Budget Tier',
      standard: 'Standard Tier',
      mid: 'Mid Tier',
      premium: 'Premium Tier',
    };

    const tiers: QualityTier[] = ['budget', 'standard', 'mid', 'premium'];
    const transactionsByTier: Record<QualityTier, typeof enriched> = {
      budget: [],
      standard: [],
      mid: [],
      premium: [],
    };

    enriched.forEach(t => {
      const tier = this.classifyTier(t.unitJeonse, thresholds);
      transactionsByTier[tier].push(t);
    });

    console.log(`   Tier distribution: budget=${transactionsByTier.budget.length}, standard=${transactionsByTier.standard.length}, mid=${transactionsByTier.mid.length}, premium=${transactionsByTier.premium.length}`);

    // Step 5: Run Theil-Sen regression per tier
    const tieredExpectedJeonse: TieredExpectedJeonse[] = [];

    for (const tier of tiers) {
      const tierTxns = transactionsByTier[tier];
      if (tierTxns.length < 3) {
        console.log(`   ${tierLabels[tier]}: skipped (${tierTxns.length} < 3 transactions)`);
        continue;
      }

      const regression = theilSenTimeRegression(
        tierTxns.map(t => ({ daysAgo: t.daysAgo, value: t.transactionAmount }))
      );

      // Calculate recency-weighted unit jeonse with age adjustment
      const HALFLIFE_DAYS = 90;
      const depreciation = JEONSE_TIERED_CONFIG.DEPRECIATION[tier];

      let totalWeightedUnitJeonse = 0;
      let totalWeight = 0;

      tierTxns.forEach(t => {
        const recencyWeight = Math.exp(-t.daysAgo / HALFLIFE_DAYS);

        // Age adjustment: normalize comparable's jeonse to target building year
        let ageAdjustment = 1.0;
        if (targetBuildingYear && t.buildingYear) {
          const yearDiff = targetBuildingYear - t.buildingYear;
          ageAdjustment = 1 + (yearDiff * depreciation);
        }

        totalWeightedUnitJeonse += t.unitJeonse * ageAdjustment * recencyWeight;
        totalWeight += recencyWeight;
      });

      const weightedUnitJeonse = totalWeightedUnitJeonse / totalWeight;

      // Calculate effective sample size
      const weights = tierTxns.map(t => Math.exp(-t.daysAgo / HALFLIFE_DAYS));
      const sumW = weights.reduce((a, b) => a + b, 0);
      const sumW2 = weights.reduce((a, b) => a + b * b, 0);
      const effectiveSampleSize = (sumW * sumW) / sumW2;

      tieredExpectedJeonse.push({
        tier,
        label: tierLabels[tier],
        expectedJeonse: Math.round(regression.intercept),
        unitJeonse: Math.round(weightedUnitJeonse),
        transactionCount: tierTxns.length,
        effectiveSampleSize: Math.round(effectiveSampleSize * 10) / 10,
        depreciationRate: depreciation,
      });

      console.log(`   ${tierLabels[tier]}: expected=${formatWon(regression.intercept)}, unitJeonse=${(weightedUnitJeonse/10000).toFixed(0)}만/㎡, n=${tierTxns.length}, effN=${effectiveSampleSize.toFixed(1)}`);
    }

    if (tieredExpectedJeonse.length === 0) {
      console.log(`   ⚠️ No tiers had sufficient transactions`);
      return null;
    }

    return { tieredExpectedJeonse, percentileThresholds: thresholds };
  }

  /**
   * Calculate P25/P50/P75 percentile thresholds from unit values
   */
  private calculatePercentileThresholds(values: number[]): { p25: number; p50: number; p75: number } {
    if (values.length === 0) return { p25: 0, p50: 0, p75: 0 };

    const sorted = [...values].sort((a, b) => a - b);
    const n = sorted.length;

    const getPercentile = (p: number): number => {
      const idx = (p / 100) * (n - 1);
      const lower = Math.floor(idx);
      const upper = Math.ceil(idx);
      const weight = idx - lower;
      return sorted[lower] * (1 - weight) + sorted[upper] * weight;
    };

    return {
      p25: getPercentile(25),
      p50: getPercentile(50),
      p75: getPercentile(75),
    };
  }

  /**
   * Classify a transaction into a quality tier based on unit jeonse
   */
  private classifyTier(
    unitJeonse: number,
    thresholds: { p25: number; p50: number; p75: number }
  ): QualityTier {
    if (unitJeonse < thresholds.p25) return 'budget';
    if (unitJeonse < thresholds.p50) return 'standard';
    if (unitJeonse < thresholds.p75) return 'mid';
    return 'premium';
  }
}
