import { NextResponse } from 'next/server';
import { emailService } from '@/lib/services/email-service';
import crypto from 'crypto';

/**
 * Supabase Send Email Hook payload format
 */
interface SupabaseSendEmailPayload {
  user: {
    id: string;
    email: string;
    user_metadata?: {
      full_name?: string;
    };
  };
  email_data: {
    token: string;
    token_hash: string;
    redirect_to: string;
    email_action_type: 'signup' | 'recovery' | 'invite' | 'magiclink' | 'email_change';
    site_url: string;
  };
}

/**
 * Verify Supabase webhook signature
 */
function verifySupabaseSignature(
  payload: string,
  signature: string | null,
  secret: string
): boolean {
  if (!signature) return false;

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const webhookSecret = process.env.SUPABASE_AUTH_WEBHOOK_SECRET;

    // Verify signature if secret is configured
    if (webhookSecret) {
      const signature = request.headers.get('x-supabase-signature');

      // If no signature header, check authorization header as fallback
      if (!signature) {
        const authHeader = request.headers.get('authorization');
        if (authHeader !== `Bearer ${webhookSecret}`) {
          console.error('Webhook authentication failed - no valid signature or auth header');
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
      } else {
        // Verify HMAC signature
        const isValid = verifySupabaseSignature(rawBody, signature, webhookSecret);
        if (!isValid) {
          console.error('Webhook signature verification failed');
          return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
        }
      }
    }

    const payload: SupabaseSendEmailPayload = JSON.parse(rawBody);

    console.log('Received Supabase Send Email hook:', {
      userId: payload.user?.id,
      email: payload.user?.email,
      actionType: payload.email_data?.email_action_type,
    });

    // Only handle signup confirmation emails
    if (payload.email_data?.email_action_type !== 'signup') {
      console.log('Ignoring non-signup email action:', payload.email_data?.email_action_type);
      return NextResponse.json({ success: true, message: 'Ignored non-signup event' });
    }

    // Build confirmation URL
    const siteUrl = payload.email_data.site_url || process.env.NEXT_PUBLIC_APP_URL || 'https://krent-safety.com';
    const confirmationUrl = `${siteUrl}/auth/callback?token_hash=${payload.email_data.token_hash}&type=signup`;

    // Send email via Resend
    const result = await emailService.sendSignupConfirmation(payload.user.email, {
      userName: payload.user.user_metadata?.full_name || '',
      confirmationUrl,
    });

    if (!result.success) {
      console.error('Failed to send confirmation email:', result.error);
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    console.log('Confirmation email sent successfully:', result.id);
    return NextResponse.json({ success: true, emailId: result.id });

  } catch (error) {
    console.error('Confirmation email webhook error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
