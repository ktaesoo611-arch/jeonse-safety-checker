/**
 * GET /api/analysis/status/[id]
 *
 * Retrieves the current status of an analysis
 *
 * URL Parameters:
 * - id: string (analysis UUID)
 *
 * Response:
 * - analysisId: string
 * - status: 'pending' | 'processing' | 'completed' | 'failed'
 * - address: string
 * - proposedJeonse: number
 * - createdAt: string
 * - completedAt?: string
 * - documents: array (uploaded documents)
 * - safetyScore?: number (if completed)
 * - riskLevel?: string (if completed)
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

    // Fetch analysis with property details
    const { data: analysis, error: analysisError } = await supabase
      .from('analysis_results')
      .select(`
        *,
        properties (*)
      `)
      .eq('id', analysisId)
      .single();

    if (analysisError || !analysis) {
      return NextResponse.json(
        { error: 'Analysis not found' },
        { status: 404 }
      );
    }

    // Fetch associated documents
    const { data: documents, error: documentsError } = await supabase
      .from('uploaded_documents')
      .select('*')
      .eq('analysis_id', analysisId)
      .order('created_at', { ascending: false });

    if (documentsError) {
      console.error('Error fetching documents:', documentsError);
    }

    // Build response
    const response: any = {
      analysisId: analysis.id,
      status: analysis.status,
      address: analysis.properties?.address || 'N/A',
      proposedJeonse: analysis.proposed_jeonse,
      createdAt: analysis.created_at,
      completedAt: analysis.completed_at,
      documents: documents?.map((d: any) => ({
        id: d.id,
        type: d.document_type,
        fileName: d.original_filename,
        uploadedAt: d.created_at,
        parsed: !!d.parsed_data,
      })) || [],
    };

    // Include analysis results if completed
    if (analysis.status === 'completed') {
      response.safetyScore = analysis.safety_score;
      response.riskLevel = analysis.risk_level;
      response.deunggibuData = analysis.deunggibu_data;
      response.risks = analysis.risks;
    }

    // Calculate progress percentage
    let progress = 0;
    if (analysis.status === 'pending') {
      progress = 0;
    } else if (analysis.status === 'processing') {
      const totalDocs = documents?.length || 0;
      const parsedDocs = documents?.filter((d: any) => d.parsed_data).length || 0;
      progress = totalDocs > 0 ? (parsedDocs / totalDocs) * 50 + 25 : 25;
    } else if (analysis.status === 'completed') {
      progress = 100;
    } else if (analysis.status === 'failed') {
      progress = 0;
    }

    response.progress = Math.round(progress);

    // Return success response
    return NextResponse.json(response, { status: 200 });
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
