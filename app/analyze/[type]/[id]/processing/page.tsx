'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams, notFound } from 'next/navigation';
import Link from 'next/link';

const steps = [
  { id: 1, name: 'Register document analysis', icon: '📄' },
  { id: 2, name: 'Real estate price lookup', icon: '🏠' },
  { id: 3, name: 'Building register verification', icon: '✅' },
  { id: 4, name: 'Risk analysis', icon: '🔍' },
  { id: 5, name: 'Generating report', icon: '📊' }
];

export default function ProcessingPage() {
  const router = useRouter();
  const params = useParams();
  const type = params.type as string;
  const analysisId = params.id as string;

  // Validate type
  if (type !== 'jeonse' && type !== 'wolse') {
    notFound();
  }

  const isWolse = type === 'wolse';

  const [currentStep, setCurrentStep] = useState(0);
  const [displayProgress, setDisplayProgress] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [serverCompleted, setServerCompleted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Progress bar follows steps - each step is 20%
  useEffect(() => {
    // Calculate target progress based on current step
    const targetProgress = Math.min((currentStep + 1) * 20, 100);

    // Animate progress bar smoothly toward step target
    const animationInterval = setInterval(() => {
      setDisplayProgress(prev => {
        if (prev >= targetProgress) {
          clearInterval(animationInterval);
          return targetProgress;
        }
        // Smooth increment - 0.5% every 50ms
        return Math.min(prev + 0.5, targetProgress);
      });
    }, 50);

    return () => clearInterval(animationInterval);
  }, [currentStep]);

  // When server completes, animate through remaining steps
  useEffect(() => {
    if (!serverCompleted || isCompleted) return;

    // Animate through remaining steps one by one
    const animateRemainingSteps = async () => {
      let stepIndex = currentStep;

      const stepInterval = setInterval(async () => {
        stepIndex++;
        if (stepIndex >= steps.length) {
          clearInterval(stepInterval);
          setCurrentStep(steps.length - 1);
          // Wait for progress bar to catch up, then mark complete
          setTimeout(async () => {
            setIsCompleted(true);
            // Pre-fetch report data and cache in sessionStorage before redirecting
            // This prevents showing mock data (역삼동) on preview page
            try {
              const reportResponse = await fetch(`/api/analysis/report/${analysisId}`);
              if (reportResponse.ok) {
                const reportData = await reportResponse.json();
                // Cache in sessionStorage for preview page to use immediately
                sessionStorage.setItem(`report-${analysisId}`, JSON.stringify(reportData));
                router.push(`/analyze/${type}/${analysisId}/preview`);
              } else {
                // Retry once after a short delay
                await new Promise(resolve => setTimeout(resolve, 500));
                router.push(`/analyze/${type}/${analysisId}/preview`);
              }
            } catch {
              // On error, redirect anyway
              router.push(`/analyze/${type}/${analysisId}/preview`);
            }
          }, 500);
        } else {
          setCurrentStep(stepIndex);
        }
      }, 600); // 600ms per step for smooth animation
    };

    animateRemainingSteps();
  }, [serverCompleted, isCompleted, currentStep, router, type, analysisId]);

  useEffect(() => {
    // Poll for status updates
    const checkStatus = async () => {
      try {
        const response = await fetch(`/api/analysis/status/${analysisId}`);
        const data = await response.json();

        if (data.status === 'completed') {
          // Don't jump - let the animation handle it
          if (!serverCompleted) {
            setServerCompleted(true);
          }
        } else if (data.status === 'failed') {
          // Show specific error message if available
          const message = data.errorMessage || 'An error occurred during analysis';
          setErrorMessage(message);
        } else {
          // Update step based on server progress (only if not completed)
          if (!serverCompleted && typeof data.progress === 'number') {
            const stepIndex = Math.min(
              Math.floor((data.progress / 100) * steps.length),
              steps.length - 1
            );
            setCurrentStep(stepIndex);
          }
        }
      } catch (error) {
        console.error('Status check error:', error);
      }
    };

    // Initial check
    checkStatus();

    // Poll every 1.5 seconds
    const interval = setInterval(checkStatus, 1500);

    return () => clearInterval(interval);
  }, [analysisId, serverCompleted]);

  return (
    <div className="min-h-screen bg-[#FDFBF7]">
      {/* Warm gradient background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-[#FEF7ED] via-[#FDFBF7] to-[#F5F0E8]" />
        <div className={`absolute top-20 right-[10%] w-96 h-96 ${isWolse ? 'bg-orange-200/30' : 'bg-amber-200/30'} rounded-full blur-3xl`} />
        <div className={`absolute bottom-[20%] left-[5%] w-72 h-72 ${isWolse ? 'bg-amber-200/30' : 'bg-orange-200/30'} rounded-full blur-3xl`} />
      </div>

      {/* Header */}
      <header className="relative z-10 bg-[#FDFBF7]/80 backdrop-blur-md border-b border-amber-100">
        <div className="container mx-auto px-6 py-4 max-w-7xl">
          <Link href="/" className="flex items-center gap-3 group">
            <div className={`w-10 h-10 bg-gradient-to-br ${isWolse ? 'from-orange-500 to-amber-600' : 'from-amber-500 to-orange-600'} rounded-xl flex items-center justify-center shadow-lg shadow-amber-200 group-hover:scale-105 transition-transform`}>
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <span className="text-xl font-semibold text-[#2D3748]">K-Rent Safety</span>
          </Link>
        </div>
      </header>

      <div className="relative z-10 container mx-auto px-6 py-16 max-w-3xl">
        {/* Error State */}
        {errorMessage && (
          <div className="mb-12 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold mb-6 border bg-red-50 text-red-700 border-red-200">
              <span>Analysis Failed</span>
            </div>

            {/* Error Icon */}
            <div className="mb-8 flex justify-center">
              <div className="relative w-24 h-24">
                <div className="absolute inset-0 border-4 border-red-200 rounded-full"></div>
                <div className="absolute inset-2 bg-gradient-to-br from-red-50 to-orange-50 rounded-full flex items-center justify-center">
                  <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
              </div>
            </div>

            <h1 className="text-4xl md:text-5xl font-bold text-[#1A202C] mb-4 tracking-tight" style={{ letterSpacing: '-0.03em' }}>
              Unable to Find Property
            </h1>
            <p className="text-xl text-[#4A5568] mb-8">
              {errorMessage}
            </p>

            {/* Error Card */}
            <div className="bg-white rounded-3xl p-8 mb-8 shadow-xl border shadow-red-900/5 border-red-100 text-left">
              <h3 className="font-semibold text-[#1A202C] mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                What can you do?
              </h3>
              <ul className="space-y-3 text-[#4A5568]">
                <li className="flex items-start gap-2">
                  <span className="flex-shrink-0 w-5 h-5 bg-red-100 text-red-700 rounded-full flex items-center justify-center text-xs font-bold">1</span>
                  <span>Check if the unit number (동/호) is correct</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex-shrink-0 w-5 h-5 bg-red-100 text-red-700 rounded-full flex items-center justify-center text-xs font-bold">2</span>
                  <span>Verify the building address is accurate</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex-shrink-0 w-5 h-5 bg-red-100 text-red-700 rounded-full flex items-center justify-center text-xs font-bold">3</span>
                  <span>Try searching with a different format (e.g., jibun address vs road name address)</span>
                </li>
              </ul>
            </div>

            {/* Try Again Button */}
            <Link
              href={`/analyze/${type}`}
              className={`inline-flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r ${isWolse ? 'from-orange-500 to-amber-500' : 'from-amber-500 to-orange-500'} text-white font-semibold text-lg rounded-2xl hover:shadow-xl hover:shadow-amber-200/50 transition-all hover:-translate-y-1`}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Try Again with Different Address
            </Link>
          </div>
        )}

        {/* Header Section - only show when not in error state */}
        {!errorMessage && (
        <div className="mb-12 text-center">
          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold mb-6 border ${isWolse ? 'bg-orange-50 text-orange-700 border-orange-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
            <span>{isWolse ? 'Wolse' : 'Jeonse'} Check</span>
            <span className={isWolse ? 'text-orange-400' : 'text-amber-400'}>|</span>
            <span>Step 3 of 4</span>
          </div>

          {/* Spinning Circle */}
          <div className="mb-8 flex justify-center">
            <div className="relative w-24 h-24">
              <div className={`absolute inset-0 border-4 ${isWolse ? 'border-orange-200' : 'border-amber-200'} rounded-full`}></div>
              <div className={`absolute inset-0 border-4 ${isWolse ? 'border-orange-500' : 'border-amber-500'} border-t-transparent rounded-full ${isCompleted ? '' : 'animate-spin'}`}></div>
              <div className={`absolute inset-2 bg-gradient-to-br ${isWolse ? 'from-orange-50 to-amber-50' : 'from-amber-50 to-orange-50'} rounded-full flex items-center justify-center`}>
                {isCompleted ? (
                  <svg className={`w-10 h-10 ${isWolse ? 'text-orange-500' : 'text-amber-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <span className="text-3xl">{steps[currentStep]?.icon || '📄'}</span>
                )}
              </div>
            </div>
          </div>

          <h1 className="text-4xl md:text-5xl font-bold text-[#1A202C] mb-4 tracking-tight" style={{ letterSpacing: '-0.03em' }}>
            {isCompleted ? 'Analysis Complete!' : 'Analyzing your property...'}
          </h1>
          <p className="text-xl text-[#4A5568]">
            {isCompleted ? 'Redirecting to your report...' : 'Please wait. This usually takes about 30 seconds.'}
          </p>
        </div>
        )}

        {/* Progress Card - only show when not in error state */}
        {!errorMessage && (
        <div className={`bg-white rounded-3xl p-8 mb-8 shadow-xl border ${isWolse ? 'shadow-orange-900/5 border-orange-100' : 'shadow-amber-900/5 border-amber-100'}`}>
          {/* Progress Bar */}
          <div className="mb-10">
            <div className={`h-3 ${isWolse ? 'bg-orange-100' : 'bg-amber-100'} rounded-full overflow-hidden shadow-inner`}>
              <div
                className={`h-full bg-gradient-to-r ${isWolse ? 'from-orange-500 to-amber-500' : 'from-amber-500 to-orange-500'} rounded-full relative transition-all duration-300 ease-out`}
                style={{ width: `${displayProgress}%` }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
              </div>
            </div>
            <div className="flex justify-between items-center mt-3">
              <p className={`text-lg font-bold ${isWolse ? 'text-orange-700' : 'text-amber-700'}`}>
                {Math.round(displayProgress)}% Complete
              </p>
              <p className="text-sm text-[#718096]">
                Step {Math.min(currentStep + 1, steps.length)} of {steps.length}
              </p>
            </div>
          </div>

          {/* Steps */}
          <div className="space-y-3">
            {steps.map((step, index) => (
              <div
                key={step.id}
                className={`
                  flex items-center gap-4 p-4 rounded-2xl transition-all duration-500
                  ${index < currentStep ? (isWolse ? 'bg-orange-50' : 'bg-amber-50') : ''}
                  ${index === currentStep && !isCompleted ? `bg-gradient-to-r ${isWolse ? 'from-orange-50 to-amber-50' : 'from-amber-50 to-orange-50'} shadow-md scale-[1.02] border ${isWolse ? 'border-orange-200' : 'border-amber-200'}` : ''}
                  ${index >= currentStep && isCompleted ? (isWolse ? 'bg-orange-50' : 'bg-amber-50') : ''}
                  ${index > currentStep && !isCompleted ? 'bg-gray-50/50' : ''}
                `}
              >
                <div className={`
                  flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg shadow-sm transition-all duration-500
                  ${index < currentStep || isCompleted ? `bg-gradient-to-br ${isWolse ? 'from-orange-500 to-amber-500' : 'from-amber-500 to-orange-500'} text-white` : ''}
                  ${index === currentStep && !isCompleted ? `bg-gradient-to-br ${isWolse ? 'from-orange-500 to-amber-500' : 'from-amber-500 to-orange-500'} text-white` : ''}
                  ${index > currentStep && !isCompleted ? 'bg-gray-200 text-gray-500' : ''}
                `}>
                  {index < currentStep || isCompleted ? (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <span className="text-xl">{step.icon}</span>
                  )}
                </div>
                <div className="flex-1">
                  <span className={`
                    font-semibold text-lg
                    ${index <= currentStep || isCompleted ? 'text-[#1A202C]' : 'text-[#A0AEC0]'}
                  `}>
                    {step.name}
                  </span>
                </div>
                {index === currentStep && !isCompleted && (
                  <div className="flex-shrink-0">
                    <div className="flex gap-1">
                      <div className={`w-2 h-2 ${isWolse ? 'bg-orange-500' : 'bg-amber-500'} rounded-full animate-bounce`} style={{ animationDelay: '0ms' }}></div>
                      <div className={`w-2 h-2 ${isWolse ? 'bg-orange-500' : 'bg-amber-500'} rounded-full animate-bounce`} style={{ animationDelay: '150ms' }}></div>
                      <div className={`w-2 h-2 ${isWolse ? 'bg-orange-500' : 'bg-amber-500'} rounded-full animate-bounce`} style={{ animationDelay: '300ms' }}></div>
                    </div>
                  </div>
                )}
                {(index < currentStep || isCompleted) && (
                  <div className={`flex-shrink-0 ${isWolse ? 'text-orange-600 bg-orange-100' : 'text-amber-600 bg-amber-100'} font-semibold text-sm px-3 py-1 rounded-full`}>
                    Done
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
        )}

        {/* Security Note - only show when not in error state */}
        {!errorMessage && (
        <div className={`flex items-start gap-4 p-6 ${isWolse ? 'bg-orange-50' : 'bg-amber-50'} rounded-2xl border ${isWolse ? 'border-orange-200' : 'border-amber-200'}`}>
          <div className={`w-12 h-12 ${isWolse ? 'bg-orange-100' : 'bg-amber-100'} rounded-xl flex items-center justify-center flex-shrink-0`}>
            <svg className={`w-6 h-6 ${isWolse ? 'text-orange-600' : 'text-amber-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <div>
            <h3 className="font-bold text-[#1A202C] mb-1">Your data is secure</h3>
            <p className="text-[#4A5568] text-sm">
              We analyze your documents using encrypted connections and never store sensitive information after processing.
            </p>
          </div>
        </div>
        )}
      </div>

      {/* Shimmer animation for progress bar */}
      <style jsx>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
      `}</style>
    </div>
  );
}
