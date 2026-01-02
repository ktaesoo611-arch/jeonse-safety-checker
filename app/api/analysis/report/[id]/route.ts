/**
 * GET /api/analysis/report/[id]
 *
 * Retrieves the complete analysis report with risk assessment
 *
 * URL Parameters:
 * - id: string (analysis UUID)
 *
 * Response:
 * - analysisId: string
 * - property: object (property details)
 * - riskAnalysis: object (complete risk analysis)
 * - recommendations: object (mandatory, recommended, optional actions)
 * - summary: object (key metrics and verdict)
 * - generatedAt: string
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { analysisService } from '@/lib/services/analysis-service';
import { JeonsePriceAnalyzer } from '@/lib/analyzers/jeonse-price-analyzer';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Helper to regenerate verdict with recalculated score
function generateVerdict(riskLevel: string, score: number): string {
  const verdicts: Record<string, string> = {
    'SAFE': `SAFE TO PROCEED - Score: ${score}/100. This property shows good fundamentals with manageable risk.`,
    'MODERATE': `MODERATE RISK - Score: ${score}/100. Can proceed with mandatory protections and careful monitoring.`,
    'HIGH': `HIGH RISK - Score: ${score}/100. Significant concerns. Only proceed if you can accept substantial risk.`,
    'CRITICAL': `CRITICAL RISK - Score: ${score}/100. DO NOT PROCEED. Too dangerous for your deposit.`,
    'UNKNOWN': 'Safety analysis not available. Upload 등기부등본 for complete analysis.',
  };
  return verdicts[riskLevel] || verdicts['UNKNOWN'];
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const analysisId = resolvedParams.id;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(analysisId)) {
      return NextResponse.json(
        { error: 'Invalid analysis ID format' },
        { status: 400 }
      );
    }

    // Try wolse_price_full first (for wolse reports)
    const wolseResult = await analysisService.getWolsePriceFull(analysisId);
    if (wolseResult && wolseResult.status === 'completed') {
      // Fetch property info
      const { data: propertyData } = await supabase
        .from('properties')
        .select('*')
        .eq('id', wolseResult.property_id)
        .single();

      // Also fetch safety analysis data from analysis_results (if 등기부등본 was uploaded)
      const { data: safetyData } = await supabase
        .from('analysis_results')
        .select('*, properties(*)')
        .eq('id', analysisId)
        .single();

      const riskAnalysis = safetyData?.deunggibu_data || null;
      const hasSafetyData = riskAnalysis && riskAnalysis.overallScore !== undefined;

      // Recalculate overall score with new weights (LTV 40%, Legal 30%, Market 15%, Building 15%)
      // This ensures consistency even for old analyses stored with different weights
      const recalculateScore = (data: any) => {
        if (!data) return 0;
        const ltvScore = data.scores?.ltvScore ?? data.ltvScore ?? 0;
        const legalScore = data.scores?.legalScore ?? data.legalScore ?? 0;
        const marketScore = data.scores?.marketScore ?? data.marketScore ?? 0;
        const buildingScore = data.scores?.buildingScore ?? data.buildingScore ?? 0;
        return Math.round(
          ltvScore * 0.40 +
          legalScore * 0.30 +
          marketScore * 0.15 +
          buildingScore * 0.15
        );
      };
      const recalculatedScore = hasSafetyData ? recalculateScore(riskAnalysis) : 0;

      const report = {
        analysisId: wolseResult.id,
        analysisType: 'wolse',
        generatedAt: new Date().toISOString(),
        completedAt: wolseResult.completed_at,

        property: {
          // Always include building name in address
          address: propertyData?.building_name
            ? `${propertyData?.city || '서울특별시'} ${propertyData?.district || ''} ${propertyData?.dong || ''} ${propertyData?.building_name}`.trim()
            : propertyData?.address || 'N/A',
          buildingName: propertyData?.building_name || null,
          buildingNumber: propertyData?.building_number || riskAnalysis?.deunggibu?.buildingNumber || riskAnalysis?.buildingNumber || null,
          unit: propertyData?.unit || riskAnalysis?.deunggibu?.unit || riskAnalysis?.unit || null,
          proposedJeonse: wolseResult.user_deposit,
          estimatedValue: riskAnalysis?.valuation?.valueMid || null,
          area: propertyData?.exclusive_area || riskAnalysis?.deunggibu?.area || riskAnalysis?.area || null,
          valuation: riskAnalysis?.valuation || {},
        },

        // Risk analysis from 등기부등본 (if available)
        riskAnalysis: hasSafetyData ? {
          overallScore: recalculatedScore,
          riskLevel: riskAnalysis.riskLevel,
          verdict: generateVerdict(riskAnalysis.riskLevel, recalculatedScore),
          scores: {
            ltvScore: riskAnalysis.scores?.ltvScore || riskAnalysis.ltvScore || 0,
            debtScore: riskAnalysis.scores?.debtScore || riskAnalysis.debtScore || 0,
            legalScore: riskAnalysis.scores?.legalScore || riskAnalysis.legalScore || 0,
            marketScore: riskAnalysis.scores?.marketScore || riskAnalysis.marketScore || 0,
            buildingScore: riskAnalysis.scores?.buildingScore || riskAnalysis.buildingScore || 0,
          },
          metrics: {
            ltv: riskAnalysis.ltv || (riskAnalysis.ltvRatio ? riskAnalysis.ltvRatio * 100 : 0),
            totalDebt: riskAnalysis.totalDebt || riskAnalysis.breakdown?.totalDebt || 0,
            availableEquity: riskAnalysis.availableEquity || riskAnalysis.breakdown?.availableEquity || 0,
            debtCount: riskAnalysis.debtRanking?.length || 0,
          },
          risks: riskAnalysis.risks || [],
          debtRanking: riskAnalysis.debtRanking || [],
          smallAmountPriority: riskAnalysis.smallAmountPriority || null,
        } : {
          overallScore: 0,
          riskLevel: 'UNKNOWN',
          verdict: 'Safety analysis not available. Upload 등기부등본 for complete analysis.',
          scores: { ltvScore: 0, debtScore: 0, legalScore: 0, marketScore: 0, buildingScore: 0 },
          metrics: { ltv: 0, totalDebt: 0, availableEquity: 0, debtCount: 0 },
          risks: [],
          debtRanking: [],
          smallAmountPriority: null,
        },

        // Wolse-specific analysis
        wolseAnalysis: {
          userDeposit: wolseResult.user_deposit || safetyData?.proposed_jeonse || 0,
          userMonthlyRent: wolseResult.user_monthly_rent || safetyData?.monthly_rent || 0,
          userRate: wolseResult.user_implied_rate || 0,
          marketRate: wolseResult.market_rate || 0,
          marketRateRange: {
            low: wolseResult.market_rate_low || 0,
            high: wolseResult.market_rate_high || 0,
          },
          legalRate: wolseResult.legal_rate || 4.5,
          expectedRent: wolseResult.expected_rent || 0,
          rentDifference: wolseResult.rent_difference || 0,
          rentDifferencePercent: wolseResult.rent_difference_percent || 0,
          assessment: wolseResult.assessment || 'FAIR',
          assessmentDetails: wolseResult.assessment_details || null,
          contractCount: wolseResult.contract_count || 0,
          confidenceLevel: wolseResult.confidence_level || null,
          savingsPotential: {
            vsMarket: wolseResult.savings_vs_market || 0,
            vsLegal: wolseResult.savings_vs_legal || 0,
          },
          trend: wolseResult.trend_direction ? {
            direction: wolseResult.trend_direction,
            percentage: wolseResult.trend_percentage || 0,
            advice: wolseResult.trend_advice || '',
          } : null,
          recentTransactions: wolseResult.recent_transactions || [],
          negotiationOptions: wolseResult.negotiation_options || [],
        },

        recommendations: hasSafetyData ? {
          mandatory: riskAnalysis.recommendations?.mandatory || [],
          recommended: riskAnalysis.recommendations?.recommended || [],
          optional: riskAnalysis.recommendations?.optional || [],
        } : {
          mandatory: [],
          recommended: [],
          optional: [],
        },

        summary: hasSafetyData ? {
          safetyScore: recalculatedScore,
          riskLevel: riskAnalysis.riskLevel,
          isSafe: riskAnalysis.riskLevel === 'SAFE',
          isModerate: riskAnalysis.riskLevel === 'MODERATE',
          isHigh: riskAnalysis.riskLevel === 'HIGH',
          isCritical: riskAnalysis.riskLevel === 'CRITICAL',
          verdict: generateVerdict(riskAnalysis.riskLevel, recalculatedScore),
        } : {
          safetyScore: 0,
          riskLevel: 'UNKNOWN',
          isSafe: false,
          isModerate: false,
          isHigh: false,
          isCritical: false,
          verdict: null,
        },
      };

      return NextResponse.json(report, { status: 200 });
    }

    // Try new schema first (jeonse_safety_full view)
    const newSchemaResult = await analysisService.getJeonseSafetyFull(analysisId);
    if (newSchemaResult && newSchemaResult.status === 'completed' && newSchemaResult.deunggibu_data) {
      // Fetch documents for additional context
      const { data: documents } = await supabase
        .from('uploaded_documents')
        .select('*')
        .eq('analysis_id', analysisId)
        .order('created_at', { ascending: false });

      const deunggibuDoc = documents?.find((d: any) => d.document_type === 'deunggibu');
      const parsedData = deunggibuDoc?.parsed_data || null;

      // Build report from new schema
      const riskAnalysis = newSchemaResult.deunggibu_data;

      // Recalculate overall score with new weights (LTV 40%, Legal 30%, Market 15%, Building 15%)
      const recalculateJeonseScore = () => {
        const ltvScore = newSchemaResult.ltv_score || riskAnalysis.scores?.ltvScore || 0;
        const legalScore = newSchemaResult.legal_score || riskAnalysis.scores?.legalScore || 0;
        const marketScore = newSchemaResult.market_score || riskAnalysis.scores?.marketScore || 0;
        const buildingScore = newSchemaResult.building_score || riskAnalysis.scores?.buildingScore || 0;
        return Math.round(
          ltvScore * 0.40 +
          legalScore * 0.30 +
          marketScore * 0.15 +
          buildingScore * 0.15
        );
      };
      const recalculatedJeonseScore = recalculateJeonseScore();

      // Run jeonse price analysis if we have JEONSE transaction data (not sale data)
      let jeonseAnalysis = null;
      const allJeonseTransactions = newSchemaResult.valuation_data?.allJeonseTransactions || riskAnalysis.valuation?.allJeonseTransactions;
      if (allJeonseTransactions && allJeonseTransactions.length > 0) {
        const analyzer = new JeonsePriceAnalyzer();
        const userArea = riskAnalysis.deunggibu?.area || null;
        jeonseAnalysis = analyzer.analyze(
          newSchemaResult.proposed_jeonse,
          allJeonseTransactions,
          userArea
        );
        console.log('📊 Jeonse analysis (new schema): Using jeonse transactions');
      } else {
        console.log('📊 Jeonse analysis (new schema): No jeonse transactions available');
      }

      const report = {
        analysisId: newSchemaResult.id,
        generatedAt: new Date().toISOString(),
        completedAt: newSchemaResult.completed_at,

        property: {
          // Always include building name in address
          address: newSchemaResult.building_name
            ? `${newSchemaResult.city || '서울특별시'} ${newSchemaResult.district || ''} ${newSchemaResult.dong || ''} ${newSchemaResult.building_name}`.trim()
            : newSchemaResult.address || 'N/A',
          buildingName: newSchemaResult.building_name || null,
          buildingNumber: riskAnalysis.deunggibu?.buildingNumber || riskAnalysis.buildingNumber || null,
          unit: riskAnalysis.deunggibu?.unit || riskAnalysis.unit || null,
          proposedJeonse: newSchemaResult.proposed_jeonse,
          estimatedValue: newSchemaResult.valuation_data?.valueMid || riskAnalysis.valuation?.valueMid || null,
          area: riskAnalysis.deunggibu?.area || riskAnalysis.area || null,
          buildingAge: parsedData?.property?.buildingAge || null,
          propertyType: parsedData?.property?.type || null,
          valuation: {
            valueLow: newSchemaResult.valuation_data?.valueLow || riskAnalysis.valuation?.valueLow || null,
            valueMid: newSchemaResult.valuation_data?.valueMid || riskAnalysis.valuation?.valueMid || null,
            valueHigh: newSchemaResult.valuation_data?.valueHigh || riskAnalysis.valuation?.valueHigh || null,
            confidence: newSchemaResult.valuation_data?.confidence || riskAnalysis.valuation?.confidence || null,
            marketTrend: newSchemaResult.valuation_data?.marketTrend || riskAnalysis.valuation?.marketTrend || null,
          },
        },

        owner: { name: null, phone: null },

        riskAnalysis: {
          overallScore: recalculatedJeonseScore,
          riskLevel: riskAnalysis.riskLevel || newSchemaResult.risk_level,
          verdict: generateVerdict(riskAnalysis.riskLevel || newSchemaResult.risk_level, recalculatedJeonseScore),
          scores: {
            ltvScore: newSchemaResult.ltv_score || riskAnalysis.scores?.ltvScore || 0,
            debtScore: newSchemaResult.debt_score || riskAnalysis.scores?.debtScore || 0,
            legalScore: newSchemaResult.legal_score || riskAnalysis.scores?.legalScore || 0,
            marketScore: newSchemaResult.market_score || riskAnalysis.scores?.marketScore || 0,
            buildingScore: newSchemaResult.building_score || riskAnalysis.scores?.buildingScore || 0,
          },
          metrics: {
            ltv: newSchemaResult.ltv_ratio || riskAnalysis.ltv || 0,
            totalDebt: riskAnalysis.totalDebt || riskAnalysis.breakdown?.totalDebt || 0,
            availableEquity: riskAnalysis.availableEquity || riskAnalysis.breakdown?.availableEquity || 0,
            debtCount: riskAnalysis.debtRanking?.length || 0,
          },
          risks: newSchemaResult.risks || riskAnalysis.risks || [],
          debtRanking: riskAnalysis.debtRanking || [],
          smallAmountPriority: riskAnalysis.smallAmountPriority || null,
        },

        recommendations: {
          mandatory: newSchemaResult.recommendations?.mandatory || riskAnalysis.recommendations?.mandatory || [],
          recommended: newSchemaResult.recommendations?.recommended || riskAnalysis.recommendations?.recommended || [],
          optional: newSchemaResult.recommendations?.optional || riskAnalysis.recommendations?.optional || [],
        },

        summary: {
          safetyScore: recalculatedJeonseScore,
          riskLevel: riskAnalysis.riskLevel || newSchemaResult.risk_level,
          isSafe: (riskAnalysis.riskLevel || newSchemaResult.risk_level) === 'SAFE',
          isModerate: (riskAnalysis.riskLevel || newSchemaResult.risk_level) === 'MODERATE',
          isHigh: (riskAnalysis.riskLevel || newSchemaResult.risk_level) === 'HIGH',
          isCritical: (riskAnalysis.riskLevel || newSchemaResult.risk_level) === 'CRITICAL',
          verdict: generateVerdict(riskAnalysis.riskLevel || newSchemaResult.risk_level, recalculatedJeonseScore),
          criticalIssues: (newSchemaResult.risks || riskAnalysis.risks)?.filter((r: any) => r.severity === 'CRITICAL').length || 0,
          highIssues: (newSchemaResult.risks || riskAnalysis.risks)?.filter((r: any) => r.severity === 'HIGH').length || 0,
          moderateIssues: (newSchemaResult.risks || riskAnalysis.risks)?.filter((r: any) => r.severity === 'MODERATE').length || 0,
        },

        legalInfo: {
          law: '주택임대차보호법 시행령',
          effectiveDate: '2025. 3. 1.',
          decree: '대통령령 제35161호, 2024. 12. 31., 일부개정',
        },

        // Jeonse price analysis (if transaction data available)
        jeonseAnalysis: jeonseAnalysis ? {
          proposedJeonse: jeonseAnalysis.proposedJeonse,
          expectedJeonse: jeonseAnalysis.expectedJeonse,
          jeonseDifference: jeonseAnalysis.jeonseDifference,
          jeonseDifferencePercent: jeonseAnalysis.jeonseDifferencePercent,
          assessment: jeonseAnalysis.assessment,
          assessmentDetails: jeonseAnalysis.assessmentDetails,
          potentialSavings: jeonseAnalysis.potentialSavings,
          trend: jeonseAnalysis.trend,
          transactionData: jeonseAnalysis.transactionData,
          regressionLine: jeonseAnalysis.regressionLine,
          contractCount: jeonseAnalysis.contractCount,
        } : null,

        documents: documents?.map((d: any) => ({
          id: d.id,
          type: d.document_type,
          fileName: d.file_name,
          uploadedAt: d.created_at,
          parsed: !!d.parsed_data,
        })) || [],
      };

      return NextResponse.json(report, { status: 200 });
    }

    // Fallback to old schema (analysis_results)
    const { data: initialAnalysis, error: analysisError } = await supabase
      .from('analysis_results')
      .select(`
        *,
        properties (*)
      `)
      .eq('id', analysisId)
      .single();

    let analysis = initialAnalysis;

    if (analysisError || !analysis) {
      return NextResponse.json(
        { error: 'Analysis not found' },
        { status: 404 }
      );
    }

    // Check if analysis is completed
    if (analysis.status !== 'completed') {
      return NextResponse.json(
        {
          error: 'Analysis not completed yet',
          status: analysis.status,
          message: 'Please wait for analysis to complete before retrieving report',
        },
        { status: 400 }
      );
    }

    // Check if risk analysis exists - retry if data not yet available (handles DB replication delay)
    if (!analysis.deunggibu_data) {
      console.warn(`Report API: deunggibu_data not yet available for ${analysisId}, waiting 2s for DB replication...`);

      // Wait for database replication/commit
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Retry query
      const { data: retryAnalysis, error: retryError } = await supabase
        .from('analysis_results')
        .select(`
          *,
          properties (*)
        `)
        .eq('id', analysisId)
        .single();

      if (retryError || !retryAnalysis || !retryAnalysis.deunggibu_data) {
        console.error('Report API Error: Missing deunggibu_data after retry for analysis', analysisId);
        console.error('Analysis object keys:', retryAnalysis ? Object.keys(retryAnalysis) : 'N/A');
        console.error('Analysis status:', retryAnalysis?.status);
        console.error('Analysis safety_score:', retryAnalysis?.safety_score);
        console.error('Analysis risk_level:', retryAnalysis?.risk_level);
        return NextResponse.json(
          { error: 'Risk analysis data not available' },
          { status: 500 }
        );
      }

      // Use the retried data
      analysis = retryAnalysis;
      console.log(`✅ Report API: deunggibu_data found after retry for ${analysisId}`);
    }

    // Fetch documents for additional context
    const { data: documents, error: documentsError } = await supabase
      .from('uploaded_documents')
      .select('*')
      .eq('analysis_id', analysisId)
      .order('created_at', { ascending: false });

    if (documentsError) {
      console.error('Error fetching documents:', documentsError);
    }

    // Find parsed 등기부등본 data
    const deunggibuDoc = documents?.find((d: any) => d.document_type === 'deunggibu');
    const parsedData = deunggibuDoc?.parsed_data || null;

    // Build comprehensive report
    const riskAnalysis = analysis.deunggibu_data;

    // Recalculate overall score with new weights (LTV 40%, Legal 30%, Market 15%, Building 15%)
    const recalculateFallbackScore = () => {
      const ltvScore = riskAnalysis.scores?.ltvScore || riskAnalysis.ltvScore || 0;
      const legalScore = riskAnalysis.scores?.legalScore || riskAnalysis.legalScore || 0;
      const marketScore = riskAnalysis.scores?.marketScore || riskAnalysis.marketScore || 0;
      const buildingScore = riskAnalysis.scores?.buildingScore || riskAnalysis.buildingScore || 0;
      return Math.round(
        ltvScore * 0.40 +
        legalScore * 0.30 +
        marketScore * 0.15 +
        buildingScore * 0.15
      );
    };
    const recalculatedFallbackScore = recalculateFallbackScore();

    // Run jeonse price analysis if we have JEONSE transaction data (not sale data)
    let jeonseAnalysisFallback = null;
    const allJeonseTransactionsFallback = riskAnalysis.valuation?.allJeonseTransactions;
    if (allJeonseTransactionsFallback && allJeonseTransactionsFallback.length > 0) {
      const analyzer = new JeonsePriceAnalyzer();
      const userArea = riskAnalysis.deunggibu?.area || null;
      jeonseAnalysisFallback = analyzer.analyze(
        analysis.proposed_jeonse,
        allJeonseTransactionsFallback,
        userArea
      );
      console.log('📊 Jeonse analysis (fallback): Using jeonse transactions -', jeonseAnalysisFallback ? 'completed' : 'no result');
    } else {
      console.log('📊 Jeonse analysis (fallback): No jeonse transactions available');
    }

    // Debug logging
    console.log('Report API Debug:', {
      analysisId,
      hasProperties: !!analysis.properties,
      propertiesType: Array.isArray(analysis.properties) ? 'array' : typeof analysis.properties,
      propertiesValue: analysis.properties
    });

    const report = {
      analysisId: analysis.id,
      generatedAt: new Date().toISOString(),
      completedAt: analysis.completed_at,

      // Property Information
      property: {
        // Always include building name in address
        address: (() => {
          const prop = Array.isArray(analysis.properties) ? analysis.properties[0] : analysis.properties;
          if (prop?.building_name) {
            return `${prop?.city || '서울특별시'} ${prop?.district || ''} ${prop?.dong || ''} ${prop?.building_name}`.trim();
          }
          return prop?.address || 'N/A';
        })(),
        buildingName: (Array.isArray(analysis.properties) ? analysis.properties[0]?.building_name : analysis.properties?.building_name) || null,
        buildingNumber: riskAnalysis.deunggibu?.buildingNumber || riskAnalysis.buildingNumber || null,
        unit: riskAnalysis.deunggibu?.unit || riskAnalysis.unit || null,
        proposedJeonse: analysis.proposed_jeonse,
        estimatedValue: riskAnalysis.valuation?.valueMid || null,
        area: riskAnalysis.deunggibu?.area || riskAnalysis.area || null,
        buildingAge: parsedData?.property?.buildingAge || null,
        propertyType: parsedData?.property?.type || null,
        valuation: {
          valueLow: riskAnalysis.valuation?.valueLow || null,
          valueMid: riskAnalysis.valuation?.valueMid || null,
          valueHigh: riskAnalysis.valuation?.valueHigh || null,
          confidence: riskAnalysis.valuation?.confidence || null,
          marketTrend: riskAnalysis.valuation?.marketTrend || null,
        },
      },

      // Owner Information (if provided)
      owner: {
        name: analysis.owner_name,
        phone: analysis.owner_phone,
      },

      // Risk Analysis Results
      riskAnalysis: {
        overallScore: recalculatedFallbackScore,
        riskLevel: riskAnalysis.riskLevel,
        verdict: generateVerdict(riskAnalysis.riskLevel, recalculatedFallbackScore),

        // Component Scores
        scores: {
          ltvScore: riskAnalysis.scores?.ltvScore || riskAnalysis.ltvScore || 0,
          debtScore: riskAnalysis.scores?.debtScore || riskAnalysis.debtScore || 0,
          legalScore: riskAnalysis.scores?.legalScore || riskAnalysis.legalScore || 0,
          marketScore: riskAnalysis.scores?.marketScore || riskAnalysis.marketScore || 0,
          buildingScore: riskAnalysis.scores?.buildingScore || riskAnalysis.buildingScore || 0,
        },

        // Key Metrics
        metrics: {
          ltv: riskAnalysis.ltv || (riskAnalysis.ltvRatio ? riskAnalysis.ltvRatio * 100 : 0),
          totalDebt: riskAnalysis.totalDebt || riskAnalysis.breakdown?.totalDebt || 0,
          availableEquity: riskAnalysis.availableEquity || riskAnalysis.breakdown?.availableEquity || 0,
          debtCount: riskAnalysis.debtRanking?.length || 0,
        },

        // Risk Factors
        risks: riskAnalysis.risks || [],

        // Debt Ranking
        debtRanking: riskAnalysis.debtRanking || [],

        // 소액보증금 Priority
        smallAmountPriority: riskAnalysis.smallAmountPriority || null,
      },

      // Recommendations
      recommendations: {
        mandatory: riskAnalysis.recommendations?.mandatory || [],
        recommended: riskAnalysis.recommendations?.recommended || [],
        optional: riskAnalysis.recommendations?.optional || [],
      },

      // Summary for Quick View
      summary: {
        safetyScore: recalculatedFallbackScore,
        riskLevel: riskAnalysis.riskLevel,
        isSafe: riskAnalysis.riskLevel === 'SAFE',
        isModerate: riskAnalysis.riskLevel === 'MODERATE',
        isHigh: riskAnalysis.riskLevel === 'HIGH',
        isCritical: riskAnalysis.riskLevel === 'CRITICAL',
        verdict: generateVerdict(riskAnalysis.riskLevel, recalculatedFallbackScore),
        criticalIssues: riskAnalysis.risks?.filter((r: any) => r.severity === 'CRITICAL').length || 0,
        highIssues: riskAnalysis.risks?.filter((r: any) => r.severity === 'HIGH').length || 0,
        moderateIssues: riskAnalysis.risks?.filter((r: any) => r.severity === 'MODERATE').length || 0,
      },

      // Legal Compliance Info
      legalInfo: {
        law: '주택임대차보호법 시행령',
        effectiveDate: '2025. 3. 1.',
        decree: '대통령령 제35161호, 2024. 12. 31., 일부개정',
      },

      // Jeonse price analysis (if transaction data available)
      jeonseAnalysis: jeonseAnalysisFallback ? {
        proposedJeonse: jeonseAnalysisFallback.proposedJeonse,
        expectedJeonse: jeonseAnalysisFallback.expectedJeonse,
        jeonseDifference: jeonseAnalysisFallback.jeonseDifference,
        jeonseDifferencePercent: jeonseAnalysisFallback.jeonseDifferencePercent,
        assessment: jeonseAnalysisFallback.assessment,
        assessmentDetails: jeonseAnalysisFallback.assessmentDetails,
        potentialSavings: jeonseAnalysisFallback.potentialSavings,
        trend: jeonseAnalysisFallback.trend,
        transactionData: jeonseAnalysisFallback.transactionData,
        regressionLine: jeonseAnalysisFallback.regressionLine,
        contractCount: jeonseAnalysisFallback.contractCount,
      } : null,

      // Documents
      documents: documents?.map((d: any) => ({
        id: d.id,
        type: d.document_type,
        fileName: d.file_name,
        uploadedAt: d.created_at,
        parsed: !!d.parsed_data,
      })) || [],
    };

    // Return success response
    return NextResponse.json(report, { status: 200 });
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
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    }
  );
}
