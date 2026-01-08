import { Suspense } from 'react';
import Link from 'next/link';
import AuthForm from '@/components/AuthForm';
import LoginAlerts from '@/components/LoginAlerts';

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center p-4 relative">
      {/* Warm gradient background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-[#FEF7ED] via-[#FDFBF7] to-[#F5F0E8]" />
        <div className="absolute top-20 left-[10%] w-64 h-64 bg-amber-200/30 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-[10%] w-48 h-48 bg-orange-200/30 rounded-full blur-3xl" />
      </div>

      <div className="max-w-md w-full relative z-10">
        {/* Logo/Brand */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-3 group mb-4">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl blur-md opacity-50 group-hover:opacity-70 transition-opacity" />
              <div className="relative w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-amber-200 group-hover:scale-105 transition-transform">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              </div>
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
              K-Rent Safety
            </span>
          </Link>
          <p className="text-[#4A5568]">
            Welcome back! Please log in to your account
          </p>
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-3xl shadow-xl shadow-amber-100/50 p-8 border border-amber-100">
          <h2 className="text-2xl font-bold text-[#1A202C] mb-6">Log In</h2>

          <Suspense fallback={null}>
            <LoginAlerts />
          </Suspense>

          <AuthForm mode="login" />

          {/* Sign up link */}
          <div className="mt-6 text-center text-sm text-[#4A5568]">
            Don't have an account?{' '}
            <Link href="/auth/signup" className="text-amber-600 hover:text-amber-700 font-semibold">
              Sign up
            </Link>
          </div>
        </div>

        {/* Back to home */}
        <div className="mt-6 text-center">
          <Link href="/" className="text-sm text-[#4A5568] hover:text-amber-600 transition-colors inline-flex items-center gap-2 group">
            <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
