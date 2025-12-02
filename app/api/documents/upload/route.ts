/**
 * POST /api/documents/upload
 *
 * Uploads documents (등기부등본, 건축물대장) for analysis
 *
 * Request: multipart/form-data
 * - analysisId: string (UUID)
 * - documentType: 'deunggibu' | 'building_ledger'
 * - file: File (PDF)
 *
 * Response:
 * - documentId: string (UUID)
 * - fileName: string
 * - fileSize: number
 * - uploadedAt: string (ISO timestamp)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['application/pdf'];

// Configure route segment to handle larger payloads
export const maxDuration = 60; // 60 seconds timeout
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // Parse multipart form data
    const formData = await request.formData();

    const analysisId = formData.get('analysisId') as string;
    const documentType = formData.get('documentType') as string;
    const file = formData.get('file') as File;

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

    if (!file) {
      return NextResponse.json(
        { error: 'No file uploaded' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type (must be PDF)' },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large (max ${MAX_FILE_SIZE / 1024 / 1024}MB)` },
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

    // Generate unique file name
    const timestamp = Date.now();
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const storagePath = `${analysisId}/${documentType}_${timestamp}_${sanitizedFileName}`;

    // Convert File to ArrayBuffer, then to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('documents')
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return NextResponse.json(
        { error: 'Failed to upload file', details: uploadError.message },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('documents')
      .getPublicUrl(storagePath);

    // Create document record in database
    const { data: documentData, error: documentError } = await supabase
      .from('uploaded_documents')
      .insert([
        {
          analysis_id: analysisId,
          document_type: documentType,
          original_filename: file.name,
          file_path: storagePath,
          created_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (documentError) {
      console.error('Database error:', documentError);
      // Cleanup uploaded file
      await supabase.storage.from('documents').remove([storagePath]);
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
        fileSize: file.size,
        fileUrl: urlData.publicUrl,
        uploadedAt: documentData.created_at,
        message: 'Document uploaded successfully',
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
