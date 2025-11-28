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
import { createServerSupabaseClient } from '@/lib/supabase-server';

interface CreateAnalysisRequest {
  address: string;
  city?: string;
  district?: string;
  dong?: string;
  building?: string;
  proposedJeonse: number;
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized. Please log in to create an analysis.' },
        { status: 401 }
      );
    }

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
    const city = body.city || body.address.split(' ')[0] || '';
    const district = body.district || body.address.split(' ')[1] || '';
    const dong = body.dong || body.address.split(' ')[2] || '';
    const building = body.building || '';

    // Create or find property
    let propertyId: string;

    const { data: existingProperty, error: findError } = await supabase
      .from('properties')
      .select('id')
      .eq('address', body.address)
      .single();

    if (existingProperty) {
      propertyId = existingProperty.id;

      // Update building name if provided
      if (building) {
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

    // Create analysis record (linked to authenticated user)
    const { data: analysis, error: analysisError } = await supabase
      .from('analysis_results')
      .insert([
        {
          property_id: propertyId,
          user_id: user.id,
          proposed_jeonse: body.proposedJeonse,
          status: 'pending',
          created_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (analysisError || !analysis) {
      console.error('Analysis creation error:', analysisError);
      return NextResponse.json(
        { error: 'Failed to create analysis', details: analysisError?.message },
        { status: 500 }
      );
    }

    // Return success response
    return NextResponse.json(
      {
        analysisId: analysis.id,
        propertyId: propertyId,
        status: analysis.status,
        createdAt: analysis.created_at,
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
