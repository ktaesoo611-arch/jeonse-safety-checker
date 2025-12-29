'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

interface PreviewData {
  analysisId: string;
  property: {
    address: string;
    proposedJeonse: number;
    estimatedValue: number | null;
  };
  riskAnalysis: {
    overallScore: number;
    riskLevel: string;
    verdict: string;
    metrics: {
      ltv: number;
      totalDebt: number;
      availableEquity: number;
      debtCount: number;
    };
    risks: Array<{
      type: string;
      severity: string;
      description: string;
    }>;
  };
  summary: {
    criticalIssues: number;
    highIssues: number;
    moderateIssues: number;
  };
}

export default function FullWolsePreviewPage() {
  const params = useParams();
  const router = useRouter();
  const analysisId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [unlocking, setUnlocking] = useState(false);

  // Fetch preview data
  useEffect(() => {
    async function fetchPreview() {
      try {
        const response = await fetch(`/api/analysis/report/${analysisId}`);

        if (!response.ok) {
          throw new Error('Unable to load preview');
        }

        const data = await response.json();
        setPreviewData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    fetchPreview();
  }, [analysisId]);

  const handleFreeBeta = useCallback(async () => {
    setUnlocking(true);
    try {
      // Mark as paid (free beta) and redirect to full report
      const response = await fetch('/api/payments/skip-dev', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analysisId })
      });

      if (!response.ok) {
        throw new Error('Failed to unlock');
      }

      // Redirect to full report
      router.push(`/analyze/full/${analysisId}/report`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to unlock');
      setUnlocking(false);
    }
  }, [analysisId, router]);

  const getRiskLevelStyle = (level: string) => {
    switch (level) {
      case 'SAFE': return { bg: 'from-emerald-500 to-teal-500', text: 'Safe to Proceed' };
      case 'MODERATE': return { bg: 'from-yellow-500 to-orange-500', text: 'Moderate Risk' };
      case 'HIGH': return { bg: 'from-orange-500 to-red-500', text: 'High Risk' };
      case 'CRITICAL': return { bg: 'from-red-600 to-rose-700', text: 'Critical Risk' };
      default: return { bg: 'from-gray-500 to-gray-600', text: level };
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 relative">
            <div className="absolute inset-0 border-4 border-green-200 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <p className="text-[#4A5568] font-medium">Loading preview...</p>
        </div>
      </div>
    );
  }

  if (error || !previewData) {
    return (
      <div className="min-h-screen bg-[#FDFBF7]">
        <header className="bg-[#FDFBF7]/80 backdrop-blur-md border-b border-green-100">
          <div className="container mx-auto px-6 py-4 max-w-7xl">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-green-200 group-hover:scale-105 transition-transform">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <span className="text-xl font-semibold text-[#2D3748]">K-Rent Safety</span>
            </Link>
          </div>
        </header>

        <div className="flex items-center justify-center p-8 min-h-[80vh]">
          <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 text-center border border-green-100">
            <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-2xl flex items-center justify-center">
              <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-[#1A202C] mb-2">Error</h2>
            <p className="text-[#4A5568] mb-6">{error || 'Preview not found'}</p>
            <Link href="/" className="inline-block w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-3 rounded-xl hover:shadow-lg transition-all font-semibold">
              Back to home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const riskStyle = getRiskLevelStyle(previewData.riskAnalysis.riskLevel);

  return (
    <div className="min-h-screen bg-[#FDFBF7]">
      {/* Background - GPU accelerated to prevent scroll issues */}
      <div className="fixed inset-0 z-0 pointer-events-none" style={{ transform: 'translateZ(0)' }}>
        <div className="absolute inset-0 bg-gradient-to-b from-green-50/50 via-[#FDFBF7] to-[#F5F0E8]" />
        <div className="absolute top-20 right-[10%] w-96 h-96 bg-green-200/30 rounded-full blur-3xl" />
        <div className="absolute bottom-[20%] left-[5%] w-72 h-72 bg-emerald-200/30 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative z-10 bg-[#FDFBF7]/80 backdrop-blur-md border-b border-green-100">
        <div className="container mx-auto px-6 py-4 max-w-7xl flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-green-200 group-hover:scale-105 transition-transform">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <span className="text-xl font-semibold text-[#2D3748]">K-Rent Safety</span>
          </Link>
        </div>
      </header>

      {/* Content */}
      <div className="relative z-10 container mx-auto px-6 py-12 max-w-4xl">
        {/* Badge */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-full text-sm font-semibold mb-4 border border-green-200">
            <span>Full Wolse Check</span>
            <span className="px-2 py-0.5 bg-green-100 rounded-full text-xs">Preview</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-[#1A202C] mb-2">Analysis Preview</h1>
          <p className="text-[#4A5568]">See your risk level - unlock for full details and recommendations</p>
        </div>

        {/* Risk Score Card - Visible */}
        <div className={`rounded-3xl p-8 text-white bg-gradient-to-br ${riskStyle.bg} shadow-2xl mb-8`}>
          <div className="text-center">
            <div className="inline-block px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full border border-white/30 font-bold text-sm mb-4">
              {riskStyle.text}
            </div>
            <p className="text-sm opacity-90 max-w-md mx-auto">
              {previewData.riskAnalysis.verdict}
            </p>
          </div>
        </div>

        {/* Blurred Preview Sections */}
        <div className="space-y-6 mb-8">
          {/* Issues Detected - Partially visible */}
          <div className="bg-white rounded-3xl p-6 shadow-xl border border-green-100">
            <h3 className="text-lg font-bold text-[#1A202C] mb-4 flex items-center gap-2">
              <span className="text-xl">⚠️</span> Issues Detected
            </h3>
            <div className="flex gap-3">
              {previewData.summary.highIssues > 0 && (
                <span className="px-3 py-1.5 bg-red-100 text-red-700 rounded-full text-sm font-semibold">
                  {previewData.summary.criticalIssues + previewData.summary.highIssues} High
                </span>
              )}
              {previewData.summary.moderateIssues > 0 && (
                <span className="px-3 py-1.5 bg-yellow-100 text-yellow-700 rounded-full text-sm font-semibold">
                  {previewData.summary.moderateIssues} Moderate
                </span>
              )}
            </div>
          </div>

          {/* Blurred Sections */}
          <div className="relative">
            <div className="blur-md pointer-events-none select-none">
              {/* Deposit Info */}
              <div className="bg-white rounded-3xl p-6 shadow-xl border border-green-100 mb-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-sm text-gray-500 mb-1">Your Deposit</p>
                    <p className="text-2xl font-bold">₩XX.X억</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-sm text-gray-500 mb-1">Safety Score</p>
                    <p className="text-2xl font-bold">XX/100</p>
                  </div>
                </div>
              </div>

              {/* Price Analysis */}
              <div className="bg-white rounded-3xl p-6 shadow-xl border border-green-100 mb-6">
                <h3 className="text-lg font-bold mb-4">Wolse Price Analysis</h3>
                <div className="grid grid-cols-2 gap-6">
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-sm text-gray-500 mb-1">Market Rate</p>
                    <p className="text-2xl font-bold">X.X%</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-sm text-gray-500 mb-1">Your Rate</p>
                    <p className="text-2xl font-bold">X.X%</p>
                  </div>
                </div>
              </div>

              {/* Detailed Scores */}
              <div className="bg-white rounded-3xl p-6 shadow-xl border border-green-100">
                <h3 className="text-lg font-bold mb-4">Detailed Analysis</h3>
                <div className="space-y-3">
                  {['LTV Score', 'Debt Score', 'Legal Score', 'Market Score'].map((label) => (
                    <div key={label} className="flex justify-between items-center">
                      <span>{label}</span>
                      <span className="font-bold">XX/100</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Overlay */}
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-transparent via-white/60 to-white/90 rounded-3xl">
              <div className="text-center p-8">
                <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-2xl flex items-center justify-center">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-[#1A202C] mb-2">Unlock Full Report</h3>
                <p className="text-[#4A5568] mb-6 max-w-sm">
                  Get complete deposit safety analysis, wolse price check, detailed scores, and personalized recommendations.
                </p>
                <button
                  onClick={handleFreeBeta}
                  disabled={unlocking}
                  className="w-full max-w-xs px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold rounded-2xl hover:shadow-xl hover:shadow-green-200/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {unlocking ? 'Unlocking...' : (
                    <>
                      <span className="line-through opacity-70 mr-2">₩19,900</span>
                      Free (Beta)
                    </>
                  )}
                </button>
                <p className="text-xs text-gray-500 mt-3">
                  Save ₩4,900 vs separate services
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Back Link */}
        <div className="text-center">
          <Link href="/check" className="text-green-600 hover:text-green-700 font-medium inline-flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Start new analysis
          </Link>
        </div>
      </div>
    </div>
  );
}
