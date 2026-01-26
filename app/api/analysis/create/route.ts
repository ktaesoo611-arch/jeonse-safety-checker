/**
 * POST /api/analysis/create
 *
 * Creates a new jeonse safety analysis
 *
 * Request Body:
 * - address: string (property address)
 * - proposedJeonse: number (proposed jeonse amount in KRW)
 *
 * Response:
 * - analysisId: string (UUID for tracking)
 * - propertyId: string (UUID of property)
 * - status: 'pending' | 'processing' | 'completed' | 'failed'
 * - createdAt: string (ISO timestamp)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase-server';
import { parseKoreanAddress } from '@/lib/utils/address-parser';
import { buildingRegistryAPI } from '@/lib/apis/building-registry';

import { BuildingType } from '@/lib/types';

interface CreateAnalysisRequest {
  address: string;
  jibunAddress?: string; // Lot-based address for building type detection (e.g., "서울 중구 황학동 970")
  city?: string;
  district?: string;
  dong?: string;
  building?: string;
  buildingType?: BuildingType; // 'apartment' or 'multifamily'
  proposedJeonse: number;
  analysisType?: 'jeonse' | 'wolse';
  exclusiveArea?: number;
  monthlyRent?: number;
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication (optional - anonymous users allowed for beta flow)
    const authClient = await createServerSupabaseClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();

    // Use service role client for DB operations (bypasses RLS for anonymous users)
    const supabase = createServiceRoleClient();

    // Debug logging
    console.log('Auth check:', {
      hasUser: !!user,
      userId: user?.id || 'anonymous',
      cookies: request.cookies.getAll().map(c => c.name),
    });

    // Note: Authentication is now optional - users can create analyses without logging in
    // Email capture happens at the preview page unlock step

    // Parse request body
    const body: CreateAnalysisRequest = await request.json();

    // Validate required fields
    if (!body.address || typeof body.address !== 'string') {
      return NextResponse.json(
        { error: 'Invalid or missing address' },
        { status: 400 }
      );
    }

    if (!body.proposedJeonse || typeof body.proposedJeonse !== 'number' || body.proposedJeonse <= 0) {
      return NextResponse.json(
        { error: 'Invalid or missing proposedJeonse (must be positive number)' },
        { status: 400 }
      );
    }

    // Use provided structured address data or parse from address string
    const city = body.city || body.address.split(' ')[0];
    const district = body.district || body.address.split(' ')[1];
    const dong = body.dong || body.address.split(' ')[2];
    const building = body.building || '';
    const buildingType = body.buildingType || 'apartment'; // Default to apartment for backwards compatibility
    const analysisType = body.analysisType || 'jeonse';
    const exclusiveArea = body.exclusiveArea || null;
    const monthlyRent = body.monthlyRent || null;

    // Validate required fields (city, district, dong are NOT NULL in database)
    if (!city || !district || !dong) {
      return NextResponse.json(
        {
          error: 'Invalid address format. City, district, and dong are required.',
          details: `Missing: ${!city ? 'city ' : ''}${!district ? 'district ' : ''}${!dong ? 'dong' : ''}`
        },
        { status: 400 }
      );
    }

    // Step: Detect building type and check if supported
    // Only 아파트 (apartment) and 연립/다세대 (multifamily) are currently supported
    let detectedBuildingType: BuildingType = buildingType;

    // If user didn't specify building type, try to detect it
    if (!body.buildingType) {
      try {
        // Use jibunAddress (lot-based) for parsing as it contains dong name (e.g., "황학동")
        // Road name addresses (도로명주소) don't contain dong which is needed for building registry lookup
        const addressForParsing = body.jibunAddress || body.address;
        const addressComponents = parseKoreanAddress(addressForParsing);
        console.log('🏠 Parsed address components:', addressComponents, 'from:', addressForParsing);
        if (addressComponents) {
          console.log('🏠 Detecting building type for:', addressForParsing);
          const rawBuildingType = await buildingRegistryAPI.detectBuildingType(
            addressComponents.sigunguCd,
            addressComponents.bjdongCd,
            addressComponents.bun,
            addressComponents.ji
          );
          detectedBuildingType = rawBuildingType;
          console.log(`   ✅ Detected building type: ${detectedBuildingType}`);
        } else {
          console.log('⚠️ Could not parse address for building type detection');
        }
      } catch (error) {
        console.error('⚠️ Building type detection failed:', error);
        // Continue with default 'apartment' - will be validated below
      }
    }

    console.log(`Creating analysis: type=${analysisType}, buildingType=${detectedBuildingType}, building="${building || '(none)'}"`);

    // Check if building type is supported
    const supportedTypes: BuildingType[] = ['apartment', 'multifamily'];
    if (!supportedTypes.includes(detectedBuildingType)) {
      const buildingTypeLabels: Record<string, string> = {
        'officetel': '오피스텔',
        'unknown': '알 수 없는 건물 유형',
      };
      const buildingTypeLabel = buildingTypeLabels[detectedBuildingType] || detectedBuildingType;

      console.log(`❌ Unsupported building type: ${buildingTypeLabel} (${detectedBuildingType})`);
      return NextResponse.json(
        {
          error: 'Unsupported building type',
          errorCode: 'UNSUPPORTED_BUILDING_TYPE',
          buildingType: detectedBuildingType,
          buildingTypeLabel,
          message: `${buildingTypeLabel} properties are not yet supported. Currently, only apartments (아파트) and multi-family housing (연립/다세대) can be analyzed.`,
        },
        { status: 400 }
      );
    }

    // Create or find property
    let propertyId: string;

    // Query for existing property - use maybeSingle() instead of single() to handle multiple matches
    const { data: existingProperty, error: findError } = await supabase
      .from('properties')
      .select('id, building_name')
      .eq('address', body.address)
      .is('building_number', null)
      .is('floor', null)
      .is('unit', null)
      .maybeSingle();

    if (findError) {
      console.error('Property lookup error:', findError);
      return NextResponse.json(
        { error: 'Failed to lookup property', details: findError.message },
        { status: 500 }
      );
    }

    if (existingProperty) {
      propertyId = existingProperty.id;

      // Update building name if provided and different
      if (building && building !== existingProperty.building_name) {
        await supabase
          .from('properties')
          .update({ building_name: building })
          .eq('id', propertyId);
      }
    } else {
      // Create new property
      const { data: newProperty, error: propertyError} = await supabase
        .from('properties')
        .insert([
          {
            address: body.address,
            city,
            district,
            dong,
            building_name: building,
            exclusive_area: exclusiveArea,
            created_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (propertyError || !newProperty) {
        console.error('Property creation error:', propertyError);
        return NextResponse.json(
          { error: 'Failed to create property', details: propertyError?.message },
          { status: 500 }
        );
      }

      propertyId = newProperty.id;
    }

    // Use old schema (analysis_results) as primary - all existing APIs depend on it
    let analysisId: string;
    let analysisStatus: string = 'pending';
    let analysisCreatedAt: string = new Date().toISOString();

    // Create analysis in old schema (analysis_results) - this is what all APIs expect
    // Note: monthly_rent is stored in sessionStorage on client and passed when analysis runs
    const insertData = {
      property_id: propertyId,
      user_id: user?.id || null, // Allow anonymous users
      proposed_jeonse: body.proposedJeonse,
      status: 'pending',
      created_at: new Date().toISOString(),
    };

    const { data: analysis, error: analysisError } = await supabase
      .from('analysis_results')
      .insert([insertData])
      .select()
      .single();

    if (analysisError || !analysis) {
      console.error('Analysis creation error:', analysisError);
      return NextResponse.json(
        { error: 'Failed to create analysis', details: analysisError?.message },
        { status: 500 }
      );
    }

    analysisId = analysis.id;
    analysisStatus = analysis.status;
    analysisCreatedAt = analysis.created_at;
    console.log(`✅ Created analysis in analysis_results: ${analysisId} (type: ${analysisType})`);

    // For wolse, also create entry in new schema (analyses table) to store monthly_rent
    if (analysisType === 'wolse') {
      await supabase
        .from('analyses')
        .upsert({
          id: analysisId,
          type: 'wolse_price',
          property_id: propertyId,
          user_id: user?.id || null, // Allow anonymous users
          status: 'pending',
          created_at: new Date().toISOString(),
        });
      console.log(`✅ Also created analyses entry for wolse: ${analysisId}`);
    }

    // Return success response
    return NextResponse.json(
      {
        analysisId: analysisId,
        propertyId: propertyId,
        buildingType: detectedBuildingType, // Include detected type for downstream use
        status: analysisStatus,
        createdAt: analysisCreatedAt,
        message: 'Analysis created successfully',
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
