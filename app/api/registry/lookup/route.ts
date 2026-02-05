/**
 * POST /api/registry/lookup
 *
 * Fetches 등기부등본 (Property Registry) using CODEF or APick API.
 *
 * CODEF returns structured JSON directly (~10s response time).
 * APick returns Excel file (~60-90s response time).
 *
 * API provider is configurable via REGISTRY_API_PROVIDER env variable.
 *
 * Request Body:
 * - address: string (full property address including unit number)
 * - type?: '토지' | '집합건물' | '건물' (default: '집합건물')
 * - analysisId: string (required - to link the document)
 *
 * Response:
 * - success: boolean
 * - documentId?: string (for calling /api/documents/parse)
 * - format?: 'json' | 'excel'
 * - parsedData?: object (parsed data)
 * - source?: 'codef' | 'apick'
 * - error?: string
 */

import { NextRequest, NextResponse } from 'next/server';
import { CodefAPI } from '@/lib/apis/codef';
import { ApickAPI } from '@/lib/apis/apick';
import { parseCodefRegistryData } from '@/lib/analyzers/codef-deunggibu-parser';
import { parseDeunggibuExcel } from '@/lib/analyzers/excel-deunggibu-parser';
import { createServiceRoleClient } from '@/lib/supabase-server';

// API Provider: 'codef' (when subscription active) or 'apick' (fallback)
const REGISTRY_API_PROVIDER = process.env.REGISTRY_API_PROVIDER || 'apick';

// APick needs more time (~60-90s), CODEF is fast (~10s)
export const maxDuration = 120;

const supabase = createServiceRoleClient();

/**
 * Translate CODEF error messages from Korean to English
 */
function translateCodefError(error: string): string {
  // Common CODEF error patterns and their English translations
  const translations: Record<string, string> = {
    '검색결과가 없습니다': 'No search results found',
    '검색어에 잘못된 철자가 없는지': 'Please check for typos',
    '정확한 주소인지 다시 한번 확인해 주세요': 'Please verify the address is correct',
    '서버 오류가 발생했습니다': 'A server error occurred',
    '인증에 실패했습니다': 'Authentication failed',
    '요청 시간이 초과되었습니다': 'Request timed out',
  };

  let translatedError = error;

  // Check if error contains CF- code pattern (e.g., CF-13006)
  const codeMatch = error.match(/^(CF-\d+):\s*/);
  const errorCode = codeMatch ? codeMatch[1] : null;
  const messageWithoutCode = codeMatch ? error.slice(codeMatch[0].length) : error;

  // Try to translate known Korean phrases
  for (const [korean, english] of Object.entries(translations)) {
    if (messageWithoutCode.includes(korean)) {
      translatedError = messageWithoutCode.replace(korean, english);
    }
  }

  // If the error still contains Korean characters, provide a generic English message
  const hasKorean = /[가-힣]/.test(translatedError);
  if (hasKorean) {
    // Common error codes and their meanings
    if (errorCode === 'CF-13006') {
      return 'No property found. Please verify the address and unit number are correct.';
    }
    // Generic fallback for other Korean errors
    return 'Property lookup failed. Please check the address and try again.';
  }

  return translatedError;
}

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
  floor?: string;            // 층 (e.g., "2")
  // Other params
  type?: '토지' | '집합건물' | '건물';
  analysisId: string;
}

interface RegistryLookupResponse {
  success: boolean;
  documentId?: string;
  format?: 'json' | 'excel';
  parsedData?: any;
  source?: 'codef' | 'apick';
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
    console.log(`[RegistryLookup] API Provider: ${REGISTRY_API_PROVIDER}`);
    if (hasStructuredAddress) {
      console.log(`[RegistryLookup] Structured: sido=${body.addr_sido}, sigungu=${body.addr_sigungu}, dong=${body.addr_dong}, lot=${body.addr_lotNumber}, building=${body.buildingName}, 동=${body.dong}, 호=${body.ho}, 층=${body.floor}`);
    }

    // Update analysis status to 'processing' immediately
    await supabase
      .from('analysis_results')
      .update({ status: 'processing' })
      .eq('id', body.analysisId);

    // Check CODEF credentials availability
    const hasCodefCredentials = !!(
      process.env.CODEF_CLIENT_ID &&
      process.env.CODEF_CLIENT_SECRET &&
      process.env.CODEF_PUBLIC_KEY
    );

    // Select API provider based on config and credentials
    let result: RegistryLookupResponse;

    if (REGISTRY_API_PROVIDER === 'codef' && hasCodefCredentials) {
      console.log('[RegistryLookup] Using CODEF API');
      result = await fetchViaCodef({
        address: body.address,
        addr_sido: body.addr_sido,
        addr_sigungu: body.addr_sigungu,
        addr_dong: body.addr_dong,
        addr_lotNumber: body.addr_lotNumber,
        buildingName: body.buildingName,
        dong: body.dong,
        ho: body.ho,
        floor: body.floor,
      }, propertyType, body.analysisId);
    } else {
      // Use APick: Build combined address from structured params if needed
      let combinedAddress = body.address || '';
      if (!combinedAddress && hasStructuredAddress) {
        combinedAddress = [
          body.addr_sido,
          body.addr_sigungu,
          body.addr_dong,
          body.addr_lotNumber,
          body.buildingName,
          body.dong && `${body.dong}동`,
          body.ho && `${body.ho}호`,
        ].filter(Boolean).join(' ');
      }
      console.log(`[RegistryLookup] Using APick API with address: ${combinedAddress}`);
      result = await fetchViaApick(combinedAddress, propertyType, body.analysisId);
    }

    // If lookup failed, mark analysis as failed with error message
    if (!result.success && result.error) {
      console.log(`[RegistryLookup] ${result.source || 'API'} failed, marking analysis as failed`);
      console.log(`[RegistryLookup] Error: ${result.error}`);

      // Translate error message to English for user display
      const translatedError = translateCodefError(result.error);

      // Update analysis status to failed with error message
      const { error: updateError } = await supabase
        .from('analysis_results')
        .update({
          status: 'failed',
          deunggibu_data: {
            error: translatedError,
            errorCode: 'REGISTRY_LOOKUP_FAILED',
            originalError: result.error, // Keep original for debugging
            failedAt: new Date().toISOString()
          }
        })
        .eq('id', body.analysisId);

      if (updateError) {
        console.error('[RegistryLookup] Failed to update analysis status:', updateError);
      }
    }

    return NextResponse.json(result);

  } catch (error: any) {
    console.error('[RegistryLookup] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'A server error occurred' },
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
    floor?: string;
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
      floor: addressParams.floor,
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

    // Build floor+ho matching pattern for address list selection
    // e.g., floor="2", ho="1" → match addresses containing "제2층" and "제1호"
    const userFloor = addressParams.floor;
    const userHo = addressParams.ho;
    const matchesFloorHo = (addr: string) => {
      if (!userFloor && !userHo) return false;
      const floorOk = !userFloor || addr.includes(`제${userFloor}층`) || addr.includes(`${userFloor}층`);
      const hoOk = !userHo || addr.includes(`제${userHo}호`) || addr.includes(`${userHo}호`);
      return floorOk && hoOk;
    };

    // Priority: type + 현행 + floor/ho > type + floor/ho > type + 현행 > type > 현행 > first
    const bestMatch =
      registryResult.addressList.find(a => a.resType === targetType && a.resState === '현행' && matchesFloorHo(a.commAddrLotNumber)) ||
      registryResult.addressList.find(a => a.resType === targetType && matchesFloorHo(a.commAddrLotNumber)) ||
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

/**
 * Fetch registry via APick API (fallback - Excel format)
 *
 * APick returns an Excel file which we parse into ExcelDeunggibuData format.
 * Takes longer (~60-90s) but is more cost-effective at low traffic.
 */
async function fetchViaApick(
  address: string,
  type: '토지' | '집합건물' | '건물',
  analysisId: string
): Promise<RegistryLookupResponse> {
  // Check if APick API key is configured
  if (!process.env.APICK_API_KEY) {
    return {
      success: false,
      source: 'apick',
      error: 'APick API key not configured (missing APICK_API_KEY)',
    };
  }

  console.log(`[RegistryLookup] Attempting APick lookup for: "${address}" (length: ${address.length})`);
  console.log(`[RegistryLookup] APick API key configured: ${!!process.env.APICK_API_KEY}`);

  const apickAPI = new ApickAPI();

  // Request registry with Excel format for parsing
  const registryResult = await apickAPI.getRegistry(address, type, 'excel');

  if (!registryResult.success || !registryResult.fileBuffer) {
    return {
      success: false,
      source: 'apick',
      error: registryResult.error || 'APick lookup failed',
    };
  }

  console.log(`[RegistryLookup] APick returned Excel file, size: ${registryResult.fileBuffer.length} bytes`);

  // Parse Excel buffer into ExcelDeunggibuData format
  const parsedData = parseDeunggibuExcel(registryResult.fileBuffer);

  console.log(`[RegistryLookup] APick parsing complete:`, {
    address: parsedData.address,
    mortgages: parsedData.mortgages.length,
    activeMortgages: parsedData.activeMortgages.length,
    totalMortgage: parsedData.totalMortgageAmount,
  });

  // Upload Excel file to Supabase storage
  const filename = `deunggibu-apick-${Date.now()}.xlsx`;
  const storagePath = `deunggibu/${analysisId}/${filename}`;

  const { error: uploadError } = await supabase.storage
    .from('documents')
    .upload(storagePath, registryResult.fileBuffer, {
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      upsert: true,
    });

  if (uploadError) {
    console.error('[RegistryLookup] Storage upload failed:', uploadError);
    // Continue anyway - we have the parsed data
  }

  // Store document record in database (matching CODEF structure)
  const { data: insertData, error: insertError } = await supabase
    .from('uploaded_documents')
    .insert({
      analysis_id: analysisId,
      document_type: 'deunggibu-apick',
      original_filename: filename,
      file_path: uploadError ? '' : storagePath,
      parsed_data: {
        ...parsedData,
        apickIcId: registryResult.ic_id,
        apickCost: registryResult.cost,
        extractedAt: new Date().toISOString(),
      },
      // Store parsed data as ocr_text for LLM fallback parsing (like CODEF's rawResponse)
      ocr_text: JSON.stringify(parsedData, null, 2),
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (insertError || !insertData) {
    console.error('[RegistryLookup] Database insert failed:', insertError);
    return {
      success: false,
      source: 'apick',
      error: 'Failed to register document',
    };
  }

  console.log(`[RegistryLookup] APick document registered: ${insertData.id}`);

  return {
    success: true,
    documentId: insertData.id,
    format: 'excel',
    parsedData,
    source: 'apick',
  };
}
