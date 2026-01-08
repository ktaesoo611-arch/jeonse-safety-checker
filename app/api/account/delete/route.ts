import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { createClient } from '@supabase/supabase-js';

export async function DELETE() {
  try {
    const supabase = await createServerSupabaseClient();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('Auth error:', authError);
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = user.id;
    console.log('Deleting account for user:', userId);

    // Create admin client for this request
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      console.error('Missing Supabase config:', {
        hasUrl: !!supabaseUrl,
        hasServiceKey: !!serviceRoleKey
      });
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Delete user's data from all related tables
    // Using try-catch for each to handle tables that might not exist

    // 1. Get user's analyses first
    const { data: userAnalyses, error: fetchError } = await supabaseAdmin
      .from('analyses')
      .select('id')
      .eq('user_id', userId);

    if (fetchError) {
      console.log('No analyses table or fetch error (non-critical):', fetchError.message);
    }

    if (userAnalyses && userAnalyses.length > 0) {
      const analysisIds = userAnalyses.map((a: { id: string }) => a.id);
      console.log('Found analyses to delete:', analysisIds.length);

      // Delete extension table data (ignore errors - tables might not exist)
      const tables = ['jeonse_safety_data', 'wolse_price_data', 'wolse_safety_data'];
      for (const table of tables) {
        const { error } = await supabaseAdmin
          .from(table)
          .delete()
          .in('analysis_id', analysisIds);
        if (error) console.log(`Delete from ${table} (non-critical):`, error.message);
      }
    }

    // 2. Delete from analyses table
    const { error: analysesError } = await supabaseAdmin
      .from('analyses')
      .delete()
      .eq('user_id', userId);
    if (analysesError) console.log('Delete from analyses (non-critical):', analysesError.message);

    // 3. Delete from legacy tables if they exist
    const legacyTables = ['analysis_results', 'wolse_analyses'];
    for (const table of legacyTables) {
      const { error } = await supabaseAdmin
        .from(table)
        .delete()
        .eq('user_id', userId);
      if (error) console.log(`Delete from ${table} (non-critical):`, error.message);
    }

    // 4. Delete the user from Supabase Auth - this is the critical step
    console.log('Deleting user from auth...');
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (deleteError) {
      console.error('Error deleting user from auth:', deleteError);
      return NextResponse.json(
        { error: `Failed to delete account: ${deleteError.message}` },
        { status: 500 }
      );
    }

    console.log('Account deleted successfully');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Account deletion error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `Internal server error: ${message}` },
      { status: 500 }
    );
  }
}
