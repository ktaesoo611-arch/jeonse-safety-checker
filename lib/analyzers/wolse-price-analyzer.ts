import { WolseRateCalculator, MarketRateResult, TimeAdjustedTransaction } from './wolse-rate-calculator';
import {
  WolseQuote,
  WolseAnalysisResult,
  WolseNegotiationOption,
  WolseTransaction,
  BuildingType,
  QualityTier,
  TieredExpectedRent
} from '../types';

/**
 * BOK Rate and Conversion Rate Constants
 * Legal conversion rate = min(10%, BOK base rate + 2%)
 * Current BOK rate: 2.5% (as of Dec 2024)
 */
const CURRENT_BOK_RATE = 2.5;
const CURRENT_CONVERSION_RATE = Math.min(10, CURRENT_BOK_RATE + 2) / 100; // 4.5% as decimal

/**
 * Multifamily Wolse Filtering Configuration
 * Similar to Est. Value, filter by floor and building age for better comparables
 */
const MULTIFAMILY_WOLSE_CONFIG = {
  // Minimum transactions after filtering
  MIN_TRANSACTIONS: 5,

  // Building age tolerance (years)
  AGE_TOLERANCE_PRIMARY: 10,   // ±10 years
  AGE_TOLERANCE_FALLBACK: 15,  // ±15 years

  // Recency half-life (days)
  RECENCY_HALFLIFE_DAYS: 90,

  // Tier labels
  LABELS: {
    budget: '하위 25% (Budget)',
    standard: '25-50% (Standard)',
    mid: '50-75% (Mid)',
    premium: '상위 25% (Premium)',
  } as Record<QualityTier, string>,

  // Annual depreciation rates by tier (applied to jeonse values)
  DEPRECIATION: {
    budget: 0.02,    // 2%/yr
    standard: 0.015, // 1.5%/yr
    mid: 0.01,       // 1%/yr
    premium: 0.005,  // 0.5%/yr
  } as Record<QualityTier, number>,
};

/**
 * Result of user rent comparison against market expectation
 */
interface UserRentComparison {
  expectedRent: number;        // Expected rent at user's deposit level
  actualRent: number;          // User's actual rent
  rentDifference: number;      // actualRent - expectedRent (positive = overpaying)
  rentDifferencePercent: number; // Percentage difference
  meanDeposit: number;         // Mean deposit from clean transactions
  meanRent: number;            // Mean rent from clean transactions
  cleanTransactionCount: number; // Number of transactions after outlier removal
  outliersRemoved: number;     // Number of outliers removed
  // Jeonse-centric data
  impliedJeonseToday: number;  // Regression-derived jeonse price at today
  userImpliedJeonse: number;   // User's implied jeonse from their quote
  jeonseSlope: number;         // Jeonse trend slope (원/month)
}

/**
 * Calculate implied jeonse from a wolse transaction
 * jeonse = deposit + rent × 12 / rate
 *
 * Uses CURRENT rate for all transactions to avoid rate-change noise
 */
function getImpliedJeonse(deposit: number, rent: number): number {
  return deposit + rent * 12 / CURRENT_CONVERSION_RATE;
}

/**
 * Theil-Sen Regression for time trend
 * Returns slope (원/day) and intercept (value at daysAgo=0, i.e., today)
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
 * Wolse Price Analyzer
 *
 * Analyzes a user's wolse quote against market data and legal limits.
 * Uses market rate regression to calculate expected rent at user's deposit level.
 */
export class WolsePriceAnalyzer {
  private rateCalculator: WolseRateCalculator;

  constructor(apiKey: string) {
    this.rateCalculator = new WolseRateCalculator(apiKey);
  }

  /**
   * Remove outliers from transactions using IQR method
   * Outliers are transactions where deposit OR rent falls outside IQR bounds
   * Uses tighter bounds (1.0×IQR) for dong/district level data due to higher variance
   */
  private removeOutliers(
    transactions: WolseTransaction[],
    dataSource: 'building' | 'dong' | 'district' | 'adjacent_districts' = 'building'
  ): {
    clean: WolseTransaction[];
    removed: WolseTransaction[];
  } {
    if (transactions.length < 4) {
      return { clean: transactions, removed: [] };
    }

    // Use tighter bounds for dong/district level data (higher variance)
    const multiplier = dataSource === 'building' ? 1.5 : 1.0;

    // Calculate IQR for deposits
    const sortedDeposits = [...transactions].sort((a, b) => a.deposit - b.deposit);
    const q1DepositIdx = Math.floor(transactions.length * 0.25);
    const q3DepositIdx = Math.floor(transactions.length * 0.75);
    const q1Deposit = sortedDeposits[q1DepositIdx].deposit;
    const q3Deposit = sortedDeposits[q3DepositIdx].deposit;
    const iqrDeposit = q3Deposit - q1Deposit;
    const depositLower = q1Deposit - multiplier * iqrDeposit;
    const depositUpper = q3Deposit + multiplier * iqrDeposit;

    // Calculate IQR for rents
    const sortedRents = [...transactions].sort((a, b) => a.monthlyRent - b.monthlyRent);
    const q1Rent = sortedRents[q1DepositIdx].monthlyRent;
    const q3Rent = sortedRents[q3DepositIdx].monthlyRent;
    const iqrRent = q3Rent - q1Rent;
    const rentLower = q1Rent - multiplier * iqrRent;
    const rentUpper = q3Rent + multiplier * iqrRent;

    const clean: WolseTransaction[] = [];
    const removed: WolseTransaction[] = [];

    for (const t of transactions) {
      const depositOutlier = t.deposit < depositLower || t.deposit > depositUpper;
      const rentOutlier = t.monthlyRent < rentLower || t.monthlyRent > rentUpper;

      if (depositOutlier || rentOutlier) {
        removed.push(t);
      } else {
        clean.push(t);
      }
    }

    return { clean, removed };
  }

  /**
   * Analyze a user's wolse quote
   *
   * For 연립/다세대 (multifamily):
   * - Calculates tiered expected rent (budget/standard/mid/premium)
   * - Uses selectedTier to align with user's Est. Value tier selection
   * - Falls back to 'standard' tier if not specified
   *
   * @param selectedTier - User's selected quality tier from Est. Value (for multifamily)
   * @param targetBuildingYear - Target property's building year (for age filtering)
   */
  async analyzeQuote(
    city: string,
    district: string,
    dong: string,
    apartmentName: string,
    exclusiveArea: number,
    quote: WolseQuote,
    buildingType: BuildingType = 'apartment',
    selectedTier?: QualityTier,
    targetBuildingYear?: number
  ): Promise<WolseAnalysisResult> {
    console.log('\n🔍 Starting Wolse Price Analysis');
    console.log(`   Building Type: ${buildingType}`);
    console.log(`   Quote: ${(quote.deposit / 10000).toLocaleString()}만원 보증금 / ${(quote.monthlyRent / 10000).toLocaleString()}만원 월세`);
    if (buildingType === 'multifamily' || buildingType === 'officetel') {
      console.log(`   Selected Tier: ${selectedTier || 'standard (default)'}`);
      console.log(`   Target Building Year: ${targetBuildingYear || 'unknown'}`);
    }

    // Step 1: Get market rate data (routes to correct API based on building type)
    const marketData = await this.rateCalculator.calculateMarketRate(
      city,
      district,
      dong,
      apartmentName,
      exclusiveArea,
      12, // monthsBack
      buildingType
    );

    // Step 1.5: For multifamily (or officetel with dong-level data), calculate tiered expected rent
    let tieredExpectedRent: TieredExpectedRent[] | undefined;
    let selectedTierExpectedRent: number | undefined;
    let filteredTransactions: WolseTransaction[] | undefined;

    if (buildingType === 'multifamily' || (buildingType === 'officetel' && marketData.dataSource === 'dong')) {
      const tieredResult = this.calculateTieredExpectedRent(
        marketData.transactions,
        quote.deposit,
        exclusiveArea,
        undefined, // Skip age filter - more transactions = better tier distribution
        targetBuildingYear // Age adjustment (depreciation normalization) still applied
      );
      tieredExpectedRent = tieredResult.tieredExpectedRent;
      filteredTransactions = tieredResult.filteredTransactions;

      // Find the selected tier's expected rent (default to 'mid' — must match frontend default)
      const tierToUse = selectedTier || 'mid';
      const selectedTierData = tieredExpectedRent.find(t => t.tier === tierToUse);
      if (selectedTierData) {
        selectedTierExpectedRent = selectedTierData.expectedRent;
        console.log(`\n   📌 Using ${tierToUse} tier expected rent: ${(selectedTierExpectedRent / 10000).toFixed(1)}만원`);
      }
    }

    // Step 2: Compare user's rent to market expectation (Option B: Raw Regression + MK Adjustment)
    const rentComparison = this.compareUserRentToMarket(
      quote,
      marketData.transactions,
      marketData.marketRate,
      marketData.dataSource,
      marketData.timeAdjustedTransactions,
      marketData.trend  // Pass trend for MK adjustment
    );

    // Step 3: Derive user's implied rate for backwards compatibility
    const userImpliedRate = this.deriveUserImpliedRate(rentComparison, marketData.marketRate);

    // Step 4: Generate assessment based on rent comparison
    const assessment = this.generateAssessmentFromComparison(rentComparison, marketData);

    // Step 5: Calculate savings potential based on rent difference
    const savingsPotential = this.calculateSavingsPotentialFromComparison(
      rentComparison,
      marketData.legalRate,
      quote,
      marketData.marketRate
    );

    // Step 6: Calculate trend from jeonse slope (jeonseSlope is 원/month)
    // Slope sign convention in our regression:
    //   - Negative slope = as daysAgo decreases (moving to today), value INCREASES = RISING
    //   - Positive slope = as daysAgo decreases (moving to today), value DECREASES = DECLINING
    // So we negate the slope to get intuitive direction (positive = rising)
    const jeonseSlope = rentComparison.jeonseSlope; // 원/month

    // Calculate percentage change over 12 months relative to jeonse 12 months ago
    // jeonse_12mo_ago = intercept + slope * 12 (since slope is per month, and daysAgo=~365 days)
    const jeonse12MonthsAgo = rentComparison.impliedJeonseToday + jeonseSlope * 12;
    const jeonseTrendPercentage = jeonse12MonthsAgo > 0
      ? ((rentComparison.impliedJeonseToday - jeonse12MonthsAgo) / jeonse12MonthsAgo) * 100
      : 0;

    // Determine trend direction based on percentage change
    // Positive percentage = prices rising, Negative = declining
    let trendDirection: 'RISING' | 'LIKELY_RISING' | 'STABLE' | 'LIKELY_DECLINING' | 'DECLINING';
    if (jeonseTrendPercentage > 5) {
      trendDirection = 'RISING';
    } else if (jeonseTrendPercentage > 2) {
      trendDirection = 'LIKELY_RISING';
    } else if (jeonseTrendPercentage < -5) {
      trendDirection = 'DECLINING';
    } else if (jeonseTrendPercentage < -2) {
      trendDirection = 'LIKELY_DECLINING';
    } else {
      trendDirection = 'STABLE';
    }

    const jeonseTrend = {
      direction: trendDirection,
      percentage: Math.abs(jeonseTrendPercentage),
    };

    const trendAdvice = this.generateTrendAdvice(jeonseTrend);

    // Step 7: Generate negotiation options
    const negotiationOptions = this.generateNegotiationOptionsFromComparison(
      quote,
      rentComparison,
      marketData
    );

    // Generate UUID
    const id = crypto.randomUUID();

    // For multifamily with tiered data, use selected tier's expected rent for primary comparison
    // Otherwise use the regression-based expected rent
    const finalExpectedRent = selectedTierExpectedRent ?? rentComparison.expectedRent;
    const finalRentDifference = quote.monthlyRent - finalExpectedRent;
    const finalRentDifferencePercent = finalExpectedRent > 0 ? (finalRentDifference / finalExpectedRent) * 100 : 0;

    // Regenerate assessment if using tiered expected rent
    let finalAssessment = assessment;
    if (selectedTierExpectedRent !== undefined) {
      finalAssessment = this.generateAssessmentFromRentComparison(
        finalExpectedRent,
        quote.monthlyRent,
        finalRentDifference,
        finalRentDifferencePercent
      );
    }

    const result: WolseAnalysisResult = {
      id,
      propertyId: '', // To be set when saved to DB
      userDeposit: quote.deposit,
      userMonthlyRent: quote.monthlyRent,
      userImpliedRate,
      expectedRent: finalExpectedRent,
      rentDifference: Math.round(finalRentDifference),
      rentDifferencePercent: finalRentDifferencePercent,
      // Tiered expected rent (for 연립/다세대)
      tieredExpectedRent,
      selectedTierExpectedRent,
      filteredTransactions,  // Filtered transactions for scatter plot (multifamily only)
      // Jeonse-centric data
      impliedJeonseToday: rentComparison.impliedJeonseToday,
      userImpliedJeonse: rentComparison.userImpliedJeonse,
      jeonseSlope: rentComparison.jeonseSlope,
      marketRate: marketData.marketRate,
      marketRateRange: {
        low: marketData.rate25thPercentile,
        high: marketData.rate75thPercentile
      },
      legalRate: marketData.legalRate,
      confidenceLevel: marketData.confidenceLevel,
      dataSource: marketData.dataSource,
      dataSourceNote: marketData.dataSourceNote,
      contractCount: marketData.contractCount,
      cleanTransactionCount: rentComparison.cleanTransactionCount,
      outliersRemoved: rentComparison.outliersRemoved,
      assessment: finalAssessment.level,
      assessmentDetails: finalAssessment.details,
      savingsPotential,
      trend: {
        direction: jeonseTrend.direction,
        percentage: jeonseTrend.percentage,
        advice: trendAdvice
      },
      negotiationOptions,
      recentTransactions: marketData.transactions, // Include all transactions for 12-month chart
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
    };

    console.log('\n✅ Analysis Complete:');
    console.log(`   Today's Jeonse: ${(rentComparison.impliedJeonseToday / 100000000).toFixed(2)}억`);
    console.log(`   User's Jeonse: ${(rentComparison.userImpliedJeonse / 100000000).toFixed(2)}억`);
    console.log(`   Expected Rent: ${(finalExpectedRent / 10000).toFixed(1)}만원${selectedTierExpectedRent !== undefined ? ' (tiered)' : ''}`);
    console.log(`   User's Rent: ${(quote.monthlyRent / 10000).toFixed(1)}만원`);
    console.log(`   Difference: ${finalRentDifference >= 0 ? '+' : ''}${(finalRentDifference / 10000).toFixed(1)}만원 (${finalRentDifferencePercent >= 0 ? '+' : ''}${finalRentDifferencePercent.toFixed(1)}%)`);
    console.log(`   Trend: ${jeonseTrend.direction} (${jeonseTrend.percentage.toFixed(1)}% annually)`);
    console.log(`   Assessment: ${finalAssessment.level}`);
    if (tieredExpectedRent && tieredExpectedRent.length > 0) {
      console.log(`\n   📊 Tiered Expected Rents:`);
      tieredExpectedRent.forEach(t => {
        console.log(`      ${t.label}: ${(t.expectedRent / 10000).toFixed(1)}만원`);
      });
    }

    return result;
  }

  /**
   * Compare user's rent against market expectation using Jeonse-Centric approach
   *
   * Methodology:
   * 1. Remove outliers from transactions
   * 2. Calculate implied jeonse for each transaction: jeonse = deposit + rent × 12 / rate
   *    - Uses CURRENT rate (BOK + 2%) for all transactions to avoid rate-change noise
   * 3. Regress jeonse over time using Theil-Sen to find today's expected jeonse
   * 4. Calculate expected rent: (jeonseToday - userDeposit) × currentRate / 12
   * 5. Compare user's actual rent vs expected rent
   */
  private compareUserRentToMarket(
    quote: WolseQuote,
    transactions: WolseTransaction[],
    marketRate: number,
    dataSource: 'building' | 'dong' | 'district' | 'adjacent_districts' = 'building',
    timeAdjustedTransactions?: TimeAdjustedTransaction[],
    trend?: { direction: 'RISING' | 'LIKELY_RISING' | 'STABLE' | 'LIKELY_DECLINING' | 'DECLINING'; slopePerMonth: number; pValue: number }
  ): UserRentComparison {
    const now = new Date();

    console.log('\n' + '='.repeat(60));
    console.log('📊 JEONSE-CENTRIC MARKET COMPARISON');
    console.log('='.repeat(60));
    console.log(`   User Quote: ${(quote.deposit / 10000).toLocaleString()}만원 보증금 / ${(quote.monthlyRent / 10000).toLocaleString()}만원 월세`);
    console.log(`   Conversion Rate: ${(CURRENT_CONVERSION_RATE * 100).toFixed(1)}% (BOK ${CURRENT_BOK_RATE}% + 2%)`);
    console.log(`   Transactions available: ${transactions.length}`);

    // User's implied jeonse from their quote
    const userImpliedJeonse = getImpliedJeonse(quote.deposit, quote.monthlyRent);

    // Default result for insufficient data
    const defaultResult: UserRentComparison = {
      expectedRent: quote.monthlyRent,
      actualRent: quote.monthlyRent,
      rentDifference: 0,
      rentDifferencePercent: 0,
      meanDeposit: quote.deposit,
      meanRent: quote.monthlyRent,
      cleanTransactionCount: 0,
      outliersRemoved: 0,
      impliedJeonseToday: userImpliedJeonse,
      userImpliedJeonse,
      jeonseSlope: 0
    };

    if (transactions.length === 0) {
      console.log('   ⚠️ No transactions available - cannot compare');
      return defaultResult;
    }

    // Step 1: Remove outliers (use tighter bounds for dong/district level data)
    const { clean, removed } = this.removeOutliers(transactions, dataSource);
    console.log(`\n   🧹 OUTLIER REMOVAL (IQR method):`);
    console.log(`      Original: ${transactions.length} transactions`);
    console.log(`      Removed: ${removed.length} outliers`);
    console.log(`      Clean: ${clean.length} transactions`);

    if (removed.length > 0) {
      console.log('      Outliers removed:');
      removed.forEach(t => {
        console.log(`         - ${t.year}.${t.month}.${t.day} | ${(t.deposit / 10000).toLocaleString()}만원 / ${(t.monthlyRent / 10000).toLocaleString()}만원`);
      });
    }

    if (clean.length < 3) {
      console.log('   ⚠️ Not enough clean transactions - using simple average');
      const allMeanJeonse = transactions.reduce((sum, t) =>
        sum + getImpliedJeonse(t.deposit, t.monthlyRent), 0) / transactions.length;
      const expectedRent = (allMeanJeonse - quote.deposit) * CURRENT_CONVERSION_RATE / 12;
      const rentDiff = quote.monthlyRent - expectedRent;

      return {
        expectedRent: Math.round(expectedRent),
        actualRent: quote.monthlyRent,
        rentDifference: Math.round(rentDiff),
        rentDifferencePercent: expectedRent > 0 ? (rentDiff / expectedRent) * 100 : 0,
        meanDeposit: transactions.reduce((sum, t) => sum + t.deposit, 0) / transactions.length,
        meanRent: transactions.reduce((sum, t) => sum + t.monthlyRent, 0) / transactions.length,
        cleanTransactionCount: transactions.length,
        outliersRemoved: 0,
        impliedJeonseToday: allMeanJeonse,
        userImpliedJeonse,
        jeonseSlope: 0
      };
    }

    // Step 2: Calculate statistics for reference
    const meanDeposit = clean.reduce((sum, t) => sum + t.deposit, 0) / clean.length;
    const meanRent = clean.reduce((sum, t) => sum + t.monthlyRent, 0) / clean.length;

    // Step 3: Calculate implied jeonse for each transaction
    console.log(`\n   📐 STEP 1: CALCULATE IMPLIED JEONSE`);
    console.log('   ' + '-'.repeat(50));
    console.log(`   Formula: jeonse = deposit + rent × 12 / ${(CURRENT_CONVERSION_RATE * 100).toFixed(1)}%`);
    console.log('   ' + '-'.repeat(50));

    const jeonseData: { daysAgo: number; value: number; dateStr: string }[] = [];

    for (const t of clean) {
      const txDate = new Date(t.year, t.month - 1, t.day);
      const daysAgo = Math.floor((now.getTime() - txDate.getTime()) / (1000 * 60 * 60 * 24));
      const impliedJeonse = getImpliedJeonse(t.deposit, t.monthlyRent);

      jeonseData.push({
        daysAgo,
        value: impliedJeonse,
        dateStr: `${t.year}-${String(t.month).padStart(2, '0')}-${String(t.day).padStart(2, '0')}`
      });
    }

    // Sort by date (newest first) and log
    jeonseData.sort((a, b) => a.daysAgo - b.daysAgo);

    console.log('\n   | Date       | Deposit   | Rent    | Implied Jeonse |');
    console.log('   |------------|-----------|---------|----------------|');
    for (let i = 0; i < Math.min(jeonseData.length, 8); i++) {
      const d = jeonseData[i];
      const t = clean.find(tx =>
        `${tx.year}-${String(tx.month).padStart(2, '0')}-${String(tx.day).padStart(2, '0')}` === d.dateStr
      );
      if (t) {
        console.log(`   | ${d.dateStr} | ${(t.deposit / 10000).toFixed(0).padStart(7)}만 | ${(t.monthlyRent / 10000).toFixed(0).padStart(5)}만 | ${(d.value / 100000000).toFixed(2).padStart(12)}억 |`);
      }
    }
    if (jeonseData.length > 8) {
      console.log(`   | ... ${jeonseData.length - 8} more transactions ...`);
    }

    // Step 4: Regress jeonse over time (Theil-Sen)
    console.log(`\n   📈 STEP 2: REGRESS JEONSE OVER TIME (Theil-Sen)`);
    console.log('   ' + '-'.repeat(50));

    const { slope: jeonseSlope, intercept: jeonseToday } = theilSenTimeRegression(jeonseData);
    const slopePerMonth = jeonseSlope * 30;

    console.log(`      Data points: ${jeonseData.length}`);
    console.log(`      Slope: ${(slopePerMonth / 100000000).toFixed(4)}억/month`);
    console.log(`      Intercept (today's jeonse): ${(jeonseToday / 100000000).toFixed(2)}억`);
    console.log('   ' + '-'.repeat(50));

    // Step 5: Calculate expected rent
    console.log(`\n   💰 STEP 3: CALCULATE EXPECTED RENT`);
    console.log('   ' + '-'.repeat(50));
    console.log(`   Formula: expectedRent = (jeonse_today - userDeposit) × rate / 12`);

    const expectedRent = (jeonseToday - quote.deposit) * CURRENT_CONVERSION_RATE / 12;

    console.log(`\n      expectedRent = (${(jeonseToday / 100000000).toFixed(2)}억 - ${(quote.deposit / 100000000).toFixed(1)}억) × ${(CURRENT_CONVERSION_RATE * 100).toFixed(1)}% / 12`);
    console.log(`                   = ${((jeonseToday - quote.deposit) / 100000000).toFixed(2)}억 × ${(CURRENT_CONVERSION_RATE * 100).toFixed(1)}% / 12`);
    console.log(`                   = ${(expectedRent / 10000).toFixed(1)}만원`);
    console.log('   ' + '-'.repeat(50));

    // Step 6: Compare user's actual rent vs expected rent
    const rentDifference = quote.monthlyRent - expectedRent;
    const rentDifferencePercent = expectedRent > 0 ? (rentDifference / expectedRent) * 100 : 0;

    console.log(`\n   📊 COMPARISON RESULT:`);
    console.log('   ' + '='.repeat(50));
    console.log(`      Today's Jeonse:  ${(jeonseToday / 100000000).toFixed(2)}억`);
    console.log(`      User's Deposit:  ${(quote.deposit / 100000000).toFixed(1)}억`);
    console.log(`      User's Jeonse:   ${(userImpliedJeonse / 100000000).toFixed(2)}억 (from quote)`);
    console.log('   ' + '-'.repeat(50));
    console.log(`      Expected Rent:   ${(expectedRent / 10000).toFixed(1)}만원`);
    console.log(`      User's Rent:     ${(quote.monthlyRent / 10000).toFixed(1)}만원`);
    console.log(`      Difference:      ${rentDifference >= 0 ? '+' : ''}${(rentDifference / 10000).toFixed(1)}만원 (${rentDifferencePercent >= 0 ? '+' : ''}${rentDifferencePercent.toFixed(1)}%)`);
    console.log('   ' + '='.repeat(50));

    if (rentDifference > 0) {
      console.log(`      ⚠️ User paying ${(rentDifference / 10000).toFixed(1)}만원 MORE than market expectation`);
    } else if (rentDifference < 0) {
      console.log(`      ✅ User paying ${(Math.abs(rentDifference) / 10000).toFixed(1)}만원 LESS than market expectation`);
    } else {
      console.log(`      ✅ User paying exactly at market expectation`);
    }

    return {
      expectedRent: Math.round(expectedRent),
      actualRent: quote.monthlyRent,
      rentDifference: Math.round(rentDifference),
      rentDifferencePercent,
      meanDeposit,
      meanRent,
      cleanTransactionCount: clean.length,
      outliersRemoved: removed.length,
      impliedJeonseToday: jeonseToday,
      userImpliedJeonse,
      jeonseSlope: slopePerMonth
    };
  }

  /**
   * Calculate user's implied rate (for backwards compatibility and negotiation scripts)
   * This derives a rate from the rent comparison for display purposes
   */
  private deriveUserImpliedRate(
    comparison: UserRentComparison,
    marketRate: number
  ): number {
    // If user is paying at or below expected, their effective rate <= market rate
    // If user is paying above expected, their effective rate > market rate
    // Scale proportionally based on rent difference
    if (comparison.expectedRent <= 0) return marketRate;

    const rentRatio = comparison.actualRent / comparison.expectedRent;
    return marketRate * rentRatio;
  }

  /**
   * Generate assessment based on rent comparison (NEW METHODOLOGY)
   */
  private generateAssessmentFromComparison(
    comparison: UserRentComparison,
    marketData: MarketRateResult
  ): { level: 'GOOD_DEAL' | 'FAIR' | 'OVERPRICED' | 'SEVERELY_OVERPRICED'; details: string } {
    const { rentDifference, rentDifferencePercent, expectedRent, actualRent } = comparison;

    // Format amounts for display
    const formatWon = (amount: number) => {
      if (Math.abs(amount) >= 10000) {
        return `${(amount / 10000).toLocaleString()}만원`;
      }
      return `${amount.toLocaleString()}원`;
    };

    // Hybrid Assessment: Uses BOTH percentage AND absolute thresholds
    // This ensures consistency across different rent levels
    // - Low rent (e.g., 60만): small absolute differences don't trigger overpriced
    // - High rent (e.g., 500만): small percentage differences don't trigger overpriced

    const MIN_OVERPRICED_AMOUNT = 100000;      // 10만원
    const MIN_SEVERELY_OVERPRICED_AMOUNT = 200000;  // 20만원
    const MIN_GOOD_DEAL_SAVINGS = 150000;      // 15만원

    // GOOD_DEAL: Saving ≥10% OR saving ≥15만원
    if (rentDifferencePercent <= -10 || rentDifference <= -MIN_GOOD_DEAL_SAVINGS) {
      return {
        level: 'GOOD_DEAL',
        details: `You're paying ${formatWon(Math.abs(rentDifference))}/month less than the market expectation of ${formatWon(expectedRent)}. However, prices below market often have reasons - verify the property condition, check the landlord's financial status via 등기부등본, and review contract terms carefully before signing.`
      };
    }

    // SEVERELY_OVERPRICED: >15% AND >20만원
    if (rentDifferencePercent > 15 && rentDifference > MIN_SEVERELY_OVERPRICED_AMOUNT) {
      return {
        level: 'SEVERELY_OVERPRICED',
        details: `You're paying ${formatWon(rentDifference)}/month more than expected (${formatWon(expectedRent)}). At ${rentDifferencePercent.toFixed(0)}% above market, strong negotiation is recommended.`
      };
    }

    // OVERPRICED: >5% AND >10만원
    if (rentDifferencePercent > 5 && rentDifference > MIN_OVERPRICED_AMOUNT) {
      return {
        level: 'OVERPRICED',
        details: `You're paying ${formatWon(rentDifference)}/month more than the market expectation of ${formatWon(expectedRent)}. This is ${rentDifferencePercent.toFixed(0)}% above market. Room for negotiation.`
      };
    }

    // FAIR: Everything else (within tolerance)
    if (rentDifference <= 0) {
      return {
        level: 'FAIR',
        details: `Your rent of ${formatWon(actualRent)} is at or below the market expectation of ${formatWon(expectedRent)}. Focus on negotiating contract terms (lease length, repairs, deposit payment schedule) rather than price.`
      };
    }
    return {
      level: 'FAIR',
      details: `Your rent of ${formatWon(actualRent)} is close to the market expectation of ${formatWon(expectedRent)} (+${formatWon(rentDifference)}). Minor room for negotiation exists.`
    };
  }

  /**
   * Generate assessment from raw rent comparison values
   * Used when overriding with tiered expected rent
   */
  private generateAssessmentFromRentComparison(
    expectedRent: number,
    actualRent: number,
    rentDifference: number,
    rentDifferencePercent: number
  ): { level: 'GOOD_DEAL' | 'FAIR' | 'OVERPRICED' | 'SEVERELY_OVERPRICED'; details: string } {
    const formatWon = (amount: number) => {
      if (Math.abs(amount) >= 10000) {
        return `${(amount / 10000).toLocaleString()}만원`;
      }
      return `${amount.toLocaleString()}원`;
    };

    const MIN_OVERPRICED_AMOUNT = 100000;
    const MIN_SEVERELY_OVERPRICED_AMOUNT = 200000;
    const MIN_GOOD_DEAL_SAVINGS = 150000;

    if (rentDifferencePercent <= -10 || rentDifference <= -MIN_GOOD_DEAL_SAVINGS) {
      return {
        level: 'GOOD_DEAL',
        details: `You're paying ${formatWon(Math.abs(rentDifference))}/month less than the market expectation of ${formatWon(expectedRent)}. However, prices below market often have reasons - verify the property condition, check the landlord's financial status via 등기부등본, and review contract terms carefully before signing.`
      };
    }

    if (rentDifferencePercent > 15 && rentDifference > MIN_SEVERELY_OVERPRICED_AMOUNT) {
      return {
        level: 'SEVERELY_OVERPRICED',
        details: `You're paying ${formatWon(rentDifference)}/month more than expected (${formatWon(expectedRent)}). At ${rentDifferencePercent.toFixed(0)}% above market, strong negotiation is recommended.`
      };
    }

    if (rentDifferencePercent > 5 && rentDifference > MIN_OVERPRICED_AMOUNT) {
      return {
        level: 'OVERPRICED',
        details: `You're paying ${formatWon(rentDifference)}/month more than the market expectation of ${formatWon(expectedRent)}. This is ${rentDifferencePercent.toFixed(0)}% above market. Room for negotiation.`
      };
    }

    if (rentDifference <= 0) {
      return {
        level: 'FAIR',
        details: `Your rent of ${formatWon(actualRent)} is at or below the market expectation of ${formatWon(expectedRent)}. Focus on negotiating contract terms (lease length, repairs, deposit payment schedule) rather than price.`
      };
    }
    return {
      level: 'FAIR',
      details: `Your rent of ${formatWon(actualRent)} is close to the market expectation of ${formatWon(expectedRent)} (+${formatWon(rentDifference)}). Minor room for negotiation exists.`
    };
  }

  /**
   * Calculate potential savings based on rent comparison (NEW METHODOLOGY)
   */
  private calculateSavingsPotentialFromComparison(
    comparison: UserRentComparison,
    legalRate: number,
    quote: WolseQuote,
    marketRate: number
  ): { vsMarket: number; vsLegal: number } {
    // Savings vs market = how much user is overpaying vs expected rent at market rate
    const savingsVsMarket = Math.max(0, comparison.rentDifference * 12);

    // Calculate expected rent at legal rate
    // Formula: Expected_Rent = Mean_Rent + (Rate/12/100) × (Mean_Deposit - User_Deposit)
    // Since legal rate < market rate, expected rent at legal rate is HIGHER
    // (less discount for the same deposit increase)
    const legalRatePerMonth = legalRate / 12 / 100;
    const marketRatePerMonth = marketRate / 12 / 100;
    const depositDiffFromMean = comparison.meanDeposit - quote.deposit;

    // Difference in expected rent between legal and market rate
    // expectedRentAtLegal = meanRent + legalRatePerMonth × depositDiff
    // expectedRentAtMarket = meanRent + marketRatePerMonth × depositDiff (this is comparison.expectedRent)
    // rentDiffBetweenRates = (legalRatePerMonth - marketRatePerMonth) × depositDiff
    const expectedRentAtLegal = comparison.meanRent + legalRatePerMonth * depositDiffFromMean;
    const savingsVsLegal = Math.max(0, (quote.monthlyRent - expectedRentAtLegal) * 12);

    return {
      vsMarket: Math.round(savingsVsMarket),
      vsLegal: Math.round(savingsVsLegal)
    };
  }

  /**
   * Generate trend-based advice
   * Note: Trend is calculated from Full Monthly Cost (rent + deposit × rate / 12)
   */
  private generateTrendAdvice(trend: { direction: 'RISING' | 'LIKELY_RISING' | 'STABLE' | 'LIKELY_DECLINING' | 'DECLINING'; percentage: number }): string {
    switch (trend.direction) {
      case 'DECLINING':
        if (trend.percentage > 15) {
          return `Rental prices are declining significantly (-${trend.percentage.toFixed(0)}% over the past year). Strong negotiation position - landlords have less pricing power.`;
        }
        return `Rental prices are trending down (-${trend.percentage.toFixed(0)}%). Good time to negotiate or consider waiting for better prices.`;

      case 'LIKELY_DECLINING':
        return `Rental prices appear to be declining (-${trend.percentage.toFixed(0)}%). Market may favor tenants - consider negotiating.`;

      case 'RISING':
        if (trend.percentage > 15) {
          return `Rental prices are rising rapidly (+${trend.percentage.toFixed(0)}% over the past year). Consider securing a contract sooner if the price is reasonable.`;
        }
        return `Rental prices are trending up (+${trend.percentage.toFixed(0)}%). Moderate urgency to finalize if you find a fair deal.`;

      case 'LIKELY_RISING':
        return `Rental prices appear to be rising (+${trend.percentage.toFixed(0)}%). Market may be heating up - consider not delaying too long if the price is fair.`;

      case 'STABLE':
      default:
        return `Rental prices are stable. Take your time to find the best deal and negotiate confidently.`;
    }
  }

  /**
   * Generate negotiation options based on rent comparison (NEW METHODOLOGY)
   */
  private generateNegotiationOptionsFromComparison(
    quote: WolseQuote,
    comparison: UserRentComparison,
    marketData: MarketRateResult
  ): WolseNegotiationOption[] {
    const options: WolseNegotiationOption[] = [];
    const { marketRate, trend } = marketData;
    const { expectedRent, rentDifference, rentDifferencePercent } = comparison;

    // Format amounts for display
    const formatWon = (amount: number) => `${(amount / 10000).toLocaleString()}만원`;

    // If user is already paying at or below market expectation, provide strategic advice
    if (rentDifferencePercent <= 0) {
      const options: WolseNegotiationOption[] = [];

      // Option 1: Accept and lock in with longer lease
      options.push({
        name: 'Accept & Lock In',
        rate: marketRate,
        deposit: quote.deposit,
        monthlyRent: quote.monthlyRent,
        monthlySavings: 0,
        yearlySavings: 0,
        script: `I'd like to proceed with the ${formatWon(quote.deposit)} deposit and ${formatWon(quote.monthlyRent)} monthly rent. Could we sign a 2-year lease to lock in this rate? I'm a reliable tenant looking for long-term stability.`,
        recommended: true
      });

      // Option 2: Negotiate non-price terms
      options.push({
        name: 'Negotiate Terms',
        rate: marketRate,
        deposit: quote.deposit,
        monthlyRent: quote.monthlyRent,
        monthlySavings: 0,
        yearlySavings: 0,
        script: `I'm happy with the rent terms. Before signing, I'd like to discuss: (1) Could you handle any minor repairs before move-in? (2) Is the deposit payable in 2 installments? (3) Could we include the washing machine/AC in the contract?`
      });

      // Option 3: Request move-in benefits
      options.push({
        name: 'Move-in Benefits',
        rate: marketRate,
        deposit: quote.deposit,
        monthlyRent: quote.monthlyRent,
        monthlySavings: 0,
        yearlySavings: 0,
        script: `The rent works for me. I'm ready to sign quickly. In exchange, would you consider: a few days of free rent for move-in preparation, or covering the first month's utility setup fees?`
      });

      return options;
    }

    // Option A: Expected Rent (negotiate down to expected rent)
    if (rentDifference > 0) {
      options.push({
        name: 'Expected Rent',
        rate: marketRate,
        deposit: quote.deposit,
        monthlyRent: expectedRent,
        monthlySavings: rentDifference,
        yearlySavings: rentDifference * 12,
        script: `Based on ${marketData.contractCount} recent contracts in this building, the expected rent at my deposit of ${formatWon(quote.deposit)} is ${formatWon(expectedRent)}. I'd like to adjust to this expected rent level.`,
        recommended: true
      });
    }

    // Option B: Slight discount (5% below expected)
    const discountedRent = Math.round(expectedRent * 0.95);
    const discountSavings = quote.monthlyRent - discountedRent;
    if (discountSavings > rentDifference) {
      options.push({
        name: 'Negotiated Discount',
        rate: marketRate * 0.95,
        deposit: quote.deposit,
        monthlyRent: discountedRent,
        monthlySavings: discountSavings,
        yearlySavings: discountSavings * 12,
        script: `I've researched recent transactions and the expected rent is ${formatWon(expectedRent)}. Given current market conditions, I'm hoping for ${formatWon(discountedRent)} - a modest 5% discount. I'm a reliable tenant and ready to sign immediately.`
      });
    }

    // Option C: Aggressive discount if market is declining
    if (trend.direction === 'DECLINING' && trend.percentage > 5) {
      const aggressiveRent = Math.round(expectedRent * 0.9);
      const aggressiveSavings = quote.monthlyRent - aggressiveRent;
      if (aggressiveSavings > 0) {
        options.push({
          name: 'Trend-Based Discount',
          rate: marketRate * 0.9,
          deposit: quote.deposit,
          monthlyRent: aggressiveRent,
          monthlySavings: aggressiveSavings,
          yearlySavings: aggressiveSavings * 12,
          script: `Rents have declined ${trend.percentage.toFixed(0)}% over the past 6 months. Given this trend, I'm proposing ${formatWon(aggressiveRent)} - 10% below expected rent. I'm flexible on move-in date if this works for you.`
        });
      }
    }

    // Sort by yearly savings (highest first)
    return options.sort((a, b) => b.yearlySavings - a.yearlySavings);
  }

  // ============ Tiered Expected Rent for 연립/다세대 ============

  /**
   * Calculate tiered expected rent for multifamily properties
   *
   * Flow:
   * 1. Filter transactions (renewals, floor > 0; age filter disabled for more data)
   * 2. Calculate implied jeonse for each transaction
   * 3. Classify into 4 tiers by unit implied jeonse percentiles
   * 4. For each tier: recency-weighted jeonse + age adjustment
   * 5. Calculate expected rent for each tier
   *
   * @returns Object with tieredExpectedRent and filteredTransactions for scatter plot
   */
  private calculateTieredExpectedRent(
    transactions: WolseTransaction[],
    userDeposit: number,
    targetArea: number,
    targetBuildingYear: number | undefined,
    targetBuildingYearForAdjustment?: number | undefined
  ): { tieredExpectedRent: TieredExpectedRent[]; filteredTransactions: WolseTransaction[] } {
    if (transactions.length === 0) return { tieredExpectedRent: [], filteredTransactions: [] };

    const now = new Date();
    const tiers: QualityTier[] = ['budget', 'standard', 'mid', 'premium'];

    // Step 1: Filter transactions
    const { filtered, filterLog } = this.applyWolseFilters(transactions, targetBuildingYear);

    console.log('\n📊 Tiered Expected Rent (Multifamily):');
    console.log(`   Target Area: ${targetArea}㎡, Target Year: ${targetBuildingYear || 'unknown'}`);
    console.log(`   Filtering:`);
    console.log(`     - Original: ${filterLog.originalCount} transactions`);
    console.log(`     - After renewal filter: ${filterLog.afterRenewalFilter} (removed ${filterLog.renewalRemovedCount})`);
    console.log(`     - After floor filter (floor > 0): ${filterLog.afterFloorFilter} (removed ${filterLog.floorRemovedCount})`);
    if (filterLog.ageTolerance !== null) {
      console.log(`     - After age filter (±${filterLog.ageTolerance} years): ${filterLog.afterAgeFilter} (removed ${filterLog.ageRemovedCount})`);
    }

    if (filtered.length < 3) {
      console.log('   ⚠️ Insufficient transactions for tiered calculation');
      return { tieredExpectedRent: [], filteredTransactions: filtered };
    }

    // Step 2: Calculate implied jeonse for each transaction
    interface EnrichedTransaction extends WolseTransaction {
      impliedJeonse: number;
      unitJeonse: number;
      daysAgo: number;
    }

    const enriched: EnrichedTransaction[] = filtered.map(t => {
      const impliedJeonse = getImpliedJeonse(t.deposit, t.monthlyRent);
      const unitJeonse = impliedJeonse / t.exclusiveArea;
      const txDate = new Date(t.year, t.month - 1, t.day);
      const daysAgo = (now.getTime() - txDate.getTime()) / (1000 * 60 * 60 * 24);
      return { ...t, impliedJeonse, unitJeonse, daysAgo };
    });

    // Step 3: Calculate percentile thresholds from unit implied jeonse
    const thresholds = this.calculateJeonsePercentileThresholds(enriched);

    console.log(`\n   Percentile Thresholds (unit jeonse):`);
    console.log(`     P25=${(thresholds.p25/10000).toFixed(0)}만/㎡, P50=${(thresholds.p50/10000).toFixed(0)}만/㎡, P75=${(thresholds.p75/10000).toFixed(0)}만/㎡`);

    // Classify each transaction by tier
    const transactionsByTier: Record<QualityTier, EnrichedTransaction[]> = {
      budget: [],
      standard: [],
      mid: [],
      premium: [],
    };

    enriched.forEach(t => {
      const tier = this.classifyJeonseTier(t.unitJeonse, thresholds);
      transactionsByTier[tier].push(t);
    });

    console.log(`   Tier distribution: budget=${transactionsByTier.budget.length}, standard=${transactionsByTier.standard.length}, mid=${transactionsByTier.mid.length}, premium=${transactionsByTier.premium.length}`);

    // Step 4 & 5: Calculate tier values and expected rent
    const tieredExpectedRent: TieredExpectedRent[] = [];

    for (const tier of tiers) {
      const tierTxns = transactionsByTier[tier];
      if (tierTxns.length === 0) continue;

      const depreciation = MULTIFAMILY_WOLSE_CONFIG.DEPRECIATION[tier];

      // Calculate recency-weighted unit jeonse with age adjustment
      let totalWeightedUnitJeonse = 0;
      let totalWeight = 0;

      tierTxns.forEach(t => {
        // Recency weight (90-day half-life)
        const recencyWeight = Math.exp(-t.daysAgo / MULTIFAMILY_WOLSE_CONFIG.RECENCY_HALFLIFE_DAYS);

        // Age adjustment: adjust comparable's jeonse to target building year
        // Uses targetBuildingYearForAdjustment (separate from filtering parameter)
        let ageAdjustment = 1.0;
        const adjustmentYear = targetBuildingYearForAdjustment ?? targetBuildingYear;
        if (adjustmentYear && t.buildingYear) {
          const yearDiff = adjustmentYear - t.buildingYear;
          // If target is newer, increase jeonse value
          // If target is older, decrease jeonse value
          ageAdjustment = 1 + (yearDiff * depreciation);
        }

        const adjustedUnitJeonse = t.unitJeonse * ageAdjustment;
        totalWeightedUnitJeonse += adjustedUnitJeonse * recencyWeight;
        totalWeight += recencyWeight;
      });

      const weightedUnitJeonse = totalWeightedUnitJeonse / totalWeight;
      const tierJeonse = weightedUnitJeonse * targetArea;

      // Calculate expected rent: (jeonse - deposit) × rate / 12
      const expectedRent = Math.max(0, (tierJeonse - userDeposit) * CURRENT_CONVERSION_RATE / 12);

      // Calculate effective sample size
      const weights = tierTxns.map(t => Math.exp(-t.daysAgo / MULTIFAMILY_WOLSE_CONFIG.RECENCY_HALFLIFE_DAYS));
      const sumW = weights.reduce((a, b) => a + b, 0);
      const sumW2 = weights.reduce((a, b) => a + b * b, 0);
      const effectiveSampleSize = (sumW * sumW) / sumW2;

      tieredExpectedRent.push({
        tier,
        label: MULTIFAMILY_WOLSE_CONFIG.LABELS[tier],
        expectedRent: Math.round(expectedRent),
        impliedJeonse: Math.round(tierJeonse),
        unitJeonse: Math.round(weightedUnitJeonse),
        transactionCount: tierTxns.length,
        effectiveSampleSize: Math.round(effectiveSampleSize * 10) / 10,
        depreciationRate: depreciation,
      });

      console.log(`\n   ${MULTIFAMILY_WOLSE_CONFIG.LABELS[tier]}:`);
      console.log(`     - Transactions: ${tierTxns.length}, Effective N: ${effectiveSampleSize.toFixed(1)}`);
      console.log(`     - Unit Jeonse: ${(weightedUnitJeonse / 10000).toFixed(0)}만원/㎡`);
      console.log(`     - Tier Jeonse: ${(tierJeonse / 100000000).toFixed(2)}억원`);
      console.log(`     - Expected Rent: ${(expectedRent / 10000).toFixed(1)}만원`);
    }

    return { tieredExpectedRent, filteredTransactions: filtered };
  }

  /**
   * Apply filters for multifamily wolse transactions
   * 1. Remove renewals (갱신)
   * 2. Remove floor ≤ 0 (basement/semi-basement)
   * 3. Filter by building age (±10 years, fallback to ±15)
   */
  private applyWolseFilters(
    transactions: WolseTransaction[],
    targetBuildingYear: number | undefined
  ): {
    filtered: WolseTransaction[];
    filterLog: {
      originalCount: number;
      afterRenewalFilter: number;
      renewalRemovedCount: number;
      afterFloorFilter: number;
      floorRemovedCount: number;
      afterAgeFilter: number;
      ageRemovedCount: number;
      ageTolerance: number | null;
      usedFallback: boolean;
    };
  } {
    const originalCount = transactions.length;

    // Step 1: Remove renewals
    const afterRenewal = transactions.filter(t => t.contractType !== '갱신');
    const renewalRemovedCount = originalCount - afterRenewal.length;

    // Step 2: Floor filter (floor > 0)
    const afterFloor = afterRenewal.filter(t => t.floor > 0);
    const floorRemovedCount = afterRenewal.length - afterFloor.length;

    // Step 3: Age filter (if target building year available)
    let filtered = afterFloor;
    let ageRemovedCount = 0;
    let ageTolerance: number | null = null;
    let usedFallback = false;

    if (targetBuildingYear && afterFloor.some(t => t.buildingYear)) {
      // Try primary tolerance (±10 years)
      const primaryFiltered = afterFloor.filter(t => {
        if (!t.buildingYear) return true; // Keep transactions without buildingYear
        return Math.abs(t.buildingYear - targetBuildingYear) <= MULTIFAMILY_WOLSE_CONFIG.AGE_TOLERANCE_PRIMARY;
      });

      if (primaryFiltered.length >= MULTIFAMILY_WOLSE_CONFIG.MIN_TRANSACTIONS) {
        filtered = primaryFiltered;
        ageTolerance = MULTIFAMILY_WOLSE_CONFIG.AGE_TOLERANCE_PRIMARY;
      } else {
        // Try fallback tolerance (±15 years)
        const fallbackFiltered = afterFloor.filter(t => {
          if (!t.buildingYear) return true;
          return Math.abs(t.buildingYear - targetBuildingYear) <= MULTIFAMILY_WOLSE_CONFIG.AGE_TOLERANCE_FALLBACK;
        });

        if (fallbackFiltered.length >= MULTIFAMILY_WOLSE_CONFIG.MIN_TRANSACTIONS) {
          filtered = fallbackFiltered;
          ageTolerance = MULTIFAMILY_WOLSE_CONFIG.AGE_TOLERANCE_FALLBACK;
          usedFallback = true;
        }
        // Otherwise, keep afterFloor (no age filter)
      }

      ageRemovedCount = afterFloor.length - filtered.length;
    }

    return {
      filtered,
      filterLog: {
        originalCount,
        afterRenewalFilter: afterRenewal.length,
        renewalRemovedCount,
        afterFloorFilter: afterFloor.length,
        floorRemovedCount,
        afterAgeFilter: filtered.length,
        ageRemovedCount,
        ageTolerance,
        usedFallback,
      },
    };
  }

  /**
   * Calculate percentile thresholds for unit implied jeonse
   */
  private calculateJeonsePercentileThresholds(
    transactions: Array<{ unitJeonse: number }>
  ): { p25: number; p50: number; p75: number } {
    if (transactions.length === 0) return { p25: 0, p50: 0, p75: 0 };

    const sorted = [...transactions].sort((a, b) => a.unitJeonse - b.unitJeonse);
    const n = sorted.length;

    const getPercentile = (p: number): number => {
      const idx = (p / 100) * (n - 1);
      const lower = Math.floor(idx);
      const upper = Math.ceil(idx);
      const weight = idx - lower;
      return sorted[lower].unitJeonse * (1 - weight) + sorted[upper].unitJeonse * weight;
    };

    return {
      p25: getPercentile(25),
      p50: getPercentile(50),
      p75: getPercentile(75),
    };
  }

  /**
   * Classify transaction into quality tier based on unit jeonse
   */
  private classifyJeonseTier(
    unitJeonse: number,
    thresholds: { p25: number; p50: number; p75: number }
  ): QualityTier {
    if (unitJeonse < thresholds.p25) return 'budget';
    if (unitJeonse < thresholds.p50) return 'standard';
    if (unitJeonse < thresholds.p75) return 'mid';
    return 'premium';
  }
}
