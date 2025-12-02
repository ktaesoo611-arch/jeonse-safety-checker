/**
 * POST /api/documents/register
 *
 * Registers a document that was uploaded directly to Supabase Storage from the client
 *
 * Request: application/json
 * - analysisId: string (UUID)
 * - documentType: 'deunggibu' | 'building_ledger'
 * - fileName: string
 * - filePath: string (path in Supabase Storage)
 * - fileSize: number
 *
 * Response:
 * - documentId: string (UUID)
 * - message: string
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { analysisId, documentType, fileName, filePath, fileSize } = body;

    // Validate required fields
    if (!analysisId || typeof analysisId !== 'string') {
      return NextResponse.json(
        { error: 'Invalid or missing analysisId' },
        { status: 400 }
      );
    }

    if (!documentType || !['deunggibu', 'building_ledger'].includes(documentType)) {
      return NextResponse.json(
        { error: 'Invalid documentType (must be "deunggibu" or "building_ledger")' },
        { status: 400 }
      );
    }

    if (!fileName || !filePath) {
      return NextResponse.json(
        { error: 'Missing fileName or filePath' },
        { status: 400 }
      );
    }

    // Verify analysis exists
    const { data: analysis, error: analysisError } = await supabase
      .from('analysis_results')
      .select('id')
      .eq('id', analysisId)
      .single();

    if (analysisError || !analysis) {
      return NextResponse.json(
        { error: 'Analysis not found' },
        { status: 404 }
      );
    }

    // Verify file exists in storage
    const { data: fileData, error: fileError } = await supabase.storage
      .from('documents')
      .list(analysisId, {
        search: filePath.split('/').pop(),
      });

    if (fileError || !fileData || fileData.length === 0) {
      return NextResponse.json(
        { error: 'File not found in storage' },
        { status: 404 }
      );
    }

    // Create document record in database
    const { data: documentData, error: documentError } = await supabase
      .from('uploaded_documents')
      .insert([
        {
          analysis_id: analysisId,
          document_type: documentType,
          original_filename: fileName,
          file_path: filePath,
          created_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (documentError) {
      console.error('Database error:', documentError);
      return NextResponse.json(
        { error: 'Failed to create document record', details: documentError.message },
        { status: 500 }
      );
    }

    // Update analysis status to 'processing' if not already
    await supabase
      .from('analysis_results')
      .update({ status: 'processing' })
      .eq('id', analysisId)
      .eq('status', 'pending'); // Only update if still pending

    // Return success response
    return NextResponse.json(
      {
        documentId: documentData.id,
        fileName: documentData.original_filename,
        message: 'Document registered successfully',
      },
      { status: 201 }
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
