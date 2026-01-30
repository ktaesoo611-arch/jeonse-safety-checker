/**
 * POST /api/wolse/analyze
 *
 * Analyzes a user's wolse (monthly rent) quote against market data
 *
 * Request Body:
 * - city: string (e.g., "서울특별시")
 * - district: string (e.g., "강남구")
 * - dong: string (e.g., "역삼동")
 * - apartmentName: string (e.g., "래미안역삼")
 * - exclusiveArea: number (in ㎡, e.g., 84.5)
 * - deposit: number (보증금 in won, e.g., 50000000)
 * - monthlyRent: number (월세 in won, e.g., 1500000)
 *
 * Response:
 * - WolseAnalysisResult with market rate, assessment, savings, and negotiation options
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/supabase';
import { WolsePriceAnalyzer } from '@/lib/analyzers/wolse-price-analyzer';
import { wolseCacheService } from '@/lib/services/wolse-cache';
import { analysisService } from '@/lib/services/analysis-service';
import type { WolseAnalysisRequest, BuildingType } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    // Get user if authenticated (optional for wolse)
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Parse request body
    const body = await request.json();

    // Extract buildingType (defaults to 'apartment' for backwards compatibility)
    // Infer 'multifamily' when no building name is provided — matches the detection
    // logic in documents/parse and preview page, ensuring tiered rent is computed
    // Note: 'officetel' is always explicitly detected, never inferred
    let buildingType: BuildingType = body.buildingType || 'apartment';
    if (buildingType === 'apartment' && !body.apartmentName) {
      buildingType = 'multifamily';
      console.log('[wolse/analyze] Inferred buildingType: multifamily (no apartmentName)');
    }

    // Validate required fields - apartmentName not required for multifamily
    const requiredFields = buildingType === 'multifamily'
      ? ['city', 'district', 'dong', 'exclusiveArea', 'deposit', 'monthlyRent']
      : ['city', 'district', 'dong', 'apartmentName', 'exclusiveArea', 'deposit', 'monthlyRent'];
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    const {
      city,
      district,
      dong,
      apartmentName = '', // Optional for multifamily
      exclusiveArea,
      deposit,
      monthlyRent,
      selectedTier,        // Optional: user's selected quality tier from Est. Value
      targetBuildingYear   // Optional: target property's building year
    } = body;

    // Validate numeric fields
    if (typeof exclusiveArea !== 'number' || exclusiveArea <= 0) {
      return NextResponse.json(
        { error: 'Invalid exclusiveArea: must be a positive number' },
        { status: 400 }
      );
    }

    if (typeof deposit !== 'number' || deposit <= 0) {
      return NextResponse.json(
        { error: 'Invalid deposit: must be a positive number' },
        { status: 400 }
      );
    }

    if (typeof monthlyRent !== 'number' || monthlyRent <= 0) {
      return NextResponse.json(
        { error: 'Invalid monthlyRent: must be a positive number' },
        { status: 400 }
      );
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 WOLSE ANALYSIS REQUEST');
    console.log('='.repeat(60));
    console.log(`   Location: ${city} ${district} ${dong}`);
    console.log(`   Building: ${apartmentName || '(multifamily - dong level)'}`);
    console.log(`   Building Type: ${buildingType}`);
    console.log(`   Area: ${exclusiveArea}㎡`);
    console.log(`   Deposit (raw): ${deposit} (type: ${typeof deposit})`);
    console.log(`   MonthlyRent (raw): ${monthlyRent} (type: ${typeof monthlyRent})`);
    console.log(`   Quote: ${(deposit / 10000).toLocaleString()}만원 보증금 / ${(monthlyRent / 10000).toLocaleString()}만원 월세`);
    console.log(`   Quote in 억: ${(deposit / 100000000).toFixed(2)}억원 / ${(monthlyRent / 10000).toFixed(0)}만원`);
    console.log('='.repeat(60));

    // Get API key from environment
    const apiKey = process.env.MOLIT_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'MOLIT API key not configured' },
        { status: 500 }
      );
    }

    // Create or find property
    let propertyId = '';
    if (supabaseAdmin) {
      const address = `${city} ${district} ${dong} ${apartmentName}`;

      // Try to find existing property
      const { data: existingProperty } = await supabaseAdmin
        .from('properties')
        .select('id')
        .eq('address', address)
        .maybeSingle();

      if (existingProperty) {
        propertyId = existingProperty.id;
      } else {
        // Create new property
        const { data: newProperty } = await supabaseAdmin
          .from('properties')
          .insert({
            address,
            city,
            district,
            dong,
            building_name: apartmentName,
            exclusive_area: exclusiveArea,
            created_at: new Date().toISOString()
          })
          .select('id')
          .single();

        if (newProperty) {
          propertyId = newProperty.id;
        }
      }
    }

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
      selectedTier,        // Pass user's selected tier for multifamily
      targetBuildingYear   // Pass building year for age filtering
    );

    // Set property ID in result
    result.propertyId = propertyId;

    // Cache the market rate data for future use
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

    // Save to new Option C schema (analyses + wolse_price_data)
    try {
      // Create base analysis record
      const analysisId = await analysisService.createAnalysis(
        'wolse_price',
        propertyId,
        user?.id
      );

      // Save wolse price data
      console.log(`📊 Saving wolse price data: contractCount=${result.contractCount}, recentTransactions.length=${result.recentTransactions?.length || 0}`);
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
        recentTransactions: result.recentTransactions,
        // Tiered expected rent for multifamily
        tieredExpectedRent: result.tieredExpectedRent,
        selectedTierExpectedRent: result.selectedTierExpectedRent,
        filteredTransactions: result.filteredTransactions
      }, result.expiresAt);
      console.log(`✅ Wolse price data saved with ${result.recentTransactions?.length || 0} transactions (${result.filteredTransactions?.length || 0} filtered)`);

      // Update status to completed
      await analysisService.updateStatus(analysisId, 'completed', new Date().toISOString());

      // Update result ID to match new analysis ID
      result.id = analysisId;

      console.log(`✅ Saved to new schema: analyses/${analysisId}`);
    } catch (saveError) {
      console.error('Failed to save to new schema, falling back to old schema:', saveError);
      // Fallback to old schema
      await wolseCacheService.saveAnalysisResult(result, user?.id);
    }

    console.log('\n✅ Wolse Analysis Complete');
    console.log(`   Assessment: ${result.assessment}`);
    console.log(`   User Rate: ${result.userImpliedRate.toFixed(2)}%`);
    console.log(`   Market Rate: ${result.marketRate.toFixed(2)}%`);

    return NextResponse.json(result, { status: 200 });

  } catch (error) {
    console.error('Wolse analysis error:', error);
    return NextResponse.json(
      {
        error: 'Failed to analyze wolse quote',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve past analysis
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const analysisId = searchParams.get('id');

    if (!analysisId) {
      return NextResponse.json(
        { error: 'Missing analysis ID' },
        { status: 400 }
      );
    }

    // Try new schema first
    const newResult = await analysisService.getWolsePriceFull(analysisId);
    if (newResult) {
      // Calculate expected rent from market rate if not stored
      // expectedRent = userMonthlyRent adjusted by market rate
      const userDeposit = newResult.user_deposit;
      const userMonthlyRent = newResult.user_monthly_rent;
      const marketRate = newResult.market_rate;

      // Use stored values or calculate fallbacks
      const expectedRent = newResult.expected_rent ?? userMonthlyRent;
      const rentDifference = newResult.rent_difference ?? 0;
      const rentDifferencePercent = newResult.rent_difference_percent ?? 0;

      // Convert to WolseAnalysisResult format
      const result = {
        id: newResult.id,
        propertyId: newResult.property_id,
        userId: newResult.user_id,
        userDeposit,
        userMonthlyRent,
        userImpliedRate: newResult.user_implied_rate,
        // New rent comparison fields
        expectedRent,
        rentDifference,
        rentDifferencePercent,
        marketRate,
        marketRateRange: {
          low: newResult.market_rate_low,
          high: newResult.market_rate_high
        },
        legalRate: newResult.legal_rate,
        confidenceLevel: newResult.confidence_level,
        contractCount: newResult.contract_count,
        cleanTransactionCount: newResult.clean_transaction_count,
        outliersRemoved: newResult.outliers_removed,
        assessment: newResult.assessment,
        assessmentDetails: newResult.assessment_details,
        savingsPotential: {
          vsMarket: newResult.savings_vs_market,
          vsLegal: newResult.savings_vs_legal
        },
        trend: {
          direction: newResult.trend_direction,
          percentage: newResult.trend_percentage,
          advice: newResult.trend_advice
        },
        negotiationOptions: newResult.negotiation_options,
        recentTransactions: newResult.recent_transactions,
        // Tiered expected rent for multifamily
        tieredExpectedRent: newResult.tiered_expected_rent,
        selectedTierExpectedRent: newResult.selected_tier_expected_rent,
        filteredTransactions: newResult.filtered_transactions,
        createdAt: newResult.created_at,
        expiresAt: newResult.expires_at
      };
      return NextResponse.json(result, { status: 200 });
    }

    // Fallback to old schema
    const oldResult = await wolseCacheService.getAnalysisResult(analysisId);
    if (!oldResult) {
      return NextResponse.json(
        { error: 'Analysis not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(oldResult, { status: 200 });

  } catch (error) {
    console.error('Get analysis error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve analysis' },
      { status: 500 }
    );
  }
}

// OPTIONS handler for CORS preflight
export async function OPTIONS() {
  return NextResponse.json(
    {},
    {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    }
  );
}
