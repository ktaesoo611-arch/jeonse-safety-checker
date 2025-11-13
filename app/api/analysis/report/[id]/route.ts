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

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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

    // Fetch analysis from database
    const { data: analysis, error: analysisError } = await supabase
      .from('analysis_results')
      .select('*')
      .eq('id', analysisId)
      .single();

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

    // Check if risk analysis exists
    if (!analysis.deunggibu_data) {
      return NextResponse.json(
        { error: 'Risk analysis data not available' },
        { status: 500 }
      );
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

    const report = {
      analysisId: analysis.id,
      generatedAt: new Date().toISOString(),
      completedAt: analysis.completed_at,

      // Property Information
      property: {
        address: analysis.address,
        proposedJeonse: analysis.proposed_jeonse,
        estimatedValue: riskAnalysis.valuation?.valueMid || null,
        area: riskAnalysis.deunggibu?.area || null,
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
        overallScore: riskAnalysis.overallScore,
        riskLevel: riskAnalysis.riskLevel,
        verdict: riskAnalysis.verdict,

        // Component Scores
        scores: {
          ltvScore: riskAnalysis.ltvScore || 0,
          debtScore: riskAnalysis.debtScore || 0,
          legalScore: riskAnalysis.legalScore || 0,
          marketScore: riskAnalysis.marketScore || 0,
          buildingScore: riskAnalysis.buildingScore || 0,
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
        safetyScore: riskAnalysis.overallScore,
        riskLevel: riskAnalysis.riskLevel,
        isSafe: riskAnalysis.riskLevel === 'SAFE',
        isModerate: riskAnalysis.riskLevel === 'MODERATE',
        isHigh: riskAnalysis.riskLevel === 'HIGH',
        isCritical: riskAnalysis.riskLevel === 'CRITICAL',
        verdict: riskAnalysis.verdict,
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
