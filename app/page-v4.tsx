'use client';

import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { useScrollAnimation } from '@/lib/hooks/useScrollAnimation';

/**
 * Premium Landing Page V4
 * Design: Warm, Trustworthy, Neighborly
 * Theme: Light, warm colors, home imagery, safe feeling
 */
export default function LandingPageV4() {
  const [mounted, setMounted] = useState(false);

  const aboutSection = useScrollAnimation({ threshold: 0.2 });
  const processSection = useScrollAnimation({ threshold: 0.2 });
  const trustSection = useScrollAnimation({ threshold: 0.2 });
  const ctaSection = useScrollAnimation({ threshold: 0.3 });

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#2D3748] selection:bg-amber-200 selection:text-amber-900">
      {/* Warm gradient background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-[#FEF7ED] via-[#FDFBF7] to-[#F5F0E8]" />
        {/* Subtle warm pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 5L35 15H25L30 5z' fill='%23B8860B' fill-opacity='0.4'/%3E%3C/svg%3E")`,
            backgroundSize: '60px 60px'
          }}
        />
        {/* Floating decorative elements */}
        <div className="absolute top-20 left-[10%] w-64 h-64 bg-amber-200/20 rounded-full blur-3xl animate-float-slow" />
        <div className="absolute top-[40%] right-[5%] w-48 h-48 bg-orange-200/20 rounded-full blur-3xl animate-float-slow-reverse" />
        <div className="absolute bottom-[20%] left-[20%] w-56 h-56 bg-yellow-200/15 rounded-full blur-3xl animate-float" />
        <div className="absolute top-[60%] right-[25%] w-40 h-40 bg-green-200/10 rounded-full blur-3xl animate-float-slow" />
      </div>

      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-[#FDFBF7]/80 backdrop-blur-md border-b border-amber-100">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-amber-200">
              <HomeIcon className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-semibold text-[#2D3748]">Jeonse Safety</span>
          </Link>
          <div className="flex items-center gap-8">
            <a href="#about" className="text-[#4A5568] hover:text-[#2D3748] text-sm font-medium transition-colors">
              About
            </a>
            <a href="#how-it-works" className="text-[#4A5568] hover:text-[#2D3748] text-sm font-medium transition-colors">
              How it works
            </a>
            <Link href="/analyze">
              <button className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-semibold rounded-full hover:shadow-lg hover:shadow-amber-200 transition-all hover:-translate-y-0.5">
                Start Analysis
              </button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 min-h-screen flex items-center pt-20">
        <div className="max-w-6xl mx-auto px-6 w-full">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left: Content */}
            <div className={`transition-all duration-1000 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              {/* Trust badge */}
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-full mb-8">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-green-700 text-sm font-medium">Trusted by 1,000+ expats in Korea</span>
              </div>

              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-[1.1] text-[#1A202C] mb-6">
                Your deposit is
                <span className="relative inline-block mx-3">
                  <span className="relative z-10">safe</span>
                  <span className="absolute bottom-2 left-0 right-0 h-3 bg-amber-300/50 -z-0" />
                </span>
                with us
              </h1>

              <p className="text-lg text-[#4A5568] leading-relaxed mb-8 max-w-lg">
                We help foreigners in Korea understand their rental contracts and protect
                their jeonse deposits. Think of us as your friendly neighborhood expert.
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-wrap items-center gap-4 mb-12">
                <Link href="/analyze">
                  <button className="group px-8 py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold rounded-2xl hover:shadow-xl hover:shadow-amber-200/50 transition-all hover:-translate-y-1 flex items-center gap-3">
                    Check my contract
                    <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </button>
                </Link>
                <a href="#how-it-works" className="px-6 py-4 text-[#4A5568] font-medium hover:text-[#2D3748] transition-colors flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  See how it works
                </a>
              </div>

              {/* Trust indicators */}
              <div className="flex items-center gap-8 pt-8 border-t border-amber-100">
                <div className="flex items-center gap-2">
                  <ShieldCheckIcon className="w-5 h-5 text-green-600" />
                  <span className="text-sm text-[#4A5568]">100% Secure</span>
                </div>
                <div className="flex items-center gap-2">
                  <TranslateIcon className="w-5 h-5 text-blue-600" />
                  <span className="text-sm text-[#4A5568]">Full English</span>
                </div>
                <div className="flex items-center gap-2">
                  <ClockIcon className="w-5 h-5 text-amber-600" />
                  <span className="text-sm text-[#4A5568]">2 min analysis</span>
                </div>
              </div>
            </div>

            {/* Right: Animated House Illustration */}
            <div className={`relative transition-all duration-1000 delay-300 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              <AnimatedHouse />
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section
        id="about"
        ref={aboutSection.elementRef as any}
        className={`relative z-10 py-24 px-6 transition-all duration-1000 ${aboutSection.isVisible ? 'opacity-100' : 'opacity-0'}`}
      >
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-amber-600 text-sm font-semibold tracking-wider uppercase">Why we exist</span>
            <h2 className="mt-4 text-3xl md:text-4xl font-bold text-[#1A202C]">
              Moving to Korea should be exciting,<br />not stressful
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <ProblemCard
              icon={<DocumentIcon />}
              title="Complex documents"
              description="Korean property registers are filled with legal terms that even natives struggle to understand."
              color="red"
              delay={0}
            />
            <ProblemCard
              icon={<CurrencyIcon />}
              title="Large deposits at risk"
              description="Jeonse deposits often exceed ₩300M. Without proper checks, you could lose everything."
              color="amber"
              delay={150}
            />
            <ProblemCard
              icon={<QuestionIcon />}
              title="No one to ask"
              description="Finding English-speaking real estate lawyers in Korea is difficult and expensive."
              color="blue"
              delay={300}
            />
          </div>

          {/* Solution banner */}
          <StaggeredFadeIn delay={400}>
            <div className="mt-16 p-8 bg-gradient-to-r from-green-50 to-emerald-50 rounded-3xl border border-green-100 hover:shadow-xl hover:shadow-green-100/50 transition-all duration-300 group">
              <div className="flex flex-col md:flex-row items-center gap-6 text-center md:text-left">
                <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
                  <CheckCircleIcon className="w-8 h-8 text-green-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-green-900 mb-2">That's why we built Jeonse Safety</h3>
                  <p className="text-green-700">
                    We translate your documents, analyze 20+ risk factors, and give you a clear safety score —
                    all in English, in under 2 minutes.
                  </p>
                </div>
              </div>
            </div>
          </StaggeredFadeIn>
        </div>
      </section>

      {/* How It Works Section */}
      <section
        id="how-it-works"
        ref={processSection.elementRef as any}
        className={`relative z-10 py-24 px-6 bg-white transition-all duration-1000 ${processSection.isVisible ? 'opacity-100' : 'opacity-0'}`}
      >
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-amber-600 text-sm font-semibold tracking-wider uppercase">How it works</span>
            <h2 className="mt-4 text-3xl md:text-4xl font-bold text-[#1A202C]">
              Three simple steps to peace of mind
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <StepCard
              number="1"
              title="Select your apartment"
              description="Search from 10,800+ Seoul & Gyeonggi apartments in our database. Works in English or Korean."
              icon={<SearchIcon />}
              delay={0}
            />
            <StepCard
              number="2"
              title="Upload the document"
              description="Upload the property register (등기부등본) PDF from iros.go.kr."
              icon={<UploadIcon />}
              delay={200}
            />
            <StepCard
              number="3"
              title="Get your report"
              description="Receive a comprehensive English report with safety score and recommendations."
              icon={<ReportIcon />}
              delay={400}
            />
          </div>

          {/* Sample report preview */}
          <StaggeredFadeIn delay={500}>
            <div className="mt-16 relative group">
              <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent z-10 pointer-events-none" />
              <div className="bg-[#1A202C] rounded-2xl p-6 shadow-2xl group-hover:shadow-amber-200/20 transition-all duration-500 group-hover:-translate-y-2">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500 animate-pulse" style={{ animationDelay: '0.2s' }} />
                  <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" style={{ animationDelay: '0.4s' }} />
                  <span className="text-white/40 text-sm ml-4">Safety Report</span>
                </div>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="bg-white/5 rounded-xl p-4 hover:bg-white/10 transition-colors">
                    <div className="text-white/40 text-sm mb-2">Safety Score</div>
                    <div className="text-4xl font-bold text-green-400">87</div>
                    <div className="text-green-400 text-sm mt-1">Low Risk</div>
                  </div>
                  <div className="bg-white/5 rounded-xl p-4 hover:bg-white/10 transition-colors">
                    <div className="text-white/40 text-sm mb-2">Market Value</div>
                    <div className="text-2xl font-bold text-white">₩485M</div>
                    <div className="text-white/60 text-sm mt-1">vs ₩420M deposit</div>
                  </div>
                  <div className="bg-white/5 rounded-xl p-4 hover:bg-white/10 transition-colors">
                    <div className="text-white/40 text-sm mb-2">Risk Factors</div>
                    <div className="text-2xl font-bold text-white">2 / 20</div>
                    <div className="text-amber-400 text-sm mt-1">Minor issues</div>
                  </div>
                </div>
              </div>
            </div>
          </StaggeredFadeIn>
        </div>
      </section>

      {/* Trust Section */}
      <section
        ref={trustSection.elementRef as any}
        className={`relative z-10 py-24 px-6 transition-all duration-1000 ${trustSection.isVisible ? 'opacity-100' : 'opacity-0'}`}
      >
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-amber-600 text-sm font-semibold tracking-wider uppercase">Why trust us</span>
            <h2 className="mt-4 text-3xl md:text-4xl font-bold text-[#1A202C]">
              Built by expats, for expats
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <TrustCard
              number="10,800+"
              label="Apartments"
              description="Seoul & Gyeonggi properties"
              delay={0}
            />
            <TrustCard
              number="20+"
              label="Risk Checks"
              description="Comprehensive analysis factors"
              delay={100}
            />
            <TrustCard
              number="100%"
              label="English"
              description="Full translation included"
              delay={200}
            />
            <TrustCard
              number="2 min"
              label="Analysis"
              description="Fast, accurate results"
              delay={300}
            />
          </div>

          {/* Testimonial */}
          <StaggeredFadeIn delay={400}>
            <div className="mt-16 p-8 bg-amber-50 rounded-3xl border border-amber-100 hover:shadow-lg hover:shadow-amber-100/50 transition-all duration-300 group">
              <div className="flex flex-col md:flex-row gap-6 items-start">
                <div className="text-6xl text-amber-300 group-hover:scale-110 transition-transform duration-300">"</div>
                <div>
                  <p className="text-lg text-[#4A5568] leading-relaxed mb-4">
                    I was about to sign a contract when I found Jeonse Safety. The analysis revealed a hidden
                    mortgage I didn't know about. Saved me from potentially losing my entire deposit.
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-amber-200 rounded-full flex items-center justify-center text-amber-700 font-bold group-hover:scale-110 transition-transform duration-300">
                      M
                    </div>
                    <div>
                      <div className="font-semibold text-[#2D3748]">Michael T.</div>
                      <div className="text-sm text-[#718096]">American expat in Seoul</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </StaggeredFadeIn>
        </div>
      </section>

      {/* CTA Section */}
      <section
        ref={ctaSection.elementRef as any}
        className={`relative z-10 py-24 px-6 bg-gradient-to-br from-amber-500 to-orange-500 transition-all duration-1000 ${ctaSection.isVisible ? 'opacity-100' : 'opacity-0'}`}
      >
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 rounded-full mb-8">
            <span className="text-white/90 text-sm font-medium">🎉 Free during beta</span>
          </div>

          <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
            Ready to protect your deposit?
          </h2>

          <p className="text-xl text-white/80 mb-10 max-w-2xl mx-auto">
            Join hundreds of expats who have safely navigated the Korean rental market.
            Your first analysis is completely free.
          </p>

          <Link href="/analyze">
            <button className="group px-10 py-5 bg-white text-amber-600 font-bold text-lg rounded-2xl hover:shadow-2xl transition-all hover:-translate-y-1 flex items-center gap-3 mx-auto">
              Start free analysis
              <svg className="w-6 h-6 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </button>
          </Link>

          <p className="mt-6 text-white/60 text-sm">
            No credit card required • Results in 2 minutes
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 py-16 px-6 bg-[#1A202C] text-white">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            {/* Brand */}
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center">
                  <HomeIcon className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-semibold">Jeonse Safety</span>
              </div>
              <p className="text-white/60 leading-relaxed max-w-sm">
                Helping foreigners in Korea protect their deposits with clear,
                English-language contract analysis.
              </p>
            </div>

            {/* Links */}
            <div>
              <div className="text-white/40 text-sm uppercase tracking-wider mb-4">Quick Links</div>
              <div className="space-y-3">
                <a href="#about" className="block text-white/70 hover:text-white transition-colors">About</a>
                <a href="#how-it-works" className="block text-white/70 hover:text-white transition-colors">How it works</a>
                <Link href="/analyze" className="block text-white/70 hover:text-white transition-colors">Start Analysis</Link>
              </div>
            </div>

            {/* Contact */}
            <div>
              <div className="text-white/40 text-sm uppercase tracking-wider mb-4">Contact</div>
              <div className="space-y-3 text-white/70">
                <p>contact@jeonse-safety.com</p>
                <p>010-2382-8432</p>
              </div>
            </div>
          </div>

          <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between gap-4 text-white/40 text-sm">
            <div>
              <p>Jeonse Safety Institute | Representative: Kim Tae-soo</p>
              <p>Business Registration: 595-47-01161</p>
            </div>
            <div className="md:text-right">
              <p>101-601, 407 Wangsimni-ro, Jung-gu, Seoul</p>
              <p>© 2025 All rights reserved</p>
            </div>
          </div>
        </div>
      </footer>

      {/* Animations */}
      <style jsx global>{`
        @keyframes v4-float {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-10px);
          }
        }

        @keyframes v4-float-slow {
          0%, 100% {
            transform: translateY(0px) scale(1);
          }
          50% {
            transform: translateY(-15px) scale(1.1);
          }
        }

        @keyframes v4-float-slow-reverse {
          0%, 100% {
            transform: translateY(0px) scale(1);
          }
          50% {
            transform: translateY(10px) scale(0.9);
          }
        }

        @keyframes v4-pulse-slow {
          0%, 100% {
            opacity: 0.8;
            transform: scale(0.9);
          }
          50% {
            opacity: 1;
            transform: scale(0.95);
          }
        }

        @keyframes v4-glow {
          0%, 100% {
            opacity: 0.3;
          }
          50% {
            opacity: 0.6;
          }
        }

        @keyframes v4-heartbeat {
          0%, 100% {
            transform: scale(1);
          }
          10% {
            transform: scale(1.1);
          }
          20% {
            transform: scale(1);
          }
          30% {
            transform: scale(1.1);
          }
          40% {
            transform: scale(1);
          }
        }

        @keyframes v4-smoke-rise {
          0% {
            transform: translateY(0) scale(1);
            opacity: 0.6;
          }
          100% {
            transform: translateY(-30px) scale(1.5);
            opacity: 0;
          }
        }

        .animate-float {
          animation: v4-float 3s ease-in-out infinite;
        }

        .animate-float-slow {
          animation: v4-float-slow 4s ease-in-out infinite;
        }

        .animate-float-slow-reverse {
          animation: v4-float-slow-reverse 5s ease-in-out infinite;
        }

        .animate-pulse-slow {
          animation: v4-pulse-slow 4s ease-in-out infinite;
        }

        .animate-glow {
          animation: v4-glow 2s ease-in-out infinite;
        }

        .animate-heartbeat {
          animation: v4-heartbeat 2s ease-in-out infinite;
        }

        .animate-smoke-1 {
          animation: v4-smoke-rise 3s ease-out infinite;
          animation-delay: 0s;
        }

        .animate-smoke-2 {
          animation: v4-smoke-rise 3s ease-out infinite;
          animation-delay: 1s;
        }

        .animate-smoke-3 {
          animation: v4-smoke-rise 3s ease-out infinite;
          animation-delay: 2s;
        }
      `}</style>
    </div>
  );
}

// ============ Animated House Component ============

function AnimatedHouse() {
  const [windowsLit, setWindowsLit] = useState([true, true, true, true]);
  const [showHeart, setShowHeart] = useState(true);

  useEffect(() => {
    // Animate windows lighting up sequentially
    setWindowsLit([false, false, false, false]);
    const timeouts: NodeJS.Timeout[] = [];

    [0, 1, 2, 3].forEach((index) => {
      const timeout = setTimeout(() => {
        setWindowsLit(prev => {
          const newState = [...prev];
          newState[index] = true;
          return newState;
        });
      }, 500 + index * 300);
      timeouts.push(timeout);
    });

    // Show heart after windows are lit
    setShowHeart(false);
    const heartTimeout = setTimeout(() => setShowHeart(true), 2500);
    timeouts.push(heartTimeout);

    return () => timeouts.forEach(t => clearTimeout(t));
  }, []);

  return (
    <div className="relative w-full max-w-lg mx-auto aspect-square">
      {/* Background circle */}
      <div className="absolute inset-0 bg-gradient-to-br from-amber-100 to-orange-100 rounded-full scale-90" />

      {/* House SVG */}
      <svg viewBox="0 0 400 350" className="relative z-10 w-full h-auto drop-shadow-2xl">
        {/* Ground */}
        <ellipse cx="200" cy="320" rx="150" ry="20" fill="#8B7355" opacity="0.2" />

        {/* House body */}
        <rect x="80" y="150" width="240" height="150" rx="8" fill="#FEFCE8" stroke="#D97706" strokeWidth="3" />

        {/* Roof */}
        <path d="M60 160 L200 60 L340 160 Z" fill="#DC2626" stroke="#B91C1C" strokeWidth="3" />
        <path d="M80 160 L200 80 L320 160 Z" fill="#EF4444" />

        {/* Chimney */}
        <rect x="260" y="80" width="40" height="60" fill="#78716C" stroke="#57534E" strokeWidth="2" />

        {/* Smoke circles */}
        <circle cx="280" cy="60" r="8" fill="#E5E5E5" className="animate-smoke-1" />
        <circle cx="285" cy="45" r="10" fill="#D4D4D4" className="animate-smoke-2" />
        <circle cx="275" cy="30" r="7" fill="#E5E5E5" className="animate-smoke-3" />

        {/* Door */}
        <rect x="170" y="210" width="60" height="90" rx="30" fill="#92400E" stroke="#78350F" strokeWidth="3" />
        <circle cx="215" cy="260" r="5" fill="#FCD34D" />

        {/* Windows */}
        {/* Top left window */}
        <rect x="100" y="170" width="50" height="50" rx="4" fill={windowsLit[0] ? '#FEF3C7' : '#E5E7EB'} stroke="#D97706" strokeWidth="2" />
        <line x1="125" y1="170" x2="125" y2="220" stroke="#D97706" strokeWidth="2" />
        <line x1="100" y1="195" x2="150" y2="195" stroke="#D97706" strokeWidth="2" />

        {/* Top right window */}
        <rect x="250" y="170" width="50" height="50" rx="4" fill={windowsLit[1] ? '#FEF3C7' : '#E5E7EB'} stroke="#D97706" strokeWidth="2" />
        <line x1="275" y1="170" x2="275" y2="220" stroke="#D97706" strokeWidth="2" />
        <line x1="250" y1="195" x2="300" y2="195" stroke="#D97706" strokeWidth="2" />

        {/* Bottom left window */}
        <rect x="100" y="240" width="50" height="50" rx="4" fill={windowsLit[2] ? '#FEF3C7' : '#E5E7EB'} stroke="#D97706" strokeWidth="2" />
        <line x1="125" y1="240" x2="125" y2="290" stroke="#D97706" strokeWidth="2" />
        <line x1="100" y1="265" x2="150" y2="265" stroke="#D97706" strokeWidth="2" />

        {/* Bottom right window */}
        <rect x="250" y="240" width="50" height="50" rx="4" fill={windowsLit[3] ? '#FEF3C7' : '#E5E7EB'} stroke="#D97706" strokeWidth="2" />
        <line x1="275" y1="240" x2="275" y2="290" stroke="#D97706" strokeWidth="2" />
        <line x1="250" y1="265" x2="300" y2="265" stroke="#D97706" strokeWidth="2" />

        {/* Heart above house */}
        {showHeart && (
          <path
            d="M200 20 C190 10 175 10 170 25 C165 40 180 55 200 70 C220 55 235 40 230 25 C225 10 210 10 200 20 Z"
            fill="#EF4444"
            className="animate-heartbeat"
          />
        )}

        {/* Shield badge */}
        <g transform="translate(320, 180)">
          <path d="M0 10 L20 0 L40 10 L40 30 C40 45 20 55 20 55 C20 55 0 45 0 30 Z" fill="#10B981" />
          <path d="M12 28 L18 34 L30 20" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </g>
      </svg>

      {/* Floating elements */}
      <div className="absolute top-10 left-10 w-8 h-8 bg-amber-200 rounded-full opacity-60" />
      <div className="absolute bottom-20 right-10 w-6 h-6 bg-green-200 rounded-full opacity-60" />
      <div className="absolute top-1/2 left-0 w-4 h-4 bg-orange-200 rounded-full opacity-40" />
    </div>
  );
}

// ============ Helper Components ============

function ProblemCard({ icon, title, description, color, delay = 0 }: { icon: React.ReactNode; title: string; description: string; color: string; delay?: number }) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const colorClasses = {
    red: 'bg-red-50 border-red-100 text-red-600 hover:bg-red-100',
    amber: 'bg-amber-50 border-amber-100 text-amber-600 hover:bg-amber-100',
    blue: 'bg-blue-50 border-blue-100 text-blue-600 hover:bg-blue-100',
  }[color] || 'bg-gray-50 border-gray-100 text-gray-600';

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setTimeout(() => setIsVisible(true), delay);
        }
      },
      { threshold: 0.2 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [delay]);

  return (
    <div
      ref={ref}
      className={`group p-6 rounded-2xl border transition-all duration-500 hover:shadow-lg hover:-translate-y-1 cursor-default ${colorClasses.split(' ').slice(0, 2).join(' ')} ${colorClasses.split(' ')[3]} ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      }`}
    >
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 ${colorClasses.split(' ').slice(0, 3).join(' ')}`}>
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-[#2D3748] mb-2">{title}</h3>
      <p className="text-[#718096]">{description}</p>
    </div>
  );
}

function StepCard({ number, title, description, icon, delay = 0 }: { number: string; title: string; description: string; icon: React.ReactNode; delay?: number }) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setTimeout(() => setIsVisible(true), delay);
        }
      },
      { threshold: 0.2 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [delay]);

  return (
    <div
      ref={ref}
      className={`text-center group transition-all duration-700 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'
      }`}
    >
      <div className="relative w-20 h-20 mx-auto mb-6">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-100 to-orange-100 rounded-2xl group-hover:scale-110 group-hover:rotate-3 transition-all duration-300" />
        <div className="absolute inset-0 flex items-center justify-center text-amber-600 group-hover:scale-110 transition-transform duration-300">
          {icon}
        </div>
        <div className="absolute -top-2 -right-2 w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center text-white font-bold text-sm group-hover:scale-125 group-hover:bg-orange-500 transition-all duration-300">
          {number}
        </div>
      </div>
      <h3 className="text-lg font-semibold text-[#2D3748] mb-2 group-hover:text-amber-600 transition-colors">{title}</h3>
      <p className="text-[#718096]">{description}</p>
    </div>
  );
}

function TrustCard({ number, label, description, delay = 0 }: { number: string; label: string; description: string; delay?: number }) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setTimeout(() => setIsVisible(true), delay);
        }
      },
      { threshold: 0.2 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [delay]);

  return (
    <div
      ref={ref}
      className={`group p-6 bg-white rounded-2xl border border-amber-100 text-center hover:shadow-xl hover:shadow-amber-200/50 hover:-translate-y-2 transition-all duration-500 cursor-default ${
        isVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-8 scale-95'
      }`}
    >
      <div className="text-3xl font-bold text-amber-600 mb-1 group-hover:scale-110 transition-transform duration-300">{number}</div>
      <div className="text-lg font-semibold text-[#2D3748] mb-1">{label}</div>
      <div className="text-sm text-[#718096]">{description}</div>
    </div>
  );
}

// Animated counter component
function AnimatedCounter({ target, suffix = '' }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !hasAnimated) {
          setHasAnimated(true);
          const duration = 2000;
          const steps = 60;
          const increment = target / steps;
          let current = 0;
          const timer = setInterval(() => {
            current += increment;
            if (current >= target) {
              setCount(target);
              clearInterval(timer);
            } else {
              setCount(Math.floor(current));
            }
          }, duration / steps);
        }
      },
      { threshold: 0.5 }
    );

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target, hasAnimated]);

  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>;
}

// Staggered fade-in wrapper
function StaggeredFadeIn({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setTimeout(() => setIsVisible(true), delay);
        }
      },
      { threshold: 0.1 }
    );

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [delay]);

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      }`}
    >
      {children}
    </div>
  );
}

// ============ Icons ============

function HomeIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  );
}

function ShieldCheckIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  );
}

function TranslateIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
    </svg>
  );
}

function ClockIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function DocumentIcon() {
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}

function CurrencyIcon() {
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function QuestionIcon() {
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function CheckCircleIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
    </svg>
  );
}

function ReportIcon() {
  return (
    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}

