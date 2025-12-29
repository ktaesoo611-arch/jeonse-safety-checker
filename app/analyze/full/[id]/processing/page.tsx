'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

const steps = [
  { id: 1, name: 'Register document analysis', icon: '📄' },
  { id: 2, name: 'Real estate price lookup', icon: '🏠' },
  { id: 3, name: 'Debt and lien verification', icon: '✅' },
  { id: 4, name: 'Market rent comparison', icon: '💰' },
  { id: 5, name: 'Risk analysis', icon: '🔍' },
  { id: 6, name: 'Generating combined report', icon: '📊' }
];

export default function FullRentalProcessingPage() {
  const router = useRouter();
  const params = useParams();
  const analysisId = params.id as string;

  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<string>('processing');
  const [wolseStatus, setWolseStatus] = useState<'pending' | 'processing' | 'completed' | 'failed'>('pending');
  const [wolseResult, setWolseResult] = useState<any>(null);

  // Run wolse analysis
  useEffect(() => {
    const runWolseAnalysis = async () => {
      const storedData = sessionStorage.getItem(`full-rental-${analysisId}`);
      if (!storedData) {
        console.log('No wolse data found in session storage');
        setWolseStatus('completed'); // Skip if no data
        return;
      }

      try {
        setWolseStatus('processing');
        const wolseData = JSON.parse(storedData);

        // Run wolse preview API to get price analysis
        const response = await fetch('/api/wolse/preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            city: wolseData.city,
            district: wolseData.district,
            dong: wolseData.dong,
            apartmentName: wolseData.apartmentName,
            exclusiveArea: wolseData.exclusiveArea,
            deposit: wolseData.deposit,
            monthlyRent: wolseData.monthlyRent
          })
        });

        const data = await response.json();

        if (response.ok) {
          // Store wolse result in session storage for the report page
          sessionStorage.setItem(`full-rental-wolse-result-${analysisId}`, JSON.stringify(data));
          setWolseResult(data);
          setWolseStatus('completed');
        } else {
          console.error('Wolse analysis failed:', data.error);
          setWolseStatus('failed');
        }
      } catch (error) {
        console.error('Wolse analysis error:', error);
        setWolseStatus('failed');
      }
    };

    runWolseAnalysis();
  }, [analysisId]);

  // Poll for deposit safety analysis status
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const response = await fetch(`/api/analysis/status/${analysisId}`);
        const data = await response.json();

        if (data.status === 'completed') {
          // Check if wolse is also done
          if (wolseStatus === 'completed' || wolseStatus === 'failed') {
            setProgress(100);
            setCurrentStep(steps.length - 1);
            setTimeout(() => {
              router.push(`/analyze/full/${analysisId}/report`);
            }, 1000);
          } else {
            // Wait for wolse to complete
            setProgress(80);
            setCurrentStep(4);
          }
        } else if (data.status === 'failed') {
          setStatus('failed');
        } else {
          // Use server progress if available (cap at 60% until wolse completes)
          if (typeof data.progress === 'number') {
            const cappedProgress = Math.min(data.progress * 0.6, 60);
            setProgress(cappedProgress);

            // Update current step based on progress
            const stepIndex = Math.min(
              Math.floor((cappedProgress / 100) * steps.length),
              3 // Cap at step 4 until wolse completes
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

    // Poll every 1 second for smoother updates
    const interval = setInterval(checkStatus, 1000);

    return () => clearInterval(interval);
  }, [analysisId, router, wolseStatus]);

  // Update progress when wolse completes
  useEffect(() => {
    if (wolseStatus === 'completed') {
      setProgress(prev => Math.max(prev, 70));
      setCurrentStep(prev => Math.max(prev, 4));
    }
  }, [wolseStatus]);

  return (
    <div className="min-h-screen bg-[#FDFBF7]">
      {/* Warm gradient background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-[#FEF7ED] via-[#FDFBF7] to-[#F5F0E8]" />
        <div className="absolute top-20 right-[10%] w-96 h-96 bg-green-200/30 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-[20%] left-[5%] w-72 h-72 bg-emerald-200/30 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-[40%] left-[50%] w-64 h-64 bg-amber-200/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      {/* Header */}
      <header className="relative z-10 bg-[#FDFBF7]/80 backdrop-blur-md border-b border-green-100">
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

      <div className="relative z-10 container mx-auto px-6 py-16 max-w-3xl">
        {/* Header Section */}
        <div className="mb-12 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-full text-sm font-semibold mb-6 border border-green-200">
            <span>Full Wolse Check</span>
            <span className="text-green-400">|</span>
            <span>Step 3 of 3</span>
          </div>

          {/* Animated spinner */}
          <div className="mb-8 flex justify-center">
            <div className="relative w-28 h-28">
              <div className="absolute inset-0 border-8 border-green-200 rounded-full"></div>
              <div className="absolute inset-0 border-8 border-green-500 border-t-transparent rounded-full animate-spin"></div>
              <div className="absolute inset-3 bg-gradient-to-br from-green-100 to-emerald-100 rounded-full flex items-center justify-center shadow-inner">
                <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <h1 className="text-4xl md:text-5xl font-bold text-[#1A202C] mb-4 tracking-tight" style={{ letterSpacing: '-0.03em' }}>
            Running full analysis...
          </h1>
          <p className="text-xl text-[#4A5568]">
            Analyzing deposit safety AND rent prices. This usually takes about 30-45 seconds.
          </p>
        </div>

        {/* Progress Card */}
        <div className="bg-white rounded-3xl p-8 mb-8 shadow-xl shadow-green-900/5 border border-green-100">
          {/* Progress Bar */}
          <div className="mb-10">
            <div className="h-4 bg-green-100 rounded-full overflow-hidden shadow-inner">
              <div
                className="h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-500 ease-out rounded-full relative"
                style={{ width: `${progress}%` }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
              </div>
            </div>
            <div className="flex justify-between items-center mt-3">
              <p className="text-lg font-bold text-green-700">
                {Math.round(progress)}% Complete
              </p>
              <p className="text-sm text-[#718096]">
                {progress < 100 ? `~${Math.max(5, Math.round((100 - progress) / 2))} seconds remaining` : 'Almost done!'}
              </p>
            </div>
          </div>

          {/* Steps */}
          <div className="space-y-3">
            {steps.map((step, index) => (
              <div
                key={step.id}
                className={`
                  flex items-center gap-4 p-4 rounded-2xl transition-all duration-300
                  ${index < currentStep ? 'bg-green-50' : ''}
                  ${index === currentStep ? 'bg-gradient-to-r from-green-50 to-emerald-50 shadow-md scale-[1.02] border border-green-200' : ''}
                  ${index > currentStep ? 'bg-gray-50/50' : ''}
                `}
              >
                <div className={`
                  flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg shadow-sm
                  ${index < currentStep ? 'bg-gradient-to-br from-green-500 to-emerald-500 text-white' : ''}
                  ${index === currentStep ? 'bg-gradient-to-br from-green-500 to-emerald-500 text-white animate-pulse' : ''}
                  ${index > currentStep ? 'bg-gray-200 text-gray-500' : ''}
                `}>
                  {index < currentStep ? (
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
                    ${index <= currentStep ? 'text-[#1A202C]' : 'text-[#A0AEC0]'}
                  `}>
                    {step.name}
                  </span>
                </div>
                {index === currentStep && (
                  <div className="flex-shrink-0">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                  </div>
                )}
                {index < currentStep && (
                  <div className="flex-shrink-0 text-green-600 font-semibold text-sm bg-green-100 px-3 py-1 rounded-full">
                    Done
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* What You'll Get */}
        <div className="grid md:grid-cols-2 gap-4 mb-8">
          <div className="bg-white rounded-2xl p-5 border border-green-100 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-gradient-to-br from-green-100 to-emerald-100 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h4 className="font-bold text-[#1A202C]">Deposit Safety</h4>
            </div>
            <ul className="text-sm text-[#718096] space-y-1">
              <li>• Safety score (0-100)</li>
              <li>• Risk level assessment</li>
              <li>• Debt and lien analysis</li>
              <li>• LTV calculation</li>
              <li>• Risk factors & recommendations</li>
            </ul>
          </div>
          <div className="bg-white rounded-2xl p-5 border border-amber-100 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-gradient-to-br from-amber-100 to-orange-100 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h4 className="font-bold text-[#1A202C]">Price Check</h4>
            </div>
            <ul className="text-sm text-[#718096] space-y-1">
              <li>• Fair / High / Overpriced rating</li>
              <li>• Market rate comparison</li>
              <li>• Savings potential</li>
              <li>• Recent transactions</li>
              <li>• Negotiation tips</li>
            </ul>
          </div>
        </div>

        {/* Info Card */}
        <div className="bg-gradient-to-br from-green-900 to-emerald-950 rounded-3xl p-6 text-white shadow-xl shadow-green-900/20">
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-12 h-12 bg-green-100/20 rounded-xl flex items-center justify-center">
              <span className="text-2xl">💡</span>
            </div>
            <div>
              <h3 className="font-bold text-green-100 mb-2 text-lg">Did you know?</h3>
              <p className="text-green-50/90 leading-relaxed">
                Combining deposit safety with rent price analysis gives you complete protection.
                Over 24,000 victims lost deposits to fraud in 2023, and many more overpaid on rent.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Add shimmer animation */}
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
