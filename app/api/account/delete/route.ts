import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/supabase';

export async function DELETE() {
  try {
    const supabase = await createServerSupabaseClient();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = user.id;

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    // Delete user's data from all related tables
    // Order matters due to foreign key constraints

    // 1. Delete from jeonse_safety_data (via analyses)
    const { data: userAnalyses } = await supabaseAdmin
      .from('analyses')
      .select('id')
      .eq('user_id', userId);

    if (userAnalyses && userAnalyses.length > 0) {
      const analysisIds = userAnalyses.map((a: { id: string }) => a.id);

      // Delete extension table data
      await supabaseAdmin
        .from('jeonse_safety_data')
        .delete()
        .in('analysis_id', analysisIds);

      await supabaseAdmin
        .from('wolse_price_data')
        .delete()
        .in('analysis_id', analysisIds);

      await supabaseAdmin
        .from('wolse_safety_data')
        .delete()
        .in('analysis_id', analysisIds);
    }

    // 2. Delete from analyses table
    await supabaseAdmin
      .from('analyses')
      .delete()
      .eq('user_id', userId);

    // 3. Delete from legacy tables if they exist
    await supabaseAdmin
      .from('analysis_results')
      .delete()
      .eq('user_id', userId);

    await supabaseAdmin
      .from('wolse_analyses')
      .delete()
      .eq('user_id', userId);

    // 4. Delete the user from Supabase Auth
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (deleteError) {
      console.error('Error deleting user from auth:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete account' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Account deletion error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
