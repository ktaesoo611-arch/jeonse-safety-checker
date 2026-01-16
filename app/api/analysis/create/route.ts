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

interface CreateAnalysisRequest {
  address: string;
  city?: string;
  district?: string;
  dong?: string;
  building?: string;
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
