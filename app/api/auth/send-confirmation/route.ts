import { NextResponse } from 'next/server';
import { emailService } from '@/lib/services/email-service';

interface SupabaseAuthPayload {
  type: 'signup' | 'email_change';
  email: string;
  user_id: string;
  confirmation_url: string;
  metadata?: {
    full_name?: string;
  };
}

export async function POST(request: Request) {
  try {
    // Verify webhook secret (optional but recommended)
    const authHeader = request.headers.get('authorization');
    const webhookSecret = process.env.SUPABASE_AUTH_WEBHOOK_SECRET;

    if (webhookSecret && authHeader !== `Bearer ${webhookSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload: SupabaseAuthPayload = await request.json();

    if (payload.type !== 'signup') {
      return NextResponse.json({ message: 'Ignored non-signup event' });
    }

    const result = await emailService.sendSignupConfirmation(payload.email, {
      userName: payload.metadata?.full_name || '',
      confirmationUrl: payload.confirmation_url,
    });

    if (!result.success) {
      console.error('Failed to send confirmation email:', result.error);
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true, emailId: result.id });
  } catch (error) {
    console.error('Confirmation email webhook error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
