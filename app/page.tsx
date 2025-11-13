'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { useScrollAnimation } from '@/lib/hooks/useScrollAnimation';

export default function LandingPage() {
  const problemsSection = useScrollAnimation({ threshold: 0.2 });
  const howItWorksSection = useScrollAnimation({ threshold: 0.2 });
  const featuresSection = useScrollAnimation({ threshold: 0.2 });
  const ctaSection = useScrollAnimation({ threshold: 0.3 });

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="fixed top-0 w-full bg-white/95 backdrop-blur-sm border-b border-gray-100/50 z-50">
        <div className="container mx-auto px-6 py-4 max-w-7xl">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              Pre-sale safety check
            </h1>
            <div className="flex gap-4">
              <Link href="/analyze">
                <Button className="shadow-lg shadow-emerald-900/10">Start your analysis</Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-teal-900 via-emerald-900 to-teal-950 pt-32 pb-24 overflow-hidden">
        {/* Gradient Overlays */}
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-100/5 via-transparent to-emerald-100/5"></div>
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_30%_20%,rgba(16,185,129,0.1),transparent_50%)]"></div>

        <div className="container mx-auto px-6 max-w-6xl relative z-10">
          <div className="text-center">
            <div className="inline-block mb-6 px-5 py-2 bg-emerald-100/10 backdrop-blur-sm border border-emerald-100/20 rounded-full shadow-lg">
              <span className="text-emerald-100 text-sm font-medium tracking-tight">Jeonse safety analysis service for foreigners</span>
            </div>

            <h2 className="text-5xl md:text-7xl font-bold text-white mb-6 tracking-tight leading-[1.1]" style={{ letterSpacing: '-0.03em' }}>
              Don't fall for rental scams<br />
              <span className="bg-gradient-to-r from-emerald-200 to-teal-100 bg-clip-text text-transparent">anymore</span>
            </h2>

            <p className="text-xl md:text-2xl text-emerald-50/90 mb-12 max-w-3xl mx-auto leading-relaxed font-medium">
              Translate your real estate register into English and automatically analyze over 20 risks.
              <br className="hidden md:block" />
              Easily understand the complex Korean real estate system.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link href="/analyze">
                <Button
                  size="lg"
                  className="text-lg px-10 py-5 bg-white text-emerald-900 hover:bg-emerald-50 shadow-xl shadow-emerald-900/30 border-0 rounded-2xl font-semibold transition-all hover:scale-105"
                >
                  Start for free now →
                </Button>
              </Link>
              <a href="#how-it-works">
                <Button
                  size="lg"
                  variant="secondary"
                  className="text-lg px-10 py-5 bg-emerald-800/30 text-white border-emerald-100/20 hover:bg-emerald-800/50 backdrop-blur-sm rounded-2xl font-medium"
                >
                  See how it works
                </Button>
              </a>
            </div>

            <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-8 max-w-3xl mx-auto">
              <div className="flex flex-col items-center gap-2">
                <div className="w-12 h-12 rounded-full bg-emerald-100/10 backdrop-blur-sm border border-emerald-100/20 flex items-center justify-center mb-2">
                  <span className="text-2xl">✓</span>
                </div>
                <div className="text-white font-medium">Free</div>
                <div className="text-emerald-200/70 text-sm">Beta Free Trial</div>
              </div>
              <div className="flex flex-col items-center gap-2">
                <div className="w-12 h-12 rounded-full bg-emerald-100/10 backdrop-blur-sm border border-emerald-100/20 flex items-center justify-center mb-2">
                  <span className="text-2xl">20+</span>
                </div>
                <div className="text-white font-medium">Risk Check</div>
                <div className="text-emerald-200/70 text-sm">Comprehensive</div>
              </div>
              <div className="flex flex-col items-center gap-2">
                <div className="w-12 h-12 rounded-full bg-emerald-100/10 backdrop-blur-sm border border-emerald-100/20 flex items-center justify-center mb-2">
                  <span className="text-2xl">2</span>
                </div>
                <div className="text-white font-medium">Minutes</div>
                <div className="text-emerald-200/70 text-sm">Analysis time</div>
              </div>
              <div className="flex flex-col items-center gap-2">
                <div className="w-12 h-12 rounded-full bg-emerald-100/10 backdrop-blur-sm border border-emerald-100/20 flex items-center justify-center mb-2">
                  <span className="text-2xl">🇬🇧</span>
                </div>
                <div className="text-white font-medium">English</div>
                <div className="text-emerald-200/70 text-sm">Full translation</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section
        ref={problemsSection.elementRef as any}
        className={`bg-gradient-to-b from-gray-50 to-white py-24 transition-all duration-1000 ${
          problemsSection.isVisible
            ? 'opacity-100 translate-y-0'
            : 'opacity-0 translate-y-12'
        }`}
      >
        <div className="container mx-auto px-6 max-w-6xl">
          <div className="text-center mb-16">
            <h3 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4 tracking-tight" style={{ letterSpacing: '-0.03em' }}>
              Problems faced by foreigners<br />
              when signing a lease
            </h3>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Navigating the Korean rental market is challenging. We're here to help.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <ProblemCard
              icon="📄"
              title="I can't read the register copy."
              description="The register of real estate is only available in Korean, and the technical terms are difficult to understand."
            />
            <ProblemCard
              icon="💰"
              title="I don't know the right price"
              description="It's difficult to determine what this house is actually worth and whether the deposit is safe."
            />
            <ProblemCard
              icon="⚖️"
              title="I can't afford the legal risk check."
              description="There is no way to check for legal problems such as seizures, provisional seizures, auctions, etc."
            />
            <ProblemCard
              icon="🚨"
              title="I'm afraid of scams"
              description="I've seen news about jeonse fraud recently, but I don't know how to prevent it."
            />
          </div>
        </div>
      </section>

      {/* Solution Section */}
      <section
        id="how-it-works"
        ref={howItWorksSection.elementRef as any}
        className={`bg-white py-24 transition-all duration-1000 ${
          howItWorksSection.isVisible
            ? 'opacity-100 translate-y-0'
            : 'opacity-0 translate-y-12'
        }`}
      >
        <div className="container mx-auto px-6 max-w-6xl">
          <div className="text-center mb-16">
            <h3 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4 tracking-tight" style={{ letterSpacing: '-0.03em' }}>
              How it works
            </h3>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Get your comprehensive safety report in 4 simple steps
            </p>
          </div>

          <div className="max-w-3xl mx-auto space-y-8">
            <StepCard
              number="1"
              title="Enter property address"
              description="Input the address of the property you're considering for jeonse."
              time="30 sec"
            />
            <StepCard
              number="2"
              title="Upload register document"
              description="Upload the PDF register document you downloaded from iros.go.kr."
              time="1 min"
            />
            <StepCard
              number="3"
              title="Automatic analysis"
              description="Our system automatically analyzes property value, risks, and legal issues."
              time="2 min"
            />
            <StepCard
              number="4"
              title="Review detailed report"
              description="Understand all risks easily with an English-translated register and comprehensive report."
              time="5 min"
            />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section
        ref={featuresSection.elementRef as any}
        className={`bg-gradient-to-b from-gray-50 to-white py-24 transition-all duration-1000 ${
          featuresSection.isVisible
            ? 'opacity-100 translate-y-0'
            : 'opacity-0 translate-y-12'
        }`}
      >
        <div className="container mx-auto px-6 max-w-6xl">
          <div className="text-center mb-16">
            <h3 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4 tracking-tight" style={{ letterSpacing: '-0.03em' }}>
              What's included
            </h3>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Professional-grade analysis tools to protect your investment
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard
              icon="🌐"
              title="English translation"
              description="All legal terms and content translated into easy-to-understand English."
            />
            <FeatureCard
              icon="💰"
              title="Property valuation"
              description="Accurate market price calculation based on Ministry of Land transaction data."
            />
            <FeatureCard
              icon="⚠️"
              title="20+ risk checks"
              description="Verify all legal risks including mortgages, seizures, and provisional seizures."
            />
            <FeatureCard
              icon="📊"
              title="Safety score"
              description="Evaluate the safety of this jeonse contract on a 0-100 point scale."
            />
            <FeatureCard
              icon="✅"
              title="Actionable advice"
              description="Step-by-step guidance on what you must do before signing the contract."
            />
            <FeatureCard
              icon="📄"
              title="PDF report"
              description="Download analysis results to keep or share with family and advisors."
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section
        ref={ctaSection.elementRef as any}
        className={`bg-gradient-to-br from-emerald-900 via-teal-900 to-emerald-950 py-24 relative overflow-hidden transition-all duration-1000 ${
          ctaSection.isVisible
            ? 'opacity-100 translate-y-0'
            : 'opacity-0 translate-y-12'
        }`}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-100/5 to-transparent"></div>

        <div className="container mx-auto px-6 max-w-4xl relative z-10">
          <div className="text-center">
            <h3 className="text-4xl md:text-5xl font-bold text-white mb-6 tracking-tight" style={{ letterSpacing: '-0.03em' }}>
              Safe jeonse contract,<br />
              <span className="bg-gradient-to-r from-emerald-200 to-teal-100 bg-clip-text text-transparent">start now</span>
            </h3>
            <p className="text-xl text-emerald-50/90 mb-10 max-w-2xl mx-auto leading-relaxed">
              Use it for free during the Beta period and prevent tens of millions of won in losses.
            </p>
            <Link href="/analyze">
              <Button
                size="lg"
                className="text-lg px-10 py-5 bg-white text-emerald-900 hover:bg-emerald-50 shadow-xl shadow-emerald-900/30 border-0 rounded-2xl font-semibold transition-all hover:scale-105"
              >
                Start analysis now →
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 border-t border-gray-800">
        <div className="container mx-auto px-6 max-w-6xl">
          <div className="text-center">
            <p className="text-gray-400 mb-4 font-medium">
              Jeonse Safety Check © 2025. Jeonse safety analysis service for foreigners.
            </p>
            <p className="text-sm text-gray-500 leading-relaxed max-w-2xl mx-auto">
              This service is for informational purposes and is not legal advice.<br />
              Please consult with a professional before making important decisions.<br />
              Based on Housing Lease Protection Act Enforcement Decree (effective March 1, 2025).
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

// Helper Components
function ProblemCard({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div className="group bg-white border border-gray-200/50 rounded-2xl p-8 hover:shadow-xl hover:shadow-gray-900/5 transition-all hover:-translate-y-1">
      <div className="text-5xl mb-4">{icon}</div>
      <h4 className="text-xl font-bold text-gray-900 mb-3 tracking-tight">{title}</h4>
      <p className="text-gray-600 leading-relaxed">{description}</p>
    </div>
  );
}

function StepCard({ number, title, description, time }: { number: string; title: string; description: string; time: string }) {
  return (
    <div className="flex gap-6 items-start group">
      <div className="flex-shrink-0 w-16 h-16 bg-gradient-to-br from-emerald-600 to-teal-600 text-white rounded-2xl flex items-center justify-center text-2xl font-bold shadow-lg shadow-emerald-600/20 group-hover:scale-110 transition-transform">
        {number}
      </div>
      <div className="flex-1 pt-2">
        <div className="flex items-center gap-3 mb-2">
          <h4 className="text-2xl font-bold text-gray-900 tracking-tight">{title}</h4>
          <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full font-medium">~{time}</span>
        </div>
        <p className="text-gray-600 text-lg leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div className="group bg-white rounded-2xl p-8 shadow-sm shadow-gray-900/5 border border-gray-100 hover:shadow-xl hover:shadow-gray-900/10 transition-all hover:-translate-y-1">
      <div className="text-5xl mb-4 group-hover:scale-110 transition-transform inline-block">{icon}</div>
      <h4 className="text-xl font-bold text-gray-900 mb-3 tracking-tight">{title}</h4>
      <p className="text-gray-600 leading-relaxed">{description}</p>
    </div>
  );
}
