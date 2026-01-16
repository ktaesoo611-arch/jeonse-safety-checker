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
import { createServiceRoleClient } from '@/lib/supabase-server';
import { analysisService } from '@/lib/services/analysis-service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Create service role client (bypasses RLS)
    const supabase = createServiceRoleClient();

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

    // Try new schema first (jeonse_safety_full view)
    const newSchemaResult = await analysisService.getJeonseSafetyFull(analysisId);
    if (newSchemaResult) {
      // Fetch associated documents
      const { data: documents } = await supabase
        .from('uploaded_documents')
        .select('*')
        .eq('analysis_id', analysisId)
        .order('created_at', { ascending: false });

      // Build response from new schema
      const response: any = {
        analysisId: newSchemaResult.id,
        status: newSchemaResult.status,
        paymentStatus: newSchemaResult.payment_status || null,
        address: newSchemaResult.address || 'N/A',
        proposedJeonse: newSchemaResult.proposed_jeonse,
        createdAt: newSchemaResult.created_at,
        completedAt: newSchemaResult.completed_at,
        documents: documents?.map((d: any) => ({
          id: d.id,
          type: d.document_type,
          fileName: d.original_filename,
          uploadedAt: d.created_at,
          parsed: !!d.parsed_data,
        })) || [],
      };

      // Include analysis results if completed
      if (newSchemaResult.status === 'completed') {
        response.safetyScore = newSchemaResult.safety_score;
        response.riskLevel = newSchemaResult.risk_level;
        response.deunggibuData = newSchemaResult.deunggibu_data;
        response.risks = newSchemaResult.risks;
      }

      // Calculate progress
      let progress = 0;
      if (newSchemaResult.status === 'pending') {
        progress = 0;
      } else if (newSchemaResult.status === 'processing') {
        const totalDocs = documents?.length || 0;
        const parsedDocs = documents?.filter((d: any) => d.parsed_data).length || 0;
        if (totalDocs > 0 && parsedDocs > 0) {
          progress = 25 + (parsedDocs / totalDocs) * 50;
        } else {
          progress = 25;
        }
      } else if (newSchemaResult.status === 'completed') {
        const hasResults = newSchemaResult.safety_score !== null || newSchemaResult.deunggibu_data !== null;
        progress = hasResults ? 100 : 85;
      }

      response.progress = Math.round(progress);
      return NextResponse.json(response, { status: 200 });
    }

    // Fallback to old schema (analysis_results)
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
      paymentStatus: analysis.payment_status || null,
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

    // Calculate progress percentage with smoother transitions
    let progress = 0;
    if (analysis.status === 'pending') {
      progress = 0;
    } else if (analysis.status === 'processing') {
      const totalDocs = documents?.length || 0;
      const parsedDocs = documents?.filter((d: any) => d.parsed_data).length || 0;

      // Progress breakdown:
      // 0-25%: Initial setup
      // 25-75%: Document parsing (based on parsed docs)
      // 75-100%: Risk analysis (simulated based on time)
      if (totalDocs > 0 && parsedDocs > 0) {
        // Documents are being parsed: 25-75%
        progress = 25 + (parsedDocs / totalDocs) * 50;
      } else {
        // Initial processing: 25%
        progress = 25;
      }
    } else if (analysis.status === 'completed') {
      // Check if we have analysis results
      const hasResults = analysis.safety_score !== null || analysis.deunggibu_data !== null;

      if (hasResults) {
        progress = 100;
      } else {
        // Transitioning to completion: 85%
        progress = 85;
      }
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
