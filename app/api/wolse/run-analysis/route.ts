/**
 * POST /api/wolse/run-analysis
 *
 * Runs the wolse analysis after payment has been verified.
 * Called from the payment success page.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/supabase';
import { WolsePriceAnalyzer } from '@/lib/analyzers/wolse-price-analyzer';
import { wolseCacheService } from '@/lib/services/wolse-cache';
import { analysisService } from '@/lib/services/analysis-service';
import type { BuildingType } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { analysisId, inputData } = body;

    if (!analysisId) {
      return NextResponse.json(
        { error: 'Missing analysisId' },
        { status: 400 }
      );
    }

    if (!inputData) {
      return NextResponse.json(
        { error: 'Missing inputData' },
        { status: 400 }
      );
    }

    // Verify user is authenticated
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Database not available' },
        { status: 500 }
      );
    }

    // Get the analysis record with metadata
    const { data: analysis, error: analysisError } = await supabaseAdmin
      .from('analyses')
      .select('*')
      .eq('id', analysisId)
      .single();

    if (analysisError || !analysis) {
      return NextResponse.json(
        { error: 'Analysis not found' },
        { status: 404 }
      );
    }

    // Verify ownership
    if (analysis.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized - analysis does not belong to user' },
        { status: 403 }
      );
    }

    // Check if already processed
    if (analysis.status === 'completed') {
      return NextResponse.json({
        success: true,
        message: 'Analysis already completed'
      });
    }

    // Use input data from request body
    const {
      city,
      district,
      dong,
      apartmentName = '', // Optional for multifamily
      exclusiveArea,
      deposit,
      monthlyRent,
      buildingType: rawBuildingType = 'apartment' as BuildingType,
      selectedTier,
      targetBuildingYear
    } = inputData;

    // Infer 'multifamily' when no building name is provided
    let buildingType: BuildingType = rawBuildingType;
    if (buildingType === 'apartment' && !apartmentName) {
      buildingType = 'multifamily';
      console.log('[wolse/run-analysis] Inferred buildingType: multifamily (no apartmentName)');
    }

    // Update status to processing
    await supabaseAdmin
      .from('analyses')
      .update({ status: 'processing' })
      .eq('id', analysisId);

    // Get API key
    const apiKey = process.env.MOLIT_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'MOLIT API key not configured' },
        { status: 500 }
      );
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 WOLSE ANALYSIS (After Paid Payment)');
    console.log('='.repeat(60));
    console.log(`   Analysis ID: ${analysisId}`);
    console.log(`   Location: ${city} ${district} ${dong}`);
    console.log(`   Building: ${apartmentName || '(multifamily - dong level)'}`);
    console.log(`   Building Type: ${buildingType}`);
    console.log('='.repeat(60));

    // Run wolse analysis
    const analyzer = new WolsePriceAnalyzer(apiKey);
    const result = await analyzer.analyzeQuote(
      city,
      district,
      dong,
      apartmentName,
      exclusiveArea,
      { deposit, monthlyRent },
      buildingType,
      selectedTier,
      targetBuildingYear
    );

    // Set property ID in result
    result.propertyId = analysis.property_id;
    result.id = analysisId;

    // Cache the market rate data
    await wolseCacheService.cacheMarketRate(
      city,
      district,
      apartmentName,
      exclusiveArea,
      {
        marketRate: result.marketRate,
        rate25thPercentile: result.marketRateRange.low,
        rate75thPercentile: result.marketRateRange.high,
        confidenceLevel: result.confidenceLevel,
        contractCount: result.contractCount,
        trend: {
          direction: result.trend.direction,
          percentage: result.trend.percentage
        }
      }
    );

    // Save wolse price data
    await analysisService.saveWolsePriceData(analysisId, {
      userDeposit: result.userDeposit,
      userMonthlyRent: result.userMonthlyRent,
      userImpliedRate: result.userImpliedRate,
      // New rent comparison fields
      expectedRent: result.expectedRent,
      rentDifference: result.rentDifference,
      rentDifferencePercent: result.rentDifferencePercent,
      cleanTransactionCount: result.cleanTransactionCount,
      outliersRemoved: result.outliersRemoved,
      // Market analysis
      marketRate: result.marketRate,
      marketRateLow: result.marketRateRange.low,
      marketRateHigh: result.marketRateRange.high,
      legalRate: result.legalRate,
      confidenceLevel: result.confidenceLevel,
      contractCount: result.contractCount,
      assessment: result.assessment,
      assessmentDetails: result.assessmentDetails,
      savingsVsMarket: result.savingsPotential.vsMarket,
      savingsVsLegal: result.savingsPotential.vsLegal,
      trendDirection: result.trend.direction,
      trendPercentage: result.trend.percentage,
      trendAdvice: result.trend.advice,
      negotiationOptions: result.negotiationOptions,
      recentTransactions: result.recentTransactions
    }, result.expiresAt);

    // Update status to completed
    await analysisService.updateStatus(analysisId, 'completed', new Date().toISOString());

    console.log('✅ Wolse Analysis Complete (Paid)');
    console.log(`   Assessment: ${result.assessment}`);

    return NextResponse.json({
      success: true,
      analysisId,
      result
    });

  } catch (error) {
    console.error('Wolse run-analysis error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
