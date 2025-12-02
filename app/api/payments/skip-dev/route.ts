import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { analysisId } = body;

    if (!analysisId) {
      return NextResponse.json(
        { error: 'Missing analysisId' },
        { status: 400 }
      );
    }

    // Verify user is authenticated
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify the analysis belongs to the user
    const { data: analysis, error: analysisError } = await supabaseAdmin
      .from('analysis_results')
      .select('id, user_id')
      .eq('id', analysisId)
      .single();

    if (analysisError || !analysis) {
      return NextResponse.json(
        { error: 'Analysis not found' },
        { status: 404 }
      );
    }

    if (analysis.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized - analysis does not belong to user' },
        { status: 403 }
      );
    }

    // Update analysis_results to mark payment as approved (free beta)
    const { error: updateError } = await supabaseAdmin
      .from('analysis_results')
      .update({
        payment_status: 'approved',
        payment_key: 'free-beta',
        payment_amount: 0,
      })
      .eq('id', analysisId);

    if (updateError) {
      console.error('Error updating analysis:', updateError);
      return NextResponse.json(
        { error: 'Failed to update analysis' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Payment approved for free beta',
    });

  } catch (error) {
    console.error('Error in skip-dev payment:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
