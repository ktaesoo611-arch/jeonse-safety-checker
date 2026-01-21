/**
 * POST /api/registry/lookup
 *
 * Fetches 등기부등본 (Property Registry) from Apick API,
 * stores the PDF, and creates a document entry for parsing.
 *
 * Request Body:
 * - address: string (full property address including unit number)
 * - type?: '토지' | '집합건물' | '건물' (default: '집합건물')
 * - analysisId: string (required - to link the document)
 *
 * Response:
 * - success: boolean
 * - documentId?: string (for calling /api/documents/parse)
 * - cost?: number (API cost in KRW)
 * - error?: string
 */

import { NextRequest, NextResponse } from 'next/server';
import { ApickAPI } from '@/lib/apis/apick';
import { createServiceRoleClient } from '@/lib/supabase-server';
import { v4 as uuidv4 } from 'uuid';

const supabase = createServiceRoleClient();

interface RegistryLookupRequest {
  address: string;
  type?: '토지' | '집합건물' | '건물';
  analysisId: string;
}

interface RegistryLookupResponse {
  success: boolean;
  documentId?: string;
  cost?: number;
  error?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse<RegistryLookupResponse>> {
  try {
    const body: RegistryLookupRequest = await request.json();

    // Validate required fields
    if (!body.address) {
      return NextResponse.json(
        { success: false, error: 'Address is required' },
        { status: 400 }
      );
    }

    if (!body.analysisId) {
      return NextResponse.json(
        { success: false, error: 'Analysis ID is required' },
        { status: 400 }
      );
    }

    // Validate API key
    const apiKey = process.env.APICK_API_KEY;
    if (!apiKey) {
      console.error('[RegistryLookup] APICK_API_KEY not configured');
      return NextResponse.json(
        { success: false, error: '등기부등본 조회 서비스가 설정되지 않았습니다' },
        { status: 500 }
      );
    }

    console.log(`[RegistryLookup] Starting lookup for: ${body.address}`);
    console.log(`[RegistryLookup] Analysis ID: ${body.analysisId}`);

    // Step 1: Fetch 등기부등본 PDF from Apick
    const apickAPI = new ApickAPI(apiKey);
    const registryResult = await apickAPI.getRegistry(
      body.address,
      body.type || '집합건물'
    );

    if (!registryResult.success || !registryResult.pdfBuffer) {
      console.error('[RegistryLookup] Failed to fetch registry:', registryResult.error);
      return NextResponse.json({
        success: false,
        error: registryResult.error || '등기부등본 조회에 실패했습니다',
      });
    }

    console.log(`[RegistryLookup] PDF fetched successfully, size: ${registryResult.pdfBuffer.length} bytes`);
    console.log(`[RegistryLookup] API cost: ${registryResult.cost} KRW`);

    // Step 2: Upload PDF to Supabase Storage
    const documentId = uuidv4();
    const fileName = `${body.analysisId}/${documentId}.pdf`;

    console.log(`[RegistryLookup] Uploading to storage: ${fileName}`);

    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(fileName, registryResult.pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (uploadError) {
      console.error('[RegistryLookup] Storage upload failed:', uploadError);
      return NextResponse.json({
        success: false,
        cost: registryResult.cost,
        error: '문서 저장에 실패했습니다',
      });
    }

    // Step 3: Create document entry in database
    const { error: insertError } = await supabase
      .from('uploaded_documents')
      .insert({
        id: documentId,
        analysis_id: body.analysisId,
        file_name: `deunggibu-auto-${Date.now()}.pdf`,
        file_path: fileName,
        file_size: registryResult.pdfBuffer.length,
        mime_type: 'application/pdf',
        document_type: 'deunggibu',
        source: 'apick-auto',
        metadata: {
          apick_ic_id: registryResult.ic_id,
          apick_cost: registryResult.cost,
          lookup_address: body.address,
          lookup_type: body.type || '집합건물',
        },
      });

    if (insertError) {
      console.error('[RegistryLookup] Database insert failed:', insertError);
      return NextResponse.json({
        success: false,
        cost: registryResult.cost,
        error: '문서 등록에 실패했습니다',
      });
    }

    console.log(`[RegistryLookup] Document registered: ${documentId}`);

    return NextResponse.json({
      success: true,
      documentId,
      cost: registryResult.cost,
    });

  } catch (error: any) {
    console.error('[RegistryLookup] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: error.message || '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
