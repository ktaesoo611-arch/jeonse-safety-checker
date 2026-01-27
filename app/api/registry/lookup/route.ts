/**
 * POST /api/registry/lookup
 *
 * Fetches 등기부등본 (Property Registry) using CODEF API.
 *
 * CODEF returns structured JSON directly (~10s response time).
 *
 * Request Body:
 * - address: string (full property address including unit number)
 * - type?: '토지' | '집합건물' | '건물' (default: '집합건물')
 * - analysisId: string (required - to link the document)
 *
 * Response:
 * - success: boolean
 * - documentId?: string (for calling /api/documents/parse)
 * - format?: 'json'
 * - parsedData?: object (CODEF pre-parsed data)
 * - source?: 'codef'
 * - error?: string
 */

import { NextRequest, NextResponse } from 'next/server';
import { CodefAPI } from '@/lib/apis/codef';
import { parseCodefRegistryData } from '@/lib/analyzers/codef-deunggibu-parser';
import { createServiceRoleClient } from '@/lib/supabase-server';

// CODEF is fast (~10s)
export const maxDuration = 60;

const supabase = createServiceRoleClient();

interface RegistryLookupRequest {
  address?: string;          // Combined address (fallback)
  // Structured address params for CODEF inquiryType='2'
  addr_sido?: string;        // 시/도
  addr_sigungu?: string;     // 시군구
  addr_dong?: string;        // 읍면동
  addr_lotNumber?: string;   // 지번 (e.g., "123-45")
  buildingName?: string;     // 건물명칭
  dong?: string;             // 동 (e.g., "101")
  ho?: string;               // 호 (e.g., "1001")
  // Other params
  type?: '토지' | '집합건물' | '건물';
  analysisId: string;
}

interface RegistryLookupResponse {
  success: boolean;
  documentId?: string;
  format?: 'json';
  parsedData?: any;
  source?: 'codef';
  error?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse<RegistryLookupResponse>> {
  try {
    const body: RegistryLookupRequest = await request.json();

    // Validate required fields
    const hasStructuredAddress = body.addr_sido || body.addr_dong || body.buildingName;
    if (!body.address && !hasStructuredAddress) {
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

    const propertyType = body.type || '집합건물';

    console.log(`[RegistryLookup] Starting lookup for: ${body.address || `${body.addr_sido} ${body.addr_sigungu} ${body.addr_dong}`}`);
    console.log(`[RegistryLookup] Analysis ID: ${body.analysisId}`);
    console.log(`[RegistryLookup] Type: ${propertyType}`);
    if (hasStructuredAddress) {
      console.log(`[RegistryLookup] Structured: sido=${body.addr_sido}, sigungu=${body.addr_sigungu}, dong=${body.addr_dong}, lot=${body.addr_lotNumber}, building=${body.buildingName}, 동=${body.dong}, 호=${body.ho}`);
    }

    // Update analysis status to 'processing' immediately
    await supabase
      .from('analysis_results')
      .update({ status: 'processing' })
      .eq('id', body.analysisId);

    // Use CODEF API for registry lookup
    const codefResult = await fetchViaCodef({
      address: body.address,
      addr_sido: body.addr_sido,
      addr_sigungu: body.addr_sigungu,
      addr_dong: body.addr_dong,
      addr_lotNumber: body.addr_lotNumber,
      buildingName: body.buildingName,
      dong: body.dong,
      ho: body.ho,
    }, propertyType, body.analysisId);

    // If CODEF failed, mark analysis as failed with error message
    if (!codefResult.success && codefResult.error) {
      console.log(`[RegistryLookup] CODEF failed, marking analysis as failed`);
      console.log(`[RegistryLookup] Error: ${codefResult.error}`);

      // Update analysis status to failed with error message
      const { error: updateError } = await supabase
        .from('analysis_results')
        .update({
          status: 'failed',
          deunggibu_data: {
            error: codefResult.error,
            errorCode: 'REGISTRY_LOOKUP_FAILED',
            failedAt: new Date().toISOString()
          }
        })
        .eq('id', body.analysisId);

      if (updateError) {
        console.error('[RegistryLookup] Failed to update analysis status:', updateError);
      }
    }

    return NextResponse.json(codefResult);

  } catch (error: any) {
    console.error('[RegistryLookup] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: error.message || '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}

/**
 * Fetch registry via CODEF API (primary - fast, structured JSON)
 *
 * Handles two cases:
 * 1. Direct registry data (single match auto-selected by CodefAPI)
 * 2. Address list (multiple matches) - selects best match and fetches registry
 */
async function fetchViaCodef(
  addressParams: {
    address?: string;
    addr_sido?: string;
    addr_sigungu?: string;
    addr_dong?: string;
    addr_lotNumber?: string;
    buildingName?: string;
    dong?: string;
    ho?: string;
  },
  type: '토지' | '집합건물' | '건물',
  analysisId: string
): Promise<RegistryLookupResponse> {
  // Check if CODEF credentials are configured
  const hasCodefCredentials = !!(
    process.env.CODEF_CLIENT_ID &&
    process.env.CODEF_CLIENT_SECRET &&
    process.env.CODEF_PUBLIC_KEY
  );
  const hasIrosCredentials = !!(
    process.env.CODEF_IROS_ID &&
    process.env.CODEF_IROS_PASSWORD
  );

  console.log(`[RegistryLookup] Attempting CODEF lookup... (credentials: ${hasCodefCredentials ? 'YES' : 'NO'}, IROS: ${hasIrosCredentials ? 'YES' : 'NO'})`);

  if (!hasCodefCredentials) {
    return {
      success: false,
      error: 'CODEF credentials not configured (missing CODEF_CLIENT_ID, CODEF_CLIENT_SECRET, or CODEF_PUBLIC_KEY)',
    };
  }

  const codefAPI = new CodefAPI();

  // Use structured params if available, otherwise fall back to address string
  const hasStructuredParams = addressParams.addr_sido || addressParams.addr_dong || addressParams.buildingName;
  let registryResult;

  if (hasStructuredParams) {
    console.log('[RegistryLookup] Using structured address params for CODEF');
    registryResult = await codefAPI.getRegistry({
      addr_sido: addressParams.addr_sido,
      addr_sigungu: addressParams.addr_sigungu,
      addr_dong: addressParams.addr_dong,
      addr_lotNumber: addressParams.addr_lotNumber,
      buildingName: addressParams.buildingName,
      dong: addressParams.dong,
      ho: addressParams.ho,
    }, type);
  } else {
    console.log('[RegistryLookup] Using combined address string for CODEF');
    registryResult = await codefAPI.getRegistry(addressParams.address || '', type);
  }

  if (!registryResult.success) {
    return {
      success: false,
      error: registryResult.error || 'CODEF lookup failed',
    };
  }

  // Handle address list case (multiple matches returned)
  if (registryResult.addressList && registryResult.addressList.length > 0) {
    console.log(`[RegistryLookup] CODEF returned ${registryResult.addressList.length} address matches`);

    // Select the best match: prefer matching property type and 현행 (active) status
    const typeMap: Record<string, string> = {
      '토지': '토지',
      '건물': '건물',
      '집합건물': '집합건물',
    };
    const targetType = typeMap[type] || '집합건물';

    // Priority: matching type + 현행 > matching type > 현행 > first result
    const bestMatch =
      registryResult.addressList.find(a => a.resType === targetType && a.resState === '현행') ||
      registryResult.addressList.find(a => a.resType === targetType) ||
      registryResult.addressList.find(a => a.resState === '현행') ||
      registryResult.addressList[0];

    console.log(`[RegistryLookup] Selected: [${bestMatch.resType}] ${bestMatch.commAddrLotNumber} (${bestMatch.commUniqueNo})`);

    // Fetch full registry with selected uniqueNo
    const typeCodeMap: Record<string, string> = {
      '토지': '1',
      '건물': '2',
      '집합건물': '3',
    };
    registryResult = await codefAPI.getRegistryDocument(
      { uniqueNo: bestMatch.commUniqueNo, addrLotNumber: bestMatch.commAddrLotNumber },
      typeCodeMap[type] || '3'
    );

    if (!registryResult.success || !registryResult.data) {
      return {
        success: false,
        error: registryResult.error || 'CODEF registry fetch failed for selected address',
      };
    }
  }

  if (!registryResult.data) {
    return {
      success: false,
      error: 'CODEF returned no registry data',
    };
  }

  // Parse CODEF JSON into ExcelDeunggibuData format
  const parsedData = parseCodefRegistryData(registryResult.data);

  console.log(`[RegistryLookup] CODEF parsing complete:`, {
    address: parsedData.address,
    mortgages: parsedData.mortgages.length,
    activeMortgages: parsedData.activeMortgages.length,
    totalMortgage: parsedData.totalMortgageAmount,
  });

  // Store in database (no file upload needed - JSON stored directly)
  const { data: insertData, error: insertError } = await supabase
    .from('uploaded_documents')
    .insert({
      analysis_id: analysisId,
      document_type: 'deunggibu-codef',
      original_filename: `deunggibu-codef-${Date.now()}.json`,
      file_path: '', // No file in storage - data is in parsed_data
      parsed_data: {
        ...parsedData,
        rawCodefResponse: registryResult.rawResponse,
        extractedAt: new Date().toISOString(),
      },
      ocr_text: JSON.stringify(registryResult.rawResponse, null, 2),
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (insertError || !insertData) {
    console.error('[RegistryLookup] Database insert failed:', insertError);
    return {
      success: false,
      error: 'Failed to register document',
    };
  }

  console.log(`[RegistryLookup] CODEF document registered: ${insertData.id}`);

  return {
    success: true,
    documentId: insertData.id,
    format: 'json',
    parsedData,
    source: 'codef',
  };
}
