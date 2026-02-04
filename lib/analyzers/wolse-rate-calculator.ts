import { MolitWolseAPI, getDistrictCode } from '../apis/molit-wolse';
import { WolseTransaction, WolseMarketRate, BuildingType } from '../types';
import { getAdjacentDongs } from '../data/adjacent-dongs';

/**
 * Current legal conversion rate limits (Housing Lease Protection Act)
 * Legal cap = min(10%, BOK base rate + 2%)
 * Current BOK rate: 2.5% (as of Dec 2024)
 */
const CURRENT_BOK_RATE = 2.5;
const LEGAL_CAP = Math.min(10, CURRENT_BOK_RATE + 2); // = 4.5%

export interface ConversionRatePair {
  transaction1: WolseTransaction;
  transaction2: WolseTransaction;
  impliedRate: number;
  daysAgo: number;
  weight: number;
}

// Extended transaction with time-adjusted rent (exported for use in price analyzer)
export interface TimeAdjustedTransaction extends WolseTransaction {
  adjustedMonthlyRent: number;
  adjustmentFactor: number;
}

// Monthly trend data for a building
interface MonthlyTrendPoint {
  yearMonth: string;
  medianDeposit: number;
  medianRent: number;
  normalizedRent: number;  // rent at reference deposit
  smoothedRent?: number;   // after moving average
  transactionCount: number;
}

export interface MarketRateResult {
  marketRate: number;
  rate25thPercentile: number;
  rate75thPercentile: number;
  confidenceLevel: 'HIGH' | 'MEDIUM' | 'LOW' | 'INSUFFICIENT';
  dataSource: 'building' | 'dong' | 'district';
  dataSourceNote: string;
  contractCount: number;
  cleanTransactionCount: number;
  outliersRemoved: number;
  validPairCount: number;
  trend: {
    direction: 'RISING' | 'LIKELY_RISING' | 'STABLE' | 'LIKELY_DECLINING' | 'DECLINING';
    percentage: number;
    pValue: number;  // Mann-Kendall p-value (lower = more significant trend)
    slopePerMonth: number;  // Theil-Sen slope in 만원/month
  };
  legalRate: number;
  transactions: WolseTransaction[];
  timeAdjustedTransactions?: TimeAdjustedTransaction[];
  ratePairs?: Array<{ x: number; y: number }>; // For trend analysis testing
}

/**
 * Wolse Market Rate Calculator
 *
 * Calculates the market conversion rate (전환율) from actual wolse transactions.
 * Uses pairs of transactions with different deposit-rent combinations to infer
 * the implicit interest rate used in deposit-rent tradeoffs.
 */
export class WolseRateCalculator {
  private wolseAPI: MolitWolseAPI;

  constructor(apiKey: string) {
    this.wolseAPI = new MolitWolseAPI(apiKey);
  }

  /**
   * Remove outliers from transactions
   *
   * Deposit filtering: 0 ~ 80% of estimated property value
   * - Property value is estimated from transactions: median implied jeonse / 0.75
   * - Implied jeonse = deposit + (monthlyRent × 12 / conversionRate)
   * - Falls back to IQR with 30% min if estimation fails
   *
   * Rent filtering: IQR-based with 30% minimum
   */
  private removeOutliers(
    transactions: WolseTransaction[],
    dataSource: 'building' | 'dong' | 'district' = 'building'
  ): {
    clean: WolseTransaction[];
    removed: WolseTransaction[];
  } {
    if (transactions.length < 4) {
      return { clean: transactions, removed: [] };
    }

    const CONVERSION_RATE = 0.045; // 4.5% for implied jeonse calculation
    const JEONSE_TO_VALUE_RATIO = 0.75; // Jeonse is typically 75% of property value
    const MAX_DEPOSIT_RATIO = 0.80; // Max deposit is 80% of property value
    const MIN_IQR_PERCENT = 0.30; // 30% of median for IQR fallback

    // Use tighter bounds for dong/district level data (higher variance)
    const multiplier = dataSource === 'building' ? 1.5 : 1.0;

    // Step 1: Estimate property value from transactions
    // Calculate implied jeonse for each transaction
    const impliedJeonses = transactions.map(t =>
      t.deposit + (t.monthlyRent * 12 / CONVERSION_RATE)
    );
    impliedJeonses.sort((a, b) => a - b);
    const medianImpliedJeonse = impliedJeonses[Math.floor(impliedJeonses.length / 2)];
    const estimatedPropertyValue = medianImpliedJeonse / JEONSE_TO_VALUE_RATIO;

    // Step 2: Calculate deposit bounds (0 ~ 80% of property value)
    const depositLower = 0;
    const depositUpper = estimatedPropertyValue * MAX_DEPOSIT_RATIO;
    const depositMethod = 'property-value';

    console.log(`\n   📊 Deposit Bounds [${depositMethod}]:`);
    console.log(`      Median implied jeonse: ${(medianImpliedJeonse/10000).toFixed(0)}만`);
    console.log(`      Estimated property value: ${(estimatedPropertyValue/10000).toFixed(0)}만`);
    console.log(`      Valid deposit range: ${(depositLower/10000).toFixed(0)}만 ~ ${(depositUpper/10000).toFixed(0)}만 (0~80%)`);

    // Step 3: Calculate rent bounds using IQR with 30% minimum
    const sortedRents = [...transactions].sort((a, b) => a.monthlyRent - b.monthlyRent);
    const q1RentIdx = Math.floor(transactions.length * 0.25);
    const q3RentIdx = Math.floor(transactions.length * 0.75);
    const medianRentIdx = Math.floor(transactions.length * 0.5);
    const q1Rent = sortedRents[q1RentIdx].monthlyRent;
    const q3Rent = sortedRents[q3RentIdx].monthlyRent;
    const medianRent = sortedRents[medianRentIdx].monthlyRent;

    // Use actual IQR or minimum 30% of median, whichever is larger
    let iqrRent = q3Rent - q1Rent;
    const minIqrRent = medianRent * MIN_IQR_PERCENT;
    const usedMinRent = iqrRent < minIqrRent;
    if (usedMinRent) {
      iqrRent = minIqrRent;
    }

    const rentLower = q1Rent - multiplier * iqrRent;
    const rentUpper = q3Rent + multiplier * iqrRent;

    const rentNote = usedMinRent ? ' (min 30%)' : '';
    console.log(`   📊 Rent Bounds [IQR, ${multiplier}×]: ${(rentLower/10000).toFixed(0)}만 ~ ${(rentUpper/10000).toFixed(0)}만${rentNote}`);

    // Step 4: Filter transactions
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
   * Filter out renewal contracts (갱신) from transactions
   *
   * Renewal contracts are limited to 5% increase under Korean law,
   * so they don't represent true market rates. This also naturally
   * excludes most 임대주택 since tenants tend to renew due to low prices.
   *
   * @returns Object with filtered transactions and renewal count
   */
  private filterRenewalContracts(
    transactions: WolseTransaction[]
  ): {
    filtered: WolseTransaction[];
    renewalCount: number;
    renewalTransactions: WolseTransaction[];
  } {
    const renewalTransactions: WolseTransaction[] = [];
    const filtered: WolseTransaction[] = [];

    for (const t of transactions) {
      // Check for renewal contract (갱신)
      // contractType can be '신규', '갱신', or undefined (old data without this field)
      if (t.contractType === '갱신') {
        renewalTransactions.push(t);
      } else {
        filtered.push(t);
      }
    }

    return {
      filtered,
      renewalCount: renewalTransactions.length,
      renewalTransactions
    };
  }

  /**
   * Calculate market rate for a specific property
   * Supports apartments, multifamily (연립/다세대), and officetel (오피스텔)
   */
  async calculateMarketRate(
    city: string,
    district: string,
    dong: string,
    apartmentName: string,
    exclusiveArea: number,
    monthsBack: number = 12,  // 12 months for better Mann-Kendall trend detection
    buildingType: BuildingType = 'apartment' // Default for backwards compatibility
  ): Promise<MarketRateResult> {
    const lawdCd = getDistrictCode(city, district);
    if (!lawdCd) {
      throw new Error(`District code not found for ${city} ${district}`);
    }

    console.log('\n📊 Starting Wolse Market Rate Calculation');
    console.log(`   Building Type: ${buildingType}`);
    console.log(`   Building: ${apartmentName || '(dong-level)'}`);
    console.log(`   Area: ${exclusiveArea}㎡`);
    console.log(`   District: ${district} (${lawdCd})`);

    let transactions: WolseTransaction[] = [];
    let dataSource = 'building';
    let confidenceLevel: 'HIGH' | 'MEDIUM' | 'LOW' | 'INSUFFICIENT' = 'HIGH';
    let usedAdjacentDongs: string[] = [];  // Track which adjacent dongs were used

    // For multifamily (연립/다세대), always start with dong-level data
    // Building names are unreliable in MOLIT data for these property types
    if (buildingType === 'multifamily') {
      console.log(`\n🏘️ Multifamily property: Using dong-level data directly`);
      transactions = await this.wolseAPI.getRecentWolseForMultifamilyByDong(
        lawdCd,
        dong,
        exclusiveArea,
        monthsBack,
        0.10  // ±10% area tolerance for dong-level multifamily
      );
      dataSource = 'dong';
      confidenceLevel = transactions.length >= 10 ? 'MEDIUM' : 'LOW';

      // If insufficient data, expand to adjacent dongs (keep strict area tolerance)
      if (transactions.length < 5) {
        const adjacentDongs = getAdjacentDongs(district, dong);
        if (adjacentDongs.length > 0) {
          console.log(`\n⚠️ Only ${transactions.length} transactions in ${dong}. Expanding to adjacent dongs: [${adjacentDongs.join(', ')}]`);
          const allDongs = [dong, ...adjacentDongs];
          transactions = await this.wolseAPI.getRecentWolseForMultifamilyByDongs(
            lawdCd,
            allDongs,
            exclusiveArea,
            monthsBack,
            0.10  // Keep strict ±10% area tolerance
          );
          usedAdjacentDongs = adjacentDongs;
          console.log(`   → After dong expansion: ${transactions.length} transactions`);
          confidenceLevel = transactions.length >= 10 ? 'LOW' : 'INSUFFICIENT';
        }

        // If still insufficient, expand to district-wide (keep strict area tolerance)
        // This is better than widening area tolerance which introduces noise
        // (e.g., 110㎡ rent can't represent 154㎡ rent accurately)
        if (transactions.length < 5) {
          console.log(`\n⚠️ Still only ${transactions.length} transactions. Expanding to district-wide with strict ±10% area...`);
          transactions = await this.wolseAPI.getRecentWolseForMultifamilyByDongs(
            lawdCd,
            [],  // Empty = district-wide, no dong filter
            exclusiveArea,
            monthsBack,
            0.10  // Keep strict ±10% area tolerance
          );
          dataSource = 'district';
          console.log(`   → After district expansion: ${transactions.length} transactions`);
          confidenceLevel = transactions.length >= 5 ? 'LOW' : 'INSUFFICIENT';
        }
      }
    } else if (buildingType === 'officetel') {
      // For officetel, try building-level first (reliable names), fallback to dong
      console.log(`\n🏢 Officetel property: Trying building-level data first`);
      transactions = await this.wolseAPI.getRecentWolseForOfficetelByBuilding(
        lawdCd,
        apartmentName,
        exclusiveArea,
        monthsBack
      );
      dataSource = 'building';

      if (transactions.length < 5) {
        console.log(`\n⚠️ Officetel building data insufficient (${transactions.length}). Expanding to dong level...`);
        transactions = await this.wolseAPI.getRecentWolseForOfficetelByDong(
          lawdCd,
          dong,
          exclusiveArea,
          12,
          0.10  // ±10% area tolerance for dong-level officetel
        );
        dataSource = 'dong';
        confidenceLevel = transactions.length >= 10 ? 'MEDIUM' : 'LOW';
      }
    } else {
      // For apartments, try building-level first
      transactions = await this.wolseAPI.getRecentWolseForApartment(
        lawdCd,
        apartmentName,
        exclusiveArea,
        monthsBack
      );

      // Step 2: Fall back to dong-level if insufficient data
      if (transactions.length < 5) {
        console.log(`\n⚠️ Only ${transactions.length} building transactions. Expanding to dong level...`);
        // Use 12 months and ±5% area tolerance for dong-level (stricter filtering, more data)
        const dongMonthsBack = 12;
        const dongTransactions = await this.wolseAPI.getWolseForDong(
          lawdCd,
          dong,
          exclusiveArea,
          dongMonthsBack,
          0.05  // ±5% area tolerance (stricter than default ±10%)
        );
        transactions = dongTransactions;
        dataSource = 'dong';
        confidenceLevel = 'LOW';
      }
    }

    // Step 2.5: Filter out renewal contracts (갱신)
    // Renewals are capped at 5% increase and don't represent market rates
    // This also naturally excludes most 임대주택 since tenants tend to renew
    const originalCount = transactions.length;
    const filterResult = this.filterRenewalContracts(transactions);
    transactions = filterResult.filtered;

    if (filterResult.renewalCount > 0) {
      console.log(`\n🔍 RENEWAL CONTRACT FILTER:`);
      console.log(`   Original: ${originalCount} transactions`);
      console.log(`   🔄 Renewals (갱신) removed: ${filterResult.renewalCount}`);
      console.log(`   ✅ New contracts (신규) kept: ${transactions.length}`);
    }

    // Step 3: Check if we have sufficient data
    if (transactions.length < 5) {
      console.log(`\n❌ Insufficient data: only ${transactions.length} transactions found`);
      return {
        marketRate: LEGAL_CAP,
        rate25thPercentile: LEGAL_CAP,
        rate75thPercentile: LEGAL_CAP,
        confidenceLevel: 'INSUFFICIENT',
        dataSource: dataSource as 'building' | 'dong' | 'district',
        dataSourceNote: `Insufficient data: only ${transactions.length} transactions found in ${dong} area`,
        contractCount: transactions.length,
        cleanTransactionCount: transactions.length,
        outliersRemoved: 0,
        validPairCount: 0,
        trend: {
          direction: 'STABLE',
          percentage: 0,
          pValue: 1,
          slopePerMonth: 0
        },
        legalRate: LEGAL_CAP,
        transactions
      };
    }

    // Step 4: Remove outliers using IQR method
    // Use tighter bounds (1.0×IQR) for dong/district level data
    const { clean: cleanTransactions, removed: outlierTransactions } = this.removeOutliers(
      transactions,
      dataSource as 'building' | 'dong' | 'district'
    );
    const outliersRemoved = outlierTransactions.length;
    console.log(`\n🔍 Outlier removal: ${transactions.length} → ${cleanTransactions.length} (${outliersRemoved} outliers removed)`);

    // Update confidence based on count
    if (dataSource === 'building') {
      confidenceLevel = cleanTransactions.length >= 10 ? 'HIGH' : 'MEDIUM';
    }

    // Generate data source note
    const getDataSourceNote = (source: string, count: number, cleanCount: number, outliers: number, building: string, dongName: string, adjacentDongs: string[], districtName: string): string => {
      const outlierNote = outliers > 0 ? ` (${outliers} outliers removed)` : '';
      if (source === 'building') {
        return `Based on ${cleanCount} transactions from "${building}" building${outlierNote}`;
      } else if (source === 'dong') {
        if (adjacentDongs.length > 0) {
          return `Based on ${cleanCount} transactions from ${dongName} + adjacent areas (${adjacentDongs.join(', ')})${outlierNote}`;
        }
        return `Based on ${cleanCount} transactions from ${dongName} area${outlierNote}`;
      } else if (source === 'district') {
        return `Based on ${cleanCount} transactions from ${districtName} district (area-matched)${outlierNote}`;
      }
      return `Based on ${cleanCount} transactions${outlierNote}`;
    };

    // Step 5: Calculate implied conversion rates from transaction pairs (using clean transactions)
    // Use time-adjusted method for both building and dong level data
    const { pairs: ratePairs, timeAdjustedTransactions } = this.calculateConversionRatePairsWithTimeAdjustment(cleanTransactions);
    console.log(`\n📈 Calculated ${ratePairs.length} valid rate pairs (time-adjusted)`);

    if (ratePairs.length === 0) {
      // Can't calculate market rate from pairs - use baseline method
      console.log('⚠️ No valid pairs. Using baseline calculation method.');
      const baselineRate = this.calculateBaselineRate(cleanTransactions);
      // Still calculate trend using Mann-Kendall even without valid pairs
      const fallbackTrend = this.calculateTrendWithMannKendall(cleanTransactions, baselineRate || LEGAL_CAP);
      return {
        marketRate: baselineRate || LEGAL_CAP,
        rate25thPercentile: baselineRate || LEGAL_CAP,
        rate75thPercentile: baselineRate || LEGAL_CAP,
        confidenceLevel: 'LOW',
        dataSource: dataSource as 'building' | 'dong' | 'district',
        dataSourceNote: getDataSourceNote(dataSource, transactions.length, cleanTransactions.length, outliersRemoved, apartmentName, dong, usedAdjacentDongs, district) + ' (no valid rate pairs for comparison)',
        contractCount: transactions.length,
        cleanTransactionCount: cleanTransactions.length,
        outliersRemoved,
        validPairCount: 0,
        trend: fallbackTrend,
        legalRate: LEGAL_CAP,
        transactions: cleanTransactions,
        timeAdjustedTransactions
      };
    }

    // Step 6: Calculate time-weighted market rate
    const marketRateStats = this.calculateWeightedMarketRate(ratePairs);

    // Step 7: Calculate trend using Mann-Kendall test on Full Monthly Cost
    const trend = this.calculateTrendWithMannKendall(cleanTransactions, marketRateStats.median);

    console.log('\n✅ Market Rate Calculation Complete:');
    console.log(`   Market Rate: ${marketRateStats.median.toFixed(2)}%`);
    console.log(`   Range: ${marketRateStats.percentile25.toFixed(2)}% - ${marketRateStats.percentile75.toFixed(2)}%`);
    console.log(`   Legal Cap: ${LEGAL_CAP}%`);
    console.log(`   Transactions: ${cleanTransactions.length}/${transactions.length} (${outliersRemoved} outliers removed)`);
    console.log(`   Confidence: ${confidenceLevel}`);
    console.log(`   Trend: ${trend.direction} (${trend.percentage.toFixed(1)}%, p=${trend.pValue.toFixed(4)})`);

    // Convert ratePairs to simple {x, y} format for trend analysis testing
    const maxDaysAgo = Math.max(...ratePairs.map(p => p.daysAgo));
    const ratePairsXY = ratePairs.map(p => ({
      x: maxDaysAgo - p.daysAgo, // Chronological order (older = lower x)
      y: p.impliedRate
    }));

    return {
      marketRate: marketRateStats.median,
      rate25thPercentile: marketRateStats.percentile25,
      rate75thPercentile: marketRateStats.percentile75,
      confidenceLevel,
      dataSource: dataSource as 'building' | 'dong' | 'district',
      dataSourceNote: getDataSourceNote(dataSource, transactions.length, cleanTransactions.length, outliersRemoved, apartmentName, dong, usedAdjacentDongs, district),
      contractCount: transactions.length,
      cleanTransactionCount: cleanTransactions.length,
      outliersRemoved,
      validPairCount: ratePairs.length,
      trend,
      legalRate: LEGAL_CAP,
      transactions: cleanTransactions,
      timeAdjustedTransactions,
      ratePairs: ratePairsXY
    };
  }

  /**
   * Calculate implied conversion rates from pairs of transactions
   *
   * Formula: rate = ((rent1 - rent2) × 12) / (deposit2 - deposit1) × 100
   *
   * Only valid when:
   * - SAME BUILDING (apartmentName must match)
   * - Different deposit amounts (deposit difference > 5M won)
   * - Both have monthly rent > 0
   * - Resulting rate is within reasonable range (0-15%)
   */
  private calculateConversionRatePairs(transactions: WolseTransaction[]): ConversionRatePair[] {
    const pairs: ConversionRatePair[] = [];
    const now = new Date();

    // Group transactions by building name to avoid cross-building comparisons
    const buildingGroups = new Map<string, WolseTransaction[]>();
    for (const t of transactions) {
      const key = t.apartmentName;
      if (!buildingGroups.has(key)) {
        buildingGroups.set(key, []);
      }
      buildingGroups.get(key)!.push(t);
    }

    const skippedBuildings = [...buildingGroups.values()].filter(txs => txs.length < 2).length;
    console.log(`\n   🏢 Building groups: ${buildingGroups.size} buildings (${skippedBuildings} skipped <2 txs)`);

    // Compare transactions only within the same building
    for (const [buildingName, buildingTransactions] of buildingGroups) {
      // Need at least 2 transactions to form a pair
      if (buildingTransactions.length < 2) continue;

      for (let i = 0; i < buildingTransactions.length; i++) {
        for (let j = i + 1; j < buildingTransactions.length; j++) {
          const t1 = buildingTransactions[i];
          const t2 = buildingTransactions[j];

          // Skip if deposits are too similar (need meaningful difference)
          const depositDiff = Math.abs(t1.deposit - t2.deposit);
          if (depositDiff < 5000000) continue; // Need at least 5M won difference

          // Skip if either has zero rent (pure jeonse)
          if (t1.monthlyRent === 0 || t2.monthlyRent === 0) continue;

          // Calculate implied rate
          // Higher deposit = lower rent, so:
          // If deposit1 < deposit2, then rent1 should be > rent2
          let impliedRate: number;
          if (t1.deposit < t2.deposit) {
            // t1 has lower deposit, should have higher rent
            const rentDiff = t1.monthlyRent - t2.monthlyRent;
            const depositDiffAmount = t2.deposit - t1.deposit;
            impliedRate = (rentDiff * 12) / depositDiffAmount * 100;
          } else {
            // t2 has lower deposit, should have higher rent
            const rentDiff = t2.monthlyRent - t1.monthlyRent;
            const depositDiffAmount = t1.deposit - t2.deposit;
            impliedRate = (rentDiff * 12) / depositDiffAmount * 100;
          }

          // Filter out unrealistic rates (outliers)
          if (impliedRate < 0 || impliedRate > 15) continue;

          // Calculate average days ago for weighting
          const date1 = new Date(t1.year, t1.month - 1, t1.day);
          const date2 = new Date(t2.year, t2.month - 1, t2.day);
          const daysAgo1 = (now.getTime() - date1.getTime()) / (1000 * 60 * 60 * 24);
          const daysAgo2 = (now.getTime() - date2.getTime()) / (1000 * 60 * 60 * 24);
          const avgDaysAgo = (daysAgo1 + daysAgo2) / 2;

          // Time-based weight: more recent = higher weight
          // weight = 1 / (1 + months_ago × 0.2)
          const monthsAgo = avgDaysAgo / 30;
          const weight = 1 / (1 + monthsAgo * 0.2);

          pairs.push({
            transaction1: t1,
            transaction2: t2,
            impliedRate,
            daysAgo: avgDaysAgo,
            weight
          });
        }
      }
    }

    // Log rate distribution (concise)
    if (pairs.length > 0) {
      const rates = pairs.map(p => p.impliedRate).sort((a, b) => a - b);
      const median = rates[Math.floor(rates.length / 2)];
      console.log(`   📊 Rate pairs: ${pairs.length}, range ${rates[0].toFixed(2)}%~${rates[rates.length-1].toFixed(2)}%, median ${median.toFixed(2)}%`);
    }

    return pairs;
  }

  /**
   * Calculate baseline rate when pair comparison isn't possible
   * Uses assumed jeonse-equivalent calculation
   */
  private calculateBaselineRate(transactions: WolseTransaction[]): number | null {
    // Find the transaction with highest deposit (closest to jeonse)
    const sortedByDeposit = [...transactions].sort((a, b) => b.deposit - a.deposit);
    const highDeposit = sortedByDeposit[0];

    // Find the transaction with lowest deposit (highest rent)
    const lowDeposit = sortedByDeposit[sortedByDeposit.length - 1];

    if (!highDeposit || !lowDeposit) return null;
    if (highDeposit.deposit === lowDeposit.deposit) return null;

    const depositDiff = highDeposit.deposit - lowDeposit.deposit;
    const rentDiff = lowDeposit.monthlyRent - highDeposit.monthlyRent;

    if (depositDiff <= 0 || rentDiff <= 0) return null;

    const rate = (rentDiff * 12) / depositDiff * 100;

    if (rate < 0 || rate > 15) return null;

    return rate;
  }

  /**
   * Calculate time-weighted market rate from pairs
   */
  private calculateWeightedMarketRate(pairs: ConversionRatePair[]): {
    median: number;
    weightedMean: number;
    percentile25: number;
    percentile75: number;
  } {
    if (pairs.length === 0) {
      return { median: LEGAL_CAP, weightedMean: LEGAL_CAP, percentile25: LEGAL_CAP, percentile75: LEGAL_CAP };
    }

    // Sort by implied rate for percentile calculations
    const sortedRates = pairs.map(p => p.impliedRate).sort((a, b) => a - b);

    // Calculate percentiles
    const percentile = (arr: number[], p: number): number => {
      const index = (p / 100) * (arr.length - 1);
      const lower = Math.floor(index);
      const upper = Math.ceil(index);
      if (lower === upper) return arr[lower];
      return arr[lower] + (arr[upper] - arr[lower]) * (index - lower);
    };

    const median = percentile(sortedRates, 50);
    const percentile25 = percentile(sortedRates, 25);
    const percentile75 = percentile(sortedRates, 75);

    // Calculate weighted mean
    const totalWeight = pairs.reduce((sum, p) => sum + p.weight, 0);
    const weightedMean = pairs.reduce((sum, p) => sum + p.impliedRate * p.weight, 0) / totalWeight;

    return { median, weightedMean, percentile25, percentile75 };
  }

  /**
   * Get current legal conversion rate
   */
  static getLegalRate(): number {
    return LEGAL_CAP;
  }

  /**
   * Get BOK base rate
   */
  static getBokRate(): number {
    return CURRENT_BOK_RATE;
  }

  /**
   * Calculate time adjustment factors for a building's transactions
   *
   * Methodology:
   * 1. Calculate reference deposit (median of all transactions)
   * 2. Group transactions by month
   * 3. For each month with >= 3 transactions, estimate rent at reference deposit
   * 4. Apply 3-month moving average smoothing
   * 5. Calculate adjustment factor = latest smoothed rent / each month's smoothed rent
   */
  private calculateTimeAdjustmentFactors(
    transactions: WolseTransaction[]
  ): { trendPoints: MonthlyTrendPoint[]; referenceDeposit: number } {
    if (transactions.length < 3) {
      return { trendPoints: [], referenceDeposit: 0 };
    }

    // Step 1: Calculate reference deposit (median)
    const sortedDeposits = [...transactions].map(t => t.deposit).sort((a, b) => a - b);
    const referenceDeposit = sortedDeposits[Math.floor(sortedDeposits.length / 2)];

    // Step 2: Group by yearMonth
    const monthGroups = new Map<string, WolseTransaction[]>();
    for (const t of transactions) {
      const yearMonth = `${t.year}${t.month.toString().padStart(2, '0')}`;
      if (!monthGroups.has(yearMonth)) {
        monthGroups.set(yearMonth, []);
      }
      monthGroups.get(yearMonth)!.push(t);
    }

    // Step 3: Calculate normalized rent for each month (skip months with < 3 transactions)
    const trendPoints: MonthlyTrendPoint[] = [];
    const sortedMonths = [...monthGroups.keys()].sort();

    for (const yearMonth of sortedMonths) {
      const monthTxs = monthGroups.get(yearMonth)!;

      if (monthTxs.length < 3) {
        // Skip months with insufficient data
        continue;
      }

      // Calculate median deposit and rent for this month
      const deposits = monthTxs.map(t => t.deposit).sort((a, b) => a - b);
      const rents = monthTxs.map(t => t.monthlyRent).sort((a, b) => a - b);
      const medianDeposit = deposits[Math.floor(deposits.length / 2)];
      const medianRent = rents[Math.floor(rents.length / 2)];

      // Estimate rent at reference deposit using linear interpolation
      // Higher deposit = lower rent. Use simple linear model.
      // Calculate slope using all transactions in this month
      let normalizedRent = medianRent;

      if (monthTxs.length >= 2 && medianDeposit !== referenceDeposit) {
        // Linear regression: rent = intercept + slope * deposit
        const n = monthTxs.length;
        const sumX = monthTxs.reduce((s, t) => s + t.deposit, 0);
        const sumY = monthTxs.reduce((s, t) => s + t.monthlyRent, 0);
        const sumXY = monthTxs.reduce((s, t) => s + t.deposit * t.monthlyRent, 0);
        const sumX2 = monthTxs.reduce((s, t) => s + t.deposit * t.deposit, 0);

        const denominator = n * sumX2 - sumX * sumX;
        if (Math.abs(denominator) > 1e-10) {
          const slope = (n * sumXY - sumX * sumY) / denominator;
          const intercept = (sumY - slope * sumX) / n;

          // Predict rent at reference deposit
          normalizedRent = intercept + slope * referenceDeposit;

          // Ensure normalized rent is positive and reasonable
          if (normalizedRent <= 0) {
            normalizedRent = medianRent;
          }
        }
      }

      trendPoints.push({
        yearMonth,
        medianDeposit,
        medianRent,
        normalizedRent,
        transactionCount: monthTxs.length
      });
    }

    if (trendPoints.length === 0) {
      return { trendPoints: [], referenceDeposit };
    }

    // Step 4: Apply 3-month moving average smoothing
    for (let i = 0; i < trendPoints.length; i++) {
      const windowStart = Math.max(0, i - 1);
      const windowEnd = Math.min(trendPoints.length - 1, i + 1);

      let sum = 0;
      let count = 0;
      for (let j = windowStart; j <= windowEnd; j++) {
        sum += trendPoints[j].normalizedRent;
        count++;
      }
      trendPoints[i].smoothedRent = sum / count;
    }

    return { trendPoints, referenceDeposit };
  }

  /**
   * Apply time adjustment to transactions based on trend data
   * Adjusts all rents to "today's market equivalent"
   */
  private applyTimeAdjustment(
    transactions: WolseTransaction[],
    trendPoints: MonthlyTrendPoint[]
  ): TimeAdjustedTransaction[] {
    if (trendPoints.length === 0) {
      // No trend data - return transactions with no adjustment
      return transactions.map(t => ({
        ...t,
        adjustedMonthlyRent: t.monthlyRent,
        adjustmentFactor: 1.0
      }));
    }

    // Get latest smoothed rent as reference
    const latestPoint = trendPoints[trendPoints.length - 1];
    const latestSmoothedRent = latestPoint.smoothedRent || latestPoint.normalizedRent;

    // Create a map of adjustment factors by yearMonth
    const adjustmentMap = new Map<string, number>();
    for (const point of trendPoints) {
      const pointRent = point.smoothedRent || point.normalizedRent;
      // adjustment factor = latest / this month
      // If market is rising, older months have lower rents, so factor > 1
      const factor = pointRent > 0 ? latestSmoothedRent / pointRent : 1.0;
      adjustmentMap.set(point.yearMonth, factor);
    }

    // Calculate average factor for months not in trend data
    const avgFactor = trendPoints.length > 0
      ? [...adjustmentMap.values()].reduce((s, f) => s + f, 0) / adjustmentMap.size
      : 1.0;

    // Apply adjustment to all transactions
    return transactions.map(t => {
      const yearMonth = `${t.year}${t.month.toString().padStart(2, '0')}`;
      const factor = adjustmentMap.get(yearMonth) || avgFactor;

      return {
        ...t,
        adjustedMonthlyRent: t.monthlyRent * factor,
        adjustmentFactor: factor
      };
    });
  }

  /**
   * Calculate conversion rate pairs with time adjustment
   * This is the main method that combines building grouping + time adjustment
   * Returns both pairs and the time-adjusted transactions for use in expected rent calculation
   */
  private calculateConversionRatePairsWithTimeAdjustment(
    transactions: WolseTransaction[]
  ): { pairs: ConversionRatePair[]; timeAdjustedTransactions: TimeAdjustedTransaction[] } {
    const pairs: ConversionRatePair[] = [];
    const allAdjustedTxs: TimeAdjustedTransaction[] = [];
    const now = new Date();

    // Group transactions by building name
    const buildingGroups = new Map<string, WolseTransaction[]>();
    for (const t of transactions) {
      const key = t.apartmentName;
      if (!buildingGroups.has(key)) {
        buildingGroups.set(key, []);
      }
      buildingGroups.get(key)!.push(t);
    }

    // Track buildings with time adjustment
    const buildingsWithAdjustment: string[] = [];
    const buildingsSkipped: number = [...buildingGroups.values()].filter(txs => txs.length < 2).length;

    // Process each building separately
    for (const [buildingName, buildingTransactions] of buildingGroups) {
      // Need at least 2 transactions to form pairs
      if (buildingTransactions.length < 2) {
        continue;
      }

      // Step 1: Calculate time adjustment factors for this building
      const { trendPoints, referenceDeposit } = this.calculateTimeAdjustmentFactors(buildingTransactions);

      if (trendPoints.length > 0) {
        const factors = trendPoints.map(p => p.smoothedRent ? (trendPoints[trendPoints.length-1].smoothedRent! / p.smoothedRent).toFixed(2) : '1.00');
        buildingsWithAdjustment.push(`${buildingName}(${factors.join('→')})`);
      }

      // Step 2: Apply time adjustment to all transactions in this building
      const adjustedTxs = this.applyTimeAdjustment(buildingTransactions, trendPoints);

      // Collect all adjusted transactions for expected rent calculation
      allAdjustedTxs.push(...adjustedTxs);

      // Step 3: Calculate pairs using adjusted rents
      for (let i = 0; i < adjustedTxs.length; i++) {
        for (let j = i + 1; j < adjustedTxs.length; j++) {
          const t1 = adjustedTxs[i];
          const t2 = adjustedTxs[j];

          // Skip if deposits are too similar (need meaningful difference)
          const depositDiff = Math.abs(t1.deposit - t2.deposit);
          if (depositDiff < 5000000) continue; // Need at least 5M won difference

          // Skip if either has zero rent
          if (t1.monthlyRent === 0 || t2.monthlyRent === 0) continue;

          // Calculate implied rate using TIME-ADJUSTED rents
          let impliedRate: number;
          if (t1.deposit < t2.deposit) {
            // t1 has lower deposit, should have higher rent
            const rentDiff = t1.adjustedMonthlyRent - t2.adjustedMonthlyRent;
            const depositDiffAmount = t2.deposit - t1.deposit;
            impliedRate = (rentDiff * 12) / depositDiffAmount * 100;
          } else {
            // t2 has lower deposit, should have higher rent
            const rentDiff = t2.adjustedMonthlyRent - t1.adjustedMonthlyRent;
            const depositDiffAmount = t1.deposit - t2.deposit;
            impliedRate = (rentDiff * 12) / depositDiffAmount * 100;
          }

          // Filter out unrealistic rates
          if (impliedRate < 0 || impliedRate > 15) continue;

          // Calculate average days ago for weighting
          const date1 = new Date(t1.year, t1.month - 1, t1.day);
          const date2 = new Date(t2.year, t2.month - 1, t2.day);
          const daysAgo1 = (now.getTime() - date1.getTime()) / (1000 * 60 * 60 * 24);
          const daysAgo2 = (now.getTime() - date2.getTime()) / (1000 * 60 * 60 * 24);
          const avgDaysAgo = (daysAgo1 + daysAgo2) / 2;

          // Time-based weight
          const monthsAgo = avgDaysAgo / 30;
          const weight = 1 / (1 + monthsAgo * 0.2);

          pairs.push({
            transaction1: t1,
            transaction2: t2,
            impliedRate,
            daysAgo: avgDaysAgo,
            weight
          });
        }
      }
    }

    // Log summary
    console.log(`\n   🏢 Time-adjusted: ${buildingGroups.size} buildings (${buildingsSkipped} skipped <2 txs)`);
    if (buildingsWithAdjustment.length > 0) {
      console.log(`      Adjusted: ${buildingsWithAdjustment.slice(0, 5).join(', ')}${buildingsWithAdjustment.length > 5 ? ` +${buildingsWithAdjustment.length - 5} more` : ''}`);
    }

    // Log rate distribution (concise)
    if (pairs.length > 0) {
      const rates = pairs.map(p => p.impliedRate).sort((a, b) => a - b);
      const median = rates[Math.floor(rates.length / 2)];
      console.log(`   📊 Rate pairs: ${pairs.length}, range ${rates[0].toFixed(2)}%~${rates[rates.length-1].toFixed(2)}%, median ${median.toFixed(2)}%`);
    }

    return { pairs, timeAdjustedTransactions: allAdjustedTxs };
  }

  /**
   * Calculate trend using Mann-Kendall test on Full Monthly Cost
   * Full Monthly Cost = rent + (deposit × market_rate / 12)
   * This normalizes all transactions to a common metric for trend detection
   */
  calculateTrendWithMannKendall(
    transactions: WolseTransaction[],
    marketRate: number
  ): {
    direction: 'RISING' | 'LIKELY_RISING' | 'STABLE' | 'LIKELY_DECLINING' | 'DECLINING';
    percentage: number;
    pValue: number;
    slopePerMonth: number;
  } {
    if (transactions.length < 4) {
      return { direction: 'STABLE', percentage: 0, pValue: 1, slopePerMonth: 0 };
    }

    const now = new Date();
    const rateMonthly = marketRate / 100 / 12;

    // Calculate full monthly cost for each transaction
    const dataPoints = transactions.map(t => {
      const txDate = new Date(t.year, t.month - 1, t.day);
      const daysAgo = Math.floor((now.getTime() - txDate.getTime()) / (1000 * 60 * 60 * 24));
      // Full monthly cost in 만원
      const fullMonthlyCost = (t.monthlyRent + t.deposit * rateMonthly) / 10000;
      return { daysAgo, fullMonthlyCost };
    });

    // Convert to chronological order (x = days from oldest)
    const maxDaysAgo = Math.max(...dataPoints.map(p => p.daysAgo));
    const chronoData = dataPoints.map(p => ({
      x: maxDaysAgo - p.daysAgo,
      y: p.fullMonthlyCost
    }));

    // Run Mann-Kendall test
    const mk = mannKendallTest(chronoData);
    const tsSlope = theilSenSlope(chronoData);

    // Calculate percentage change over the period
    const avgCost = chronoData.reduce((sum, p) => sum + p.y, 0) / chronoData.length;
    const percentageChange = avgCost > 0 ? (tsSlope * maxDaysAgo / avgCost) * 100 : 0;

    console.log('\n📈 Trend Analysis (Mann-Kendall on Full Monthly Cost):');
    console.log(`   Data points: ${chronoData.length}`);
    console.log(`   Average full monthly cost: ${avgCost.toFixed(1)}만원`);
    console.log(`   S statistic: ${mk.S}`);
    console.log(`   Z statistic: ${mk.Z.toFixed(3)}`);
    console.log(`   p-value: ${mk.pValue.toFixed(6)}`);
    console.log(`   Theil-Sen slope: ${(tsSlope * 30).toFixed(2)}만원/month`);
    console.log(`   Period change: ${percentageChange.toFixed(1)}%`);
    console.log(`   Direction: ${mk.trend}`);

    return {
      direction: mk.trend,
      percentage: Math.abs(percentageChange),
      pValue: mk.pValue,
      slopePerMonth: tsSlope * 30  // Convert daily slope to monthly
    };
  }
}

/**
 * Mann-Kendall Trend Test
 * Non-parametric test for monotonic trends in time series data
 * Two-tier significance levels:
 *   p < 0.05: Confident trend (RISING/DECLINING)
 *   p < 0.10: Likely trend (LIKELY_RISING/LIKELY_DECLINING)
 *   p >= 0.10: No significant trend (STABLE)
 */
function mannKendallTest(data: { x: number; y: number }[]): {
  S: number;
  Z: number;
  pValue: number;
  trend: 'RISING' | 'LIKELY_RISING' | 'STABLE' | 'LIKELY_DECLINING' | 'DECLINING';
} {
  const sorted = [...data].sort((a, b) => a.x - b.x);
  const n = sorted.length;

  if (n < 4) {
    return { S: 0, Z: 0, pValue: 1, trend: 'STABLE' };
  }

  // Calculate S statistic (sum of signs of all pairwise differences)
  let S = 0;
  for (let i = 0; i < n - 1; i++) {
    for (let j = i + 1; j < n; j++) {
      const diff = sorted[j].y - sorted[i].y;
      if (diff > 0) S += 1;
      else if (diff < 0) S -= 1;
    }
  }

  // Calculate variance of S
  const varS = (n * (n - 1) * (2 * n + 5)) / 18;

  // Calculate Z statistic with continuity correction
  let Z: number;
  if (S > 0) Z = (S - 1) / Math.sqrt(varS);
  else if (S < 0) Z = (S + 1) / Math.sqrt(varS);
  else Z = 0;

  // Calculate two-tailed p-value
  const pValue = 2 * (1 - normalCDF(Math.abs(Z)));

  // Determine trend based on two-tier significance levels
  let trend: 'RISING' | 'LIKELY_RISING' | 'STABLE' | 'LIKELY_DECLINING' | 'DECLINING';
  if (pValue < 0.05) {
    // Confident trend (p < 0.05)
    trend = S > 0 ? 'RISING' : 'DECLINING';
  } else if (pValue < 0.10) {
    // Likely trend (0.05 <= p < 0.10)
    trend = S > 0 ? 'LIKELY_RISING' : 'LIKELY_DECLINING';
  } else {
    // No significant trend (p >= 0.10)
    trend = 'STABLE';
  }

  return { S, Z, pValue, trend };
}

/**
 * Standard Normal Cumulative Distribution Function
 * Uses Abramowitz and Stegun approximation
 */
function normalCDF(x: number): number {
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741;
  const a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x) / Math.sqrt(2);
  const t = 1.0 / (1.0 + p * x);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  return 0.5 * (1.0 + sign * y);
}

/**
 * Theil-Sen Slope Estimator
 * Robust median of all pairwise slopes (resistant to outliers)
 */
function theilSenSlope(data: { x: number; y: number }[]): number {
  const sorted = [...data].sort((a, b) => a.x - b.x);
  const n = sorted.length;
  if (n < 2) return 0;

  // Calculate all pairwise slopes
  const slopes: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    for (let j = i + 1; j < n; j++) {
      const dx = sorted[j].x - sorted[i].x;
      if (dx !== 0) {
        slopes.push((sorted[j].y - sorted[i].y) / dx);
      }
    }
  }

  if (slopes.length === 0) return 0;

  // Return median slope
  slopes.sort((a, b) => a - b);
  const mid = Math.floor(slopes.length / 2);
  return slopes.length % 2 === 0 ? (slopes[mid - 1] + slopes[mid]) / 2 : slopes[mid];
}
