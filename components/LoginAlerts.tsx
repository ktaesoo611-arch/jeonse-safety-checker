'use client';

import { useSearchParams } from 'next/navigation';

export default function LoginAlerts() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');
  const confirmed = searchParams.get('confirmed');

  return (
    <>
      {error === 'auth_callback_error' && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-2xl">
          <p className="text-sm text-red-600">
            There was a problem confirming your email. Please try signing up again or contact support.
          </p>
        </div>
      )}

      {confirmed === 'true' && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-2xl">
          <p className="text-sm text-green-600">
            Your email has been confirmed! You can now log in.
          </p>
        </div>
      )}
    </>
  );
}
