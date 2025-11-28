import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function POST(request: Request) {
  try {
    // Check if dev mode is enabled
    if (process.env.NEXT_PUBLIC_ENABLE_DEV_MODE !== 'true') {
      return NextResponse.json(
        { error: 'Dev mode is not enabled' },
        { status: 403 }
      );
    }

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

    // Update analysis_results to mark payment as approved (dev mode)
    const { error: updateError } = await supabaseAdmin
      .from('analysis_results')
      .update({
        payment_status: 'approved',
        payment_key: 'dev-mode-skip',
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
      message: 'Payment skipped in dev mode',
    });

  } catch (error) {
    console.error('Error in skip-dev payment:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
