/**
 * POST /api/beta/unlock
 *
 * Captures user email and decrements the free beta counter
 *
 * Request Body:
 * - email: string (user's email address)
 * - analysisId: string (UUID of the analysis)
 * - type: string ('jeonse' or 'wolse')
 *
 * Response:
 * - success: boolean
 * - remaining: number (free unlocks remaining after this unlock)
 * - error?: string (if failed)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase-server';

interface UnlockRequest {
  email: string;
  analysisId: string;
  type: 'jeonse' | 'wolse';
}

export async function POST(request: NextRequest) {
  try {
    const body: UnlockRequest = await request.json();
    const { email, analysisId, type } = body;

    // Validate input
    if (!email || !analysisId || !type) {
      return NextResponse.json(
        { error: 'Missing required fields', success: false },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format', success: false },
        { status: 400 }
      );
    }

    const supabase = createServiceRoleClient();

    // Check current counter
    const { data: settings, error: settingsError } = await supabase
      .from('beta_settings')
      .select('free_unlocks_remaining')
      .eq('id', 'default')
      .single();

    if (settingsError) {
      console.error('[Beta Unlock] Error fetching settings:', settingsError);
      // If table doesn't exist, allow unlock but don't decrement
      // This graceful degradation ensures the flow works during migration
    }

    // Check if free unlocks are available
    if (settings && settings.free_unlocks_remaining <= 0) {
      return NextResponse.json(
        { error: 'NO_FREE_UNLOCKS', success: false, remaining: 0 },
        { status: 400 }
      );
    }

    // Check if this is a test email (bypass counter decrement)
    const testEmails = (process.env.BETA_TEST_EMAILS || '')
      .split(',')
      .map(e => e.trim().toLowerCase())
      .filter(Boolean);
    const isTestEmail = testEmails.includes(email.toLowerCase());

    // Check if this email + analysis combo already exists (prevent duplicate unlocks)
    const { data: existingCapture } = await supabase
      .from('beta_email_captures')
      .select('id')
      .eq('email', email.toLowerCase())
      .eq('analysis_id', analysisId)
      .single();

    if (existingCapture) {
      // Already unlocked - return success without decrementing
      return NextResponse.json({
        success: true,
        remaining: settings?.free_unlocks_remaining || 47,
        message: 'Already unlocked'
      });
    }

    // Insert email capture
    const { error: insertError } = await supabase
      .from('beta_email_captures')
      .insert({
        email: email.toLowerCase(),
        analysis_id: analysisId,
        analysis_type: type
      });

    if (insertError) {
      console.error('[Beta Unlock] Error inserting email capture:', insertError);
      // Don't decrement counter if email capture failed
      return NextResponse.json(
        { error: 'Failed to save email', success: false },
        { status: 500 }
      );
    }

    // Decrement counter only after successful email capture (skip for test emails)
    const currentRemaining = settings?.free_unlocks_remaining ?? 47;
    let newRemaining = currentRemaining;

    if (!isTestEmail) {
      newRemaining = currentRemaining - 1;

      const { error: updateError } = await supabase
        .from('beta_settings')
        .update({
          free_unlocks_remaining: newRemaining,
          total_unlocks_used: (settings ? 50 - settings.free_unlocks_remaining : 3) + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', 'default');

      if (updateError) {
        console.error('[Beta Unlock] Error updating counter:', updateError);
      }
    } else {
      console.log(`[Beta Unlock] Test email detected, skipping counter decrement`);
    }

    console.log(`[Beta Unlock] Email captured: ${email}, Analysis: ${analysisId}, Type: ${type}, Remaining: ${newRemaining}, Test: ${isTestEmail}`);

    return NextResponse.json({
      success: true,
      remaining: newRemaining
    });

  } catch (err) {
    console.error('[Beta Unlock] Unexpected error:', err);
    return NextResponse.json(
      { error: 'Internal server error', success: false },
      { status: 500 }
    );
  }
}
