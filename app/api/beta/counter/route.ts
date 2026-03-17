/**
 * GET /api/beta/counter
 *
 * Returns the current number of free beta unlocks remaining
 *
 * Response:
 * - remaining: number (free unlocks remaining)
 * - total_used: number (total unlocks used)
 */

import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase-server';

export async function GET() {
  try {
    const supabase = createServiceRoleClient();

    const { data, error } = await supabase
      .from('beta_settings')
      .select('free_unlocks_remaining, total_unlocks_used')
      .eq('id', 'default')
      .single();

    if (error) {
      console.error('[Beta Counter] Error fetching counter:', error);
      // Return default values if table doesn't exist yet
      return NextResponse.json({
        remaining: 47,
        total_used: 3
      });
    }

    return NextResponse.json({
      remaining: data.free_unlocks_remaining,
      total_used: data.total_unlocks_used
    });
  } catch (err) {
    console.error('[Beta Counter] Unexpected error:', err);
    return NextResponse.json({
      remaining: 47,
      total_used: 3
    });
  }
}
