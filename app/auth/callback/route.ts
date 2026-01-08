import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const token_hash = searchParams.get('token_hash');
  const next = searchParams.get('next') ?? '/';
  const type = searchParams.get('type');

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing sessions.
          }
        },
      },
    }
  );

  let error = null;

  // Handle token_hash flow (from email links)
  if (token_hash) {
    const { error: verifyError } = await supabase.auth.verifyOtp({
      token_hash,
      type: type === 'recovery' ? 'recovery' : 'email',
    });
    error = verifyError;
  }
  // Handle code flow (PKCE)
  else if (code) {
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    error = exchangeError;
  }
  // No valid parameters
  else {
    return NextResponse.redirect(`${origin}/auth/login?error=missing_params`);
  }

  if (!error) {
    // Handle password reset/recovery flow
    if (type === 'recovery' || next.includes('reset-password')) {
      return NextResponse.redirect(`${origin}/auth/reset-password`);
    }

    // Handle email confirmation
    if (type === 'signup' || type === 'email' || next === '/') {
      return NextResponse.redirect(`${origin}/auth/login?confirmed=true`);
    }

    // Default redirect
    return NextResponse.redirect(`${origin}${next}`);
  }

  console.error('Auth callback error:', error);
  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/login?error=auth_callback_error`);
}
