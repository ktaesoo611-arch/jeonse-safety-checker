'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface AuthFormProps {
  mode: 'login' | 'signup';
}

export default function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [showResendConfirmation, setShowResendConfirmation] = useState(false);
  const [resendEmail, setResendEmail] = useState('');
  const [isResending, setIsResending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setIsLoading(true);

    try {
      if (mode === 'signup') {
        // Validate passwords match
        if (password !== confirmPassword) {
          setError('Passwords do not match');
          setIsLoading(false);
          return;
        }

        // Validate password length
        if (password.length < 6) {
          setError('Password must be at least 6 characters');
          setIsLoading(false);
          return;
        }

        // Sign up
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: name,
            },
          },
        });

        if (signUpError) {
          setError(signUpError.message);
          setIsLoading(false);
          return;
        }

        // If session exists, email confirmation is disabled - auto login
        if (data.session) {
          router.push('/');
          router.refresh();
          return;
        }

        // Email confirmation is required
        setMessage('Please check your email to confirm your account');
        setIsLoading(false);
      } else {
        // Log in
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) {
          // Check if it's an email not confirmed error
          if (signInError.message.toLowerCase().includes('email not confirmed')) {
            setShowResendConfirmation(true);
            setResendEmail(email);
            setError('Your email has not been confirmed yet. Please check your inbox or request a new confirmation email.');
          } else {
            setError(signInError.message);
          }
          setIsLoading(false);
          return;
        }

        // Redirect to home page
        router.push('/');
        router.refresh();
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
      setIsLoading(false);
    }
  };

  const handleResendConfirmation = async () => {
    if (!resendEmail) return;

    setIsResending(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch('/api/auth/resend-confirmation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resendEmail }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to resend confirmation email');
      } else {
        setMessage('Confirmation email sent! Please check your inbox and spam folder.');
        setShowResendConfirmation(false);
      }
    } catch (err) {
      setError('Failed to resend confirmation email. Please try again.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl">
          <p className="text-sm text-red-600 flex items-center gap-2">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </p>
          {showResendConfirmation && (
            <button
              type="button"
              onClick={handleResendConfirmation}
              disabled={isResending}
              className="mt-3 w-full px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 text-sm font-medium rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isResending ? (
                <>
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Sending...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Resend Confirmation Email
                </>
              )}
            </button>
          )}
        </div>
      )}

      {message && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-2xl">
          <p className="text-sm text-green-600 flex items-center gap-2">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {message}
          </p>
        </div>
      )}

      {mode === 'signup' && (
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-[#2D3748] mb-2">
            Full Name
          </label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full px-4 py-3 border-2 border-amber-100 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 transition-all bg-amber-50/30 text-[#1A202C] placeholder-[#718096]"
            placeholder="Enter your full name"
          />
        </div>
      )}

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-[#2D3748] mb-2">
          Email Address
        </label>
        <input
          type="email"
          id="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full px-4 py-3 border-2 border-amber-100 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 transition-all bg-amber-50/30 text-[#1A202C] placeholder-[#718096]"
          placeholder="your@email.com"
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-[#2D3748] mb-2">
          Password
        </label>
        <input
          type="password"
          id="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          className="w-full px-4 py-3 border-2 border-amber-100 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 transition-all bg-amber-50/30 text-[#1A202C] placeholder-[#718096]"
          placeholder="Enter your password"
        />
      </div>

      {mode === 'signup' && (
        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-[#2D3748] mb-2">
            Confirm Password
          </label>
          <input
            type="password"
            id="confirmPassword"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={6}
            className="w-full px-4 py-3 border-2 border-amber-100 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 transition-all bg-amber-50/30 text-[#1A202C] placeholder-[#718096]"
            placeholder="Confirm your password"
          />
        </div>
      )}

      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white px-6 py-3.5 rounded-xl hover:shadow-lg hover:shadow-amber-200/50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none transition-all font-semibold flex items-center justify-center gap-2 hover:-translate-y-0.5 disabled:hover:translate-y-0"
      >
        {isLoading ? (
          <>
            <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Please wait...
          </>
        ) : (
          <>
            {mode === 'login' ? 'Log In' : 'Sign Up'}
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </>
        )}
      </button>

      {mode === 'login' && (
        <div className="text-center">
          <a href="/auth/forgot-password" className="text-sm text-amber-600 hover:text-amber-700 font-medium">
            Forgot your password?
          </a>
        </div>
      )}
    </form>
  );
}
