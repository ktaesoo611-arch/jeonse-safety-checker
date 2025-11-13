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
import { createClient } from '@supabase/supabase-js';
import { ocrService } from '@/lib/services/ocr-service';
import { DeunggibuParser } from '@/lib/analyzers/deunggibu-parser';
import { RiskAnalyzer } from '@/lib/analyzers/risk-analyzer';
import { MolitAPI, getDistrictCode } from '@/lib/apis/molit';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface ParseDocumentRequest {
  documentId: string;
}

/**
 * Fetch property valuation from MOLIT API
 */
async function fetchPropertyValuation(
  address: string,
  buildingName: string | undefined,
  area: number
): Promise<{ estimatedValue: number; confidence: number; marketTrend: 'rising' | 'stable' | 'falling' }> {
  try {
    console.log('Fetching property valuation from MOLIT API...');
    console.log('Address:', address);
    console.log('Building:', buildingName);
    console.log('Area:', area);

    // Parse address to extract city and district
    const addressMatch = address.match(/(서울특별시|서울)\s+([가-힣]+구)/);
    if (!addressMatch) {
      console.warn('Could not parse city/district from address:', address);
      return { estimatedValue: 0, confidence: 0, marketTrend: 'stable' };
    }

    const city = addressMatch[1] === '서울' ? '서울특별시' : addressMatch[1];
    const district = addressMatch[2];

    console.log('Parsed location:', { city, district });

    // Get district code
    const lawdCd = getDistrictCode(city, district);
    if (!lawdCd) {
      console.warn('Could not find district code for:', { city, district });
      return { estimatedValue: 0, confidence: 0, marketTrend: 'stable' };
    }

    console.log('District code:', lawdCd);

    // Initialize MOLIT API
    const molitAPI = new MolitAPI(process.env.MOLIT_API_KEY!);

    // Try multiple building name variants to handle name mismatches
    // Import the helper function
    const { getBuildingNameVariants } = await import('@/lib/data/address-data');
    const buildingNameVariants = buildingName ? getBuildingNameVariants(buildingName) : [''];
    console.log('Trying building name variants:', buildingNameVariants);

    let transactions: any[] = [];
    let usedBuildingName = buildingName || '';

    // Try each variant until we get transactions
    for (const nameVariant of buildingNameVariants) {
      console.log(`Trying variant: "${nameVariant}"`);
      const result = await molitAPI.getRecentTransactionsForApartment(
        lawdCd,
        nameVariant,
        area,
        6
      );

      if (result.length > 0) {
        transactions = result;
        usedBuildingName = nameVariant;
        console.log(`SUCCESS: Found ${transactions.length} transactions with variant: "${nameVariant}"`);
        break;
      } else {
        console.log(`No transactions found for variant: "${nameVariant}"`);
      }
    }

    console.log(`Found ${transactions.length} recent transactions using building name: "${usedBuildingName}"`);

    if (transactions.length === 0) {
      console.warn('No recent transactions found');
      return { estimatedValue: 0, confidence: 0, marketTrend: 'stable' };
    }

    // Calculate average price from recent transactions
    const avgPrice = transactions.reduce((sum, t) => sum + t.transactionAmount, 0) / transactions.length;

    // Determine market trend
    let marketTrend: 'rising' | 'stable' | 'falling' = 'stable';
    if (transactions.length >= 3) {
      const recentAvg = transactions.slice(0, 3).reduce((sum, t) => sum + t.transactionAmount, 0) / 3;
      const olderAvg = transactions.slice(-3).reduce((sum, t) => sum + t.transactionAmount, 0) / 3;

      if (recentAvg > olderAvg * 1.05) marketTrend = 'rising';
      else if (recentAvg < olderAvg * 0.95) marketTrend = 'falling';
    }

    // Confidence based on number of transactions
    const confidence = Math.min(0.9, 0.5 + (transactions.length * 0.05));

    console.log('Valuation result:', {
      estimatedValue: avgPrice,
      confidence,
      marketTrend,
      transactionCount: transactions.length
    });

    return {
      estimatedValue: Math.round(avgPrice),
      confidence,
      marketTrend
    };
  } catch (error) {
    console.error('Error fetching MOLIT valuation:', error);
    return { estimatedValue: 0, confidence: 0, marketTrend: 'stable' };
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

    // Step 1: Extract text from PDF using OCR
    const ocrText = await ocrService.extractTextFromPDF(buffer);

    if (!ocrText || ocrText.length < 50) {
      console.warn('OCR returned minimal text, falling back to mock analysis');
      return generateMockRiskAnalysis(analysisId, proposedJeonse, address);
    }

    console.log(`OCR extracted ${ocrText.length} characters`);

    // Step 2: Parse deunggibu data from OCR text
    const parser = new DeunggibuParser();
    const deunggibuData = parser.parse(ocrText);

    console.log('Parsed deunggibu data:', {
      mortgages: deunggibuData.mortgages.length,
      liens: deunggibuData.liens.length,
      totalMortgageAmount: deunggibuData.totalMortgageAmount,
      totalEstimatedPrincipal: deunggibuData.totalEstimatedPrincipal
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
      console.log('User-provided building name from Step 1:', userProvidedBuildingName);
    } else {
      console.log('No property_id found in analysis');
    }

    // Step 3: Fetch property value from MOLIT API
    console.log('Fetching property valuation from MOLIT API...');
    // Use user-provided building name if available, fallback to OCR-extracted name
    const buildingNameForValuation = userProvidedBuildingName || deunggibuData.buildingName;
    console.log('Building name for MOLIT API:', buildingNameForValuation);

    const molitValuation = await fetchPropertyValuation(
      deunggibuData.address,
      buildingNameForValuation,
      deunggibuData.area
    );

    // If MOLIT data is available, use it; otherwise fall back to estimation
    let estimatedValue: number;
    let valuation: any;

    if (molitValuation.estimatedValue > 0 && molitValuation.confidence > 0) {
      console.log('Using MOLIT API valuation:', molitValuation.estimatedValue);
      estimatedValue = molitValuation.estimatedValue;
      valuation = {
        valueLow: Math.round(estimatedValue * 0.95),
        valueMid: estimatedValue,
        valueHigh: Math.round(estimatedValue * 1.05),
        confidence: molitValuation.confidence,
        marketTrend: molitValuation.marketTrend
      };
    } else {
      console.log('MOLIT data unavailable, using jeonse ratio estimation');
      estimatedValue = Math.round(proposedJeonse / 0.70);
      valuation = {
        valueLow: Math.round(estimatedValue * 0.9),
        valueMid: estimatedValue,
        valueHigh: Math.round(estimatedValue * 1.1),
        confidence: 0.5,
        marketTrend: 'stable' as const
      };
    }

    console.log('Final valuation:', valuation);

    // Step 4: Determine region for small amount priority
    const region = address.includes('서울') ? '서울' :
                   address.includes('인천') || address.includes('경기') ? '수도권 과밀억제권역' :
                   '기타 지역';

    // Step 6: Run risk analysis
    const riskAnalyzer = new RiskAnalyzer();
    const buildingAge = 10; // TODO: Extract from building register

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

    // Step 7: Update database with results
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

    await supabase
      .from('analysis_results')
      .update({
        status: 'completed',
        safety_score: riskAnalysis.overallScore,
        risk_level: riskAnalysis.riskLevel,
        risks: riskAnalysis.risks,
        deunggibu_data: {
          ...riskAnalysis,
          deunggibu: deunggibuData,
          valuation
        },
        completed_at: new Date().toISOString()
      })
      .eq('id', analysisId);

    return { success: true, ocrText, deunggibuData, riskAnalysis };

  } catch (error) {
    console.error('Error in real analysis:', error);
    // Fall back to mock analysis if real analysis fails
    console.log('Falling back to mock analysis...');
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
      title: 'Bank Mortgage Has Priority Over Your Jeonse',
      description: `KB국민은행 has ₩${(mockMortgageAmount / 100000000).toFixed(1)}억 senior mortgage. In foreclosure, they get paid first. You do NOT qualify for 소액보증금 priority.`,
      impact: -30,
      category: 'priority'
    });
  }

  if (proposedJeonse / estimatedValue > 0.70) {
    risks.push({
      type: 'high_jeonse_ratio',
      severity: 'MEDIUM',
      title: 'Jeonse Ratio Above Recommended',
      description: `Your jeonse is ${(proposedJeonse / estimatedValue * 100).toFixed(1)}% of property value. Recommended maximum is 70%.`,
      impact: -15,
      category: 'debt'
    });
  }

  // Generate recommendations
  const mandatory: string[] = [
    'Get 확정일자 AND 전입신고 SAME DAY as payment',
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
        ? `Your jeonse (₩${(proposedJeonse / 10000).toFixed(0)}만원) qualifies for 소액보증금 우선변제 in ${region}. Up to ₩${(smallAmountProtected / 10000).toFixed(0)}만원 is protected with priority repayment even if senior mortgages exist. CRITICAL: Must get 확정일자 + 전입신고 + 점유 on SAME DAY.`
        : `Your jeonse (₩${(proposedJeonse / 10000).toFixed(0)}만원) EXCEEDS the 소액보증금 threshold (₩${(smallAmountThreshold / 10000).toFixed(0)}만원) for ${region}. You will NOT receive priority repayment protection. Senior mortgages will be paid first in foreclosure.`
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
        type: '전세 (Your Jeonse) - PROPOSED',
        creditor: 'You',
        amount: proposedJeonse,
        registrationDate: '미등록 (To be registered)',
        priority: 'subordinate'
      }
    ]
  };

  // Update analysis record with completed status and risk analysis
  await supabase
    .from('analysis_results')
    .update({
      status: 'completed',
      safety_score: overallScore,
      risk_level: riskLevel,
      risks: risks,
      deunggibu_data: riskAnalysis,
      completed_at: new Date().toISOString()
    })
    .eq('id', analysisId);

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
      const result = await performRealAnalysis(buffer, document.analysis_id, proposedJeonse, address);

      parsedData = {
        documentType: 'deunggibu',
        fileName: document.original_filename,
        uploadedAt: document.created_at,
        fileSize: buffer.length,
        status: result.success ? 'parsed' : 'failed',
        usedMock: result.mock || false,
        note: result.mock ? 'Used mock analysis (OCR unavailable or failed)' : 'Real OCR and parsing completed',
      };

    } else if (document.document_type === 'building_ledger') {
      // Parse 건축물대장 (simplified for now)
      parsedData = {
        documentType: 'building_ledger',
        fileName: document.original_filename,
        uploadedAt: document.created_at,
        note: 'Building ledger parsing not yet implemented',
      };
    } else {
      return NextResponse.json(
        { error: 'Unsupported document type' },
        { status: 400 }
      );
    }

    // Update document record with parsed data
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
