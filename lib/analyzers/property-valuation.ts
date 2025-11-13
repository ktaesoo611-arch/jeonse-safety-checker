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

    const recentTransactions = await this.molitAPI.getRecentTransactionsForApartment(
      lawdCd,
      property.buildingName,
      property.exclusiveArea,
      6 // Last 6 months
    );

    if (recentTransactions.length === 0) {
      throw new Error('No recent transaction data found for this property');
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

    // Step 4: Calculate trend
    const trend = this.calculateTrend(recentTransactions);

    // Step 5: Determine value range
    const valueLow = Math.floor(floorAdjustedValue * 0.95);
    const valueMid = Math.floor(floorAdjustedValue);
    const valueHigh = Math.floor(floorAdjustedValue * 1.05);

    // Step 6: Cache results
    await this.cacheResults(property, recentTransactions);

    return {
      valueLow,
      valueMid,
      valueHigh,
      confidence: this.determineConfidence(recentTransactions),
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

  private calculateTrend(transactions: MolitTransaction[]): {
    direction: 'rising' | 'stable' | 'falling';
    percentage: number;
  } {
    if (transactions.length < 2) {
      return { direction: 'stable', percentage: 0 };
    }

    // Sort by date
    const sorted = [...transactions].sort((a, b) => {
      const dateA = new Date(a.year, a.month - 1, a.day);
      const dateB = new Date(b.year, b.month - 1, b.day);
      return dateA.getTime() - dateB.getTime();
    });

    // Compare first half vs second half
    const midpoint = Math.floor(sorted.length / 2);
    const firstHalf = sorted.slice(0, midpoint);
    const secondHalf = sorted.slice(midpoint);

    const avgFirst = firstHalf.reduce((sum, t) => sum + t.transactionAmount, 0) / firstHalf.length;
    const avgSecond = secondHalf.reduce((sum, t) => sum + t.transactionAmount, 0) / secondHalf.length;

    const change = ((avgSecond - avgFirst) / avgFirst) * 100;

    let direction: 'rising' | 'stable' | 'falling';
    if (change > 2) direction = 'rising';
    else if (change < -2) direction = 'falling';
    else direction = 'stable';

    return {
      direction,
      percentage: Math.abs(change)
    };
  }

  private determineConfidence(transactions: MolitTransaction[]): 'high' | 'medium' | 'low' {
    // More recent transactions = higher confidence
    const now = new Date();
    const recent = transactions.filter(t => {
      const transactionDate = new Date(t.year, t.month - 1, t.day);
      const daysAgo = (now.getTime() - transactionDate.getTime()) / (1000 * 60 * 60 * 24);
      return daysAgo < 90; // Last 3 months
    });

    if (recent.length >= 3) return 'high';
    if (recent.length >= 1) return 'medium';
    return 'low';
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
