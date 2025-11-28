import { MolitAPI, getDistrictCode } from '../apis/molit';
import { supabaseAdmin } from '../supabase';
import { PropertyDetails, ValuationResult, MolitTransaction } from '../types';

export class PropertyValuationEngine {
  private molitAPI: MolitAPI;

  constructor(molitApiKey: string) {
    this.molitAPI = new MolitAPI(molitApiKey);
  }

  async calculatePropertyValue(
    property: PropertyDetails
  ): Promise<ValuationResult> {
    // Step 1: Get recent transaction data from MOLIT
    const lawdCd = getDistrictCode(property.city, property.district);

    if (!lawdCd) {
      throw new Error(`District code not found for ${property.city} ${property.district}`);
    }

    // Fetch 12 months of data for better statistical reliability
    // 12 months provides: more data points, full seasonal coverage, better R² values
    const recentTransactions = await this.molitAPI.getRecentTransactionsForApartment(
      lawdCd,
      property.buildingName,
      property.exclusiveArea,
      12 // Last 12 months (changed from 6 for better trend accuracy)
    );

    if (recentTransactions.length === 0) {
      throw new Error('No recent transaction data found for this property');
    }

    // Log comparison: 6-month vs 12-month transaction counts
    const now = new Date();
    const transactions6M = recentTransactions.filter(t => {
      const transactionDate = new Date(t.year, t.month - 1, t.day);
      const monthsAgo = (now.getTime() - transactionDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
      return monthsAgo <= 6;
    });

    console.log(`📊 Transaction data: 6M=${transactions6M.length} txns, 12M=${recentTransactions.length} txns`);
    if (recentTransactions.length >= transactions6M.length * 1.5) {
      console.log(`   ✅ 12-month period provides ${((recentTransactions.length / Math.max(1, transactions6M.length) - 1) * 100).toFixed(0)}% more data points`);
    }

    // Step 2: Calculate base value from recent sales
    const baseValue = this.calculateBaseValue(recentTransactions);

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
      ]
    };
  }

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
