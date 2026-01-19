/**
 * POST /api/documents/parse
 *
 * Parses uploaded documents using OCR and extracts structured data
 *
 * Request Body:
 * - documentId: string (UUID)
 *
 * Response:
 * - documentId: string
 * - parsedData: object (extracted data structure)
 * - parsedAt: string (ISO timestamp)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase-server';
import { promises as fs } from 'fs';
import { ocrService } from '@/lib/services/ocr-service';
import { DeunggibuParser } from '@/lib/analyzers/deunggibu-parser';
import { BuildingLedgerParser } from '@/lib/analyzers/building-ledger-parser';
import { RiskAnalyzer } from '@/lib/analyzers/risk-analyzer';
import { MolitAPI, getDistrictCode } from '@/lib/apis/molit';
import { parseFromTables } from '@/lib/analyzers/table-parser';
import { LLMParser } from '@/lib/services/llm-parser';
import { PropertyValuationEngine } from '@/lib/analyzers/property-valuation';
import { PropertyDetails, ValuationResult, BuildingType } from '@/lib/types';
import { analysisService } from '@/lib/services/analysis-service';
import { buildingRegistryAPI } from '@/lib/apis/building-registry';
import { parseKoreanAddress } from '@/lib/utils/address-parser';

// Module-level supabase client (service role for bypassing RLS)
const supabase = createServiceRoleClient();

interface ParseDocumentRequest {
  documentId: string;
}

/**
 * Fetch property valuation using PropertyValuationEngine with linear regression
 *
 * Uses the updated methodology:
 * - Linear regression for market trend detection
 * - R-squared for statistical confidence
 * - Multi-factor confidence calculation
 * - 12 months of MOLIT data
 */
async function fetchPropertyValuation(
  address: string,
  buildingName: string | undefined,
  area: number,
  floor?: number,
  buildingType: BuildingType = 'apartment' // Default for backwards compatibility
): Promise<ValuationResult | null> {
  try {
    console.log('🏠 Fetching property valuation using PropertyValuationEngine...');
    console.log('   Address:', address);
    console.log('   Building:', buildingName);
    console.log('   Building Type:', buildingType);
    console.log('   Area:', area);

    // Parse address to extract city, district, dong
    // Supports both Seoul (서울특별시) and Gyeonggi (경기도)
    const seoulMatch = address.match(/(서울특별시|서울)\s+([가-힣]+구)\s*([가-힣0-9]+동)?/);
    const gyeonggiMatch = address.match(/(경기도|경기)\s+([가-힣]+시)\s*([가-힣]+구)?\s*([가-힣0-9]+동)?/);

    const addressMatch = seoulMatch || gyeonggiMatch;
    if (!addressMatch) {
      console.warn('Could not parse city/district from address:', address);
      return null;
    }

    let city: string;
    let district: string;
    let dong: string;

    if (seoulMatch) {
      city = seoulMatch[1] === '서울' ? '서울특별시' : seoulMatch[1];
      district = seoulMatch[2]; // e.g., 강남구
      dong = seoulMatch[3] || '';
    } else {
      city = gyeonggiMatch![1] === '경기' ? '경기도' : gyeonggiMatch![1];
      // Gyeonggi format: 경기도 성남시 분당구 정자동 or 경기도 하남시 미사동
      const cityName = gyeonggiMatch![2]; // e.g., 성남시, 하남시
      const guName = gyeonggiMatch![3]; // e.g., 분당구 (optional)
      district = guName ? `${cityName} ${guName}` : cityName; // e.g., 성남시 분당구 or 하남시
      dong = gyeonggiMatch![4] || gyeonggiMatch![3] || ''; // dong if captured, or gu as fallback
    }

    console.log('   Parsed location:', { city, district, dong });

    // Build PropertyDetails object
    const propertyDetails: PropertyDetails = {
      address,
      city,
      district,
      dong,
      buildingName: buildingName || '',
      buildingNumber: '',
      floor: floor || 5, // Default to mid-floor if not specified
      unit: '',
      exclusiveArea: area || 0
    };

    // Check if we have required fields
    // For multifamily, building name is optional (we use dong-level matching)
    if (!propertyDetails.exclusiveArea) {
      console.warn('Missing exclusive area for valuation');
      return null;
    }
    // If apartment but no building name, fall back to multifamily (dong-level matching)
    // This handles cases where building type detection failed or building name wasn't provided
    if (buildingType === 'apartment' && !propertyDetails.buildingName) {
      console.warn('Missing building name for apartment valuation, falling back to multifamily (dong-level)');
      buildingType = 'multifamily';
    }

    // Initialize PropertyValuationEngine with MOLIT API key
    const valuationEngine = new PropertyValuationEngine(process.env.MOLIT_API_KEY!);

    // Calculate property value using regression-based methodology
    // Routes to correct MOLIT endpoint based on building type
    const valuation = await valuationEngine.calculatePropertyValue(propertyDetails, buildingType);

    console.log('✅ Valuation complete:', {
      valueMid: valuation.valueMid,
      confidence: `${(valuation.confidence * 100).toFixed(1)}%`,
      trend: valuation.trend,
      trendPercentage: `${valuation.trendPercentage.toFixed(1)}%`
    });

    return valuation;
  } catch (error) {
    console.error('Error fetching property valuation:', error);
    return null;
  }
}

/**
 * Perform real OCR and risk analysis
 */
async function performRealAnalysis(
  buffer: Buffer,
  analysisId: string,
  proposedJeonse: number,
  address: string
) {
  try {
    console.log('Starting OCR extraction...');

    // Step 1: Extract STRUCTURED document from PDF using Document AI
    console.log('🔍 Extracting structured document data (text + tables)...');
    const document = await ocrService.extractStructuredDocument(buffer);

    if (!document || !document.text || document.text.length < 50) {
      console.warn('OCR returned minimal text, falling back to mock analysis');
      return generateMockRiskAnalysis(analysisId, proposedJeonse, address);
    }

    console.log(`✅ Document AI extraction complete: ${document.text.length} characters`);

    // Step 2: TRY LLM-BASED PARSING FIRST (most accurate, handles OCR corruption)
    let deunggibuData: any;
    let parsingMethod: string;

    try {
      console.log('🤖 Attempting LLM-based parsing with Claude...');
      const llmParser = new LLMParser();
      deunggibuData = await llmParser.parseDeunggibu(document.text || '');

      console.log(`✅ Using LLM-based parsing (confidence: ${(deunggibuData.confidence * 100).toFixed(1)}%)`);
      console.log(`   - Mortgages found: ${deunggibuData.mortgages.length}`);
      console.log(`   - Jeonse rights found: ${deunggibuData.jeonseRights.length}`);
      console.log(`   - Liens found: ${deunggibuData.liens.length}`);
      console.log(`   - Building year extracted: ${deunggibuData.buildingYear || 'not found'}`);

      parsingMethod = 'llm';
    } catch (llmError) {
      // Fall back to regex-based text parsing if LLM fails
      console.error('⚠️  LLM parsing failed, falling back to regex text parsing:', llmError);
      parsingMethod = 'text';

      const parser = new DeunggibuParser();
      deunggibuData = parser.parse(document.text || '');
      deunggibuData.parsingMethod = 'text';
      deunggibuData.confidence = 0.7; // Lower confidence for regex parsing
    }

    const ocrText = document.text;

    console.log('Parsed deunggibu data:', {
      parsingMethod: deunggibuData.parsingMethod,
      mortgages: deunggibuData.mortgages.length,
      jeonseRights: deunggibuData.jeonseRights?.length || 0,
      liens: deunggibuData.liens?.length || 0,
      totalMortgageAmount: deunggibuData.totalMortgageAmount,
      totalEstimatedPrincipal: deunggibuData.totalEstimatedPrincipal,
      confidence: deunggibuData.confidence ? `${(deunggibuData.confidence * 100).toFixed(1)}%` : 'N/A'
    });

    // Step 2.5: Fetch user-provided building name from properties table
    console.log('Fetching property data for analysis:', analysisId);
    const { data: analysis, error: analysisError } = await supabase
      .from('analysis_results')
      .select('property_id')
      .eq('id', analysisId)
      .single();

    console.log('Analysis data:', { property_id: analysis?.property_id, error: analysisError });

    let userProvidedBuildingName: string | undefined;
    let userProvidedAddress: string | undefined;
    if (analysis?.property_id) {
      const { data: property, error: propertyError } = await supabase
        .from('properties')
        .select('building_name, address')
        .eq('id', analysis.property_id)
        .single();

      console.log('Property data:', {
        building_name: property?.building_name,
        address: property?.address,
        error: propertyError
      });

      userProvidedBuildingName = property?.building_name;
      userProvidedAddress = property?.address;
      console.log('User-provided from Step 1:', {
        buildingName: userProvidedBuildingName,
        address: userProvidedAddress
      });
    } else {
      console.log('No property_id found in analysis');
    }

    // Step 3: Fetch property value from MOLIT API
    console.log('Fetching property valuation from MOLIT API...');
    // Use user-provided data if available, fallback to OCR-extracted data
    const buildingNameForValuation = userProvidedBuildingName || deunggibuData.buildingName;
    const addressForValuation = userProvidedAddress || deunggibuData.address;
    console.log('Data for MOLIT API:', {
      buildingName: buildingNameForValuation,
      address: addressForValuation,
      area: deunggibuData.area
    });

    // Step 3.5: Detect building type using Building Registry API
    // This is crucial for correctly querying jeonse transactions (apartment vs multifamily)
    let detectedBuildingType: BuildingType = 'apartment'; // Default
    try {
      const addressComponents = parseKoreanAddress(addressForValuation);
      if (addressComponents) {
        console.log('🏠 Detecting building type for:', addressForValuation);
        console.log('   Address components:', addressComponents);
        const rawBuildingType = await buildingRegistryAPI.detectBuildingType(
          addressComponents.sigunguCd,
          addressComponents.bjdongCd,
          addressComponents.bun,
          addressComponents.ji
        );
        // Handle 'unknown' by defaulting to 'apartment'
        detectedBuildingType = rawBuildingType === 'unknown' ? 'apartment' : rawBuildingType;
        console.log(`   ✅ Detected building type: ${detectedBuildingType}${rawBuildingType === 'unknown' ? ' (defaulted from unknown)' : ''}`);
      } else {
        console.log('⚠️ Could not parse address for building type detection, defaulting to apartment');
      }
    } catch (error) {
      console.error('⚠️ Building type detection failed, defaulting to apartment:', error);
    }

    const molitValuation = await fetchPropertyValuation(
      addressForValuation,
      buildingNameForValuation,
      deunggibuData.area,
      undefined, // floor
      detectedBuildingType
    );

    // If MOLIT data is available, use it; otherwise fall back to estimation
    let estimatedValue: number;
    let valuation: any;

    if (molitValuation && molitValuation.valueMid > 0) {
      console.log('Using MOLIT API valuation (PropertyValuationEngine):', molitValuation.valueMid);
      console.log('   Confidence:', `${(molitValuation.confidence * 100).toFixed(1)}%`);
      console.log('   Market trend:', molitValuation.trend, `(${molitValuation.trendPercentage.toFixed(1)}%)`);
      estimatedValue = molitValuation.valueMid;
      valuation = {
        ...molitValuation,
        marketTrend: molitValuation.trend // Keep for backward compatibility
      };
    } else {
      console.log('MOLIT data unavailable, using jeonse ratio estimation');
      estimatedValue = Math.round(proposedJeonse / 0.70);
      valuation = {
        valueLow: Math.round(estimatedValue * 0.9),
        valueMid: estimatedValue,
        valueHigh: Math.round(estimatedValue * 1.1),
        confidence: 0.5,
        trend: 'stable' as const,
        trendPercentage: 0,
        marketTrend: 'stable' as const, // Keep for backward compatibility
        recentSales: [],
        pricePerPyeong: 0,
        dataSources: []
      };
    }

    console.log('Final valuation:', valuation);

    // Step 4: Determine region for small amount priority
    const region = address.includes('서울') ? '서울' :
                   address.includes('인천') || address.includes('경기') ? '수도권 과밀억제권역' :
                   '기타 지역';

    // Step 6: Run risk analysis
    const riskAnalyzer = new RiskAnalyzer();

    // Calculate building age from extracted year
    const currentYear = new Date().getFullYear();
    const buildingAge = deunggibuData.buildingYear
      ? currentYear - deunggibuData.buildingYear
      : 10; // Fallback to 10 if extraction fails

    console.log('Building year info:', {
      extractedYear: deunggibuData.buildingYear,
      currentYear,
      calculatedAge: buildingAge
    });

    // Step 5: Add user-provided address to deunggibuData (LLM parser doesn't populate this)
    if (!deunggibuData.address && address) {
      deunggibuData.address = address;
    }

    // Step 5.5: Augment boolean flags from liens array
    // IMPORTANT: Preserve LLM's flag detection (from summary section) and use OR logic
    // The LLM detects flags from "주요 등기사항 요약" summary, which is authoritative
    // Liens array provides additional detection in case LLM extraction missed entries
    if (deunggibuData.liens && Array.isArray(deunggibuData.liens)) {
      // Preserve existing LLM-detected flags (don't reset to false!)
      const llmHasAuction = deunggibuData.hasAuction === true;
      const llmHasSeizure = deunggibuData.hasSeizure === true;
      const llmHasProvisionalSeizure = deunggibuData.hasProvisionalSeizure === true;
      const llmHasProvisionalDisposition = deunggibuData.hasProvisionalDisposition === true;

      // Additional detection from liens array
      let liensHasAuction = false;
      let liensHasSeizure = false;
      let liensHasProvisionalSeizure = false;
      let liensHasProvisionalDisposition = false;

      deunggibuData.liens.forEach((lien: any) => {
        const lienType = lien.type?.toLowerCase() || '';
        if (lienType.includes('경매')) {
          liensHasAuction = true;
        }
        if (lienType.includes('압류') && !lienType.includes('가압류')) {
          liensHasSeizure = true;
        }
        if (lienType.includes('가압류')) {
          liensHasProvisionalSeizure = true;
        }
        if (lienType.includes('가처분')) {
          liensHasProvisionalDisposition = true;
        }
      });

      // Combine LLM detection with liens array detection (OR logic)
      deunggibuData.hasAuction = llmHasAuction || liensHasAuction;
      deunggibuData.hasSeizure = llmHasSeizure || liensHasSeizure;
      deunggibuData.hasProvisionalSeizure = llmHasProvisionalSeizure || liensHasProvisionalSeizure;
      deunggibuData.hasProvisionalDisposition = llmHasProvisionalDisposition || liensHasProvisionalDisposition;

      console.log('Legal flags (combined LLM + liens detection):', {
        hasAuction: deunggibuData.hasAuction,
        hasSeizure: deunggibuData.hasSeizure,
        hasProvisionalSeizure: deunggibuData.hasProvisionalSeizure,
        hasProvisionalDisposition: deunggibuData.hasProvisionalDisposition,
        sources: {
          llm: { hasAuction: llmHasAuction, hasSeizure: llmHasSeizure, hasProvisionalSeizure: llmHasProvisionalSeizure, hasProvisionalDisposition: llmHasProvisionalDisposition },
          liens: { hasAuction: liensHasAuction, hasSeizure: liensHasSeizure, hasProvisionalSeizure: liensHasProvisionalSeizure, hasProvisionalDisposition: liensHasProvisionalDisposition }
        },
        liensCount: deunggibuData.liens.length
      });
    }

    // Step 6: Perform risk analysis
    const riskAnalysis = riskAnalyzer.analyze(
      estimatedValue,
      proposedJeonse,
      deunggibuData,
      valuation,
      buildingAge
    );

    console.log('Risk analysis complete:', {
      overallScore: riskAnalysis.overallScore,
      riskLevel: riskAnalysis.riskLevel
    });

    console.log('DEBUG: Risk analysis fields being saved:', {
      ltv: riskAnalysis.ltv,
      totalDebt: riskAnalysis.totalDebt,
      availableEquity: riskAnalysis.availableEquity,
      debtRankingCount: riskAnalysis.debtRanking?.length
    });

    // Step 7: Update database with parsed document (shows 75% progress)
    await supabase
      .from('uploaded_documents')
      .update({
        ocr_text: ocrText,
        parsed_data: {
          ...deunggibuData,
          extractedAt: new Date().toISOString()
        }
      })
      .eq('analysis_id', analysisId);

    // Step 8: Delay to ensure frontend sees 75% state (2+ polls needed)
    await new Promise(resolve => setTimeout(resolve, 2500));

    // Step 9: Mark as completed WITHOUT results yet (shows 85% progress)
    await supabase
      .from('analysis_results')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('id', analysisId);

    // Step 10: Another delay for frontend to catch 85% state (2+ polls needed)
    await new Promise(resolve => setTimeout(resolve, 2500));

    // Step 11: Finally add the analysis results (shows 100% progress)
    // Serialize deunggibu data to ensure it saves properly
    const serializedDeunggibuData = deunggibuData ? JSON.parse(JSON.stringify(deunggibuData)) : null;

    const updateData = {
      safety_score: riskAnalysis.overallScore,
      risk_level: riskAnalysis.riskLevel,
      risks: riskAnalysis.risks,
      deunggibu_data: {
        ...riskAnalysis,
        deunggibu: serializedDeunggibuData,
        valuation
      }
    };

    console.log('📝 Attempting to save analysis results...');
    console.log('   Analysis ID:', analysisId);
    console.log('   Safety Score:', updateData.safety_score);
    console.log('   Risk Level:', updateData.risk_level);
    console.log('   Has deunggibu_data:', !!updateData.deunggibu_data);
    console.log('   deunggibu_data keys:', Object.keys(updateData.deunggibu_data));
    console.log('   Has deunggibu:', !!updateData.deunggibu_data.deunggibu);
    console.log('   Has valuation:', !!updateData.deunggibu_data.valuation);
    console.log('   Valuation data:', JSON.stringify(updateData.deunggibu_data.valuation));
    if (updateData.deunggibu_data.deunggibu) {
      console.log('   Deunggibu address:', updateData.deunggibu_data.deunggibu.address);
      console.log('   Deunggibu building:', updateData.deunggibu_data.deunggibu.buildingName);
    }

    // CRITICAL: Verify valuation is actually in the object before save
    if (!updateData.deunggibu_data.valuation || !updateData.deunggibu_data.valuation.valueMid) {
      console.error('❌ WARNING: Valuation is missing or invalid before database save!');
      console.error('   This will cause property value to show as N/A in the report');
    }

    const { data: updateResult, error: resultsError } = await supabase
      .from('analysis_results')
      .update(updateData)
      .eq('id', analysisId)
      .select();

    if (resultsError) {
      console.error('❌ CRITICAL: Failed to save analysis results to database:', resultsError);
      console.error('   Error code:', resultsError.code);
      console.error('   Error message:', resultsError.message);
      console.error('   Error details:', resultsError.details);
      throw new Error(`Failed to save analysis results: ${resultsError.message}`);
    }

    if (!updateResult || updateResult.length === 0) {
      console.error('❌ CRITICAL: Update returned no rows!');
      console.error('   This means no analysis with ID', analysisId, 'was found');
      throw new Error('Failed to save analysis results: No rows updated');
    }

    console.log('✅ Analysis results saved to old schema successfully');
    console.log('   Updated rows:', updateResult.length);
    console.log('   Verification - deunggibu_data is:', updateResult[0].deunggibu_data ? 'present' : 'NULL');

    // Also try to update new Option C schema (analyses + jeonse_safety_data)
    try {
      await analysisService.saveJeonseSafetyData(analysisId, {
        proposedJeonse: proposedJeonse,
        safetyScore: riskAnalysis.overallScore,
        riskLevel: riskAnalysis.riskLevel,
        deunggibuData: serializedDeunggibuData,
        valuationData: valuation,
        risks: riskAnalysis.risks,
        recommendations: riskAnalysis.recommendations,
        ltvRatio: riskAnalysis.ltv,
        ltvScore: riskAnalysis.ltvScore,
        debtScore: riskAnalysis.debtScore,
        legalScore: riskAnalysis.legalScore,
        marketScore: riskAnalysis.marketScore,
        buildingScore: riskAnalysis.buildingScore
      });

      await analysisService.updateStatus(analysisId, 'completed', new Date().toISOString());
      console.log(`✅ Also saved to new schema: jeonse_safety_data/${analysisId}`);
    } catch (newSchemaError) {
      // Not critical - old schema is the source of truth during migration
      console.warn('Could not save to new schema (non-critical):', newSchemaError);
    }

    return { success: true, ocrText, deunggibuData, riskAnalysis };

  } catch (error) {
    console.error('❌ CRITICAL: Error in performRealAnalysis - falling back to mock data');
    console.error('   Error type:', error instanceof Error ? error.constructor.name : typeof error);
    console.error('   Error message:', error instanceof Error ? error.message : String(error));
    if (error instanceof Error && error.stack) {
      console.error('   Stack trace:', error.stack);
    }
    console.error('   Analysis ID:', analysisId);
    console.error('   This error causes all property valuation and deunggibu data to be lost!');

    // Fall back to mock analysis if real analysis fails
    console.log('⚠️  Falling back to mock analysis...');
    return generateMockRiskAnalysis(analysisId, proposedJeonse, address);
  }
}

/**
 * Generate mock risk analysis (fallback)
 */
async function generateMockRiskAnalysis(
  analysisId: string,
  proposedJeonse: number,
  address: string
) {
  // Fetch analysis data
  const { data: analysis } = await supabase
    .from('analysis_results')
    .select('*, properties(*)')
    .eq('id', analysisId)
    .single();

  if (!analysis) return { success: false };

  // Mock property valuation (would come from MOLIT API in production)
  const estimatedValue = Math.round(proposedJeonse / 0.70); // Assume 70% jeonse ratio

  // Mock mortgage data
  const mockMortgageAmount = Math.round(estimatedValue * 0.15); // 15% LTV from mortgage

  // Calculate mock LTV
  const totalDebt = mockMortgageAmount;
  const totalExposure = totalDebt + proposedJeonse;
  const ltv = totalExposure / estimatedValue;

  // Determine if eligible for small amount priority
  const region = address.includes('서울') ? '서울' : '수도권 과밀억제권역';
  const smallAmountThreshold = region === '서울' ? 165000000 : 145000000;
  const smallAmountProtected = region === '서울' ? 55000000 : 48000000;
  const isSmallAmount = proposedJeonse <= smallAmountThreshold;

  // Calculate scores
  const ltvScore = ltv < 0.70 ? 80 : ltv < 0.80 ? 60 : 40;
  const debtScore = totalDebt / estimatedValue < 0.20 ? 90 : 80;
  const legalScore = 100; // No legal issues in mock
  const marketScore = 70; // Neutral market
  const buildingScore = 80; // Good condition

  const overallScore = Math.round(
    ltvScore * 0.30 +
    debtScore * 0.25 +
    legalScore * 0.25 +
    marketScore * 0.10 +
    buildingScore * 0.10
  );

  // Determine risk level
  let riskLevel = 'SAFE';
  if (overallScore < 60) riskLevel = 'MODERATE';
  if (overallScore < 40) riskLevel = 'HIGH';
  if (ltv > 0.90) riskLevel = 'CRITICAL';

  // Generate risk factors
  const risks: any[] = [];

  if (ltv > 0.70) {
    risks.push({
      type: 'elevated_ltv',
      severity: ltv > 0.80 ? 'HIGH' : 'MEDIUM',
      title: ltv > 0.80 ? 'High LTV Ratio' : 'Elevated LTV Ratio',
      description: `LTV is ${(ltv * 100).toFixed(1)}%. ${ltv > 0.80 ? 'Your deposit has limited protection in foreclosure.' : 'While acceptable, it\'s above the ideal 60% threshold.'}`,
      impact: ltv > 0.80 ? -40 : -20,
      category: 'debt'
    });
  }

  if (mockMortgageAmount > 0 && !isSmallAmount) {
    risks.push({
      type: 'senior_mortgage',
      severity: 'HIGH',
      title: 'Bank Mortgage Has Priority Over Your Deposit',
      description: `KB국민은행 has ₩${(mockMortgageAmount / 100000000).toFixed(1)}억 senior mortgage. In foreclosure, they get paid first. You do NOT qualify for 소액보증금 priority.`,
      impact: -30,
      category: 'priority'
    });
  }

  if (proposedJeonse / estimatedValue > 0.70) {
    risks.push({
      type: 'high_deposit_ratio',
      severity: 'MEDIUM',
      title: 'Deposit Ratio Above Recommended',
      description: `Your deposit is ${(proposedJeonse / estimatedValue * 100).toFixed(1)}% of property value. Recommended maximum is 70%.`,
      impact: -15,
      category: 'debt'
    });
  }

  // Generate recommendations
  const mandatory: string[] = [
    'Get 확정일자 AND residence registration SAME DAY as payment (Foreigners: 외국인등록/체류지변경신고, Overseas Koreans: 국내거소신고/거소이전신고)',
    'Move in physically same day (점유 required for 대항력)',
    'Verify all information in 등기부등본 is current (request copy dated within 1 week)'
  ];

  if (isSmallAmount) {
    mandatory.push(`You qualify for 소액보증금 (₩${(smallAmountProtected / 10000).toFixed(0)}만원 protected) - maintain this status!`);
  } else {
    mandatory.push('You do NOT have 소액보증금 protection - senior mortgages get paid first');
  }

  if (riskLevel === 'HIGH' || riskLevel === 'MODERATE') {
    mandatory.push('Apply for HUG jeonse insurance BEFORE signing');
  }

  const recommended: string[] = [
    'Get independent property appraisal (감정평가)',
    'Visit property multiple times at different hours',
    'Talk to current residents about owner payment history'
  ];

  if (mockMortgageAmount > 0) {
    recommended.push('Request owner to provide mortgage payment history (최근 납입내역서)');
    recommended.push('Check if mortgages are current (no late payments)');
  }

  const optional: string[] = [
    'Install CCTV evidence of 점유 (physical occupancy)',
    'Keep copies of all utility bills in your name',
    'Document move-in date with photos and witnesses'
  ];

  // Create comprehensive risk analysis object
  const riskAnalysis = {
    overallScore,
    riskLevel,
    verdict: riskLevel === 'SAFE'
      ? `SAFE TO PROCEED - Score: ${overallScore}/100. This property shows good fundamentals with manageable risk.`
      : riskLevel === 'MODERATE'
      ? `MODERATE RISK - Score: ${overallScore}/100. Can proceed with mandatory protections and careful monitoring.`
      : `HIGH RISK - Score: ${overallScore}/100. Significant concerns. Only proceed if you can accept substantial risk.`,

    ltv,
    totalDebt,
    availableEquity: estimatedValue - totalExposure,

    scores: {
      ltvScore,
      debtScore,
      legalScore,
      marketScore,
      buildingScore
    },

    smallAmountPriority: {
      isEligible: isSmallAmount,
      protectedAmount: isSmallAmount ? Math.min(proposedJeonse, smallAmountProtected) : 0,
      threshold: smallAmountThreshold,
      region,
      explanation: isSmallAmount
        ? `Your deposit (₩${(proposedJeonse / 10000).toFixed(0)}만원) qualifies for 소액보증금 우선변제 in ${region}. Up to ₩${(smallAmountProtected / 10000).toFixed(0)}만원 is protected with priority repayment even if senior mortgages exist. CRITICAL: Must get 확정일자 + residence registration + 점유 on SAME DAY. For foreigners: 외국인등록 or 체류지변경신고. For overseas Koreans: 국내거소신고 or 거소이전신고.`
        : `Your deposit (₩${(proposedJeonse / 10000).toFixed(0)}만원) EXCEEDS the 소액보증금 threshold (₩${(smallAmountThreshold / 10000).toFixed(0)}만원) for ${region}. You will NOT receive priority repayment protection. Senior mortgages will be paid first in foreclosure.`
    },

    risks,

    recommendations: {
      mandatory,
      recommended,
      optional
    },

    debtRanking: [
      {
        rank: 1,
        type: '근저당권 (Mortgage)',
        creditor: 'KB국민은행',
        amount: mockMortgageAmount,
        registrationDate: '2023-05-15',
        priority: 'senior'
      },
      {
        rank: 2,
        type: '보증금 (Your Deposit) - PROPOSED',
        creditor: 'You',
        amount: proposedJeonse,
        registrationDate: '미등록 (To be registered)',
        priority: 'subordinate'
      }
    ]
  };

  // First, update document with mock parsed data to trigger 75% progress
  const { data: document } = await supabase
    .from('uploaded_documents')
    .select('*')
    .eq('analysis_id', analysisId)
    .single();

  if (document) {
    await supabase
      .from('uploaded_documents')
      .update({
        parsed_data: {
          mockData: true,
          mortgageAmount: mockMortgageAmount,
          extractedAt: new Date().toISOString()
        }
      })
      .eq('id', document.id);
  }

  console.log('[MOCK] Document parsed, frontend should see 75% progress');

  // Delay to let frontend see 75% progress from document parsing (2+ polls)
  await new Promise(resolve => setTimeout(resolve, 2500));

  console.log('[MOCK] Setting status to completed (85% progress)');

  // Mark as completed (without results - shows 85% progress)
  await supabase
    .from('analysis_results')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString()
    })
    .eq('id', analysisId);

  // Add delay for smoother progress bar transitions (2+ polls for 85%)
  await new Promise(resolve => setTimeout(resolve, 2500));

  console.log('[MOCK] Adding results (100% progress)');

  // Now add the analysis results (shows 100% progress)
  const { error: resultsError } = await supabase
    .from('analysis_results')
    .update({
      safety_score: overallScore,
      risk_level: riskLevel,
      risks: risks,
      deunggibu_data: riskAnalysis
    })
    .eq('id', analysisId);

  if (resultsError) {
    console.error('❌ CRITICAL [MOCK]: Failed to save analysis results to database:', resultsError);
    throw new Error(`Failed to save mock analysis results: ${resultsError.message}`);
  } else {
    console.log('✅ [MOCK] Analysis results saved to old schema successfully');
  }

  // Also try to update new Option C schema (analyses + jeonse_safety_data)
  try {
    await analysisService.saveJeonseSafetyData(analysisId, {
      proposedJeonse: proposedJeonse,
      safetyScore: overallScore,
      riskLevel: riskLevel,
      deunggibuData: null, // Mock doesn't have real data
      valuationData: {
        valueLow: Math.round(estimatedValue * 0.9),
        valueMid: estimatedValue,
        valueHigh: Math.round(estimatedValue * 1.1)
      },
      risks: risks,
      recommendations: { mandatory, recommended, optional },
      ltvRatio: ltv,
      ltvScore: ltvScore,
      debtScore: debtScore,
      legalScore: legalScore,
      marketScore: marketScore,
      buildingScore: buildingScore
    });

    await analysisService.updateStatus(analysisId, 'completed', new Date().toISOString());
    console.log(`✅ [MOCK] Also saved to new schema: jeonse_safety_data/${analysisId}`);
  } catch (newSchemaError) {
    // Not critical - old schema is the source of truth during migration
    console.warn('[MOCK] Could not save to new schema (non-critical):', newSchemaError);
  }

  return { success: true, mock: true };
}

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body: ParseDocumentRequest = await request.json();

    // Validate required fields
    if (!body.documentId || typeof body.documentId !== 'string') {
      return NextResponse.json(
        { error: 'Invalid or missing documentId' },
        { status: 400 }
      );
    }

    // Fetch document from database
    const { data: document, error: documentError } = await supabase
      .from('uploaded_documents')
      .select('*')
      .eq('id', body.documentId)
      .single();

    if (documentError || !document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    // Check if already parsed
    if (document.parsed_data) {
      return NextResponse.json(
        {
          documentId: document.id,
          parsedData: document.parsed_data,
          parsedAt: document.created_at,
          message: 'Document already parsed',
        },
        { status: 200 }
      );
    }

    // Download document from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('documents')
      .download(document.file_path);

    if (downloadError || !fileData) {
      console.error('Storage download error:', downloadError);
      return NextResponse.json(
        { error: 'Failed to download document', details: downloadError?.message },
        { status: 500 }
      );
    }

    // Convert Blob to Buffer
    const arrayBuffer = await fileData.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let parsedData: any = null;

    // Parse based on document type
    if (document.document_type === 'deunggibu') {
      // Get analysis data for context
      const { data: analysis } = await supabase
        .from('analysis_results')
        .select('*, properties(*)')
        .eq('id', document.analysis_id)
        .single();

      if (!analysis) {
        return NextResponse.json(
          { error: 'Associated analysis not found' },
          { status: 404 }
        );
      }

      const proposedJeonse = analysis.proposed_jeonse;
      const address = analysis.properties?.address || '';

      // Perform real OCR and analysis
      // Note: performRealAnalysis() handles all database updates internally,
      // including saving parsed_data to uploaded_documents and risk analysis to analysis_results
      const result = await performRealAnalysis(buffer, document.analysis_id, proposedJeonse, address);

      // Don't overwrite the parsed_data - it was already saved inside performRealAnalysis
      // Just set a flag so we skip the update below
      parsedData = null; // Will skip the database update below

    } else if (document.document_type === 'building_ledger') {
      // Parse 건축물대장
      console.log('Parsing building ledger document...');

      const fileBuffer = await fs.readFile(document.file_path);
      const ocrText = await ocrService.extractTextFromPDF(fileBuffer);
      const buildingParser = new BuildingLedgerParser();
      const buildingData = buildingParser.parse(ocrText);

      console.log('Building ledger parsed:', {
        hasViolation: buildingData.hasViolation,
        violationCount: buildingData.violationHistory.length,
        address: buildingData.address
      });

      parsedData = {
        documentType: 'building_ledger',
        fileName: document.original_filename,
        uploadedAt: document.created_at,
        buildingData: buildingData,
        hasViolation: buildingData.hasViolation,
        violationSummary: buildingParser.summarizeViolations(buildingData),
        status: 'parsed',
      };
    } else {
      return NextResponse.json(
        { error: 'Unsupported document type' },
        { status: 400 }
      );
    }

    // Update document record with parsed data
    // Skip update if parsedData is null (means it was already saved inside performRealAnalysis)
    if (parsedData !== null) {
      const { data: updatedDocument, error: updateError } = await supabase
        .from('uploaded_documents')
        .update({
          parsed_data: parsedData,
        })
        .eq('id', body.documentId)
        .select()
        .single();

      if (updateError) {
        console.error('Database update error:', updateError);
        return NextResponse.json(
          { error: 'Failed to save parsed data', details: updateError.message },
          { status: 500 }
        );
      }

      // Return success response
      return NextResponse.json(
        {
          documentId: updatedDocument.id,
          parsedData: updatedDocument.parsed_data,
          parsedAt: updatedDocument.created_at,
          message: 'Document parsed successfully',
        },
        { status: 200 }
      );
    } else {
      // For deunggibu documents, data was already saved inside performRealAnalysis
      // Just fetch the document to return the response
      const { data: document } = await supabase
        .from('uploaded_documents')
        .select('*')
        .eq('id', body.documentId)
        .single();

      return NextResponse.json(
        {
          documentId: document.id,
          parsedData: document.parsed_data,
          parsedAt: document.created_at,
          message: 'Document parsed successfully',
        },
        { status: 200 }
      );
    }
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// OPTIONS handler for CORS preflight
export async function OPTIONS(request: NextRequest) {
  return NextResponse.json(
    {},
    {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    }
  );
}
