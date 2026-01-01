/**
 * POST /api/wolse/save
 *
 * Saves a wolse analysis result to the database after payment/unlock.
 * Called after user pays or uses free beta.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/supabase';
import { analysisService } from '@/lib/services/analysis-service';
import { WolseAnalysisResult } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { result, inputData, paymentKey, paymentAmount, analysisId: existingAnalysisId } = body;

    if (!result || !inputData) {
      return NextResponse.json(
        { error: 'Missing result or inputData' },
        { status: 400 }
      );
    }

    // Get user if authenticated (optional)
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Database not available' },
        { status: 500 }
      );
    }

    const {
      city,
      district,
      dong,
      apartmentName,
      exclusiveArea
    } = inputData;

    // Create or find property
    let propertyId = '';
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

    // Use existing analysisId or create new one
    let analysisId: string;

    if (existingAnalysisId) {
      // Use existing analysis ID (from unified flow)
      analysisId = existingAnalysisId;
      console.log(`Using existing analysis ID: ${analysisId}`);
    } else {
      // Create new analysis record
      analysisId = await analysisService.createAnalysis(
        'wolse_price',
        propertyId,
        user?.id
      );
    }

    // Update payment info in analyses table
    await supabaseAdmin
      .from('analyses')
      .upsert({
        id: analysisId,
        type: 'wolse_price',
        property_id: propertyId,
        user_id: user?.id,
        payment_status: paymentKey ? 'approved' : 'free-beta',
        payment_key: paymentKey || 'free-beta',
        payment_amount: paymentAmount || 0,
        status: 'processing',
        created_at: new Date().toISOString()
      });

    // Save wolse price data
    await analysisService.saveWolsePriceData(analysisId, {
      userDeposit: result.userDeposit,
      userMonthlyRent: result.userMonthlyRent,
      userImpliedRate: result.userImpliedRate,
      expectedRent: result.expectedRent,
      rentDifference: result.rentDifference,
      rentDifferencePercent: result.rentDifferencePercent,
      cleanTransactionCount: result.cleanTransactionCount,
      outliersRemoved: result.outliersRemoved,
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

    // Update result with saved IDs
    const savedResult: WolseAnalysisResult = {
      ...result,
      id: analysisId,
      propertyId,
      userId: user?.id
    };

    console.log('✅ Wolse Analysis Saved');
    console.log(`   Analysis ID: ${analysisId}`);
    console.log(`   Payment: ${paymentKey ? 'Paid' : 'Free Beta'}`);

    return NextResponse.json({
      success: true,
      analysisId,
      result: savedResult
    });

  } catch (error) {
    console.error('Wolse save error:', error);
    return NextResponse.json(
      { error: 'Failed to save analysis' },
      { status: 500 }
    );
  }
}
