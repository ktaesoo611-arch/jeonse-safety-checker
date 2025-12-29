'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { WolseResultsDisplay } from '@/components/wolse/WolseResultsDisplay';
import { WolseAnalysisResult } from '@/lib/types';

export default function WolseAnalysisPage() {
  const params = useParams();
  const router = useRouter();
  const analysisId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<WolseAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAnalysis() {
      try {
        // Check sessionStorage first for fresh result from skip-payment
        const cachedResult = sessionStorage.getItem(`wolse_result_${analysisId}`);
        if (cachedResult) {
          const parsed = JSON.parse(cachedResult);
          console.log('Wolse result from cache:', parsed);
          console.log('expectedRent:', parsed.expectedRent);
          console.log('rentDifference:', parsed.rentDifference);
          setResult(parsed);
          setLoading(false);
          // Clear the cache after using
          sessionStorage.removeItem(`wolse_result_${analysisId}`);
          return;
        }

        // Fallback to API fetch
        const response = await fetch(`/api/wolse/analyze?id=${analysisId}`);

        if (response.status === 404) {
          // Analysis not found or not completed yet
          // Check if we need to redirect to payment
          const statusResponse = await fetch(`/api/wolse/status?id=${analysisId}`);
          if (statusResponse.ok) {
            const statusData = await statusResponse.json();

            if (statusData.status === 'pending' && statusData.paymentStatus !== 'approved') {
              router.push(`/analyze/wolse/${analysisId}/payment`);
              return;
            }
          }

          setError('Analysis not found');
          setLoading(false);
          return;
        }

        if (!response.ok) {
          throw new Error('Failed to fetch analysis');
        }

        const data = await response.json();
        setResult(data);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching analysis:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
        setLoading(false);
      }
    }

    fetchAnalysis();
  }, [analysisId, router]);

  const handleNewAnalysis = () => {
    router.push('/check');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FDFBF7]">
        <div className="fixed inset-0 z-0 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-b from-[#FEF7ED] via-[#FDFBF7] to-[#F5F0E8]" />
        </div>

        <header className="relative z-10 bg-[#FDFBF7]/80 backdrop-blur-md border-b border-amber-100">
          <div className="container mx-auto px-6 py-4 max-w-7xl">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-amber-200 group-hover:scale-105 transition-transform">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <span className="text-xl font-semibold text-[#2D3748]">K-Rent Safety</span>
            </Link>
          </div>
        </header>

        <div className="relative z-10 flex items-center justify-center min-h-[80vh]">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 relative">
              <div className="absolute inset-0 border-4 border-amber-200 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
            <p className="text-[#4A5568] font-medium">Loading analysis...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#FDFBF7]">
        <div className="fixed inset-0 z-0 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-b from-[#FEF7ED] via-[#FDFBF7] to-[#F5F0E8]" />
        </div>

        <header className="relative z-10 bg-[#FDFBF7]/80 backdrop-blur-md border-b border-amber-100">
          <div className="container mx-auto px-6 py-4 max-w-7xl">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-amber-200 group-hover:scale-105 transition-transform">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <span className="text-xl font-semibold text-[#2D3748]">K-Rent Safety</span>
            </Link>
          </div>
        </header>

        <div className="relative z-10 flex items-center justify-center p-8 min-h-[80vh]">
          <div className="max-w-md w-full bg-white rounded-3xl shadow-xl shadow-amber-900/5 p-8 text-center border border-amber-100">
            <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-2xl flex items-center justify-center">
              <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-[#1A202C] mb-2">Error</h2>
            <p className="text-[#4A5568] mb-6">{error}</p>
            <button
              onClick={() => router.push('/check')}
              className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white px-6 py-3 rounded-xl hover:shadow-lg hover:shadow-amber-200/50 transition-all font-semibold"
            >
              Start New Analysis
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFBF7]">
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-[#FEF7ED] via-[#FDFBF7] to-[#F5F0E8]" />
        <div className="absolute top-20 right-[10%] w-96 h-96 bg-amber-200/30 rounded-full blur-3xl" />
        <div className="absolute bottom-[20%] left-[5%] w-72 h-72 bg-orange-200/30 rounded-full blur-3xl" />
      </div>

      <header className="relative z-10 bg-[#FDFBF7]/80 backdrop-blur-md border-b border-amber-100">
        <div className="container mx-auto px-6 py-4 max-w-7xl flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-amber-200 group-hover:scale-105 transition-transform">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <span className="text-xl font-semibold text-[#2D3748]">K-Rent Safety</span>
          </Link>
          <Link href="/check">
            <button className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl hover:shadow-lg hover:shadow-amber-200/50 transition-all font-medium">
              New analysis
            </button>
          </Link>
        </div>
      </header>

      <div className="relative z-10 container mx-auto px-6 py-12 max-w-4xl">

        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-700 rounded-full text-sm font-semibold mb-6 border border-amber-200">
            <span>Wolse Fair Price Check</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-[#1A202C] mb-4 tracking-tight" style={{ letterSpacing: '-0.03em' }}>
            Your Analysis Results
          </h1>
          <p className="text-xl text-[#4A5568] max-w-2xl mx-auto">
            Based on recent market data and legal conversion rates
          </p>
        </div>

        {result && (
          <WolseResultsDisplay result={result} onNewAnalysis={handleNewAnalysis} />
        )}
      </div>

      <footer className="relative z-10 bg-amber-50 border-t border-amber-100 py-8 mt-16">
        <div className="container mx-auto px-6 max-w-4xl text-center text-[#4A5568] text-sm">
          <p>
            Data source: MOLIT Real Transaction Price API (국토교통부 실거래가 공개시스템)
          </p>
          <p className="mt-2">
            Legal reference: Housing Lease Protection Act (주택임대차보호법)
          </p>
        </div>
      </footer>
    </div>
  );
}
