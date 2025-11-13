'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card } from '@/components/ui/Card';

const steps = [
  { id: 1, name: 'Register document analysis', duration: 4000 },
  { id: 2, name: 'Real estate price lookup', duration: 3000 },
  { id: 3, name: 'Building register verification', duration: 3000 },
  { id: 4, name: 'Risk analysis', duration: 5000 },
  { id: 5, name: 'Generating report', duration: 3000 }
];

export default function ProcessingPage() {
  const router = useRouter();
  const params = useParams();
  const analysisId = params.id as string;

  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<string>('processing');

  useEffect(() => {
    // Poll for status updates
    const checkStatus = async () => {
      try {
        const response = await fetch(`/api/analysis/status/${analysisId}`);
        const data = await response.json();

        if (data.status === 'completed') {
          setProgress(100);
          setTimeout(() => {
            router.push(`/analyze/${analysisId}/report`);
          }, 1000);
        } else if (data.status === 'failed') {
          setStatus('failed');
          alert('An error occurred during analysis');
        } else {
          // Use server progress if available
          if (data.progress) {
            setProgress(data.progress);
          }
        }
      } catch (error) {
        console.error('Status check error:', error);
      }
    };

    // Initial check
    checkStatus();

    // Poll every 2 seconds
    const interval = setInterval(checkStatus, 2000);

    return () => clearInterval(interval);
  }, [analysisId, router]);

  useEffect(() => {
    // Simulate processing steps for visual feedback
    const totalDuration = steps.reduce((sum, step) => sum + step.duration, 0);
    let elapsed = 0;

    const interval = setInterval(() => {
      elapsed += 100;
      const simulatedProgress = Math.min((elapsed / totalDuration) * 100, 95);

      // Only update if server progress is lower
      setProgress(prev => Math.max(prev, simulatedProgress));

      // Update current step
      let cumulativeDuration = 0;
      for (let i = 0; i < steps.length; i++) {
        cumulativeDuration += steps[i].duration;
        if (elapsed < cumulativeDuration) {
          setCurrentStep(i);
          break;
        }
      }

      if (elapsed >= totalDuration) {
        clearInterval(interval);
      }
    }, 100);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-900 via-emerald-900 to-teal-950">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      <div className="container mx-auto px-6 py-16 max-w-3xl relative z-10">
        {/* Header */}
        <div className="mb-12 text-center">
          <div className="inline-block px-4 py-2 bg-emerald-100/10 backdrop-blur-sm border border-emerald-100/20 rounded-full text-sm font-semibold mb-6 text-emerald-100">
            Step 3 of 3
          </div>

          {/* Animated spinner */}
          <div className="mb-8 flex justify-center">
            <div className="relative w-24 h-24">
              <div className="absolute inset-0 border-8 border-emerald-100/20 rounded-full"></div>
              <div className="absolute inset-0 border-8 border-emerald-400 border-t-transparent rounded-full animate-spin"></div>
              <div className="absolute inset-3 bg-emerald-500/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                <svg className="w-10 h-10 text-emerald-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight" style={{ letterSpacing: '-0.03em' }}>
            Analyzing your property...
          </h1>
          <p className="text-xl text-emerald-50/90">
            Please wait. This takes about 1-2 minutes.
          </p>
        </div>

        {/* Progress Card */}
        <Card className="mb-8 bg-white/95 backdrop-blur-sm border-0 shadow-2xl">
          {/* Progress Bar */}
          <div className="mb-10">
            <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-600 to-teal-600 transition-all duration-500 ease-out rounded-full shadow-lg"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex justify-between items-center mt-3">
              <p className="text-sm font-semibold text-gray-700">
                {Math.round(progress)}% Complete
              </p>
              <p className="text-sm text-gray-500">
                ~{Math.max(0, Math.round((100 - progress) / 50))} min remaining
              </p>
            </div>
          </div>

          {/* Steps */}
          <div className="space-y-4">
            {steps.map((step, index) => (
              <div
                key={step.id}
                className={`
                  flex items-center gap-5 p-5 rounded-xl transition-all duration-300
                  ${index < currentStep ? 'bg-emerald-50' : ''}
                  ${index === currentStep ? 'bg-gradient-to-r from-emerald-50 to-teal-50 shadow-md scale-[1.02]' : ''}
                  ${index > currentStep ? 'bg-gray-50' : ''}
                `}
              >
                <div className={`
                  flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg shadow-sm
                  ${index < currentStep ? 'bg-gradient-to-br from-emerald-600 to-teal-600 text-white' : ''}
                  ${index === currentStep ? 'bg-gradient-to-br from-emerald-600 to-teal-600 text-white animate-pulse' : ''}
                  ${index > currentStep ? 'bg-gray-300 text-gray-600' : ''}
                `}>
                  {index < currentStep ? (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    step.id
                  )}
                </div>
                <div className="flex-1">
                  <span className={`
                    font-semibold text-lg
                    ${index <= currentStep ? 'text-gray-900' : 'text-gray-500'}
                  `}>
                    {step.name}
                  </span>
                </div>
                {index === currentStep && (
                  <div className="flex-shrink-0">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-emerald-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-2 h-2 bg-emerald-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-2 h-2 bg-emerald-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                  </div>
                )}
                {index < currentStep && (
                  <div className="flex-shrink-0 text-emerald-600 font-semibold text-sm">
                    Done
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>

        {/* Info Card */}
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-6 border-l-4 border-emerald-500 shadow-xl">
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center">
              <span className="text-2xl">💡</span>
            </div>
            <div>
              <h3 className="font-bold text-gray-900 mb-2 text-lg">Did you know?</h3>
              <p className="text-gray-700 leading-relaxed">
                Between 2022-2024, jeonse fraud caused over ₩1 trillion in damages in Korea.
                Thorough pre-screening is essential to protect your deposit.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
