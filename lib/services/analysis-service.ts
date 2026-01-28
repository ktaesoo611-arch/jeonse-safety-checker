/**
 * Unified Analysis Service
 *
 * Handles all analysis types using the Option C (Base + Extension) schema.
 */

import { supabaseAdmin } from '../supabase';
import {
  AnalysisType,
  AnalysisStatus,
  Analysis,
  AnalysisBase,
  JeonseSafetyAnalysis,
  JeonseSafetyData,
  WolsePriceAnalysis,
  WolsePriceData,
  WolseSafetyAnalysis,
  WolseSafetyData,
  AnalysisDashboardItem,
  dbRowToAnalysisBase,
  dbRowToJeonseSafetyData,
  dbRowToWolsePriceData,
  dbRowToWolseSafetyData,
  dbRowToDashboardItem
} from '../types/analysis';

export class AnalysisService {
  /**
   * Create a new analysis (base record only)
   */
  async createAnalysis(
    type: AnalysisType,
    propertyId: string,
    userId?: string | null
  ): Promise<string> {
    if (!supabaseAdmin) {
      throw new Error('Supabase admin client not available');
    }

    const { data, error } = await supabaseAdmin
      .from('analyses')
      .insert({
        type,
        property_id: propertyId,
        user_id: userId || null,
        status: 'pending'
      })
      .select('id')
      .single();

    if (error) {
      console.error('Create analysis error:', error);
      throw new Error(`Failed to create analysis: ${error.message}`);
    }

    return data.id;
  }

  /**
   * Update analysis status
   */
  async updateStatus(
    analysisId: string,
    status: AnalysisStatus,
    completedAt?: string
  ): Promise<void> {
    if (!supabaseAdmin) return;

    const updateData: any = { status };
    if (completedAt) {
      updateData.completed_at = completedAt;
    }

    const { error } = await supabaseAdmin
      .from('analyses')
      .update(updateData)
      .eq('id', analysisId);

    if (error) {
      console.error('Update status error:', error);
    }
  }

  /**
   * Save jeonse safety data
   */
  async saveJeonseSafetyData(
    analysisId: string,
    data: JeonseSafetyData
  ): Promise<void> {
    if (!supabaseAdmin) return;

    const { error } = await supabaseAdmin
      .from('jeonse_safety_data')
      .upsert({
        analysis_id: analysisId,
        proposed_jeonse: data.proposedJeonse,
        safety_score: data.safetyScore,
        risk_level: data.riskLevel,
        deunggibu_data: data.deunggibuData,
        valuation_data: data.valuationData,
        risks: data.risks,
        recommendations: data.recommendations,
        ltv_ratio: data.ltvRatio,
        ltv_score: data.ltvScore,
        debt_score: data.debtScore,
        legal_score: data.legalScore,
        market_score: data.marketScore,
        building_score: data.buildingScore
      });

    if (error) {
      console.error('Save jeonse safety data error:', error);
      throw new Error(`Failed to save jeonse safety data: ${error.message}`);
    }
  }

  /**
   * Save wolse price data
   */
  async saveWolsePriceData(
    analysisId: string,
    data: WolsePriceData,
    expiresAt?: string
  ): Promise<void> {
    if (!supabaseAdmin) return;

    // Update expires_at in base table
    if (expiresAt) {
      await supabaseAdmin
        .from('analyses')
        .update({ expires_at: expiresAt })
        .eq('id', analysisId);
    }

    const { error } = await supabaseAdmin
      .from('wolse_price_data')
      .upsert({
        analysis_id: analysisId,
        user_deposit: data.userDeposit,
        user_monthly_rent: data.userMonthlyRent,
        user_implied_rate: data.userImpliedRate,
        // New rent comparison fields
        expected_rent: data.expectedRent,
        rent_difference: data.rentDifference,
        rent_difference_percent: data.rentDifferencePercent,
        clean_transaction_count: data.cleanTransactionCount,
        outliers_removed: data.outliersRemoved,
        // Market analysis
        market_rate: data.marketRate,
        market_rate_low: data.marketRateLow,
        market_rate_high: data.marketRateHigh,
        legal_rate: data.legalRate,
        confidence_level: data.confidenceLevel,
        contract_count: data.contractCount,
        assessment: data.assessment,
        assessment_details: data.assessmentDetails,
        savings_vs_market: data.savingsVsMarket,
        savings_vs_legal: data.savingsVsLegal,
        trend_direction: data.trendDirection,
        trend_percentage: data.trendPercentage,
        trend_advice: data.trendAdvice,
        negotiation_options: data.negotiationOptions,
        recent_transactions: data.recentTransactions,
        // Tiered expected rent for multifamily
        tiered_expected_rent: data.tieredExpectedRent,
        selected_tier_expected_rent: data.selectedTierExpectedRent
      });

    if (error) {
      console.error('Save wolse price data error:', error);
      throw new Error(`Failed to save wolse price data: ${error.message}`);
    }
  }

  /**
   * Save wolse safety data (for future use)
   */
  async saveWolseSafetyData(
    analysisId: string,
    data: WolseSafetyData
  ): Promise<void> {
    if (!supabaseAdmin) return;

    const { error } = await supabaseAdmin
      .from('wolse_safety_data')
      .upsert({
        analysis_id: analysisId,
        deposit: data.deposit,
        monthly_rent: data.monthlyRent,
        safety_score: data.safetyScore,
        risk_level: data.riskLevel,
        deunggibu_data: data.deunggibuData,
        valuation_data: data.valuationData,
        risks: data.risks,
        recommendations: data.recommendations,
        ltv_ratio: data.ltvRatio,
        deposit_safety_ratio: data.depositSafetyRatio
      });

    if (error) {
      console.error('Save wolse safety data error:', error);
      throw new Error(`Failed to save wolse safety data: ${error.message}`);
    }
  }

  /**
   * Get analysis by ID (with type-specific data)
   */
  async getAnalysis(analysisId: string): Promise<Analysis | null> {
    if (!supabaseAdmin) return null;

    // Get base analysis
    const { data: base, error: baseError } = await supabaseAdmin
      .from('analyses')
      .select('*')
      .eq('id', analysisId)
      .single();

    if (baseError || !base) {
      console.error('Get analysis error:', baseError);
      return null;
    }

    const analysisBase = dbRowToAnalysisBase(base);

    // Get extension data based on type
    switch (base.type as AnalysisType) {
      case 'jeonse_safety': {
        const { data: jsData } = await supabaseAdmin
          .from('jeonse_safety_data')
          .select('*')
          .eq('analysis_id', analysisId)
          .single();

        if (!jsData) return null;

        return {
          ...analysisBase,
          type: 'jeonse_safety',
          data: dbRowToJeonseSafetyData(jsData)
        } as JeonseSafetyAnalysis;
      }

      case 'wolse_price': {
        const { data: wpData } = await supabaseAdmin
          .from('wolse_price_data')
          .select('*')
          .eq('analysis_id', analysisId)
          .single();

        if (!wpData) return null;

        return {
          ...analysisBase,
          type: 'wolse_price',
          data: dbRowToWolsePriceData(wpData)
        } as WolsePriceAnalysis;
      }

      case 'wolse_safety': {
        const { data: wsData } = await supabaseAdmin
          .from('wolse_safety_data')
          .select('*')
          .eq('analysis_id', analysisId)
          .single();

        if (!wsData) return null;

        return {
          ...analysisBase,
          type: 'wolse_safety',
          data: dbRowToWolseSafetyData(wsData)
        } as WolseSafetyAnalysis;
      }

      default:
        return null;
    }
  }

  /**
   * Get user's analyses (dashboard view)
   */
  async getUserAnalyses(userId: string): Promise<AnalysisDashboardItem[]> {
    if (!supabaseAdmin) return [];

    const { data, error } = await supabaseAdmin
      .from('user_analyses_dashboard')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Get user analyses error:', error);
      return [];
    }

    return (data || []).map(dbRowToDashboardItem);
  }

  /**
   * Get jeonse safety analysis using the full view
   */
  async getJeonseSafetyFull(analysisId: string): Promise<any | null> {
    if (!supabaseAdmin) return null;

    const { data, error } = await supabaseAdmin
      .from('jeonse_safety_full')
      .select('*')
      .eq('id', analysisId)
      .single();

    if (error) {
      console.error('Get jeonse safety full error:', error);
      return null;
    }

    return data;
  }

  /**
   * Get wolse price analysis using the full view
   */
  async getWolsePriceFull(analysisId: string): Promise<any | null> {
    if (!supabaseAdmin) return null;

    const { data, error } = await supabaseAdmin
      .from('wolse_price_full')
      .select('*')
      .eq('id', analysisId)
      .single();

    if (error) {
      console.error('Get wolse price full error:', error);
      return null;
    }

    return data;
  }

  /**
   * Update payment info
   */
  async updatePayment(
    analysisId: string,
    paymentAmount: number,
    paymentStatus: string,
    paymentKey?: string
  ): Promise<void> {
    if (!supabaseAdmin) return;

    const { error } = await supabaseAdmin
      .from('analyses')
      .update({
        payment_amount: paymentAmount,
        payment_status: paymentStatus,
        payment_key: paymentKey
      })
      .eq('id', analysisId);

    if (error) {
      console.error('Update payment error:', error);
    }
  }
}

// Export singleton instance
export const analysisService = new AnalysisService();
