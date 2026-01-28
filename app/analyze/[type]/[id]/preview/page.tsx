'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams, notFound } from 'next/navigation';
import Link from 'next/link';
import {
  ReportHero,
  RiskAnalysisSection,
  MarketPositionSection,
  ActionItemsSection
} from '@/components/report';
import { analytics } from '@/lib/analytics';

export default function PreviewPage() {
  const router = useRouter();
  const params = useParams();
  const type = params.type as string;
  const analysisId = params.id as string;

  if (type !== 'jeonse' && type !== 'wolse') {
    notFound();
  }

  const isWolse = type === 'wolse';

  // Email gate state
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [isSubmittingEmail, setIsSubmittingEmail] = useState(false);
  const [freeUnlocksRemaining, setFreeUnlocksRemaining] = useState<number | null>(null); // Will be fetched from DB

  // Fetch beta counter on mount
  useEffect(() => {
    fetch('/api/beta/counter')
      .then(res => res.json())
      .then(data => {
        if (typeof data.remaining === 'number') {
          setFreeUnlocksRemaining(data.remaining);
        }
      })
      .catch(err => {
        console.error('Failed to fetch beta counter:', err);
        setFreeUnlocksRemaining(47); // Fallback
      });
  }, []);

  // Initialize reportData from sessionStorage if available (cached by processing page)
  const [reportData, setReportData] = useState<any>(() => {
    if (typeof window !== 'undefined') {
      const cached = sessionStorage.getItem(`report-${analysisId}`);
      if (cached) {
        sessionStorage.removeItem(`report-${analysisId}`);
        return JSON.parse(cached);
      }
    }
    return null;
  });

  // Get user's form data from sessionStorage (has deposit, monthlyRent, etc.)
  const [userFormData, setUserFormData] = useState<any>(() => {
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem(`analysis-${analysisId}`);
      if (stored) {
        return JSON.parse(stored);
      }
    }
    return null;
  });

  const [isLoading, setIsLoading] = useState(!reportData);
  const [analysisReady, setAnalysisReady] = useState(!!reportData);
  const [error, setError] = useState<string | null>(null);

  // Use ref to track if wolse analysis has been run (avoids stale closure in useEffect)
  const wolseAnalysisRunRef = useRef(false);
  // Track if wolse analysis is complete (for disabling button)
  const [wolseAnalysisComplete, setWolseAnalysisComplete] = useState(!isWolse); // true for jeonse

  // Run wolse price analysis after jeonse analysis is complete (to get exclusiveArea from parsed document)
  const runWolseAnalysis = async (parsedReportData: any) => {
    if (!isWolse || wolseAnalysisRunRef.current) return;

    try {
      // Get form data from sessionStorage (has city, district, dong, building, deposit, monthlyRent)
      const storedData = sessionStorage.getItem(`analysis-${analysisId}`);
      if (!storedData) {
        console.error(`[Wolse Analysis] No stored form data found for analysis-${analysisId}.`);
        setWolseAnalysisComplete(true); // Allow navigation even on error
        return;
      }

      const formData = JSON.parse(storedData);
      console.log('[Wolse Analysis] Loaded form data:', formData);

      if (!formData.monthlyRent) {
        console.error('[Wolse Analysis] Missing monthlyRent in form data.');
        setWolseAnalysisComplete(true); // Allow navigation even on error
        return;
      }

      // Get exclusiveArea from parsed document data (extracted from 등기부등본)
      // Try multiple paths where area might be stored
      let exclusiveArea = formData.exclusiveArea; // Try user-provided first

      if (!exclusiveArea) {
        // Log all possible paths for debugging
        console.log('[Wolse Analysis] Searching for exclusiveArea in report data...');
        console.log('[Wolse Analysis] - riskAnalysis.deunggibu?.area:', parsedReportData?.riskAnalysis?.deunggibu?.area);
        console.log('[Wolse Analysis] - property?.area:', parsedReportData?.property?.area);
        console.log('[Wolse Analysis] - riskAnalysis?.area:', parsedReportData?.riskAnalysis?.area);
        console.log('[Wolse Analysis] - jeonseAnalysis?.transactionData[0]?.exclusiveArea:', parsedReportData?.jeonseAnalysis?.transactionData?.[0]?.exclusiveArea);

        // Try to get from parsed document - multiple paths
        exclusiveArea = parsedReportData?.riskAnalysis?.deunggibu?.area ||
                        parsedReportData?.property?.area ||
                        parsedReportData?.riskAnalysis?.area ||
                        // Fallback: get from jeonse transaction data (same building, similar unit)
                        parsedReportData?.jeonseAnalysis?.transactionData?.[0]?.exclusiveArea;

        if (exclusiveArea) {
          console.log('[Wolse Analysis] Got exclusiveArea:', exclusiveArea);
        }
      }

      if (!exclusiveArea) {
        console.error('[Wolse Analysis] Missing exclusiveArea. Checked paths:', {
          'riskAnalysis.deunggibu.area': parsedReportData?.riskAnalysis?.deunggibu?.area,
          'property.area': parsedReportData?.property?.area,
          'riskAnalysis.area': parsedReportData?.riskAnalysis?.area,
          'jeonseAnalysis.transactionData[0].exclusiveArea': parsedReportData?.jeonseAnalysis?.transactionData?.[0]?.exclusiveArea,
        });
        console.error('[Wolse Analysis] Full report structure keys:', Object.keys(parsedReportData || {}));
        setWolseAnalysisComplete(true); // Allow navigation even on error
        return;
      }

      console.log('[Wolse Analysis] Running wolse price analysis with:', {
        ...formData,
        exclusiveArea
      });

      wolseAnalysisRunRef.current = true; // Mark as running to prevent duplicate calls

      // Run wolse preview analysis
      // buildingType is detected during analysis creation and stored in sessionStorage
      const previewResponse = await fetch('/api/wolse/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          city: formData.city,
          district: formData.district,
          dong: formData.dongName,  // Use dongName (읍면동 name like "신촌동"), not dong (building dong number)
          apartmentName: formData.building,
          exclusiveArea: exclusiveArea,
          deposit: formData.deposit,
          monthlyRent: formData.monthlyRent,
          buildingType: formData.buildingType || 'apartment'
        })
      });

      if (!previewResponse.ok) {
        const errorData = await previewResponse.json().catch(() => ({}));
        console.error('[Wolse Analysis] Preview API failed:', previewResponse.status, errorData);
        setWolseAnalysisComplete(true); // Allow navigation even on error
        return;
      }

      const previewData = await previewResponse.json();
      console.log('[Wolse Analysis] Preview result:', previewData);

      // Save the analysis result
      const saveResponse = await fetch('/api/wolse/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          result: previewData.result,
          inputData: previewData.inputData,
          analysisId // Use existing analysis ID
        })
      });

      if (saveResponse.ok) {
        console.log('[Wolse Analysis] Successfully saved wolse analysis data');
        const saveData = await saveResponse.json();

        // Use the saved result directly to avoid race condition with database
        // The save API returns the complete result, so we can merge it locally
        if (saveData.result) {
          setReportData((prevData: any) => ({
            ...prevData,
            wolseAnalysis: {
              userDeposit: saveData.result.userDeposit,
              userMonthlyRent: saveData.result.userMonthlyRent,
              userRate: saveData.result.userImpliedRate,
              marketRate: saveData.result.marketRate,
              marketRateRange: saveData.result.marketRateRange,
              legalRate: saveData.result.legalRate,
              expectedRent: saveData.result.expectedRent,
              rentDifference: saveData.result.rentDifference,
              rentDifferencePercent: saveData.result.rentDifferencePercent,
              assessment: saveData.result.assessment,
              assessmentDetails: saveData.result.assessmentDetails,
              contractCount: saveData.result.contractCount,
              confidenceLevel: saveData.result.confidenceLevel,
              savingsPotential: saveData.result.savingsPotential,
              trend: saveData.result.trend,
              recentTransactions: saveData.result.recentTransactions,
              negotiationOptions: saveData.result.negotiationOptions,
            }
          }));
          console.log('[Wolse Analysis] Merged wolse data directly, recentTransactions:', saveData.result.recentTransactions?.length || 0);
          setWolseAnalysisComplete(true);
        }

        // Also refresh from API after a small delay to ensure consistency
        setTimeout(async () => {
          try {
            const refreshedReport = await fetch(`/api/analysis/report/${analysisId}`);
            if (refreshedReport.ok) {
              const refreshedData = await refreshedReport.json();
              setReportData(refreshedData);
            }
          } catch (err) {
            console.log('[Wolse Analysis] Background refresh failed, using local data');
          }
        }, 1000);
      } else {
        const saveError = await saveResponse.json().catch(() => ({}));
        console.error('[Wolse Analysis] Failed to save wolse analysis:', saveResponse.status, saveError);
        setWolseAnalysisComplete(true); // Allow navigation even on error
      }
    } catch (err) {
      console.error('[Wolse Analysis] Unexpected error:', err);
      setWolseAnalysisComplete(true); // Allow navigation even on error
    }
  };

  // Poll for analysis completion
  useEffect(() => {
    let pollCount = 0;
    const maxPolls = 60; // 2 minutes max

    const pollStatus = async () => {
      try {
        // Skip polling if we already have report data (from sessionStorage initialization)
        if (reportData) {
          // For wolse, run the wolse price analysis now that we have the parsed document data
          if (isWolse && !wolseAnalysisRunRef.current) {
            await runWolseAnalysis(reportData);
          }
          return true;
        }

        const response = await fetch(`/api/analysis/status/${analysisId}`);
        const data = await response.json();

        if (data.status === 'completed') {
          setAnalysisReady(true);
          // Fetch the full report data
          const reportResponse = await fetch(`/api/analysis/report/${analysisId}`);
          const report = await reportResponse.json();
          setReportData(report);

          // For wolse, run the wolse price analysis now that we have the parsed document data
          if (isWolse) {
            await runWolseAnalysis(report);
          }

          setIsLoading(false);
          return true;
        } else if (data.status === 'failed') {
          setError('Analysis failed. Please try again.');
          setIsLoading(false);
          return true;
        }

        pollCount++;
        if (pollCount >= maxPolls) {
          setError('Analysis is taking longer than expected. Please refresh the page.');
          setIsLoading(false);
          return true;
        }

        return false;
      } catch (err) {
        console.error('Poll error:', err);
        return false;
      }
    };

    const interval = setInterval(async () => {
      const done = await pollStatus();
      if (done) {
        clearInterval(interval);
      }
    }, 2000);

    // Initial poll
    pollStatus();

    return () => clearInterval(interval);
  }, [analysisId]);

  const handleUnlock = () => {
    router.push(`/analyze/${type}/${analysisId}/payment`);
  };

  const handleUnlockFree = () => {
    // For wolse, ensure analysis is complete before navigating
    if (isWolse && !wolseAnalysisComplete) {
      console.log('[Preview] Wolse analysis still running, waiting...');
      return; // Button should be disabled, but guard anyway
    }
    // Cache current report data in sessionStorage for instant report page load
    if (reportData) {
      console.log('[Preview] Caching report data with wolseAnalysis:', !!reportData.wolseAnalysis);
      sessionStorage.setItem(`report-${analysisId}`, JSON.stringify(reportData));
    }
    router.push(`/analyze/${type}/${analysisId}/report`);
  };

  // Email gate submission handler
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError('');

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim()) {
      setEmailError('Please enter your email address');
      return;
    }
    if (!emailRegex.test(email)) {
      setEmailError('Please enter a valid email address');
      return;
    }

    // For wolse, ensure analysis is complete before submitting
    if (isWolse && !wolseAnalysisComplete) {
      return;
    }

    setIsSubmittingEmail(true);

    try {
      // Save email and decrement counter via API
      const response = await fetch('/api/beta/unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          analysisId,
          type
        })
      });

      if (!response.ok) {
        const data = await response.json();
        if (data.error === 'NO_FREE_UNLOCKS') {
          setEmailError('Free beta has ended. Please use paid unlock.');
          setFreeUnlocksRemaining(0);
          return;
        }
        throw new Error(data.error || 'Failed to unlock');
      }

      const data = await response.json();
      setFreeUnlocksRemaining(data.remaining);

      // Track email capture event
      analytics.emailCaptured(analysisId, type as 'jeonse' | 'wolse');

      // Cache report data and navigate to full report
      if (reportData) {
        sessionStorage.setItem(`report-${analysisId}`, JSON.stringify(reportData));
      }
      router.push(`/analyze/${type}/${analysisId}/report`);
    } catch (err) {
      console.error('[Email Gate] Error:', err);
      setEmailError('Something went wrong. Please try again.');
    } finally {
      setIsSubmittingEmail(false);
    }
  };

  // Extract API data with correct nested structure
  const property = reportData?.property || {};
  const riskAnalysis = reportData?.riskAnalysis || {};
  const summary = reportData?.summary || {};
  const valuation = property?.valuation || {};

  // Check if this is a multifamily property with tier estimates
  const hasTierEstimates = valuation?.tierEstimates && valuation.tierEstimates.length > 0;
  const tierEstimates = valuation?.tierEstimates || [];
  const budgetTier = tierEstimates.find((t: any) => t.tier === 'budget');
  const premiumTier = tierEstimates.find((t: any) => t.tier === 'premium');
  const midTier = tierEstimates.find((t: any) => t.tier === 'mid');

  // Generate preview data (uses real data when available, falls back to mock)
  const previewData = {
    address: property?.address || '서울특별시 강남구 역삼동 아파트',
    buildingNumber: property?.buildingNumber || null,
    unit: property?.unit || null,
    area: property?.area || null,
    riskLevel: riskAnalysis?.riskLevel || summary?.riskLevel || 'MODERATE' as const,
    safetyScore: riskAnalysis?.overallScore || summary?.safetyScore || 72,
    deposit: userFormData?.deposit || property?.proposedJeonse || 300000000,
    monthlyRent: isWolse ? (userFormData?.monthlyRent || reportData?.monthlyRent || reportData?.wolseAnalysis?.userMonthlyRent || null) : undefined,
    estimatedValue: property?.estimatedValue || valuation?.valueMid || 450000000,
    verdict: riskAnalysis?.verdict || summary?.verdict || 'Your deposit analysis shows moderate risk. Review the detailed breakdown below for specific concerns and recommendations.',
    reportDate: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
    scores: {
      ltvScore: riskAnalysis?.scores?.ltvScore || 65,
      debtScore: riskAnalysis?.scores?.debtScore || 78,
      legalScore: riskAnalysis?.scores?.legalScore || 100,
      marketScore: riskAnalysis?.scores?.marketScore || 70,
      buildingScore: riskAnalysis?.scores?.buildingScore || 80,
    },
    metrics: {
      ltv: riskAnalysis?.metrics?.ltv || 68,
      totalDebt: riskAnalysis?.metrics?.totalDebt || 150000000,
      availableEquity: riskAnalysis?.metrics?.availableEquity || 50000000,
      debtCount: riskAnalysis?.metrics?.debtCount || 2,
    },
    debtRanking: riskAnalysis?.debtRanking || [
      { rank: 1, type: '근저당권 (Mortgage)', amount: 150000000, registrationDate: '2023-05-15', priority: 'senior' as const },
      { rank: 2, type: 'Your Deposit (Proposed)', amount: 300000000, registrationDate: 'Pending', priority: 'junior' as const },
    ],
    smallAmountPriority: riskAnalysis?.smallAmountPriority || {
      isEligible: false,
      threshold: 55000000,
      protectedAmount: 18500000,
      region: 'Seoul'
    },
    risks: riskAnalysis?.risks || [],
    recommendations: reportData?.recommendations || {
      mandatory: ['Verify 등기부등본 on signing day', 'Confirm no new debts registered'],
      recommended: ['Consider jeonse insurance'],
      optional: ['Negotiate lower deposit if possible']
    }
  };

  if (error) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Analysis Error</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <Link href={`/analyze/${type}`} className="inline-flex items-center gap-2 px-6 py-3 bg-amber-500 text-white font-semibold rounded-xl hover:bg-amber-600 transition-colors">
            Try Again
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFBF7] animate-fadeIn">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#FDFBF7]/80 backdrop-blur-md border-b border-amber-100">
        <div className="container mx-auto px-6 py-4 max-w-7xl flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className={`w-10 h-10 bg-gradient-to-br ${isWolse ? 'from-orange-500 to-amber-600' : 'from-amber-500 to-orange-600'} rounded-xl flex items-center justify-center shadow-lg`}>
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <span className="text-xl font-semibold text-[#2D3748]">K-Rent Safety</span>
          </Link>
          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold ${isWolse ? 'bg-orange-100 text-orange-700' : 'bg-amber-100 text-amber-700'}`}>
            <span>{isWolse ? 'Wolse' : 'Jeonse'} Check</span>
            <span className={isWolse ? 'text-orange-400' : 'text-amber-400'}>|</span>
            <span>Step 4 of 4</span>
          </div>
        </div>
      </header>

      {/* Floating CTA */}
      <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-gradient-to-t from-white via-white to-transparent">
        <div className="max-w-2xl mx-auto">
          {/* Email Gate for Free Unlock */}
          {freeUnlocksRemaining === null ? (
            /* Loading state */
            <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 p-5 flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : freeUnlocksRemaining > 0 ? (
            <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 p-5">
              {/* Scarcity Counter */}
              <div className="flex items-center justify-center gap-2 mb-4">
                <span className="text-xl">🔥</span>
                <span className="text-red-600 font-bold">{freeUnlocksRemaining}</span>
                <span className="text-gray-700 font-medium">free unlocks remaining</span>
              </div>

              {/* Email Form */}
              <form onSubmit={handleEmailSubmit} className="space-y-3">
                <div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setEmailError(''); }}
                    placeholder="your@email.com"
                    disabled={isSubmittingEmail || (isWolse && !wolseAnalysisComplete)}
                    className={`w-full px-4 py-3 border-2 rounded-xl text-center text-lg transition-colors ${
                      emailError
                        ? 'border-red-300 focus:border-red-500'
                        : 'border-gray-200 focus:border-amber-500'
                    } outline-none disabled:bg-gray-50 disabled:text-gray-400`}
                  />
                  {emailError && (
                    <p className="mt-1.5 text-sm text-red-600 text-center">{emailError}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isSubmittingEmail || (isWolse && !wolseAnalysisComplete)}
                  className={`w-full px-8 py-4 bg-gradient-to-r ${isWolse ? 'from-orange-500 to-amber-500' : 'from-amber-500 to-orange-500'} text-white font-bold text-lg rounded-xl shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 flex items-center justify-center gap-2`}
                >
                  {isSubmittingEmail ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Unlocking...
                    </>
                  ) : isWolse && !wolseAnalysisComplete ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Analyzing Market Data...
                    </>
                  ) : (
                    <>
                      Unlock Free
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </>
                  )}
                </button>
              </form>

              <p className="mt-3 text-center text-sm text-gray-500">
                After free beta: <span className="font-semibold">₩39,900</span>
              </p>
            </div>
          ) : (
            /* Paid-only CTA when free unlocks are exhausted */
            <button
              onClick={handleUnlock}
              className={`w-full px-8 py-5 bg-gradient-to-r ${isWolse ? 'from-orange-500 to-amber-500' : 'from-amber-500 to-orange-500'} text-white font-bold text-lg rounded-2xl shadow-2xl hover:shadow-3xl transition-all hover:-translate-y-1 flex items-center justify-center gap-3`}
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
              </svg>
              Unlock Full Report — ₩39,900
            </button>
          )}
        </div>
      </div>

      {/* Report Content with Blur */}
      <div className="container mx-auto px-6 py-8 max-w-4xl pb-40">
        {/* Preview Banner */}
        <div className={`mb-8 p-4 bg-gradient-to-r ${isWolse ? 'from-orange-100 to-amber-100' : 'from-amber-100 to-orange-100'} rounded-2xl border ${isWolse ? 'border-orange-200' : 'border-amber-200'}`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isWolse ? 'bg-orange-500' : 'bg-amber-500'}`}>
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-gray-900">Preview Mode</p>
              <p className="text-sm text-gray-600">Unlock full report to see all details and recommendations</p>
            </div>
          </div>
        </div>

        {/* Hero - Visible */}
        <ReportHero
          address={previewData.address}
          buildingNumber={previewData.buildingNumber}
          unit={previewData.unit}
          area={previewData.area}
          riskLevel={previewData.riskLevel}
          safetyScore={previewData.safetyScore}
          deposit={previewData.deposit}
          monthlyRent={previewData.monthlyRent}
          estimatedValue={midTier?.value || previewData.estimatedValue}
          verdict={previewData.verdict}
          reportDate={previewData.reportDate}
          reportType={type as 'jeonse' | 'wolse'}
          selectedTierLabel={hasTierEstimates ? 'Mid Tier' : undefined}
        />

        {/* Tier Info Banner - For multifamily properties */}
        {hasTierEstimates && budgetTier && premiumTier && (
          <div className="mb-8 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-5 border border-blue-100">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <span className="text-2xl">🏠</span>
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-gray-900 mb-1">Property Value Varies by Quality Tier</h3>
                <p className="text-sm text-gray-600 mb-3">
                  This property's value ranges from <strong className="text-blue-700">₩{(budgetTier.value / 100000000).toFixed(2)}억</strong> (Budget)
                  to <strong className="text-blue-700">₩{(premiumTier.value / 100000000).toFixed(2)}억</strong> (Premium)
                  depending on condition and amenities.
                </p>
                <div className="flex items-center gap-2 text-sm">
                  <svg className="w-4 h-4 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-500">Unlock to select your property's tier and see adjusted risk analysis</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Blurred Sections */}
        <div className="relative">
          {/* Blur Overlay */}
          <div className="absolute inset-0 z-10 backdrop-blur-md bg-white/30 rounded-3xl flex items-center justify-center">
            <div className="text-center p-8">
              <div className={`w-20 h-20 mx-auto mb-6 bg-gradient-to-br ${isWolse ? 'from-orange-500 to-amber-500' : 'from-amber-500 to-orange-500'} rounded-full flex items-center justify-center shadow-xl`}>
                <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Unlock Full Analysis</h3>
              <p className="text-gray-600 max-w-sm mx-auto mb-4">
                Get detailed risk analysis, debt rankings, market position, and actionable recommendations.
              </p>

              {/* Inline Email Gate */}
              {freeUnlocksRemaining === null ? (
                /* Loading state */
                <div className="flex justify-center py-4">
                  <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : freeUnlocksRemaining > 0 ? (
                <div className="max-w-sm mx-auto">
                  {/* Scarcity Counter */}
                  <div className="flex items-center justify-center gap-2 mb-3">
                    <span className="text-lg">🔥</span>
                    <span className="text-red-600 font-bold">{freeUnlocksRemaining}</span>
                    <span className="text-gray-700 text-sm font-medium">free unlocks left</span>
                  </div>

                  <form onSubmit={handleEmailSubmit} className="space-y-2">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setEmailError(''); }}
                      placeholder="your@email.com"
                      disabled={isSubmittingEmail || (isWolse && !wolseAnalysisComplete)}
                      className={`w-full px-4 py-3 border-2 rounded-xl text-center transition-colors ${
                        emailError ? 'border-red-300' : 'border-gray-200 focus:border-amber-500'
                      } outline-none bg-white disabled:bg-gray-50`}
                    />
                    {emailError && (
                      <p className="text-xs text-red-600 text-center">{emailError}</p>
                    )}
                    <button
                      type="submit"
                      disabled={isSubmittingEmail || (isWolse && !wolseAnalysisComplete)}
                      className={`w-full px-6 py-3 bg-gradient-to-r ${isWolse ? 'from-orange-500 to-amber-500' : 'from-amber-500 to-orange-500'} text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2`}
                    >
                      {isSubmittingEmail ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Unlocking...
                        </>
                      ) : isWolse && !wolseAnalysisComplete ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Analyzing...
                        </>
                      ) : (
                        'Unlock Free →'
                      )}
                    </button>
                  </form>
                  <p className="mt-2 text-center text-xs text-gray-500">
                    After free beta: ₩39,900
                  </p>
                </div>
              ) : (
                <button
                  onClick={handleUnlock}
                  className={`px-8 py-4 bg-gradient-to-r ${isWolse ? 'from-orange-500 to-amber-500' : 'from-amber-500 to-orange-500'} text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all`}
                >
                  Unlock for ₩39,900
                </button>
              )}
            </div>
          </div>

          {/* Actual Content (blurred behind overlay) */}
          <div className="pointer-events-none select-none">
            <RiskAnalysisSection
              scores={previewData.scores}
              metrics={previewData.metrics}
              debtRanking={previewData.debtRanking}
              smallAmountPriority={previewData.smallAmountPriority}
              risks={previewData.risks}
              proposedDeposit={previewData.deposit}
              estimatedValue={previewData.estimatedValue}
              reportType={type as 'jeonse' | 'wolse'}
            />

            <MarketPositionSection
              reportType={type as 'jeonse' | 'wolse'}
              jeonseData={!isWolse ? {
                marketTrend: 'stable',
                confidence: 0.75,
                valueLow: 400000000,
                valueMid: 450000000,
                valueHigh: 500000000,
                proposedJeonse: previewData.deposit,
                estimatedValue: previewData.estimatedValue
              } : undefined}
              wolseData={isWolse ? {
                userDeposit: previewData.deposit,
                userMonthlyRent: previewData.monthlyRent || 1500000,
                userRate: 5.2,
                marketRate: 4.5,
                marketRateRange: { low: 4.0, high: 5.0 },
                legalRate: 4.5,
                expectedRent: 1350000,
                rentDifference: 150000,
                rentDifferencePercent: 11.1,
                assessment: 'OVERPRICED',
                contractCount: 12,
                savingsPotential: { vsMarket: 1800000, vsLegal: 2100000 }
              } : undefined}
            />

            <ActionItemsSection
              reportType={type as 'jeonse' | 'wolse'}
              recommendations={previewData.recommendations}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
