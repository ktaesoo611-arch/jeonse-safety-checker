import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Create a fresh Supabase client for this request
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Resend the confirmation email
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'https://krent-safety.com'}/auth/callback`,
      },
    });

    if (error) {
      console.error('Resend confirmation error:', error);

      // Handle specific error cases
      if (error.message.includes('rate limit')) {
        return NextResponse.json(
          { error: 'Please wait a few minutes before requesting another email' },
          { status: 429 }
        );
      }

      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Confirmation email sent successfully'
    });

  } catch (error) {
    console.error('Resend confirmation error:', error);
    return NextResponse.json(
      { error: 'Failed to resend confirmation email' },
      { status: 500 }
    );
  }
}
