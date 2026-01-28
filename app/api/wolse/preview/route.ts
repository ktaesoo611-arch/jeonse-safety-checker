/**
 * POST /api/wolse/preview
 *
 * Runs wolse analysis and returns results WITHOUT saving to database.
 * Used for the preview flow where users see blurred results before payment.
 */

import { NextRequest, NextResponse } from 'next/server';
import { WolsePriceAnalyzer } from '@/lib/analyzers/wolse-price-analyzer';
import { wolseCacheService } from '@/lib/services/wolse-cache';
import type { BuildingType } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();

    // Extract buildingType (defaults to 'apartment' for backwards compatibility)
    const buildingType = body.buildingType || 'apartment';

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
      selectedTier,
      targetBuildingYear
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
    console.log('📊 WOLSE PREVIEW REQUEST (No DB Save)');
    console.log('='.repeat(60));
    console.log(`   Location: ${city} ${district} ${dong}`);
    console.log(`   Building: ${apartmentName || '(multifamily - dong level)'}`);
    console.log(`   Building Type: ${buildingType}`);
    console.log(`   Area: ${exclusiveArea}㎡`);
    console.log(`   Quote: ${(deposit / 10000).toLocaleString()}만원 보증금 / ${(monthlyRent / 10000).toLocaleString()}만원 월세`);
    console.log('='.repeat(60));

    // Get API key from environment
    const apiKey = process.env.MOLIT_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'MOLIT API key not configured' },
        { status: 500 }
      );
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
      selectedTier,
      targetBuildingYear
    );

    // Cache the market rate data for future use (this is just caching, not saving analysis)
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

    console.log('\n✅ Wolse Preview Complete (NOT saved to DB)');
    console.log(`   Assessment: ${result.assessment}`);
    console.log(`   Expected Rent: ${(result.expectedRent / 10000).toLocaleString()}만원`);
    console.log(`   Market Rate: ${result.marketRate.toFixed(2)}%`);
    console.log(`   IQR Applied: ${result.outliersRemoved} outliers removed from ${result.contractCount} transactions → ${result.cleanTransactionCount} clean`);

    // Return result with input data for later saving
    return NextResponse.json({
      success: true,
      result,
      inputData: {
        city,
        district,
        dong,
        apartmentName,
        exclusiveArea,
        deposit,
        monthlyRent,
        buildingType
      }
    }, { status: 200 });

  } catch (error) {
    console.error('Wolse preview error:', error);
    return NextResponse.json(
      {
        error: 'Failed to analyze wolse quote',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
