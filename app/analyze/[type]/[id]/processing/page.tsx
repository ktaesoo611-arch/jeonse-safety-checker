'use client';

import { useEffect, useState, useRef } from 'react';
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
  const accentColor = isWolse ? 'orange' : 'amber';

  const [currentStep, setCurrentStep] = useState(0);
  const [targetProgress, setTargetProgress] = useState(0);
  const [displayProgress, setDisplayProgress] = useState(0);
  const [status, setStatus] = useState<string>('processing');
  const animationRef = useRef<number | null>(null);

  // Smooth progress animation
  useEffect(() => {
    const animate = () => {
      setDisplayProgress(prev => {
        const diff = targetProgress - prev;
        if (Math.abs(diff) < 0.5) {
          return targetProgress;
        }
        // Ease toward target - move 5% of the remaining distance each frame
        return prev + diff * 0.05;
      });
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [targetProgress]);

  useEffect(() => {
    // Poll for status updates
    const checkStatus = async () => {
      try {
        const response = await fetch(`/api/analysis/status/${analysisId}`);
        const data = await response.json();

        if (data.status === 'completed') {
          setTargetProgress(100);
          setCurrentStep(steps.length - 1);
          setTimeout(() => {
            router.push(`/analyze/${type}/${analysisId}/preview`);
          }, 1500);
        } else if (data.status === 'failed') {
          setStatus('failed');
          alert('An error occurred during analysis');
        } else {
          // Use server progress if available
          if (typeof data.progress === 'number') {
            setTargetProgress(data.progress);

            // Update current step based on progress
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

    // Poll every 1 second for smoother updates
    const interval = setInterval(checkStatus, 1000);

    return () => clearInterval(interval);
  }, [analysisId, router, type]);

  return (
    <div className="min-h-screen bg-[#FDFBF7]">
      {/* Warm gradient background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-[#FEF7ED] via-[#FDFBF7] to-[#F5F0E8]" />
        <div className={`absolute top-20 right-[10%] w-96 h-96 ${isWolse ? 'bg-orange-200/30' : 'bg-amber-200/30'} rounded-full blur-3xl animate-pulse`} />
        <div className={`absolute bottom-[20%] left-[5%] w-72 h-72 ${isWolse ? 'bg-amber-200/30' : 'bg-orange-200/30'} rounded-full blur-3xl animate-pulse`} style={{ animationDelay: '1s' }} />
        <div className="absolute top-[40%] left-[50%] w-64 h-64 bg-yellow-200/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
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
        {/* Header Section */}
        <div className="mb-12 text-center">
          <div className={`inline-flex items-center gap-2 px-4 py-2 bg-${accentColor}-50 text-${accentColor}-700 rounded-full text-sm font-semibold mb-6 border border-${accentColor}-200`}>
            <span>{isWolse ? 'Wolse' : 'Jeonse'} Check</span>
            <span className={`text-${accentColor}-400`}>|</span>
            <span>Step 3 of 4</span>
          </div>

          <h1 className="text-4xl md:text-5xl font-bold text-[#1A202C] mb-4 tracking-tight" style={{ letterSpacing: '-0.03em' }}>
            Analyzing your property...
          </h1>
          <p className="text-xl text-[#4A5568]">
            Please wait. This usually takes about 30 seconds.
          </p>
        </div>

        {/* Progress Card */}
        <div className={`bg-white rounded-3xl p-8 mb-8 shadow-xl shadow-${accentColor}-900/5 border border-${accentColor}-100`}>
          {/* Progress Bar */}
          <div className="mb-10">
            <div className={`h-4 ${isWolse ? 'bg-orange-100' : 'bg-amber-100'} rounded-full overflow-hidden shadow-inner`}>
              <div
                className={`h-full bg-gradient-to-r ${isWolse ? 'from-orange-500 to-amber-500' : 'from-amber-500 to-orange-500'} rounded-full relative`}
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
                {displayProgress < 100 ? `~${Math.max(5, Math.round((100 - displayProgress) / 3))} seconds remaining` : 'Almost done!'}
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
                  ${index < currentStep ? (isWolse ? 'bg-orange-50' : 'bg-amber-50') : ''}
                  ${index === currentStep ? `bg-gradient-to-r ${isWolse ? 'from-orange-50 to-amber-50' : 'from-amber-50 to-orange-50'} shadow-md scale-[1.02] border ${isWolse ? 'border-orange-200' : 'border-amber-200'}` : ''}
                  ${index > currentStep ? 'bg-gray-50/50' : ''}
                `}
              >
                <div className={`
                  flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg shadow-sm
                  ${index < currentStep ? `bg-gradient-to-br ${isWolse ? 'from-orange-500 to-amber-500' : 'from-amber-500 to-orange-500'} text-white` : ''}
                  ${index === currentStep ? `bg-gradient-to-br ${isWolse ? 'from-orange-500 to-amber-500' : 'from-amber-500 to-orange-500'} text-white animate-pulse` : ''}
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
                      <div className={`w-2 h-2 ${isWolse ? 'bg-orange-500' : 'bg-amber-500'} rounded-full animate-bounce`} style={{ animationDelay: '0ms' }}></div>
                      <div className={`w-2 h-2 ${isWolse ? 'bg-orange-500' : 'bg-amber-500'} rounded-full animate-bounce`} style={{ animationDelay: '150ms' }}></div>
                      <div className={`w-2 h-2 ${isWolse ? 'bg-orange-500' : 'bg-amber-500'} rounded-full animate-bounce`} style={{ animationDelay: '300ms' }}></div>
                    </div>
                  </div>
                )}
                {index < currentStep && (
                  <div className={`flex-shrink-0 ${isWolse ? 'text-orange-600 bg-orange-100' : 'text-amber-600 bg-amber-100'} font-semibold text-sm px-3 py-1 rounded-full`}>
                    Done
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Security Note */}
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
