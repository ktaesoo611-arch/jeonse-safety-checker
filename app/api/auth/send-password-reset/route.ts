import { NextResponse } from 'next/server';
import { emailService } from '@/lib/services/email-service';
import { supabaseAdmin } from '@/lib/supabase';

interface PasswordResetPayload {
  email: string;
  reset_url: string;
  user_id: string;
}

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    const webhookSecret = process.env.SUPABASE_AUTH_WEBHOOK_SECRET;

    if (webhookSecret && authHeader !== `Bearer ${webhookSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload: PasswordResetPayload = await request.json();

    // Get user name from database
    let userName = '';
    if (supabaseAdmin) {
      const { data: user } = await supabaseAdmin.auth.admin.getUserById(
        payload.user_id
      );
      userName = user?.user?.user_metadata?.full_name || '';
    }

    const result = await emailService.sendPasswordReset(payload.email, {
      userName,
      resetUrl: payload.reset_url,
    });

    if (!result.success) {
      console.error('Failed to send password reset email:', result.error);
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true, emailId: result.id });
  } catch (error) {
    console.error('Password reset email webhook error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
